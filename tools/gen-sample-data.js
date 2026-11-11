// 產生「樣板資料」：3 層樓、每層 10 間房，格式完全照 docs/spec.md 第 4 章。
// 這是假資料，不是工程五館（房號 M101… 也只是示範）。地圖資料組拿到真實資料後，直接取代 data/ 底下的檔案即可。
//
// 用法：node tools/gen-sample-data.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
fs.mkdirSync(path.join(dataDir, 'svg'), { recursive: true });

const FLOORS = [1, 2, 3];
const FLOOR_HEIGHT = 4.0;
const DOOR_W = 1.4;
const CX = [8, 14, 20, 26, 32];                 // 每間房的中心 x（上排與下排相同）
const ROOM_W = 6, ROOM_D = 7.5;
const TOP_Y = 1, BOT_Y = 11.5;                  // 上排 / 下排房間的 z 起點
const CORR_Z0 = 8.5, CORR_Z1 = 11.5, CORR_MID = 10;
const ELEV = { id: 'ELEV-A', x: 1, y: 5.5, w: 3, h: 3 };
const STAIR = { id: 'STAIR-A', x: 36, y: 5.5, w: 3, h: 3 };

const r3 = n => Math.round(n * 1000) / 1000;
const poly = (x, y, w, h) => `${x},${y} ${x + w},${y} ${x + w},${y + h} ${x},${y + h}`;
const roomId = (f, i) => `M${f}${String(i + 1).padStart(2, '0')}`;   // i = 0..9

// ---------- SVG ----------
function svgFor(f) {
  const lines = [];
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 20">`);
  lines.push(`  <!-- 樣板資料（假的）：${f}F。單位＝公尺，原點＝建築外框左上角 -->`);
  lines.push(`  <polygon class="outline" points="0,0 40,0 40,20 0,20"/>`);
  lines.push(`  <polygon class="corridor" points="0,${CORR_Z0} 40,${CORR_Z0} 40,${CORR_Z1} 0,${CORR_Z1}"/>`);
  CX.forEach((cx, i) => {   // 上排 01..05
    const id = roomId(f, i);
    lines.push(`  <polygon class="room" id="${id}" points="${poly(cx - ROOM_W / 2, TOP_Y, ROOM_W, ROOM_D)}"/>`);
    lines.push(`  <line class="door" data-room="${id}" x1="${r3(cx - DOOR_W / 2)}" y1="${CORR_Z0}" x2="${r3(cx + DOOR_W / 2)}" y2="${CORR_Z0}"/>`);
  });
  CX.forEach((cx, i) => {   // 下排 06..10
    const id = roomId(f, i + 5);
    lines.push(`  <polygon class="room" id="${id}" points="${poly(cx - ROOM_W / 2, BOT_Y, ROOM_W, ROOM_D)}"/>`);
    lines.push(`  <line class="door" data-room="${id}" x1="${r3(cx - DOOR_W / 2)}" y1="${CORR_Z1}" x2="${r3(cx + DOOR_W / 2)}" y2="${CORR_Z1}"/>`);
  });
  lines.push(`  <polygon class="elevator" id="${ELEV.id}" points="${poly(ELEV.x, ELEV.y, ELEV.w, ELEV.h)}"/>`);
  lines.push(`  <polygon class="stair" id="${STAIR.id}" points="${poly(STAIR.x, STAIR.y, STAIR.w, STAIR.h)}"/>`);
  lines.push(`</svg>`);
  return lines.join('\n') + '\n';
}

// ---------- graph ----------
const nodes = [], edges = [];
const byId = new Map();
function addNode(id, x, z, floor, type) {
  const n = { id, x: r3(x), z: r3(z), floor, type };
  nodes.push(n); byId.set(id, n); return n;
}
function link(a, b, kind = 'walk', w = null) {
  const A = byId.get(a), B = byId.get(b);
  const dist = Math.hypot(A.x - B.x, A.z - B.z);
  edges.push({ a, b, w: r3(w ?? dist), kind });
}

for (const f of FLOORS) {
  const cid = n => `F${f}-C-${String(n).padStart(2, '0')}`;
  // 走廊節點：電梯入口、五個門口正前方、樓梯入口
  addNode(cid(1), 2.5, CORR_MID, f, 'corridor');
  CX.forEach((cx, i) => addNode(cid(i + 2), cx, CORR_MID, f, 'corridor'));
  addNode(cid(7), 37.5, CORR_MID, f, 'corridor');
  // 電梯與樓梯
  addNode(`${ELEV.id}@${f}`, ELEV.x + ELEV.w / 2, ELEV.y + ELEV.h / 2, f, 'elevator');
  addNode(`${STAIR.id}@${f}`, STAIR.x + STAIR.w / 2, STAIR.y + STAIR.h / 2, f, 'stair');
  if (f === 1) addNode('ENTRANCE', 0.5, CORR_MID, 1, 'entrance');
  // 房間與門
  for (let i = 0; i < 10; i++) {
    const id = roomId(f, i);
    const cx = CX[i % 5];
    const top = i < 5;
    const z0 = top ? TOP_Y : BOT_Y;
    const doorZ = top ? CORR_Z0 : CORR_Z1;
    addNode(id, cx, z0 + ROOM_D / 2, f, 'room');
    addNode(`${id}#door`, cx, doorZ, f, 'door');
    link(id, `${id}#door`);
    link(`${id}#door`, cid((i % 5) + 2));
  }
  // 走廊串連
  for (let n = 1; n < 7; n++) link(cid(n), cid(n + 1));
  link(`${ELEV.id}@${f}`, cid(1));
  link(`${STAIR.id}@${f}`, cid(7));
  if (f === 1) link('ENTRANCE', cid(1));
}
for (let k = 0; k < FLOORS.length - 1; k++) {
  const f = FLOORS[k], g = FLOORS[k + 1];
  link(`${STAIR.id}@${f}`, `${STAIR.id}@${g}`, 'stair', 8);   // 預設值，請依實測調整
  link(`${ELEV.id}@${f}`, `${ELEV.id}@${g}`, 'elev', 5);
}

// ---------- 輸出 ----------
for (const f of FLOORS) fs.writeFileSync(path.join(dataDir, 'svg', `floor-${f}.svg`), svgFor(f));

fs.writeFileSync(path.join(dataDir, 'graph.json'),
  JSON.stringify({ version: 1, building: 'eng5-sample', unit: 'm', nodes, edges }, null, 2) + '\n');

const names = ['示範教室', '示範教室', '示範教室', '示範教室', '示範辦公室', '示範實驗室', '示範實驗室', '示範教室', '示範教室', '示範廁所'];
const types = ['classroom', 'classroom', 'classroom', 'classroom', 'office', 'lab', 'lab', 'classroom', 'classroom', 'restroom'];
const rows = ['room_id,floor,name,type,node_id'];
for (const f of FLOORS) for (let i = 0; i < 10; i++) {
  const id = roomId(f, i);
  rows.push(`${id},${f},${names[i]} ${id},${types[i]},${id}`);
}
fs.writeFileSync(path.join(dataDir, 'rooms.csv'), '﻿' + rows.join('\n') + '\n');   // 加 BOM，Excel 才不會亂碼

fs.writeFileSync(path.join(dataDir, 'building.json'),
  JSON.stringify({ id: 'eng5-sample', name: '示範建築（樣板資料，不是工程五館）', floors: FLOORS, floorHeight: FLOOR_HEIGHT, unit: 'm', sample: true }, null, 2) + '\n');

console.log(`已產生樣板資料：${FLOORS.length} 層、${nodes.length} 個節點、${edges.length} 條邊 → ${dataDir}`);
