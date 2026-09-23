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
