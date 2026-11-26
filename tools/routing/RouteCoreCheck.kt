import com.example.campusindoornavigation.routing.*
import java.io.File
import kotlin.math.abs

private fun start(g: RouteGraph, n: RouteNode) = RouteStart(g.buildingId, g.mapVersion, g.coordinateSystemId,
    RoutePosition(n.x, n.z, n.floor), 1.0, "2026-11-25T00:00:00Z")
private fun close(a: Double, b: Double) = abs(a - b) <= 1e-9 * maxOf(1.0, abs(a), abs(b))
private fun allowed(mode: String, e: RouteEdge) = !(mode == "stair" && e.kind == "elev" || mode == "elev" && e.kind == "stair")
private fun invalid(block: () -> Unit) { check(runCatching(block).exceptionOrNull() is IllegalArgumentException) }

// Independent O(V^2 + VE) Dijkstra: no heuristic, priority queue or production adjacency code.
private fun oracle(g: RouteGraph, source: String, mode: String): Map<String, Double> {
    val d = g.nodes.associate { it.id to Double.POSITIVE_INFINITY }.toMutableMap()
    val remaining = d.keys.toMutableSet()
    d[source] = 0.0
    while (remaining.isNotEmpty()) {
        val u = remaining.minByOrNull { d.getValue(it) }!!
        if (!d.getValue(u).isFinite()) break
        remaining.remove(u)
        for (e in g.edges) {
            if (!allowed(mode, e)) continue
            val v = when (u) { e.a -> e.b; e.b -> e.a; else -> continue }
            if (v in remaining) d[v] = minOf(d.getValue(v), d.getValue(u) + e.w)
        }
    }
    return d
}

private fun validate(g: RouteGraph, r: Route, source: String, goal: String, mode: String, expected: Double) {
    check(r.buildingId == g.buildingId && r.mapVersion == g.mapVersion && r.coordinateSystemId == g.coordinateSystemId)
    check(r.mode == mode && r.path.first().id == source && r.path.last().id == goal)
    val nodes = g.nodes.associateBy { it.id }
    check(r.path.all { nodes[it.id] == it })
    check(r.path.map { it.id }.distinct().size == r.path.size)
    val transitions = mutableListOf<RouteTransition>()
    var length = 0.0
    for ((a, b) in r.path.zipWithNext()) {
        val e = g.edges.single { it.a == a.id && it.b == b.id || it.b == a.id && it.a == b.id }
        check(allowed(mode, e))
        length += e.w
        if (a.floor != b.floor) transitions.add(RouteTransition(a.id, b.id, e.kind))
    }
    check(close(r.length, length) && close(r.length, expected))
    check(r.floors == r.path.map { it.floor }.distinct() && r.transitions == transitions)
}

private fun synthetic() {
    val ns = listOf(RouteNode("S", 0.0, 0.0, 1, "walk"), RouteNode("A", 1.0, 0.0, 1, "walk"),
        RouteNode("B", 0.0, 1.0, 1, "walk"), RouteNode("G", 2.0, 0.0, 1, "door"),
        RouteNode("U", 2.0, 0.0, 2, "stair"), RouteNode("V", 1.0, 0.0, 2, "elev"),
        RouteNode("X", 20.0, 20.0, 1, "walk"))
    val es = listOf(RouteEdge("S", "A", 7.0, "walk"), RouteEdge("A", "G", 1.0, "walk"),
        RouteEdge("S", "B", 1.0, "walk"), RouteEdge("B", "A", 2.0, "walk"),
        RouteEdge("B", "G", 6.0, "walk"), RouteEdge("G", "U", 3.0, "stair"),
        RouteEdge("A", "V", 2.0, "elev"), RouteEdge("V", "U", 1.0, "walk"))
    val g = RouteGraph("test", "v1", "local", ns, es)
    val d = RouteDestinations("test", "v1", ns.map { RouteLocation("L_" + it.id, it.id, it.floor, it.id, "other") })
    val planner = RoutePlanner(d)
    val s = start(g, ns[0])
    fun route(id: String, mode: String = "any") = planner.findRoute(g, s, "L_" + id, mode)
    check(route("G")!!.path.map { it.id } == listOf("S", "B", "A", "G"))
    check(route("G")!!.length == 4.0)
    check(route("U", "any")!!.length == 6.0)
    check(route("U", "stair")!!.length == 7.0)
    check(route("U", "elev")!!.length == 6.0)
    check(route("X") == null && route("S")!!.length == 0.0)
    var count = 0
    for (mode in listOf("any", "stair", "elev")) for (n in ns) {
        val expected = oracle(g, n.id, mode)
        for (l in d.locations) {
            val result = planner.findRoute(g, start(g, n), l.id, mode)
            val cost = expected.getValue(l.nodeId)
            if (cost.isFinite()) validate(g, checkNotNull(result), n.id, l.nodeId, mode, cost) else check(result == null)
            count++
        }
    }
    check(planner.findRoute(g, s.copy(position = RoutePosition(0.01, 0.0, 1)), "L_G", "any") == null)
    check(planner.findRoute(g, s.copy(position = RoutePosition(0.0, 0.0, 2)), "L_G", "any") == null)
    check(planner.findRoute(g.copy(nodes = ns + RouteNode("S2", 0.0, 0.0, 1, "walk")), s, "L_G", "any") == null)
    invalid { planner.findRoute(g, s, "missing", "any") }
    invalid { planner.findRoute(g, s, "L_G", "bad") }
    invalid { planner.findRoute(g, s.copy(mapVersion = "old"), "L_G", "any") }
    invalid { planner.findRoute(g, s.copy(coordinateSystemId = "bad"), "L_G", "any") }
    invalid { planner.findRoute(g, s.copy(confidence = Double.NaN), "L_G", "any") }
    invalid { planner.findRoute(g, s.copy(timestamp = "bad"), "L_G", "any") }
    invalid { planner.findRoute(g.copy(nodes = ns + ns[0]), s, "L_G", "any") }
    invalid { planner.findRoute(g.copy(edges = es + RouteEdge("A", "S", 7.0, "walk")), s, "L_G", "any") }
    invalid { planner.findRoute(g.copy(edges = es + RouteEdge("S", "missing", 1.0, "walk")), s, "L_G", "any") }
    invalid { planner.findRoute(g.copy(edges = es + RouteEdge("S", "G", 0.5, "walk")), s, "L_G", "any") }
    invalid { planner.findRoute(g.copy(edges = es + RouteEdge("S", "U", 2.0, "walk")), s, "L_G", "any") }
    invalid { planner.findRoute(g.copy(edges = es + RouteEdge("S", "X", Double.NaN, "walk")), s, "L_G", "any") }
    invalid { RoutePlanner(d.copy(mapVersion = "old")).findRoute(g, s, "L_G", "any") }
    invalid { RoutePlanner(d.copy(locations = d.locations + d.locations[0])).findRoute(g, s, "L_G", "any") }
    invalid { RoutePlanner(d.copy(locations = d.locations.map { if (it.id == "L_G") it.copy(floor = 2) else it })).findRoute(g, s, "L_G", "any") }
    println("Synthetic: $count oracle comparisons + explicit shortest/mode/error/matching checks PASS")
}

fun main(args: Array<String>) {
    synthetic()
    if (args.isEmpty()) return
    // Python runner exports only contract fields from the checked-out JSON files.
    val rows = File(args.single()).readLines().map { it.split('\t') }
    val meta = rows.single { it[0] == "G" }
    val g = RouteGraph(meta[1], meta[2], meta[3], rows.filter { it[0] == "N" }.map {
        RouteNode(it[1], it[2].toDouble(), it[3].toDouble(), it[4].toInt(), it[5])
    }, rows.filter { it[0] == "E" }.map { RouteEdge(it[1], it[2], it[3].toDouble(), it[4]) }, meta[4], meta[5])
    val dm = rows.single { it[0] == "C" }
    val d = RouteDestinations(dm[1], dm[2], rows.filter { it[0] == "D" }.map {
        RouteLocation(it[1], it[2], it[3].toInt(), it[4], it[5])
    })
    val planner = RoutePlanner(d, allowDraftSvgUnits = true)
    invalid { RoutePlanner(d).findRoute(g, start(g, g.nodes.first()), d.locations.first().id, "any") }
    var count = 0
    var reachable = 0
    for (mode in listOf("any", "stair", "elev")) for (n in g.nodes) {
        val expected = oracle(g, n.id, mode)
        for (l in d.locations) {
            val r = planner.findRoute(g, start(g, n), l.id, mode)
            val cost = expected.getValue(l.nodeId)
            if (cost.isFinite()) { validate(g, checkNotNull(r), n.id, l.nodeId, mode, cost); reachable++ }
            else check(r == null)
            count++
        }
    }
    println("1F: ${g.nodes.size} nodes, ${g.edges.size} edges, ${d.locations.size} destinations; $count oracle comparisons, $reachable reachable PASS")
    val source = g.nodes.first { it.id == "ENTRANCE-A-W" }
    val sample = checkNotNull(planner.findRoute(g, start(g, source), "L_A118", "any"))
    println("Sample: ${sample.path.joinToString(" -> ") { it.id }}; length=${sample.length} SVG units")
}
