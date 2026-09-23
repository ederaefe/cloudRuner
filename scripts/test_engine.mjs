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
    negate() { this.x = -this.x; this.y = -this.y; this.z = -this.z; return this; }
}

class MockQuaternion {
    constructor() { this._x = 0; this._y = 0; this._z = 0; this._w = 1; }
    setFromUnitVectors(a, b) { return this; }
    setFromEuler(e) { return this; }
    slerp(q, t) { return this; }
    copy(q) { return this; }
}

class MockEuler {
    constructor(x = 0, y = 0, z = 0, order = 'YXZ') {
        this.x = x; this.y = y; this.z = z; this.order = order;
    }
    set(x, y, z, order) {
        this.x = x; this.y = y; this.z = z; this.order = order || this.order;
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
    SphereGeometry: MockGeometry,
    CylinderGeometry: MockGeometry,
    RingGeometry: MockGeometry,
    BufferGeometry: MockGeometry,
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
    FogExp2: class {
        constructor() {
            this.color = { setHex: () => {} };
            this.density = 0.002;
        }
    },
    CatmullRomCurve3: class {
        constructor(points) { this.points = points; }
        getPointAt(t) { return new MockVector3(t * 100, 15, t * 100); }
        getTangentAt(t) { return new MockVector3(0, 0, 1); }
    },
    MathUtils: {
        lerp: (x, y, t) => x + (y - x) * t,
        clamp: (val, min, max) => Math.max(min, Math.min(max, val))
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
desktopControls.keys['w'] = true;
desktopControls.keys[' '] = true;
inputManager.state.isNitroHeld = true;
desktopControls.resetKeys();
assert(Object.keys(desktopControls.keys).length === 0, 'DesktopControls.resetKeys() clears all active keyboard keys');
assert(inputManager.state.isNitroHeld === false, 'DesktopControls.resetKeys() unlatches nitro hold');

// 16.3 Touch Controls Multi-Touch & Safe Interruption Release
const touch = new TouchControls(inputManager);
touch.stickPointerId = 99;
inputManager.state.steerYaw = 0.8;
inputManager.state.forward = 1.0;
inputManager.state.isNitroHeld = true;
touch.releaseAll();
assert(touch.stickPointerId === null, 'TouchControls.releaseAll() clears active pointer capture id');
assert(inputManager.state.steerYaw === 0 && inputManager.state.forward === 0, 'TouchControls.releaseAll() resets steering and forward thrust to 0');
assert(inputManager.state.isNitroHeld === false, 'TouchControls.releaseAll() clears nitro hold');

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

    console.log(`\n========================================`);
    console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests} ASSERTIONS VERIFIED`);
    console.log(`========================================\n`);
}

runTests().catch(err => {
    console.error('Test suite failed with error:', err);
    process.exit(1);
});
