import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildGraph, readAnnotations, renderRoomsCsv, renderOutputs, draftDir, normalizeText } from './build-floor1-graph.mjs';
import { findDraftRoute } from '../examples/floor1-draft-route.mjs';

const input = readAnnotations();
const source = fs.readFileSync(new URL('../data/svg/floor-1.svg', import.meta.url), 'utf8');
const graph = buildGraph(input, source);

test('草稿可重現，未測量座標不冒用公尺', () => {
  assert.equal(graph.unit, 'svg-unit');
  assert.equal(graph.status, 'draft');
  assert.equal(graph.svg_transform.scale_m_per_svg_unit, null);
  assert.deepEqual(graph, JSON.parse(fs.readFileSync(`${draftDir}/graph.json`, 'utf8')));
  assert.equal(renderRoomsCsv(input), normalizeText(fs.readFileSync(`${draftDir}/rooms.csv`, 'utf8')));
  assert.deepEqual(buildGraph(input, normalizeText(source).replaceAll('\n', '\r\n')), graph);
  assert.equal(new Set(graph.nodes.map(n => n.id)).size, graph.nodes.length);
  assert.ok(graph.nodes.every(n => n.floor === 1));
  assert.ok(graph.edges.every(e => e.kind === 'walk'));
});

test('全部目的地可從西入口到達，跨 A/B 區經由甲梯東側通道', () => {
  for (const n of graph.nodes) assert.ok(findDraftRoute(graph, 'ENTRANCE-A-W', n.id), `漏接節點 ${n.id}`);
  const route = findDraftRoute(graph, 'A125', 'B101');
  const corridorX = 1765 / 2;
  assert.ok(route.path.some(n => n.x === corridorX && n.z === 405 / 2));
  assert.ok(route.path.some(n => n.x === corridorX && n.z === 1108 / 2));
  assert.equal(route.via, null);
});

test('B103 與南側 A119 只能透過圖上內門相連的房間進入', () => {
  for (const [room, through] of [['B103', 'B105'], ['TEMP-A119-S', 'A120']]) {
    const route = findDraftRoute(graph, 'ENTRANCE-A-N', room);
    assert.deepEqual(route.path.slice(-3).map(n => n.id), [through, `${room}#door`, room]);
    const blocked = { ...graph, edges: graph.edges.filter(e => e.a !== through && e.b !== through) };
    assert.equal(findDraftRoute(blocked, 'ENTRANCE-A-N', room), null, `${room} 不可穿牆直連走廊`);
  }
});

test('重複標號保留原始房號，暫名不混用為正式房號', () => {
  for (const label of ['A119', 'A114']) {
    const matches = graph.nodes.filter(n => n.role === 'room' && n.source_label === label);
    assert.equal(matches.length, 2);
    assert.ok(matches.every(n => n.temporary_id && n.id.startsWith('TEMP-')));
    assert.equal(graph.nodes.some(n => n.id === label), false);
  }
});

test('邊長符合幾何距離，填入比例後節點與路線長度一起換算', () => {
  const nodes = new Map(graph.nodes.map(n => [n.id, n]));
  for (const e of graph.edges) {
    const a = nodes.get(e.a), b = nodes.get(e.b);
    assert.ok(a && b);
    assert.equal(e.w, Math.hypot(a.x - b.x, a.z - b.z));
    assert.ok(e.w > 0);
  }
  const calibrated = structuredClone(input);
  calibrated.svgTransform = { scale_m_per_svg_unit: 0.1, rotation_deg: 0, origin_x_m: 0, origin_z_m: 0 };
  const scaled = buildGraph(calibrated, source);
  assert.equal(scaled.unit, 'm');
  const a = findDraftRoute(graph, 'A125', 'B103'), b = findDraftRoute(scaled, 'A125', 'B103');
  assert.ok(Math.abs(b.length - a.length * 0.1) < 1e-8);
  assert.deepEqual(b.path.map(n => n.id), a.path.map(n => n.id));
});

test('SVG 來源改變或校正值錯誤時拒絕產生誤對齊資料', () => {
  assert.throws(() => buildGraph(input, source + '\n'), /SVG 已改變/);
  for (const factor of [0, -1, '0.1']) {
    const bad = structuredClone(input); bad.svgTransform = { scale_m_per_svg_unit: factor, rotation_deg: 0, origin_x_m: 0, origin_z_m: 0 };
    assert.throws(() => buildGraph(bad, source), /svgTransform|scale_m_per_svg_unit/);
  }
});

test('新版 Node Mapping 與目的地逐一對應，跨資料版本相同', () => {
  const outputs = renderOutputs(input, graph);
  const mapping = JSON.parse(outputs['node_map.json']), destinations = JSON.parse(outputs['destinations.json']);
  const floors = JSON.parse(outputs['floors.pending.json']);
  assert.ok(graph.nodes.every(n => ['walk', 'door', 'stair', 'elev'].includes(n.type)));
  assert.equal(mapping.entries.length, graph.nodes.length);
  assert.equal(new Set(mapping.entries.map(e => e.svg_anchor_id)).size, graph.nodes.length);
  assert.equal(destinations.locations.length, 48);
  for (const doc of [mapping, destinations, floors]) {
    assert.equal(doc.building_id, graph.building_id); assert.equal(doc.map_version, graph.map_version);
  }
  for (const loc of destinations.locations) assert.ok(graph.nodes.some(n => n.id === loc.node_id && n.floor === loc.floor));
  assert.equal(floors.floors[0].elevation_m, null);
  for (const [name, content] of Object.entries(outputs)) assert.equal(normalizeText(fs.readFileSync(`${draftDir}/${name}`, 'utf8')), content);
});

test('SVG 轉世界座標同時套用 viewBox 原點、旋轉、比例與平移', () => {
  const rotated = structuredClone(input);
  rotated.source.viewBox[0] = 10;
  rotated.source.viewBox[1] = 20;
  rotated.svgTransform = { scale_m_per_svg_unit: 0.2, rotation_deg: 90, origin_x_m: 100, origin_z_m: -20 };
  const world = buildGraph(rotated, source);
  const before = graph.nodes.find(n => n.id === 'A125'), after = world.nodes.find(n => n.id === 'A125');
  assert.ok(Math.abs(after.x - (100 - 0.2 * (before.z - 20))) < 1e-8);
  assert.ok(Math.abs(after.z - (-20 + 0.2 * (before.x - 10))) < 1e-8);
  assert.ok(Math.abs(findDraftRoute(world, 'A125', 'B103').length - 0.2 * findDraftRoute(graph, 'A125', 'B103').length) < 1e-8);
});
