/*
================================================================================
BARCH AERO-CANYON RACING - SPRING-DAMPER CHASE CAMERA RIG
Inertial camera mass, acceleration setback, and dynamic FOV warping
================================================================================
*/

import { CONFIG } from '../config.js';

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

        // Target position in world space
        const idealOffset = new THREE.Vector3(0, height, -dist);
        idealOffset.applyQuaternion(drone.quaternion);
        const targetPos = drone.position.clone().add(idealOffset);

        // Spring-damper physics towards target position
        const displacement = targetPos.clone().sub(this.currentPos);
        const springForce = displacement.multiplyScalar(camCfg.SPRING_STIFFNESS);
        const dampingForce = this.velocity.clone().multiplyScalar(camCfg.SPRING_DAMPING);

        const acceleration = springForce.sub(dampingForce);
        this.velocity.addScaledVector(acceleration, dt);
        this.currentPos.addScaledVector(this.velocity, dt);

        // Smooth look-at tracking point slightly ahead of drone
        const forwardLook = new THREE.Vector3(0, 0.4, 6.0).applyQuaternion(drone.quaternion);
        const targetLookAt = drone.position.clone().add(forwardLook);
        this.currentLookAt.lerp(targetLookAt, dt * 10.0);

        // Screenshake decay
        let shakeOffset = new THREE.Vector3();
        if (this.shakeAmount > 0.001) {
            shakeOffset.set(
                (Math.random() - 0.5) * this.shakeAmount,
                (Math.random() - 0.5) * this.shakeAmount,
                (Math.random() - 0.5) * this.shakeAmount
            );
            this.shakeAmount = Math.max(0, this.shakeAmount - dt * 1.5);
        }

        this.camera.position.copy(this.currentPos).add(shakeOffset);
        this.camera.lookAt(this.currentLookAt);
    }
}
