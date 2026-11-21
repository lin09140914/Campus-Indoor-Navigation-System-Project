# UI Team V0.1 Development Schedule

## 1. Proposed Development Schedule

| Due date (2026) | Deliverable | Minimum requirement |
| --- | --- | --- |
| Nov 29 | Android UI and basic forms | Provide destination and travel-mode selection, a WebView screen, and a single-floor map display. |
| Dec 6 | Complete navigation flow | Integrate localization, routing, and 3D rendering; display routes, support manual floor switching, and show basic errors for the first MVP demonstration. |
| Dec 11 | Final V0.1 deliverable | Resolve integration issues, test normal and error flows, and deliver an operable Android app. |

## 2. Acceptance Criteria by Stage

| Stage | Acceptance criteria |
| --- | --- |
| Nov 29 | Users can choose a destination from shared data and select a travel mode; WebView displays the 3D team's single-floor map. |
| Dec 6 | The app obtains a location, lets the user choose a destination and mode, retrieves a Route, and displays the map and route. For a cross-floor route, users can switch among traversed floors while the map and route update together. Any demonstration start point used when localization is unavailable must be clearly labeled. |
| Dec 11 | The end-to-end navigation flow works; missing destinations, localization failure, unreachable routes, missing map data, and rendering failure produce understandable messages without preventing further app use. |

## 3. Features to Implement

- Provide destination and `any`, `stair`, `elev` travel-mode selection in the Android UI.
- Integrate the Localization team's `getCurrentPosition()` and the Route team's `findRoute()`; display results in WebView through the 3D team's `renderMap()` and `renderRoute()`.
- Let users manually switch among route floors and keep the map and route segment in sync.
- Translate module error states into understandable messages and next steps.
