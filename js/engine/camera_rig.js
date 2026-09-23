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

export class CameraRig {
    constructor(camera) {
        this.camera = camera;
        this.currentPos = new THREE.Vector3(0, 5, -10);
        this.currentLookAt = new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);

        this.shakeAmount = 0.0;
        this.targetFov = CONFIG.CAMERA.BASE_FOV;
    }

    triggerShake(amount = 0.25) {
        this.shakeAmount = Math.min(0.6, this.shakeAmount + amount);
    }

    update(drone, dt) {
        const camCfg = CONFIG.CAMERA;

        // 1. Calculate ideal camera offset in drone's local space
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

        // Apply smooth FOV elasticity
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.targetFov, dt * 6.0);
        this.camera.updateProjectionMatrix();

        // Target position in world space (zero-allocation)
        _idealOffset.set(0, height, -dist).applyQuaternion(drone.quaternion);
        _targetPos.copy(drone.position).add(_idealOffset);

        // Spring-damper physics towards target position
        _displacement.copy(_targetPos).sub(this.currentPos);
        _springForce.copy(_displacement).multiplyScalar(camCfg.SPRING_STIFFNESS);
        _dampingForce.copy(this.velocity).multiplyScalar(camCfg.SPRING_DAMPING);

        _springForce.sub(_dampingForce);
        this.velocity.addScaledVector(_springForce, dt);
        this.currentPos.addScaledVector(this.velocity, dt);

        // Smooth look-at tracking point slightly ahead of drone
        _forwardLook.set(0, 0.4, 6.0).applyQuaternion(drone.quaternion);
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
