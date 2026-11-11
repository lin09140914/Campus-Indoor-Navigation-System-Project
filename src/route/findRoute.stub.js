// 【假函式】給 UI 組在圖論組還沒完成時使用。簽名和輸出格式跟真的 findRoute 完全一樣，
// 但不看 graph，只回傳兩條寫死的路徑：
//   - 目標在 1 樓（房號第二碼是 1）→ 同層路徑 M101 → M105
//   - 其他 → 跨樓層路徑 M101 → M201（搭電梯），用來測「跨樓層提示」
// 真的 findRoute.js 好了之後，把 import 換掉即可，其他程式不用改。

const n = (id, x, z, floor, type) => ({ id, x, z, floor, type });

const SAME_FLOOR = {
  path: [
    n('M101', 8, 4.75, 1, 'room'), n('M101#door', 8, 8.5, 1, 'door'),
    n('F1-C-02', 8, 10, 1, 'corridor'), n('F1-C-03', 14, 10, 1, 'corridor'),
    n('F1-C-04', 20, 10, 1, 'corridor'), n('F1-C-05', 26, 10, 1, 'corridor'),
    n('F1-C-06', 32, 10, 1, 'corridor'), n('M105#door', 32, 8.5, 1, 'door'),
    n('M105', 32, 4.75, 1, 'room'),
  ],
  length: 34.5,
  floors: [1, 1],
  via: null,
};

const CROSS_FLOOR = {
  path: [
    n('M101', 8, 4.75, 1, 'room'), n('M101#door', 8, 8.5, 1, 'door'),
    n('F1-C-02', 8, 10, 1, 'corridor'), n('F1-C-01', 2.5, 10, 1, 'corridor'),
    n('ELEV-A@1', 2.5, 7, 1, 'elevator'), n('ELEV-A@2', 2.5, 7, 2, 'elevator'),
    n('F2-C-01', 2.5, 10, 2, 'corridor'), n('F2-C-02', 8, 10, 2, 'corridor'),
    n('M201#door', 8, 8.5, 2, 'door'), n('M201', 8, 4.75, 2, 'room'),
  ],
  length: 32.5,
  floors: [1, 2],
  via: 'elev',
};

export function findRoute(_graph, fromId, toId, mode = 'any') {
  if (!fromId || !toId || fromId === toId) return null;
  const sameFloor = String(toId).charAt(1) === '1';
  const r = sameFloor ? SAME_FLOOR : CROSS_FLOOR;
  if (!sameFloor && mode === 'stair') return { ...CROSS_FLOOR, via: 'stair', length: 83.5 };
  return structuredClone(r);
}
