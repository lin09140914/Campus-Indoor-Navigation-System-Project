// 用「手算」的最短距離驗證 findRoute。目前用的是樣板資料（data/graph.json）。
// 換成真實資料後，這些期望值要重新手算，不能直接沿用。
//
// 樣板資料的幾個關鍵數字（單位：公尺）：
//   房間中心 → 門口 3.75；門口 → 走廊 1.5；相鄰門口之間 6（x = 8, 14, 20, 26, 32）
//   走廊 x=2.5 為電梯入口，x=37.5 為樓梯入口；入口到電梯／樓梯節點 3.0
//   跨層：樓梯 8、電梯 5；ENTRANCE 在 x=0.5，到電梯入口 2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { findRoute } from './findRoute.js';

const graph = JSON.parse(fs.readFileSync(new URL('../../data/graph.json', import.meta.url), 'utf8'));

const near = (a, b) => Math.abs(a - b) < 1e-9;

// [說明, 起, 迄, mode, 期望距離, 期望 via]
const CASES = [
  // 同層：3.75 + 1.5 + 24 + 1.5 + 3.75
  ['01 同層上排 M101→M105', 'M101', 'M105', 'any', 34.5, null],
  // 同一個 x，上排到下排：3.75 + 1.5 + 1.5 + 3.75
  ['02 同層對門 M101→M106', 'M101', 'M106', 'any', 10.5, null],
  // 上排左 → 下排右：3.75 + 1.5 + 24 + 1.5 + 3.75
  ['03 同層斜對角 M101→M110', 'M101', 'M110', 'any', 34.5, null],
  // M102(x=14) → M109(x=26)：3.75 + 1.5 + 12 + 1.5 + 3.75
  ['04 同層 M102→M109', 'M102', 'M109', 'any', 22.5, null],
  // 3 樓同一個 x
  ['05 3F 對門 M303→M308', 'M303', 'M308', 'any', 10.5, null],
  // 電梯：10.75 + 3 + 5 + 3 + 10.75；樓梯要繞到最東邊：5.25 + 29.5 + 3 + 8 + 3 + 29.5 + 5.25
  ['06 跨層 any M101→M201（電梯較近）', 'M101', 'M201', 'any', 32.5, 'elev'],
  ['07 跨層只走樓梯 M101→M201', 'M101', 'M201', 'stair', 83.5, 'stair'],
  // M105(x=32) 靠近樓梯：5.25 + 5.5 + 3 + 8 + 3 + 5.5 + 5.25；電梯：5.25 + 29.5 + 3 + 5 + 3 + 29.5 + 5.25
  ['08 跨層 any M105→M205（樓梯較近）', 'M105', 'M205', 'any', 35.5, 'stair'],
  ['09 跨層只走電梯 M105→M205', 'M105', 'M205', 'elev', 80.5, 'elev'],
  // 兩層電梯：10.75 + 3 + 5 + 5 + 3 + 10.75
  ['10 跨兩層 M101→M301（電梯）', 'M101', 'M301', 'elev', 37.5, 'elev'],
  // 入口 → 走廊：2.0 + 5.5 + 1.5 + 3.75
  ['11 從入口出發 ENTRANCE→M101', 'ENTRANCE', 'M101', 'any', 12.75, null],
  ['12 起迄點相同 M101→M101', 'M101', 'M101', 'any', 0, null],
];

for (const [name, from, to, mode, length, via] of CASES) {
  test(name, () => {
    const r = findRoute(graph, from, to, mode);
    assert.ok(r, '不應該回傳 null');
    assert.ok(near(r.length, length), `距離應為 ${length}，實際 ${r.length}`);
    assert.equal(r.via, via);
    assert.equal(r.path[0].id, from);
    assert.equal(r.path.at(-1).id, to);
  });
}

test('樓層欄位：起點與終點樓層', () => {
  const r = findRoute(graph, 'M101', 'M305', 'any');
  assert.deepEqual(r.floors, [1, 3]);
});

test('路徑中相鄰節點之間一定有邊（路徑沒有跳躍）', () => {
  const r = findRoute(graph, 'M105', 'M310', 'any');
  const has = (a, b) => graph.edges.some(e => (e.a === a && e.b === b) || (e.a === b && e.b === a));
  for (let i = 0; i < r.path.length - 1; i++) {
    assert.ok(has(r.path[i].id, r.path[i + 1].id), `${r.path[i].id} 和 ${r.path[i + 1].id} 之間沒有邊`);
  }
});

test('房號不存在 → null，不丟例外', () => {
  assert.equal(findRoute(graph, 'M101', 'X999', 'any'), null);
  assert.equal(findRoute(graph, 'X999', 'M101', 'any'), null);
});

test('mode 不合法 → RangeError', () => {
  assert.throws(() => findRoute(graph, 'M101', 'M201', 'teleport'), RangeError);
});

test('找不到路徑 → null（把電梯和樓梯都拿掉的假圖）', () => {
  const g = {
    nodes: [
      { id: 'A', x: 0, z: 0, floor: 1, type: 'room' },
      { id: 'B', x: 0, z: 0, floor: 2, type: 'room' },
    ],
    edges: [{ a: 'A', b: 'B', w: 5, kind: 'elev' }],
  };
  assert.equal(findRoute(g, 'A', 'B', 'stair'), null);
  assert.ok(findRoute(g, 'A', 'B', 'elev'));
});

test('結果與暴力搜尋（Dijkstra）一致：所有房間兩兩配對', () => {
  const rooms = graph.nodes.filter(n => n.type === 'room').map(n => n.id);
  // 簡單的 Dijkstra 當對照
  const adj = new Map(graph.nodes.map(n => [n.id, []]));
  for (const e of graph.edges) { adj.get(e.a).push([e.b, e.w]); adj.get(e.b).push([e.a, e.w]); }
  const dijkstra = src => {
    const d = new Map(graph.nodes.map(n => [n.id, Infinity]));
    d.set(src, 0);
    const todo = new Set(graph.nodes.map(n => n.id));
    while (todo.size) {
      let u = null;
      for (const id of todo) if (u === null || d.get(id) < d.get(u)) u = id;
      todo.delete(u);
      for (const [v, w] of adj.get(u)) if (d.get(u) + w < d.get(v)) d.set(v, d.get(u) + w);
    }
    return d;
  };
  for (const a of rooms) {
    const d = dijkstra(a);
    for (const b of rooms) {
      const r = findRoute(graph, a, b, 'any');
      assert.ok(near(r.length, d.get(b)), `${a}→${b}：A* ${r.length}，Dijkstra ${d.get(b)}`);
    }
  }
});
