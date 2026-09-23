/*
================================================================================
BARCH AERO-CANYON RACING - AUTONOMOUS AI RIVAL RACERS
AI navigation along 3D track spline, lane variation, collision, and drafting
================================================================================
*/

import { Drone } from './drone.js';
import { CONFIG } from '../config.js';

// Pre-allocated static scratch objects for zero-allocation AI loop
const _up = new THREE.Vector3(0, 1, 0);
const _dirFwd = new THREE.Vector3(0, 0, 1);
const _normal = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _pushDir = new THREE.Vector3();
const _toPlayer = new THREE.Vector3();
const _forwardVec = new THREE.Vector3();

export class AiRacer {
    constructor(scene, spline, index, totalRacers, isWingman = false) {
        this.scene = scene;
        this.spline = spline;
        this.index = index;
        this.isWingman = isWingman;

        // Distinct colors for AI competitors or Wingman
        const aiColors = [0xbd2a2a, 0x2a8cbd, 0x9c2abd, 0x2abd5d];
        const color = isWingman ? (CONFIG.TEAMWORK?.WINGMAN_COLOR || 0x00e5ff) : aiColors[index % aiColors.length];

        this.drone = new Drone(scene, true, color);
        
        // Stagger initial progress along spline
        this.trackProgress = isWingman ? 0.01 : (0.02 + (index + 1) * 0.035);
        this.currentLap = 1;
        this.baseSpeedKmh = CONFIG.FLIGHT.BASE_SPEED * (0.92 + Math.random() * 0.18);
        this.speedKmh = this.baseSpeedKmh;

        // Lane oscillation or Wingman escort offset
        this.laneOffset = isWingman ? 5.5 : ((Math.random() - 0.5) * 6.0);
        this.wobblePhase = Math.random() * Math.PI * 2;
    }

    update(dt, playerDrone = null) {
        if (this.isWingman && playerDrone) {
            // Teamwork Wingman: Formation escort flight
            const formationTargetSpeed = Math.max(CONFIG.FLIGHT.BASE_SPEED, playerDrone.speedKmh);
            this.speedKmh = THREE.MathUtils.lerp(this.speedKmh, formationTargetSpeed, dt * 4.0);

            // Match player progress with tight tactical flank offset
            const flankOffset = new THREE.Vector3(7.5, 1.2, -6.0).applyQuaternion(playerDrone.quaternion);
            _targetPos.copy(playerDrone.position).add(flankOffset);
            
            if (this.drone.position.distanceTo(_targetPos) > 30) {
                this.drone.position.copy(_targetPos);
                this.drone.quaternion.copy(playerDrone.quaternion);
            } else {
                this.drone.position.lerp(_targetPos, dt * 6.0);
                this.drone.quaternion.slerp(playerDrone.quaternion, dt * 7.0);
            }

            this.drone.rotorDiscs.forEach(r => {
                r.rotation.z += 45.0 * dt;
            });
            return;
        }

        const trackLengthApprox = 1400; // estimated meters per lap
        const speedMs = this.speedKmh / 3.6;
        const deltaT = (speedMs * dt) / trackLengthApprox;

        this.trackProgress += deltaT;
        if (this.trackProgress >= 1.0) {
            this.trackProgress -= 1.0;
            this.currentLap++;
        }

        // Evaluate spline position and forward tangent (zero-allocation)
        const centerPos = this.spline.getPointAt(this.trackProgress % 1.0);
        const tangent = this.spline.getTangentAt(this.trackProgress % 1.0).normalize();
        _normal.crossVectors(tangent, _up).normalize();

        // Calculate lane wobble
        this.wobblePhase += dt * CONFIG.AI.LANE_WOBBLE_FREQ;
        const currentLateralOffset = this.laneOffset + Math.sin(this.wobblePhase) * CONFIG.AI.LANE_WOBBLE_AMP;

        // Position drone with lateral lane offset
        _targetPos.copy(centerPos).addScaledVector(_normal, currentLateralOffset);
        this.drone.position.copy(_targetPos);

        // Orient drone along track tangent with banking
        this.drone.quaternion.setFromUnitVectors(_dirFwd, tangent);

        // Rotor spinning animation
        this.drone.rotorDiscs.forEach(r => {
            r.rotation.z += 40.0 * dt;
        });
    }

    checkPlayerCollision(playerDrone, cameraRig) {
        if (!playerDrone) return false;
        const dist = this.drone.position.distanceTo(playerDrone.position);
        const collisionRadius = 2.8;

        if (dist < collisionRadius) {
            // Elastic collision push without division-by-zero or NaN
            if (dist > 0.05) {
                _pushDir.copy(playerDrone.position).sub(this.drone.position).multiplyScalar(1 / dist);
            } else {
                _pushDir.set(0, 1, 0);
            }

            const overlap = collisionRadius - dist;
            playerDrone.position.addScaledVector(_pushDir, Math.max(0.6, overlap * 0.9));

            if (!this.isWingman && cameraRig) {
                cameraRig.triggerShake(0.3);
            }
            return true;
        }
        return false;
    }

    isPlayerDrafting(playerDrone) {
        if (!playerDrone) return false;

        // In Teamwork mode, Wingman provides a cooperative Slipstream Tether within 25m
        if (this.isWingman) {
            const dist = this.drone.position.distanceTo(playerDrone.position);
            const tetherLimit = CONFIG.TEAMWORK?.TETHER_DISTANCE || 25.0;
            return dist < tetherLimit;
        }

        // Standard rival drafting: wake cone behind AI
        _toPlayer.copy(playerDrone.position).sub(this.drone.position);
        _forwardVec.copy(_dirFwd).applyQuaternion(this.drone.quaternion);

        const distance = _toPlayer.length();
        if (distance > 0.5 && distance < CONFIG.FLIGHT.DRAFTING_DISTANCE) {
            _toPlayer.multiplyScalar(1 / distance);
            // Non-mutating dot product check
            const alignment = -_toPlayer.dot(_forwardVec);
            if (alignment > 0.82) { // Within 35-degree rear wake cone
                return true;
            }
        }
        return false;
    }

    dispose() {
        if (this.drone && typeof this.drone.dispose === 'function') {
            this.drone.dispose();
        }
    }
}
