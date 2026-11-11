// 【假模組】給 UI 組和 3D 組在定位組還沒完成時使用。介面和 docs/spec.md 第 4.7 節一致。
// 它不看感測器：起點由 startAt 決定，之後位置只在 confirm / reset 時改變。
// 真的 createPositioning 好了之後，把 import 換掉即可。

export function createPositioning(graph) {
  const nodes = new Map(graph.nodes.map(n => [n.id, n]));
  const listeners = new Set();
  let state = null;

  const emit = () => { if (state) for (const cb of listeners) cb({ ...state }); };
  const set = (x, z, floor, confidence) => {
    state = { x, z, floor, confidence, distSinceConfirm: 0, ts: Date.now() };
    emit();
  };

  return {
    startAt(p) {
      if (p.nodeId) {
        const n = nodes.get(p.nodeId);
        if (!n) throw new Error(`找不到節點：${p.nodeId}`);
        set(n.x, n.z, n.floor, 'confirmed');
      } else {
        set(p.x, p.z, p.floor, 'estimated');
      }
    },
    confirm(nodeId) {
      const n = nodes.get(nodeId);
      if (!n) throw new Error(`找不到節點：${nodeId}`);
      set(n.x, n.z, n.floor, 'confirmed');
    },
    reset({ x, z, floor }) { set(x, z, floor, 'confirmed'); },
    onUpdate(cb) { listeners.add(cb); return () => listeners.delete(cb); },
    feed(_sample) { /* stub：不處理感測器數據 */ },
    stop() { listeners.clear(); state = null; },
    get state() { return state ? { ...state } : null; },
  };
}
