import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

// Horizontal coordinates remain in the source viewBox. All vertical values are illustrative.
export const dimensions = { wallHeight: 23, leafHeight: 17, slabDepth: 3, stairRise: 0.85, elevatorHeight: 7 };
export const palette = {
  rooms: '#a5bbb0', corridors: '#e5cda6', walls: '#e6e1d3', doors: '#c47a52',
  stairs: '#92a6ab', elevators: '#719698', fixtures: '#676e69',
};
function surface(name, color) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.94 });
  mat.name = name;
  return mat;
}
const materials = Object.fromEntries(Object.entries(palette).map(([key, color]) => [key, surface(key, color)]));
const wallMaterials = [surface('wall caps', '#65716b'), materials.walls];
const ink = new THREE.LineBasicMaterial({ color: '#62797b' });
const swingInk = new THREE.LineBasicMaterial({ color: '#ab7957' });

function group(name, parent) {
  const result = new THREE.Group();
  result.name = name;
  parent?.add(result);
  return result;
}

function solid(path, depth, top, material, parent) {
  const shapes = SVGLoader.createShapes(path);
  if (!shapes.length) return;
  const geometry = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: false, curveSegments: 24 });
  // A +90-degree rotation maps SVG y to world z and extrudes down from top.
  geometry.rotateX(Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = top;
  mesh.name = path.userData.node.id;
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function cuboid(name, x, z, width, length, height, material, parent, base = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, length), material);
  mesh.position.set(x, base + height / 2, z);
  mesh.name = name;
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function stroke(path, y, material, parent) {
  const vertices = [];
  for (const subpath of path.subPaths) {
    const points = subpath.getPoints(22);
    for (let i = 1; i < points.length; i++) {
      vertices.push(points[i-1].x, y, points[i-1].y, points[i].x, y, points[i].y);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  const lines = new THREE.LineSegments(geometry, material);
  lines.name = path.userData.node.id;
  parent.add(lines);
}

// Each list selects the riser marks of one flight in this particular drawing.
// Break marks, arrows and perimeter lines stay as flat drafting details.
const flights = {
  'STAIR-A': [[2,3,4,5,6,7,8,21,22,23], [19,18,17,16,15,14,13,12,11,10]],
  'STAIR-B': [[4,5,6,7,8,9], [10,11,12,13,14,15,17,18,19,20], [26,25,24,23,22,21]],
  'STAIR-C': [[5,6,7,8,9,10,11,12,13]],
  'STAIR-WEST-ANNEX': [[3,4,5,6,7,8,9,22,23,24], [20,19,18,17,16,15,14,13,12,11]],
};

function stairTreads(source, paths, parent) {
  const runs = flights[source.dataset.connectorId] ?? [];
  const footprint = source.querySelector('rect');
  const riserTops = new Map();
  for (const marks of runs) {
    const edges = marks.map(n => paths.get(source.id + '-detail-' + String(n).padStart(3, '0')));
    if (edges.some(edge => !edge)) continue;
    const segments = edges.map(edge => edge.subPaths[0].getPoints(1));
    const [a, b] = segments[0];
    const horizontal = Math.abs(a.y - b.y) < 0.01;
    const along = horizontal ? 'x' : 'y';
    const across = horizontal ? 'y' : 'x';
    const position = segments.map(([p]) => p[across]);
    const low = Number(footprint.getAttribute(across));
    const high = low + Number(footprint.getAttribute(horizontal ? 'height' : 'width'));
    const outer = segments.flat().map(p => p[along]);
    const min = Math.min(...outer), max = Math.max(...outer);
    edges.forEach((edge, i) => {
      const next = position[i+1] ?? THREE.MathUtils.clamp(2*position[i]-position[i-1], low, high);
      const center = (position[i] + next) / 2;
      const going = Math.abs(position[i] - next);
      const middle = (min + max) / 2;
      const mesh = cuboid(edge.userData.node.id + '-tread',
        horizontal ? middle : center, horizontal ? center : middle,
        horizontal ? max-min : going, horizontal ? going : max-min,
        (i+1) * dimensions.stairRise, materials.stairs, parent, 0.12);
      mesh.userData.sourceId = edge.userData.node.id;
      riserTops.set(edge.userData.node.id, (i+1) * dimensions.stairRise + 0.18);
    });
  }
  return riserTops;
}

export function buildFloor(svg) {
  const { paths: loaded, xml } = new SVGLoader().parse(svg);
  const paths = new Map(loaded.map(path => [path.userData.node.id, path]));
  const root = group(xml.id);
  root.userData = {
    source: 'floor-1.svg', mapVersion: xml.dataset.mapVersion, coordinateStatus: xml.dataset.coordinateStatus,
    coordinateMapping: 'world X = SVG x; world Z = SVG y; world Y = height; one unit per SVG unit',
    illustrativeDimensions: dimensions,
  };
  const layers = Object.fromEntries(Object.keys(palette).map(key => [key, group(key, root)]));
  const rooms = [];
  const layer = key => xml.querySelector('#' + key);
  for (const source of layer('rooms').children) {
    const floor = source.querySelector('polygon, rect, path');
    const mesh = solid(paths.get(floor.id), dimensions.slabDepth, 0, materials.rooms, layers.rooms);
    mesh.userData = { sourceId: source.id, ...source.dataset };
    if (source.dataset.roomId) {
      const title = source.querySelector('title').textContent.trim();
      mesh.userData.title = title;
      rooms.push({ id: source.dataset.roomId, label: source.dataset.label, title, mesh });
    }
  }
  // Some corridor rectangles overlap in the source. Small offsets avoid coplanar flicker.
  Array.from(layer('corridors').children).forEach((node, i) => {
    solid(paths.get(node.id), dimensions.slabDepth, 0.008 * (i+1), materials.corridors, layers.corridors);
  });
  for (const wing of layer('walls').children) {
    const parent = group(wing.id, layers.walls);
    for (const node of wing.querySelectorAll('path')) {
      const mesh = solid(paths.get(node.id), dimensions.wallHeight, dimensions.wallHeight, wallMaterials, parent);
      mesh.userData = { sourceId: node.id, outlineWidth: +node.dataset.outlineWidthSvg };
    }
  }
  for (const door of layer('doors').children) {
    const parent = group(door.id, layers.doors);
    parent.userData = { ...door.dataset };
    for (const node of door.children) {
      const path = paths.get(node.id);
      if (node.dataset.role === 'leaf') {
        const [a, b] = path.subPaths[0].getPoints(1);
        const length = a.distanceTo(b);
        const mesh = cuboid(node.id, (a.x+b.x)/2, (a.y+b.y)/2, length, 0.55,
          dimensions.leafHeight, materials.doors, parent);
        mesh.rotation.y = -Math.atan2(b.y-a.y, b.x-a.x);
      } else if (node.dataset.role === 'swing') {
        stroke(path, 0.18, swingInk, parent);
      }
    }
  }
  for (const key of ['stairs', 'elevators']) {
    for (const source of layer(key).children) {
      const parent = group(source.id, layers[key]);
      parent.userData = { ...source.dataset };
      solid(paths.get(source.querySelector('rect').id), dimensions.slabDepth + 0.1, 0.1, materials[key], parent);
      const details = [...source.querySelectorAll('path')];
      if (key === 'stairs') {
        const riserTops = stairTreads(source, paths, parent);
        details.forEach(node => stroke(paths.get(node.id), riserTops.get(node.id) ?? 0.16, ink, parent));
      } else {
        // The largest closed car outline encloses the smaller car and its crossed lines.
        const closed = details.filter(n => /z\s*$/i.test(n.getAttribute('d')));
        const bounds = node => new THREE.Box2().setFromPoints(paths.get(node.id).subPaths[0].getPoints());
        const area = box => (box.max.x-box.min.x) * (box.max.y-box.min.y);
        const car = closed.sort((a,b) => area(bounds(b)) - area(bounds(a)))[0];
        const carBox = bounds(car).expandByScalar(0.01);
        solid(paths.get(car.id), dimensions.elevatorHeight, dimensions.elevatorHeight + 0.1, materials[key], parent);
        details.forEach(node => stroke(paths.get(node.id), carBox.containsBox(bounds(node)) ? dimensions.elevatorHeight + 0.18 : 0.18, ink, parent));
      }
    }
  }
  for (const node of layer('fixtures').children) {
    const path = paths.get(node.id);
    const geometry = new THREE.ShapeGeometry(SVGLoader.createShapes(path), 12);
    if (!geometry.index?.count) {
      // Zero-area filled symbols have no visible surface in the source either.
      geometry.dispose();
      group(node.id, layers.fixtures);
      continue;
    }
    geometry.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, materials.fixtures);
    mesh.material.side = THREE.DoubleSide;
    mesh.name = node.id;
    mesh.position.y = 0.19;
    layers.fixtures.add(mesh);
  }
  return { root, layers, rooms, xml };
}
