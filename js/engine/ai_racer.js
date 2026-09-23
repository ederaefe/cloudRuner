/*
================================================================================
BARCH AERO-CANYON RACING - AUTONOMOUS AI RIVAL RACERS
AI navigation along 3D track spline, lane variation, collision, and drafting
================================================================================
*/

import { Drone } from './drone.js';
import { CONFIG } from '../config.js';

export class AiRacer {
    constructor(scene, spline, index, totalRacers) {
        this.scene = scene;
        this.spline = spline;
        this.index = index;

        // Distinct colors for AI competitors
        const aiColors = [0xbd2a2a, 0x2a8cbd, 0x9c2abd, 0x2abd5d];
        const color = aiColors[index % aiColors.length];

        this.drone = new Drone(scene, true, color);
        
        // Stagger initial progress along spline
        this.trackProgress = 0.02 + (index + 1) * 0.035;
        this.currentLap = 1;
        this.baseSpeedKmh = CONFIG.FLIGHT.BASE_SPEED * (0.92 + Math.random() * 0.18);
        this.speedKmh = this.baseSpeedKmh;

        // Lane oscillation
        this.laneOffset = (Math.random() - 0.5) * 6.0;
        this.wobblePhase = Math.random() * Math.PI * 2;
    }

    update(dt) {
        const trackLengthApprox = 1400; // estimated meters per lap
        const speedMs = this.speedKmh / 3.6;
        const deltaT = (speedMs * dt) / trackLengthApprox;

        this.trackProgress += deltaT;
        if (this.trackProgress >= 1.0) {
            this.trackProgress -= 1.0;
            this.currentLap++;
        }

        // Evaluate spline position and forward tangent
        const centerPos = this.spline.getPointAt(this.trackProgress % 1.0);
        const tangent = this.spline.getTangentAt(this.trackProgress % 1.0).normalize();
        const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

        // Calculate lane wobble
        this.wobblePhase += dt * CONFIG.AI.LANE_WOBBLE_FREQ;
        const currentLateralOffset = this.laneOffset + Math.sin(this.wobblePhase) * CONFIG.AI.LANE_WOBBLE_AMP;

        // Position drone with lateral lane offset
        const targetPos = centerPos.clone().addScaledVector(normal, currentLateralOffset);
        this.drone.position.copy(targetPos);

        // Orient drone along track tangent with banking
        this.drone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

        // Rotor spinning animation
        this.drone.rotorDiscs.forEach(r => {
            r.rotation.z += 40.0 * dt;
        });
    }

    checkPlayerCollision(playerDrone, cameraRig) {
        const dist = this.drone.position.distanceTo(playerDrone.position);
        const collisionRadius = 2.8;

        if (dist < collisionRadius) {
            // Elastic collision push
            const pushDir = playerDrone.position.clone().sub(this.drone.position).normalize();
            playerDrone.position.addScaledVector(pushDir, 0.6);
            cameraRig.triggerShake(0.3);
            return true;
        }
        return false;
    }

    isPlayerDrafting(playerDrone) {
        // Check if player is directly behind AI within slipstream cone
        const toPlayer = playerDrone.position.clone().sub(this.drone.position);
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.drone.quaternion);

        const distance = toPlayer.length();
        if (distance > 0.5 && distance < CONFIG.FLIGHT.DRAFTING_DISTANCE) {
            const alignment = toPlayer.clone().normalize().dot(forward.clone().negate());
            if (alignment > 0.82) { // Within 35-degree rear wake cone
                return true;
            }
        }
        return false;
    }
}
