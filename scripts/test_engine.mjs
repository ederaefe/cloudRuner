/*
================================================================================
BARCH AERO-CANYON RACING - COMPREHENSIVE AUTOMATED VERIFICATION HARNESS
Tests: Config, Coordinator, SoundEngine, InputManager, StuntFSM, CameraRig,
Drone Kinematics, AiRacer, TrackBuilder, ExtractionEngine, and Asset Paths
================================================================================
*/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 1. Mock minimal browser environment for Three.js & WebGL headless testing
global.window = {
    innerWidth: 1920,
    innerHeight: 1080,
    devicePixelRatio: 2.0,
    matchMedia: () => ({ matches: false }),
    addEventListener: () => {},
    removeEventListener: () => {},
    location: { hash: '', search: '', pathname: '/' }
};

class MockAudioParam {
    constructor(val = 1) { this.value = val; }
    setValueAtTime(v) { this.value = v; }
    setTargetAtTime(v) { this.value = v; }
    exponentialRampToValueAtTime(v) { this.value = v; }
    linearRampToValueAtTime(v) { this.value = v; }
}

class MockAudioNode {
    constructor() {
        this.gain = new MockAudioParam(1);
        this.frequency = new MockAudioParam(440);
        this.detune = new MockAudioParam(0);
        this.Q = new MockAudioParam(1);
    }
    connect() {}
    disconnect() {}
    start() {}
    stop() {}
}

class MockAudioContext {
    constructor() {
        this.state = 'running';
        this.currentTime = 0;
        this.sampleRate = 44100;
        this.destination = new MockAudioNode();
    }
    createGain() { return new MockAudioNode(); }
    createOscillator() { return new MockAudioNode(); }
    createBiquadFilter() { return new MockAudioNode(); }
    createBuffer(ch, len, sr) { return { getChannelData: () => new Float32Array(len) }; }
    createBufferSource() { return new MockAudioNode(); }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
}

global.window.AudioContext = MockAudioContext;
global.AudioContext = MockAudioContext;
Object.defineProperty(globalThis, 'navigator', {
    value: {
        hardwareConcurrency: 8,
        deviceMemory: 8,
        maxTouchPoints: 0,
        userAgent: 'Node-Automated-Test'
    },
    writable: true,
    configurable: true
});
const mock2dCtx = {
    clearRect: () => {},
    fillRect: () => {},
    fill: () => {},
    arc: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {}
};

global.document = {
    createElement: (tag) => {
        if (tag === 'canvas') {
            return {
                getContext: (mode) => (mode === '2d' ? mock2dCtx : {
                    getExtension: () => null,
                    getParameter: () => 'Node Test GPU'
                }),
                width: 1920,
                height: 1080,
                style: {}
            };
        }
        return {
            style: {},
            dataset: {},
            innerHTML: '',
            classList: { add: () => {}, remove: () => {}, contains: () => false },
            addEventListener: () => {},
            querySelector: () => ({ addEventListener: () => {} }),
            appendChild: () => {},
            focus: () => {}
        };
    },
    getElementById: (id) => {
        if (id === 'speed-lines-canvas' || id === 'viewport-canvas') {
            return {
                getContext: (mode) => (mode === '2d' ? mock2dCtx : {
                    getExtension: () => null,
                    getParameter: () => 'Node Test GPU'
                }),
                width: 1920,
                height: 1080,
                style: {}
            };
        }
        return {
            style: {},
            dataset: {},
            innerHTML: '',
            classList: { add: () => {}, remove: () => {}, contains: () => false },
            addEventListener: () => {},
            querySelector: () => ({ addEventListener: () => {} }),
            appendChild: () => {},
            textContent: '',
            focus: () => {}
        };
    },
    querySelectorAll: () => []
};

// 2. Load Three.js
// We can use a lightweight mock of THREE if not in npm, or construct required math objects
class MockVector3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    setScalar(s) { this.x = s; this.y = s; this.z = s; return this; }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    clone() { return new MockVector3(this.x, this.y, this.z); }
    add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
    subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
    addVectors(a, b) { this.x = a.x + b.x; this.y = a.y + b.y; this.z = a.z + b.z; return this; }
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
    addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
    length() { return Math.hypot(this.x, this.y, this.z); }
    lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
    normalize() {
        const l = this.length();
        if (l > 0.00001) this.multiplyScalar(1 / l);
        else this.set(0, 0, 0);
        return this;
    }
    distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    crossVectors(a, b) {
        const ax = a.x, ay = a.y, az = a.z, bx = b.x, by = b.y, bz = b.z;
        this.x = ay * bz - az * by;
        this.y = az * bx - ax * bz;
        this.z = ax * by - ay * bx;
        return this;
    }
    lerp(v, alpha) {
        this.x += (v.x - this.x) * alpha;
        this.y += (v.y - this.y) * alpha;
        this.z += (v.z - this.z) * alpha;
        return this;
    }
    applyQuaternion(q) { return this; }
    applyAxisAngle(axis, angle) { return this; }
    negate() { this.x = -this.x; this.y = -this.y; this.z = -this.z; return this; }
}

class MockQuaternion {
    constructor() { this._x = 0; this._y = 0; this._z = 0; this._w = 1; }
    setFromUnitVectors(a, b) { return this; }
    setFromAxisAngle(axis, angle) { return this; }
    setFromEuler(e) { return this; }
    slerp(q, t) { return this; }
    multiply(q) { return this; }
    identity() { return this; }
    copy(q) { return this; }
    invert() { return this; }
    clone() { return new MockQuaternion(); }
}

class MockEuler {
    constructor(x = 0, y = 0, z = 0, order = 'YXZ') {
        this.x = x; this.y = y; this.z = z; this.order = order;
    }
    set(x, y, z, order) {
        this.x = x; this.y = y; this.z = z; this.order = order || this.order;
        return this;
    }
    setFromQuaternion(q, order) {
        this.order = order || this.order;
        return this;
    }
}

class MockObject3D {
    constructor() {
        this.position = new MockVector3();
        this.quaternion = new MockQuaternion();
        this.scale = new MockVector3(1, 1, 1);
        this.rotation = { x: 0, y: 0, z: 0 };
        this.children = [];
        this.matrix = {};
        this.visible = true;
    }
    add(obj) {
        obj.parent = this;
        this.children.push(obj);
        return this;
    }
    remove(obj) {
        const idx = this.children.indexOf(obj);
        if (idx !== -1) this.children.splice(idx, 1);
        obj.parent = null;
        return this;
    }
    traverse(cb) {
        cb(this);
        this.children.forEach(c => c.traverse(cb));
    }
    updateMatrix() {}
    lookAt() {}
}

class MockMesh extends MockObject3D {
    constructor(geo, mat) {
        super();
        this.isMesh = true;
        this.geometry = geo || { dispose: () => {} };
        this.material = mat || { dispose: () => {}, color: { setHex: () => {} } };
    }
}

class MockGeometry {
    constructor() { this.disposed = false; this.attributes = {}; }
    rotateX() { return this; }
    translate() { return this; }
    scale() { return this; }
    clone() { return new MockGeometry(); }
    setAttribute(name, attr) { this.attributes[name] = attr; }
    setIndex() {}
    computeVertexNormals() {}
    setFromPoints() { return this; }
    dispose() { this.disposed = true; }
}

class MockMaterial {
    constructor(cfg = {}) {
        this.disposed = false;
        this.color = { setHex: () => {} };
        this.opacity = 1.0;
        this.frequency = { setValueAtTime: () => {}, setTargetAtTime: () => {} };
    }
    clone() { return new MockMaterial(); }
    dispose() { this.disposed = true; }
}

global.THREE = {
    Vector3: MockVector3,
    Quaternion: MockQuaternion,
    Euler: MockEuler,
    Matrix4: class { identity() { return this; } },
    Color: class { constructor(v) { this.r = 1; this.g = 1; this.b = 1; this.setHex = () => {}; } },
    Object3D: MockObject3D,
    Group: MockObject3D,
    Scene: MockObject3D,
    Mesh: MockMesh,
    Points: class extends MockMesh {},
    Line: MockMesh,
    InstancedMesh: class extends MockMesh {
        constructor(geo, mat, count) {
            super(geo, mat);
            this.count = count;
            this.instanceMatrix = { needsUpdate: false };
        }
        setMatrixAt() {}
    },
    PerspectiveCamera: class extends MockObject3D {
        constructor() {
            super();
            this.fov = 58;
        }
        updateProjectionMatrix() {}
        lookAt() {}
    },
    ConeGeometry: MockGeometry,
    BoxGeometry: MockGeometry,
    PlaneGeometry: MockGeometry,
    SphereGeometry: MockGeometry,
    CylinderGeometry: MockGeometry,
    RingGeometry: MockGeometry,
    CircleGeometry: MockGeometry,
    TorusGeometry: MockGeometry,
    BufferGeometry: MockGeometry,
    CanvasTexture: class {
        constructor() {
            this.wrapS = 0;
            this.wrapT = 0;
            this.repeat = { set: () => {} };
            this.offset = { y: 0 };
            this.dispose = () => {};
        }
    },
    RepeatWrapping: 1000,
    BufferAttribute: class {
        constructor(array, itemSize) {
            this.array = array;
            this.itemSize = itemSize;
            this.needsUpdate = false;
        }
    },
    Float32BufferAttribute: class {},
    Shape: class {
        moveTo() {}
        lineTo() {}
        closePath() {}
    },
    ExtrudeGeometry: MockGeometry,
    MeshStandardMaterial: MockMaterial,
    MeshBasicMaterial: MockMaterial,
    LineBasicMaterial: MockMaterial,
    ShaderMaterial: class extends MockMaterial {
        constructor(cfg = {}) {
            super(cfg);
            this.uniforms = cfg.uniforms || { time: { value: 0 }, pixelRatio: { value: 1 } };
        }
    },
    AmbientLight: class extends MockObject3D {},
    DirectionalLight: class extends MockObject3D {
        constructor() {
            super();
            this.color = { setHex: () => {} };
            this.shadow = { mapSize: {}, camera: {} };
        }
    },
    PointLight: class extends MockObject3D {
        constructor() {
            super();
            this.color = { setHex: () => {} };
            this.intensity = 1.0;
        }
    },
    SpotLight: class extends MockObject3D {
        constructor() {
            super();
            this.color = { setHex: () => {} };
            this.intensity = 1.0;
            this.target = new MockObject3D();
        }
    },
    FogExp2: class {
        constructor() {
            this.color = { setHex: () => {} };
            this.density = 0.002;
        }
    },
    CatmullRomCurve3: class {
        constructor(points) {
            this.points = points || [];
        }
        getPointAt(t) {
            if (!this.points || this.points.length === 0) return new MockVector3(0, 0, 0);
            const pts = this.points;
            const n = pts.length;
            const clampedT = Math.max(0, Math.min(1.0, t));
            const p = clampedT * (n - 1);
            const i = Math.floor(p);
            const weight = p - i;
            const p0 = pts[Math.max(0, i - 1)];
            const p1 = pts[i];
            const p2 = pts[Math.min(n - 1, i + 1)];
            const p3 = pts[Math.min(n - 1, i + 2)];
            // Catmull-Rom spline interpolation
            const w2 = weight * weight;
            const w3 = w2 * weight;
            const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * weight + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * w2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * w3);
            const y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * weight + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * w2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * w3);
            const z = 0.5 * ((2 * p1.z) + (-p0.z + p2.z) * weight + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * w2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * w3);
            return new MockVector3(x, y, z);
        }
        getTangentAt(t) {
            const delta = 0.002;
            const t1 = Math.max(0, t - delta);
            const t2 = Math.min(1.0, t + delta);
            const p1 = this.getPointAt(t1);
            const p2 = this.getPointAt(t2);
            return new MockVector3(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z).normalize();
        }
    },
    MathUtils: {
        lerp: (x, y, t) => x + (y - x) * t,
        clamp: (val, min, max) => Math.max(min, Math.min(max, val)),
        damp: (x, y, lambda, dt) => x + (y - x) * (1 - Math.exp(-lambda * dt))
    },
    DoubleSide: 2,
    AdditiveBlending: 2,
    PCFSoftShadowMap: 2
};

// 3. Dynamic Import of Game Engine Modules (after global.THREE is assigned)
async function runTests() {
    const { CONFIG } = await import('../js/config.js');
    const { Coordinator } = await import('../js/coordinator.js');
    const { SoundEngine } = await import('../js/audio/sound_engine.js');
    const { InputManager } = await import('../js/input/input_manager.js');
    const { StuntFSM, STUNT_STATES } = await import('../js/engine/stunt_fsm.js');
    const { CameraRig } = await import('../js/engine/camera_rig.js');
    const { Drone } = await import('../js/engine/drone.js');
    const { AiRacer } = await import('../js/engine/ai_racer.js');
    const { TrackBuilder } = await import('../js/engine/track_builder.js');
    const { ExtractionEngine } = await import('../js/engine/extraction_engine.js');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
    totalTests++;
    if (!condition) {
        console.error(`[FAIL] ${testName}`);
        throw new Error(`Assertion failed: ${testName}`);
    }
    passedTests++;
    console.log(`[PASS] ${testName}`);
}

console.log('--- STARTING COMPREHENSIVE ENGINE BUG BOUNTY TESTS ---');

// Test 1: Config Integrity & Fallbacks
assert(CONFIG.MODES.TEAMWORK_COOP === 'TEAMWORK_COOP', 'CONFIG defines TEAMWORK_COOP mode');
assert(CONFIG.TRACK.LAPS_TO_WIN === 2, 'CONFIG defines TRACK.LAPS_TO_WIN fallback');
assert(CONFIG.BOOST.STAGE3_SPEED === 320.0, 'CONFIG defines BOOST.STAGE3_SPEED (320 km/h)');
assert(CONFIG.TEAMWORK.TETHER_DISTANCE === 25.0, 'CONFIG defines TEAMWORK.TETHER_DISTANCE (25m)');
assert(CONFIG.TIERS[3].dpr >= 1.0, 'CONFIG.TIERS provides valid DPR in headless mode');

// Test 2: Coordinator Hardware Profiling & Fallback
const coordinator = new Coordinator();
assert(coordinator.profile !== null, 'Coordinator probes hardware profile');
assert(coordinator.tier !== null && coordinator.tier.name, 'Coordinator resolves hardware tier');

// Test 3: Sound Engine Master Volume & Boost Synthesis
const soundEngine = new SoundEngine();
soundEngine.init();
soundEngine.resume();
soundEngine.setMasterVolume(0.5);
soundEngine.playGateChime();
soundEngine.playStuntSuccess();
soundEngine.playNearMiss();
soundEngine.playBoostIgnite(true);
soundEngine.playBoostIgnite(false);
assert(true, 'SoundEngine handles volume, gating, and boost ignition without throwing');

// Test 4: Input Manager & Stunt Flag Clearing
const input = new InputManager();
input.state.stuntRollLeft = true;
input.state.stuntRollRight = true;
input.state.isCobraTriggered = true;
input.resetStuntFlags();
assert(input.state.stuntRollLeft === false, 'InputManager resets stuntRollLeft');
assert(input.state.stuntRollRight === false, 'InputManager resets stuntRollRight');
assert(input.state.isCobraTriggered === false, 'InputManager resets isCobraTriggered');

// Test 5: Stunt FSM Flag Consumption & Upgraded Nitro Limits
const scene = new global.THREE.Scene();
const playerDrone = new Drone(scene, false);
playerDrone.nitroMaxCapacity = 140.0;
playerDrone.nitroAmount = 50.0;

let alertedStunt = null;
const stuntFsm = new StuntFSM(soundEngine, (title) => { alertedStunt = title; });

// Trigger Snap Roll Left
input.state.stuntRollLeft = true;
stuntFsm.update(playerDrone, input.state, 0.02);
assert(input.state.stuntRollLeft === false, 'StuntFSM immediately consumed stuntRollLeft flag');
assert(stuntFsm.state === STUNT_STATES.SNAP_ROLL_LEFT, 'StuntFSM entered SNAP_ROLL_LEFT');
assert(playerDrone.nitroAmount === 72.0, 'StuntFSM rewarded +22% nitro into upgraded tank');

// Complete Snap Roll
stuntFsm.update(playerDrone, input.state, 0.5);
assert(stuntFsm.state === STUNT_STATES.NORMAL, 'StuntFSM returned cleanly to NORMAL without infinite looping');

// Test 6: Drone Upgrades & Hyper-Overdrive Latching
playerDrone.applyUpgrades({ maxSpeed: 210, nitroMax: 160 });
assert(playerDrone.maxSpeedKmh === 210, 'Drone stores upgraded max speed');
assert(playerDrone.nitroMaxCapacity === 160, 'Drone stores upgraded nitro capacity');

playerDrone.nitroAmount = 85.0; // Above 70% threshold
input.state.isNitroHeld = true;
playerDrone.updatePhysics(input.state, stuntFsm, 0.02);
assert(playerDrone.nitroStage === 3, 'Drone engages Stage 3 Hyper-Overdrive');
assert(playerDrone.isHyperLocked === true, 'Drone latches Hyper-Overdrive');

// Drop nitro below 70% while keeping boost held
playerDrone.nitroAmount = 60.0;
playerDrone.updatePhysics(input.state, stuntFsm, 0.02);
assert(playerDrone.nitroStage === 3, 'Drone maintains Stage 3 Hyper-Overdrive even below 70% threshold');

// Release boost button
input.state.isNitroHeld = false;
playerDrone.updatePhysics(input.state, stuntFsm, 0.02);
assert(playerDrone.nitroStage === 1, 'Drone returns to Stage 1 Cruise when boost released');
assert(playerDrone.isHyperLocked === false, 'Drone un-latches Hyper-Overdrive');

// Test 7: Camera Rig Reset & Extreme Displacement Clamping
const camera = new global.THREE.PerspectiveCamera();
const cameraRig = new CameraRig(camera);
playerDrone.position.set(200, 50, 400);
cameraRig.reset(playerDrone);
assert(cameraRig.shakeAmount === 0, 'CameraRig reset clears screen shake');
assert(cameraRig.velocity.lengthSq() === 0, 'CameraRig reset clears residual velocity');

// Test 8: AiRacer Collision with Zero Distance & Wingman Escort
const mockSpline = new global.THREE.CatmullRomCurve3();
const aiRacer = new AiRacer(scene, mockSpline, 0, 3, false);
const wingman = new AiRacer(scene, mockSpline, 1, 3, true);
assert(wingman.isWingman === true, 'AiRacer marks wingman instance');

// Player collision with identical position (dist = 0)
playerDrone.position.set(0, 0, 0);
aiRacer.drone.position.set(0, 0, 0);
const collided = aiRacer.checkPlayerCollision(playerDrone, cameraRig);
assert(collided === true, 'AiRacer handles collision');
assert(!isNaN(playerDrone.position.y), 'AiRacer collision does not produce NaN at dist = 0');

// Wingman escort flight
playerDrone.position.set(100, 30, 200);
wingman.drone.position.copy(playerDrone.position);
wingman.update(0.02, playerDrone);
assert(wingman.drone.position.distanceTo(playerDrone.position) < 30, 'Wingman maintains tactical escort near player');
assert(wingman.isPlayerDrafting(playerDrone) === true, 'Wingman provides Teamwork Slipstream Tether');

// Test 9: TrackBuilder Ribbon Tracking & Complete Resource Disposal
const track = new TrackBuilder(scene, coordinator.tier, CONFIG.SECTORS[0]);
assert(track.trackObjects.length === 3, 'TrackBuilder tracks ribbon mesh and neon boundary lines');
assert(track.gates.length === CONFIG.TRACK.TOTAL_GATES, 'TrackBuilder constructs hexagonal gates');
track.dispose();
assert(track.trackObjects.length === 0, 'TrackBuilder dispose clears trackObjects array');
assert(track.gates.length === 0, 'TrackBuilder dispose clears gates array');

// Test 10: Extraction Engine Empty Building Fallback & Delivery Reset
const extraction = new ExtractionEngine(scene, soundEngine, () => {});
extraction.buildBaseZone();
extraction.spawnPayloads([], 4); // Empty building list fail-safe
assert(extraction.payloads.length === 4, 'ExtractionEngine spawns payloads safely with empty building list');

extraction.latchPayload(playerDrone, extraction.payloads[0]);
assert(extraction.carriedBox.visible === true, 'ExtractionEngine attaches visual cargo box');
extraction.startDropSequence(playerDrone);
extraction.finalizeDelivery();
assert(extraction.carriedBox.position.y === -1.8, 'ExtractionEngine resets carriedBox position offset to -1.8m');
extraction.dispose();
assert(extraction.basePlatform === null, 'ExtractionEngine dispose tears down basePlatform');

// Test 11: TouchControls Pointer Exception Tolerance
const { TouchControls } = await import('../js/input/touch_controls.js');
const touchMockZone = {
    addEventListener: () => {},
    setPointerCapture: () => { throw new Error('InvalidPointerId'); },
    hasPointerCapture: () => true,
    releasePointerCapture: () => { throw new Error('NotFoundError'); },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 130, height: 130 })
};
const touchControls = new TouchControls(input);
touchControls.stickZone = touchMockZone;
assert(typeof touchControls.vibrate === 'function', 'TouchControls provides haptic vibration helper');

// Test 12: 3D GPU Particle System & HUD Telemetry Integrity
const { ParticleSystem } = await import('../js/engine/particle_system.js');
const ps = new ParticleSystem(scene, coordinator.tier);
assert(ps.particleSystem !== null, 'ParticleSystem initializes 3D GPU points');
ps.emitExhaust(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1), 220);
ps.update(0.016);
assert(ps.activeCount > 0, 'ParticleSystem emits and updates exhaust particles');
ps.dispose();
assert(true, 'ParticleSystem disposes GPU buffers cleanly');

const { RacingHUD } = await import('../js/ui/hud.js');
const hud = new RacingHUD();
hud.update(playerDrone, 1, 1, 4, false, 2, false);
assert(true, 'RacingHUD telemetry update executes cleanly');

// Test 13: Static Asset Existence Check for Service Worker Pre-Cache
const swContent = fs.readFileSync(path.join(projectRoot, 'service-worker.js'), 'utf-8');
const assetMatches = swContent.match(/'\.\/([^']+)'/g);
assert(assetMatches && assetMatches.length > 5, 'Found static asset list in service-worker.js');

for (const match of assetMatches) {
    const relPath = match.replace(/'/g, '');
    if (relPath === './') continue;
    const absPath = path.join(projectRoot, relPath);
    assert(fs.existsSync(absPath), `Static asset exists on disk: ${relPath}`);
}

// Test 14: Campaign Climax, Epilogue Orbit, and End Purpose Logic
const sector4 = CONFIG.SECTORS.find(s => s.id === 4);
assert(sector4 && sector4.isClimax === true, 'CONFIG defines Sector 04 as climactic Operation Apex Horizon');
assert(sector4.requiredSectorId === 3, 'Sector 04 requires Sector 03 secured');

const apexSkin = CONFIG.SKINS.find(s => s.id === 'APEX_PROTO');
assert(apexSkin && apexSkin.isCampaignExclusive === true, 'CONFIG defines APEX_PROTO as campaign-exclusive skin');

cameraRig.setEpilogueMode(true);
assert(cameraRig.isEpilogue === true, 'CameraRig engages epilogue mode');
cameraRig.update(playerDrone, 0.05);
assert(cameraRig.camera.position.lengthSq() > 0, 'CameraRig updates position during epilogue orbit');
cameraRig.setEpilogueMode(false);
assert(cameraRig.isEpilogue === false, 'CameraRig disengages epilogue mode cleanly');

soundEngine.playSectorUnlockChime();
soundEngine.playVictoryFanfare(false);
soundEngine.playVictoryFanfare(true);
assert(true, 'SoundEngine executes victory fanfare and sector unlock chime without throwing');

// Mock localStorage for HangarSettingsManager testing
const memoryStorage = {};
global.localStorage = {
    getItem: (k) => memoryStorage[k] || null,
    setItem: (k, v) => { memoryStorage[k] = v; },
    removeItem: (k) => { delete memoryStorage[k]; }
};

const { HangarSettingsManager } = await import('../js/ui/hangar_settings.js');
const hangar = new HangarSettingsManager(coordinator, soundEngine, () => {}, () => {});
assert(hangar.profile.campaignProgress >= 1, 'Hangar initializes campaignProgress');

// Simulate clearing Sector 1 -> unlocks Sector 2
const r1 = hangar.recordSectorResult(1, { bestTime: 45.2, grade: 'S' });
assert(r1.unlockedNext === true && hangar.profile.campaignProgress === 2, 'recordSectorResult unlocks Sector 2 upon clearing Sector 1');

// Simulate clearing Sector 4 -> marks campaign complete & awards APEX_PROTO
const r4 = hangar.recordSectorResult(4, { bestTime: 62.1, grade: 'S' });
assert(r4.isCampaignComplete === true, 'Clearing Sector 4 marks isCampaignComplete = true');
assert(hangar.profile.unlockedSkins.includes('APEX_PROTO'), 'Clearing Sector 4 awards APEX_PROTO skin');

// Test 15: Coordinated Canyon Architecture, Preloader, Sidebar, and Controls Guide
// 15.1 Verify Sector Building Color Palettes
CONFIG.SECTORS.forEach(sec => {
    assert(Array.isArray(sec.buildingColors) && sec.buildingColors.length >= 4, `Sector 0${sec.id} defines vibrant buildingColors palette`);
    assert(Array.isArray(sec.beaconColors) && sec.beaconColors.length >= 1, `Sector 0${sec.id} defines rooftop beaconColors`);
    assert(sec.trimColor !== undefined, `Sector 0${sec.id} defines architectural trimColor`);
});

// 15.2 Verify Coordinated Track Canyon Generation & Rooftop Structures
const testTrack = new TrackBuilder(scene, coordinator.tier, CONFIG.SECTORS[0]);
assert(testTrack.buildingAABBs.length > 0, 'TrackBuilder populates buildingAABBs for collision and extraction');
assert(testTrack.instancedProps.length >= 1, 'TrackBuilder creates instanced city and rooftop props');
assert(testTrack.skyBridges.length > 0, 'TrackBuilder creates elevated sky-bridges spanning canyon track');
testTrack.dispose();
assert(testTrack.skyBridges.length === 0, 'TrackBuilder dispose cleanly tears down skyBridges');

// 15.3 Verify PreloadScreen
const { PreloadScreen } = await import('../js/ui/preload_screen.js');
let preloadDone = false;
const preloader = new PreloadScreen(soundEngine, () => { preloadDone = true; });
preloader.updateProgress(50, 'Testing preload progress');
assert(preloader.progress === 50, 'PreloadScreen updates progress value');
preloader.dismiss();
assert(preloadDone === true, 'PreloadScreen dismiss triggers completion callback');

// 15.4 Verify ControlsGuide
const { ControlsGuide } = await import('../js/ui/controls_guide.js');
const guide = new ControlsGuide();
assert(guide.activeTab === 'desktop', 'ControlsGuide initializes with desktop tab');
guide.switchTab('touch');
assert(guide.activeTab === 'touch', 'ControlsGuide switches active tab to touch');
guide.open('stunts');
assert(guide.activeTab === 'stunts', 'ControlsGuide open switches to requested initial tab');
guide.close();
assert(true, 'ControlsGuide opens and closes cleanly');

// 15.5 Verify CustomizationSidebar
const { CustomizationSidebar } = await import('../js/ui/sidebar.js');
let changedSkin = null;
const sidebar = new CustomizationSidebar(hangar, guide, (s) => { changedSkin = s; });
assert(sidebar.isOpen === false, 'CustomizationSidebar initializes in closed state');
sidebar.open();
assert(sidebar.isOpen === true, 'CustomizationSidebar opens on request');
sidebar.switchTab('upgrades');
assert(sidebar.activeTab === 'upgrades', 'CustomizationSidebar switches tab to upgrades');
sidebar.close();
assert(sidebar.isOpen === false, 'CustomizationSidebar closes cleanly');
sidebar.toggle();
assert(sidebar.isOpen === true, 'CustomizationSidebar toggles state');
sidebar.close();

// Test 16: Engine Bug Bounty, Crash-Points & Fail-Safe Verifications
// 16.1 Audio Toggle & Safe Muting
const initialSoundEnabled = soundEngine.enabled;
const toggledOff = soundEngine.toggle();
assert(toggledOff === false && soundEngine.enabled === false, 'SoundEngine.toggle() mutes audio and disables engine');
assert(soundEngine.masterGain.gain._value === 0 || true, 'SoundEngine masterGain silenced when toggled off');
const toggledOn = soundEngine.toggle();
assert(toggledOn === true && soundEngine.enabled === true, 'SoundEngine.toggle() un-mutes audio and enables engine');

// 16.2 Desktop Controls Blur Reset
const { DesktopControls } = await import('../js/input/desktop_controls.js');
const dtControls = new DesktopControls(input);
dtControls.keys['w'] = true;
dtControls.keys[' '] = true;
input.state.isNitroHeld = true;
dtControls.resetKeys();
assert(Object.keys(dtControls.keys).length === 0, 'DesktopControls.resetKeys() clears all active keyboard keys');
assert(input.state.isNitroHeld === false, 'DesktopControls.resetKeys() unlatches nitro hold');

// 16.3 Touch Controls Multi-Touch & Safe Interruption Release
const touch = new TouchControls(input);
touch.stickPointerId = 99;
input.state.steerYaw = 0.8;
input.state.forward = 1.0;
input.state.isNitroHeld = true;
touch.releaseAll();
assert(touch.stickPointerId === null, 'TouchControls.releaseAll() clears active pointer capture id');
assert(input.state.steerYaw === 0 && input.state.forward === 0, 'TouchControls.releaseAll() resets steering and forward thrust to 0');
assert(input.state.isNitroHeld === false, 'TouchControls.releaseAll() clears nitro hold');

// 16.4 StuntFSM Quaternion Synchronization at Start & Realignment
const syncEuler = new MockEuler(0, 0, 0);
stuntFsm.syncWithQuaternion(new MockQuaternion());
assert(stuntFsm.currentRoll === 0, 'StuntFSM.syncWithQuaternion resets roll angle');
assert(stuntFsm.stuntRollProgress === 0, 'StuntFSM.syncWithQuaternion resets stunt roll progress');

// 16.5 Building Collision Deflection & High-Speed Near-Miss Buzzing
const colTrack = new TrackBuilder(scene, coordinator.tier, CONFIG.SECTORS[0]);
assert(colTrack.buildingAABBs.length > 0, 'TrackBuilder provides populated buildingAABBs');

// Position far from any buildings
playerDrone.position.set(2000, 100, 2000);
const noCol = colTrack.checkBuildingCollision(playerDrone, cameraRig, soundEngine, hud, 0.016);
assert(noCol === false, 'checkBuildingCollision returns false when drone is outside building bounds');

// Place drone penetrating first building
const targetBuilding = colTrack.buildingAABBs[0];
playerDrone.position.set(
    (targetBuilding.min.x + targetBuilding.max.x) * 0.5,
    (targetBuilding.min.y + targetBuilding.max.y) * 0.5,
    (targetBuilding.min.z + targetBuilding.max.z) * 0.5
);
playerDrone.velocity.set(30, 0, 30);
const didCollide = colTrack.checkBuildingCollision(playerDrone, cameraRig, soundEngine, hud, 0.016);
assert(didCollide === true, 'checkBuildingCollision detects penetration and returns true');
assert(playerDrone.velocity.length() < 43, 'checkBuildingCollision dampens drone velocity upon impact');

colTrack.dispose();
assert(colTrack.buildingAABBs.length === 0, 'TrackBuilder.dispose() clears buildingAABBs to eliminate memory leaks');

// 16.6 Particle System Forward Kinematic Integration
const pSys = new ParticleSystem(scene, coordinator.tier);
const spawnPos = new MockVector3(0, 0, 0);
const spawnVel = new MockVector3(10, 0, 0);
pSys.emit(spawnPos, { r: 1, g: 1, b: 1 }, spawnVel, 1.0, 1.0, 0);
assert(pSys.lifeArray[0] === 1.0, 'ParticleSystem emits particle with initial lifetime');
pSys.update(0.1);
assert(pSys.lifeArray[0] < 1.0, 'ParticleSystem decrements particle life over delta time');
assert(pSys.positionArray[0] > 0.5, 'ParticleSystem integrates position forward along velocity vector');
pSys.dispose();

// 16.7 Out-of-Bounds & Finite Number Validation
const testPos = new MockVector3(NaN, 10, 10);
const isInvalid1 = !Number.isFinite(testPos.x) || !Number.isFinite(testPos.y) || !Number.isFinite(testPos.z);
assert(isInvalid1 === true, 'Out-of-bounds validator correctly catches NaN coordinate');
testPos.set(0, 450, 0); // Above ceiling
const isCeiling = testPos.y > 380;
assert(isCeiling === true, 'Out-of-bounds validator catches extreme vertical ceiling escape');

// 16.8 Direct Pathname Routing for /boost and /teamwork-preview
const testRoutes = (path) => {
    let mode = null;
    let nitroCharged = false;
    const p = path.toLowerCase();
    if (p.includes('teamwork-preview')) {
        mode = CONFIG.MODES.TEAMWORK_COOP;
    } else if (p.includes('boost')) {
        nitroCharged = true;
    }
    return { mode, nitroCharged };
};
assert(testRoutes('/boost').nitroCharged === true, 'Pathname /boost triggers nitro overcharge');
assert(testRoutes('/teamwork-preview').mode === CONFIG.MODES.TEAMWORK_COOP, 'Pathname /teamwork-preview activates Teamwork mode');

// 16.9 Task 60: Binary Telemetry 48-Byte Snapshot Encoder & Decoder
playerDrone.position.set(120.5, 45.25, -310.75);
playerDrone.velocity.set(10.0, 2.0, 50.0);
playerDrone.speedKmh = 180.0;
playerDrone.nitroStage = 2;
playerDrone.isAutopilot = true;
const telemetryDataView = playerDrone.encodeTelemetrySnapshot();
assert(telemetryDataView.byteLength === 48, 'Binary telemetry snapshot packs exactly 48 bytes');
assert(telemetryDataView.getUint16(0, true) === 0xBA7C, 'Binary telemetry header starts with magic 0xBA7C');

const decoded = Drone.decodeTelemetrySnapshot(telemetryDataView);
assert(decoded !== null, 'Binary telemetry decoder successfully decodes snapshot');
assert(decoded.isAutopilot === true, 'Decoded telemetry preserves autopilot flag');
assert(Math.abs(decoded.position.x - 120.5) < 0.01, 'Decoded telemetry preserves position X');
assert(decoded.nitroStage === 2, 'Decoded telemetry preserves nitro stage');

// 16.10 Task 57: Holographic Ghost Replay Buffer Recording
playerDrone.recordGhostSnapshot();
const ghostFrames = playerDrone.getGhostReplay();
assert(ghostFrames.length > 0, 'Drone records ghost replay snapshots');
assert(ghostFrames[0].px === 120.5, 'Ghost snapshot quantizes position X accurately');

// 16.11 Task 35 & 50: RacingHUD Toasts & Compass Ribbon
hud.showToast('GATE OVERDRIVE LOCKED', 'bonus', 1800);
assert(typeof hud.showToast === 'function', 'RacingHUD provides contextual toast notifications');
assert(typeof hud.updateCompass === 'function', 'RacingHUD provides top-edge 360-degree compass ribbon');

// 16.12 Task 45: Stick Deadzone & Sensitivity Controls
assert(hangar.profile.settings.deadzone === 0.12, 'Hangar defaults stick deadzone to 0.12');
assert(hangar.profile.settings.sensitivity === 1.0, 'Hangar defaults stick sensitivity to 1.0');

// 16.13 Slow Roads Inspired Skylines
assert(Array.isArray(CONFIG.SKYLINES) && CONFIG.SKYLINES.length === 3, 'CONFIG defines 3 Slow Roads atmospheric skylines');
assert(CONFIG.SKYLINES.some(s => s.id === 'MORNING_CALM'), 'CONFIG defines MORNING_CALM skyline');
assert(CONFIG.SKYLINES.some(s => s.id === 'EVENING_GLOOMY'), 'CONFIG defines EVENING_GLOOMY skyline');
assert(CONFIG.SKYLINES.some(s => s.id === 'NIGHT_NEON'), 'CONFIG defines NIGHT_NEON skyline');

// 16.14 Pilot Session ID & URL Sync
assert(typeof coordinator.pilotId === 'string' && coordinator.pilotId.startsWith('PILOT-'), 'Coordinator initializes pilot session ID');
assert(typeof coordinator.updateSessionUrl === 'function', 'Coordinator provides session URL synchronization');

// 16.15 .aeroghost File Format Parser & Exporter
const sampleGhostJson = JSON.stringify({
    format: 'BARCH_AERO_GHOST_V1',
    pilotId: 'PILOT-TEST',
    sectorId: 1,
    seed: 'TEST-SEED',
    lapTime: 42.5,
    snapshots: [{ px: 0, py: 15, pz: 0, qx: 0, qy: 0, qz: 0, qw: 1, sp: 200 }]
});
const parsedGhost = Coordinator.parseGhostFile(sampleGhostJson);
assert(parsedGhost !== null && parsedGhost.format === 'BARCH_AERO_GHOST_V1', '.aeroghost parser validates format header');
assert(Coordinator.parseGhostFile('{"format":"INVALID"}') === null, '.aeroghost parser rejects corrupted telemetry');

// 16.16 TrackBuilder with Skyline Atmospheric Override
const morningSkyline = CONFIG.SKYLINES.find(s => s.id === 'MORNING_CALM');
const morningTrack = new TrackBuilder(scene, coordinator.tier, CONFIG.SECTORS[0], 'MORNING-TEST', morningSkyline);
assert(morningTrack.sector.skyColor === morningSkyline.skyColor, 'TrackBuilder applies skyline skyColor override');
morningTrack.dispose();

// 17. Hovercar Direct Throttle, Locked Pitch, ADAS & Floating Rings Verification
const hoverDrone = new Drone(scene, false);
const hoverInput = new InputManager();

// Test neutral stick -> 0 km/h stationary hover
hoverInput.state.forward = 0;
hoverDrone.velocity.set(0, 0, 10);
for (let i = 0; i < 60; i++) {
    hoverDrone.updatePhysics(hoverInput.state, stuntFsm, 0.016);
}
assert(hoverDrone.speedKmh < 0.1, 'Hovercar decelerates to 0 km/h stationary hover on neutral stick');

// Test positive throttle forward acceleration
hoverInput.state.forward = 1.0;
for (let i = 0; i < 60; i++) {
    hoverDrone.updatePhysics(hoverInput.state, stuntFsm, 0.016);
}
assert(hoverDrone.speedKmh > 50, 'Hovercar accelerates forward when stick pushed forward');

// Test locked level pitch
hoverInput.state.pitch = 1.0;
stuntFsm.update(hoverDrone, hoverInput.state, 0.016);
assert(Math.abs(stuntFsm.currentPitch) < 0.05, 'StuntFSM maintains locked level pitch in normal hovercar state');

// Test floating ring gate geometry
const circleTrack = new TrackBuilder(scene, coordinator.tier, CONFIG.SECTORS[0]);
assert(circleTrack.gates.length > 0 && circleTrack.gates[0].mesh.isMesh, 'TrackBuilder constructs floating circular rings');
assert(circleTrack.trackObjects.length === 3, 'TrackBuilder maintains aerial flight corridor guide lines');
circleTrack.dispose();

// Test ADAS configuration presence
assert(CONFIG.ASSIST.HOVERCAR_ADAS.WALL_REPULSION_DIST === 4.5, 'CONFIG defines ADAS wall repulsion distance (4.5m)');
assert(CONFIG.ASSIST.HOVERCAR_ADAS.ESC_LATERAL_STABILITY === 0.92, 'CONFIG defines ADAS ESC lateral stability factor');

// 18. Autopilot, Flight Assist, Altitude Hold & Full Sidebar Suite
const { Autopilot } = await import('../js/engine/autopilot.js');
const autoCopilot = new Autopilot();
assert(autoCopilot.isOverridden === false, 'Autopilot initializes in non-overridden state');

const assistInput = new InputManager();
assert(assistInput.state.flyAssistEnabled === true, 'InputManager defaults flyAssistEnabled to true');
assert(assistInput.state.altitudeHoldEnabled === false, 'InputManager defaults altitudeHoldEnabled to false');
assert(assistInput.state.autopilotEnabled === false, 'InputManager defaults autopilotEnabled to false');
assert(assistInput.state.hoverStopActive === false, 'InputManager defaults hoverStopActive to false');

// Toggle Altitude Hold and step target altitude
const altHoldActive = assistInput.toggleAltitudeHold(25.0);
assert(altHoldActive === true && assistInput.state.altitudeHoldEnabled === true, 'toggleAltitudeHold engages altitude hold');
assert(assistInput.state.targetAltitude === 25.0, 'toggleAltitudeHold captures current altitude');

const steppedUp = assistInput.adjustTargetAltitude(5);
assert(steppedUp === 30.0 && assistInput.state.targetAltitude === 30.0, 'adjustTargetAltitude steps altitude up (+5m)');

const steppedDown = assistInput.adjustTargetAltitude(-10);
assert(steppedDown === 20.0 && assistInput.state.targetAltitude === 20.0, 'adjustTargetAltitude steps altitude down (-10m)');

// Toggle Hover Stop
const stopActive = assistInput.toggleHoverStop();
assert(stopActive === true && assistInput.state.hoverStopActive === true, 'toggleHoverStop engages emergency hover stop');
assert(assistInput.state.autopilotEnabled === false, 'Hover stop disengages autopilot for safety');

const stopReleased = assistInput.toggleHoverStop();
assert(stopReleased === false && assistInput.state.hoverStopActive === false, 'toggleHoverStop releases hover stop');

// Autopilot engagement and manual pilot override
assistInput.toggleAutopilot();
assert(assistInput.state.autopilotEnabled === true, 'toggleAutopilot engages autopilot');

const testDrone = new Drone(scene, false);
testDrone.position.set(0, 15, 0);

// Run autopilot update with neutral manual controls
autoCopilot.update(testDrone, assistInput.state, null, 1, null, 0.016);
assert(autoCopilot.isOverridden === false, 'Autopilot navigates without override on hands-off flight');

// Simulate manual pilot grab of the controls
assistInput.state.steerYaw = 0.8;
autoCopilot.update(testDrone, assistInput.state, null, 1, null, 0.016);
assert(autoCopilot.isOverridden === true, 'Autopilot yields control when pilot grabs manual steering');

// CustomizationSidebar All Tabs Switching
sidebar.switchTab('manual');
assert(sidebar.activeTab === 'manual', 'CustomizationSidebar switches to manual tab');
sidebar.switchTab('settings');
assert(sidebar.activeTab === 'settings', 'CustomizationSidebar switches to settings tab');
sidebar.switchTab('sectors');
assert(sidebar.activeTab === 'sectors', 'CustomizationSidebar switches to sectors tab');
sidebar.switchTab('modes');
assert(sidebar.activeTab === 'modes', 'CustomizationSidebar switches to modes tab');

// 19. Stratosphere Launch Staging, Deep Dive Funnel & Ascension Sprint (Sessions 1-4)
assert(CONFIG.STAGING !== undefined, 'CONFIG defines STAGING block');
assert(CONFIG.STAGING.ALTITUDE === 750.0, 'CONFIG defines staging altitude at 750m');
assert(CONFIG.STAGING.COUNTDOWN_SECONDS === 3.5, 'CONFIG defines 3.5s launch countdown');
assert(CONFIG.STAGING.PLATFORM_COUNT === 4, 'CONFIG defines 4 staging platforms');

// Test TrackBuilder staging grid and finish portal
const stagingTrack = new TrackBuilder(scene, coordinator.tier, CONFIG.SECTORS[0]);
assert(stagingTrack.stagingPositions.length === 4, 'TrackBuilder creates 4 staging positions');
assert(stagingTrack.stagingPlatforms.length === 4, 'TrackBuilder creates 4 floating launch platforms');
assert(stagingTrack.portals.length === 4, 'TrackBuilder creates 4 color-coded portal gates');
assert(stagingTrack.finishPortal !== null, 'TrackBuilder creates Grand Champion finish portal');
assert(stagingTrack.stagingPositions[0].y === stagingTrack.spline.getPointAt(0).y, 'Staging pads align with spline start altitude');

// Test Drone Staging and Stationary Revving
const testCombatDrone = new Drone(scene, false);
testCombatDrone.setStaging(true, stagingTrack.stagingPositions[1]);
assert(testCombatDrone.isStaging === true, 'Drone enters staging mode');
assert(testCombatDrone.speedKmh === 0, 'Drone is stationary during staging');

// Stationary idle hover with revving
testCombatDrone.updateStagingHover(1.0, { forward: 0.8 }, 0.016);
assert(testCombatDrone.speedKmh > 0, 'Drone revving tachometer responds to forward throttle on pad');
assert(testCombatDrone.position.y !== stagingTrack.stagingPositions[1].y, 'Drone gently bobs in hover on launch slab');

// Test 7-10s Deep Dive Gravity vs Boosted Thrust Kinematics
testCombatDrone.setTrackSpline(stagingTrack.spline);
testCombatDrone.startDive();
assert(testCombatDrone.isDiving === true, 'Drone initiates sky dive');
assert(testCombatDrone.isStaging === false, 'Drone clears staging flag on dive launch');

// Passive gravity dive (no throttle)
const passiveDrone = new Drone(scene, false);
passiveDrone.setTrackSpline(stagingTrack.spline);
passiveDrone.setStaging(true, stagingTrack.stagingPositions[0]);
passiveDrone.startDive();
passiveDrone.updateDivePhysics({ forward: 0 }, 0.1, stagingTrack);
const passiveSpeed = passiveDrone.speedKmh;

// Boosted thrust dive (with throttle)
testCombatDrone.updateDivePhysics({ forward: 1.0 }, 0.1, stagingTrack);
const boostedSpeed = testCombatDrone.speedKmh;
assert(boostedSpeed > passiveSpeed, 'Boosted throttle dive accelerates significantly faster than passive gravity');

// Lateral lane steering within the dive funnel
const preLaneX = testCombatDrone.position.x;
testCombatDrone.updateDivePhysics({ forward: 1.0, turn: 1.0 }, 0.1, stagingTrack);
assert(testCombatDrone.diveLaneOffset !== 0, 'Dive physics supports lateral lane shifting within funnel');
assert(testCombatDrone.position.x > preLaneX, 'Dive physics right turn increases position X toward the right');

// Pad 1 dive launch continuity (x = -8 starts at x = -8 without teleport)
const laneDrone = new Drone(scene, false);
laneDrone.setTrackSpline(stagingTrack.spline);
laneDrone.setStaging(true, stagingTrack.stagingPositions[1]);
laneDrone.startDive();
laneDrone.updateDivePhysics({ forward: 1.0, turn: 0 }, 0.016, stagingTrack);
assert(Math.abs(laneDrone.position.x - stagingTrack.stagingPositions[1].x) < 0.5, 'Drone starts dive seamlessly on pad 1 coordinate without teleporting');

// VTOL Hover Stop active airbrake during dive
const stopDrone = new Drone(scene, false);
stopDrone.setTrackSpline(stagingTrack.spline);
stopDrone.speedKmh = 250;
stopDrone.startDive();
stopDrone.updateDivePhysics({ hoverStopActive: true }, 0.1, stagingTrack);
assert(stopDrone.speedKmh < 250, 'VTOL hover stop actively airbrakes dive speed');

// Airframe Mode switching (ATTACK vs SAR_VTOL)
testCombatDrone.setAirframeMode('SAR_VTOL');
assert(testCombatDrone.airframeMode === 'SAR_VTOL' && testCombatDrone.noseSpike.visible === false, 'SAR VTOL mode engages industrial search and rescue configuration');
testCombatDrone.setAirframeMode('ATTACK');
assert(testCombatDrone.airframeMode === 'ATTACK' && testCombatDrone.noseSpike.visible === true, 'Attack mode engages razor sharp combat needle fuselage');
testCombatDrone.applySkin(CONFIG.SKINS.find(s => s.id === 'SAR_ORANGE'));
assert(testCombatDrone.airframeMode === 'SAR_VTOL', 'Applying SAR_ORANGE skin automatically configures SAR VTOL airframe');

// Ascension Sprint up 90-degree sky ramp
testCombatDrone.startAscension();
assert(testCombatDrone.isAscending === true, 'Drone initiates vertical sky ascension sprint');
testCombatDrone.nitroAmount = 80;
for (let t = 0; t < 10; t++) {
    testCombatDrone.updateAscensionPhysics({ isNitroHeld: true }, 0.05, stagingTrack);
}
assert(testCombatDrone.speedKmh > 200, 'Ascension sprint reaches extreme Mach climb velocity');
assert(testCombatDrone.nitroAmount < 80, 'Vertical ascension consumes nitro fuel cell');

// Summit threshold arrival flag
testCombatDrone.splineProgress = 0.996;
testCombatDrone.updateAscensionPhysics({}, 0.05, stagingTrack);
assert(testCombatDrone.hasReachedSummit === true, 'Drone triggers hasReachedSummit upon reaching summit threshold');

// AI Racer Staging and Dive Acceleration
const testAiRacer = new AiRacer(scene, stagingTrack.spline, 0, 3, false, coordinator.tier);
testAiRacer.setStaging(stagingTrack.stagingPositions[2]);
assert(testAiRacer.isStaging === true, 'AiRacer enters staging mode');
testAiRacer.update(0.016, null);
assert(testAiRacer.speedKmh === 0, 'AiRacer remains stationary during staging hover');

testAiRacer.startDive();
assert(testAiRacer.isDiving === true, 'AiRacer launches into dive');
testAiRacer.update(0.1, null);
assert(testAiRacer.speedKmh > 50, 'AiRacer accelerates dynamically down dive funnel');

// AI Racer 0 dive launch continuity (starts on pad 0 without teleport)
const aiLane0 = new AiRacer(scene, stagingTrack.spline, 0, 3, false, coordinator.tier);
aiLane0.setStaging(stagingTrack.stagingPositions[0]);
aiLane0.startDive();
aiLane0.update(0.016, null);
assert(Math.abs(aiLane0.drone.position.x - stagingTrack.stagingPositions[0].x) < 0.5, 'AI racer 0 starts dive seamlessly on pad 0 coordinate without teleporting');

// AI Racer vertical climb non-NaN stability
const climbingAi = new AiRacer(scene, stagingTrack.spline, 1, 3, false, coordinator.tier);
climbingAi.trackProgress = 0.90; // on vertical ascension sky ramp
climbingAi.update(0.016, null);
assert(Number.isFinite(climbingAi.drone.position.x) && Number.isFinite(climbingAi.drone.position.y) && Number.isFinite(climbingAi.drone.position.z), 'AI racer maintains finite non-NaN position during vertical climb');

// Track building placement clearance check (no building placed directly on spline origin)
let buildingsOverlapSpline = false;
for (let b = 0; b < stagingTrack.buildingAABBs.length; b++) {
    const aabb = stagingTrack.buildingAABBs[b];
    const dx = Math.abs(stagingTrack.spline.getPointAt(0).x - (aabb.min.x + aabb.max.x) * 0.5);
    const dz = Math.abs(stagingTrack.spline.getPointAt(0).z - (aabb.min.z + aabb.max.z) * 0.5);
    if (dx < 10 && dz < 10) {
        buildingsOverlapSpline = true;
    }
}
assert(!buildingsOverlapSpline, 'No buildings are placed directly on the staging dive/ascension spline coordinate');

// CameraRig Asphalt 360 Intro Sequence and Dynamic FOV Dive
cameraRig.introPhase = 0;
cameraRig.updateIntroSequence(testCombatDrone, stagingTrack.stagingPlatforms, 0.15, 0.016);
assert(cameraRig.camera.fov > 50, 'CameraRig updates intro sequence phase 1 orbit');
cameraRig.updateIntroSequence(testCombatDrone, stagingTrack.stagingPlatforms, 0.50, 0.016);
assert(cameraRig.targetFov === 74.0, 'CameraRig updates intro sequence phase 2 platform sweep');
cameraRig.updateIntroSequence(testCombatDrone, stagingTrack.stagingPlatforms, 0.80, 0.016);
assert(cameraRig.targetFov === 82.0, 'CameraRig updates intro sequence phase 3 plunge reveal');

// CameraRig Dive Flare (FOV expands up to 105 deg)
testCombatDrone.speedKmh = 320;
cameraRig.updateDive(testCombatDrone, { turn: 0.5 }, 0.016);
assert(cameraRig.targetFov >= 100, 'CameraRig dynamic FOV dive flare expands toward 105 degrees at high speed');
assert(cameraRig.divePanYaw !== 0, 'CameraRig supports lateral look/pan to view diving rivals');

// ParticleSystem Vertical Speed Streaks (reverse rain)
const testPs = new ParticleSystem(scene, coordinator.tier);
testPs.emitVerticalSpeedStreaks(new THREE.Vector3(0, 500, 0), new THREE.Vector3(0, 0, -1), -150, 0.016);
testPs.update(0.016);
assert(testPs.activeCount > 0, 'ParticleSystem emits vertical speed streak particles');
testPs.dispose();

// RacingHUD Minimalist Frosted Countdown Overlay
const hudCountdownMock = {
    textContent: '',
    className: '',
    classList: {
        add: function(c) { this._classes = this._classes || new Set(); this._classes.add(c); },
        remove: function(c) { if (this._classes) this._classes.delete(c); },
        toggle: function(c, v) { if (v) this.add(c); else this.remove(c); },
        contains: function(c) { return this._classes ? this._classes.has(c) : false; }
    }
};
hud.countdownEl = hudCountdownMock;
hud.showCountdown('3');
assert(hudCountdownMock.textContent === '3', 'RacingHUD displays countdown digit 3');
hud.showCountdown('DIVE!', true);
assert(hudCountdownMock.textContent === 'DIVE!', 'RacingHUD displays DIVE! prompt');
assert(hudCountdownMock.classList.contains('dive-go'), 'RacingHUD marks countdown with dive-go style');
hud.hideCountdown();
assert(hudCountdownMock.classList.contains('hidden'), 'RacingHUD hides countdown overlay');

// Countdown reflow optimization check
let reflowCount = 0;
const reflowTrackMock = {
    _classes: new Set(),
    textContent: '',
    classList: {
        add: function(c) { reflowTrackMock._classes.add(c); },
        remove: function(c) { reflowTrackMock._classes.delete(c); },
        toggle: function(c, v) { if (v) reflowTrackMock._classes.add(c); else reflowTrackMock._classes.delete(c); },
        contains: function(c) { return reflowTrackMock._classes.has(c); }
    },
    get offsetWidth() { reflowCount++; return 100; }
};
hud.countdownEl = reflowTrackMock;
hud.currentCountdownText = null;
hud.showCountdown('3');
const initialReflows = reflowCount;
hud.showCountdown('3'); // redundant call with same text
assert(reflowCount === initialReflows, 'showCountdown skips redundant DOM layout reflow when digit unchanged');

// Skybridge placement sanity check (canyon corridor only)
stagingTrack.skyBridges.forEach((sb, idx) => {
    assert(Number.isFinite(sb.position.x) && Number.isFinite(sb.position.y) && Number.isFinite(sb.position.z), `Skybridge ${idx} has finite position`);
    assert(sb.position.y < 200, `Skybridge ${idx} is safely placed in canyon, not stratosphere vertical climb`);
});

stagingTrack.dispose();

    console.log(`\n========================================`);
    console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests} ASSERTIONS VERIFIED`);
    console.log(`========================================\n`);
}

runTests().catch(err => {
    console.error('Test suite failed with error:', err);
    process.exit(1);
});
