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
