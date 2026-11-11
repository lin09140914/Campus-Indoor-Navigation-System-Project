// 【假元件】給 UI 組在 3D 組還沒完成時使用。介面和 docs/spec.md 第 4.6 節一致，
// 但只是在容器裡顯示一行文字，所有方法都只記錄呼叫、不做事。
// 真的 createViewer3D 好了之後，把 import 換掉即可。

export function createViewer3D(container, options = {}) {
  const box = document.createElement('div');
  box.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100%;min-height:200px;background:#101826;color:#9fb0c8;font:14px system-ui;text-align:center;padding:16px';
  box.textContent = '3D 檢視（stub，尚未實作）';
  container.appendChild(box);

  const state = { floor: 'all', explode: 0, route: null, user: null, clickCb: null };
  const log = (name, ...args) => console.debug(`[viewer3d.stub] ${name}`, ...args);

  return {
    setFloor(floor) { state.floor = floor; log('setFloor', floor); },
    setExplode(meters) { state.explode = meters; log('setExplode', meters); },
    highlightRoom(roomId, role) { log('highlightRoom', roomId, role); },
    showRoute(routeResult) { state.route = routeResult; log('showRoute', routeResult?.length); },
    setUserPosition(pos) { state.user = pos; log('setUserPosition', pos); },
    onRoomClick(cb) { state.clickCb = cb; log('onRoomClick registered'); },
    // 測試用：模擬使用者點了某間房
    _simulateClick(roomId) { state.clickCb?.(roomId); },
    dispose() { box.remove(); log('dispose'); },
    _state: state,
    _options: options,
  };
}
