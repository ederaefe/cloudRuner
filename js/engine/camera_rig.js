/*
================================================================================
BARCH AERO-CANYON RACING - SPRING-DAMPER CHASE CAMERA RIG
Inertial camera mass, acceleration setback, and dynamic FOV warping
================================================================================
*/

import { CONFIG } from '../config.js';

// Pre-allocated scratch vectors to prevent frame allocations
const _idealOffset = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _displacement = new THREE.Vector3();
const _springForce = new THREE.Vector3();
const _dampingForce = new THREE.Vector3();
const _forwardLook = new THREE.Vector3();
const _shakeOffset = new THREE.Vector3();
const _acceleration = new THREE.Vector3();
const _previousVelocity = new THREE.Vector3();

export const CAMERA_MODES = {
    CHASE: 'CHASE',
    COCKPIT: 'COCKPIT',
    SPECTATOR: 'SPECTATOR',
    PHOTO: 'PHOTO'
};

export class CameraRig {
    constructor(camera) {
        this.camera = camera;
        this.currentPos = new THREE.Vector3(0, 5, -10);
        this.currentLookAt = new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);

        this.shakeAmount = 0.0;
        this.targetFov = CONFIG.CAMERA.BASE_FOV;
        this.currentFov = CONFIG.CAMERA.BASE_FOV;
        this.isEpilogue = false;
        this.epilogueAngle = 0;
        
        // Camera modes & Slow Roads features
        this.mode = CAMERA_MODES.CHASE;
        this.spectatorAnchor = new THREE.Vector3();
        this.spectatorDwellTimer = 0;
        this.isPhotoMode = false;
        this.photoCamYaw = 0;
        this.photoCamPitch = 0;
        this.photoCamDistance = 12.0;

        // Enhanced camera behavior
        this.forwardLean = 0.0;
        this.verticalBob = 0.0;
        this.bobPhase = 0.0;

        // Asphalt Intro & Deep Dive State
        this.divePanYaw = 0.0;
        this.introPhase = 0.0;
    }

    cycleCameraMode() {
        if (this.mode === CAMERA_MODES.CHASE) {
            this.mode = CAMERA_MODES.COCKPIT;
        } else if (this.mode === CAMERA_MODES.COCKPIT) {
            this.mode = CAMERA_MODES.SPECTATOR;
            this.spectatorDwellTimer = 0;
        } else {
            this.mode = CAMERA_MODES.CHASE;
        }
        return this.mode;
    }

    togglePhotoMode() {
        this.isPhotoMode = !this.isPhotoMode;
        if (this.isPhotoMode) {
            this.mode = CAMERA_MODES.PHOTO;
            this.photoCamYaw = 0;
            this.photoCamPitch = 0.2;
            this.photoCamDistance = 10.0;
        } else {
            this.mode = CAMERA_MODES.CHASE;
        }
        return this.isPhotoMode;
    }

    takeSnapshot(canvas, filename = 'barch-aero-snapshot.png') {
        if (!canvas || typeof canvas.toBlob !== 'function') return;
        canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }, 'image/png');
    }

    setEpilogueMode(active) {
        this.isEpilogue = active;
        if (active) {
            this.epilogueAngle = 0;
            this.velocity.set(0, 0, 0);
        }
    }

    updateShowcase(drone, dt) {
        if (!drone) return;
        this.epilogueAngle += dt * 0.25;
        const orbitDist = 8.8;
        const orbitHeight = 2.4;
        this.currentPos.set(
            drone.position.x + Math.sin(this.epilogueAngle) * orbitDist,
            drone.position.y + orbitHeight,
            drone.position.z + Math.cos(this.epilogueAngle) * orbitDist
        );
        _targetPos.copy(drone.position);
        _targetPos.y += 0.5;
        this.currentLookAt.lerp(_targetPos, dt * 6.0);
        this.camera.position.copy(this.currentPos);
        this.camera.lookAt(this.currentLookAt);
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, 58.0, dt * 4.0);
        this.camera.updateProjectionMatrix();
    }

    triggerShake(amount = 0.25) {
        this.shakeAmount = Math.min(0.6, this.shakeAmount + amount);
    }

    reset(drone) {
        if (!drone) return;
        this.isEpilogue = false;
        const camCfg = CONFIG.CAMERA;
        // Use yaw-only to keep horizon level on spawn
        const spawnEuler = new THREE.Euler().setFromQuaternion(drone.quaternion, 'YXZ');
        const yawOnlyQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, spawnEuler.y, 0, 'YXZ'));
        _idealOffset.set(0, camCfg.BASE_HEIGHT, -camCfg.BASE_DISTANCE).applyQuaternion(yawOnlyQuat);
        this.currentPos.copy(drone.position).add(_idealOffset);
        this.velocity.set(0, 0, 0);
        _forwardLook.set(0, 0.4, 6.0).applyQuaternion(yawOnlyQuat);
        this.currentLookAt.copy(drone.position).add(_forwardLook);
        this.camera.position.copy(this.currentPos);
        this.camera.lookAt(this.currentLookAt);
        this.shakeAmount = 0;
        this.targetFov = camCfg.BASE_FOV;
        this.camera.fov = camCfg.BASE_FOV;
        this.camera.updateProjectionMatrix();
    }

    updateIntroSequence(drone, stagingPlatforms, progress, dt) {
        if (!drone) return;
        const p = THREE.MathUtils.clamp(progress, 0, 1);
        const center = drone.stagingBasePos || drone.position;

        if (p < 0.35) {
            // Phase 1: Hero Attack Drone dramatic low-angle orbit
            const angle = (p / 0.35) * Math.PI * 0.9 + 0.3;
            const dist = 7.5;
            this.currentPos.set(
                center.x + Math.sin(angle) * dist,
                center.y + 1.2,
                center.z + Math.cos(angle) * dist
            );
            _targetPos.copy(center).add(new THREE.Vector3(0, 0.4, 0.5));
            this.currentLookAt.lerp(_targetPos, dt * 8.0);
            this.targetFov = 62.0;
        } else if (p < 0.68) {
            // Phase 2: Lateral pan across rival platforms and color-coded portals
            const t = (p - 0.35) / 0.33;
            const sweepX = THREE.MathUtils.lerp(-32.0, 32.0, t);
            this.currentPos.set(sweepX, center.y + 3.8, center.z + 14.0);
            _targetPos.set(sweepX * 0.6, center.y + 1.0, center.z - 4.0);
            this.currentLookAt.lerp(_targetPos, dt * 6.0);
            this.targetFov = 74.0;
        } else if (p < 0.90) {
            // Phase 3: Crane camera over platform edge revealing the 720m plunge to the city
            const t = (p - 0.68) / 0.22;
            this.currentPos.set(center.x, center.y + 6.0 + t * 4.0, center.z + 2.0);
            _targetPos.set(center.x, center.y - 280.0, center.z + 240.0);
            this.currentLookAt.lerp(_targetPos, dt * 7.0);
            this.targetFov = 82.0;
        } else {
            // Phase 4: Swift lock behind player drone ready for dive
            const targetCamPos = new THREE.Vector3(center.x, center.y + 3.2, center.z - 9.0);
            this.currentPos.lerp(targetCamPos, dt * 10.0);
            _targetPos.set(center.x, center.y + 0.4, center.z + 8.0);
            this.currentLookAt.lerp(_targetPos, dt * 10.0);
            this.targetFov = 65.0;
        }

        this.currentFov = THREE.MathUtils.lerp(this.currentFov, this.targetFov, dt * 5.0);
        this.camera.fov = this.currentFov;
        this.camera.position.copy(this.currentPos);
        this.camera.lookAt(this.currentLookAt);
        this.camera.updateProjectionMatrix();
    }

    updateDive(drone, inputState, dt) {
        if (!drone) return;

        // Dynamic FOV dive flare: expands smoothly from 65 up to 105 deg as Mach speed builds
        const speedRatio = Math.min(1.0, Math.max(0, (drone.speedKmh - 100) / 220));
        this.targetFov = THREE.MathUtils.lerp(65.0, 105.0, speedRatio);
        this.currentFov = THREE.MathUtils.lerp(this.currentFov, this.targetFov, dt * 6.0);
        this.camera.fov = this.currentFov;

        // Lateral look / pan: player can look left & right to see rivals diving beside them
        const lookInput = (inputState && (typeof inputState.panX === 'number' ? inputState.panX : inputState.turn)) || 0;
        this.divePanYaw = THREE.MathUtils.lerp(this.divePanYaw, lookInput * 0.75, dt * 8.0);

        _forwardLook.set(0, 0, 1).applyQuaternion(drone.quaternion);
        _displacement.copy(_forwardLook).multiplyScalar(-8.5);
        _displacement.y += 3.2; // sit above & behind diving drone

        _targetPos.copy(drone.position).add(_displacement);
        this.currentPos.lerp(_targetPos, dt * 12.0);

        // Look at drone position plus lateral pan offset
        const lateralLookOffset = new THREE.Vector3(Math.sin(this.divePanYaw) * 14.0, 0, 0).applyQuaternion(drone.quaternion);
        _targetPos.copy(drone.position).addScaledVector(_forwardLook, 8.0).add(lateralLookOffset);
        this.currentLookAt.lerp(_targetPos, dt * 12.0);

        // Screenshake proportional to dive Mach speed
        _shakeOffset.set(0, 0, 0);
        const diveShake = speedRatio * 0.22;
        if (diveShake > 0.01) {
            _shakeOffset.set(
                (Math.random() - 0.5) * diveShake,
                (Math.random() - 0.5) * diveShake,
                (Math.random() - 0.5) * diveShake
            );
        }

        this.camera.position.copy(this.currentPos).add(_shakeOffset);
        this.camera.lookAt(this.currentLookAt);
        this.camera.updateProjectionMatrix();
    }

    update(drone, dt) {
        if (!drone) return;

        // Cinematic 360-degree orbit mode for victory and epilogue
        if (this.isEpilogue) {
            this.epilogueAngle += dt * 0.4;
            const orbitDist = 7.5;
            const orbitHeight = 2.2;
            this.currentPos.set(
                drone.position.x + Math.sin(this.epilogueAngle) * orbitDist,
                drone.position.y + orbitHeight,
                drone.position.z + Math.cos(this.epilogueAngle) * orbitDist
            );
            this.currentLookAt.lerp(drone.position, dt * 5.0);
            this.camera.position.copy(this.currentPos);
            this.camera.lookAt(this.currentLookAt);
            this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, 52.0, dt * 3.0);
            this.camera.updateProjectionMatrix();
            return;
        }

        // Task 48: First-Person Cockpit View Mode
        if (this.mode === CAMERA_MODES.COCKPIT) {
            if (drone.canopy) drone.canopy.visible = false;
            _idealOffset.set(0, 0.45, 1.85).applyQuaternion(drone.quaternion);
            this.currentPos.copy(drone.position).add(_idealOffset);
            _forwardLook.set(0, 0.25, 25.0).applyQuaternion(drone.quaternion);
            this.currentLookAt.copy(drone.position).add(_forwardLook);
            this.camera.position.copy(this.currentPos);
            this.camera.lookAt(this.currentLookAt);
            this.camera.fov = 76.0;
            this.camera.updateProjectionMatrix();
            return;
        } else if (drone.canopy && !drone.canopy.visible) {
            drone.canopy.visible = true;
        }

        // Task 49: Trackside Broadcast Spectator Mode
        if (this.mode === CAMERA_MODES.SPECTATOR) {
            this.spectatorDwellTimer -= dt;
            const distToDrone = this.spectatorAnchor.distanceTo(drone.position);
            if (this.spectatorDwellTimer <= 0 || distToDrone > 95 || distToDrone < 2) {
                _forwardLook.set((Math.random() - 0.5) * 20, 8, 45).applyQuaternion(drone.quaternion);
                this.spectatorAnchor.copy(drone.position).add(_forwardLook);
                this.spectatorDwellTimer = 3.5;
            }
            this.camera.position.lerp(this.spectatorAnchor, dt * 4.0);
            this.camera.lookAt(drone.position);
            this.camera.fov = 42.0;
            this.camera.updateProjectionMatrix();
            return;
        }

        // Task 46: Dedicated Photo Mode
        if (this.mode === CAMERA_MODES.PHOTO) {
            const px = drone.position.x + Math.sin(this.photoCamYaw) * Math.cos(this.photoCamPitch) * this.photoCamDistance;
            const py = drone.position.y + Math.sin(this.photoCamPitch) * this.photoCamDistance;
            const pz = drone.position.z + Math.cos(this.photoCamYaw) * Math.cos(this.photoCamPitch) * this.photoCamDistance;
            this.camera.position.set(px, py, pz);
            this.camera.lookAt(drone.position);
            return;
        }

        const camCfg = CONFIG.CAMERA;

        // 1. Calculate ideal camera offset using yaw-only quaternion (no roll inheritance)
        //    The drone's body banks visually, but the chase cam keeps the horizon level.
        let dist = camCfg.BASE_DISTANCE;
        let height = camCfg.BASE_HEIGHT;

        // Pull back on high speed / boost
        if (drone.nitroStage === 3) {
            dist += 2.2;
            height += 0.4;
            this.targetFov = camCfg.STAGE3_FOV;
        } else if (drone.nitroStage === 2) {
            dist += 1.2;
            height += 0.2;
            this.targetFov = camCfg.STAGE2_FOV;
        } else {
            this.targetFov = camCfg.BASE_FOV;
        }

        // Smooth FOV elasticity without redundant projection matrix computation
        this.currentFov = THREE.MathUtils.lerp(this.currentFov, this.targetFov, dt * 5.0);
        this.camera.fov = this.currentFov;
        this.camera.updateProjectionMatrix();

        // Build a yaw-only quaternion from the drone's euler to keep camera level
        const _euler = new THREE.Euler().setFromQuaternion(drone.quaternion, 'YXZ');
        const _yawOnlyQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, _euler.y, 0, 'YXZ'));

        // Target position in world space (zero-allocation)
        _idealOffset.set(0, height, -dist).applyQuaternion(_yawOnlyQuat);
        _targetPos.copy(drone.position).add(_idealOffset);

        // Spring-damper physics towards target position
        _displacement.copy(_targetPos).sub(this.currentPos);

        // Fail-safe: if distance is extreme (course realignment / teleport), snap cleanly
        if (_displacement.lengthSq() > 2500) {
            this.currentPos.copy(_targetPos);
            this.velocity.set(0, 0, 0);
            _displacement.set(0, 0, 0);
        }

        _springForce.copy(_displacement).multiplyScalar(camCfg.SPRING_STIFFNESS);
        _dampingForce.copy(this.velocity).multiplyScalar(camCfg.SPRING_DAMPING);

        _springForce.sub(_dampingForce);
        this.velocity.addScaledVector(_springForce, dt);
        this.currentPos.addScaledVector(this.velocity, dt);

        // Smooth look-at tracking point slightly ahead of drone (yaw-only, level horizon)
        _forwardLook.set(0, 0.4, 6.0).applyQuaternion(_yawOnlyQuat);
        _targetPos.copy(drone.position).add(_forwardLook);
        this.currentLookAt.lerp(_targetPos, dt * 10.0);

        // Screenshake decay (zero-allocation)
        _shakeOffset.set(0, 0, 0);
        if (this.shakeAmount > 0.001) {
            _shakeOffset.set(
                (Math.random() - 0.5) * this.shakeAmount,
                (Math.random() - 0.5) * this.shakeAmount,
                (Math.random() - 0.5) * this.shakeAmount
            );
            this.shakeAmount = Math.max(0, this.shakeAmount - dt * 1.5);
        }

        this.camera.position.copy(this.currentPos).add(_shakeOffset);
        this.camera.lookAt(this.currentLookAt);
    }
}
