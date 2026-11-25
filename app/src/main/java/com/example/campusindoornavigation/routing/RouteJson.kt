package com.example.campusindoornavigation.routing

import kotlinx.serialization.json.*

/** Adapter for the existing snake_case JSON contract. No new dependency is required. */
object RouteJson {
    private fun root(text: String) = Json.parseToJsonElement(text).jsonObject
    private fun JsonObject.str(key: String): String = getValue(key).jsonPrimitive.let {
        require(it.isString) { "$key must be a string" }; it.content
    }
    private fun JsonObject.num(key: String): Double = getValue(key).jsonPrimitive.let {
        require(!it.isString) { "$key must be a number" }; it.double
    }
    private fun JsonObject.int(key: String): Int = getValue(key).jsonPrimitive.let {
        require(!it.isString) { "$key must be an integer" }; it.int
    }
    private fun JsonObject.optional(key: String): String? = if (key in this) str(key) else null
    private fun JsonObject.objects(key: String) = getValue(key).jsonArray.map { it.jsonObject }
    private fun JsonObject.node() = RouteNode(str("id"), num("x"), num("z"), int("floor"), str("type"))

    fun decodeGraph(text: String): RouteGraph = root(text).run {
        RouteGraph(str("building_id"), str("map_version"), str("coordinate_system_id"),
            objects("nodes").map { it.node() },
            objects("edges").map { RouteEdge(it.str("a"), it.str("b"), it.num("w"), it.str("kind")) },
            optional("unit"), optional("status"))
    }

    fun decodeDestinations(text: String): RouteDestinations = root(text).run {
        RouteDestinations(str("building_id"), str("map_version"), objects("locations").map {
            RouteLocation(it.str("id"), it.str("name"), it.int("floor"), it.str("node_id"), it.str("category"))
        })
    }

    fun decodeStart(text: String): RouteStart = root(text).run {
        val p = getValue("position").jsonObject
        RouteStart(str("building_id"), str("map_version"), str("coordinate_system_id"),
            RoutePosition(p.num("x"), p.num("z"), p.int("floor")), num("confidence"), str("timestamp"))
    }

    fun encodeRoute(route: Route?): String = if (route == null) "null" else buildJsonObject {
        put("building_id", route.buildingId)
        put("map_version", route.mapVersion)
        put("coordinate_system_id", route.coordinateSystemId)
        put("mode", route.mode)
        putJsonArray("path") {
            for (n in route.path) addJsonObject {
                put("id", n.id); put("x", n.x); put("z", n.z); put("floor", n.floor); put("type", n.type)
            }
        }
        put("length", route.length)
        putJsonArray("floors") { route.floors.forEach { add(JsonPrimitive(it)) } }
        putJsonArray("transitions") {
            for (t in route.transitions) addJsonObject {
                put("from", t.from); put("to", t.to); put("kind", t.kind)
            }
        }
    }.toString()
}
