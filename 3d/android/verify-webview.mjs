// Run with the debug app open: node android/verify-webview.mjs <device-serial> [adb-path]
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';

const [serial, adb = 'adb'] = process.argv.slice(2);
assert(serial, 'Pass the serial of the Android test device.');
const run = promisify(execFile);
async function command(...args) {
  return (await run(adb,['-s',serial,...args],{encoding:'buffer',maxBuffer:12*1024*1024,windowsHide:true})).stdout;
}
const output = new URL('./acceptance/',import.meta.url);
await mkdir(output,{recursive:true});
const pid = (await command('shell','pidof','tw.eng5.floormap')).toString().trim();
assert(/^\d+$/.test(pid),'Open the debug app first.');
const port = (await command('forward','tcp:0','localabstract:webview_devtools_remote_'+pid)).toString().trim();
let socket;
try {
  const pages = await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  const page = pages.find(p => p.url.includes('/android_asset/floor-1.html?host=android'));
  assert(page,'Expected the native map Activity to load its bundled viewer.');
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject) => {socket.onopen=resolve; socket.onerror=reject;});
  let sequence = 0;
  const pending = new Map();
  socket.onmessage = event => {
    const {id,result,error} = JSON.parse(event.data);
    if (!pending.has(id)) return;
    const {resolve,reject} = pending.get(id); pending.delete(id);
    if (error || result.exceptionDetails) reject(Error(JSON.stringify(error ?? result.exceptionDetails)));
    else resolve(result.result.value);
  };
  function evaluate(expression) {
    const id = ++sequence;
    return new Promise((resolve,reject) => {
      pending.set(id,{resolve,reject});
      socket.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));
    });
  }
  async function capture(name) {
    await writeFile(new URL(name,output),await command('exec-out','screencap','-p'));
  }
  // Check the state produced by the Activity before calling any rendering function from the test.
  assert(await evaluate('document.getElementById("message").hidden && document.querySelectorAll("#canvas-wrap canvas").length===1'), 'Native renderMap call did not display the map.');
  const provider = await evaluate('navigator.userAgent');
  const device = (await command('shell','getprop','ro.build.version.sdk')).toString().trim();
  console.log('Android API',device,provider);
  await capture('android-3d.png');
  const uiFile = '/data/local/tmp/eng5-window.xml';
  await command('shell','uiautomator','dump',uiFile);
  const ui = (await command('shell','cat',uiFile)).toString();
  const bounds = ui.match(/class="android\.webkit\.WebView"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  assert(bounds,'Cannot locate the Android WebView on screen.');
  const [,left,top,right] = bounds.map(Number);
  const view = await evaluate('({width:innerWidth, y:document.querySelector("canvas").getBoundingClientRect().y, height:document.querySelector("canvas").clientHeight})');
  const px = (right-left)/view.width;
  const x = Math.round(left+view.width*0.24*px), y = Math.round(top+(view.y+view.height/2)*px);
  const step = Math.round(Math.min(view.height/8,view.width/3)*px);
  // Read heading from the live model's projected X and Z axes. Unwrap across ±180 degrees.
  const heading = () => evaluate(`(() => {
    const lines = [...document.querySelectorAll('#axes path')];
    const component = name => {
      const line = lines.find(p => p.nextElementSibling.textContent===name);
      return line ? Number(line.getAttribute('d').split('L')[1].split(' ')[0])-36 : 0;
    };
    return Math.atan2(-component('Z'),component('X'))*180/Math.PI;
  })()`);
  let previous = await heading(), degrees = 0, swipes = 0;
  while (Math.abs(degrees) < 360 && swipes < 24) {
    await command('shell','input','touchscreen','swipe',String(x),String(y),String(x+step),String(y),'350');
    await delay(250);
    const current = await heading();
    degrees += (current-previous+540)%360-180;
    previous = current; swipes++;
  }
  console.log('Android touch rotation',swipes,'swipes,',degrees.toFixed(2),'degrees');
  assert(Math.abs(degrees)>=360,'A full horizontal turn was not observed.');
  const counts = await evaluate(`(async () => {
    const result = renderMap(undefined,undefined,{view_mode:'2d'});
    if(result.status!=='success') throw Error(JSON.stringify(result));
    const xml = await (await fetch(document.getElementById('source-image').src)).text();
    const drawing = new DOMParser().parseFromString(xml,'image/svg+xml').documentElement;
    const ref = document.importNode(drawing,true);
    ref.style.cssText='position:fixed;left:-10000px;visibility:hidden'; document.body.append(ref);
    const root=result.scene.getObjectByName(drawing.id);
    const counts={walls:0,rooms:0,corridors:0,doors:0,stairs:0,elevators:0};
    try {
      for(const group of ['walls','rooms','corridors','stairs','elevators']){
        const selector = group==='walls'?'path':group==='corridors'?'rect,path,polygon':group==='rooms'?'rect,polygon':'rect';
        for(const node of ref.querySelector('#'+group).querySelectorAll(selector)){
          const mesh=root.getObjectByName(node.id);
          mesh.geometry.computeBoundingBox();
          const {min,max}=mesh.geometry.boundingBox, b=node.getBBox();
          const error=Math.max(Math.abs(min.x-b.x),Math.abs(max.x-b.x-b.width),Math.abs(min.z-b.y),Math.abs(max.z-b.y-b.height));
          if(error>0.1) throw Error(node.id+' bounds differ by '+error);
          counts[group]++;
        }
      }
      for(const node of ref.querySelector('#doors').children){
        const group=root.getObjectByName(node.id);
        if(!group || ![...node.children].every(n=>group.getObjectByName(n.id))) throw Error(node.id+' geometry missing');
        for(const line of node.querySelectorAll('[data-role="leaf"]')){
          const leaf=group.getObjectByName(line.id), half=leaf.geometry.parameters.width/2;
          const dx=half*Math.cos(leaf.rotation.y), dz=-half*Math.sin(leaf.rotation.y);
          const a=line.getPointAtLength(0), b=line.getPointAtLength(line.getTotalLength());
          if(Math.max(Math.hypot(a.x-leaf.position.x+dx,a.y-leaf.position.z+dz),
                      Math.hypot(b.x-leaf.position.x-dx,b.y-leaf.position.z-dz))>0.1)
            throw Error(line.id+' endpoints differ');
        }
        counts.doors++;
      }
    } finally { ref.remove(); }
    return counts;
  })()`);
  assert.deepEqual(counts,{walls:204,rooms:59,corridors:8,doors:84,stairs:4,elevators:2});
  await delay(400); await capture('android-top.png');
  assert(await evaluate(`(async () => {
    document.getElementById("source").click();
    await document.getElementById("source-image").decode();
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    return document.getElementById("reference").open;
  })()`));
  await delay(1800); await capture('android-svg.png');
  await evaluate('document.getElementById("close-source").click();document.getElementById("iso").click()');
  assert.equal(await evaluate(`renderMap(undefined,{building_id:'other',map_version:'other',floor:1,svg:'floor-1.svg',coordinate_status:'unmeasured'}).error.code`),'MAP_MISMATCH');
  assert.equal(await evaluate('renderMap().status'),'success');
  assert.equal(await evaluate('document.querySelectorAll("#canvas-wrap canvas").length'),1);
  console.log('Top-view comparison passed',counts);
} finally {
  socket?.close();
  await command('forward','--remove','tcp:'+port);
}
