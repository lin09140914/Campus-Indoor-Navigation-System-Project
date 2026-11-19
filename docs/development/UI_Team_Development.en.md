# UI Team Development Specification — V0.1

> Status: draft implementation specification. Cross-team data and functions follow the interfaces specifications.  
> This is an English translation of the Chinese original (`docs/development/UI_Team_Development.md`). If the two differ, the Chinese original prevails.

## 1. Purpose and Version
Defines the user operation flow and how each team's features are integrated, ensuring users can choose a destination, see their position, and obtain and follow a route.

## 2. Team Mission and Scope
Responsible for screens, interaction, state presentation, permission prompts, error messages, and cross-team call coordination. Not responsible for modifying map topology, localization algorithms, or the routing search core.

## 3. Use Cases and System Flow
Choose a floor or accept localization (V1 covers a single building, so building selection is not offered) → search / select a Destination → call localization and routing → present the map and route → update when moving, when the floor changes, or when data becomes invalid → provide retry and alternative actions.

## 4. Input Data and Preconditions
Receives Floor, Location, Localization Result, Route, SVG / Graph, and the status of each function. Platform permissions must be obtained before starting sensor localization; display names may be localized, but building / location / node IDs must not be translated or reused.

## 5. Output Data and Quality Requirements
Outputs user actions (destination, floor, movement preference, retry) and readable map / localization / route status. The screen must distinguish localizing, success, low confidence, stale, no route, and error, and offer a next action.

## 6. Cross-team Interfaces and Data Dependencies
Calls `getCurrentPosition()` to obtain the position, calls `findRoute()` with the Location `id`, calls `renderMap()` to load the map, and calls `renderRoute()` to overlay the route. The call order must ensure `building_id`, `map_version`, and `coordinate_system_id` are compatible; the UI must not rewrite a Route or treat display strings as IDs.

## 7. Design and Implementation Rules
- The state flow must be explicit, and repeated requests must not overwrite newer results; use timestamps / request identifiers to decide whether a response still applies.
- Destinations are displayed and selected using the V1 Location fields, and passed to the Route Team by the stable `id`; do not assume alias fields exist.
- Map readability, touch targets, keyboard / assistive technology, and color contrast must be part of the design; routes must not be distinguished by color alone.
- Permission purposes and sensor status are explained in clear text; on failure, allow manually choosing a floor or retrying (if the product flow supports it).

## 8. Error Handling and Special Cases
No permission, no localization, low confidence, invalid destination, no route, map data load failure, and floor inconsistency each get a clear status and an actionable message. Avoid duplicate submissions; cancelled / expired requests must not overwrite the latest screen.

## 9. Testing and Acceptance
Walk through the full navigation flow plus permission denial, search with no results, no route, cross-floor, stale localization, load failure, narrow screens, and assistive operation. Verify that the position / floor / route on screen match the data returned by the interfaces, and that users can understand the cause of a failure and how to recover.

## 10. Deliverables, Dependencies, and Open Items
Deliver flow drafts, screen states, integration code, accessibility checks, and end-to-end acceptance records. Depends on stable interfaces from each team. Open: destination search source, language list, and visual design system. V1 is an offline Android app; see `System_Architecture.md`.
