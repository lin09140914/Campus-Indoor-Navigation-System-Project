import { findDraftRoute } from './floor1-draft-route.mjs';

const $ = id => document.getElementById(id);
const svgNS = 'http://www.w3.org/2000/svg';
function svg(tag, attrs, parent) {
  const el = document.createElementNS(svgNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  parent.append(el); return el;
}
async function fetchOk(url, format) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`無法載入 ${url}（${response.status}）`);
  return response[format]();
}

try {
  const [graph, source] = await Promise.all([
    fetchOk('../data/drafts/floor-1/graph.json', 'json'),
    fetchOk('../data/svg/floor-1.svg', 'arrayBuffer'),
  ]);
  const normalized = new TextEncoder().encode(new TextDecoder().decode(source).replace(/\r\n?/g, '\n'));
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', normalized))].map(x => x.toString(16).padStart(2, '0')).join('');
  if (hash !== graph.source.sha256) throw new Error('SVG 已更新，草稿座標尚未重新核對。請重新核對標記並產生 graph。');
  const xy = n => {
    if (graph.unit !== 'm') return [n.x, n.z];
    const t = graph.svg_transform, angle = t.rotation_deg * Math.PI / 180;
    const dx = n.x - t.origin_x_m, dz = n.z - t.origin_z_m;
    return [graph.source.view_box[0] + (dx * Math.cos(angle) + dz * Math.sin(angle)) / t.scale_m_per_svg_unit,
      graph.source.view_box[1] + (-dx * Math.sin(angle) + dz * Math.cos(angle)) / t.scale_m_per_svg_unit];
  };
  const nodes = new Map(graph.nodes.map(n => [n.id, n]));
  $('map').setAttribute('viewBox', graph.source.view_box.join(' '));
  $('status').textContent = `${graph.nodes.length} 節點 · ${graph.edges.length} 邊 · ${graph.nodes.filter(n => n.role === 'room').length} 個房間`;
  if (graph.unit === 'm') $('calibration').textContent = '草稿・已填比例，待現勘';
  for (const issue of [...graph.review.issues, ...graph.review.omitted]) {
    const li = document.createElement('li'); li.textContent = issue; $('issues').append(li);
  }
  for (const e of graph.edges) {
    const [x1, y1] = xy(nodes.get(e.a)), [x2, y2] = xy(nodes.get(e.b));
    svg('line', { x1, y1, x2, y2, stroke: '#1b8ca5', 'stroke-width': 0.75, opacity: 0.65 }, $('graph-edges'));
  }
  const destinations = graph.nodes.filter(n => n.role === 'room' || n.role === 'entrance');
  for (const n of graph.nodes) {
    const [cx, cy] = xy(n);
    const isDestination = destinations.includes(n);
    const group = svg('g', isDestination ? { class: 'destination', tabindex: 0, role: 'button', 'aria-label': `終點：${n.label}` } : {}, $('graph-nodes'));
    svg('circle', { cx, cy, r: n.role === 'entrance' ? 3.5 : n.role === 'room' ? 2.5 : 1,
      fill: n.temporary_id ? '#d18a17' : n.role === 'entrance' ? '#0c7768' : '#126275', stroke: 'white', 'stroke-width': 0.5 }, group);
    const title = svg('title', {}, group); title.textContent = `${n.label} (${n.id})`;
    if (isDestination) {
      const choose = () => { $('to').value = n.id; route(); };
      group.addEventListener('click', choose);
      group.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } });
      const label = svg('text', { x: cx + 4, y: cy - 4, class: 'map-label' }, $('graph-labels'));
      label.textContent = n.temporary_id ? n.id : n.source_label ?? n.id;
    }
  }
  for (const select of [$('from'), $('to')]) {
    for (const n of destinations) { const opt = document.createElement('option'); opt.value = n.id; opt.textContent = n.label; select.append(opt); }
    select.disabled = false; select.addEventListener('change', route);
  }
  const params = new URLSearchParams(location.search);
  $('from').value = destinations.some(n => n.id === params.get('from')) ? params.get('from') : 'A125';
  $('to').value = destinations.some(n => n.id === params.get('to')) ? params.get('to') : 'B103';
  function route() {
    const result = findDraftRoute(graph, $('from').value, $('to').value);
    $('route').replaceChildren(); $('route-list').replaceChildren();
    $('route-notes').hidden = true;
    document.body.dataset.routeFound = String(Boolean(result));
    if (!result) { $('summary').textContent = '找不到連通路線。'; return; }
    $('summary').textContent = graph.unit === 'm'
      ? `${result.length.toFixed(1)} 公尺（圖面估算，待現勘）`
      : `${result.length.toFixed(1)} 圖面單位（尚非公尺）`;
    svg('polyline', { points: result.path.map(n => xy(n).join(',')).join(' '), fill: 'none', stroke: '#db3670', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.92 }, $('route'));
    const notes = result.path.map(n => nodes.get(n.id).note).filter(Boolean);
    if (notes.length) { $('route-notes').textContent = [...new Set(notes)].join(' '); $('route-notes').hidden = false; }
    for (const n of result.path) { const li = document.createElement('li'); li.textContent = `${nodes.get(n.id).label} · ${n.id}`; $('route-list').append(li); }
    const [sx, sy] = xy(result.path[0]), [ex, ey] = xy(result.path.at(-1));
    for (const [x, y, text] of [[sx, sy, '起'], [ex, ey, '終']]) {
      svg('circle', { cx: x, cy: y, r: 6, fill: '#db3670', stroke: 'white', 'stroke-width': 1 }, $('route'));
      const label = svg('text', { x, y: y + 2.2, fill: 'white', 'text-anchor': 'middle', 'font-size': 6, 'font-family': 'system-ui' }, $('route')); label.textContent = text;
    }
  }
  $('swap').disabled = false;
  $('swap').addEventListener('click', () => { const from = $('from').value; $('from').value = $('to').value; $('to').value = from; route(); });
  $('show-graph').addEventListener('change', e => { $('graph-edges').hidden = !e.target.checked; $('graph-edges').style.display = e.target.checked ? '' : 'none'; });
  $('show-labels').addEventListener('change', e => { $('graph-labels').toggleAttribute('hidden', !e.target.checked); });
  $('zoom').addEventListener('input', e => { $('map').style.width = `${e.target.value}%`; });
  route(); document.body.dataset.ready = 'true';
} catch (e) {
  document.body.dataset.ready = 'error';
  $('status').textContent = `載入失敗：${e.message}。請先在專案根目錄執行 python -m http.server 8080 --bind 127.0.0.1。`;
}
