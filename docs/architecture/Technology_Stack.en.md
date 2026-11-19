# Campus Indoor Navigation System V1 — Technology Stack and Version Specification

> **File:** `docs/architecture/Technology_Stack.en.md`  
> **Document version:** V1.0 (selected version baseline; first full build and test-device verification still pending)  
> **Updated:** 2026-11-19  
> **System architecture basis:** `System_Architecture.md`  
> **Note:** This is an English translation of the Chinese original (`docs/architecture/Technology_Stack.md`). If the two differ, the Chinese original prevails.

## 1. Principles and Release Target

- V1 deployment form: a **test APK installed by team members / instructors**; publishing on Google Play is not a goal.
- Native Android development, offline-first; core navigation does not depend on a backend or CDN.
- UI, localization, and routing are mainly Kotlin; 3D uses JavaScript / Three.js.
- Shared dependencies must be locked centrally; the five teams must not each choose different versions.
- The versions in the tables below are the **currently adopted fixed baseline** for the project, not a claim that everything has already been built successfully in one project; they must be verified at first integration.
- The IDE is a free choice, but every developer must use a compatible JDK, Android SDK, Gradle Wrapper, and Node.js.

## 2. Android Build Environment (Version Baseline)

| Technology | Fixed version / value | Purpose or restriction |
|---|---|---|
| JDK | **21 LTS** | Unified Gradle runtime; the Java / Kotlin bytecode target may be set separately |
| Kotlin | **2.4.21** | Android native code |
| Android Gradle Plugin (AGP) | **9.3.1** | Android build |
| Gradle Wrapper | **9.5.0** | Gradle version is controlled by the Wrapper |
| Compose Compiler Gradle Plugin | **2.4.21** | Keeps the Compose compiler in sync with Kotlin; plugin setup must follow AGP 9 rules |
| `compileSdk` | **37** | Compile API; the matching SDK Platform must be installed |
| `targetSdk` | **36** | Baseline for Android 16 behavior and permission adaptation |
| `minSdk` | **29** | Minimum Android 10; must be compatible with the actual test phones |

**Note:** `minSdk` determines the lowest installable system; `targetSdk` determines the target behavior rules; `compileSdk` determines the compile APIs available. They must not be confused. The official AGP 9.3 compatibility table specifies Gradle 9.5.0; the setup of Kotlin 2.4.21 with this combination still requires an actual APK build to verify.

**Important:** AGP 9 introduces built-in Kotlin support, so the legacy `org.jetbrains.kotlin.android` plugin must not be applied at the same time without confirmation. How the Compose Compiler plugin is enabled must also follow the selected AGP / Kotlin setup, to avoid duplicate loading or conflicts.

## 3. AndroidX, Compose, and Shared Libraries

| Dependency | Fixed version | Main user / purpose |
|---|---|---|
| Compose BOM | **2026.09.00** | Manages Compose UI / Material3 related versions |
| `androidx.activity:activity-compose` | **1.13.0** | UI Team: Activity + Compose |
| `androidx.lifecycle:lifecycle-runtime-ktx` | **2.11.1** | App / UI: Lifecycle |
| `androidx.lifecycle:lifecycle-viewmodel-compose` | **2.11.1** | App / UI: ViewModel |
| `androidx.navigation:navigation-compose` | **2.10.2** | UI Team: screen navigation (not A* on the Graph) |
| `androidx.webkit:webkit` | **1.18.0** | WebView bridge / feature compatibility |
| `androidx.core:core-ktx` | **1.19.1** | Android Kotlin extensions |
| `org.jetbrains.kotlinx:kotlinx-coroutines-android` | **1.11.0** | Async flows / lifecycle work |
| `org.jetbrains.kotlinx:kotlinx-serialization-json` | **1.13.0** | JSON data parsing and bridge packets |

The Compose UI libraries themselves should get their versions from the BOM; **do not specify conflicting versions on the same dependency elsewhere**. `2026.09.00` is a better fit under the currently selected `compileSdk 37` / AGP 9 baseline; any later BOM upgrade should first check the new SDK / AGP requirements.

A third-party A* package is not required; the Route Team may implement it itself. The Map Team may use Python for offline processing, but it is not a runtime dependency of the APK.

## 4. Three.js and JavaScript Toolchain

| Technology | Fixed version / rule | Purpose |
|---|---|---|
| Node.js | **26.13.1 LTS** | 3D front-end development / build |
| npm | Matches that Node.js release; resolution locked via `package-lock.json` | JS package management |
| Three.js | **0.187.0 (r187)** | 3D map, routes, and interaction |
| Vite | **8.3.8** | Bundles Three.js static assets |
| JavaScript modules | ES Modules | `import` / `export` |
| Graphics API | WebGL 2 preferred | WebGL capability of Android WebView depends on the actual device |

Three.js `SVGLoader` and `ExtrudeGeometry` must use the same package version as the project's Three.js, to avoid mixing in older APIs from example code. The WebView system core is **provided by the device's Android System WebView / browser and its actual version cannot be pinned by Gradle**.

### 4.1 npm Version-lock Example

```json
{
  "private": true,
  "type": "module",
  "dependencies": {
    "three": "0.187.0"
  },
  "devDependencies": {
    "vite": "8.3.8"
  }
}
```

The above is an illustrative fragment of the core dependencies; the real `package.json` still needs runnable `scripts`, and lockfile consistency should be verified with `npm ci`. **Do not use `^`, `~`, or `latest` as the official version-lock strategy**, and do not let the running APK load Three.js from a CDN.

## 5. Native Android APIs and Permissions

| API / component | Source | Purpose or restriction |
|---|---|---|
| `SensorManager` | Android Framework | Gyroscope, accelerometer, and other available sensors (depending on localization method) |
| `WifiManager` | Android Framework | Obtains available Wi-Fi information if Wi-Fi RSSI / scanning is used |
| `WebView` | Android Framework | Displays the Three.js page |
| `androidx.webkit` | AndroidX | WebView compatibility helpers, messaging / AssetLoader, etc. |

For the Android Framework APIs above, **no Maven package version is specified separately**. Wi-Fi scan permissions, location-service state, system throttling, and limits across Android versions must be checked by the Localization Team and the integration team against the actual algorithm. `minSdk = 29` does not mean every test phone has the same sensors or the same WebGL capability.

## 6. Android ↔ Three.js Integration Dependencies

- Compose and WebView: the WebView is hosted through Compose `AndroidView`.
- Loading local JS in WebView: candidate `WebViewAssetLoader`, avoiding arbitrary `file://` access.
- Native / JS messaging: candidate AndroidX WebKit WebMessageListener; JSON is used uniformly to carry the standard map, Route, and status.
- The real request / reply packets, exception codes, and function interfaces must be consistent with `docs/interfaces/functions/function.md`.
- Local resources ship with the APK; V1 core navigation needs no network or backend API.

## 7. Team and Technology Ownership

| Team | Main technology | Cross-team dependencies |
|---|---|---|
| Map | SVG / JSON; offline processing tools of choice | Delivers standard SVG, Graph, Mapping, Floor, Destination |
| Localization | Kotlin, SensorManager / WifiManager, Coroutines | Outputs standard Localization Result |
| Route | Kotlin, A*, data models | Input: Graph / Position / Destination / Mode; output: Route |
| 3D | JavaScript, Three.js, Vite | Input: standard SVG / Floor / Route, displayed via WebView |
| UI | Kotlin, Jetpack Compose, Lifecycle, Navigation | Uses standard data and Functions, handles screens and exceptions |
| Integration | Gradle, AndroidX WebKit, JSON Serialization | Resource packaging, WebView bridge, data-flow coordination |

## 8. Single Source of Truth for Versions

| Type | Recommended real lock location | Governing document |
|---|---|---|
| JDK | Team runtime environment / Gradle Toolchain setting (as needed) | This document |
| Gradle | `gradle/wrapper/gradle-wrapper.properties` | This document |
| AGP / AndroidX / Kotlin | `gradle/libs.versions.toml` or equivalent central config | This document |
| Node.js | `.node-version` | This document |
| Three.js / Vite | `threejs/package.json` + `threejs/package-lock.json` | This document |
| Data fields and schema | `docs/interfaces/schemas/Data_Specification.md` | Data contract |
| Cross-team functions | `docs/interfaces/functions/function.md` | Function contract |

When formally upgrading a shared version, first raise the change and its compatibility impact, update the lock files, then sync this document and `docs/decisions.md`; the five teams must not each upgrade the same shared dependency.

## 9. Pending Confirmation / Runtime Verification

This section records items that cannot yet be considered "actually tested and passing"; this document **does not define the test process**.

1. The actual plugin configuration and a full APK build of JDK 21 + AGP 9.3.1 + Gradle 9.5.0 + Kotlin 2.4.21 + Compose Compiler Plugin 2.4.21.
2. Installation of the `compileSdk 37` SDK, and dependency resolution of the Compose BOM and the AndroidX versions.
3. Support for local resources, JavaScript modules, WebGL 2, and SVGLoader in WebView on real phones.
4. The two-way JSON bridge between WebView and Kotlin, trusted-origin restrictions, and exception reporting.
5. The system permissions and availability required by the Wi-Fi / sensor APIs adopted by the Localization Team.
6. Whether `minSdk 29` covers all phones that team members and instructors want to test on.

## 10. Official References

- Android Gradle Plugin 9.3: <https://developer.android.com/build/releases/agp-9-3-0-release-notes>
- Android Gradle Plugin and Gradle compatibility: <https://developer.android.com/build/releases/about-agp>
- Kotlin releases and versions: <https://kotlinlang.org/docs/releases.html>
- Compose Compiler setup: <https://developer.android.com/develop/ui/compose/setup-compose-dependencies-and-compiler>
- Compose BOM: <https://developer.android.com/develop/ui/compose/bom>
- AndroidX WebKit: <https://developer.android.com/jetpack/androidx/releases/webkit>
- Three.js: <https://threejs.org/docs/>
- Three.js npm: <https://www.npmjs.com/package/three>
- Node.js 26.13.1: <https://nodejs.org/en/blog/release/v26.13.1>
- Vite releases: <https://vite.dev/releases>

## 11. Reminders for the Next Phase

After the architecture and technology stack are confirmed, the validation of the eight data formats, cross-team Function contract tests, unit tests, integration tests, and QA will be defined. After deployment testing, maintenance proceeds through logs, regression tests, and user feedback. At this stage, GitHub is not modified and no test specification is created.
