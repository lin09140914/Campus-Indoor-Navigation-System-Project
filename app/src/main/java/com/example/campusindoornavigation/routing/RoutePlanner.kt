package com.example.campusindoornavigation.routing

import java.time.Instant
import java.util.PriorityQueue
import kotlin.math.hypot

// Routing-owned models. JSON field names are handled by RouteJson.
data class RouteNode(val id: String, val x: Double, val z: Double, val floor: Int, val type: String)
data class RouteEdge(val a: String, val b: String, val w: Double, val kind: String)
data class RouteGraph(
    val buildingId: String, val mapVersion: String, val coordinateSystemId: String,
    val nodes: List<RouteNode>, val edges: List<RouteEdge>,
    val unit: String? = null, val status: String? = null
)
data class RouteLocation(val id: String, val name: String, val floor: Int, val nodeId: String, val category: String)
data class RouteDestinations(val buildingId: String, val mapVersion: String, val locations: List<RouteLocation>)
data class RoutePosition(val x: Double, val z: Double, val floor: Int)
data class RouteStart(
    val buildingId: String, val mapVersion: String, val coordinateSystemId: String,
    val position: RoutePosition, val confidence: Double, val timestamp: String
)
data class RouteTransition(val from: String, val to: String, val kind: String)
data class Route(
    val buildingId: String, val mapVersion: String, val coordinateSystemId: String, val mode: String,
    val path: List<RouteNode>, val length: Double, val floors: List<Int>, val transitions: List<RouteTransition>
)

private val modes = setOf("any", "stair", "elev")
private val kinds = setOf("walk", "stair", "elev")
private val nodeTypes = kinds + "door"
private val categories = setOf("room", "entrance", "facility", "stair", "elev", "other")
private fun permits(mode: String, kind: String) =
    !(mode == "stair" && kind == "elev" || mode == "elev" && kind == "stair")
private fun distance(a: RouteNode, b: RouteNode) = hypot(a.x - b.x, a.z - b.z)

/** V0.1 milestone 1: only unambiguous, exact on-node positions are accepted.
 * Off-node matching and physical wall checks are deliberately not implemented yet.
 * Invalid input throws IllegalArgumentException; no safe route returns null.
 */
class RoutePlanner(private val destinations: RouteDestinations, private val allowDraftSvgUnits: Boolean = false) {
    fun findRoute(graph: RouteGraph, start: RouteStart, destinationId: String, mode: String): Route? {
        require(mode in modes) { "Invalid mode: $mode" }
        val index = GraphIndex(graph)
        val draft = graph.status == "draft" || graph.unit == "svg-unit" || graph.coordinateSystemId.endsWith("_PENDING")
        require(!draft || (allowDraftSvgUnits && graph.unit == "svg-unit" && graph.status == "draft" &&
            graph.nodes.all { it.floor == 1 })) { "Uncalibrated graph: explicit 1F draft mode required" }
        require(draft || graph.unit == null || graph.unit == "m") { "Unsupported graph unit" }
        require(start.buildingId == graph.buildingId && start.mapVersion == graph.mapVersion &&
            start.coordinateSystemId == graph.coordinateSystemId) { "Start / Graph metadata mismatch" }
        require(destinations.buildingId == graph.buildingId && destinations.mapVersion == graph.mapVersion) {
            "Destination / Graph metadata mismatch"
        }
        require(start.position.x.isFinite() && start.position.z.isFinite() && start.position.floor != 0 &&
            start.confidence in 0.0..1.0 && start.timestamp.endsWith("Z") &&
            runCatching { Instant.parse(start.timestamp) }.isSuccess) { "Invalid localization result" }
        val locations = destinations.locations.associateBy { it.id }
        require(locations.size == destinations.locations.size) { "Duplicate destination ID" }
        for (location in locations.values) {
            require(location.id.isNotBlank() && location.name.isNotBlank() && location.category in categories &&
                index.nodes[location.nodeId]?.floor == location.floor) { "Invalid destination: ${location.id}" }
        }
        val goal = requireNotNull(locations[destinationId]) { "Unknown destination: $destinationId" }
        val p = start.position
        // Exact coordinate equality prevents a fabricated connection across a wall.
        val source = index.nodes.values.singleOrNull { it.floor == p.floor && it.x == p.x && it.z == p.z }
            ?: return null
        return index.search(graph, source.id, goal.nodeId, mode)
    }
}

private class GraphIndex(graph: RouteGraph) {
    val nodes = graph.nodes.associateBy { it.id }
    private data class Arc(val to: String, val weight: Double, val kind: String)
    private val adjacency = nodes.keys.associateWith { mutableListOf<Arc>() }
    private var heuristicScale = 1.0

    init {
        require(graph.buildingId.isNotBlank() && graph.mapVersion.isNotBlank() && graph.coordinateSystemId.isNotBlank())
        require(nodes.isNotEmpty() && nodes.size == graph.nodes.size) { "Empty graph or duplicate node ID" }
        for (n in nodes.values) {
            require(n.id.isNotBlank() && n.x.isFinite() && n.z.isFinite() && n.floor != 0 && n.type in nodeTypes) {
                "Invalid node: ${n.id}"
            }
        }
        val seen = mutableSetOf<Pair<String, String>>()
        for (e in graph.edges) {
            val a = requireNotNull(nodes[e.a]) { "Unknown edge endpoint: ${e.a}" }
            val b = requireNotNull(nodes[e.b]) { "Unknown edge endpoint: ${e.b}" }
            val key = if (e.a < e.b) e.a to e.b else e.b to e.a
            require(e.a != e.b && seen.add(key) && e.w.isFinite() && e.w > 0 && e.kind in kinds &&
                (a.floor == b.floor || e.kind != "walk")) { "Invalid edge: $e" }
            val d = distance(a, b)
            // Allow only floating-point roundoff, not a materially underweighted edge.
            require(d.isFinite() && (e.w >= d || d - e.w <= 8 * Math.ulp(d))) { "Edge weight below XZ distance: $e" }
            if (d > 0 && e.w < d) heuristicScale = minOf(heuristicScale, Math.nextDown(e.w / d))
            adjacency.getValue(e.a).add(Arc(e.b, e.w, e.kind))
            adjacency.getValue(e.b).add(Arc(e.a, e.w, e.kind))
        }
    }

    private data class Entry(val id: String, val g: Double, val f: Double)
    private data class Parent(val from: String, val kind: String)

    fun search(graph: RouteGraph, source: String, goal: String, mode: String): Route? {
        fun h(id: String): Double {
            val value = heuristicScale * distance(nodes.getValue(id), nodes.getValue(goal))
            require(value.isFinite()) { "Heuristic overflow" }
            return value
        }
        val best = mutableMapOf(source to 0.0)
        val parent = mutableMapOf<String, Parent>()
        val open = PriorityQueue(compareBy<Entry> { it.f }.thenBy { it.id })
        open.add(Entry(source, 0.0, h(source)))
        while (open.isNotEmpty()) {
            val current = open.remove()
            if (current.g != best[current.id]) continue // Ignore stale queue entries.
            if (current.id == goal) {
                val reversed = mutableListOf(nodes.getValue(goal))
                val transitions = mutableListOf<RouteTransition>()
                var id = goal
                while (id != source) {
                    val p = parent.getValue(id)
                    val from = nodes.getValue(p.from)
                    if (from.floor != nodes.getValue(id).floor) transitions.add(RouteTransition(p.from, id, p.kind))
                    reversed.add(from)
                    id = p.from
                }
                val path = reversed.asReversed().toList()
                return Route(graph.buildingId, graph.mapVersion, graph.coordinateSystemId, mode, path,
                    current.g, path.map { it.floor }.distinct(), transitions.asReversed().toList())
            }
            for (arc in adjacency.getValue(current.id)) {
                if (!permits(mode, arc.kind)) continue
                val tentative = current.g + arc.weight
                require(tentative.isFinite()) { "Path cost overflow" }
                if (tentative >= (best[arc.to] ?: Double.POSITIVE_INFINITY)) continue
                val f = tentative + h(arc.to)
                require(f.isFinite()) { "Priority overflow" }
                best[arc.to] = tentative
                parent[arc.to] = Parent(current.id, arc.kind)
                open.add(Entry(arc.to, tentative, f))
            }
        }
        return null
    }
}
