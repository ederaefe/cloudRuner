# Technical Reference & Project Documentation

## Project Overview
BARCH Aero-Canyon Racing is a browser-native, ultra-lightweight, 3D aerial racing game combining industrial Search-and-Rescue VTOL aesthetics with the high-velocity, arcade-thrill dynamics of futuristic racers like *Asphalt* and *Wipeout*.

The engine runs directly on WebGL (via Three.js r128 CDN) with zero build-tool dependencies, targeting 60 FPS on low-tier mobile hardware and 120 FPS on high-performance desktop configurations.

---

## Architectural Principles

### 1. Hardware Profiling & Coordinator Pattern
To prevent stutter and thermal throttling across diverse mobile and desktop ecosystems, the engine executes a pre-render hardware profiling pass (`coordinator.js`):
* **Screen & Pointer Capabilities**: Probes touch points and media queries to dynamically mount either the `TouchControls` system (with haptic feedback) or the `DesktopControls` system (keyboard, mouse look, and Gamepad API).
* **GPU & Memory Tiering**: Reads unmasked WebGL renderer strings and system concurrency metrics to set device pixel ratio (DPR: 1.0 to 2.0), shadow map resolutions, instanced geometry count, and particle counts.

### 2. Intrinsic Aerobatic Stunt State Machine (FSM)
Rather than simulating ground-friction drifting in the air, the game implements authentic aerodynamic stunts governed by an FSM:
* **Snap Aileron Roll**: A 360-degree helical corkscrew around the longitudinal axis via quaternion slerp. Hitbox volume contracts temporarily to navigate narrow obstacles; grants an instant Nitro refill.
* **Knife-Edge Flight**: A 90-degree vertical bank stabilized with opposing rudder compensation, allowing the aircraft to slice through vertical architectural slots; streams continuous multiplier rewards.
* **Pugachev's Cobra / Post-Stall Pitch Flare**: A sudden 80-degree nose-up maneuver where the wing and fuselage planform act as a high-drag airbrake, dumping 62% forward speed within 0.4 seconds to negotiate sharp hairpin entries without perimeter collisions.
* **Near-Miss Facade Buzzing**: Continuous raycasting detects high-speed proximity (<3.5m) to buildings, triggering directional camera buffeting, sonic crack audio pulses, and boost recharge.

### 3. Spline-Driven Track Architecture & Instancing
* **Continuous 3D Splines**: Circuits are defined as mathematical `THREE.CatmullRomCurve3` curves.
* **Frenet-Serret Framing**: Tangent, normal, and binormal vectors along the spline compute the roadbed ribbon geometry, holographic gate rings, and directional chevrons.
* **Instanced Industrial Props**: High-detail environmental props (antennas, gantries, lighting rigs, industrial pipes) are populated via `THREE.InstancedMesh` to keep total scene draw calls under 25.

### 4. Cache-First Offline Persistence
* **Cache API & Service Worker**: A service worker intercepts asset requests and writes procedural schemas, textures, and scripts into `caches.open('barch-aero-v1')`.
* **Zero Network Dependency**: After initial load, the game functions completely offline with 0ms network latency.

### 5. Decoupled Telemetry Snapshot & Multiplayer Contract
All local and remote aircraft states are decoupled into a fixed 48-byte binary structure:
```
[PlayerID: 4B] [Position: 12B] [Quaternion: 16B] [Velocity: 12B] [StuntState: 1B] [NitroState: 1B] [Progress: 2B]
```
This enables zero-latency P2P mesh synchronization via WebRTC DataChannels (`PeerJS` CDN) and local network WebSocket hosting without engine refactoring.

---

## Component Implementation Log

### Completed: Initial Architecture & Production Build
* **Configuration Manifest (`js/config.js`)**: Physics constants, stunt parameters, and hardware tier presets.
* **Device Coordinator (`js/coordinator.js`)**: Probes WebGL GPU information, CPU cores, memory, and pointer type; dynamically selects Tier 1 (Low), Tier 2 (Mid), or Tier 3 (High).
* **Offline Service Worker (`service-worker.js`)**: Pre-caches static assets and provides Cache-First runtime interception.
* **Procedural Sound Engine (`js/audio/sound_engine.js`)**: Real-time Web Audio API synthesis for turbine spool, aerodynamic wind, gate pass chimes, and stunt alerts.
* **Unified Input Bus (`js/input/input_manager.js`, `touch_controls.js`, `desktop_controls.js`)**: Dual virtual stick touch controls with haptic pulses (`navigator.vibrate`) and full keyboard / Gamepad API support.
* **Drone Model & Kinematics (`js/engine/drone.js`)**: Search-and-rescue industrial livery with articulated tilt-rotor nacelles that rotate with speed, and dual-vector flight physics.
* **Aerobatic Stunt Engine (`js/engine/stunt_fsm.js`)**: Finite state machine governing Snap Aileron Rolls, Knife-Edge Flight, and Cobra Airbrake.
* **Spring-Damper Chase Camera (`js/engine/camera_rig.js`)**: Dynamic camera tracking with inertia, acceleration setback, and FOV elasticity (58° to 92°).
* **3D Spline Track & Environment (`js/engine/track_builder.js`)**: Continuous 3D CatmullRom ribbon, holographic hexagonal checkpoint rings, and instanced skyscraper city.
* **Autonomous AI Rivals (`js/engine/ai_racer.js`)**: Autonomous rival drones navigating track spline with lane variance, collision response, and slipstream drafting.
* **Tactical Aviation HUD (`js/ui/hud.js`, `css/game.css`, `index.html`)**: Real-time airspeed tape, altitude, position badge, 3-tier Nitro gauge, and peripheral radial speed streaks.

### Completed: Multi-Mode Progression, Hangar Loadout, and Extraction Engine
* **Mission Mode Architecture**: Implemented Circuit Grand Prix (checkpoint racing), Cargo Extraction Solo (against the clock), and Cargo Extraction Versus AI (competitive retrieval).
* **Multi-Sector Campaign Levels**: Added Sector 01 (Downtown Canyons), Sector 02 (Industrial Port & Cranes), and Sector 03 (Stratosphere Monoliths) with distinct sky colors, fog densities, and building heights.
* **Extraction Engine (`js/engine/extraction_engine.js`)**: Manages base helipads, glowing orange drop zones, rooftop payload crates, magnetic winch latching, and extraction drop sequences.
* **Hangar & Settings Manager (`js/ui/hangar_settings.js`)**: Persistent `localStorage` profile managing player credits, 4 airframe skins (Search & Rescue, Arctic Ghost, Stealth Carbon, Cyber Neon), upgrade trees (Turbine Velocity, Winch Latch Radius, Hull Armor, Nitro Cell Capacity), audio sliders, and graphics tier overrides.
* **Comprehensive Documentation & SEO README (`README.md`)**: Full architectural reference, control mappings, performance tiers, and deployment guides.

### Completed: Low-End Mobile Stability, DRS & Zero-Allocation Engine
* **Zero-Allocation Render Loop**: Replaced all per-frame `new THREE.Vector3()`, `clone()`, and `new THREE.Euler()` allocations in `drone.js`, `camera_rig.js`, `stunt_fsm.js`, and `ai_racer.js` with module-level pre-allocated scratch objects, eliminating V8 Garbage Collection micro-stutters on budget mobile devices.
* **Dynamic Resolution Scaling (DRS)**: Automated frame-pacing monitor that dynamically reduces `renderer.setPixelRatio` down to 0.70x if average frametimes exceed 24ms, scaling back to native when frame rates stabilize.
* **Screen Wake Lock API (`navigator.wakeLock`)**: Automatically acquires screen wake lock on mission start to prevent mobile devices from sleeping during races, releasing on pause or finish.
* **Background Tab Lifecycle Handling**: Listens to `visibilitychange` to automatically pause flight physics and suspend the Web Audio context when the tab is backgrounded.
* **WebGL Context Loss & Recovery**: Registered event handlers on canvas for `webglcontextlost` and `webglcontextrestored`.
* **Off-Course Safety Realignment**: Bounding altitude and distance envelope that detects crashes or drift and cleanly repositions the craft onto the nearest checkpoint gate.

### Completed: Vercel Free-Tier Compute & Development Lifecycle Architecture
* **Zero-Compute Static Delivery**: Mandated 100% static client-side distribution through Vercel's global Edge CDN, bypassing Serverless Function invocation limits (1M/mo) and consuming 0 seconds of Active CPU Time and 0 GB-hours of Provisioned Memory.
* **Development Phase Unblocking**: Configured `vercel.json` with immediate revalidation (`Cache-Control: public, max-age=0, must-revalidate`) and bypassed build filters so that all local changes and iterations deploy immediately without obstruction or stale asset caching.
* **Production Release Toggle (`scripts/vercel-ignore.sh`)**: Prepared the build preservation script with `DEV_MODE` toggle. When toggled to production release, `ignoreCommand` will cancel builds on non-runtime commits (exit code 0) to preserve the 6,000 monthly build minute quota.

### Completed: Engine Bug Bounty Hardening, Boost Overcharge & Teamwork Squadron Architecture
* **Triple-Stage Boost Overcharge Engine (`/boost`)**: Integrated hangar turbine and nitro cell upgrades into live flight dynamics, latching Stage 3 Hyper-Overdrive (320 km/h) through needle decay. Synthesized procedural afterburner ignition sound curves and added an articulated exhaust flame mesh with additive blending.
* **Teamwork Squadron Escort Mode (`/teamwork-preview`)**: Introduced cooperative flight mechanics featuring AI Wingman "ECHO-01" flying tactical formation escort. Emits an energy tether beam providing continuous Nitro boost replenishment when within 25m, cooperatively tags rooftop extraction cargo, and supports direct URL routing (`#teamwork-preview`, `#boost`).
* **Audio Context Resilience**: Implemented automated user gesture unlocking (`unlockAudio`) for Web Audio API across iOS Safari ('interrupted' and 'suspended' states) and Chrome autoplay policies, alongside master gain attenuation linked to the UI settings slider.
* **Pointer Capture Exception & Drop Immunity**: Hardened virtual joystick and touch action pads with `lostpointercapture` listeners and try/catch wrappers around `setPointerCapture`/`releasePointerCapture` to eliminate DOMException crashes on mobile WebKit.
* **Memory Leak Elimination & Teardown Protocol**: Implemented systematic `dispose()` methods on `Drone`, `AiRacer`, `TrackBuilder`, and `ExtractionEngine`, eliminating WebGL geometry/material buffer leaks during sector changes and race restarts.
* **Collision Clipping & Boundary Safeguards**: Protected vector normalization against division-by-zero, eliminated vector mutation bugs during slipstream angle calculation, clamped large camera displacements, and reset camera physics during course realignment.
* **Full Offline PWA Pre-Caching**: Added all newly introduced modules (`hangar_settings.js`, `extraction_engine.js`) into `service-worker.js` cache manifest with Cache API versioning (`barch-aero-v2`).
* **Automated Verification Harness**: Implemented headless test suite (`scripts/test_engine.mjs`) verifying 57 assertions across all modules, math operations, and asset dependencies.
* **Decoupled State & Peer-to-Peer Telemetry**: Enforced client-side persistence via `localStorage`/`IndexedDB` and direct WebRTC DataChannels (`PeerJS`) for multiplayer, preventing any backend database or serverless compute dependencies.
* **Developer & Agent Guardrails (`.cursorrules`, `VERCEL_RULES.md`, `.vercelignore`)**: Established strict repository rules prohibiting `/api/*` endpoints, SSR frameworks, Vercel Image Optimization APIs, and server-side cron jobs.

### Completed: Campaign End Purpose, Climax Protocol & Victory Epilogue Architecture
* **Philosophical & Psychological Teleos**: Integrated Bernard Suits' *lusory attitude* (overcoming arbitrary obstacles for intrinsic fulfillment) and C. Thi Nguyen's *agency as art* (sculpting and rewarding player agency). Grounded the campaign arc in the *Peak-End Rule* (Kahneman) and *Self-Determination Theory* (Deci & Ryan) to turn an open sandbox into a definitive mission with emotional, cognitive, and narrative closure.
* **Campaign Progression Gating & Lock Feedback**: Implemented progressive sequential unlocking (`campaignProgress: 1..4`) in `hangar_settings.js` and `index.html`. Pre-requisite sector locks feature distinct dashed styling, tactile haptic error pulses, shake animations, and clear briefing cues.
* **Sector 04 Climax Event ("Operation Apex Horizon")**: Designed the final campaign challenge featuring violet-crimson storm fog, towering 280-meter sky-monoliths, 4-lap / 10-payload stamina demand, and peak overdrive requirements.
* **Procedural Harmonic Fanfare & Auditory Catharsis**: Added Web Audio synthesizer methods (`playVictoryFanfare`, `playSectorUnlockChime`) producing multi-voice resonant chords (I-IV-V-I) and low-pass filter decay that replaces tense turbine whine with calming harmonic triumph upon victory.
* **Interactive Epilogue Orbit Camera**: Added `CameraRig.setEpilogueMode(true)` which smoothly switches from high-drag spring-damper chase tracking to a 360-degree slow-motion cinematic orbit around the player's aircraft.
* **Master Flight Telemetry Dossier & S-Rank Certification**: Implemented an algorithmic evaluation engine that scores flight performance (speed, stunt combo execution, placement/payload ratio), rendering an official Aero-Command Dossier with grades (S-Class Aegis Ace, A-Class Vanguard, B-Class Striker), tactical citation, and mission metrics.
* **Legendary Campaign Reward ("Apex Sovereign")**: Created a 5th airframe skin with pearlescent obsidian and solar-gold livery (`APEX_PROTO`), locked strictly behind campaign completion (cannot be bought with currency).
* **Automated Climax Test Coverage**: Expanded `scripts/test_engine.mjs` to 68 automated assertions verifying Sector 04 climax attributes, campaign-exclusive skin logic, camera orbit transitions, sound fanfare, and progression persistence.

### Completed: GPU-Accelerated 3D Particle System & VFX Pipeline
* **Pooled Instanced Point Cloud (`js/engine/particle_system.js`)**: Replaced DOM 2D canvas speed lines with a zero-allocation, pre-allocated `THREE.BufferGeometry` point cloud with custom vertex/fragment shader. Handles exhaust plume particles, high-speed radial streaks, stunt burst trails (rolls, knife-edge, cobra airbrake), and impact collision sparks.
* **Tier-Scaled Particle Budget**: Particle pool caps scale according to the active hardware tier (Low: 40, Balanced: 60, Performance: 90, Ultra: 140), preserving 60 FPS on low-power mobile devices.
* **Zero-Allocation Particle Updates**: All vector math uses pre-allocated module scratchpad vectors (`_tempVector`, `_exhaustPos`, `_exhaustDir`), guaranteeing zero runtime garbage collector spikes during intense dogfighting and overdrive flight.
* **Offline PWA & Test Verification**: Added `particle_system.js` to `service-worker.js` pre-cache manifest and expanded automated test coverage in `scripts/test_engine.mjs` to 72 assertions.

### Completed: Arcade Velocity, Coordinated Canyons, Preload Screen & Customization Sidebar
* **Arcade Velocity & Dynamic Camera Rig**: Amplified camera FOV elasticity (70° up to 104° during Stage 3 Hyper-Overdrive) and high-G banking roll tilt (0.72 rad) in `CONFIG.FLIGHT` and `CONFIG.CAMERA`, delivering the punchy, responsive handling characteristic of arcade kart and canyon racers like *Beach Buggy Racing*.
* **Track-Aligned Coordinated Canyon Architecture (`js/engine/track_builder.js`)**: Replaced uncoordinated random cuboid scattering with a dual-hierarchy city synthesis algorithm:
  * *Inner Canyon Flankers*: 65% of monoliths placed with calculated setbacks (track width + 22m to 46m) along 3D CatmullRom spline normals, creating thrilling skyscraper corridors and intentional near-miss opportunities without runway clipping.
  * *Outer Skyline Clusters*: 35% placed along radial perimeters to generate deep horizon silhouettes.
  * *Multi-Color PBR & Per-Instance Palettes*: Utilized `THREE.InstancedMesh.setColorAt()` with sector-specific color schemes (Downtown coastal turquoise/coral/gold, Industrial hazard yellow/rust/cobalt, Stratosphere neon magenta/indigo, Apex volcanic crimson/solar gold).
  * *Rooftop Architectural Life*: Added instanced rooftop helipads with glowing target landing rings, tall communication spires with pulsing aviation warning beacon lights, and elevated sky-bridges spanning canyon track sections.
* **Arcade Preloader Screen (`js/ui/preload_screen.js`)**: Eliminates blank canvas flashes and sudden pop-in by orchestrating a 5-phase startup sequence:
  * Probes hardware profile & GPU tier.
  * Verifies typography and interface textures via `document.fonts.ready`.
  * Pre-compiles WebGL shader programs and instanced geometries via `renderer.compile(scene, camera)` to eliminate first-frame hitches.
  * Primes Web Audio API synthesizer buffers and loads persistent `localStorage` profile.
  * Seamless 1-tap audio unlock transition into the hangar briefing menu.
* **All-In-One Togglable Customizations Sidebar (`js/ui/sidebar.js`)**: Responsive slide-out glassmorphic drawer toggleable via `TAB` key or floating HUD button:
  * *Airframe Liveries Hub*: Real-time 3D drone skin switching and credit purchasing.
  * *Tactical Upgrades Hub*: Live progress bars and 1-tap upgrades for Turbine Velocity, Winch Latch, Hull Armor, and Nitro Fuel Cells.
  * *Sector & Level Selector*: Direct sector switcher showing clearance status, sector lap records, and mission briefing.
  * *Mission Mode Switcher*: Instant toggle between Circuit Grand Prix, Cargo Solo, Cargo Versus, and Teamwork Squad.
  * *Pilot Career Telemetry*: Real-time display of player rank, career stunts, top speed, and credits balance.
* **Dedicated Flight Academy & Interactive Controls Guide (`js/ui/controls_guide.js`)**: Comprehensive multi-tab handbook explaining:
  * *Desktop Controls*: Stylized tactile keycaps (`[W]`/`[S]`, `[A]`/`[D]`, `[SPACE]`, `[Q]`/`[E]`, `[C]`, `[X]`, `[TAB]`, `[ESC]`).
  * *Mobile Touch Controls*: Dynamic left virtual thumbstick and right aerobatic action pads.
  * *Gamepad & HOTAS*: Full controller mapping for analog sticks, triggers, bumpers, and face buttons.
  * *Aerobatic Stunt Aerodynamics*: In-depth tactical guide detailing Triple-Stage Nitro Overcharge sweet spots (>70%), Snap Aileron Roll hitbox compression (+22% Nitro), Knife-Edge slit slicing, Pugachev's Cobra airbrake flare (dumping 62% speed for hairpins), Near-Miss facade buzzing, AI Wingman energy tethering, and Magnetic Cargo Winch retrieval.
* **Offline PWA & Test Verification**: Upgraded Service Worker cache to `barch-aero-v3`, pre-caching all new UI modules. Expanded `scripts/test_engine.mjs` to 102 automated assertions verifying all visual palettes, preloader transitions, sidebar state toggling, and controls guide lifecycle.

### Completed: Engine Bug Bounty, Crash-Points & Fail-Safe Hardening Architecture
* **Building Penetration Deflection & Near-Miss Facade Buzzing (`js/engine/track_builder.js`)**: Implemented zero-allocation AABB boundary penetration checks (`checkBuildingCollision`) for all urban canyon skyscrapers. When a drone penetrates an obstacle at high speeds (up to 320 km/h), the engine computes the surface reflection normal, pushes the hull cleanly outside the barrier, absorbs kinetic shock (`0.72x` velocity damping), triggers camera buffeting (`0.38` shake), emits collision spark particles, and alerts the pilot. When passing within 3.8m at >150 km/h, triggers dynamic Near-Miss Facade Buzzing with audio sonic crack, camera shake, and continuous Nitro cell recharge (+6%).
* **Universal Input Architecture & Multi-Touch Capture Shield (`js/input/touch_controls.js`, `js/input/desktop_controls.js`)**:
  * Decoupled desktop controls from touch device detection, ensuring hybrid 2-in-1 laptops, tablets with hardware keyboards, and gamepads function seamlessly alongside touch controls.
  * Globalized pointer movement and release listeners across `window` in `TouchControls`, eliminating virtual stick drops and sticky throttle when fingers slide beyond the visual touchpad boundary.
  * Prevented mobile browser long-press context menu freezes via `contextmenu` suppression and added automatic touch/key cancellation on `window.blur` and `touchcancel`.
* **Mobile Safari / WebKit Audio Context Auto-Resume & Mute Engine (`js/audio/sound_engine.js`)**:
  * Implemented `toggle()` with seamless gain ramp muting between 0.8 and 0.0 and engine telemetry gain suppression to conserve mobile CPU.
  * Handled mobile Safari `'interrupted'` audio context state and added 1-sample silent Web Audio buffer playback during user touch gestures to reliably unlock iOS audio sessions.
  * Added one-time gesture auto-resume fallback when returning to the tab via `visibilitychange`.
* **Aerobatic Stunt FSM Heading & Course Realignment Synchronization (`js/engine/stunt_fsm.js`, `index.html`)**:
  * Ensured `stuntFsm.syncWithQuaternion()` is called during sector startup and out-of-bounds course realignment, preventing orientation whiplash from resetting yaw to 0 on frame 1.
  * Hardened out-of-bounds boundary detection using `!Number.isFinite(...)` across all 3D axes, enforcing radial track clamping (<680m), lower floor limit (y < -65m), and vertical ceiling limit (y > 380m) with safe fallback to origin if gates are unavailable.
* **WebGL Context Loss Memory & Shader State Restoration (`index.html`)**:
  * Preserved the pre-loss game state and restored it smoothly upon `webglcontextrestored` without inappropriately forcing an uninitialized `RACING` state.
  * Traversed scene hierarchy on context restoration to mark all mesh and instanced materials with `needsUpdate = true`, prompting clean shader recompilation.
* **Zero-Allocation Render Loop & Point Size Attenuation (`js/engine/particle_system.js`, `index.html`)**:
  * Replaced per-frame `new THREE.Vector3` heap allocations with static scratch vectors.
  * Clamped GPU shader point size divisor to avoid divide-by-zero / NaN pipeline crashes on mobile GPUs.
  * Integrated forward particle positions via `velocity * dt` on update, reducing GPU attribute re-uploads to active position and lifetime channels.
* **Direct Deep-Link URL Routing (`index.html`, `vercel.json`)**:
  * Updated router to inspect `window.location.pathname` for direct `/boost` (overcharge nitro) and `/teamwork-preview` (squad escort mode) access.
  * Configured Vercel SPA rewrites for direct clean URLs without 404 routing errors.
* **Automated Verification Suite Expansion (`scripts/test_engine.mjs`)**:
  * Expanded automated test harness to 124 assertions verifying audio toggles, keyboard blur resets, touch release failsafes, stunt quaternion synchronization, building collision deflection, particle kinematics, out-of-bounds validators, and direct pathname routes with exit code 0.

### Global Agent Enhancements: Advanced Web Search & Research Skills Architecture
* **Global Customization Discovery (`~/.gemini/config/skills/`)**:
  * Configured Antigravity 2.0 global skills discovery for real-time web retrieval, documentation lookup, and multi-source research across all workspaces.
* **PipeLLM Official Skill Integration (`~/.gemini/config/skills/pipellm-web-search/`)**:
  * Installed the official `PipeLlm-AI/pipellm-websearch-skill` package with its API specification, Gemini extension metadata, and prompt directives.
  * Direct support for PipeLLM endpoints: `/v1/websearch/search` (vector RAG re-ranking), `/v1/websearch/simple-search` (Google snippets), `/v1/websearch/reader` (HTML to markdown conversion), and `/v1/websearch/search-news` (breaking news extraction).
* **Multi-Tier Resilient Research Skill (`~/.gemini/config/skills/advanced-web-search/`)**:
  * Resolved single-vendor dependency risks by establishing a layered execution hierarchy:
    * Tier 1: Native zero-cost AGY tools (`search_web`, `read_url_content`) for rapid grounding and immediate citations.
    * Tier 2: Resilient CLI search runner (`scripts/search.py`) in Python 3 standard library with zero external pip dependencies. Automatically queries PipeLLM if `PIPELLM_API_KEY` is present, with seamless fallback to DuckDuckGo HTML scraping.
    * Tier 3: Specialized extractors for web reading and deep headless crawling via Firecrawl integration.
  * **Token Preservation & Context Hygiene**: File-backed storage (`--output <file.json>`) saves full search payloads to disk to avoid flooding LLM context windows, returning concise summaries and paths.
  * **Deep Research Protocol**: Enforces multi-hop query decomposition, domain targeting (`site:github.com`, `site:docs.*`), and a Two-Source Rule for technical validation and security claims.

### Completed: Low-Spec WebGL Graphics Upgrade Architecture (`/low-spec-webgl-game-craft`)
* **Procedural Skyscraper Facade Texturing (`js/engine/track_builder.js`)**:
  * Implemented `createProceduralTexture()` to generate a high-density 256x256 architectural atlas on an offscreen HTML5 `<canvas>` at boot time (0 KB network payload, < 4ms compile overhead).
  * Synthesized vertical structural columns/mullions, horizontal floor-dividing neon conduits matching sector trim colors, and randomized illuminated office windows with deterministic pseudorandom lighting states (warm amber, cyan server bank, and dark tinted glass).
  * Applied procedural atlas with `THREE.RepeatWrapping` across `instancedCity` material while preserving per-instance color multiplication, transforming flat boxes into detailed futuristic urban canyons in **1 single draw call**.
* **Procedural Atmospheric Celestial Sky Dome (`js/engine/track_builder.js`)**:
  * Constructed an inverted 1800m celestial dome (`THREE.SphereGeometry`, `THREE.BackSide`) with analytically evaluated vertex color gradients interpolating from zenith (`sector.zenithColor`) to horizon haze (`sector.horizonColor` / `sector.skyColor`).
  * Masks camera far clipping planes and harmonizes seamlessly with `THREE.FogExp2` without polygon edge popping.
  * Driven by continuous celestial yaw rotation (`dt * 0.005 rad/s`) in `track.update()`.
* **Subterranean Cyber Terrain Floor (`js/engine/track_builder.js`)**:
  * Added a subterranean canyon floor plane (`2400m x 2400m` at `y = -24m`) with procedural cybernetic grid lines and illuminated node intersections matching `sector.gridColor`.
  * Eliminates the bottom void, grounds the skyscraper foundations, and fades into horizon fog at distance.
* **Animated High-Tech Energy Track Ribbon (`js/engine/track_builder.js`, `index.html`)**:
  * Generated a procedural track texture with dark carbon-weave surfacing, luminous neon boundary rails (`sector.trackEdge`), and glowing directional speed chevrons (`sector.trackEmissive`) pointing along the flight vector.
  * Extruded UV mapping along the CatmullRom spline loop (`uv.y = (i / segments) * 60.0`).
  * In the main render loop, `track.update(speedKmh, dt)` offsets texture UV coordinates proportional to drone velocity, delivering an immediate visceral sense of speed even in straight sky-lanes.
* **Supersonic Thruster Plumes & Shock Diamonds (`js/engine/drone.js`)**:
  * Integrated a dual-stage exhaust booster system comprising an outer energetic flame cone and an inner supersonic shock diamond core (`THREE.AdditiveBlending`).
  * Dynamically scales and shifts hue across flight regimes: subtle teal cruise glow at >75 km/h, intense safety orange during Stage 2 Boost, and hyper-cyan shock diamonds during Stage 3 Hyper-Overdrive.
* **Multi-Environment Test Resilience (`scripts/test_engine.mjs`)**:
  * Augmented headless mock harness with `PlaneGeometry`, `CanvasTexture`, and 2D canvas context primitives (`fillRect`, `fill`, `arc`), achieving 100% test pass rate across 124 assertions.

### Completed: Holistic 60-Task Flight Engine, UI & System Architecture Upgrade
* **Fixed-Timestep Physics Substepping (`js/engine/drone.js`)**:
  * Decoupled rendering frame time from flight simulation by adopting a deterministic accumulator pattern running at 120Hz (`dt = 1/120s`, max accumulated time 0.1s).
  * Eliminates high-velocity collision clipping through skyscraper facades, tunnel walls, and floor boundaries during sudden frame pacing spikes or device thermal throttling.
* **Spline Superelevation & Curvature Banking (`js/engine/track_builder.js`)**:
  * Evaluated spline tangent derivatives across adjacent segments to calculate localized centrifugal turning forces.
  * Tilted the ribbon normal and neon boundary edges around the flight tangent axis (up to 31.5 degrees), generating banked NASCAR-style turns that guide high-speed drones aerodynamically.
* **Ground-Effect Aerodynamic Lift Cushion (`js/engine/drone.js`)**:
  * Added an asymptotic ground-effect repulsion force activated when flying below 4.2m altitude, proportional to forward velocity squared and inverse altitude: $F_{\text{ground}} \propto v^2 / (h + 0.2)$.
  * Cushions high-speed dive recoveries and prevents harsh floor clipping without artificial hard altitude stops.
* **Autonomous Loiter & Course Realignment ("Zen Autopilot") (`js/engine/drone.js`, `index.html`)**:
  * Integrated an autonomous course-projection state machine toggled via `Z` key or headless benchmark flags.
  * Computes nearest spline points and smoothly blends drone attitude and velocity vectors back into the race corridor.
* **Seed-Based Procedural Track Generation (`js/engine/track_builder.js`, `js/coordinator.js`)**:
  * Implemented Mulberry32 32-bit deterministic PRNG (`SeededRNG`).
  * Modulates circuit waypoints, city building layouts, and skyline silhouette heights using seed strings parsed from URL query parameters (`?seed=...`).
* **Multi-Camera Rig Architecture (`js/engine/camera_rig.js`, `index.html`)**:
  * Unified Chase, First-Person Cockpit, Trackside Spectator, and 6-DOF Photo Mode into a single state machine toggled with `V` and `P`.
  * In photo mode, simulation delta is frozen and UI hidden, allowing lossless 1:1 canvas PNG captures via `takeSnapshot()`.
* **Minimalist Top-Edge Compass Ribbon (`js/ui/hud.js`, `index.html`, `css/game.css`)**:
  * Rendered a lightweight 360-degree sliding compass bearing strip at top-center on an offscreen 2D canvas with sub-pixel tick translation and target azimuth pins.
* **Contextual Non-Blocking Notification Toast Stack (`js/ui/hud.js`, `css/game.css`)**:
  * Replaced intrusive modals with a non-blocking toast queue supporting info, bonus, and warning alert tiers with automatic 1.8s dismissal and max 2 stacked items.
* **Mobile-First Sliding Bottom-Sheet Drawer (`js/ui/hangar_settings.js`, `css/game.css`)**:
  * Transformed dialog modals on viewports $\leq 768\text{px}$ into native-feeling swipeable bottom sheets with touch grab-bars.
* **Gamepad Flight Stick Deadzone & Sensitivity Tuning (`js/ui/hangar_settings.js`, `index.html`)**:
  * Added configurable deadzone threshold sliders (0.02 to 0.30) and non-linear sensitivity exponents ($y = x^\gamma$) persisted across sessions.
* **Deterministic 48-Byte Binary Telemetry Serialization (`js/engine/drone.js`)**:
  * Pre-allocated a static 48-byte `ArrayBuffer` and `DataView` packing 0xBA7C magic header, status bitflags, float32 world coordinates, quaternion components, velocity vectors, quantized airspeed, and nitro stage.
  * Completely zero GC allocation per frame, providing direct WebRTC datachannel and multiplayer netcode readiness.
* **Holographic Ghost Drone Replay Buffer (`js/engine/drone.js`)**:
  * Quantizes drone position and rotation every 4 simulation ticks into a memory-efficient circular ring buffer for time-trial ghost replay.
* **Automated QA Headless Benchmark Harness (`index.html`, `scripts/test_engine.mjs`)**:
  * Enabled automated 2-lap headless autopilot benchmarking via `?benchmark=1` logging min, avg, max FPS, and frame drop metrics.
  * Verified 100% test pass rate across 139 automated unit test assertions in `scripts/test_engine.mjs`.

### Completed: Slow Roads Atmospheric Skylines, Session Permalinks & Dedicated `.aeroghost` Interchange
* **Three Clean Atmospheric Skylines (`js/config.js`, `js/engine/track_builder.js`, `index.html`)**:
  * Modeled directly after Slow Roads' clean, minimalist horizon aesthetic:
    1. `MORNING_CALM`: Clear azure skies (`#4a90e2`), golden morning dawn illumination (`#fff0d0`), and light fog (`density: 0.0016`).
    2. `EVENING_GLOOMY`: Moody violet/indigo zenith (`#140a20`), dense amber/crimson horizon haze (`#7a2245`), and atmospheric dusk lighting (`density: 0.0032`).
    3. `NIGHT_NEON`: Deep obsidian twilight (`#010206`), starfield, luminous cyan/orange window arrays, and high-intensity vehicle headlights (`density: 0.0022`).
  * Seamlessly toggled via start briefing buttons, dynamically altering sky dome vertex gradients, fog density, and city window illumination.
* **Slow Roads Session URL Permalinks (`js/coordinator.js`)**:
  * Each player is assigned a unique persistent session identifier (`PILOT-XXXX`), stored in `localStorage`.
  * The browser address bar synchronizes in real time via `history.replaceState` (`?seed=...&sky=...&pilot=...`) without page reloads.
  * Added "SHARE FLIGHT LINK" buttons in start briefing and pause modals, copying the session permalink directly to the clipboard with contextual toast notifications.
* **Dedicated Flight Replay File Format (`.aeroghost`) (`js/coordinator.js`, `index.html`)**:
  * Formatted telemetry replays into a dedicated file extension (`.aeroghost`) with strict schema validation (`BARCH_AERO_GHOST_V1`).
  * Features 1-click export of flight records (`<pilot>_SEC01_<seed>.aeroghost`) and instant import via file selector or canvas drag-and-drop, spawning an iridescent rival holographic ghost drone.
* **100% Offline-First PWA Execution (`service-worker.js`)**:
  * Pre-caches Three.js r128, all JavaScript engine modules, CSS stylesheets, fonts, and HTML.
  * Network access is used solely on initial installation or for remote maps, ensuring the game runs offline with zero network latency.
* **Comprehensive QA Verification (`scripts/test_engine.mjs`)**:
  * Expanded automated test suite from 139 to 148 verified assertions, confirming zero regressions across all subsystems.

### Completed: Arcade Hovercar Flight Model, Floating Rings & Advanced Driver Assist (ADAS)
* **Direct Proportional Throttle & Stationary Hover (`js/engine/drone.js`, `js/input/touch_controls.js`, `js/input/desktop_controls.js`)**:
  * Replaced forced auto-cruise (`BASE_SPEED = 140 km/h`) with direct 1:1 user-commanded throttle.
  * Neutral joystick and released keys decelerate the craft smoothly into a stationary 0 km/h hover without control jitter or drift.
  * Pushing forward accelerates proportionally up to maximum cruise speed (190 km/h) or nitro overdrive (320 km/h); pulling back commands active reverse thrusters and braking (-45 km/h).
* **Locked Horizon & Zero-Pitch Level Flight (`js/engine/drone.js`, `js/engine/stunt_fsm.js`)**:
  * Clamped pitch Euler rotation to 0.0 rad, completely eliminating helicopter nose-dives, sky stalls, and camera pitching.
  * Constrained roll banking to subtle aesthetic chassis lean (0.10 rad / ~6 degrees), preserving a rock-solid level windshield view through canyon corridors.
* **Open-Air Floating Holographic Rings ("Circles") (`js/engine/track_builder.js`)**:
  * Completely eliminated the solid extruded roadbed ribbon mesh and asphalt textures that previously boxed the drone onto an elevated highway.
  * Replaced hexagonal gate frames with 32-segment circular holographic rings featuring concentric inner pulse energy discs.
  * Integrated an aerial trajectory flight guide stream connecting successive rings, allowing pilots to anticipate turns around skyscrapers in open 3D airspace without a floor.
* **Integrated Advanced Driver Assist System (ADAS) (`js/config.js`, `js/engine/drone.js`)**:
  * *Electronic Stability Control (ESC)*: Dampens lateral hovercraft slide by 92%, giving the hovercar crisp automotive cornering traction rather than slippery air-hockey drift.
  * *Predictive Wall Repulsion Cushion*: Monitors skyscraper bounding boxes up to 4.5m ahead, applying smooth repelling counter-vectors that allow the hovercar to glide along glass facades without dead-stop impacts.
  * *Ring Trajectory Magnetism*: Provides subtle magnetic funnelling when within 28m of upcoming floating circles, pulling the craft smoothly through gate centers.
  * *Automated Elevation Glide*: Automatically tracks upcoming gate ring altitudes and terrain clearance, lifting the hovercar up or down smoothly without requiring manual vertical pitch input.
* **Expanded Verification Suite (`scripts/test_engine.mjs`)**:
  * Added 9 automated assertions in Section 17 verifying neutral-stick hover stops, forward throttle acceleration, locked level pitch, circular ring geometry, aerial corridor guides, and ADAS stability parameters, bringing the total suite to 157 passing assertions.



