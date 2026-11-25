import com.example.campusindoornavigation.routing.*
import java.io.File
import kotlinx.serialization.json.*
import kotlin.math.abs

// Optional JVM smoke test; compile with the project's actual kotlinx.serialization JSON/core jars.
fun main(args: Array<String>) {
    val data = File(args.singleOrNull() ?: "data/drafts/floor-1")
    val graph = RouteJson.decodeGraph(File(data, "graph.json").readText(Charsets.UTF_8))
    val destinations = RouteJson.decodeDestinations(File(data, "destinations.json").readText(Charsets.UTF_8))
    val source = graph.nodes.single { it.id == "ENTRANCE-A-W" }
    // Mock localization only: coordinates copied from a known draft node, not a sensor measurement.
    val start = RouteJson.decodeStart(buildJsonObject {
        put("building_id", graph.buildingId)
        put("map_version", graph.mapVersion)
        put("coordinate_system_id", graph.coordinateSystemId)
        putJsonObject("position") {
            put("x", source.x); put("z", source.z); put("floor", source.floor)
        }
        put("confidence", 1.0)
        put("timestamp", "2026-11-25T00:00:00Z")
    }.toString())
    val route = checkNotNull(RoutePlanner(destinations, allowDraftSvgUnits = true)
        .findRoute(graph, start, "L_A118", "any"))
    val wire = Json.parseToJsonElement(RouteJson.encodeRoute(route)).jsonObject
    check(wire.keys == setOf("building_id", "map_version", "coordinate_system_id", "mode", "path", "length", "floors", "transitions"))
    check(wire.getValue("building_id").jsonPrimitive.content == graph.buildingId)
    check(wire.getValue("map_version").jsonPrimitive.content == graph.mapVersion)
    check(wire.getValue("coordinate_system_id").jsonPrimitive.content == graph.coordinateSystemId)
    check(wire.getValue("mode").jsonPrimitive.content == "any")
    val path = wire.getValue("path").jsonArray
    check(path.size == route.path.size)
    path.zip(route.path).forEach { (element, node) ->
        val n = element.jsonObject
        check(n.keys == setOf("id", "x", "z", "floor", "type"))
        check(n.getValue("id").jsonPrimitive.content == node.id)
        check(n.getValue("x").jsonPrimitive.double == node.x)
        check(n.getValue("z").jsonPrimitive.double == node.z)
        check(n.getValue("floor").jsonPrimitive.int == node.floor)
        check(n.getValue("type").jsonPrimitive.content == node.type)
    }
    check(route.path.first().id == source.id && route.path.last().id == "A118")
    check(abs(wire.getValue("length").jsonPrimitive.double - route.length) < 1e-9)
    check(wire.getValue("floors").jsonArray.map { it.jsonPrimitive.int } == listOf(1))
    check(wire.getValue("transitions").jsonArray.isEmpty())
    check(RouteJson.encodeRoute(null) == "null")
    println("JSON smoke test PASS: ${RouteJson.encodeRoute(route)}")
}
