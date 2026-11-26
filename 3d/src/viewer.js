import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import bundledSvg from '../floor-1.svg';
import { buildFloor, dimensions, palette } from './model.js';

const $ = id => document.getElementById(id);
const symbols = {
  building:'<path d="m2 9 10-6 10 6-10 6zM2 13l10 6 10-6M2 17l10 6 10-6M7 6l10 6"/>',
  cube:'<path d="m3 7 9-5 9 5v10l-9 5-9-5zM3 7l9 5 9-5M12 12v10"/>',
  plan:'<path d="M3 3h18v18H3zM3 11h6m4 0h8M11 3v5m0 7v6"/>',
  top:'<path d="M3 3h18v18H3zM11 3v10H3m8 0h10"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/>',
  layers:'<path d="m2 7 10-5 10 5-10 5zM3 12l9 5 9-5M3 17l9 5 9-5"/>',
  locate:'<path d="M12 22s7-7.1 7-13a7 7 0 1 0-14 0c0 5.9 7 13 7 13Z"/><circle cx="12" cy="9" r="2.4"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
  plus:'<path d="M5 12h14m-7-7v14"/>', minus:'<path d="M5 12h14"/>',
  fit:'<path d="M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5"/>',
  chevron:'<path d="m7 10 5 5 5-5"/>', close:'<path d="m6 6 12 12M6 18 18 6"/>',
  mouse:'<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 6v4"/>',
};
for (const el of document.querySelectorAll('[data-icon]')) {
  el.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + symbols[el.dataset.icon] + '</svg>';
}
let sourceUrl = URL.createObjectURL(new Blob([bundledSvg], { type:'image/svg+xml' }));
$('source-image').src = sourceUrl;
$('source').onclick = () => $('reference').showModal();
$('close-source').onclick = () => $('reference').close();
$('reference').onclick = event => { if (event.target === $('reference')) $('reference').close(); };

function makeNames(xml) {
  // Render the original SVG label layer at its source coordinates on a transparent plane.
  const [x, y, w, h] = xml.getAttribute('viewBox').split(/\s+/).map(Number);
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * 3); canvas.height = Math.ceil(h * 3);
  const ctx = canvas.getContext('2d');
  ctx.scale(canvas.width/w, canvas.height/h); ctx.translate(-x,-y);
  ctx.fillStyle = '#20382f'; ctx.textAlign = 'center';
  const labels = xml.querySelector('#labels');
  for (const label of labels.querySelectorAll('text')) {
    let baseline = +label.getAttribute('y');
    const spans = label.children.length ? [...label.children] : [label];
    for (const span of spans) {
      baseline += Number(span.getAttribute('dy') ?? 0);
      const size = span.getAttribute('font-size') ?? label.getAttribute('font-size') ?? labels.getAttribute('font-size');
      ctx.font = size + 'px "Microsoft JhengHei", sans-serif';
      ctx.fillText(span.textContent.trim(), +(span.getAttribute('x') ?? label.getAttribute('x')), baseline);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({
    map:texture, transparent:true, depthWrite:false, toneMapped:false,
  }));
  mesh.rotation.x = -Math.PI/2; mesh.position.set(x+w/2,0.24,y+h/2);
  mesh.name = 'labels'; mesh.visible = false;
  return mesh;
}

function mountFloor({ root, layers, rooms, xml }, renderer, floor, options) {
  const events = new AbortController();
  const labels = makeNames(xml);
  const roomById = new Map(rooms.map(room => [room.id, room]));
  const plainRoom = rooms[0]?.mesh.material ?? new THREE.MeshStandardMaterial();
  const highlighted = plainRoom.clone();
  highlighted.color.set('#cc9254');
  let selected = null;
  $('heights').textContent = dimensions.wallHeight + ' ／ ' + dimensions.leafHeight;
  $('download').disabled = false;
  $('download').onclick = async () => {
    const button = $('download');
    button.disabled = true;
    try {
      const copy = root.clone(true);
      copy.traverse(node => {
        node.visible = true;
        if (node.material === highlighted) node.material = plainRoom;
      });
      const buffer = await new GLTFExporter().parseAsync(copy, { binary:true });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([buffer], {type:'model/gltf-binary'}));
      link.download = 'floor-1.glb'; link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 30000);
    } catch (error) {
      console.error(error); $('message').hidden = false; $('message').textContent = '模型匯出失敗，請重新嘗試。';
    } finally { button.disabled = false; }
  };

  const scene = new THREE.Scene();
  const drawing = new THREE.Group();
  drawing.add(root, labels);
  scene.add(drawing);
  const transform = floor.svg_transform;
  const scale = transform?.scale_m_per_svg_unit ?? 1;
  if (transform) {
    const [u0,v0] = xml.getAttribute('viewBox').trim().split(/[\s,]+/).map(Number);
    drawing.rotation.y = -THREE.MathUtils.degToRad(transform.rotation_deg);
    drawing.scale.setScalar(scale);
    drawing.position.set(-u0*scale,0,-v0*scale).applyQuaternion(drawing.quaternion);
    drawing.position.add(new THREE.Vector3(transform.origin_x_m,floor.elevation_m,transform.origin_z_m));
  }
  drawing.updateMatrixWorld(true);
  const wrap = $('canvas-wrap');
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0,0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.domElement.setAttribute('aria-label','可旋轉及縮放的工程五館一樓模型');
  wrap.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xf9fbf4,0xc1c4b7,1.8));
  const bounds = new THREE.Box3().setFromObject(root);
  const center = bounds.getCenter(new THREE.Vector3());
  const sun = new THREE.DirectionalLight(0xfff9ed,1.8);
  sun.target.position.copy(center);
  sun.position.copy(center).addScaledVector(new THREE.Vector3(-310,830,460),scale);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera,{left:-660*scale,right:660*scale,top:660*scale,bottom:-660*scale,near:scale,far:1900*scale});
  sun.shadow.camera.updateProjectionMatrix();
  const shadowSize = Math.min(renderer.capabilities.maxTextureSize, matchMedia('(pointer: coarse)').matches ? 1024 : 4096);
  sun.shadow.mapSize.set(shadowSize,shadowSize);
  sun.shadow.normalBias = 0.09;
  sun.shadow.bias = -0.00012;
  scene.add(sun,sun.target);
  const fill = new THREE.DirectionalLight(0xf4f8fb,0.46);
  fill.target.position.copy(center);
  fill.position.copy(center).addScaledVector(new THREE.Vector3(540,280,-340),scale);
  scene.add(fill,fill.target);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(15000,15000), new THREE.ShadowMaterial({opacity:0.17}));
  ground.rotation.x = -Math.PI/2; ground.position.set(center.x,bounds.min.y-0.16*scale,center.z); ground.scale.setScalar(scale); ground.receiveShadow = true;
  scene.add(ground);

  const camera = new THREE.OrthographicCamera(-1,1,1,-1,0.1*scale,14000*scale);
  const controls = new OrbitControls(camera,renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.47;
  controls.minZoom = 0.35; controls.maxZoom = 18;
  controls.zoomToCursor = true;
  controls.target.copy(center);
  const iso = new THREE.Vector3(0.51,1.06,1.2).normalize();
  let frame = 0, mode = 'iso', baselineHeight = 800;
  const corners = [];
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const b = new THREE.Box3().setFromObject(mesh);
    for (const x of [b.min.x,b.max.x]) for (const y of [b.min.y,b.max.y]) for (const z of [b.min.z,b.max.z]) corners.push(new THREE.Vector3(x,y,z));
  });
  function resizeProjection() {
    const aspect = wrap.clientWidth / wrap.clientHeight;
    camera.left = -baselineHeight * aspect / 2; camera.right = -camera.left;
    camera.top = baselineHeight/2; camera.bottom = -camera.top;
    camera.updateProjectionMatrix();
  }
  function fullView(next = mode) {
    mode = next;
    sun.castShadow = mode !== 'top';
    root.traverse(object => { if (object.isMesh) object.receiveShadow = sun.castShadow; });
    renderer.shadowMap.needsUpdate = true;
    ground.visible = mode !== 'top';
    controls.enableRotate = mode !== 'top';
    controls.mouseButtons.LEFT = mode === 'top' ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    controls.touches.ONE = mode === 'top' ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
    controls.target.copy(center);
    camera.position.copy(center).addScaledVector(mode === 'top' ? new THREE.Vector3(0,1,0.00001) : iso,1600*scale);
    camera.zoom = 1; camera.lookAt(center); controls.update(); camera.updateMatrixWorld();
    const projected = new THREE.Box3().setFromPoints(corners.map(p => p.clone().applyMatrix4(camera.matrixWorldInverse)));
    const size = projected.getSize(new THREE.Vector3());
    const mid = projected.getCenter(new THREE.Vector3());
    const offset = new THREE.Vector3(mid.x,mid.y,0).applyQuaternion(camera.quaternion);
    controls.target.add(offset); camera.position.add(offset);
    baselineHeight = Math.max(size.y/(1-Math.min(0.42,128/wrap.clientHeight)),size.x*wrap.clientHeight/(wrap.clientWidth*0.9));
    resizeProjection(); controls.update(); schedule();
    for (const id of ['iso','top']) $(id).setAttribute('aria-pressed', String(id === mode));
    document.querySelector('.desktop-hint').textContent = mode === 'top' ? '拖曳平移 · 滾輪縮放' : '拖曳旋轉 · 右鍵平移 · 滾輪縮放';
    document.querySelector('.touch-hint').textContent = mode === 'top' ? '單指平移 · 雙指縮放' : '單指旋轉 · 雙指平移與縮放';
  }
  function drawAxes() {
    const axes = [
      ['X', new THREE.Vector3(1,0,0), '#a26852'],
      ['Y', new THREE.Vector3(0,1,0), '#477658'],
      ['Z', new THREE.Vector3(0,0,1), '#5e7e94'],
    ];
    const inv = camera.quaternion.clone().invert();
    let content = '';
    for (const [label,vector,color] of axes) {
      vector.applyQuaternion(inv);
      const x = 36+vector.x*22, y = 39-vector.y*22;
      if (Math.hypot(x-36,y-39) < 2) continue;
      content += '<path d="M36 39 L'+x+' '+y+'" stroke="'+color+'" stroke-width="1.65"/><text x="'+(36+vector.x*32)+'" y="'+(42-vector.y*31)+'" text-anchor="middle" font-family="monospace" font-size="10" fill="'+color+'">'+label+'</text>';
    }
    $('axes').firstElementChild.innerHTML = content + '<circle cx="36" cy="39" r="2" fill="#526456"/>';
  }
  function render() {
    frame = 0;
    renderer.render(scene,camera); drawAxes();
    $('zoom').textContent = Math.round(100*camera.zoom)+'%';
    const tag = $('selection-tag'); tag.hidden = !selected || !layers.rooms.visible;
    if (!tag.hidden) {
      const point = selected.center.clone(); point.y = drawing.position.y+(dimensions.wallHeight+1)*scale; point.project(camera);
      const x = (point.x+1)*wrap.clientWidth/2, y = (1-point.y)*wrap.clientHeight/2;
      tag.style.transform = 'translate('+x+'px,'+y+'px) translate(-50%,-100%)';
    }
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(render); }
  function zoomBy(factor) {
    camera.zoom = THREE.MathUtils.clamp(camera.zoom*factor,controls.minZoom,controls.maxZoom);
    camera.updateProjectionMatrix(); controls.update(); schedule();
  }
  $('iso').onclick = () => fullView('iso'); $('top').onclick = () => fullView('top');
  $('fit').onclick = () => fullView();
  $('plus').onclick = () => zoomBy(1.3); $('minus').onclick = () => zoomBy(1/1.3);
  controls.addEventListener('change',schedule);

  function selectRoom(id,focus) {
    if (selected) selected.mesh.material = plainRoom;
    selected = roomById.get(id) ?? null;
    $('rooms').value = selected?.id ?? '';
    $('room-info').textContent = selected?.title ?? '可直接點選模型內的房間。';
    if (selected) {
      layers.rooms.visible = true; $('layer-rooms').checked = true;
      selected.mesh.material = highlighted; $('selection-tag').textContent = selected.label;
      if (focus) {
        const offset = camera.position.clone().sub(controls.target);
        controls.target.copy(selected.center); camera.position.copy(selected.center).add(offset);
        camera.zoom = Math.max(2.8,camera.zoom);
        camera.updateProjectionMatrix(); controls.update();
      }
    }
    renderer.shadowMap.needsUpdate = true; schedule();
  }
  rooms.sort((a,b) => a.label.localeCompare(b.label,'en',{numeric:true})).forEach(room => {
    room.center = new THREE.Box3().setFromObject(room.mesh).getCenter(new THREE.Vector3());
    const option = new Option(room.title,room.id); $('rooms').appendChild(option);
  });
  $('rooms').onchange = () => {
    selectRoom($('rooms').value,true);
    if (!selected) fullView();
  };
  const ray = new THREE.Raycaster();
  let down = null;
  renderer.domElement.addEventListener('pointerdown',e => {
    if (!e.isPrimary || e.button !== 0) { down = null; return; }
    down = new THREE.Vector2(e.clientX,e.clientY);
  }, {signal:events.signal});
  renderer.domElement.addEventListener('pointercancel',() => {down = null;}, {signal:events.signal});
  renderer.domElement.addEventListener('pointerup',e => {
    if (!down || !e.isPrimary || e.button !== 0) return;
    const delta = down.distanceTo(new THREE.Vector2(e.clientX,e.clientY)); down = null;
    if (delta > 4) return;
    const box = wrap.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(2*(e.clientX-box.left)/box.width-1,1-2*(e.clientY-box.top)/box.height),camera);
    const visibleLayers = Object.values(layers).filter(g => g.visible);
    const hit = ray.intersectObjects(visibleLayers,true).find(item => item.object.isMesh);
    selectRoom(hit?.object.userData.roomId,false);
  }, {signal:events.signal});
  const settings = [
    ['rooms','房間與空間',layers.rooms.children.length],['corridors','走廊',layers.corridors.children.length],
    ['walls','牆體',xml.querySelectorAll('#walls path').length],['doors','門扇與開向',layers.doors.children.length],
    ['stairs','樓梯',layers.stairs.children.length],['elevators','電梯',layers.elevators.children.length],
    ['fixtures','設備符號',xml.querySelector('#fixtures').children.length],['labels','圖面文字',xml.querySelector('#labels').children.length],
  ];
  for (const [key,title,count] of settings) {
    const layer = key === 'labels' ? labels : layers[key];
    const row = document.createElement('label'); row.className = 'layer-row';
    row.style.setProperty('--swatch',palette[key] ?? '#364d3f');
    const swatch = document.createElement('span'); swatch.className = 'swatch';
    const name = document.createElement('span'); name.textContent = title;
    const counter = document.createElement('span'); counter.className = 'count'; counter.textContent = count;
    const input = document.createElement('input'); input.type = 'checkbox'; input.className = 'switch';
    input.id = 'layer-'+key; input.checked = layer.visible; input.setAttribute('aria-label', title);
    input.onchange = () => { layer.visible = input.checked; renderer.shadowMap.needsUpdate = true; schedule(); };
    row.append(swatch,name,counter,input); $('layers').appendChild(row);
  }
  renderer.setSize(wrap.clientWidth,wrap.clientHeight,false);
  fullView(options.view_mode === '2d' ? 'top' : 'iso');
  cancelAnimationFrame(frame);
  render();
  let prevWidth = wrap.clientWidth, prevHeight = wrap.clientHeight;
  const observer = new ResizeObserver(() => {
    if (!wrap.clientWidth || !wrap.clientHeight || (prevWidth === wrap.clientWidth && prevHeight === wrap.clientHeight)) return;
    prevWidth = wrap.clientWidth; prevHeight = wrap.clientHeight;
    renderer.setSize(prevWidth,prevHeight,false); fullView();
  });
  observer.observe(wrap);
  $('message').hidden = true;
  return {
    scene, controls, fullView,
    dispose() {
      observer.disconnect();
      events.abort();
      controls.dispose();
      cancelAnimationFrame(frame);
      scene.traverse(object => object.geometry?.dispose());
      highlighted.dispose();
      labels.material.map.dispose();
      labels.material.dispose();
      ground.material.dispose();
      sun.shadow.dispose();
      $('layers').replaceChildren();
      $('rooms').length = 1;
      $('room-info').textContent = '可直接點選模型內的房間。';
      $('selection-tag').hidden = true;
      scene.clear();
    },
  };
}

const bundledInfo = new DOMParser().parseFromString(bundledSvg,'image/svg+xml').documentElement.dataset;
const draftFloor = Object.freeze({ building_id:bundledInfo.buildingId, map_version:bundledInfo.mapVersion,
  floor:Number(bundledInfo.floor), svg:'floor-1.svg', coordinate_status:'unmeasured' });
let activeMap, activeSvg, activeFloor, renderer;

function renderMap(svg = bundledSvg, floor = draftFloor, options = {}) {
  const result = { building_id:floor?.building_id ?? '', map_version:floor?.map_version ?? '', floor:floor?.floor ?? null };
  let code = 'INVALID_FLOOR';
  try {
    if (!floor?.svg || !Number.isInteger(floor.floor) || !floor.building_id || !floor.map_version)
      throw Error('樓層資料缺少識別欄位或 SVG 路徑。');
    if (!(svg === bundledSvg && floor.coordinate_status === 'unmeasured' && floor.svg_transform == null)) {
      const t = floor.svg_transform;
      if (!t || ![floor.elevation_m,t.scale_m_per_svg_unit,t.rotation_deg,t.origin_x_m,t.origin_z_m].every(Number.isFinite) || t.scale_m_per_svg_unit <= 0)
        throw Error('樓層的座標轉換參數無效。');
    }
    code = 'INVALID_OPTIONS';
    if (options == null || (options.view_mode !== undefined && !['2d','3d'].includes(options.view_mode)) ||
        (options.fit_to_view !== undefined && typeof options.fit_to_view !== 'boolean')) throw Error('無效的檢視選項。');
    const key = JSON.stringify(floor);
    if (activeMap && svg === activeSvg && key === activeFloor) {
      const mode = options.view_mode === '2d' ? 'top' : 'iso';
      if (options.fit_to_view !== false || (options.view_mode && $(mode).getAttribute('aria-pressed') !== 'true')) activeMap.fullView(mode);
    } else {
      code = 'INVALID_SVG';
      const doc = new DOMParser().parseFromString(svg,'image/svg+xml');
      const xml = doc.documentElement;
      if (xml.localName !== 'svg' || doc.doctype || doc.querySelector('parsererror,script,foreignObject,image,use,style,animate,set,animateTransform,animateMotion') ||
          [...xml.querySelectorAll('*'),xml].some(node => [...node.attributes].some(a => /^on|^href$|^style$/i.test(a.localName) || /url\s*\(/i.test(a.value)))) throw Error('SVG 內容無法載入。');
      if (xml.dataset.buildingId !== floor.building_id || xml.dataset.floor !== String(floor.floor) || xml.dataset.mapVersion !== floor.map_version) {
        code = 'MAP_MISMATCH'; throw Error('SVG 的建物、樓層或版本與樓層資料不符。');
      }
      const model = buildFloor(svg);
      code = 'INVALID_CONTAINER';
      if (!$('canvas-wrap')?.clientWidth || !$('canvas-wrap').clientHeight) throw Error('地圖容器尚未就緒。');
      code = 'WEBGL_UNAVAILABLE';
      renderer ??= new THREE.WebGLRenderer({ antialias:true, alpha:true });
      activeMap?.dispose(); activeMap = null;
      code = 'RENDER_FAILED';
      activeMap = mountFloor(model,renderer,floor,options);
      activeSvg = svg; activeFloor = key;
      URL.revokeObjectURL(sourceUrl);
      sourceUrl = URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
      $('source-image').src = sourceUrl;
    }
    $('message').hidden = true;
    return { ...result, status:'success', scene:activeMap.scene };
  } catch (e) {
    $('message').textContent = code === 'WEBGL_UNAVAILABLE' ? '此裝置無法建立 WebGL 2 視圖。' : e.message;
    $('message').hidden = false;
    return { ...result, status:'error', error:{code, message:$('message').textContent} };
  }
}
window.renderMap = renderMap;
if (new URLSearchParams(location.search).get('host') !== 'android') renderMap();
else $('download').hidden = true;
