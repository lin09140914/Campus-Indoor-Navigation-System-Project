// 3D 組：可嵌入 UI 的 3D 檢視元件。規格：docs/spec.md 第 4.6 節。
// 讀「標準 SVG」（spec 4.1）：outline / room / door / corridor / stair / elevator。
//
// const viewer = createViewer3D(container, { svgs, building });
//   svgs     : { 1: '<svg …>', 2: '<svg …>' }  樓層 → SVG 文字
//   building : building.json 的內容（floors、floorHeight）
//
// 錯誤（都是 Error，可用 e.code 辨識，UI 收到就退回 2D）：
//   e.code === 'WEBGL_UNAVAILABLE'  瀏覽器不能用 WebGL
//   e.code === 'BAD_DATA'           SVG 或 building 資料不符規格
//
// 需要在頁面用 importmap 提供 'three' 和 'three/addons/'。
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const WALL_H = 3.4;      // 牆高（公尺）
const SLAB_T = 0.3;      // 樓板厚度
const WALL_T = 0.2;      // 牆厚
const DOOR_TOL = 0.1;    // 門中點離牆多遠仍算在這面牆上
const CONF_COLOR = { confirmed: 0x2fbf71, estimated: 0xffb020, lost: 0x9aa7b8 };
const ROLE_COLOR = { start: 0x2fbf71, goal: 0xe5484d };
const BASE_TILE = 0xdfe6ee;

function fail(code, msg) { const e = new Error(msg); e.code = code; return e; }

// ---------- SVG 解析 ----------
function parseSvg(text, floor) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  if (doc.querySelector('parsererror')) throw fail('BAD_DATA', `floor-${floor}.svg 不是合法的 SVG`);
  const poly = el => {
    const pts = (el.getAttribute('points') ?? '').trim().split(/\s+/).map(p => p.split(',').map(Number));
    if (pts.length < 3 || pts.some(p => p.length !== 2 || p.some(Number.isNaN))) {
      throw fail('BAD_DATA', `floor-${floor}.svg：${el.getAttribute('class')} ${el.id} 的 points 格式錯誤`);
    }
    return pts;
  };
  const all = c => [...doc.querySelectorAll(`.${c}`)];
  const outlineEl = all('outline')[0];
  if (!outlineEl) throw fail('BAD_DATA', `floor-${floor}.svg 缺少 class="outline"`);
  return {
    outline: poly(outlineEl),
    corridors: all('corridor').map(poly),
    rooms: all('room').map(el => ({ id: el.id, pts: poly(el) })),
    doors: all('door').map(el => ({
      room: el.getAttribute('data-room'),
      a: [Number(el.getAttribute('x1')), Number(el.getAttribute('y1'))],
      b: [Number(el.getAttribute('x2')), Number(el.getAttribute('y2'))],
    })),
    shafts: [...all('stair').map(el => ({ id: el.id, kind: 'stair', pts: poly(el) })),
             ...all('elevator').map(el => ({ id: el.id, kind: 'elevator', pts: poly(el) }))],
  };
}

// ---------- 幾何小工具 ----------
function distSeg(p, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
  let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dz));
}
const centroid = pts => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
const bbox = pts => {
  const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
};

// 一條牆邊扣掉門之後剩下的區段
function wallPieces(a, b, doors) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
  if (L < 1e-6) return [];
  const ux = dx / L, uz = dz / L;
  const cuts = [];
  for (const d of doors) {
    const mid = [(d.a[0] + d.b[0]) / 2, (d.a[1] + d.b[1]) / 2];
    if (distSeg(mid, a, b) > DOOR_TOL) continue;
    const t0 = (d.a[0] - a[0]) * ux + (d.a[1] - a[1]) * uz;
    const t1 = (d.b[0] - a[0]) * ux + (d.b[1] - a[1]) * uz;
    cuts.push([Math.max(0, Math.min(t0, t1)), Math.min(L, Math.max(t0, t1))]);
  }
  cuts.sort((p, q) => p[0] - q[0]);
  const spans = [];
  let cur = 0;
  for (const [s, e] of cuts) { if (s > cur + 1e-6) spans.push([cur, s]); cur = Math.max(cur, e); }
  if (cur < L - 1e-6) spans.push([cur, L]);
  return spans.map(([s, e]) => ({
    from: [a[0] + ux * s, a[1] + uz * s], to: [a[0] + ux * e, a[1] + uz * e],
    extStart: s <= 1e-6, extEnd: e >= L - 1e-6,        // 只在轉角那端加長，避免牆角留縫
  }));
}

export function createViewer3D(container, options = {}) {
  const { svgs, building } = options;
  if (!container) throw fail('BAD_DATA', 'createViewer3D 需要一個容器元素');
  if (!building || !Array.isArray(building.floors) || !building.floors.length || !(building.floorHeight > 0)) {
    throw fail('BAD_DATA', 'building 必須包含 floors 陣列與正數的 floorHeight');
  }
  const FLOORS = building.floors;
  const FLOOR_H = building.floorHeight;
  const plans = new Map();
  for (const f of FLOORS) {
    if (typeof svgs?.[f] !== 'string') throw fail('BAD_DATA', `缺少 ${f} 樓的 SVG`);
    plans.set(f, parseSvg(svgs[f], f));
  }

  // ---------- renderer ----------
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch (e) {
    throw fail('WEBGL_UNAVAILABLE', `WebGL 不可用：${e.message}`);
  }
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(options.background ?? 0x101826);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x2a3140, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(30, 60, 20);
  scene.add(sun);

  // ---------- 共用資源 ----------
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const M = {
    slab: new THREE.MeshStandardMaterial({ color: 0x9aa7b8, roughness: 0.9 }),
    wall: new THREE.MeshStandardMaterial({ color: 0xf1f4f8, roughness: 0.8 }),
    outer: new THREE.MeshStandardMaterial({ color: 0xaecbff, transparent: true, opacity: 0.22, depthWrite: false }),
    corridor: new THREE.MeshStandardMaterial({ color: 0xc9d3e0, roughness: 1, side: THREE.DoubleSide }),
    stair: new THREE.MeshStandardMaterial({ color: 0xd8b36a, roughness: 0.8 }),
    elev: new THREE.MeshStandardMaterial({ color: 0x6aa0d8, roughness: 0.5, transparent: true, opacity: 0.7 }),
    route: new THREE.MeshBasicMaterial({ color: 0xff7a1a, depthTest: false }),
    dot: new THREE.MeshBasicMaterial({ color: 0xffb020, depthTest: false }),
  };

  function addWall(group, w, mat, h = WALL_H) {
    const ux = (w.to[0] - w.from[0]), uz = (w.to[1] - w.from[1]), l = Math.hypot(ux, uz);
    const dx = ux / l, dz = uz / l;
    const eS = w.extStart ? WALL_T / 2 : 0, eE = w.extEnd ? WALL_T / 2 : 0;
    const len = l + eS + eE;
    const shift = (eE - eS) / 2;
    const m = new THREE.Mesh(unitBox, mat);
    m.scale.set(len, h, WALL_T);
    m.position.set((w.from[0] + w.to[0]) / 2 + dx * shift, h / 2, (w.from[1] + w.to[1]) / 2 + dz * shift);
    m.rotation.y = -Math.atan2(dz, dx);
    group.add(m);
  }
  // 把多邊形擠出成立體：佔據 y ∈ [yTop - depth, yTop]
  function extrude(group, pts, depth, yTop, mat) {
    const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z)));
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }), mat);
    m.rotation.x = Math.PI / 2;
    m.position.y = yTop;
    group.add(m);
    return m;
  }
  // 貼在地板上的平面多邊形
  function flat(group, pts, y, mat) {
    const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.y = y;
    group.add(m);
    return m;
  }
  function label(text, color = '#1b2430') {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 96;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffffdd'; g.beginPath(); g.roundRect(8, 8, 240, 80, 18); g.fill();
    g.fillStyle = color; g.font = 'bold 44px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 128, 50);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
    s.scale.set(3.6, 1.35, 1);
    s.renderOrder = 10;
    return s;
  }

  // ---------- 建立各樓層 ----------
  const floorGroups = new Map();
  const tiles = [];                 // 可點擊的房間地板
  const tileById = new Map();
  const roleRoom = { start: null, goal: null };

  for (const f of FLOORS) {
    const p = plans.get(f);
    const g = new THREE.Group();
    extrude(g, p.outline, SLAB_T, 0, M.slab);                                  // 樓板
    for (let i = 0; i < p.outline.length; i++) {                              // 外牆（半透明）
      for (const w of wallPieces(p.outline[i], p.outline[(i + 1) % p.outline.length], [])) addWall(g, w, M.outer);
    }
    for (const c of p.corridors) flat(g, c, 0.01, M.corridor);
    for (const r of p.rooms) {
      const doors = p.doors.filter(d => d.room === r.id);
      for (let i = 0; i < r.pts.length; i++) {
        for (const w of wallPieces(r.pts[i], r.pts[(i + 1) % r.pts.length], doors)) addWall(g, w, M.wall);
      }
      const tile = flat(g, r.pts, 0.02, new THREE.MeshStandardMaterial({ color: BASE_TILE, side: THREE.DoubleSide }));
      tile.userData.roomId = r.id;
      g.add(tile);
      tiles.push(tile);
      tileById.set(r.id, tile);
      const [cx, cz] = centroid(r.pts);
      const lab = label(r.id);
      lab.position.set(cx, 1.6, cz);
      g.add(lab);
    }
    for (const s of p.shafts) {
      const bb = bbox(s.pts);
      if (s.kind === 'elevator') extrude(g, s.pts, WALL_H, WALL_H, M.elev);
      else {                                                                   // 樓梯：沿 x 方向的 8 級階梯
        const n = 8, sw = (bb.x1 - bb.x0) / n;
        for (let i = 0; i < n; i++) {
          const sh = (WALL_H / n) * (i + 1);
          const m = new THREE.Mesh(unitBox, M.stair);
          m.scale.set(sw, sh, bb.z1 - bb.z0);
          m.position.set(bb.x0 + sw * (i + 0.5), sh / 2, (bb.z0 + bb.z1) / 2);
          g.add(m);
        }
      }
      const lab = label(s.kind === 'elevator' ? '電梯' : '樓梯', '#8a5a00');
      lab.position.set((bb.x0 + bb.x1) / 2, WALL_H + 1.2, (bb.z0 + bb.z1) / 2);
      g.add(lab);
    }
    const ob = bbox(p.outline);
    const fl = label(`${f}F`, '#2f6fed');
    fl.position.set(ob.x0 - 2.5, 1.5, (ob.z0 + ob.z1) / 2);
    g.add(fl);
    scene.add(g);
    floorGroups.set(f, g);
  }

  // ---------- 狀態 ----------
  let explode = 0;
  let showFloor = 'all';
  let route = null;
  let user = null;
  let clickCb = null;
  const floorIndex = f => (f > 0 ? f - 1 : f);
  const floorY = f => floorIndex(f) * (FLOOR_H + explode);

  const routeGroup = new THREE.Group();
  scene.add(routeGroup);
  const marker = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), M.dot);
  marker.renderOrder = 20;
  marker.visible = false;
  scene.add(marker);
  const userMarker = new THREE.Group();
  const userDot = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), new THREE.MeshBasicMaterial({ color: CONF_COLOR.estimated, depthTest: false }));
  const userRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.15, 40), new THREE.MeshBasicMaterial({ color: CONF_COLOR.estimated, depthTest: false, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));
  userRing.rotation.x = -Math.PI / 2;
  userDot.renderOrder = userRing.renderOrder = 25;
  userMarker.add(userDot, userRing);
  userMarker.visible = false;
  scene.add(userMarker);

  let pts = [], lens = [], total = 0;

  function applyRoute() {
    for (const c of [...routeGroup.children]) { routeGroup.remove(c); c.geometry.dispose(); }
    pts = []; lens = []; total = 0;
    if (!route || !route.path?.length) { marker.visible = false; return; }
    pts = route.path.map(n => new THREE.Vector3(n.x, floorY(n.floor) + 0.5, n.z));
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], len = a.distanceTo(b);
      lens.push(len); total += len;
      if (len < 1e-6) continue;
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, len, 10), M.route);
      cyl.position.copy(a).add(b).multiplyScalar(0.5);
      cyl.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize());
      cyl.renderOrder = 15;
      routeGroup.add(cyl);
    }
    for (const p of pts) {
      const j = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), M.route);
      j.position.copy(p); j.renderOrder = 15; routeGroup.add(j);
    }
    marker.visible = total > 0;
  }
  function pointAt(t) {
    let d = t * total;
    for (let i = 0; i < lens.length; i++) {
      if (d <= lens[i] || i === lens.length - 1) return pts[i].clone().lerp(pts[i + 1], lens[i] ? Math.min(d / lens[i], 1) : 0);
      d -= lens[i];
    }
    return pts[0].clone();
  }
  function applyUser() {
    if (!user) { userMarker.visible = false; return; }
    userMarker.position.set(user.x, floorY(user.floor) + 0.5, user.z);
    const c = CONF_COLOR[user.confidence] ?? CONF_COLOR.estimated;
    userDot.material.color.setHex(c);
    userRing.material.color.setHex(c);
    userMarker.visible = true;
  }
  function layout() {
    for (const [f, g] of floorGroups) {
      g.position.y = floorY(f);
      g.visible = showFloor === 'all' || showFloor === f;
    }
    applyRoute();
    applyUser();
  }
  function paintTiles() {
    tileById.forEach(t => t.material.color.setHex(BASE_TILE));
    for (const role of ['start', 'goal']) {
      if (roleRoom[role]) tileById.get(roleRoom[role])?.material.color.setHex(ROLE_COLOR[role]);
    }
  }

  // ---------- 相機初始位置 ----------
  {
    const ob = bbox(plans.get(FLOORS[0]).outline);
    const w = ob.x1 - ob.x0, d = ob.z1 - ob.z0;
    const cx = (ob.x0 + ob.x1) / 2, cz = (ob.z0 + ob.z1) / 2;
    const midY = (FLOORS.length * FLOOR_H) / 2;
    const r = Math.max(w, d) * 1.4;
    controls.target.set(cx, midY, cz);
    camera.position.set(cx + r * 0.7, midY + r * 0.75, cz + r * 0.9);
  }

  // ---------- 尺寸 ----------
  function resize() {
    const w = container.clientWidth || 300, h = container.clientHeight || 200;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  ro?.observe(container);
  resize();

  // ---------- 點選房間 ----------
  let downAt = null;
  const onDown = e => { downAt = [e.clientX, e.clientY]; };
  const onUp = e => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 4) return;   // 拖曳旋轉不算點擊
    const rect = canvas.getBoundingClientRect();
    const v = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const rc = new THREE.Raycaster();
    rc.setFromCamera(v, camera);
    const hit = rc.intersectObjects(tiles.filter(t => t.parent.visible), false)[0];
    if (hit) clickCb?.(hit.object.userData.roomId);
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);

  // ---------- 迴圈 ----------
  let raf = 0, disposed = false;
  const t0 = performance.now();
  function frame() {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    controls.update();
    if (route && total > 0) marker.position.copy(pointAt((((performance.now() - t0) / 1000) * 4 / total) % 1));   // 約 4 m/s 的示意速度
    renderer.render(scene, camera);
  }
  layout();
  frame();

  // ---------- 對外介面（spec 4.6） ----------
  return {
    setFloor(floor) {
      if (floor !== 'all' && !FLOORS.includes(floor)) throw new RangeError(`沒有 ${floor} 樓；可用：all 或 ${FLOORS.join('、')}`);
      showFloor = floor; layout();
    },
    setExplode(meters) {
      if (!Number.isFinite(meters) || meters < 0) throw new RangeError('meters 必須是 ≥ 0 的數字');
      explode = meters; layout();
    },
    highlightRoom(roomId, role) {
      if (!tileById.has(roomId)) return false;
      if (role === 'start' || role === 'goal') roleRoom[role] = roomId;
      else for (const r of ['start', 'goal']) if (roleRoom[r] === roomId) roleRoom[r] = null;
      paintTiles();
      return true;
    },
    showRoute(routeResult) { route = routeResult ?? null; applyRoute(); },
    setUserPosition(pos) { user = pos ?? null; applyUser(); },
    onRoomClick(cb) { clickCb = cb; },
    getRoomIds() { return [...tileById.keys()]; },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      controls.dispose();
      scene.traverse(o => {
        o.geometry?.dispose();
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        for (const m of mats) { m.map?.dispose(); m.dispose(); }
      });
      unitBox.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
