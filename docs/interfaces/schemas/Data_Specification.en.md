# Campus Indoor Navigation System V1 — Unified Data Specification

**Document version:** V1.0 (final proposal)  
**Applies to:** Map, Localization, Route, 3D, UI Teams  
**Document type:** Cross-team data contract  
**Note:** This is an English translation of the Chinese original (`docs/interfaces/schemas/Data_Specification.md`). If the two differ, the Chinese original prevails.

---

# 1. SVG Floor Plan Data Specification

**Provided by:** Map Team  
**Used by:** 3D Team  
**File format:** `.svg`

## 1.1 Basic Rules
- Each floor uses a separate SVG.
- A `viewBox` is required so drawing coordinates can be converted.
- All SVGs must follow the unified coordinate conversion rules.
- Rooms, walls, corridors, stairs, and elevators must be distinguishable by fixed layer IDs.
- Every Graph node must be able to map to a navigation anchor in the SVG.
- JavaScript execution and loading external resources are not allowed in the SVG.

## 1.2 Required SVG Attributes
| Attribute | Type | Description |
|---|---|---|
| `xmlns` | String | SVG XML namespace |
| `viewBox` | String | SVG drawing extent |
| `data-building-id` | String | Building ID |
| `data-floor` | Integer | Floor ID |
| `data-map-version` | String | Map data version |

## 1.3 Standard Layer IDs
| ID | Content |
|---|---|
| `walls` | Walls |
| `rooms` | Rooms |
| `corridors` | Corridors |
| `stairs` | Stairs |
| `elevators` | Elevators |
| `nav-anchors` | Navigation node anchors |

Empty layers may be kept, but the meaning of defined IDs must not be changed on one's own.

## 1.4 SVG Example
```xml
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 120 100"
     data-building-id="B01"
     data-floor="1"
     data-map-version="2026-11-19-01">
  <g id="walls"><path d="M0 0 H120 V100 H0 Z" fill="none" stroke="black"/></g>
  <g id="rooms"></g>
  <g id="corridors"></g>
  <g id="stairs"></g>
  <g id="elevators"></g>
  <g id="nav-anchors" display="none">
    <circle id="anchor-N1" cx="20" cy="30" r="1"/>
    <circle id="anchor-N2" cx="60" cy="30" r="1"/>
  </g>
</svg>
```
This example only shows the required structure and is not a complete real building floor plan. SVG drawing coordinates must be converted to real-world coordinates according to Sections 2 and 7.

---

# 2. Unified Coordinate System Specification

**Applies to:** all five teams

## 2.1 Coordinate Definition
A Building Local Coordinate System in three dimensions is used.

| Coordinate | Meaning | Positive direction | Unit |
|---|---|---|---|
| `x` | Horizontal position | Right of the building reference direction | m |
| `y` | Vertical height | Up | m |
| `z` | Horizontal position | Down of the building reference direction | m |

The building reference direction is established by the Map Team and confirmed by the Integration Team. This project uses the Y-up coordinate convention compatible with Three.js, and horizontal navigation uses the XZ plane.

## 2.2 Origin Rules
- Each building has one unique fixed origin.
- For V1, the top-left reference point of the 1F floor plan is recommended as `(0,0,0)`.
- All floors share the same horizontal coordinate system.
- Different floors are distinguished by the `y` height.
- Once the origin is settled, no team may adjust it on its own.

## 2.3 Coordinate Usage Rules per Team
| Team | Coordinate data |
|---|---|
| Map Team | `x, z, floor` |
| Localization Team | `x, z, floor` |
| Route Team | `x, z, floor` |
| 3D Team | `x, y, z` |
| UI Team | Receives unified localization, route, and floor data |

`floor` is used to look up the floor height: `y = floor.elevation_m`.

## 2.4 SVG Coordinate Conversion
SVG uses 2D drawing coordinates `(u,v)`, which are mapped to world coordinates `(x,z)` through the floor transform information. Each floor must define `scale_m_per_svg_unit` (meters per SVG unit), `rotation_deg` (planar rotation angle), and `origin_x_m` and `origin_z_m` (world coordinates of the SVG origin).

Let `(u0,v0)` be the top-left corner of the SVG `viewBox`, `s` the scale, and `θ` the rotation angle:
```text
du = u - u0
dv = v - v0

x = origin_x_m + s(du cosθ - dv sinθ)
z = origin_z_m + s(du sinθ + dv cosθ)
```
`rotation_deg = 0` means SVG-right maps to world `+x` and SVG-down maps to world `+z`. No team may use a different coordinate conversion formula on its own.

---

# 3. Graph Navigation Graph Data Specification

**Provided by:** Map Team  
**Used by:** Route Team, 3D Team (`renderRoute` verifies the Route against the Graph)  
**File format:** `graph.json`

## 3.1 Standard Data Structure
```json
{
  "building_id": "B01",
  "map_version": "2026-11-19-01",
  "coordinate_system_id": "B01_LOCAL_V1",
  "nodes": [
    {"id": "N1", "x": 2.0, "z": 3.0, "floor": 1, "type": "walk"},
    {"id": "N2", "x": 6.0, "z": 3.0, "floor": 1, "type": "stair"},
    {"id": "N3", "x": 6.0, "z": 3.0, "floor": 2, "type": "stair"},
    {"id": "N4", "x": 8.0, "z": 3.0, "floor": 2, "type": "door"}
  ],
  "edges": [
    {"a": "N1", "b": "N2", "w": 4.0, "kind": "walk"},
    {"a": "N2", "b": "N3", "w": 8.0, "kind": "stair"},
    {"a": "N3", "b": "N4", "w": 2.0, "kind": "walk"}
  ]
}
```

## 3.2 Node Fields
| Field | Type | Required | Description |
|---|---|---|---|
| `id` | String | Yes | Node ID, unique across the whole Graph |
| `x` | Number | Yes | World X coordinate, m |
| `z` | Number | Yes | World Z coordinate, m |
| `floor` | Integer | Yes | Floor ID |
| `type` | String | Yes | Node type |

Standard `type` values: `walk` ordinary walkable node, `door` entrance/exit node, `stair` stair node, `elev` elevator node.

## 3.3 Edge Fields
| Field | Type | Required | Description |
|---|---|---|---|
| `a` | String | Yes | Node ID at the start end |
| `b` | String | Yes | Node ID at the end end |
| `w` | Number | Yes | Edge weight |
| `kind` | String | Yes | Traversal type |

Standard `kind` values: `walk`, `stair`, `elev`. V1 uses an **undirected graph**; every Edge can be traversed in both directions. `w` is defined as a positive weighted equivalent distance (a non-negative cost that must be positive), in equivalent meters. By default V1 uses travel distance as the main weight; stairs and elevators may use equivalent distances.

To ensure that the A* heuristic using the current XZ straight-line distance does not overestimate cost, each edge's `w` must not be less than the XZ-plane straight-line distance between its two end nodes. If the weight definition changes later, the Route Team must re-verify the admissibility of the heuristic.

## 3.4 Validation Rules
- Node IDs must not repeat.
- The `a` and `b` of an Edge must exist in `nodes`.
- `a` must not equal `b`.
- `w` must be a finite positive number.
- The same pair of nodes must not have duplicate undirected edges.
- Cross-floor Edges may only use `stair` or `elev`.
- All nodes use the unified coordinate system and floor IDs.

---

# 4. Route Navigation Route Data Specification

**Provided by:** Route Team  
**Used by:** UI, 3D Teams  
**Data format:** JSON

## 4.1 Standard Data Structure
```json
{
  "building_id": "B01",
  "map_version": "2026-11-19-01",
  "coordinate_system_id": "B01_LOCAL_V1",
  "mode": "stair",
  "path": [
    {"id": "N1", "x": 2.0, "z": 3.0, "floor": 1, "type": "walk"},
    {"id": "N2", "x": 6.0, "z": 3.0, "floor": 1, "type": "stair"},
    {"id": "N3", "x": 6.0, "z": 3.0, "floor": 2, "type": "stair"},
    {"id": "N4", "x": 8.0, "z": 3.0, "floor": 2, "type": "door"}
  ],
  "length": 14.0,
  "floors": [1, 2],
  "transitions": [{"from": "N2", "to": "N3", "kind": "stair"}]
}
```

## 4.2 Route Fields
| Field | Type | Required | Description |
|---|---|---|---|
| `building_id` | String | Yes | Building ID |
| `map_version` | String | Yes | Map version used |
| `coordinate_system_id` | String | Yes | Coordinate system ID |
| `mode` | String | Yes | Movement mode used |
| `path` | Array | Yes | Nodes in walking order |
| `length` | Number | Yes | Sum of path Edge weights |
| `floors` | Integer[] | Yes | Floors in order of first visit |
| `transitions` | Array | Yes | Cross-floor transition information |

Every node in `path` must conform to the Graph Node specification. `length` is the sum of Graph `w` values and represents a weighted equivalent distance; it is not guaranteed to equal the actual walking distance. The UI must not label it directly as actual walking meters unless the weight definition has been confirmed to equal real distance.

## 4.3 Movement Modes
| mode | Definition |
|---|---|
| `any` | No restriction on stairs or elevators |
| `stair` | Allows ordinary passages and stairs, forbids elevators |
| `elev` | Allows ordinary passages and elevators, forbids stairs |

The three mode names must be kept consistent between the UI and the Route Team.

## 4.4 Cross-floor Transitions
Every floor change must be recorded in `transitions`, stating both end nodes and the traversal method. For a same-floor route, `transitions` is an empty array. When no path is reachable, the V1 route query result is `null`; invalid input or execution failure falls under error handling, to be defined later by the unified Exception specification.

## 4.5 Validation Rules
- The nodes in `path` must exist in the corresponding Graph.
- Adjacent path nodes must have a valid Edge between them.
- `mode` must satisfy the traversal restrictions of all Edges used.
- `length` must equal the sum of the `w` of the path's Edges.
- `floors` must match the floors the `path` actually passes through.
- Every floor change must have a valid `transitions` entry.
- When start equals end, a single node is allowed and `length` is 0.

---

# 5. Node Mapping Specification

**Provided by:** Map Team  
**Used by:** Route, 3D Teams  
**File format:** `node_map.json`

## 5.1 Purpose
Establishes a one-to-one correspondence between Graph Nodes and SVG map anchors. The relationship between destinations and walkable nodes is managed separately by the item 8 location data, to avoid maintaining the same relationship in multiple files.

## 5.2 Standard Data Structure
```json
{
  "building_id": "B01",
  "map_version": "2026-11-19-01",
  "entries": [
    {"node_id": "N1", "floor": 1, "svg_anchor_id": "anchor-N1"},
    {"node_id": "N2", "floor": 1, "svg_anchor_id": "anchor-N2"},
    {"node_id": "N3", "floor": 2, "svg_anchor_id": "anchor-N3"},
    {"node_id": "N4", "floor": 2, "svg_anchor_id": "anchor-N4"}
  ]
}
```

## 5.3 Fields
| Field | Type | Description |
|---|---|---|
| `node_id` | String | Graph Node ID |
| `floor` | Integer | Floor of the Node |
| `svg_anchor_id` | String | Corresponding anchor ID in the SVG |

All fields are required.

## 5.4 Validation Rules
- Every Graph Node must have exactly one Mapping entry.
- `node_id` must exist in the Graph.
- `svg_anchor_id` must exist in the SVG of the corresponding floor.
- `floor` must match the Graph Node.
- After converting an SVG anchor to world coordinates, its XZ distance error from the Graph Node must not exceed 0.05 m. This is a tolerance for consistency between data sets, not an error threshold for real building surveying.

---

# 6. Localization Result Specification

**Provided by:** Localization Team  
**Used by:** UI, Route, 3D Teams  
**Data format:** JSON

## 6.1 Standard Data Structure
```json
{
  "building_id": "B01",
  "map_version": "2026-11-19-01",
  "coordinate_system_id": "B01_LOCAL_V1",
  "position": {"x": 2.0, "z": 3.0, "floor": 1},
  "confidence": 0.86,
  "timestamp": "2026-11-19T06:00:00Z"
}
```

## 6.2 Field Definitions
| Field | Type | Required | Description |
|---|---|---|---|
| `building_id` | String | Yes | Building ID |
| `map_version` | String | Yes | Map version the localization corresponds to |
| `coordinate_system_id` | String | Yes | Unified coordinate system ID |
| `position` | Object | Yes | Position information |
| `position.x` | Number | Yes | X coordinate, m |
| `position.z` | Number | Yes | Z coordinate, m |
| `position.floor` | Integer | Yes | Floor where the device is |
| `confidence` | Number | Yes | Localization confidence score |
| `timestamp` | String | Yes | ISO 8601 UTC localization time |

## 6.3 Confidence Rules
V1 uniformly uses `0.0 ≤ confidence ≤ 1.0`. A larger value means the Localization Team has higher confidence in the result. This is a normalized confidence score, not directly equal to a probability of success, and `0.8` must not be read as an 80% probability of being within some distance. The Localization Team must explain how the score is computed and validate its usefulness in accuracy tests.

## 6.4 Localization Success and Failure
- Success: return a complete and valid Localization Result.
- Failure: coordinates or confidence must not be fabricated.
- Concrete failure codes and the reporting method are left to the project-wide exception handling specification.

V1 only requires automatic in-place localization, not continuous position tracking.

---

# 7. Floor Specification

**Provided by:** Map Team  
**Used by:** all five teams  
**File format:** `floors.json`

## 7.1 Floor ID Definition
V1 uses an Integer to represent floors.
| Actual floor | floor |
|---|---:|
| B2 | -2 |
| B1 | -1 |
| 1F | 1 |
| 2F | 2 |
| 3F | 3 |

Ordinary floor numbering does not use `0`. If a building has special floor numbering, the Integration Team will confirm it separately.

## 7.2 Standard Data Structure
```json
{
  "building_id": "B01",
  "map_version": "2026-11-19-01",
  "coordinate_system_id": "B01_LOCAL_V1",
  "floors": [
    {"floor": 1, "label": "1F", "elevation_m": 0.0, "svg": "floors/1.svg",
     "svg_transform": {"origin_x_m": 0.0, "origin_z_m": 0.0, "scale_m_per_svg_unit": 0.1, "rotation_deg": 0.0}},
    {"floor": 2, "label": "2F", "elevation_m": 4.0, "svg": "floors/2.svg",
     "svg_transform": {"origin_x_m": 0.0, "origin_z_m": 0.0, "scale_m_per_svg_unit": 0.1, "rotation_deg": 0.0}}
  ]
}
```

## 7.3 Floor Fields
| Field | Type | Description |
|---|---|---|
| `floor` | Integer | Unique floor ID |
| `label` | String | UI display name |
| `elevation_m` | Number | Floor reference height, m |
| `svg` | String | Relative path of the floor's SVG |
| `svg_transform` | Object | Information needed to convert SVG to world coordinates |

`svg_transform` must contain the four transform parameters specified in Section 2.

## 7.4 Validation Rules
- Floor IDs must not repeat.
- The SVG file must exist.
- All floors referenced by the Graph must exist.
- The `elevation_m` of different floors must follow the real height order.
- `scale_m_per_svg_unit` must be greater than 0.
- The floor ID of a floor's SVG must match the Floor data.

---

# 8. Location / Destination Specification

**Provided by:** Map Team  
**Used by:** UI, Route Teams  
**File format:** `destinations.json`

## 8.1 Purpose
Provides the navigation destinations a user can choose and maps each destination to a walkable Graph node. When a user selects a destination, the UI uses the Location ID, rather than composing room names or Graph Node IDs itself.

## 8.2 Standard Data Structure
```json
{
  "building_id": "B01",
  "map_version": "2026-11-19-01",
  "locations": [
    {"id": "L_F2_201", "name": "Room 201", "floor": 2, "node_id": "N4", "category": "room"}
  ]
}
```

## 8.3 Fields
| Field | Type | Required | Description |
|---|---|---|---|
| `id` | String | Yes | Unique destination ID |
| `name` | String | Yes | Display name |
| `floor` | Integer | Yes | Floor of the destination |
| `node_id` | String | Yes | Corresponding walkable Graph Node |
| `category` | String | Yes | Location category |

Standard `category` values: `room` (classroom or ordinary room), `entrance` (building entrance/exit), `facility` (public facility), `stair` (stairs), `elev` (elevator), `other` (other places).

## 8.4 Validation Rules
- Location IDs must not repeat.
- `node_id` must exist in the Graph.
- The Location's `floor` must match the corresponding Node.
- The UI must not change Location IDs on its own.
- The Route Team must be able to use a Location ID to find the corresponding navigation node.

In V1 each destination maps to one primary walkable node. Multi-entrance destinations may be added in a later version.

---

# 9. Global Common Rules

## 9.1 Naming and Data Types
All JSON fields use `snake_case`; the established short fields `id`, `x`, `z`, `a`, `b`, `w` in Graph and Route are retained.
- IDs are always Strings; numeric IDs are not used.
- Floor IDs are always Integers.
- Coordinates, weights, and heights are finite Numbers; NaN and Infinity are not allowed.
- Required fields must not be missing; an empty string must not stand in for a missing required ID.

## 9.2 Map Version Consistency
The SVG, Graph, Node Mapping, Floor, and Destination delivered by the Map Team must all have the same `map_version`. Localization results and Routes must state the map version and coordinate system they used. Data of different versions must not be mixed directly before compatibility is confirmed.

## 9.3 ID Management
| ID type | Example | Principle |
|---|---|---|
| Building ID | `B01` | Unique per building |
| Coordinate System ID | `B01_LOCAL_V1` | Specifies the coordinate baseline version |
| Node ID | `N4` | Unique within a Graph |
| Location ID | `L_F2_201` | Unique within a building |
| Floor ID | `2` | Unique within a building |
| SVG Anchor ID | `anchor-N4` | Unique within an SVG |

The strings above are naming-convention examples; programs must not parse ID strings to obtain floors or coordinates, and must read the corresponding fields.

## 9.4 Data Change Principle
A published cross-team data specification must not be modified by a single team on its own. A change should state its content, affected teams, and compatibility notes, and be reviewed and updated uniformly by the Integration Team.

## 9.5 Specification Validation
Before formal use, the following must be validated: JSON structure and types, ID references, SVG / Graph / Node Mapping coordinate consistency, Floor / Location references, Route consistency with Graph nodes / edges / weights, localization coordinate system consistency, and compatibility of the related data versions. This data contract validation does not replace each team's functional tests and real accuracy tests.

---

# 10. Data Delivery Responsibilities per Team
| Data | Provided by | Main recipient |
|---|---|---|
| SVG | Map Team | 3D Team |
| Coordinate system | Defined by Integration Team, implemented by Map Team | All five teams |
| Graph | Map Team | Route, 3D Teams |
| Route | Route Team | UI, 3D Teams |
| Node Mapping | Map Team | Route, 3D Teams |
| Localization Result | Localization Team | UI, Route, 3D Teams |
| Floor | Map Team | All five teams |
| Destination | Map Team | UI, Route Teams |

All teams may decide their internal implementations freely, but cross-team data must follow this document.

**After review and release by the Integration Team, the V1.0 data specification serves as the formal data contract shared by the five teams.**
