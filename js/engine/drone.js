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

        this.buildMesh(aiColor);
    }

    buildMesh(customColor) {
        const bodyColor = customColor || 0x1a2130;
        const accentColor = customColor ? 0xffffff : 0xE8580A; // Safety orange

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

        // 1. Sleek aerodynamic fuselage
        const bodyGeo = new THREE.ConeGeometry(0.8, 4.2, 8);
        bodyGeo.rotateX(Math.PI / 2);
        const fuselage = new THREE.Mesh(bodyGeo, this.matBody);
        fuselage.scale.set(1.4, 0.65, 1.0);
        fuselage.castShadow = true;
        this.group.add(fuselage);

        // Cockpit canopy
        const canopyGeo = new THREE.SphereGeometry(0.45, 12, 12);
        canopyGeo.scale(0.8, 0.5, 1.8);
        const canopy = new THREE.Mesh(canopyGeo, matCanopy);
        canopy.position.set(0, 0.28, 0.5);
        this.group.add(canopy);

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

        const wingGeoL = wingGeoR.clone();
        wingGeoL.scale(-1, 1, 1);
        const wingL = new THREE.Mesh(wingGeoL, this.matBody);
        wingL.castShadow = true;
        this.group.add(wingL);

        // 3. Wingtip Articulated Tilt-Rotor Nacelles
        const nacelleGeo = new THREE.CylinderGeometry(0.22, 0.24, 1.1, 12);
        nacelleGeo.rotateX(Math.PI / 2);

        const createNacelle = (xPos) => {
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

            this.group.add(nacGroup);
            this.tiltNacelles.push(nacGroup);
        };

        createNacelle(3.7);
        createNacelle(-3.7);

        // 4. Twin Angled Tail Fins
        const finGeo = new THREE.BoxGeometry(0.08, 0.9, 0.8);
        const finR = new THREE.Mesh(finGeo, this.matAccent);
        finR.position.set(0.75, 0.5, -1.8);
        finR.rotation.z = -0.35;
        finR.rotation.y = -0.1;
        this.group.add(finR);

        const finL = new THREE.Mesh(finGeo, this.matAccent);
        finL.position.set(-0.75, 0.5, -1.8);
        finL.rotation.z = 0.35;
        finL.rotation.y = 0.1;
        this.group.add(finL);

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
    }

    applySkin(skin) {
        if (!skin) return;
        this.matBody.color.setHex(skin.bodyColor);
        this.matAccent.color.setHex(skin.accentColor);
        if (this.thrustGlow) this.thrustGlow.color.setHex(skin.glowColor);
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

        // Substep physics loop (Task 1: Fixed-Timestep Accumulator at 120 Hz)
        while (this.physicsAccumulator >= FIXED_DT) {
            this.stepPhysics(inputState, stuntFsm, FIXED_DT, trackBuilder);
            this.physicsAccumulator -= FIXED_DT;
        }

        // Post-substep visual animations using actual frame delta
        this.updateVisualEffects(frameDt);
    }

    stepPhysics(inputState, stuntFsm, dt, trackBuilder = null) {
        const flightCfg = CONFIG.FLIGHT;
        const nitroCfg = CONFIG.NITRO;
        const maxNitro = this.nitroMaxCapacity || nitroCfg.MAX_CAPACITY;
        const maxCruiseSpeed = this.maxSpeedKmh || flightCfg.MAX_CRUISE_SPEED;

        // Task 9: Autopilot ("Zen Flight") Input Integration
        const hasManualSteering = Math.abs(inputState.turn || 0) > 0.08 ||
                                  Math.abs(inputState.pitch || 0) > 0.08 ||
                                  Math.abs(inputState.roll || 0) > 0.08;

        if (hasManualSteering && this.isAutopilot) {
            // Disengage autopilot on player intervention with smooth handoff
            this.isAutopilot = false;
        }

        if (this.isAutopilot && this.trackSpline) {
            this.autopilotBlend = Math.min(1.0, this.autopilotBlend + dt * 2.5);
            // Autonomous spline following
            const approxU = ((this.splineProgress || 0) + 0.018) % 1.0;
            const targetPoint = this.trackSpline.getPointAt(approxU);
            _tangentScratch.subVectors(targetPoint, this.position).normalize();
            
            _quatScratch.setFromUnitVectors(new THREE.Vector3(0, 0, 1), _tangentScratch);
            this.quaternion.slerp(_quatScratch, dt * 3.5 * this.autopilotBlend);
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

        // Determine target hovercar speed based directly on user input
        let targetSpeedKmh = 0.0;
        const forwardInput = (typeof inputState.forward === 'number') ? inputState.forward : 0;

        if (inputState.hoverStopActive) {
            targetSpeedKmh = 0.0;
            const decelDamp = Math.max(0, 1.0 - (CONFIG.ASSIST?.HOVER_STOP?.DECEL_RATE || 160.0) * dt / 22.0);
            this.velocity.multiplyScalar(decelDamp);
            if (this.velocity.length() < 0.15) this.velocity.set(0, 0, 0);
            this.targetNacelleAngle = Math.PI / 2.0; // 90° VTOL vertical hover posture
            this.landingGearExtended = true;
        } else if (this.nitroStage === 3 && forwardInput >= 0) {
            targetSpeedKmh = flightCfg.STAGE3_BOOST_SPEED;
        } else if (this.nitroStage === 2 && forwardInput >= 0) {
            targetSpeedKmh = flightCfg.STAGE2_BOOST_SPEED;
        } else if (forwardInput > 0) {
            // Proportional forward throttle: 0 to maxCruiseSpeed
            targetSpeedKmh = maxCruiseSpeed * Math.min(1.0, forwardInput);
        } else if (forwardInput < 0) {
            // Active braking and reverse drive
            targetSpeedKmh = -flightCfg.REVERSE_SPEED * Math.min(1.0, Math.abs(forwardInput));
        } else {
            // Neutral stick / no keys: smooth coasting to stationary 0 km/h hover
            targetSpeedKmh = 0.0;
        }

        // Turbulence drag modifier (Task 6)
        if (this.isTurbulenceActive) {
            targetSpeedKmh *= 0.78;
        }

        // Let Stunt FSM modulate speed and orientation
        stuntFsm.update(this, inputState, dt);

        if (!stuntFsm.isCobraActive() && !inputState.hoverStopActive) {
            const targetSpeedMs = targetSpeedKmh / 3.6;
            _fwdVector.set(0, 0, 1).applyQuaternion(this.quaternion);

            // Compute current forward velocity component
            let currentSpeedMs = this.velocity.dot(_fwdVector);
            if (!Number.isFinite(currentSpeedMs)) currentSpeedMs = 0;

            const isAccelerating = (targetSpeedMs >= 0 && targetSpeedMs > currentSpeedMs) || (targetSpeedMs < 0 && targetSpeedMs < currentSpeedMs);
            const rate = isAccelerating ? flightCfg.ACCELERATION : flightCfg.BRAKING_DECEL;
            const speedStep = rate * dt;
            let newSpeedMs = currentSpeedMs;

            if (targetSpeedMs > currentSpeedMs) {
                newSpeedMs = Math.min(targetSpeedMs, currentSpeedMs + speedStep);
            } else if (targetSpeedMs < currentSpeedMs) {
                newSpeedMs = Math.max(targetSpeedMs, currentSpeedMs - speedStep);
            }

            // Snap micro-speeds to zero for stationary hover
            if (Math.abs(newSpeedMs) < 0.08 && Math.abs(forwardInput) < 0.05 && this.nitroStage === 1) {
                newSpeedMs = 0;
            }

            this.velocity.copy(_fwdVector).multiplyScalar(newSpeedMs);
        }

        // ADAS: Electronic Stability Control (ESC) - dampens lateral hover slide
        const adasCfg = CONFIG.ASSIST?.HOVERCAR_ADAS || {
            ESC_LATERAL_STABILITY: 0.92,
            WALL_REPULSION_DIST: 4.5,
            WALL_REPULSION_FORCE: 35.0,
            GATE_MAGNETISM_DIST: 28.0,
            GATE_MAGNETISM_FORCE: 14.0,
            AUTO_ELEVATION_RATE: 6.0,
            HOVER_HEIGHT_DEFAULT: 18.0
        };

        if (stuntFsm && typeof stuntFsm.isDriftActive === 'function' ? !stuntFsm.isDriftActive() : true) {
            _fwdVector.set(0, 0, 1).applyQuaternion(this.quaternion);
            const fwdMag = this.velocity.dot(_fwdVector);
            _tangentScratch.copy(_fwdVector).multiplyScalar(fwdMag);
            _tangentScratch.y = this.velocity.y; // Preserve vertical glide
            this.velocity.lerp(_tangentScratch, dt * (adasCfg.ESC_LATERAL_STABILITY * 12.0));
        }

        // ADAS: Static Hover Altitude Hold & Auto-Elevation Glide
        if (!inputState.hoverStopActive) {
            let targetY = inputState.targetAltitude || adasCfg.HOVER_HEIGHT_DEFAULT;
            
            // Auto-elevation toward upcoming holographic ring
            if (trackBuilder && trackBuilder.gates && trackBuilder.gates.length > 0) {
                const targetGate = trackBuilder.gates[(this.nextGateIndex || 0) % trackBuilder.gates.length];
                if (targetGate && targetGate.position) {
                    const distToGate = this.position.distanceTo(targetGate.position);
                    if (distToGate < 100) {
                        targetY = targetGate.position.y;
                    }
                }
            }

            const altErr = targetY - this.position.y;
            const altCfg = CONFIG.ASSIST?.ALTITUDE_HOLD || { P_GAIN: 2.2, D_GAIN: 0.85, MAX_VERT_SPEED: 22.0 };
            const targetVy = THREE.MathUtils.clamp(altErr * altCfg.P_GAIN - this.velocity.y * altCfg.D_GAIN, -altCfg.MAX_VERT_SPEED, altCfg.MAX_VERT_SPEED);
            this.velocity.y += (targetVy - this.velocity.y) * (1 - Math.exp(-(adasCfg.AUTO_ELEVATION_RATE || 6.0) * dt));
        }

        // ADAS: Gate Trajectory Magnetism (Funnel into upcoming floating circles)
        if (trackBuilder && trackBuilder.gates && trackBuilder.gates.length > 0 && this.velocity.length() > 3.0) {
            const targetGate = trackBuilder.gates[(this.nextGateIndex || 0) % trackBuilder.gates.length];
            if (targetGate && targetGate.position) {
                const distToGate = this.position.distanceTo(targetGate.position);
                const magnetDist = adasCfg.GATE_MAGNETISM_DIST || 28.0;
                if (distToGate < magnetDist && distToGate > 3.5) {
                    _tangentScratch.subVectors(targetGate.position, this.position);
                    _tangentScratch.y *= 0.4; // Favor horizontal trajectory alignment
                    const pullStrength = (1.0 - (distToGate / magnetDist)) * (adasCfg.GATE_MAGNETISM_FORCE || 14.0);
                    this.position.addScaledVector(_tangentScratch.normalize(), pullStrength * dt * 0.35);
                }
            }
        }

        // Task 2: Ground-Effect Aerodynamic Repulsion Engine
        this.applyGroundEffect(dt, trackBuilder);

        // ADAS: Dynamic 4-Point Hover Raycast Cushioning & Wall Deflection
        this.applyHoverDeflection(dt, trackBuilder, inputState);

        // Apply position delta
        this.position.addScaledVector(this.velocity, dt);
        this.speedKmh = Math.hypot(this.velocity.x, this.velocity.z) * 3.6;

        // Task 10: Smooth Course Realignment & Spline Projection Guard
        this.checkCourseRealignment(dt, trackBuilder);
    }

    applyGroundEffect(dt, trackBuilder) {
        const floorY = (trackBuilder?.canyonFloor?.position.y !== undefined) ? trackBuilder.canyonFloor.position.y : -24.0;
        const groundClearance = this.position.y - floorY;
        const groundEffectThreshold = 4.2; // meters

        if (groundClearance < groundEffectThreshold && groundClearance > 0) {
            const normalizedHeight = (groundEffectThreshold - groundClearance) / groundEffectThreshold;
            this.groundEffectLift = Math.pow(normalizedHeight, 2) * 16.0;
            this.position.y += this.groundEffectLift * dt;
            if (this.velocity.y < 0) {
                this.velocity.y *= Math.max(0.0, 1.0 - normalizedHeight * 0.8);
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
        if (this.realignmentCooldown > 0) {
            this.realignmentCooldown -= dt;
            return;
        }

        const spline = this.trackSpline || trackBuilder?.spline;
        if (!spline) return;

        const approxT = (this.splineProgress || 0) % 1.0;
        const splinePt = spline.getPointAt(approxT);
        const distSq = this.position.distanceToSquared(splinePt);

        if (distSq > 2304) { // 48m threshold squared
            const tangent = spline.getTangentAt(approxT).normalize();
            this.position.copy(splinePt).addScaledVector(new THREE.Vector3(0, 1, 0), 3.0);
            
            _quatScratch.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
            this.quaternion.copy(_quatScratch);
            
            const preserveSpeed = Math.max(28.0, this.velocity.length());
            this.velocity.copy(tangent).multiplyScalar(preserveSpeed);

            this.realignmentCooldown = 3.5;
            this.emitStuntParticles('REALIGN');
        }
    }

    updateVisualEffects(dt) {
        const flightCfg = CONFIG.FLIGHT;
        const cruiseRatio = Math.min(1.0, this.speedKmh / flightCfg.BASE_SPEED);
        this.targetNacelleAngle = THREE.MathUtils.lerp(Math.PI / 2.5, 0.0, cruiseRatio);
        
        // Smooth nacelle transition
        this.currentNacelleAngle = THREE.MathUtils.lerp(this.currentNacelleAngle, this.targetNacelleAngle, dt * 8.0);

        this.tiltNacelles.forEach(n => {
            n.rotation.x = this.currentNacelleAngle;
        });

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
