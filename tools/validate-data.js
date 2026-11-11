#!/usr/bin/env node
// 資料驗證腳本：檢查 docs/spec.md 第 4.9 節的 V1–V10。
// 地圖資料組交件前一定要跑，全部通過才算交件。
//
// 用法：node tools/validate-data.js [資料夾，預設為 ./data]
// 結束代碼：0 = 全部通過（可能有警告）；1 = 有錯誤。
//
// 限制（請地圖組知道）：
//  - SVG 只用簡單的文字解析，只認 <polygon> 和 <line>，不支援 transform、path、rect；
//    匯出時請在 Inkscape 把形狀轉成 polygon，並移除 transform。
//  - rooms.csv 支援引號，但請用 UTF-8 儲存。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(process.argv[2] ?? path.join(here, '..', 'data'));

const TOL_POS = 0.05;     // 位置容許誤差（公尺）
const TOL_DOOR = 0.1;     // 門與房間牆的容許誤差（公尺）
const TOL_W = 1e-6;       // 邊長容許誤差
const NODE_TYPES = new Set(['room', 'door', 'corridor', 'stair', 'elevator', 'entrance']);
const EDGE_KINDS = new Set(['walk', 'stair', 'elev']);

// ---------- 結果收集 ----------
const R = new Map();
const rule = (id, title) => R.set(id, { title, errors: [], warns: [] });
const err = (id, msg) => R.get(id).errors.push(msg);
const warn = (id, msg) => R.get(id).warns.push(msg);
rule('V1', '節點 id 唯一、欄位完整');
rule('V2', 'rooms.csv、SVG、圖三者的房間一致');
rule('V3', '每個房間都有門，且門在房間牆上');
rule('V4', '邊的兩端存在、沒有重複、沒有自己連自己');
rule('V5', '走路邊 w ≥ 兩端直線距離；跨層邊合理');
rule('V6', '所有房間都能從入口走到');
rule('V7', '節點座標在所屬樓層外框內');
rule('V8', '房間節點在房間內；門節點在房間邊上並對上門線段');
rule('V9', '樓梯／電梯：各層同 id、同座標、有跨層邊');
rule('V10', 'SVG 座標系與格式正確（原點、單一外框、只用 polygon／line）');

// ---------- 讀檔工具 ----------
function readJson(file, label) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { err('V10', `無法讀取 ${label}：${e.message}`); return null; }
}
function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(x => x !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); if (row.some(x => x !== '')) rows.push(row); }
  const [head, ...body] = rows;
  return { head: head?.map(h => h.trim()) ?? [], rows: body.map(r => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()]))) };
}

// ---------- 幾何 ----------
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function distSeg(p, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
  let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return dist(p, [a[0] + t * dx, a[1] + t * dz]);
}
function distBoundary(p, poly) {
  let m = Infinity;
  for (let i = 0; i < poly.length; i++) m = Math.min(m, distSeg(p, poly[i], poly[(i + 1) % poly.length]));
  return m;
}
function inPoly(p, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > p[1]) !== (zj > p[1]) && p[0] < (xj - xi) * (p[1] - zi) / (zj - zi) + xi) c = !c;
  }
  return c;
}
const insideOrOn = (p, poly, tol) => inPoly(p, poly) || distBoundary(p, poly) <= tol;

// ---------- SVG 解析 ----------
const KNOWN = ['outline', 'room', 'door', 'corridor', 'stair', 'elevator'];
const EXPECT_TAG = { outline: 'polygon', room: 'polygon', corridor: 'polygon', stair: 'polygon', elevator: 'polygon', door: 'line' };
function attrs(s) {
  const o = {};
  for (const m of s.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) o[m[1]] = m[2];
  return o;
}
function readSvg(f) {
  const file = path.join(dataDir, 'svg', `floor-${f}.svg`);
  if (!fs.existsSync(file)) { err('V10', `缺少 svg/floor-${f}.svg`); return null; }
  const text = fs.readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const vb = (text.match(/viewBox\s*=\s*"([^"]*)"/) ?? [])[1];
  const sv = { floor: f, viewBox: vb, outlines: [], rooms: new Map(), doors: [], shafts: new Map() };
  if (!vb) err('V10', `floor-${f}.svg 沒有 viewBox`);
  else {
    const v = vb.trim().split(/[\s,]+/).map(Number);
    if (v.length !== 4 || v.some(Number.isNaN)) err('V10', `floor-${f}.svg 的 viewBox 格式錯誤：${vb}`);
    else if (v[0] !== 0 || v[1] !== 0) err('V10', `floor-${f}.svg 的 viewBox 必須從 0 0 開始，目前是 ${vb}`);
  }
  if (/transform\s*=/.test(text)) warn('V10', `floor-${f}.svg 含有 transform，座標可能和規格不一致，請在 Inkscape 套用後移除`);

  for (const m of text.matchAll(/<(\w+)\b([^>]*?)\/?>/g)) {
    const tag = m[1];
    if (tag === 'svg') continue;
    const a = attrs(m[2]);
    const cls = (a.class ?? '').split(/\s+/).find(c => KNOWN.includes(c));
    if (!cls) continue;
    if (tag !== EXPECT_TAG[cls]) { err('V10', `floor-${f}.svg：class="${cls}" 必須用 <${EXPECT_TAG[cls]}>，目前是 <${tag}>`); continue; }
    if (tag === 'line') {
      const p = ['x1', 'y1', 'x2', 'y2'].map(k => Number(a[k]));
      if (p.some(Number.isNaN)) { err('V10', `floor-${f}.svg：門線段座標不是數字（data-room=${a['data-room']}）`); continue; }
      if (!a['data-room']) { err('V3', `floor-${f}.svg：有一條 door 沒有 data-room`); continue; }
      sv.doors.push({ room: a['data-room'], a: [p[0], p[1]], b: [p[2], p[3]] });
      continue;
    }
    const pts = (a.points ?? '').trim().split(/\s+/).map(s => s.split(',').map(Number));
    if (pts.length < 3 || pts.some(p => p.length !== 2 || p.some(Number.isNaN))) {
      err('V10', `floor-${f}.svg：class="${cls}"${a.id ? ` id="${a.id}"` : ''} 的 points 格式錯誤（應為 "x,y x,y ..."）`);
      continue;
    }
    if (cls === 'outline') sv.outlines.push(pts);
    else if (cls === 'room') {
      if (!a.id) { err('V2', `floor-${f}.svg：有一個 room 沒有 id`); continue; }
      if (sv.rooms.has(a.id)) err('V2', `floor-${f}.svg：房號 ${a.id} 重複`);
      sv.rooms.set(a.id, pts);
    } else if (cls === 'stair' || cls === 'elevator') {
      if (!a.id) { err('V9', `floor-${f}.svg：有一個 ${cls} 沒有 id`); continue; }
      sv.shafts.set(a.id, { kind: cls, poly: pts });
    }
  }
  if (sv.outlines.length !== 1) err('V10', `floor-${f}.svg 必須剛好有 1 個 outline，目前有 ${sv.outlines.length} 個`);
  else {
    const xs = sv.outlines[0].map(p => p[0]), zs = sv.outlines[0].map(p => p[1]);
    if (Math.abs(Math.min(...xs)) > 0.01 || Math.abs(Math.min(...zs)) > 0.01) {
      err('V10', `floor-${f}.svg 的外框左上角必須是 (0,0)，目前是 (${Math.min(...xs)}, ${Math.min(...zs)})`);
    }
  }
  return sv;
}

// ---------- 載入 ----------
console.log(`資料驗證：${dataDir}\n`);
const building = readJson(path.join(dataDir, 'building.json'), 'building.json');
const graph = readJson(path.join(dataDir, 'graph.json'), 'graph.json');
let csv = null;
try { csv = parseCsv(fs.readFileSync(path.join(dataDir, 'rooms.csv'), 'utf8')); }
catch (e) { err('V2', `無法讀取 rooms.csv：${e.message}`); }

function report() {
  let bad = 0;
  for (const [id, r] of R) {
    const mark = r.errors.length ? '✘' : '✔';
    console.log(`${id.padEnd(4)} ${mark} ${r.title}${r.errors.length ? `（${r.errors.length} 個問題）` : ''}${r.warns.length ? `（${r.warns.length} 個警告）` : ''}`);
    for (const e of r.errors.slice(0, 20)) console.log(`       ✘ ${e}`);
    if (r.errors.length > 20) console.log(`       … 還有 ${r.errors.length - 20} 個問題`);
    for (const w of r.warns.slice(0, 20)) console.log(`       ⚠ ${w}`);
    bad += r.errors.length;
  }
  console.log(bad ? `\n未通過：共 ${bad} 個問題。` : '\n全部通過。');
  process.exit(bad ? 1 : 0);
}

if (!building || !graph || !csv) report();

if (!Array.isArray(building.floors) || !building.floors.length) err('V10', 'building.json 的 floors 必須是非空陣列');
if (!(building.floorHeight > 0)) err('V10', 'building.json 的 floorHeight 必須是正數（公尺）');
if (building.sample) warn('V10', 'building.json 標示 sample: true，這是樣板資料；換成真資料時請移除');
const floors = Array.isArray(building.floors) ? building.floors : [];
const SV = new Map();
for (const f of floors) { const s = readSvg(f); if (s) SV.set(f, s); }

// ---------- V1 ----------
const nodes = new Map();
for (const n of graph.nodes ?? []) {
  if (typeof n.id !== 'string' || !n.id) { err('V1', `有節點沒有 id：${JSON.stringify(n)}`); continue; }
  if (nodes.has(n.id)) err('V1', `節點 id 重複：${n.id}`);
  if (!Number.isFinite(n.x) || !Number.isFinite(n.z)) err('V1', `${n.id} 的 x 或 z 不是數字`);
  if (!floors.includes(n.floor)) err('V1', `${n.id} 的 floor（${n.floor}）不在 building.json 的樓層裡`);
  if (!NODE_TYPES.has(n.type)) err('V1', `${n.id} 的 type 不合法：${n.type}`);
  nodes.set(n.id, n);
}

// ---------- V2 ----------
const csvRooms = new Map();
for (const col of ['room_id', 'floor', 'name', 'type', 'node_id']) {
  if (!csv.head.includes(col)) err('V2', `rooms.csv 缺少欄位：${col}`);
}
for (const row of csv.rows) {
  const id = row.room_id;
  if (!id) { err('V2', 'rooms.csv 有一列沒有 room_id'); continue; }
  if (csvRooms.has(id)) err('V2', `rooms.csv 的 room_id 重複：${id}`);
  csvRooms.set(id, row);
  const fl = Number(row.floor);
  if (!SV.get(fl)?.rooms.has(id)) err('V2', `rooms.csv 的 ${id}（${row.floor}F）在 SVG 裡找不到`);
  const nd = nodes.get(row.node_id);
  if (!nd) err('V2', `rooms.csv 的 ${id} 指向不存在的節點 ${row.node_id}`);
  else {
    if (nd.type !== 'room') err('V2', `rooms.csv 的 ${id} 指向的節點 ${row.node_id} 不是 room 類型`);
    if (nd.floor !== fl) err('V2', `rooms.csv 的 ${id} 樓層 ${row.floor} 和節點樓層 ${nd.floor} 不一致`);
  }
}
const svgRoomFloor = new Map();
for (const [f, sv] of SV) for (const id of sv.rooms.keys()) {
  if (svgRoomFloor.has(id)) err('V2', `房號 ${id} 在多個樓層的 SVG 重複出現`);
  svgRoomFloor.set(id, f);
  if (!csvRooms.has(id)) err('V2', `SVG 的房間 ${id}（${f}F）不在 rooms.csv`);
  const nd = nodes.get(id);
  if (!nd || nd.type !== 'room') err('V2', `SVG 的房間 ${id}（${f}F）在圖裡沒有對應的 room 節點（節點 id 必須等於房號）`);
}

// ---------- V3 ----------
for (const [f, sv] of SV) {
  const doorsOf = new Map();
  for (const d of sv.doors) {
    if (!sv.rooms.has(d.room)) { err('V3', `${f}F 的門指向不存在的房間 ${d.room}`); continue; }
    if (!doorsOf.has(d.room)) doorsOf.set(d.room, []);
    doorsOf.get(d.room).push(d);
    const mid = [(d.a[0] + d.b[0]) / 2, (d.a[1] + d.b[1]) / 2];
    const bd = distBoundary(mid, sv.rooms.get(d.room));
    if (bd > TOL_DOOR) err('V3', `${f}F 房間 ${d.room} 的門中點離房間邊 ${bd.toFixed(2)} m，必須落在房間牆上（容許 ${TOL_DOOR} m）`);
  }
  for (const id of sv.rooms.keys()) if (!doorsOf.has(id)) err('V3', `${f}F 房間 ${id} 沒有門（需要 <line class="door" data-room="${id}" ...>）`);
}

// ---------- V4 / V5 ----------
const seen = new Set();
const adj = new Map([...nodes.keys()].map(k => [k, []]));
for (const e of graph.edges ?? []) {
  const label = `${e.a}—${e.b}`;
  const A = nodes.get(e.a), B = nodes.get(e.b);
  if (!A || !B) { err('V4', `邊 ${label} 的端點不存在`); continue; }
  if (e.a === e.b) { err('V4', `邊 ${label} 自己連自己`); continue; }
  if (!EDGE_KINDS.has(e.kind)) { err('V4', `邊 ${label} 的 kind 不合法：${e.kind}`); continue; }
  const key = [e.a, e.b].sort().join('|') + '|' + e.kind;
  if (seen.has(key)) err('V4', `邊重複：${label}（${e.kind}）`);
  seen.add(key);
  if (!(e.w > 0)) { err('V5', `邊 ${label} 的 w 必須是正數`); continue; }
  if (e.kind === 'walk') {
    if (A.floor !== B.floor) err('V5', `走路邊 ${label} 跨了樓層（${A.floor}F→${B.floor}F），請改用 stair 或 elev`);
    else {
      const d = Math.hypot(A.x - B.x, A.z - B.z);
      if (e.w < d - TOL_W) err('V5', `走路邊 ${label} 的 w=${e.w} 小於直線距離 ${d.toFixed(3)}（會讓 A* 的啟發式失準）`);
    }
  } else if (A.floor === B.floor) err('V5', `${e.kind} 邊 ${label} 兩端在同一層`);
  adj.get(e.a).push({ to: e.b, kind: e.kind });
  adj.get(e.b).push({ to: e.a, kind: e.kind });
}

// ---------- V6 ----------
function reach(startIds, banned) {
  const seenN = new Set(startIds), q = [...startIds];
  while (q.length) {
    const u = q.pop();
    for (const e of adj.get(u) ?? []) {
      if (e.kind === banned || seenN.has(e.to)) continue;
      seenN.add(e.to); q.push(e.to);
    }
  }
  return seenN;
}
const entrances = [...nodes.values()].filter(n => n.type === 'entrance').map(n => n.id);
if (!entrances.length) err('V6', '圖裡沒有 type 為 entrance 的入口節點');
else {
  const roomIds = [...nodes.values()].filter(n => n.type === 'room').map(n => n.id);
  for (const [banned, label, level] of [[null, '任何方式', 'error'], ['elev', '只走樓梯', 'warn'], ['stair', '只走電梯', 'warn']]) {
    const ok = reach(entrances, banned);
    const lost = roomIds.filter(id => !ok.has(id));
    if (lost.length) {
      const msg = `${label}無法到達 ${lost.length} 間房：${lost.slice(0, 8).join('、')}${lost.length > 8 ? '…' : ''}`;
      level === 'error' ? err('V6', msg) : warn('V6', msg);
    }
  }
}

// ---------- V7 / V8 ----------
for (const n of nodes.values()) {
  const sv = SV.get(n.floor);
  if (!sv || sv.outlines.length !== 1) continue;
  if (!insideOrOn([n.x, n.z], sv.outlines[0], TOL_POS)) err('V7', `節點 ${n.id}（${n.floor}F）座標 (${n.x}, ${n.z}) 在外框之外`);
}
for (const n of nodes.values()) {
  const sv = SV.get(n.floor);
  if (!sv) continue;
  if (n.type === 'room') {
    const poly = sv.rooms.get(n.id);
    if (poly && !insideOrOn([n.x, n.z], poly, TOL_POS)) err('V8', `房間節點 ${n.id} 不在自己的房間多邊形內`);
  } else if (n.type === 'door') {
    const rid = n.id.split('#')[0];
    const poly = sv.rooms.get(rid);
    if (!n.id.includes('#door') || !poly) { err('V8', `門節點 ${n.id} 的 id 必須是「房號#door」且房號存在於同一層`); continue; }
    const bd = distBoundary([n.x, n.z], poly);
    if (bd > TOL_DOOR) err('V8', `門節點 ${n.id} 離房間邊 ${bd.toFixed(2)} m，必須在房間牆上`);
    const lines = sv.doors.filter(d => d.room === rid);
    const best = Math.min(...lines.map(d => dist([n.x, n.z], [(d.a[0] + d.b[0]) / 2, (d.a[1] + d.b[1]) / 2])));
    if (lines.length && best > TOL_DOOR) err('V8', `門節點 ${n.id} 離 SVG 的門線段中點 ${best.toFixed(2)} m，兩者必須對上`);
  }
}
// 每個房間應該有 door 節點
for (const [id, f] of svgRoomFloor) if (!nodes.has(`${id}#door`)) err('V8', `房間 ${id}（${f}F）缺少門節點 ${id}#door`);

// ---------- V9 ----------
const shaftFloors = new Map();
for (const [f, sv] of SV) for (const [id, s] of sv.shafts) {
  if (!shaftFloors.has(id)) shaftFloors.set(id, { kind: s.kind, floors: [] });
  const rec = shaftFloors.get(id);
  if (rec.kind !== s.kind) err('V9', `${id} 在不同樓層的類型不一致（${rec.kind} / ${s.kind}）`);
  rec.floors.push(f);
}
const edgeSet = new Set();
for (const e of graph.edges ?? []) { edgeSet.add(`${e.a}|${e.b}|${e.kind}`); edgeSet.add(`${e.b}|${e.a}|${e.kind}`); }
for (const [id, rec] of shaftFloors) {
  const wantType = rec.kind === 'stair' ? 'stair' : 'elevator';
  const wantEdge = rec.kind === 'stair' ? 'stair' : 'elev';
  let ref = null;
  for (const f of rec.floors) {
    const n = nodes.get(`${id}@${f}`);
    if (!n) { err('V9', `${id} 在 ${f}F 的 SVG 有，但圖裡缺少節點 ${id}@${f}`); continue; }
    if (n.type !== wantType) err('V9', `節點 ${n.id} 的 type 應為 ${wantType}，目前是 ${n.type}`);
    if (!insideOrOn([n.x, n.z], SV.get(f).shafts.get(id).poly, TOL_POS)) err('V9', `節點 ${n.id} 不在 SVG 的 ${id} 多邊形內`);
    if (!ref) ref = n;
    else if (Math.hypot(n.x - ref.x, n.z - ref.z) > TOL_POS) err('V9', `${id} 各層座標不一致：${ref.id}=(${ref.x},${ref.z})，${n.id}=(${n.x},${n.z})`);
  }
  for (let i = 0; i < floors.length - 1; i++) {
    const f = floors[i], g = floors[i + 1];
    if (rec.floors.includes(f) && rec.floors.includes(g) && !edgeSet.has(`${id}@${f}|${id}@${g}|${wantEdge}`)) {
      err('V9', `缺少跨層邊：${id}@${f} — ${id}@${g}（kind=${wantEdge}）`);
    }
  }
}
for (const n of nodes.values()) {
  if (n.type !== 'stair' && n.type !== 'elevator') continue;
  const sid = n.id.split('@')[0];
  if (!shaftFloors.get(sid)?.floors.includes(n.floor)) err('V9', `節點 ${n.id} 在 ${n.floor}F 的 SVG 裡找不到對應的 ${sid}`);
}

report();
