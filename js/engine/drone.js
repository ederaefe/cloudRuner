/*
================================================================================
BARCH AERO-CANYON RACING - INDUSTRIAL VTOL DRONE MESH & FLIGHT MODEL
Articulated tilt-rotors, carbon/orange search-and-rescue livery, and vector physics
================================================================================
*/

import { CONFIG } from '../config.js';
import { ParticleSystem } from './particle_system.js';

// Pre-allocated scratch objects to prevent garbage collection spikes
const _fwdVector = new THREE.Vector3();
const _exhaustDir = new THREE.Vector3();
const _exhaustPos = new THREE.Vector3();
const _downVector = new THREE.Vector3(0, -1, 0);
const _rayOrigin = new THREE.Vector3();
const _tangentScratch = new THREE.Vector3();
const _crossScratch = new THREE.Vector3();
const _quatScratch = new THREE.Quaternion();
const _rollQuatScratch = new THREE.Quaternion();
const _dirFwdUnit = new THREE.Vector3(0, 0, 1);
const _eulerScratch = new THREE.Euler(0, 0, 0, 'YXZ');

// Fixed-timestep simulation sub-stepping constants (Task 1)
const FIXED_DT = 1 / 120;
const MAX_ACCUMULATED_TIME = 0.1;

export class Drone {
    constructor(scene, isAi = false, aiColor = null, tier = null) {
        this.scene = scene;
        this.isAi = isAi;
        this.group = new THREE.Group();
        this.scene.add(this.group);

        // Kinematic flight state
        this.position = this.group.position;
        this.quaternion = this.group.quaternion;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.speedKmh = 0;
        this.nitroAmount = 40.0;
        this.nitroStage = 1;

        // Articulated components
        this.tiltNacelles = [];
        this.rotorDiscs = [];
        this.rotorMaterials = [];
        this.navStrobes = [];
        this.exhaustParticles = [];
        this.landingGear = [];

        // Particle system integration
        this.particleSystem = null;
        if (!isAi && tier) {
            this.particleSystem = new ParticleSystem(scene, tier);
        }

        // Animation state
        this.currentNacelleAngle = 0;
        this.targetNacelleAngle = 0;
        this.landingGearExtended = true;
        this.rotorBlurIntensity = 0;

        // Slow Roads Enhancement: Advanced flight & simulation state
        this.physicsAccumulator = 0;
        this.groundEffectLift = 0;
        this.isAutopilot = false;
        this.autopilotBlend = 0;
        this.isTurbulenceActive = false;
        this.realignmentCooldown = 0;
        this.trackSpline = null;
        this.spotlights = [];

        // Staging, Deep Dive & Ascension State
        this.isStaging = false;
        this.stagingBasePos = null;
        this.stagingTimer = 0;
        this.isDiving = false;
        this.diveTime = 0;
        this.diveProgress = 0;
        this.diveLaneOffset = 0;
        this.isAscending = false;
        this.hasReachedSummit = false;
        this.airframeMode = 'ATTACK';

        this.buildMesh(aiColor);
    }

    setAirframeMode(mode = 'ATTACK') {
        this.airframeMode = mode;
        const isSar = (mode === 'SAR_VTOL');
        if (this.noseSpike) {
            this.noseSpike.visible = !isSar;
        }
        if (this.fuselage) {
            this.fuselage.scale.set(isSar ? 1.4 : 1.25, isSar ? 0.65 : 0.55, 1.0);
        }
    }

    buildMesh(customColor) {
        const bodyColor = customColor || 0x1a2130;
        const accentColor = customColor ? 0xffffff : 0x00f0ff; // High-tech combat cyan

        this.matBody = new THREE.MeshStandardMaterial({
            color: bodyColor,
            roughness: 0.35,
            metalness: 0.65
        });

        this.matAccent = new THREE.MeshStandardMaterial({
            color: accentColor,
            roughness: 0.25,
            metalness: 0.8
        });

        const matCanopy = new THREE.MeshStandardMaterial({
            color: 0x0a1420,
            roughness: 0.1,
            metalness: 0.95
        });

        const matRotor = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.35
        });

        // 1. Futuristic Attack Combat Drone sharp needle fuselage
        const bodyGeo = new THREE.ConeGeometry(0.75, 5.2, 6);
        bodyGeo.rotateX(Math.PI / 2);
        const fuselage = new THREE.Mesh(bodyGeo, this.matBody);
        fuselage.scale.set(1.25, 0.55, 1.0);
        fuselage.castShadow = true;
        this.group.add(fuselage);
        this.fuselage = fuselage;

        // Razor stealth nose needle spike
        const noseSpikeGeo = new THREE.ConeGeometry(0.22, 2.0, 4);
        noseSpikeGeo.rotateX(Math.PI / 2);
        const noseSpike = new THREE.Mesh(noseSpikeGeo, this.matAccent);
        noseSpike.position.set(0, 0, 2.6);
        noseSpike.scale.set(0.6, 0.35, 1.0);
        this.group.add(noseSpike);
        this.noseSpike = noseSpike;

        // Cockpit canopy - narrow stealth facet
        const canopyGeo = new THREE.SphereGeometry(0.42, 8, 8);
        canopyGeo.scale(0.7, 0.45, 1.8);
        const canopy = new THREE.Mesh(canopyGeo, matCanopy);
        canopy.position.set(0, 0.26, 0.5);
        this.group.add(canopy);
        this.canopy = canopy;

        // 2. Swept Main Wings
        const wingShape = new THREE.Shape();
        wingShape.moveTo(0, 0.4);
        wingShape.lineTo(3.8, -0.6);
        wingShape.lineTo(3.4, -1.2);
        wingShape.lineTo(0, -0.4);
        wingShape.closePath();

        const wingGeoR = new THREE.ExtrudeGeometry(wingShape, { depth: 0.08, bevelEnabled: false });
        wingGeoR.rotateX(Math.PI / 2);
        const wingR = new THREE.Mesh(wingGeoR, this.matBody);
        wingR.castShadow = true;
        this.group.add(wingR);
        this.wingR = wingR;

        const mirrorGeometryWithCorrectNormals = (geo) => {
            const mirrored = geo.clone();
            mirrored.scale(-1, 1, 1);
            if (mirrored.index) {
                const idx = mirrored.index.array;
                for (let i = 0; i < idx.length; i += 3) {
                    const temp = idx[i];
                    idx[i] = idx[i + 2];
                    idx[i + 2] = temp;
                }
                mirrored.index.needsUpdate = true;
            }
            mirrored.computeVertexNormals();
            return mirrored;
        };

        const wingGeoL = mirrorGeometryWithCorrectNormals(wingGeoR);
        const wingL = new THREE.Mesh(wingGeoL, this.matBody);
        wingL.castShadow = true;
        this.group.add(wingL);
        this.wingL = wingL;

        // Articulated Forward Aerodynamic Canards (Sci-Fi Aero Flaps)
        const canardShape = new THREE.Shape();
        canardShape.moveTo(0, 0.2);
        canardShape.lineTo(1.1, -0.2);
        canardShape.lineTo(0.9, -0.45);
        canardShape.lineTo(0, -0.15);
        canardShape.closePath();

        const canardGeoR = new THREE.ExtrudeGeometry(canardShape, { depth: 0.04, bevelEnabled: false });
        canardGeoR.rotateX(Math.PI / 2);

        const canardGroupR = new THREE.Group();
        canardGroupR.position.set(0.65, 0.12, 0.85);
        const canardMeshR = new THREE.Mesh(canardGeoR, this.matAccent);
        canardMeshR.castShadow = true;
        canardGroupR.add(canardMeshR);
        this.group.add(canardGroupR);
        this.canardR = canardGroupR;

        const canardGroupL = new THREE.Group();
        canardGroupL.position.set(-0.65, 0.12, 0.85);
        const canardGeoL = mirrorGeometryWithCorrectNormals(canardGeoR);
        const canardMeshL = new THREE.Mesh(canardGeoL, this.matAccent);
        canardMeshL.castShadow = true;
        canardGroupL.add(canardMeshL);
        this.group.add(canardGroupL);
        this.canardL = canardGroupL;

        // 3. Wingtip Articulated Tilt-Rotor Nacelles (parented to wings to maintain kinematic continuity)
        const nacelleGeo = new THREE.CylinderGeometry(0.22, 0.24, 1.1, 12);
        nacelleGeo.rotateX(Math.PI / 2);

        const createNacelle = (parentWing, xPos) => {
            const nacGroup = new THREE.Group();
            nacGroup.position.set(xPos, 0, -0.6);

            const nacMesh = new THREE.Mesh(nacelleGeo, this.matAccent);
            nacGroup.add(nacMesh);

            // Rotor Disc
            const rotorGeo = new THREE.RingGeometry(0.05, 1.15, 24);
            const rotorMesh = new THREE.Mesh(rotorGeo, matRotor);
            rotorMesh.position.set(0, 0.05, 0.45);
            rotorMesh.rotation.x = -Math.PI / 2;
            nacGroup.add(rotorMesh);
            this.rotorDiscs.push(rotorMesh);
            this.rotorMaterials.push(rotorMesh.material);

            parentWing.add(nacGroup);
            this.tiltNacelles.push(nacGroup);
        };

        createNacelle(wingR, 3.7);
        createNacelle(wingL, -3.7);

        // 4. Twin Angled Tail Fins
        const finGeo = new THREE.BoxGeometry(0.08, 0.9, 0.8);
        const finR = new THREE.Mesh(finGeo, this.matAccent);
        finR.position.set(0.75, 0.5, -1.8);
        finR.rotation.z = -0.35;
        finR.rotation.y = -0.1;
        this.group.add(finR);
        this.finR = finR;

        const finL = new THREE.Mesh(finGeo, this.matAccent);
        finL.position.set(-0.75, 0.5, -1.8);
        finL.rotation.z = 0.35;
        finL.rotation.y = 0.1;
        this.group.add(finL);
        this.finL = finL;

        // 4b. Active Aerodynamic Speedbrake Spoiler Flaps
        const airbrakeGeo = new THREE.BoxGeometry(0.55, 0.06, 0.48);
        airbrakeGeo.translate(0, 0, -0.24); // Pivot from leading edge

        const flapGroupR = new THREE.Group();
        flapGroupR.position.set(0.48, 0.28, -0.6);
        const flapMeshR = new THREE.Mesh(airbrakeGeo, this.matAccent);
        flapMeshR.castShadow = true;
        flapGroupR.add(flapMeshR);
        this.group.add(flapGroupR);
        this.airbrakeFlapR = flapGroupR;

        const flapGroupL = new THREE.Group();
        flapGroupL.position.set(-0.48, 0.28, -0.6);
        const flapMeshL = new THREE.Mesh(airbrakeGeo, this.matAccent);
        flapMeshL.castShadow = true;
        flapGroupL.add(flapMeshL);
        this.group.add(flapGroupL);
        this.airbrakeFlapL = flapGroupL;
        this.airbrakeDeployAngle = 0.0;

        // 5. Navigation Strobe Light (Blinking white/red)
        const strobeLight = new THREE.PointLight(0xff3333, 1.2, 8);
        strobeLight.position.set(0, 0.4, -2.0);
        this.group.add(strobeLight);
        this.navStrobes.push(strobeLight);

        // Thruster glow point light
        this.thrustGlow = new THREE.PointLight(0xE8580A, 2.0, 12);
        this.thrustGlow.position.set(0, 0, -2.2);
        this.group.add(this.thrustGlow);

        // Booster exhaust flame geometry (/boost)
        const exhaustGeo = new THREE.ConeGeometry(0.35, 2.4, 8);
        exhaustGeo.rotateX(-Math.PI / 2);
        exhaustGeo.translate(0, 0, -1.2);
        const exhaustMat = new THREE.MeshBasicMaterial({
            color: 0xE8580A,
            transparent: true,
            opacity: 0.0,
            blending: THREE.AdditiveBlending
        });
        this.exhaustMesh = new THREE.Mesh(exhaustGeo, exhaustMat);
        this.exhaustMesh.visible = false;
        this.group.add(this.exhaustMesh);

        // Supersonic Shock Diamond Core
        const coreGeo = new THREE.ConeGeometry(0.18, 1.6, 8);
        coreGeo.rotateX(-Math.PI / 2);
        coreGeo.translate(0, 0, -0.8);
        const coreMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        this.exhaustCore = new THREE.Mesh(coreGeo, coreMat);
        this.exhaustCore.visible = false;
        this.group.add(this.exhaustCore);

        // 6. Landing Gear (animated based on speed)
        this.createLandingGear();

        // 7. Dual Retractable High-Intensity Forward Spotlights (Task 25)
        const spotMatTargetL = new THREE.Object3D();
        spotMatTargetL.position.set(-0.8, -0.2, 35);
        this.group.add(spotMatTargetL);
        const spotL = new THREE.SpotLight(0xaaccff, 2.2, 140, Math.PI / 7, 0.45, 1.2);
        spotL.position.set(-0.7, 0.1, 1.5);
        spotL.target = spotMatTargetL;
        this.group.add(spotL);

        const spotMatTargetR = new THREE.Object3D();
        spotMatTargetR.position.set(0.8, -0.2, 35);
        this.group.add(spotMatTargetR);
        const spotR = new THREE.SpotLight(0xaaccff, 2.2, 140, Math.PI / 7, 0.45, 1.2);
        spotR.position.set(0.7, 0.1, 1.5);
        spotR.target = spotMatTargetR;
        this.group.add(spotR);

        this.spotlights = [spotL, spotR];
    }

    createLandingGear() {
        const gearMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a35,
            roughness: 0.6,
            metalness: 0.4
        });

        // Front landing gear
        const frontGearGroup = new THREE.Group();
        frontGearGroup.position.set(0, -0.8, 1.8);
        
        const frontStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.8, 8), gearMat);
        frontStrut.rotation.x = Math.PI / 6;
        frontGearGroup.add(frontStrut);

        const frontWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 12), gearMat);
        frontWheel.rotation.x = Math.PI / 2;
        frontWheel.position.set(0, -0.3, 0.2);
        frontGearGroup.add(frontWheel);

        this.group.add(frontGearGroup);
        this.landingGear.push(frontGearGroup);

        // Rear landing gear (left)
        const rearGearL = new THREE.Group();
        rearGearL.position.set(1.2, -0.8, -1.2);
        
        const rearStrutL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.7, 8), gearMat);
        rearStrutL.rotation.x = Math.PI / 8;
        rearGearL.add(rearStrutL);

        const rearWheelL = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 12), gearMat);
        rearWheelL.rotation.x = Math.PI / 2;
        rearWheelL.position.set(0, -0.25, 0.15);
        rearGearL.add(rearWheelL);

        this.group.add(rearGearL);
        this.landingGear.push(rearGearL);

        // Rear landing gear (right)
        const rearGearR = new THREE.Group();
        rearGearR.position.set(-1.2, -0.8, -1.2);
        
        const rearStrutR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.7, 8), gearMat);
        rearStrutR.rotation.x = Math.PI / 8;
        rearGearR.add(rearStrutR);

        const rearWheelR = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 12), gearMat);
        rearWheelR.rotation.x = Math.PI / 2;
        rearWheelR.position.set(0, -0.25, 0.15);
        rearGearR.add(rearWheelR);

        this.group.add(rearGearR);
        this.landingGear.push(rearGearR);

        // Scale drone down — it should feel small and nimble against a vast open world
        this.group.scale.set(0.45, 0.45, 0.45);
    }

    applySkin(skin) {
        if (!skin) return;
        this.matBody.color.setHex(skin.bodyColor);
        this.matAccent.color.setHex(skin.accentColor);
        if (this.thrustGlow) this.thrustGlow.color.setHex(skin.glowColor);
        if (skin.id === 'SAR_ORANGE') {
            this.setAirframeMode('SAR_VTOL');
        } else {
            this.setAirframeMode('ATTACK');
        }
    }

    applyUpgrades(stats) {
        if (!stats) return;
        if (stats.maxSpeed) this.maxSpeedKmh = stats.maxSpeed;
        if (stats.nitroMax) this.nitroMaxCapacity = stats.nitroMax;
    }

    setTrackSpline(spline) {
        this.trackSpline = spline;
    }

    toggleAutopilot() {
        this.isAutopilot = !this.isAutopilot;
        this.autopilotBlend = this.isAutopilot ? 1.0 : 0.0;
        if (typeof window !== 'undefined' && window._inputManager && window._inputManager.state) {
            window._inputManager.state.autopilotEnabled = this.isAutopilot;
            if (this.isAutopilot) {
                window._inputManager.state.hoverStopActive = false;
            }
        }
        return this.isAutopilot;
    }

    toggleSpotlights(forceState = null) {
        const nextState = forceState !== null ? forceState : !this.spotlights[0]?.visible;
        this.spotlights.forEach(spot => {
            if (spot) spot.visible = nextState;
        });
        return nextState;
    }

    updatePhysics(inputState, stuntFsm, frameDt, trackBuilder = null) {
        if (!frameDt || Number.isNaN(frameDt)) return;
        const safeDt = Math.min(frameDt, MAX_ACCUMULATED_TIME);
        this.physicsAccumulator += safeDt;

        // Record steering input for smooth aerodynamic body transformation
        this.currentSteer = (typeof inputState.steerYaw === 'number')
            ? inputState.steerYaw
            : ((typeof inputState.turn === 'number') ? inputState.turn : 0);
        this.lastInputState = inputState;

        // Substep physics loop (Task 1: Fixed-Timestep Accumulator at 120 Hz)
        while (this.physicsAccumulator >= FIXED_DT) {
            this.stepPhysics(inputState, stuntFsm, FIXED_DT, trackBuilder);
            this.physicsAccumulator -= FIXED_DT;
        }

        // Post-substep visual animations using actual frame delta
        this.updateVisualEffects(frameDt);
    }

    setStaging(active, basePos = null) {
        this.isStaging = active;
        if (basePos) {
            this.stagingBasePos = basePos.clone();
            this.position.copy(basePos);
        }
        this.velocity.set(0, 0, 0);
        this.speedKmh = 0;
        this.isDiving = false;
        this.isAscending = false;
        this.diveProgress = 0;
        this.diveLaneOffset = 0;
        this.stagingTimer = 0;
    }

    updateStagingHover(time, inputState, dt) {
        if (!this.stagingBasePos) return;
        const bob = Math.sin(time * 3.5) * 0.16;
        this.position.set(this.stagingBasePos.x, this.stagingBasePos.y + bob, this.stagingBasePos.z);
        const fwd = (inputState && typeof inputState.forward === 'number') ? inputState.forward : 0;
        const targetPitch = fwd > 0.05 ? -0.09 * Math.min(1.0, fwd * 1.5) : 0.0;
        _eulerScratch.set(targetPitch, 0, 0, 'YXZ');
        this.quaternion.setFromEuler(_eulerScratch);
        this.velocity.set(0, 0, 0);
        this.speedKmh = fwd > 0.05 ? fwd * 45 : 0; // revving tachometer indicator

        if (this.thrustGlow) {
            this.thrustGlow.intensity = fwd > 0.05 ? 1.8 : 0.5;
        }
        if (this.exhaustMesh) {
            this.exhaustMesh.visible = fwd > 0.05;
            if (fwd > 0.05) {
                this.exhaustMesh.scale.set(0.8, 0.8, 0.6 + Math.random() * 0.4);
            }
        }
    }

    startDive() {
        this.isStaging = false;
        this.isDiving = true;
        this.diveTime = 0;
        this.diveProgress = 0.001;
        this.diveLaneOffset = (this.stagingBasePos ? (this.stagingBasePos.x - (this.trackSpline?.getPointAt(0).x || 0)) : 0);
    }

    abortDiveToStraightaway() {
        if (!this.isDiving) return;
        this.isDiving = false;
        this.splineProgress = 0.27;
        const curSpeed = Math.max(this.speedKmh / 3.6, 60.0);
        this.supercruiseSpeedMs = curSpeed;
        if (this.trackSpline) {
            const currentTan = this.trackSpline.getTangentAt(0.27).normalize();
            this.velocity.copy(currentTan).multiplyScalar(curSpeed);
        }
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('SET_DIVE_COMPLETE'));
        }
    }

    updateDivePhysics(inputState, dt, trackBuilder) {
        const spline = this.trackSpline || trackBuilder?.spline;
        if (!spline) return;

        this.diveTime = (this.diveTime || 0) + dt;
        const rawForward = (inputState && typeof inputState.forward === 'number') ? inputState.forward : 0;
        const isThrottling = rawForward > 0.05;

        // Kinematics: 13-second Stratosphere Plunge Accelerator Zone
        // In the dive funnel corridor, gravitational acceleration propels the craft downward up to 320 km/h
        const gravityAcc = 18.0; // m/s^2 calibrated for sustained 13-second descent
        const thrustAcc = isThrottling ? (32.0 + rawForward * 16.0) : 0.0;
        const totalAcc = gravityAcc + thrustAcc;

        let currentSpeedMs = this.speedKmh / 3.6;
        const maxDiveSpeedMs = isThrottling ? (320.0 / 3.6) : (210.0 / 3.6);
        currentSpeedMs = Math.min(maxDiveSpeedMs, currentSpeedMs + totalAcc * dt);

        // VTOL Emergency Hover Stop during dive: airbrake to controlled hover descent (~65 km/h)
        if (inputState && inputState.hoverStopActive) {
            const targetAirbrakeSpeed = 65.0 / 3.6;
            currentSpeedMs = THREE.MathUtils.lerp(currentSpeedMs, targetAirbrakeSpeed, dt * 5.0);
            this.targetNacelleAngle = Math.PI / 2.0;
            this.landingGearExtended = true;
        }

        this.speedKmh = currentSpeedMs * 3.6;

        // Progress along dive funnel calibrated for full 13-second stratosphere descent
        const funnelLengthMeters = 1080.0;
        const deltaProgress = (currentSpeedMs * dt) / funnelLengthMeters * 0.27;
        this.diveProgress = (this.diveProgress || 0) + deltaProgress;

        const clampedT = Math.min(0.32, Math.max(0.001, this.diveProgress));
        const currentPt = spline.getPointAt(clampedT);
        const currentTan = spline.getTangentAt(clampedT).normalize();

        // Full manual lateral lane steering authority within the dive funnel (+- 24m)
        const turnInput = (inputState && typeof inputState.turn === 'number') ? inputState.turn : 0;
        this.diveLaneOffset = (this.diveLaneOffset || 0) + turnInput * dt * 28.0;
        this.diveLaneOffset = THREE.MathUtils.clamp(this.diveLaneOffset, -24.0, 24.0);

        // Right-hand horizontal lateral vector: (0, 1, 0) x currentTan -> points along +X (Right)
        _crossScratch.crossVectors(new THREE.Vector3(0, 1, 0), currentTan);
        if (_crossScratch.lengthSq() < 0.001) {
            _crossScratch.set(1, 0, 0);
        } else {
            _crossScratch.normalize();
        }
        this.position.copy(currentPt).addScaledVector(_crossScratch, this.diveLaneOffset);

        // Orient along dive tangent with banking roll
        _quatScratch.setFromUnitVectors(_dirFwdUnit, currentTan);
        const bankAngle = -turnInput * 0.42;
        if (typeof _rollQuatScratch.setFromAxisAngle === 'function') {
            _rollQuatScratch.setFromAxisAngle(_dirFwdUnit, bankAngle);
            if (typeof this.quaternion.multiply === 'function') {
                this.quaternion.copy(_quatScratch).multiply(_rollQuatScratch);
            } else {
                this.quaternion.copy(_quatScratch);
            }
        } else {
            this.quaternion.copy(_quatScratch);
        }

        this.velocity.copy(currentTan).multiplyScalar(currentSpeedMs);

        // Transition from dive into flat straightaway when y <= 32m or t >= 0.27
        if (currentPt.y <= 32.0 || this.diveProgress >= 0.27) {
            this.isDiving = false;
            this.splineProgress = 0.27; // enter straightaway
            // Conserve full dive kinetic momentum along the straightaway forward vector
            const fullDiveSpeedMs = Math.max(this.velocity.length(), currentSpeedMs);
            this.supercruiseSpeedMs = fullDiveSpeedMs;
            this.velocity.copy(currentTan).multiplyScalar(fullDiveSpeedMs);
            this.speedKmh = fullDiveSpeedMs * 3.6;
            if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
                window.dispatchEvent(new CustomEvent('SET_DIVE_COMPLETE'));
            }
        }
    }

    startAscension() {
        this.isAscending = true;
        this.hasReachedSummit = false;
    }

    updateAscensionPhysics(inputState, dt, trackBuilder) {
        const spline = this.trackSpline || trackBuilder?.spline;
        if (!spline) return;

        // Rocket sprint up vertical sky-ramp: speed builds with nitro
        const nitroRatio = Math.min(1.0, (this.nitroAmount || 0) / 60.0);
        const boostHeld = inputState && inputState.isNitroHeld;
        const maxClimbKmh = boostHeld ? 340.0 : (240.0 + nitroRatio * 60.0);
        this.speedKmh = THREE.MathUtils.lerp(this.speedKmh, maxClimbKmh, dt * 3.5);

        const currentSpeedMs = this.speedKmh / 3.6;
        const climbDistMeters = 850.0;
        const deltaT = (currentSpeedMs * dt) / climbDistMeters * 0.20;
        this.splineProgress = ((this.splineProgress || 0.82) + deltaT) % 1.0;

        const currentPt = spline.getPointAt(this.splineProgress);
        const currentTan = spline.getTangentAt(this.splineProgress).normalize();

        this.position.copy(currentPt);
        _quatScratch.setFromUnitVectors(new THREE.Vector3(0, 0, 1), currentTan);
        this.quaternion.copy(_quatScratch);
        this.velocity.copy(currentTan).multiplyScalar(currentSpeedMs);

        // Burn nitro during vertical ascension
        if (this.nitroAmount > 0) {
            this.nitroAmount = Math.max(0, this.nitroAmount - 12.0 * dt);
            this.nitroStage = 3;
        }

        if (this.position.y >= 740.0) {
            this.hasReachedSummit = true;
            this.isAscending = false;
        }
    }

    stepPhysics(inputState, stuntFsm, dt, trackBuilder = null) {
        if (this.isStaging) {
            this.stagingTimer = (this.stagingTimer || 0) + dt;
            this.updateStagingHover(this.stagingTimer, inputState, dt);
            return;
        }

        if (this.isDiving) {
            this.updateDivePhysics(inputState, dt, trackBuilder);
            return;
        }

        if (this.isAscending) {
            this.updateAscensionPhysics(inputState, dt, trackBuilder);
            return;
        }

        // Automatic ascension ramp trigger near track terminus
        if (this.splineProgress >= 0.83 && this.position.y >= 45.0) {
            this.startAscension();
            this.updateAscensionPhysics(inputState, dt, trackBuilder);
            return;
        }

        const flightCfg = CONFIG.FLIGHT;
        const nitroCfg = CONFIG.NITRO;
        const maxNitro = this.nitroMaxCapacity || nitroCfg.MAX_CAPACITY;
        const maxCruiseSpeed = this.maxSpeedKmh || flightCfg.MAX_CRUISE_SPEED;

        // Task 9: Autopilot ("Zen Flight") Input Integration
        const hasManualSteering = Math.abs(inputState.turn || 0) > 0.08 ||
                                  Math.abs(inputState.pitch || 0) > 0.08 ||
                                  Math.abs(inputState.roll || 0) > 0.08;

        if (hasManualSteering && (this.isAutopilot || inputState.autopilotEnabled)) {
            // Disengage autopilot on player intervention with smooth handoff
            this.isAutopilot = false;
            inputState.autopilotEnabled = false;
        }

        // Keep this.isAutopilot bidirectionally synchronized with inputState.autopilotEnabled
        if (typeof inputState.autopilotEnabled === 'boolean') {
            this.isAutopilot = inputState.autopilotEnabled;
        } else if (this.isAutopilot) {
            inputState.autopilotEnabled = true;
        }

        if (this.isAutopilot) {
            this.autopilotBlend = Math.min(1.0, this.autopilotBlend + dt * 2.5);
        } else {
            this.autopilotBlend = Math.max(0.0, this.autopilotBlend - dt * 3.0);
        }

        // Nitro management & Hyper-Overdrive latching (/boost)
        if (inputState.isNitroHeld && this.nitroAmount > 0) {
            if (this.isHyperLocked || this.nitroAmount >= nitroCfg.STAGE3_SWEET_SPOT_MIN) {
                this.isHyperLocked = true;
                this.nitroStage = 3; // Hyper-Overdrive
                this.nitroAmount = Math.max(0, this.nitroAmount - nitroCfg.STAGE3_DRAIN_RATE * dt);
            } else {
                this.nitroStage = 2; // Afterburner
                this.nitroAmount = Math.max(0, this.nitroAmount - nitroCfg.STAGE2_DRAIN_RATE * dt);
            }
        } else {
            this.isHyperLocked = false;
            this.nitroStage = 1;
            // Passive recharge
            this.nitroAmount = Math.min(maxNitro, this.nitroAmount + nitroCfg.NATURAL_RECHARGE_RATE * dt);
        }

        // Determine target hovercar speed — apply cubic curve for progressive, breathing acceleration
        let targetSpeedKmh = 0.0;
        const rawForward = (typeof inputState.forward === 'number') ? inputState.forward : 0;
        // Raise input to power 1.7: gentle start, strong top-end push (sign-preserving)
        const forwardInput = rawForward >= 0
            ? Math.pow(rawForward, 1.7)
            : -Math.pow(-rawForward, 1.7);

        if (inputState.hoverStopActive) {
            targetSpeedKmh = 0.0;
            const decelDamp = Math.max(0, 1.0 - (CONFIG.ASSIST?.HOVER_STOP?.DECEL_RATE || 160.0) * dt / 22.0);
            this.velocity.multiplyScalar(decelDamp);
            if (this.velocity.length() < 0.15) this.velocity.set(0, 0, 0);
            this.targetNacelleAngle = Math.PI / 2.0;
            this.landingGearExtended = true;
        } else if (this.nitroStage === 3 && rawForward >= 0) {
            targetSpeedKmh = flightCfg.STAGE3_BOOST_SPEED;
        } else if (this.nitroStage === 2 && rawForward >= 0) {
            targetSpeedKmh = flightCfg.STAGE2_BOOST_SPEED;
        } else if (forwardInput > 0) {
            targetSpeedKmh = maxCruiseSpeed * Math.min(1.0, forwardInput);
        } else if (forwardInput < 0) {
            targetSpeedKmh = -flightCfg.REVERSE_SPEED * Math.min(1.0, Math.abs(forwardInput));
        } else {
            targetSpeedKmh = 0.0;
        }

        if (this.isTurbulenceActive) {
            targetSpeedKmh *= 0.78;
            // Physical aerodynamic buffeting in atmospheric turbulence pockets (PHY-26)
            const turbTime = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.005;
            const turbRoll = Math.sin(turbTime * 3.1) * 0.05 + Math.cos(turbTime * 5.4) * 0.025;
            const turbPitch = Math.cos(turbTime * 2.7) * 0.035;
            const turbYaw = Math.sin(turbTime * 1.8) * 0.02;
            if (stuntFsm) {
                stuntFsm.currentRoll += turbRoll * dt * 6.0;
                stuntFsm.currentPitch += turbPitch * dt * 6.0;
                stuntFsm.currentYaw += turbYaw * dt * 4.0;
            }
            this.velocity.y += Math.sin(turbTime * 4.0) * 2.8 * dt;
        }

        // Aerodynamic drift slip modulation during hard braking turns
        const rawSteer = (typeof inputState.steerYaw === 'number') ? inputState.steerYaw : (inputState.turn || 0);
        const isBrakingTurn = (rawForward < -0.1) && (Math.abs(rawSteer) > 0.35) && (this.speedKmh > 80.0);

        // Let Stunt FSM modulate speed and orientation
        stuntFsm.update(this, inputState, dt);

        if (!stuntFsm.isCobraActive() && !inputState.hoverStopActive) {
            const targetSpeedMs = targetSpeedKmh / 3.6;
            _fwdVector.set(0, 0, 1).applyQuaternion(this.quaternion);

            let currentSpeedMs = this.velocity.dot(_fwdVector);
            if (!Number.isFinite(currentSpeedMs)) currentSpeedMs = 0;

            const isAccelerating = (targetSpeedMs >= 0 && targetSpeedMs > currentSpeedMs) || (targetSpeedMs < 0 && targetSpeedMs < currentSpeedMs);
            const rate = isAccelerating ? flightCfg.ACCELERATION : flightCfg.BRAKING_DECEL;
            const speedStep = rate * dt;
            let newSpeedMs = currentSpeedMs;

            if (targetSpeedMs > currentSpeedMs) {
                newSpeedMs = Math.min(targetSpeedMs, currentSpeedMs + speedStep);
            } else if (targetSpeedMs < currentSpeedMs) {
                // If pilot is holding forward throttle (> 0.05) and exceeding standard cruise (e.g. from dive or boost),
                // prevent aggressive braking decel; apply only gentle quadratic aerodynamic drag
                if (rawForward > 0.05 && currentSpeedMs > targetSpeedMs) {
                    const aeroDrag = 0.04 * (currentSpeedMs / 50.0) * dt;
                    newSpeedMs = Math.max(targetSpeedMs, currentSpeedMs - aeroDrag);
                } else {
                    newSpeedMs = Math.max(targetSpeedMs, currentSpeedMs - speedStep);
                }
            }

            if (Math.abs(newSpeedMs) < 0.08 && Math.abs(rawForward) < 0.05 && this.nitroStage === 1) {
                newSpeedMs = 0;
            }

            // Newtonian Momentum Accumulator & Centrifugal Slip (PHY-21)
            const savedVy = this.velocity.y;
            const currentFwdMag = this.velocity.dot(_fwdVector);

            // Lateral drift component relative to craft forward heading
            _tangentScratch.copy(this.velocity).addScaledVector(_fwdVector, -currentFwdMag);
            _tangentScratch.y = 0;

            // Aerodynamic grip dampens lateral slide
            const gripRate = isBrakingTurn ? (CONFIG.FLIGHT?.AERO_DRIFT_FACTOR || 0.45) * 8.0 : 8.5;
            this.velocity.addScaledVector(_tangentScratch, -gripRate * dt);

            // Forward thrust acceleration along craft heading
            const deltaFwd = newSpeedMs - currentFwdMag;
            this.velocity.addScaledVector(_fwdVector, Math.sign(deltaFwd) * Math.min(Math.abs(deltaFwd), rate * dt * 2.5));
            this.velocity.y = savedVy;
        }

        // ADAS: Electronic Stability Control (ESC) - dampens lateral hover slide
        const adasCfg = CONFIG.ASSIST?.HOVERCAR_ADAS || {
            ESC_LATERAL_STABILITY: 0.92,
            WALL_REPULSION_DIST: 4.5,
            WALL_REPULSION_FORCE: 35.0,
            GATE_MAGNETISM_DIST: 28.0,
            GATE_MAGNETISM_FORCE: 14.0,
            AUTO_ELEVATION_RATE: 6.0,
            HOVER_HEIGHT_DEFAULT: 22.0,
            LANE_ASSIST_FORCE: 5.5,
            LANE_ASSIST_DIST: 60.0,
            TRACK_ALIGN_GAIN: 0.28
        };

        const driftFactor = isBrakingTurn ? (CONFIG.FLIGHT?.AERO_DRIFT_FACTOR || 0.45) : 1.0;

        if (stuntFsm && typeof stuntFsm.isDriftActive === 'function' ? !stuntFsm.isDriftActive() : true) {
            _fwdVector.set(0, 0, 1).applyQuaternion(this.quaternion);
            const fwdMag = this.velocity.dot(_fwdVector);
            _tangentScratch.copy(_fwdVector).multiplyScalar(fwdMag);
            _tangentScratch.y = this.velocity.y;
            this.velocity.lerp(_tangentScratch, dt * (adasCfg.ESC_LATERAL_STABILITY * 12.0 * driftFactor));
        }

        // ADAS: Spline Centerline Tracking & Adaptive Path Alignment
        const trackSpline = this.trackSpline || trackBuilder?.spline;
        if (trackSpline && this.velocity.length() > 0.5 && !stuntFsm.isDriftActive?.()) {
            // Local continuous search around current progress (prevents loop-jumping jitter)
            let nearestT = this.splineProgress || 0;
            let nearestDistSq = Infinity;
            const localRange = 0.08;
            const localSteps = 32;
            for (let si = 0; si <= localSteps; si++) {
                const t = ((nearestT - localRange + (si / localSteps) * (localRange * 2)) % 1.0 + 1.0) % 1.0;
                const pt = trackSpline.getPointAt(t);
                const dSq = typeof this.position.distanceToSquared === 'function'
                    ? this.position.distanceToSquared(pt)
                    : Math.pow(this.position.distanceTo(pt), 2);
                if (dSq < nearestDistSq) { nearestDistSq = dSq; nearestT = t; }
            }
            // Coarse global recovery fallback if displaced far off track
            if (nearestDistSq > 150 * 150) {
                for (let si = 0; si < 20; si++) {
                    const t = si / 20;
                    const pt = trackSpline.getPointAt(t);
                    const dSq = typeof this.position.distanceToSquared === 'function'
                        ? this.position.distanceToSquared(pt)
                        : Math.pow(this.position.distanceTo(pt), 2);
                    if (dSq < nearestDistSq) { nearestDistSq = dSq; nearestT = t; }
                }
            }
            this.splineProgress = nearestT;

            const laneRadius = adasCfg.LANE_ASSIST_DIST || 60.0;
            if (nearestDistSq < laneRadius * laneRadius) {
                const nearestPt = trackSpline.getPointAt(nearestT);
                const trackTangent = trackSpline.getTangentAt(nearestT).normalize();

                // 3D vector to laser path centerline
                _tangentScratch.subVectors(nearestPt, this.position);
                const tangentDot = _tangentScratch.dot(trackTangent);
                _crossScratch.copy(_tangentScratch).addScaledVector(trackTangent, -tangentDot);
                const lateralOffset = _crossScratch.length();

                // High-authority aerodynamic centering pull directly into the line center
                if (lateralOffset > 0.05 && inputState.flyAssistEnabled !== false) {
                    const lateralDir = _crossScratch.normalize();
                    const centeringSpeed = Math.min(22.0, lateralOffset * 4.5);
                    this.velocity.addScaledVector(lateralDir, centeringSpeed * dt * 3.2);
                }

                // Synchronize Euler heading with 3D track tangent (eliminates mesh/velocity disagreement)
                if (inputState.flyAssistEnabled !== false) {
                    const trackHeading = Math.atan2(trackTangent.x, trackTangent.z);
                    if (stuntFsm && typeof stuntFsm.currentYaw === 'number') {
                        let diff = (trackHeading - stuntFsm.currentYaw + Math.PI * 3) % (Math.PI * 2) - Math.PI;
                        const alignGain = (adasCfg.TRACK_ALIGN_GAIN || 0.35) * (this.isAutopilot ? 3.0 : 1.2);
                        const alignStep = diff * Math.min(1.0, alignGain * dt * 4.0);
                        stuntFsm.currentYaw += alignStep;
                        _eulerScratch.set(stuntFsm.currentPitch || 0, stuntFsm.currentYaw, stuntFsm.currentRoll || 0, 'YXZ');
                        this.quaternion.setFromEuler(_eulerScratch);
                    }
                }
            }
        }

        // ADAS: Smooth Altitude Switching & 3D Path Elevation Tracking
        if (!inputState.hoverStopActive) {
            let targetY = this.position.y;
            if (inputState.altitudeHoldEnabled) {
                targetY = inputState.targetAltitude || adasCfg.HOVER_HEIGHT_DEFAULT;
            } else if (trackSpline) {
                const nearestPt = trackSpline.getPointAt(this.splineProgress || 0);
                targetY = nearestPt ? nearestPt.y : this.position.y;
            }

            // Auto-elevation toward upcoming holographic ring
            if (trackBuilder && trackBuilder.gates && trackBuilder.gates.length > 0 && !inputState.altitudeHoldEnabled) {
                const targetGate = trackBuilder.gates[(this.nextGateIndex || 0) % trackBuilder.gates.length];
                if (targetGate && targetGate.position) {
                    const distToGate = this.position.distanceTo(targetGate.position);
                    if (distToGate < 100) {
                        targetY = targetGate.position.y;
                    }
                }
            }

            // Smooth critically damped vertical acceleration
            const altErr = targetY - this.position.y;
            const maxVertRate = Math.max(28.0, Math.abs(this.velocity.y));
            const targetVy = THREE.MathUtils.clamp(altErr * 4.5, -maxVertRate, maxVertRate);
            const elevationRate = inputState.altitudeHoldEnabled ? 8.0 : 6.0;
            this.velocity.y += (targetVy - this.velocity.y) * (1.0 - Math.exp(-elevationRate * dt));
        }

        // ADAS: Gate Trajectory Magnetism
        if (trackBuilder && trackBuilder.gates && trackBuilder.gates.length > 0 && this.velocity.length() > 3.0) {
            const targetGate = trackBuilder.gates[(this.nextGateIndex || 0) % trackBuilder.gates.length];
            if (targetGate && targetGate.position) {
                const distToGate = this.position.distanceTo(targetGate.position);
                const magnetDist = adasCfg.GATE_MAGNETISM_DIST || 28.0;
                if (distToGate < magnetDist && distToGate > 3.5) {
                    _tangentScratch.subVectors(targetGate.position, this.position);
                    _tangentScratch.y *= 0.4;
                    const pullStrength = (1.0 - (distToGate / magnetDist)) * (adasCfg.GATE_MAGNETISM_FORCE || 14.0);
                    this.position.addScaledVector(_tangentScratch.normalize(), pullStrength * dt * 0.35);
                }
            }
        }

        // Ground-Effect Aerodynamic Repulsion
        this.applyGroundEffect(dt, trackBuilder);

        // ADAS: Dynamic Hover Raycast Cushioning & Wall Deflection
        this.applyHoverDeflection(dt, trackBuilder, inputState);

        // Apply position delta
        this.position.addScaledVector(this.velocity, dt);
        
        // Speed calculation: horizontal airspeed with vertical speed contribution on climbs/dives
        if (this.isDiving || this.isAscending) {
            this.speedKmh = this.velocity.length() * 3.6;
        } else {
            const vertContribution = Math.abs(this.velocity.y) > 8.0 ? Math.pow(this.velocity.y * 0.5, 2) : 0;
            this.speedKmh = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z + vertContribution) * 3.6;
        }

        // Course realignment stub (player drives freely in hovercar mode)
        this.checkCourseRealignment(dt, trackBuilder);
    }

    applyGroundEffect(dt, trackBuilder) {
        const floorY = (trackBuilder?.canyonFloor?.position.y !== undefined) ? trackBuilder.canyonFloor.position.y : -24.0;
        const groundClearance = this.position.y - floorY;
        const groundEffectThreshold = 5.0; // meters

        if (groundClearance < groundEffectThreshold) {
            const normalizedHeight = Math.max(0.0, (groundEffectThreshold - groundClearance) / groundEffectThreshold);
            this.groundEffectLift = Math.pow(normalizedHeight, 2) * 28.0;
            this.velocity.y += this.groundEffectLift * dt;
            // Physical non-penetration floor cushion
            if (this.position.y < floorY + 1.2) {
                this.position.y = floorY + 1.2;
                if (this.velocity.y < 0) this.velocity.y = 0;
            }
        } else {
            this.groundEffectLift = 0;
        }
    }

    applyHoverDeflection(dt, trackBuilder) {
        if (!trackBuilder || !trackBuilder.buildingAABBs || trackBuilder.buildingAABBs.length === 0) return;
        
        const pos = this.position;
        const margin = CONFIG.ASSIST?.HOVERCAR_ADAS?.WALL_REPULSION_DIST || 4.5; // ADAS safety cushion
        const baseDeflect = CONFIG.ASSIST?.HOVERCAR_ADAS?.WALL_REPULSION_FORCE || 35.0;

        for (let i = 0; i < trackBuilder.buildingAABBs.length; i++) {
            const box = trackBuilder.buildingAABBs[i];
            if (pos.x > box.min.x - margin && pos.x < box.max.x + margin &&
                pos.z > box.min.z - margin && pos.z < box.max.z + margin &&
                pos.y > box.min.y && pos.y < box.max.y + 4.0) {
                
                const dxMin = Math.abs(pos.x - (box.min.x - margin));
                const dxMax = Math.abs(pos.x - (box.max.x + margin));
                const dzMin = Math.abs(pos.z - (box.min.z - margin));
                const dzMax = Math.abs(pos.z - (box.max.z + margin));
                const minDist = Math.min(dxMin, dxMax, dzMin, dzMax);

                const deflectSpeed = Math.max(baseDeflect, this.speedKmh * 0.22);
                if (minDist === dxMin) pos.x -= deflectSpeed * dt;
                else if (minDist === dxMax) pos.x += deflectSpeed * dt;
                else if (minDist === dzMin) pos.z -= deflectSpeed * dt;
                else if (minDist === dzMax) pos.z += deflectSpeed * dt;

                // Smooth kinetic cushion damping
                this.velocity.multiplyScalar(Math.max(0.94, 1.0 - dt * 1.5));
                break;
            }
        }
    }

    checkCourseRealignment(dt, trackBuilder) {
        // In hovercar mode the player steers freely – the spline is a gate layout guide only.
        // Realignment is handled by the out-of-bounds check in the animate loop instead.
        if (this.realignmentCooldown > 0) {
            this.realignmentCooldown -= dt;
        }
    }

    updateVisualEffects(dt, inputOverride = null) {
        if (inputOverride) {
            this.lastInputState = inputOverride;
        }
        const flightCfg = CONFIG.FLIGHT;
        // Use MAX_CRUISE_SPEED as the reference (BASE_SPEED is 0 in hovercar mode)
        const refSpeed = flightCfg.MAX_CRUISE_SPEED > 0 ? flightCfg.MAX_CRUISE_SPEED : 95.0;
        const cruiseRatio = Math.min(1.0, this.speedKmh / refSpeed);
        this.targetNacelleAngle = THREE.MathUtils.lerp(Math.PI / 2.5, 0.0, cruiseRatio);
        
        // Smooth nacelle transition
        this.currentNacelleAngle = THREE.MathUtils.lerp(this.currentNacelleAngle, this.targetNacelleAngle, dt * 8.0);

        // Sci-Fi Jet Variable-Geometry Transformation at Curvings & Turns
        // Damped smoothly with exponential filter — breathing and organic, never jarring
        const targetMorph = Math.max(-1.0, Math.min(1.0, this.currentSteer || 0));
        this.turnMorph = THREE.MathUtils.lerp(this.turnMorph || 0, targetMorph, dt * 5.2);
        const morph = this.turnMorph;

        // 1. Fuselage dynamic bow & organic aero-twist
        if (this.fuselage) {
            this.fuselage.rotation.y = -morph * 0.09;
            this.fuselage.rotation.z = -morph * 0.05;
        }
        if (this.canopy) {
            this.canopy.rotation.y = -morph * 0.07;
            this.canopy.rotation.z = -morph * 0.04;
        }

        // 2. Swept Main Wings variable-sweep & dihedral camber
        if (this.wingR && this.wingL) {
            // Right wing flexes into turn geometry
            this.wingR.rotation.y = -morph * 0.14;
            this.wingR.rotation.z = -morph * 0.11;
            // Left wing flexes symmetrically
            this.wingL.rotation.y = morph * 0.14;
            this.wingL.rotation.z = morph * 0.11;
        }

        // 3. Articulated Forward Aerodynamic Canards / Aero Flaps
        if (this.canardR && this.canardL) {
            // Differential pitch flaring for aerodynamic turn bite
            this.canardR.rotation.x = -morph * 0.35;
            this.canardL.rotation.x = morph * 0.35;
            this.canardR.rotation.z = -morph * 0.12;
            this.canardL.rotation.z = morph * 0.12;
        }

        // 4. Wingtip Nacelles Differential Thrust Vectoring
        if (this.tiltNacelles && this.tiltNacelles.length >= 2) {
            // Outer nacelle pitches down/vectors thrust, inner feathers back
            this.tiltNacelles[0].rotation.x = this.currentNacelleAngle - morph * 0.16;
            this.tiltNacelles[1].rotation.x = this.currentNacelleAngle + morph * 0.16;
            // Wingtip roll cant (parented to wings)
            this.tiltNacelles[0].rotation.z = -morph * 0.08;
            this.tiltNacelles[1].rotation.z = morph * 0.08;
        } else {
            this.tiltNacelles.forEach(n => {
                n.rotation.x = this.currentNacelleAngle;
            });
        }

        // 5. Twin Tail Fins Dynamic Rudder Splay & Cant
        if (this.finR && this.finL) {
            this.finR.rotation.y = -0.1 - morph * 0.32;
            this.finL.rotation.y = 0.1 - morph * 0.32;
            this.finR.rotation.z = -0.35 - morph * 0.14;
            this.finL.rotation.z = 0.35 - morph * 0.14;
        }

        // 5b. Active Aerodynamic Speedbrake Spoiler Flaps
        if (this.airbrakeFlapR && this.airbrakeFlapL) {
            let targetAirbrake = 0.0;
            const isBraking = (this.lastInputState && this.lastInputState.forward < -0.1);
            const isHoverStop = (this.lastInputState && this.lastInputState.hoverStopActive);
            const isHighSpeedTurn = Math.abs(morph) > 0.65 && this.speedKmh > 110.0;

            if (isHoverStop) {
                targetAirbrake = 0.78; // High-drag vertical flare (~45°)
            } else if (isBraking) {
                const brakeIntensity = Math.min(1.0, Math.abs(this.lastInputState.forward));
                targetAirbrake = 0.65 * brakeIntensity;
            } else if (isHighSpeedTurn) {
                targetAirbrake = 0.22 * Math.abs(morph);
            }

            const deployRate = (CONFIG.FLIGHT?.AIRBRAKE_DEPLOY_RATE || 14.0) * dt;
            this.airbrakeDeployAngle = THREE.MathUtils.lerp(this.airbrakeDeployAngle || 0, targetAirbrake, deployRate);

            this.airbrakeFlapR.rotation.x = -this.airbrakeDeployAngle;
            this.airbrakeFlapL.rotation.x = -this.airbrakeDeployAngle;
        }

        // Rotor blur effect at high speeds
        this.rotorBlurIntensity = THREE.MathUtils.lerp(this.rotorBlurIntensity, cruiseRatio, dt * 5.0);
        this.rotorDiscs.forEach((r, i) => {
            r.rotation.z += (25.0 + cruiseRatio * 45.0) * dt;
            // Blur effect by scaling opacity based on speed
            if (this.rotorMaterials[i]) {
                this.rotorMaterials[i].opacity = 0.35 + this.rotorBlurIntensity * 0.25;
            }
        });

        // Landing gear animation (retract at high speed)
        const shouldRetractGear = this.speedKmh > 80;
        const gearTransitionSpeed = 3.0;
        
        if (shouldRetractGear && this.landingGearExtended) {
            this.landingGearExtended = false;
        } else if (!shouldRetractGear && !this.landingGearExtended) {
            this.landingGearExtended = true;
        }

        this.landingGear.forEach(gear => {
            const targetScale = this.landingGearExtended ? 1.0 : 0.0;
            const s = THREE.MathUtils.lerp(gear.scale.x, targetScale, dt * gearTransitionSpeed);
            gear.scale.set(s, s, s);
            gear.visible = gear.scale.x > 0.01;
        });

        // Thruster glow intensity & booster flame VFX (/boost)
        const rndFlicker = Math.random() * 0.2;
        if (this.nitroStage === 3) {
            this.thrustGlow.color.setHex(0x00ffff);
            this.thrustGlow.intensity = 3.8;
            if (this.exhaustMesh) {
                this.exhaustMesh.visible = true;
                this.exhaustMesh.material.color.setHex(0x00ffff);
                this.exhaustMesh.material.opacity = 0.85 + rndFlicker;
                this.exhaustMesh.scale.set(1.5, 1.5, 2.0 + rndFlicker * 2);
            }
            if (this.exhaustCore) {
                this.exhaustCore.visible = true;
                this.exhaustCore.material.color.setHex(0xffffff);
                this.exhaustCore.material.opacity = 0.95;
                this.exhaustCore.scale.set(1.2, 1.2, 1.6 + rndFlicker);
            }
        } else if (this.nitroStage === 2) {
            this.thrustGlow.color.setHex(0xE8580A);
            this.thrustGlow.intensity = 2.8;
            if (this.exhaustMesh) {
                this.exhaustMesh.visible = true;
                this.exhaustMesh.material.color.setHex(0xE8580A);
                this.exhaustMesh.material.opacity = 0.78 + rndFlicker;
                this.exhaustMesh.scale.set(1.1, 1.1, 1.3 + rndFlicker * 1.5);
            }
            if (this.exhaustCore) {
                this.exhaustCore.visible = true;
                this.exhaustCore.material.color.setHex(0xffe066);
                this.exhaustCore.material.opacity = 0.8;
                this.exhaustCore.scale.set(0.9, 0.9, 1.1);
            }
        } else if (this.speedKmh > 75) {
            const speedRatio = Math.min(1.0, (this.speedKmh - 75) / 120);
            this.thrustGlow.color.setHex(0x0E7C7B);
            this.thrustGlow.intensity = 0.8 + speedRatio * 0.8;
            if (this.exhaustMesh) {
                this.exhaustMesh.visible = true;
                this.exhaustMesh.material.color.setHex(0x0E7C7B);
                this.exhaustMesh.material.opacity = 0.45 * speedRatio + rndFlicker * 0.15;
                this.exhaustMesh.scale.set(0.6 * speedRatio, 0.6 * speedRatio, (0.7 + rndFlicker) * speedRatio);
            }
            if (this.exhaustCore) {
                this.exhaustCore.visible = false;
            }
        } else {
            this.thrustGlow.color.setHex(0x0E7C7B);
            this.thrustGlow.intensity = 0.5;
            if (this.exhaustMesh) {
                this.exhaustMesh.visible = false;
            }
            if (this.exhaustCore) {
                this.exhaustCore.visible = false;
            }
        }

        // Emit exhaust particles
        if (this.particleSystem && this.speedKmh > 60) {
            _fwdVector.set(0, 0, 1).applyQuaternion(this.quaternion);
            _exhaustDir.copy(_fwdVector).multiplyScalar(-1);
            
            // Emit from rear of drone without GC allocation
            _exhaustPos.copy(this.position).addScaledVector(_fwdVector, -2.0);
            this.particleSystem.emitExhaust(_exhaustPos, _exhaustDir, this.speedKmh);
        }

        // Task 5: Emit wingtip vortices during high-G banked turns or knife-edge flight
        if (this.particleSystem && this.speedKmh > 130) {
            const bankAngle = Math.abs(this.group.rotation.z);
            if ((bankAngle > 0.4 || this.nitroStage >= 2) && typeof this.particleSystem.emitWingtipVortices === 'function') {
                this.particleSystem.emitWingtipVortices(this.position, this.quaternion, this.speedKmh);
            }
        }
    }

    emitStuntParticles(type) {
        if (this.particleSystem) {
            this.particleSystem.emitStuntEffect(this.position, type);
        }
    }

    emitCollisionParticles(normal) {
        if (this.particleSystem) {
            this.particleSystem.emitCollision(this.position, normal);
        }
    }

    updateParticles(dt) {
        if (this.particleSystem) {
            this.particleSystem.update(dt);
        }
    }

    // Task 60: Fixed 48-byte Binary Telemetry Snapshot Pipeline (Zero-Allocation)
    static TELEMETRY_BYTE_LENGTH = 48;
    static _telemetryBuffer = new ArrayBuffer(48);
    static _telemetryDataView = new DataView(Drone._telemetryBuffer);

    encodeTelemetrySnapshot(targetDataView = null) {
        const dv = targetDataView || Drone._telemetryDataView;
        // Offset 0 (Uint16): Magic Identifier 0xBA7C ('BARCH')
        dv.setUint16(0, 0xBA7C, true);
        // Offset 2 (Uint16): Status Bitflags
        let flags = 0;
        if (this.isAutopilot) flags |= (1 << 0);
        if (this.spotlightsOn) flags |= (1 << 1);
        if (this.isNitroLatched) flags |= (1 << 2);
        dv.setUint16(2, flags, true);
        // Offset 4..15 (Float32 x 3): World Position (X, Y, Z)
        dv.setFloat32(4, this.position.x, true);
        dv.setFloat32(8, this.position.y, true);
        dv.setFloat32(12, this.position.z, true);
        // Offset 16..31 (Float32 x 4): Orientation Quaternion (X, Y, Z, W)
        dv.setFloat32(16, this.quaternion._x || 0, true);
        dv.setFloat32(20, this.quaternion._y || 0, true);
        dv.setFloat32(24, this.quaternion._z || 0, true);
        dv.setFloat32(28, this.quaternion._w !== undefined ? this.quaternion._w : 1, true);
        // Offset 32..43 (Float32 x 3): Linear Velocity Vector
        dv.setFloat32(32, this.velocity.x, true);
        dv.setFloat32(36, this.velocity.y, true);
        dv.setFloat32(40, this.velocity.z, true);
        // Offset 44 (Uint16): Airspeed in KM/H (quantized)
        dv.setUint16(44, Math.min(65535, Math.max(0, Math.round(this.speedKmh * 10))), true);
        // Offset 46 (Uint8): Nitro Stage (1, 2, 3)
        dv.setUint8(46, this.nitroStage || 1);
        // Offset 47 (Uint8): Reserved / Padding
        dv.setUint8(47, 0);

        return dv;
    }

    static decodeTelemetrySnapshot(dataView) {
        const magic = dataView.getUint16(0, true);
        if (magic !== 0xBA7C) return null;
        const flags = dataView.getUint16(2, true);
        return {
            isAutopilot: (flags & (1 << 0)) !== 0,
            spotlightsOn: (flags & (1 << 1)) !== 0,
            isNitroLatched: (flags & (1 << 2)) !== 0,
            position: {
                x: dataView.getFloat32(4, true),
                y: dataView.getFloat32(8, true),
                z: dataView.getFloat32(12, true)
            },
            quaternion: {
                x: dataView.getFloat32(16, true),
                y: dataView.getFloat32(20, true),
                z: dataView.getFloat32(24, true),
                w: dataView.getFloat32(28, true)
            },
            velocity: {
                x: dataView.getFloat32(32, true),
                y: dataView.getFloat32(36, true),
                z: dataView.getFloat32(40, true)
            },
            speedKmh: dataView.getUint16(44, true) / 10,
            nitroStage: dataView.getUint8(46)
        };
    }

    // Task 57: Holographic Ghost Replay Buffer (Quantized 16-bit ring)
    recordGhostSnapshot() {
        if (!this.ghostBuffer) this.ghostBuffer = [];
        if (this.ghostBuffer.length > 3000) this.ghostBuffer.shift(); // Max ~50 seconds at 60Hz/4
        this.ghostBuffer.push({
            px: Math.round(this.position.x * 10) / 10,
            py: Math.round(this.position.y * 10) / 10,
            pz: Math.round(this.position.z * 10) / 10,
            qx: Math.round((this.quaternion._x || 0) * 1000) / 1000,
            qy: Math.round((this.quaternion._y || 0) * 1000) / 1000,
            qz: Math.round((this.quaternion._z || 0) * 1000) / 1000,
            qw: Math.round((this.quaternion._w !== undefined ? this.quaternion._w : 1) * 1000) / 1000,
            sp: Math.round(this.speedKmh)
        });
    }

    getGhostReplay() {
        return this.ghostBuffer || [];
    }

    dispose() {
        if (this.particleSystem) {
            this.particleSystem.dispose();
        }
        
        this.group.traverse(child => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
            }
        });
        if (this.scene) {
            this.scene.remove(this.group);
        }
    }
}
