# Product Specification: BARCH Aero-Canyon Racing

## 1. Product Vision & Overview
BARCH Aero-Canyon Racing is a high-speed, arcade-sim industrial VTOL drone racing game built directly for the modern web. Drawing direct inspiration from the velocity, intensity, and visceral spectacle of *Asphalt* and *Wipeout*, combined with authentic industrial Search-and-Rescue / Coast Guard VTOL aeronautics, the game delivers an adrenaline-fueled aerial racing experience running at a rock-solid 60–120 FPS across budget mobile phones, tablets, and high-performance desktop rigs.

The game is strictly architected for:
1. **Ultra-lightweight footprint**: Sub-90KB total code footprint leveraging CDN-delivered dependencies (Three.js r128) with zero heavyweight build steps.
2. **Offline-first playability**: Automatic browser `Cache API` and Service Worker pipeline that caches track assets, geometries, and audio locally for 0ms subsequent loads and full offline capability.
3. **Hardware-adaptive execution**: A client-side Device Coordinator that benchmarks GPU and memory capabilities on boot, dynamically scaling draw distances, resolution scale (DPR), shadow cascades, and particle densities.
4. **Autonomous AI Rival Racing**: Real-time competition against 3 to 5 rival VTOL drones navigating 3D spline circuits with collision response, obstacle avoidance, and slipstream drafting.
5. **Multiplayer-Ready Architecture**: Decoupled 48-byte binary telemetry snapshot pipeline supporting WebRTC Peer-to-Peer room codes (via PeerJS CDN) and local network WebSocket hosting.

---

## 2. Hardware Coordinator & Device Tiers

The Device Coordinator executes prior to scene construction, probing device hardware and selecting the optimal performance profile:

| Feature / Setting | Tier 1: Mobile Low (Budget Phones) | Tier 2: Mobile / Mid-range (iPhone / Modern Android / Integrated GPU) | Tier 3: Desktop High (Dedicated GPU / Gaming Rigs) |
| :--- | :--- | :--- | :--- |
| **Target Frame Rate** | 60 FPS | 60 FPS | 120 FPS / Uncapped |
| **Device Pixel Ratio (DPR)** | Locked 1.0 | 1.25 | Native (up to 2.0) |
| **Shadows** | Disabled | Simplified Directional Map (512x512) | PCFSoftShadowMap (2048x2048, Cascaded) |
| **Track Decoration Density** | Core Track + Gate Rings | Full Gantries, Pipes, and Lighting | Dynamic Volumetric Steam, Debris, and Particle Exhausts |
| **Camera FX** | Spring-Damper Camera + Canvas Speed Lines | Full FOV Elasticity + Radial Speed Lines + Screen Shake | Chromatic Aberration + Heat Distortions + Motion Streaks |
| **Audio Pipeline** | 2-channel Web Audio (Engine + Wind) | 4-channel Web Audio (Engine, Wind, Turbine Spool, FX) | Full Convolver Reverb + Spatial 3D Audio |
| **Input Interface** | Touch Virtual Sticks + Haptic Pulses | Touch / Hybrid Trackpad | Full Keyboard + Mouse Aim + Gamepad API (HOTAS/Xbox) |

---

## 3. Flight Kinematics & Intrinsic Aerobatic Stunt Engine

Real aerial racing does not rely on tire-friction drifts; it operates through aerodynamic lift, thrust vectoring, and high angle-of-attack (AoA) flight postures.

### 3.1 Flight Kinematics Model
* **Thrust Vectoring**: Dual forward/vertical vector forces with tilt-rotor nacelle articulation (90° vertical hover up to 0° horizontal high-speed cruise).
* **Lift & Drag Curves**: Induced drag increases quadratically with speed, demanding throttle management and aerodynamic streamlining.
* **Slipstream & Drafting**: Flying directly within the turbulent wake cone (behind rival drones within 18 meters) cuts air resistance by 35% and accelerates Nitro replenishment.

### 3.2 Aerobatic Stunt State Machine (FSM)
1. **Snap Aileron Roll**:
   * *Activation*: Double-tap left/right touch buttons or Q/E keys.
   * *Aeronautics*: Immediate 360-degree corkscrew rotation along the longitudinal axis via quaternion interpolation. Hitbox compresses by 45% during rotation to slip through narrow gaps.
   * *Reward*: Instant +22% Nitro boost tank replenishment.
2. **Knife-Edge Flight (Slit Penetration)**:
   * *Activation*: Hold dedicated "Knife-Edge" button or C key.
   * *Aeronautics*: The aircraft banks 90 degrees vertical while automatic counter-rudder sustains flight altitude, allowing the craft to slice through narrow vertical skyscraper canyons and crane legs.
   * *Reward*: Continuous score multiplier and streaming Nitro charge per second maintained.
3. **Pugachev's Cobra / Post-Stall Pitch Brake**:
   * *Activation*: Tap Reverse Thrust / Brake while pulling back stick at high airspeed (>110 km/h) or press X.
   * *Aeronautics*: Rapid 80-degree nose-up flare into oncoming airflow, dumping 62% forward velocity in 0.55 seconds without losing altitude. Used to set up sudden 90-degree hairpin turns without colliding with perimeter barriers.
   * *Reward*: Tactical corner entry speed and instant obstacle avoidance.
4. **Near-Miss Facade Buzzing**:
   * *Activation*: Skimming structural walls, obstacles, or rival drones within a 3.5-meter threshold at speeds >100 km/h.
   * *Sensory Output*: Sonic air-crack audio pulse, camera vibration, and instant +12% Nitro flash.

---

## 4. Nitro Boost System (Triple-Stage Overcharge)
1. **Stage 1 (Cruise Thrust)**: Standard operational speed (130–180 km/h).
2. **Stage 2 (Afterburner)**: Press and hold Boost; exhaust ignites safety-orange flames; speed ramps to 240 km/h; FOV expands from 58° to 74°.
3. **Stage 3 (Hyper-Overdrive)**: Re-tapping Boost when the needle enters the flashing yellow threshold (>70%) triggers Hyper-Overdrive:
   * Top speed surges to 320 km/h.
   * Camera FOV dynamically stretches to 92°.
   * Screen-space radial speed streaks illuminate the periphery.
   * Procedural audio transitions to a deep turbine roar with Doppler sonic boom crackles.

---

## 5. AI Rival Drone Racing System
* **Grid Size**: Player plus 3 autonomous rival drones.
* **Navigation & Line Optimization**: AI crafts track the mathematical 3D `CatmullRomCurve3` racing spline with randomized lane offsets, target speeds, and dynamic overtaking logic.
* **Physics & Collisions**: Rival drones have physical bounding spheres. Side-swiping or nudging rivals transfers momentum with visible deflection, collision camera shakes, and haptic impact pulses.
* **Drafting Mechanics**: Aligning directly behind an AI competitor within an 18-meter cone reduces aerodynamic drag and rapidly charges the player's Nitro gauge.

---

## 6. Circuit Generation & The "Pull -> Polish -> Cache" Pipeline

### 6.1 Hybrid Track Generation
* **Mathematical Spline Foundation**: Course centerlines are computed as smooth, continuous 3D CatmullRom splines traversing through urban skyscraper valleys and elevated sky-bridges.
* **Frenet-Serret Track Framing**: The engine evaluates tangential and normal vectors along the spline to generate:
  * Seamless racing roadbed / energy-conduit ribbons.
  * Glowing hexagonal holographic checkpoint gate rings with pass-through detection.
  * Chevron directional signs dynamically angling toward incoming turns.
* **Instanced Industrial Props**: High-detail modular assets (communications towers, gantry cranes, warning beacons, HVAC units, pipes) are placed along the spline corridor using `THREE.InstancedMesh` to keep draw calls below 25 across the entire scene.

### 6.2 Browser Cache Engine (Cache API + Service Worker)
* **First Load**: Fetches core dependencies and modular procedural descriptors via CDN.
* **Persistence**: Writes track schemas, synthesized audio buffers, and geometry caches into the browser's persistent `CacheStorage` (`barch-aero-v1`).
* **Offline Execution**: On subsequent visits, assets load directly from local storage with 0ms network latency.

---

## 7. Speed Psychophysics & Audio Design

### 7.1 Visual Speed Enhancers
* **Peripheral Optic Flow**: Track geometry, tunnel rings, and high-rise facades are clustered along the peripheral camera frustum to maximize the human eye's perception of high velocity.
* **Spring-Damper Chase Camera**: The camera behaves as a physical mass with spring tension and damping:
  $$\mathbf{a}_{\text{cam}} = k (\mathbf{p}_{\text{target}} - \mathbf{p}_{\text{cam}}) - c \mathbf{v}_{\text{cam}}$$
  Lags behind on acceleration, swings outward during sharp banks, and drops downward during high-G climbs.
* **Radial Speed Lines**: A hardware-accelerated 2D canvas overlay paints velocity-aligned speed streaks radiating from the projected screen-space motion vector during Boost.

### 7.2 Web Audio Synthesis Engine
Zero external `.mp3` or `.wav` dependencies; 100% procedurally synthesized in real time via the Web Audio API:
* **Twin Turbine Spool**: Dual oscillators (sawtooth + triangle) modulated by lowpass filters, tracking throttle RPM from 180 Hz to 1050 Hz.
* **Aerodynamic Wind Sheer**: Bandpass-filtered white noise buffer modulated by forward airspeed.
* **Sonic Boom / Gate Ping**: Exponential sine frequency drops combined with stereo panned chimes upon clearing checkpoint rings.

---

## 8. Multiplayer Architecture Foundation
* **Binary Telemetry Frame (48 Bytes)**:
  `[4B: PlayerID] [12B: Vector3 Pos] [16B: Quaternion Rot] [12B: Vector3 Vel] [1B: StuntState] [1B: NitroState] [2B: TrackProgress]`
* **Networking Channels**:
  * **Channel A (WebRTC P2P Room Codes via PeerJS)**: Zero-server peer-to-peer mesh between desktop and mobile devices anywhere on the internet.
  * **Channel B (Local WebSocket Host / LAN)**: One local machine runs a lightweight Node/Deno WebSocket hub on the local Wi-Fi for zero-internet multi-device LAN parties.
* **Dead-Reckoning Extrapolation**: Remote opponent positions interpolate smoothly between packets using cubic Hermite splines to eliminate jitter over wireless links.

---

## 9. Modular File Architecture

```
/
├── index.html                  # Minimal bootloader HTML & responsive canvas viewports
├── service-worker.js           # PWA offline cache engine (Cache API)
├── css/
│   └── game.css                # Industrial HUD & Glassmorphism UI styling
└── js/
    ├── coordinator.js          # Device profiler, tier selector & module orchestrator
    ├── config.js               # Physics parameters, graphics tier presets, track specs
    ├── audio/
    │   └── sound_engine.js     # Web Audio API procedural synthesizer
    ├── input/
    │   ├── input_manager.js    # Unified controller abstraction
    │   ├── touch_controls.js   # Dual virtual sticks + stunt buttons + haptics
    │   └── desktop_controls.js # Keyboard, Mouse, and Gamepad API bindings
    ├── engine/
    │   ├── drone.js            # VTOL physics, kinematics, and articulated 3D mesh
    │   ├── stunt_fsm.js        # Aerobatic stunt state machine (Roll, Knife, Cobra)
    │   ├── track_builder.js    # 3D CatmullRom spline ribbon & instanced prop spawner
    │   ├── ai_racer.js         # Autonomous rival drone navigation & collision
    │   └── camera_rig.js       # Spring-damper chase camera with FOV warping & shake
    └── ui/
        └── hud.js              # Racing HUD (speedometer, nitro gauge, minimap, speed lines)
```
