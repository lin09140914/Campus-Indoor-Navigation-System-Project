// 圖論路徑組：A* 最短路徑。純函式，不依賴任何瀏覽器 API（可在 Node 測試）。
// 規格：docs/spec.md 第 4.5 節。
//
// findRoute(graph, fromId, toId, mode = 'any')
//   graph  : 讀入的 graph.json（{ nodes, edges }）
//   fromId : 起點節點 id（通常是房號，例如 'M101'；也可以是 'ENTRANCE'）
//   toId   : 終點節點 id
//   mode   : 'any' 樓梯或電梯皆可 | 'stair' 只走樓梯 | 'elev' 只走電梯
// 回傳：
//   { path: [{ id, x, z, floor, type }, ...], length, floors: [起點樓層, 終點樓層], via }
//   via = 路徑上第一個跨樓層邊的種類（'stair' | 'elev'），同層則為 null
//   找不到路徑、或起迄點 id 不存在 → 回傳 null（不丟例外）
//   mode 不是合法值 → 丟 RangeError（這是呼叫端的程式錯誤）

const MODES = new Set(['any', 'stair', 'elev']);
const indexCache = new WeakMap();

function buildIndex(graph) {
  let idx = indexCache.get(graph);
  if (idx) return idx;
  const nodes = new Map(graph.nodes.map(n => [n.id, n]));
  const adj = new Map(graph.nodes.map(n => [n.id, []]));
  for (const e of graph.edges) {
    if (!adj.has(e.a) || !adj.has(e.b)) continue;          // 壞邊交給 validate-data 抓
    adj.get(e.a).push({ to: e.b, w: e.w, kind: e.kind });
    adj.get(e.b).push({ to: e.a, w: e.w, kind: e.kind });  // 圖是無向的
  }
  idx = { nodes, adj };
  indexCache.set(graph, idx);
  return idx;
}

class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(item) {
    const a = this.a;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

export function findRoute(graph, fromId, toId, mode = 'any') {
  if (!MODES.has(mode)) throw new RangeError(`mode 必須是 any / stair / elev，收到：${mode}`);
  const { nodes, adj } = buildIndex(graph);
  const start = nodes.get(fromId), goal = nodes.get(toId);
  if (!start || !goal) return null;

  const pack = (ids, length, kinds) => {
    const path = ids.map(id => {
      const n = nodes.get(id);
      return { id: n.id, x: n.x, z: n.z, floor: n.floor, type: n.type };
    });
    const via = kinds.find(k => k === 'stair' || k === 'elev') ?? null;
    return { path, length, floors: [start.floor, goal.floor], via };
  };

  if (fromId === toId) return pack([fromId], 0, []);

  // 啟發函式：平面直線距離。不計樓層，所以不會高估（走路邊的 w 不小於直線距離，跨層邊 ≥ 0）。
  const h = id => {
    const n = nodes.get(id);
    return Math.hypot(n.x - goal.x, n.z - goal.z);
  };

  const g = new Map([[fromId, 0]]);
  const came = new Map();
  const cameKind = new Map();
  const closed = new Set();
  const open = new MinHeap();
  open.push([h(fromId), fromId]);

  while (open.size) {
    const [, cur] = open.pop();
    if (closed.has(cur)) continue;
    if (cur === toId) {
      const ids = [cur], kinds = [];
      let c = cur;
      while (came.has(c)) { kinds.push(cameKind.get(c)); c = came.get(c); ids.push(c); }
      return pack(ids.reverse(), g.get(toId), kinds.reverse());
    }
    closed.add(cur);
    for (const e of adj.get(cur)) {
      if (mode === 'stair' && e.kind === 'elev') continue;
      if (mode === 'elev' && e.kind === 'stair') continue;
      if (closed.has(e.to)) continue;
      const t = g.get(cur) + e.w;
      if (t < (g.get(e.to) ?? Infinity)) {
        g.set(e.to, t);
        came.set(e.to, cur);
        cameKind.set(e.to, e.kind);
        open.push([t + h(e.to), e.to]);
      }
    }
  }
  return null;
}
