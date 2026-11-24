import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { findDraftRoute } from './floor1-draft-route.mjs';

const graph = JSON.parse(fs.readFileSync(new URL('../data/drafts/floor-1/graph.json', import.meta.url), 'utf8'));

// Compare every preview destination against an independent non-heuristic shortest-path search.
test('1F preview A* agrees with Dijkstra for every destination pair', () => {
  const adj = new Map(graph.nodes.map(n => [n.id, []]));
  for (const e of graph.edges) { adj.get(e.a).push([e.b, e.w]); adj.get(e.b).push([e.a, e.w]); }
  const destinations = graph.nodes.filter(n => n.role === 'room' || n.role === 'entrance');
  for (const from of destinations) {
    const distances = new Map([[from.id, 0]]), visited = new Set();
    while (true) {
      let next = null, distance = Infinity;
      for (const [id, value] of distances) if (!visited.has(id) && value < distance) { next = id; distance = value; }
      if (next === null) break;
      visited.add(next);
      for (const [to, w] of adj.get(next)) if (distance + w < (distances.get(to) ?? Infinity)) distances.set(to, distance + w);
    }
    for (const to of destinations) {
      const route = findDraftRoute(graph, from.id, to.id);
      assert.ok(route, `${from.id} -> ${to.id}`);
      assert.ok(Math.abs(route.length - distances.get(to.id)) < 1e-8);
      for (let i = 1; i < route.path.length; i++) assert.ok(adj.get(route.path[i - 1].id).some(([id]) => id === route.path[i].id));
    }
  }
  assert.equal(findDraftRoute(graph, 'DOES-NOT-EXIST', 'A125'), null);
  assert.equal(findDraftRoute({ nodes: graph.nodes, edges: [] }, 'A125', 'B103'), null);
});
