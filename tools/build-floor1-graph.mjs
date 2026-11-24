// 從人工對照 SVG 的標記產生 1F 草稿；不覆蓋 data/graph.json。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
export const draftDir = path.join(root, 'data/drafts/floor-1');
export const readAnnotations = () => JSON.parse(fs.readFileSync(path.join(draftDir, 'annotations.json'), 'utf8'));
const key = p => p.join(',');
export const normalizeText = text => text.replace(/\r\n?/g, '\n');
export const anchorId = id => `anchor-${id.replace(/[^A-Za-z0-9_-]/g, '-')}`;
const csvCell = s => /[",\r\n]/.test(String(s)) ? `"${String(s).replaceAll('"', '""')}"` : String(s);

export function buildGraph(input, sourceText) {
  const hash = crypto.createHash('sha256').update(normalizeText(sourceText)).digest('hex');
  if (hash !== input.source.sha256) throw new Error('SVG 已改變，請重新核對 annotations.json 的座標與連通關係，再更新來源 SHA256。');
  const transform = input.svgTransform;
  const keys = ['scale_m_per_svg_unit', 'rotation_deg', 'origin_x_m', 'origin_z_m'];
  if (!transform || keys.some(k => !(k in transform))) throw new Error('svgTransform 必須包含新版規格的四個轉換欄位。');
  const calibrated = keys.every(k => Number.isFinite(transform[k]));
  if (!calibrated && !keys.every(k => transform[k] === null)) throw new Error('svgTransform 必須四項皆為有限數字，或全部為 null（未量測）。');
  if (calibrated && transform.scale_m_per_svg_unit <= 0) throw new Error('scale_m_per_svg_unit 必須大於 0。');
  const toCoordinates = ([u, v]) => {
    if (!calibrated) return [u, v];
    const s = transform.scale_m_per_svg_unit, angle = transform.rotation_deg * Math.PI / 180;
    const du = u - input.source.viewBox[0], dv = v - input.source.viewBox[1];
    return [transform.origin_x_m + s * (du * Math.cos(angle) - dv * Math.sin(angle)),
      transform.origin_z_m + s * (du * Math.sin(angle) + dv * Math.cos(angle))];
  };
  const graph = {
    building_id: input.buildingId, map_version: input.mapVersion,
    coordinate_system_id: input.coordinateSystemId,
    building_id_status: 'provisional', unit: calibrated ? 'm' : 'svg-unit',
    status: 'draft', floor: 1,
    measurement_policy: input.measurementPolicy,
    source: { path: input.source.path, sha256: input.source.sha256, layers: input.source.layers, view_box: input.source.viewBox },
    svg_transform: transform,
    review: { status: 'needs-site-review', issues: input.issues, omitted: input.omitted },
    nodes: [], edges: [],
  };
  const nodes = new Map(), points = new Map(), pairs = new Set();
  function addNode(id, at, type, label, extra = {}) {
    if (nodes.has(id)) throw new Error(`重複節點：${id}`);
    if (!Array.isArray(at) || at.length !== 2 || !at.every(Number.isFinite)) throw new Error(`無效座標：${id}`);
    const [x0, z0, width, height] = input.source.viewBox;
    if (at[0] < x0 || at[0] > x0 + width || at[1] < z0 || at[1] > z0 + height) throw new Error(`超出圖面：${id}`);
    const [x, z] = toCoordinates(at);
    const standardType = type === 'room' || type === 'corridor' ? 'walk' : type === 'entrance' ? 'door' : type;
    const node = { id, x, z, floor: 1, type: standardType, role: type, label, ...extra };
    graph.nodes.push(node); nodes.set(id, node);
    return id;
  }
  function corridor(at) {
    if (!points.has(key(at))) {
      const id = `F1-C-${String(points.size + 1).padStart(3, '0')}`;
      points.set(key(at), addNode(id, at, 'corridor', '走廊轉折／投影點'));
    }
    return points.get(key(at));
  }
  function edge(a, b) {
    if (a === b) return;
    const pair = [a, b].sort().join('|');
    if (pairs.has(pair)) return;
    const na = nodes.get(a), nb = nodes.get(b);
    if (!na || !nb) throw new Error(`找不到連線端點：${a} / ${b}`);
    const w = Math.hypot(na.x - nb.x, na.z - nb.z);
    if (!(w > 0)) throw new Error(`零長度邊：${a} / ${b}`);
    graph.edges.push({ a, b, w, kind: 'walk' }); pairs.add(pair);
  }
  // 先加入所有走廊與房間的投影點，之後在主幹線上依順序切邊，避免近旁點未接上。
  for (const line of input.corridors) for (const at of line.points) corridor(at);
  for (const room of input.rooms) for (const at of room.via ?? []) corridor(at);
  for (const entrance of input.entrances) corridor(entrance.connectAt);
  for (const line of input.corridors) {
    for (let i = 1; i < line.points.length; i++) {
      const a = line.points[i - 1], b = line.points[i];
      const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
      if (!l2) throw new Error(`重複走廊端點：${line.name}`);
      const onSegment = [...points].map(([k, id]) => {
        const p = k.split(',').map(Number);
        const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2;
        const cross = (p[0] - a[0]) * dz - (p[1] - a[1]) * dx;
        return { id, t, cross };
      }).filter(p => Math.abs(p.cross) < 1e-7 && p.t >= -1e-9 && p.t <= 1 + 1e-9).sort((p, q) => p.t - q.t);
      for (let j = 1; j < onSegment.length; j++) edge(onSegment[j - 1].id, onSegment[j].id);
    }
  }
  for (const room of input.rooms) {
    addNode(room.id, room.at, 'room', room.label, {
      source_label: room.sourceLabel ?? room.id,
      temporary_id: room.temporaryId ?? false,
      ...(room.note ? { note: room.note } : {}),
    });
    addNode(`${room.id}#door`, room.door, 'door', `${room.label} 門口`);
    edge(room.id, `${room.id}#door`);
  }
  for (const room of input.rooms) {
    let prev = `${room.id}#door`;
    if (room.viaRoom) {
      edge(prev, room.viaRoom);
    } else {
      if (!room.via?.length) throw new Error(`房間缺少連接點：${room.id}`);
      for (const at of room.via) { const next = corridor(at); edge(prev, next); prev = next; }
    }
  }
  for (const e of input.entrances) {
    addNode(e.id, e.at, 'entrance', e.label, { note: '依圖面門扇判讀的出入口，開放狀態待現勘。' });
    edge(e.id, corridor(e.connectAt));
  }
  // 所有輸出節點都必須連通；發現漏接立即停止產生。
  const adjacency = new Map(graph.nodes.map(n => [n.id, []]));
  for (const e of graph.edges) { adjacency.get(e.a).push(e.b); adjacency.get(e.b).push(e.a); }
  const seen = new Set([input.entrances[0].id]), queue = [...seen];
  for (let i = 0; i < queue.length; i++) for (const id of adjacency.get(queue[i])) if (!seen.has(id)) { seen.add(id); queue.push(id); }
  const missing = graph.nodes.filter(n => !seen.has(n.id));
  if (missing.length) throw new Error(`不連通的節點：${missing.map(n => n.id).join(', ')}`);
  return graph;
}

export function renderRoomsCsv(input) {
  return ['room_id,floor,name,type,node_id', ...input.rooms.map(r => [r.id, 1, r.label, r.type ?? 'other', r.id].map(csvCell).join(','))].join('\n') + '\n';
}

export function renderOutputs(input, graph) {
  const common = { building_id: graph.building_id, map_version: graph.map_version };
  const nodeMap = { ...common, entries: graph.nodes.map(n => ({ node_id: n.id, floor: n.floor, svg_anchor_id: anchorId(n.id) })) };
  if (new Set(nodeMap.entries.map(e => e.svg_anchor_id)).size !== graph.nodes.length) throw new Error('錨點 ID 正規化後重複。');
  const destinations = { ...common, locations: [...input.rooms.map(r => ({ id: `L_${r.id}`, name: r.label, floor: 1, node_id: r.id, category: 'room' })),
    ...input.entrances.map(e => ({ id: `L_${e.id}`, name: e.label, floor: 1, node_id: e.id, category: 'entrance' }))] };
  // 未測量／未定案的 Floor 只能作為 pending 模板，不冒充正式 floors.json。
  const floors = { ...common, coordinate_system_id: graph.coordinate_system_id, status: 'pending-measurement-and-integration',
    floors: [{ floor: 1, label: '1F', elevation_m: null, svg: '../../svg/floor-1.svg', svg_transform: graph.svg_transform }] };
  const json = obj => JSON.stringify(obj, null, 2) + '\n';
  return { 'graph.json': json(graph), 'rooms.csv': renderRoomsCsv(input), 'node_map.json': json(nodeMap),
    'destinations.json': json(destinations), 'floors.pending.json': json(floors) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.some(a => a !== '--check')) throw new Error('用法：node tools/build-floor1-graph.mjs [--check]；座標轉換請填入 annotations.json 的 svgTransform。');
    const input = readAnnotations();
    const sourceText = fs.readFileSync(path.join(root, input.source.path), 'utf8');
    const graph = buildGraph(input, sourceText);
    const outputs = renderOutputs(input, graph);
    for (const [name, content] of Object.entries(outputs)) {
      const file = path.join(draftDir, name);
      if (args.includes('--check')) {
        if (!fs.existsSync(file) || normalizeText(fs.readFileSync(file, 'utf8')) !== content) throw new Error(`${name} 與標記資料不同，請重新執行產生器。`);
      } else fs.writeFileSync(file, content);
    }
    console.log(`${args.includes('--check') ? '檢查通過' : '已產生 1F 草稿'}：${graph.nodes.length} 節點、${graph.edges.length} 邊、${input.rooms.length} 個房間；單位 ${graph.unit}。`);
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
