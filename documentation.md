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

### Completed: Flight Kinematics Suite, LA Cyberpunk UI & All-in-One Customization Sidebar

* **Zero-Allocation Autonomous Co-Pilot / Autopilot Engine (`js/engine/autopilot.js`, `index.html`)**:
  * Added `Autopilot` autonomous navigation class operating with static pre-allocated vectors (`_toTarget`, `_localTarget`, `_invQuat`, `_avoidVec`) to guarantee zero GC stutter at 60–120 FPS.
  * Navigates the spline track by looking ahead 38m along the spline or toward the upcoming floating holographic gate ring.
  * Computes yaw steering setpoints and proportional pitch elevation alignment with dampening.
  * Dynamically scans nearby skyscraper AABBs to bias the steering vector away from architectural obstacles.
  * Seamless Hands-on Pilot Override: Yields control immediately when the player provides manual steering (`Math.abs(steerYaw) > 0.35`), pitch (`Math.abs(pitch) > 0.4`), or airbrake (`forward < -0.2`), resuming autonomous navigation smoothly 0.8s after pilot hands leave the controls.
  * Hotkeys: `O` or `U` toggle Autopilot; status reflected on `#btn-hud-auto` and mobile `#btn-touch-auto`.

* **Fixed Altitude Hold & Elevation Stepping (`js/engine/drone.js`, `js/input/input_manager.js`, `index.html`)**:
  * Implemented PD altitude tracking controller in `Drone.stepPhysics`: computes error between `position.y` and `targetAltitude`, applying clamped vertical velocity with fallback exponential damping (`AUTO_ELEVATION_RATE = 6.0`).
  * Captures current elevation automatically upon engagement if no target is specified.
  * Incremental stepping hotkeys: `T` or `[` increases target altitude by +5m; `G` or `]` decreases target altitude by -5m.
  * Dedicated HUD step controls: `#btn-hud-alt-down` (-5m), `#btn-hud-alt` (toggle), and `#btn-hud-alt-up` (+5m).
  * Hotkey: `H` toggles altitude hold; status dynamically rendered on HUD and touch controls.

* **VTOL Emergency Hover Stop Airbrake (`js/engine/drone.js`, `js/input/input_manager.js`, `index.html`)**:
  * High-drag emergency deceleration protocol dumping forward momentum rapidly (`DECEL_RATE = 42.0 m/s^2`) down to an absolute 0 km/h stationary hover.
  * Dynamically articulates VTOL nacelles to 90 degrees vertical hover pitch and extends landing skids.
  * Station-keeping damping locks 3D velocity (`velocity.multiplyScalar(0.05)`).
  * Automatically disengages autopilot for safety upon activation.
  * Automatic throttle release: Applying forward or reverse thrust (`|forward| > 0.15`) instantly cancels hover stop and returns craft to manual flight.
  * Hotkey: `B` toggles Hover Stop; touch button `#btn-touch-stop` provides instant haptic-vibrating airbrake.

* **Flyer Assist Auto-Leveling & Proximity Deflection (`js/engine/stunt_fsm.js`, `js/engine/drone.js`)**:
  * Active stability control damping roll and pitch excursions back to wings-level (`roll = 0.0, pitch = 0.0`) when manual controls are neutral.
  * Soft facade proximity cushion: four raycast deflection vectors repel the airframe gently when skimming skyscraper walls without velocity loss.
  * Hotkey: `J` toggles Fly Assist; status synced on `#btn-hud-assist` and `#btn-touch-assist`.

* **"LA Cyberpunk Meets Slow Roads" Aesthetic & Unified Flight Deck (`css/game.css`, `index.html`)**:
  * Redesigned visual palette with calm, authentic neo-noir tokens: Dusky Obsidian (`#070a10`), Tungsten Amber (`#f59e0b`), Marine Cyan (`#06b6d4`), and Muted Smog Lavender (`#64748b`).
  * Eliminated the separate disruptive preloader modal (`#preload-screen { display: none !important; }`), integrating calibration progress into the live-rendered 3D flight deck.
  * Replaced text-heavy mobile buttons with sleek, minimalist SVG vector icons (pure vector lines, zero emojis, zero sparkles icons).
  * Glassmorphism avionics briefing card displaying active flight assist hotkeys and protocols directly within the launch deck.
  * Non-blocking contextual toast stack (`#hud-toast-stack`) for alert pacing.

* **All-in-One Customizations & Avionics Sidebar Drawer (`js/ui/sidebar.js`, `css/game.css`, `index.html`)**:
  * Centralized drawer hub (`#customization-sidebar`) toggled via `TAB` key or the top HUD menu button (`#btn-toggle-sidebar`), backed by a blurred backdrop (`#sidebar-backdrop`).
  * 6-tab navigation layout:
    1. `MANUAL`: Full flight operation manual, explaining Autopilot hand-off, altitude hold stepping, VTOL stop, flight assist, and stunts.
    2. `SETTINGS`: Graphics profiles (Auto/Tier 1/Tier 2/Tier 3), Slow Roads atmospheric skylines (`EVENING_GLOOMY`, `MORNING_CALM`, `NIGHT_NEON`), master volume, pitch invert, haptic vibration, and default assist toggles.
    3. `HANGAR`: Grid of airframe skins with preview color swatches, cost badges, and equipping logic.
    4. `UPGRADES`: Visual progress meters and upgrade purchasing for thrusters, nitro capacity, shields, and magnetic winch.
    5. `SECTORS`: Campaign progression selector with status badges (Ready, Cleared, Climax, Locked).
    6. `MODES`: Circuit Grand Prix, Cargo Solo, Cargo Versus AI, and Teamwork Squad selection.

* **Automated Verification Harness Expansion (`scripts/test_engine.mjs`)**:
  * Added Section 18 covering Autopilot instantiation, override timer, input manager assist flags, altitude hold toggling, target altitude stepping (+5m/-10m), emergency hover stop engagement and safety release, hands-on manual steering override, and CustomizationSidebar tab switching across all 6 panels.
  * Total passing assertions expanded to **176/176** verified tests.

### Completed: Open-World Scale Calibration, Sci-Fi Variable-Geometry Airframe & Holographic Guidance Ribbon

* **Wide Open-World Spatial Scaling (`js/config.js`, `js/engine/track_builder.js`, `index.html`)**:
  * Scaled the 3D spline loop 3x across the XZ plane (spanning ~1800m+ across the terrain) while expanding canyon floor dimensions to 8000x8000m and sky dome radius to 5000m.
  * Increased building spread outward (2200m–3800m across sectors) and halved monolithic heights, transforming dense canyon corridors into distant horizon silhouettes and expansive sky space.
  * Increased corridor setback to 80m, freeing the hovercar from tight claustrophobic walls into high-altitude open airways.
  * Scaled down visual airframe mesh to 0.45x, reinforcing the sensation of a nimble craft traversing a massive landscape.
  * Expanded camera base distance (10.0m), height (3.2m), and field-of-view (75.0 deg) with relaxed spring stiffness (5.5) for a serene, floating chase camera.

* **Progressive Non-Linear Throttle & Spline Adaptive Curvature (`js/engine/drone.js`, `js/config.js`)**:
  * Adopted an exponential throttle response curve ($y = x^{1.7}$) delivering gentle low-speed fine maneuvering with an organic build-up of thrust as throttle is committed.
  * Reduced maximum cruise ceiling to 95 km/h with measured acceleration (42.0 m/s^2), eliminating instant lunging in favor of a grounded hovercar feel.
  * Added ADAS Spline Lane-Assist: calculates the nearest spline waypoint and applies gentle horizontal lateral centering force within 60m radius without overriding player intent.
  * Dynamic Track Curvature Alignment: blends a subtle fraction of the track tangent into the heading vector during curves, allowing turns to glide naturally with the landscape.

* **Variable-Geometry Sci-Fi Jet Airframe Transformation (`js/engine/drone.js`)**:
  * Engineered a multi-stage articulated aerodynamic morphing system dynamically responding to steering input with exponential filter damping (`dt * 5.2`):
    1. *Fuselage & Canopy Aero-Twist*: Fore-body bows smoothly into the turn apex with subtle organic yaw flex.
    2. *Swept Main Wings Differential Camber*: Main wings rotate in yaw and roll, with the inner wing sweeping rearward while the outer wing flexes upward for aerodynamic roll assistance.
    3. *Articulated Forward Canards*: Dual forward aero-flaps mounted on the forward fuselage pitch differentially to simulate active vortex lift generation into turns.
    4. *Thrust Vectoring Tilt-Nacelles*: Wingtip nacelles vector thrust differentially in pitch and roll to actively pivot the craft through curves.
    5. *Twin Tail Fins Dynamic Rudder Cant*: Dual angled tail fins articulate their cant angle and rudder yaw deflection sympathetically.

* **Sleek Translucent Holographic Track Ribbon (`js/engine/track_builder.js`)**:
  * Restored a lightweight, semi-transparent holographic light ribbon (`opacity: 0.16`, `side: DoubleSide`, `depthWrite: false`) spanning the 240-segment spline path beneath the hovering craft.
  * Sits directly underneath the floating circular gates to provide essential visual continuity and speed reference, preventing the craft from appearing detached from the racing circuit.
  * Framed by glowing neon edge boundary lines (`opacity: 0.48`, linewidth 2) defining the flight corridor with minimalist elegance.

---

### Completed: Visual Bug Remediation & Rendering Pipeline Stabilization

* **Frustum & Atmospheric Projection Restoration (`index.html`, `js/engine/track_builder.js`)**:
  * Expanded camera frustum far clip plane from 2200m to 6500m (`new THREE.PerspectiveCamera(..., 0.1, 6500)`), ensuring the 5000m radius Sky Dome and 4000m distant skyline silhouette rings are fully enclosed within the render volume without depth culling.
  * Updated `createSkyDome` vertex color gradient normalization from `(posAttr.getY(i) + 400) / 2200` to `(posAttr.getY(i) + 500) / 5200` to deliver a continuous, smooth horizon-to-zenith color gradient across the entire dome.
  * Adjusted launch pad platform geometry height (`position.y = startPoint.y - 1.98`, ring at `-1.16`, decal at `-1.15`), seating the launch structure flush beneath the holographic track ribbon to eliminate geometric intersection and Z-fighting.

* **PBR Surface Normals & Kinematic Hierarchy Integrity (`js/engine/drone.js`)**:
  * Inverted index winding order and computed true vertex normals (`mirrorGeometryWithCorrectNormals`) for left-wing and left-canard mirrored geometries, resolving inward-pointing normal artifacts, dark face shading, and broken shadow occlusion.
  * Re-parented wingtip tilt-rotor nacelles under the main wings (`wingR.add(nacGroupR)`, `wingL.add(nacGroupL)`) so nacelles stay physically locked to the airframe tips during dynamic variable-geometry wing flexing.
  * Mirrored roll and yaw signs for the left wing and canard (`wingL.rotation.z = morph * 0.11`, `canardL.rotation.z = morph * 0.12`), establishing realistic aerodynamic dihedral symmetry during turns.

* **Cockpit Camera & Particle Frustum Alignment (`js/engine/camera_rig.js`, `js/engine/particle_system.js`)**:
  * Relocated first-person Cockpit camera forward of the canopy structure (`(0, 0.45, 1.85)`) and toggled canopy mesh visibility (`canopy.visible = false` in cockpit mode, `true` otherwise), preventing near-plane clipping through opaque cockpit geometry.
  * Redesigned `emitSpeedStreak` particle emission to spawn particles ahead of the camera inside the active view frustum (`cameraPosition + forward * (18..42m)`) with inward relative velocity (`-speed * 0.45`), producing forward-streaming atmospheric streaks across the screen.

* **HUD Telemetry Orientation & Responsive UI Layout (`js/ui/hud.js`, `css/game.css`, `index.html`)**:
  * Synchronized the 2D compass ribbon and peripheral horizon ladder by extracting yaw, pitch, and roll from `drone.group.quaternion` using `THREE.Euler(..., 'YXZ')`, resolving permanently static 0-degree telemetry readouts.
  * Added dynamic canvas buffer resizing (`width = 180, height = 24` on `<= 768px`) to match responsive CSS styling, eliminating GPU bilinear stretching and blurry tick marks on mobile.
  * Relocated `.toast-stack-container` to `calc(env(safe-area-inset-top, 14px) + 104px)`, preventing notification toasts from obscuring the tactical flight assist control bar.
  * Removed duplicate obsolete 4-tab sidebar from `index.html` and renamed start-modal ticker IDs to prevent DOM ID collisions.

---

### Completed: Full Redesign — Stratosphere Sky-Dive & Ascension Racing Circuit (Sessions 1–4)

* **Session 1: Sound Nuking, Stratosphere Staging Grid & Attack Drone Airframe**:
  * **Complete Audio Neutralization (`js/audio/sound_engine.js`)**: All Web Audio gain nodes and synthesizing routines permanently clamped to 0.0 volume and bypassed to provide pristine silence per user directive, while preserving all method signatures to maintain 100% test suite compatibility.
  * **Stratosphere Staging Grid (`js/engine/track_builder.js`, `js/config.js`)**: Elevated starting grid to the stratosphere ($y = 750\text{m}$). Built 4 floating hexagonal cantilever launch slabs spaced side-by-side (`[-24, -8, 8, 24]` meters offset) with color-coded portal rings (Amber, Cyan, Magenta, Emerald) and glowing runway boundary rings.
  * **Aggressive Attack Combat Drone (`js/engine/drone.js`)**: Replaced standard hovercraft hull with a razor-sharp supersonic combat airframe featuring a needle nose cone, forward-swept delta wings, articulated canards, and dual glowing plasma exhaust ports. Preserved VTOL Search-and-Rescue mode as an alternate loiter roleplay airframe.
  * **Stationary Staging Hover & Revving (`js/engine/drone.js`, `js/engine/ai_racer.js`)**: Drones sit stationary on their respective platforms prior to race start. Added subtle sine bobbing ($0.16\text{m}$) and interactive pitch tilt / revving tachometer readout when pilot presses forward throttle (`W` / `Up Arrow`) before launch.

* **Session 2: Asphalt-Style 360° Cinematic Sequence & Assisted Deep Dive Funnel**:
  * **Asphalt Orbital Intro Camera Sequence (`js/engine/camera_rig.js`)**: Constructed a 4-phase choreographed intro camera sequence during the 3.5s countdown:
    1. *Low-Angle Hero Orbit*: Dramatic low sweep showcasing the player's combat drone.
    2. *Platform Pan*: Lateral camera sweep across rival staging slabs and color-coded portals.
    3. *Plunge Crane Reveal*: Overhead crane tilt peering down the 720m sheer drop to the city.
    4. *Rear Cockpit Lock*: Rapid transition behind the drone aligning directly with the dive funnel.
  * **Assisted Deep Dive Kinematics (`js/engine/drone.js`)**: 7–10s assisted dive funnel descending from $y = 750\text{m} \to y = 28\text{m}$. Passive gravity falls under natural acceleration ($24\text{m/s}^2$, top speed ~180 km/h), while forward throttle engages active thruster acceleration ($44\text{m/s}^2 - 64\text{m/s}^2$, top speed 320+ km/h).
  * **Dynamic FOV Dive Flare & Screen Shake (`js/engine/camera_rig.js`)**: FOV expands smoothly from $65^\circ$ up to $105^\circ$ proportional to dive velocity, paired with Mach speed screenshake and free lateral look/pan ($\pm 45^\circ$) allowing pilots to glance sideways at diving rivals.
  * **Vertical Speed Streaks (`js/engine/particle_system.js`)**: High-speed particle field streaming upward ("reverse rain") during dive descent and streaming downward during vertical climb.
  * **Progressive Altitude Fog Clearing (`index.html`)**: Fog density dissolves smoothly as craft passes below 250m altitude, unveiling the daylight urban canyon circuit.

* **Session 3: AI Rival Dive Kinematics, Post-Dive Straightaway & Building Clearance Envelopes**:
  * **Synchronized Rival AI Dive (`js/engine/ai_racer.js`)**: AI racers staged on platforms 0, 2, and 3 launch simultaneously into the funnel with individualized acceleration curves ($38\text{m/s}^2 - 52\text{m/s}^2$), visibly pulling away from the player if throttle is released.
  * **450m Post-Dive Calibration Straightaway (`js/engine/track_builder.js`)**: Parabolic pullout curve at $y \approx 28\text{m}$ seamlessly transitions into a 450-meter wide, unobstructed straightaway giving pilots immediate orientation before entering chicane turns.
  * **Strict 3D Radial Building Clearance Envelopes (`js/engine/track_builder.js`)**: Completely eliminated building-path collisions by enforcing 3D clearance testing against all spline samples with altitude-adjusted setbacks ($160\text{m}+$ along high drops) and outer perimeter fallback placement (`spread * 0.75 + 400`).
  * **Matte Pastel Daylight Aesthetics (`js/engine/track_builder.js`, `js/config.js`)**: Transformed building shaders into solid matte terracotta, soft sage, muted cobalt, and warm clay materials (`roughness: 0.82, metalness: 0.12`), reflecting the clean daylight aesthetic of *Slow Roads*.

* **Session 4: Vertical Sky-Ramp Ascension Sprint & Minimalist Zen UI**:
  * **90° Vertical Sky-Ramp Ascension Sprint (`js/engine/track_builder.js`, `js/engine/drone.js`)**: At spline terminus ($t \ge 0.83$), the circuit curves vertically upward from $y = 28\text{m} \to y = 750\text{m}$. Drone engages full-afterburner rocket climb, burning accumulated nitro reserves to reach Mach velocities (>300 km/h) up into the stratosphere.
  * **Grand Champion Stratosphere Finish Portal (`js/engine/track_builder.js`, `index.html`)**: Massive 14-meter gold torus portal constructed at $y \approx 750\text{m}$, serving as the ultimate finish threshold triggering the epilogue victory sequence upon summit arrival.
  * **Slow Roads Minimalist Frosted UI (`css/game.css`, `js/ui/hud.js`, `index.html`)**: Replaced sci-fi frames with translucent rounded frosted pill containers (`background: rgba(15,23,42,0.65)`, `backdrop-filter: blur(14px)`, `border-radius: 9999px`).
  * **Minimalist Countdown Pill Overlay (`index.html`, `js/ui/hud.js`)**: Frosted countdown overlay displaying `3... 2... 1... DIVE!` with pulse animations and cyan portal flare, avoiding all screen clutter.
  * **Out-of-Bounds Elevation Re-calibration (`index.html`)**: Expanded ceiling boundary from 380m to 900m and radial bounds to 4500m, accommodating stratosphere staging and vertical climb without false-positive resets.

### Completed: Complete Migration from Vercel to Render Static Sites Infrastructure

* **Render Blueprint Infrastructure-as-Code (`render.yaml`)**:
  * Adopted Render's declarative Blueprint specification to manage hosting infrastructure in version control without dashboard configuration drift.
  * Specified `type: web` with `runtime: static` to provision an edge-distributed static CDN distribution with 0 recurring compute cost and 0 cold starts.
  * Configured `staticPublishPath: .` and `buildCommand: ""` to serve client assets directly from the repository root, completing deploys in seconds.
* **Edge Security & Cache Control Headers (`render.yaml`)**:
  * Configured automated edge HTTP response headers:
    * `Cache-Control: public, max-age=0, must-revalidate` across all paths (`/*`) and `/service-worker.js` for zero-stale development revalidation.
    * `X-Content-Type-Options: nosniff` to block MIME-type sniffing.
    * `X-Frame-Options: DENY` to defend against framing and clickjacking.
    * `Referrer-Policy: strict-origin-when-cross-origin` to safeguard navigation context.
* **Single Page Application (SPA) Deep-Link Rewrites (`render.yaml`)**:
  * Added edge rewrite rules for direct deep-link access (`/boost`, `/teamwork-preview`, and `/*` wildcard fallback to `/index.html`).
  * Relies on Render's path-matching priority where physical assets (`.js`, `.css`, `.svg`, `.json`) are always served directly before rewrite rules are evaluated.
* **Native Build Pipeline Conservation (`render.yaml`)**:
  * Configured `buildFilter.ignoredPaths` (`.antigravity/**`, `.cursorrules`, `.vscode/**`, `*.md`, `scripts/**`) to ignore documentation and tooling changes, conserving the free tier's 500 monthly build pipeline minutes.
* **Legacy Vercel Decommissioning**:
  * Permanently removed legacy files: `vercel.json`, `.vercelignore`, `VERCEL_RULES.md`, and `scripts/vercel-ignore.sh`.
  * Authored `RENDER_RULES.md` as the definitive runbook for Render static sites, detailing bandwidth (100 GB/month), build quotas, client-side zero-compute constraints, and deployment workflows.
  * Updated `.cursorrules` and `README.md` to reflect Render hosting best practices.

### Completed: Stratosphere Circuit Physics Hardening, Degenerate Vector Defenses & Summit Synchronization

* **Mathematical Lateral Vector & Launch Pad Continuity (`js/engine/drone.js`, `js/engine/ai_racer.js`)**:
  * Corrected lateral dive funnel cross-vector in `drone.js` from `currentTan.cross(0, 1, 0)` to `(0, 1, 0).cross(currentTan)`. This resolves the inverted lateral steering bug and aligns $+X$ with the pilot's right-hand visual axis.
  * Synchronized lateral lane offsets for both player and AI racers against the spline start coordinate (`stagingPos.x - spline.getPointAt(0).x`), eliminating 16-meter coordinate teleportation on frame 1 of launch.
* **Degenerate Normal Protection & Zero Path Encroachment (`js/engine/track_builder.js`, `js/engine/ai_racer.js`, `js/engine/drone.js`)**:
  * On near-vertical track segments (the 720m stratosphere dive funnel and the 90-degree rocket ascension ramp), the tangent vector is parallel to world up `(0, 1, 0)`, causing `crossVectors(tan, _up)` to evaluate to a degenerate zero vector `(0, 0, 0)`.
  * In `track_builder.js`, building setback corridor samples now safeguard against zero-length normals by falling back to `(1, 0, 0)`. This completely eliminates the critical bug where buildings were spawned directly at `(sp.x, sp.z)` in the center of the vertical dive and climb paths.
  * In `ai_racer.js`, the standard flight update loop now includes a non-zero fallback for `_normal`, preventing AI racers from corrupting into `(NaN, NaN, NaN)` during vertical ascension climbs.
  * In `drone.js`, ADAS adaptive yaw cross-vectors are safeguarded against vertical headings.
* **Stratosphere Summit Finish Portal Synchronization (`js/engine/drone.js`, `index.html`)**:
  * Fixed a race condition during vertical rocket ascension where `drone.isAscending` was reset to `false` inside `updateAscensionPhysics` before the game loop in `index.html` could inspect the altitude threshold ($y \ge 740\text{m}$).
  * Added `hasReachedSummit` state tracking in `Drone` and updated `index.html` to evaluate `(playerDrone.isAscending || playerDrone.hasReachedSummit) && playerDrone.position.y >= 740.0`.
  * Triggered gold portal flash feedback (`track.finishPortal.material.color.setHex(0xffffff)`) and clean lap advancement or epilogue sequence initiation.
* **Dynamic Airframe Configuration & SAR VTOL Roleplay Preservation (`js/engine/drone.js`)**:
  * Integrated `setAirframeMode('ATTACK' | 'SAR_VTOL')` to switch between razor-sharp combat geometry (needle nose spike, swept wings, narrow fuselage) and industrial search-and-rescue configuration (stout fuselage, retracted spike).
  * Automatically binds `SAR_ORANGE` skin to toggle industrial VTOL mode while combat skins select supersonic attack mode.
* **VTOL Emergency Hover Stop Airbraking During Dive (`js/engine/drone.js`)**:
  * Enabled active airbraking during the 750m sky dive via `inputState.hoverStopActive` (`B` key / touch stop button), bleeding speed smoothly toward controlled hover descent (~65 km/h) with 90-degree nacelle tilt and extended skids.
* **Synchronous Layout Reflow Elimination (`js/ui/hud.js`)**:
  * Gated `RacingHUD.showCountdown` DOM mutations behind `currentCountdownText !== text`, eliminating 210 redundant synchronous layout reflows (`offsetWidth`) and CSS class resets during the 3.5s countdown.
* **Elevated Skybridge Realignment (`js/engine/track_builder.js`)**:
  * Relocated skybridges from spline fractions `[0.25, 0.62, 0.88]` to horizontal canyon corridors `[0.42, 0.54, 0.66]`, preventing elevated bridges from obstructing the 90-degree ascension climb.
* **Automated Regression Verification (`scripts/test_engine.mjs`)**:
  * Expanded test suite from 176 to 227 automated assertions verifying launch pad continuity, dive steering direction, VTOL airbraking, airframe switching, summit finish triggers, AI non-NaN climb stability, and building clearance envelopes.

### Completed: Kinetic Momentum Conservation, Single-Line Laser Guide Corridor & Pure GLSL Shader Modernization

* **Kinetic Momentum Conservation & Supercruise Preservation (`js/engine/drone.js`)**:
  * **Glider Energy Exchange**: Eliminated the artificial deceleration trap that forcibly braked the aircraft from supersonic dive speeds (~280–320 km/h) down to cruise speeds (95–140 km/h) upon pullout into the straightaway (`y <= 32m`).
  * **Supercruise Latch**: In `stepPhysics`, when the aircraft enters the horizontal corridor with dive momentum and the pilot maintains forward throttle (`rawForward > 0.05`), the engine bypasses `flightCfg.BRAKING_DECEL` and latches supercruise velocity, decaying only through subtle quadratic aerodynamic drag ($\propto v^2$).
  * **Stationary Hover Protection**: When forward throttle is completely released (`rawForward <= 0.05`), braking deceleration remains active, allowing the craft to settle into a clean 0 km/h stationary hover and preserving all automated test assertions.
* **Single-Line Luminous Laser Flight Corridor (`js/engine/track_builder.js`)**:
  * **Decommissioned 11-Meter Quad Highway**: Completely removed the heavy 240-segment polygonal roadbed (`ribbonGeo`), index arrays, and UV texture mapping that suffered from paper-thin visual artifacts during vertical dives.
  * **Luminous 3-Layer Laser Vector**: Replaced the roadbed with a single continuous laser guide vector threading through 3D space:
    1. *Core Laser Line (`THREE.LineLoop` / `Line`)*: High-intensity neon filament (opacity 0.95) tracing the 3D spline centerline.
    2. *Atmospheric Glow Aura Line*: Layered additive halo (`THREE.AdditiveBlending`, opacity 0.40) providing depth and optical bloom without post-processing cost.
    3. *Directional Energy Conduit Line*: Subtle accent guide line providing directional cadence.
  * **Test & Memory Safety**: Preserved exact 3-object registration in `trackObjects`, guaranteeing clean WebGL buffer disposal and 100% test compatibility.
* **Direction 3 Micro-Payload Mathematical Procedural GLSL Shaders (`js/engine/track_builder.js`)**:
  * **Zero-Allocation GPU Grid Shader**: Replaced the CPU `<canvas>` 2D context texture rasterization and upload for `canyonFloor` with a pure mathematical `THREE.ShaderMaterial`.
  * **Procedural Math & Depth Fog**: Evaluates grid lines via GLSL `fract()` and `step()` functions with screen-space depth fading (`gl_FragCoord.z / gl_FragCoord.w`), completely eliminating texture memory and rasterization CPU hitches.

### Completed: High-Precision Procedural World-Building, Analytical Atmospheric Scattering & Slow Roads Visual Experience

* **Option C Clean White & Terracotta Minimalist Brutalism Geometry (`js/engine/track_builder.js`)**:
  * **Procedural Shape Grammar Compound Buffer Geometry**: Replaced primitive box geometry with `createMonolithGeometry()`, generating 3-tier architectural monoliths:
    1. *Podium Base* ($y \in [0.0, 0.22]$, $1.0\text{m} \times 1.0\text{m}$ footprint): Wide ground-contact anchor with beveled 45-degree chamfers.
    2. *Tower Shaft* ($y \in [0.22, 0.82]$, $0.80\text{m} \times 0.80\text{m}$ footprint): Recessed massing catching raking directional sunlight.
    3. *Crown Penthouse & Mechanical Spire* ($y \in [0.82, 1.00]$, $0.54\text{m} \to 0.32\text{m}$ footprints): Architectural setbacks and crowned spire base.
  * **45-Degree Chamfered Bevels**: Octagonal corner cuts capture crisp specular highlights along skyscraper edges, eliminating flat shading artifacts.
  * **Canyon Ambient Occlusion (DAO) Shader Chunk Injection**: Injected analytical height-based diffuse shading via `onBeforeCompile` on the instanced building material, providing soft occlusion in canyon floors and brilliant illumination on upper terraces.
  * **Rooftop Scale-Giving Props**: Instanced mechanical HVAC chiller units and communications equipment atop monolith crowns.

* **Analytical Preetham/Bruneton Atmospheric Scattering & Continuous Solar Cycles (`js/config.js`, `index.html`)**:
  * **4 Continuous Celestial Presets (`CONFIG.TIME_PRESETS`)**:
    1. `DAWN_CRISP`: Sun elevation $16^\circ$, azimuth $45^\circ$, peach sun (`#FFE2B8`), sky zenith (`#1B3B6F`), horizon (`#FBC490`), long soft shadows.
    2. `ZEN_MIDDAY`: Sun elevation $72^\circ$, azimuth $160^\circ$, pure white sun (`#FFFDF5`), sky zenith (`#3B82F6`), horizon (`#BFDBFE`), stark high-contrast brutalist shadows.
    3. `GOLDEN_SUNSET`: Sun elevation $10^\circ$, azimuth $240^\circ$, burnt orange sun (`#FF6B35`), sky zenith (`#311B92`), horizon (`#FF8A65`), warm terracotta glow.
    4. `BLUE_HOUR`: Sun elevation $3^\circ$, azimuth $300^\circ$, ice blue sun (`#60A5FA`), sky zenith (`#050814`), horizon (`#06B6D4`), serene twilight.
  * **Analytical Sun Vector Calculation (`CONFIG.getSunVector`)**: Evaluates spherical solar coordinates into unit 3D Cartesian vectors $(\cos(\theta)\cos(\phi), \sin(\theta), \cos(\theta)\sin(\phi))$.
  * **Dynamic Hotkey Preset Cycler (`T` Key)**: Smooth real-time Hermite s-curve interpolation transitions lighting, sky dome gradients, exposure, and fog across presets.
  * **Exponential Stratosphere Height Fog**: Dense mist settling in low canyon floors clearing smoothly into crisp stratosphere clarity as altitude rises above $250\text{m}$.
  * **Physical Tone Mapping**: Configured `THREE.ACESFilmicToneMapping` with exposure $1.08$ and `sRGBEncoding`.

* **Slow Roads Ghost Path Trajectory Ribbon (`js/engine/ghost_path.js`)**:
  * **3-Second Analytical Trajectory Projection**: Zero-allocation 36-segment quad ribbon pre-allocating typed vertex arrays (`Float32Array`), smoothly projecting drone kinematic steering arcs onto roadbed splines ahead of the craft.
  * **Micro-Optics Shader**: Gaussian lateral core falloff with longitudinal pulse waves travelling forward along the ribbon.
  * **Pulsing Head Marker Dot**: Leading disc with sinusoidal breathing pulse marking the 3-second visual target horizon.

* **Delicate Luminous Star-Dust Speed Particles (`js/engine/particle_system.js`)**:
  * Replaced chunky cubic particles with delicate, luminous diamond-white and ice-blue star-dust streaks ($1.2\text{m} - 1.4\text{m}$ size with smooth radial falloff).

* **True Slow Roads Floating Telemetry HUD (`css/game.css`, `js/ui/hud.js`, `index.html`)**:
  * **Pure Floating Typography**: Stripped heavy dark card containers, borders, and glass plates; telemetry floats directly over world space in ultra-light monospace typography (`font-weight: 300`, subtle drop-shadows).
  * **Curved Nitro Arc Bar**: Minimalist radial arc bar tracking fuel percentage.
  * **Center-Bottom Flight State Indicator**: Subtle status label toggling between `AUTODRIVE` and `MANUAL` modes.
  * **Altitude Sector Subtitle**: Displays dynamic atmospheric sectors (`CANOPY SKYWAY`, `UPPER MESOSPHERE`, `STRATOSPHERE`).

* **Comprehensive Automated Test Expansion (`scripts/test_engine.mjs`)**:
  * Expanded verification suite to 283 passed assertions (+56 new checks), validating buffer geometry vertex bounds, chamfer angles, solar unit vectors across all 4 presets, GhostPath pre-allocations and projection math, and floating HUD telemetry updates.

### Completed: ADAS Inline Path Centering, Smooth Altitude Switching & Physics Disagreement Harmonization

* **High-Authority Inline Path Centering (js/engine/drone.js)**:
  * **Zero-Deadzone Spring-Damper Pull**: Eliminated the legacy 2.0-meter lateral deadzone. Drive assist now continuously evaluates the 3D displacement vector between the drone and the spline centerline, applying an aerodynamic spring-damper centering impulse directly to velocity.
  * **Continuous Localized Spline Progression**: Replaced the global coarse 40-step scan with a localized continuous search window ([-0.08, +0.08] around splineProgress) with fine subdivisions, eliminating loop-jumping jitter when track segments pass close to one another.
  * **Synchronized Euler Heading with Stunt FSM**: ADAS adaptive yaw alignment now smoothly updates stuntFsm.currentYaw via shortest-arc angular slerp, ensuring the visual chassis mesh, aerodynamic heading, and velocity vector remain in 100% agreement.
* **Smooth Altitude Switching & 3D Path Elevation Tracking (js/engine/drone.js)**:
  * **Laser Path Elevation Tracking**: In default flight mode, vertical auto-elevation smoothly tracks the spline exact 3D elevation nearestPt.y, allowing the craft to climb sky-ramps and descend into canyon straightaways without artificial resistance.
  * **Critically Damped Altitude Switching**: When Altitude Hold is engaged ([H] or touch toggle), stepping target altitude ([T] / [G]) employs an exponential velocity blend that delivers rapid, buttery-smooth vertical transitions without overshoot or step snapping.
* **Physics Disagreement Resolutions & Momentum Conservation (js/engine/drone.js)**:
  * **Speedometer 3D Inclusivity**: Updated speedKmh to account for vertical velocity during steep climbs and supersonic dives, eliminating speedometer drop-offs during vertical aerobatics.
  * **Aerodynamic Ground Cushion**: Ground effect now applies upward acceleration force directly to velocity.y with a solid physical safety clearance plane, eliminating floor oscillation and penetration jitter.
  * **Stratosphere Dive Momentum Conservation**: Preserved full kinetic dive velocity ($\ge 280\text{--}320\text{ km/h}$) when transitioning onto ground-level canyon straightaways; bypasses standard cruising deceleration when holding forward throttle to maintain supercruise speed along the deck.

* **Single-Line Laser Vector Corridor (js/engine/track_builder.js)**:
  * **Laser Guide Corridor Architecture**: Replaced the wide 12m quad mesh roadbed with a minimalist, high-intensity laser flight vector corridor consisting of a core guiding beam, diffuse atmospheric glow halo, and grounding depth conduit.
  * **Zero-Leak Lifecycle**: Maintained exact 3-object array registration in `trackObjects` ensuring clean WebGL buffer disposal and full test compatibility.

* **Automated Verification Harness (scripts/test_engine.mjs)**:
  * Expanded verification suite to 288 passed assertions (+5 new checks), validating single-line corridor line types, dive momentum conservation, supercruise throttle maintenance, and ADAS zero-deadzone inline centering.

### Completed: QA Architecture Audit & Surgical Clutter Purge

* **Surgical DOM & CSS Clutter Elimination (`index.html`, `css/game.css`, `js/ui/hud.js`)**:
  * **Purged Legacy Duplicates**: Completely removed legacy bottom `#nitro-container` (which duplicated the top-hud radial nitro arc), `#peripheral-horizon-ladder` (combat jet crosshairs that conflicted with the serene Slow Roads aesthetic), and the bulky `#assist-control-bar`.
  * **Pruned Dead CSS**: Removed over 120 lines of dead styling from `css/game.css` (`.horizon-pitch-bar`, `.horizon-crosshair`, `.nitro-track`, etc.).
  * **Cleaned HUD Controller**: Removed references to deleted DOM nodes (`nitroFill`, `nitroValTxt`, `horizonBar`) in `js/ui/hud.js` while maintaining the smooth floating Slow Roads typography and curved nitro arc.
* **Atmospheric Lighting Harmonization (`index.html`)**:
  * **Dynamic Sky/Ground Hemisphere Bounce**: Replaced hardcoded static directional cyan rim light (`0x0E7C7B`) with `THREE.HemisphereLight`, deriving sky zenith and ground bounce colors dynamically from `CONFIG.TIME_PRESETS`.
  * **Harmonized Solar Transitions**: Unified `setTimeOfDayPreset` and `updateTimeOfDayTransition` to smoothly blend sun elevation, directional color, hemisphere bounce, exposure, and fog across all 4 continuous presets without pop or seam.
* **Slow Roads Roadside Aggregate Grounding (`js/engine/track_builder.js`)**:
  * **Instanced Boulder Scatter**: Added 180 instanced low-poly stone boulders along the road shoulders outside the laser flight corridor, utilizing warm limestone and terracotta aggregate palettes (`#E2E8F0`, `#CBD5E1`, `#94A3B8`, `#64748B`, `#D8B4A6`) with zero runtime memory allocations.

### Completed: High-Density Metropolitan World-Building & Clustered Urban Districts

* **High-Density Instance Scaling across Hardware Tiers (`js/config.js`)**:
  * **Scaled Max Props**: Scaled building quotas to eliminate sparse skyline gaps:
    * `MOBILE_LOW` (Tier 1): $120 \to 380$ building monoliths (3.1x density increase).
    * `MOBILE_MID` (Tier 2): $280 \to 800$ building monoliths (2.8x density increase).
    * `DESKTOP_HIGH` (Tier 3): $500 \to 1600$ building monoliths (3.2x density increase).
  * **Zero Extra Draw Calls**: All 1,600 monoliths continue to render in **a single `THREE.InstancedMesh` draw call**, preserving 60–120 FPS performance and zero per-frame garbage collection.

* **Multi-Layer Urban Architecture & Structured Districts (`js/engine/track_builder.js`)**:
  * **Zone 1: Multi-Layer Canyon Flankers (50% of buildings)**:
    * *Tier 0 (Streetfront Façade)*: Tight corridor framing setback ($38\text{m} - 60\text{m}$ from road centerline) on both sides of the flight corridor.
    * *Tier 1 (Mid-Avenue Blocks)*: Staggered secondary setback ($74\text{m} - 110\text{m}$) visible between streetfront facades, creating the visual realism of perpendicular cross-streets.
    * *Tier 2 (Deep District High-Rises)*: Outer canyon backdrop ($128\text{m} - 190\text{m}$) providing towering architectural massing.
  * **Zone 2: Clustered Urban District Grids (35% of buildings)**:
    * Replaced uniform random polar distribution with 6 distinct metropolitan district centers (Downtown Financial, West Midtown Commercial, East Waterfront Tech, South Residential, North Terrace, Industrial Basin).
    * Structured rectilinear block matrices ($6 \times 6$ street grids with $46\text{m} - 62\text{m}$ street pitch and angular district orientation).
  * **Zone 3: Horizon Mega-Monoliths & Distant Spires (15% of buildings)**:
    * Concentric horizon skyline distribution ($650\text{m} - 2600\text{m}$ radius) framing the continuous Preetham/Bruneton sky dome.
  * **Rigorous Safety Envelopes**:
    * Full 3D Frenet-Serret clearance check against all 120 spline sample points.
    * Strict radial exclusion cylinder ($|x| < 75\text{m}, |z| < 95\text{m}$) protecting the stratosphere launch platforms, deep dive funnel, and 90° ascension summit.

* **Scaled Rooftop Props & Aggregate Stone Boulders (`js/engine/track_builder.js`)**:
  * Scaled rooftop helipads (up to 160), aviation warning spires (up to 120), and HVAC chiller units (up to 160) across building crowns.
  * Scaled roadside aggregate boulders (up to 260) with warm limestone and terracotta palettes.

* **Comprehensive Verification Suite (`scripts/test_engine.mjs`)**:
  * Expanded verification suite to 295 passed assertions (+7 new checks), validating 1,600 building instance allocations, AABB coordinate bounds, zero staging funnel penetration, and bounded prop arrays.


