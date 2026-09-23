/*
================================================================================
BARCH AERO-CANYON RACING - INDUSTRIAL VTOL DRONE MESH & FLIGHT MODEL
Articulated tilt-rotors, carbon/orange search-and-rescue livery, and vector physics
================================================================================
*/

import { CONFIG } from '../config.js';

// Pre-allocated scratch objects to prevent garbage collection spikes
const _fwdVector = new THREE.Vector3();

export class Drone {
    constructor(scene, isAi = false, aiColor = null) {
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
        this.navStrobes = [];
        this.exhaustParticles = [];

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

    updatePhysics(inputState, stuntFsm, dt) {
        const flightCfg = CONFIG.FLIGHT;
        const nitroCfg = CONFIG.NITRO;
        const maxNitro = this.nitroMaxCapacity || nitroCfg.MAX_CAPACITY;
        const maxCruiseSpeed = this.maxSpeedKmh || flightCfg.MAX_CRUISE_SPEED;

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

        // Determine target cruise speed
        let targetSpeedKmh = flightCfg.BASE_SPEED;
        if (this.nitroStage === 3) targetSpeedKmh = flightCfg.STAGE3_BOOST_SPEED;
        else if (this.nitroStage === 2) targetSpeedKmh = flightCfg.STAGE2_BOOST_SPEED;
        else if (inputState.forward > 0) targetSpeedKmh = maxCruiseSpeed;
        else if (inputState.forward < 0) targetSpeedKmh = flightCfg.BASE_SPEED * 0.5;

        // Let Stunt FSM modulate speed and orientation
        stuntFsm.update(this, inputState, dt);

        if (!stuntFsm.isCobraActive()) {
            const targetSpeedMs = targetSpeedKmh / 3.6;
            const currentSpeedMs = this.velocity.length();

            const accelRate = (targetSpeedMs > currentSpeedMs) ? flightCfg.ACCELERATION : flightCfg.BRAKING_DECEL;
            const speedStep = accelRate * dt;
            let newSpeedMs = currentSpeedMs;

            if (targetSpeedMs > currentSpeedMs) {
                newSpeedMs = Math.min(targetSpeedMs, currentSpeedMs + speedStep);
            } else {
                newSpeedMs = Math.max(targetSpeedMs, currentSpeedMs - speedStep);
            }

            // Forward direction vector in world space (zero-allocation)
            _fwdVector.set(0, 0, 1).applyQuaternion(this.quaternion);
            this.velocity.copy(_fwdVector).multiplyScalar(newSpeedMs);
        }

        // Apply position delta
        this.position.addScaledVector(this.velocity, dt);
        this.speedKmh = this.velocity.length() * 3.6;

        // Rotor animation and tilt-nacelle transition (0 rad in cruise, PI/2 in hover)
        const cruiseRatio = Math.min(1.0, this.speedKmh / flightCfg.BASE_SPEED);
        const nacelleAngle = THREE.MathUtils.lerp(Math.PI / 2.5, 0.0, cruiseRatio);

        this.tiltNacelles.forEach(n => {
            n.rotation.x = nacelleAngle;
        });

        this.rotorDiscs.forEach(r => {
            r.rotation.z += (25.0 + cruiseRatio * 45.0) * dt;
        });

        // Thruster glow intensity & booster flame VFX (/boost)
        if (this.nitroStage === 3) {
            this.thrustGlow.color.setHex(0x00ffff);
            this.thrustGlow.intensity = 3.8;
            if (this.exhaustMesh) {
                this.exhaustMesh.visible = true;
                this.exhaustMesh.material.color.setHex(0x00ffff);
                this.exhaustMesh.material.opacity = 0.85 + Math.random() * 0.15;
                this.exhaustMesh.scale.set(1.4, 1.4, 1.8 + Math.random() * 0.4);
            }
        } else if (this.nitroStage === 2) {
            this.thrustGlow.color.setHex(0xE8580A);
            this.thrustGlow.intensity = 2.6;
            if (this.exhaustMesh) {
                this.exhaustMesh.visible = true;
                this.exhaustMesh.material.color.setHex(0xE8580A);
                this.exhaustMesh.material.opacity = 0.75 + Math.random() * 0.15;
                this.exhaustMesh.scale.set(1.0, 1.0, 1.2 + Math.random() * 0.3);
            }
        } else {
            this.thrustGlow.color.setHex(0x0E7C7B);
            this.thrustGlow.intensity = 1.0;
            if (this.exhaustMesh) {
                this.exhaustMesh.visible = false;
            }
        }
    }

    dispose() {
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
