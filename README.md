# BARCH: Aero-Canyon Racing

[![WebGL](https://img.shields.io/badge/WebGL-2.0%20%2F%201.0-blue.svg)](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API)
[![Three.js](https://img.shields.io/badge/Three.js-r128-black.svg)](https://threejs.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline%20Cache%20API-orange.svg)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build](https://img.shields.io/badge/Build-Zero%20Dependency%20%2F%20Vanilla%20ES6-success.svg)](#)

> **BARCH Aero-Canyon Racing** is a high-speed, arcade-sim industrial VTOL aerial racing game built for the modern web. Combining the velocity and visceral spectacle of *Asphalt* and *Wipeout* with authentic Search-and-Rescue tilt-rotor aeronautics, the game runs at a rock-solid 60–120 FPS across budget mobile devices, tablets, and desktop workstations.

---

## Key Features & Highlights

* **Zero-Allocation Render Loop**: Eliminates garbage collection (GC) micro-stutters by utilizing pre-allocated static scratch vectors and Euler angles across all flight, stunt, camera, and AI loops.
* **Dynamic Resolution Scaling (DRS)**: Frame-pacing monitor dynamically throttles `renderer.setPixelRatio` on the fly if frametime exceeds 24ms, guaranteeing smooth performance on budget Mali/Adreno mobile chipsets.
* **Screen Wake Lock & Lifecycle Management**: Automatically acquires `navigator.wakeLock` to prevent mobile displays from sleeping mid-race, and pauses simulation/audio when the tab is backgrounded.
* **Course Realignment Recovery**: Automatically detects off-course boundary deviations and safely realigns the drone onto the track without game restarts.
* **Zero Build Steps & Lightweight Footprint**: Entire game code is under 90 KB. Loads instantly via public CDNs with zero npm packages or complex bundler pipelines.
* **Hardware-Adaptive Coordinator**: A client-side hardware profiler dynamically benchmarks GPU capabilities, CPU concurrency, memory, and pointer types, applying Tier 1 (Mobile Low), Tier 2 (Mobile Mid), or Tier 3 (Desktop High) to optimize draw calls, resolution scale (DPR), and shadow maps.
* **Offline-First PWA Architecture**: Native Service Worker with Cache-First strategy (`Cache API`) caches all scripts, assets, and shaders for 0ms subsequent loads and full offline capability.
* **Intrinsic Aerobatic Stunt Engine**: Real-time flight state machine executing Snap Aileron Rolls, Knife-Edge slit slicing, Pugachev Cobra post-stall airbrakes, and near-miss facade buzzing.
* **Autonomous AI Competitors**: Compete against autonomous rival drones that navigate 3D CatmullRom spline circuits, adjust lanes dynamically, and produce realistic slipstream drafting cones.
* **Procedural Web Audio Engine**: 100% procedurally synthesized turbine spool-up whines, aerodynamic wind buffeting, sonic crackles, and gate passage chimes via the Web Audio API with zero external audio downloads.
* **Drone Hangar & Upgrades**: Persistent player profile via `localStorage`, featuring customizable airframe liveries (Search & Rescue, Arctic Ghost, Stealth Carbon, Cyber Neon) and a 4-tier tactical upgrade tree (Turbine Velocity, Winch Latch Radius, Hull Armor, Nitro Cell Capacity).

---

## Game Modes & Campaign Sectors

### Mission Modes
1. **Circuit Grand Prix**: Pure adrenaline high-speed checkpoint racing against 3 autonomous AI rivals across multi-lap 3D spline circuits with drafting and Nitro overcharge.
2. **Tactical Cargo Extraction (Solo)**: Race against the clock to navigate tight skyscraper corridors, magnetically latch rooftop payload crates with your drone's ventral winch, and extract them back to the base drop zone.
3. **Tactical Cargo Extraction (Versus AI)**: Competitive cargo recovery. Race head-to-head against rival AI drones to locate, extract, and secure payloads first.
4. **Teamwork Squadron (`#teamwork-preview`)**: Tactical co-op flight escorting with autonomous AI Wingman "ECHO-01". Maintain tight formation within 25m to activate the Slipstream Tether for continuous boost replenishment and cooperative cargo retrieval. Quick overcharge via `#boost`.

### Campaign Sectors
* **Sector 01: Downtown Canyons**: Daylight urban grid featuring wide sky-lanes and gentle altitude transitions.
* **Sector 02: Industrial Port & Cranes**: Overcast twilight industrial zone packed with gantry cranes, storage silos, and tight chicanes.
* **Sector 03: Stratosphere Monoliths**: High-altitude storm run among massive mega-towers with intense vertical climbs, dives, and turbulence.

---

## Intrinsic Aerobatic Stunt Mechanics

| Maneuver | Hotkey / Gesture | Aeronautical Effect | Gameplay Reward |
| :--- | :--- | :--- | :--- |
| **Snap Aileron Roll** | `Q` / `E` or Roll Buttons | 360-degree corkscrew along longitudinal axis; compresses hitbox by 45% to slip through narrow gaps | Instant **+22% Nitro** refill |
| **Knife-Edge Flight** | Hold `C` or Knife Button | Banks wings 90 degrees vertical with automatic counter-rudder compensation to slice narrow building slits | Continuous **multiplier & streaming Nitro** |
| **Pugachev Cobra** | `X` or Cobra Button | Sharp 80-degree nose-up flare into oncoming airflow, dumping 62% forward speed within 0.55s | Instant **hairpin corner entry & crash avoidance** |
| **Near-Miss Facade Buzzing** | High-speed proximity (<3.5m) | Skimming building facades and structural steel at speeds over 100 km/h | **Camera shake, sonic crack, +12% Nitro** |
| **Slipstream Drafting** | Fly behind rival drone (<18m) | Aligning directly inside the turbulent low-pressure wake cone of an opponent | **35% drag reduction + rapid Nitro recharge** |

---

## Nitro Boost System

* **Stage 1 (Cruise Thrust)**: Standard operational airspeed (130–180 km/h).
* **Stage 2 (Afterburner)**: Press and hold Boost; exhaust burns safety orange, airspeed accelerates to 240 km/h, and FOV expands from 58 to 74 degrees.
* **Stage 3 (Hyper-Overdrive)**: Re-tapping Boost when the needle enters the flashing yellow threshold (>70% capacity) triggers Hyper-Overdrive:
  * Airspeed surges past 320 km/h.
  * Camera FOV dynamically stretches to 92 degrees.
  * Screen-space radial speed streaks radiate across the peripheral field.
  * Turbine audio transitions to a deep resonant roar with Doppler sonic boom crackles.

---

## Flight Controls Reference

### Desktop (Keyboard & Gamepad)
* **W / Up Arrow / Gamepad RT**: Forward Throttle
* **S / Down Arrow / Gamepad LT**: Airbrake / Reverse
* **A & D / Left & Right / Left Stick**: Steer Yaw & Visual Banking
* **Space / Gamepad A / RB**: Nitro Boost (Hold for Stage 2, time for Stage 3)
* **Q & E / Gamepad LB & RB**: Snap Aileron Roll Left / Right
* **C / Gamepad B**: Hold Knife-Edge Flight
* **X / Gamepad X**: Cobra Airbrake Flare
* **Escape**: Pause Mission / Resume

### Mobile (Touchscreen)
* **Left Virtual Stick**: Omnidirectional steering (Up: Forward thrust, Down: Reverse/Brake, Left/Right: Yaw turn and bank).
* **NITRO BOOST Button**: Large ergonomic thumb trigger for Afterburner and Hyper-Overdrive.
* **ROLL L / ROLL R Buttons**: Dedicated instant-tap snap aileron rolls with haptic feedback.
* **KNIFE Button**: Hold to sustain vertical knife-edge posture.
* **COBRA Button**: Immediate tactical airbrake flare.

---

## Hardware Coordinator Architecture

The client-side coordinator evaluates device capabilities prior to rendering:

```
                  +------------------------------+
                  |      DEVICE COORDINATOR      |
                  | (GPU, Memory, Pointer Probe) |
                  +--------------+---------------+
                                 |
           +---------------------+---------------------+
           |                     |                     |
           v                     v                     v
   [Tier 1: Mobile Low]   [Tier 2: Mobile Mid]   [Tier 3: Desktop High]
   - DPR: 1.0             - DPR: 1.25            - DPR: Native (up to 2.0)
   - Shadows: Off         - Shadows: 512px       - Shadows: PCFSoft (2048px)
   - Max Props: 120       - Max Props: 280       - Max Props: 500
   - Speed Lines: Canvas  - Speed Lines + Shake  - Full Post-Processing FX
```

---

## File Architecture

```
barch-vtol-racing/
├── index.html                  # Minimal bootloader HTML & responsive canvas viewports
├── service-worker.js           # PWA offline cache engine (Cache API)
├── product.md                  # Detailed product specification and engineering manual
├── documentation.md            # High-level architecture and developer reference
├── README.md                   # Project documentation and SEO guide
├── css/
│   └── game.css                # Glassmorphism tactical HUD and modal styling
└── js/
    ├── coordinator.js          # Hardware profiling, tier selection & module orchestration
    ├── config.js               # Physics parameters, sectors, skins, upgrades, and tiers
    ├── audio/
    │   └── sound_engine.js     # Web Audio API procedural synthesizer
    ├── input/
    │   ├── input_manager.js    # Unified controller abstraction bus
    │   ├── touch_controls.js   # Multi-touch dual virtual sticks + stunt buttons + haptics
    │   └── desktop_controls.js # Keyboard, Mouse, and Gamepad API bindings
    ├── engine/
    │   ├── drone.js            # Articulated VTOL mesh, skins, and flight kinematics
    │   ├── stunt_fsm.js        # Aerobatic stunt finite state machine
    │   ├── track_builder.js    # 3D CatmullRom spline ribbon and instanced city environment
    │   ├── ai_racer.js         # Autonomous rival drone racers and drafting physics
    │   ├── extraction_engine.js# Rooftop payload spawning, magnetic winch, and drop zone
    │   └── camera_rig.js       # Spring-damper chase camera with FOV elasticity
    └── ui/
        ├── hud.js              # Racing HUD, telemetry, and peripheral speed streaks
        └── hangar_settings.js  # Drone hangar, upgrades, settings, and localStorage persistence
```

---

## Quick Start & Local Execution

Because BARCH Aero-Canyon Racing uses standard ES modules and a Service Worker, run it with any local static HTTP server:

```powershell
# Using Python:
python -m http.server 8080

# Or using Node.js:
npx serve .
```

Navigate to `http://localhost:8080` in Chrome, Safari, Edge, or Firefox.

### Deploying to Production
* **Render (Recommended)**: Import the GitHub repository in the [Render Dashboard](https://dashboard.render.com). Render will automatically detect `render.yaml` (Blueprint) and provision the static site with edge caching, security headers, and clean SPA rewrite routes.
* **GitHub Pages**: Push to the `master` or `main` branch and enable GitHub Pages in repository settings pointing to root (`/`).

---

## Multiplayer Roadmap
The flight simulation decouples all state into a compact 48-byte binary frame:
`[PlayerID: 4B] [Position: 12B] [Quaternion: 16B] [Velocity: 12B] [StuntState: 1B] [NitroState: 1B] [Progress: 2B]`

This enables direct integration with WebRTC Peer-to-Peer room codes (via PeerJS CDN) and local network WebSocket hosting for zero-latency local LAN matches.

---

## License
MIT License. Free for personal, educational, and commercial development.
