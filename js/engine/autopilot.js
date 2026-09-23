/*
================================================================================
BARCH AERO-CANYON RACING - AUTONOMOUS BROWSER CO-PILOT (HAND-OFF AUTOPILOT)
Spline tracking, gate traversal, obstacle evasion, and tactical throttle control
================================================================================
*/

import { CONFIG } from '../config.js';

// Pre-allocated static vectors to guarantee zero-allocation during 60-120 FPS flight
const _toTarget = new THREE.Vector3();
const _localTarget = new THREE.Vector3();
const _invQuat = new THREE.Quaternion();
const _avoidVec = new THREE.Vector3();
const _fwdVec = new THREE.Vector3();

export class Autopilot {
    constructor() {
        this.trackProgress = 0.0;
        this.overrideTimer = 0.0;
        this.isOverridden = false;
        this.activeTargetPos = new THREE.Vector3();
    }

    /**
     * Compute and inject autonomous flight controls when Autopilot is engaged.
     * @param {Drone} drone 
     * @param {Object} inputState 
     * @param {TrackBuilder} track 
     * @param {number} nextGateIndex 
     * @param {ExtractionEngine|null} extractionEngine 
     * @param {number} dt 
     */
    update(drone, inputState, track, nextGateIndex, extractionEngine = null, dt = 0.016) {
        if (!inputState.autopilotEnabled || inputState.hoverStopActive) {
            this.isOverridden = false;
            return;
        }

        const autoCfg = CONFIG.ASSIST?.AUTOPILOT || {
            LOOKAHEAD_DIST: 38.0,
            STEER_GAIN: 3.2,
            PITCH_GAIN: 2.6,
            TARGET_CRUISE_RATIO: 0.95,
            ALLOW_BOOST_ON_STRAIGHTS: true,
            MIN_BOOST_HEADING_ALIGNMENT: 0.94
        };

        // Detect pilot hands-on override: if player is actively pressing steering or brake
        const manualSteer = Math.abs(inputState.steerYaw);
        const manualPitch = Math.abs(inputState.pitch);
        const manualBrake = inputState.forward < -0.2;

        if (manualSteer > 0.35 || manualPitch > 0.4 || manualBrake) {
            this.isOverridden = true;
            this.overrideTimer = 0.8; // Yield for 0.8 seconds after pilot lets go
            return;
        }

        if (this.overrideTimer > 0) {
            this.overrideTimer -= dt;
            if (this.overrideTimer > 0) return;
            this.isOverridden = false;
        }

        // Determine navigation target point in 3D world space
        let targetSpeedKmh = CONFIG.FLIGHT.MAX_CRUISE_SPEED * autoCfg.TARGET_CRUISE_RATIO;
        let shouldBoost = false;

        if (extractionEngine && extractionEngine.payloads && extractionEngine.payloads.length > 0) {
            // Extraction Mode Navigation
            if (drone.hasPayload) {
                // Return to Base Helipad Drop Zone
                this.activeTargetPos.set(0, 18, 0);
                const distToBase = drone.position.distanceTo(this.activeTargetPos);
                if (distToBase < 40) {
                    targetSpeedKmh = 75; // Decelerate for smooth delivery
                }
            } else {
                // Find nearest undelivered payload crate
                let nearest = null;
                let minDistSq = Infinity;
                for (let i = 0; i < extractionEngine.payloads.length; i++) {
                    const p = extractionEngine.payloads[i];
                    if (!p.collected) {
                        const dSq = drone.position.distanceToSquared(p.position);
                        if (dSq < minDistSq) {
                            minDistSq = dSq;
                            nearest = p;
                        }
                    }
                }

                if (nearest) {
                    this.activeTargetPos.copy(nearest.position);
                    this.activeTargetPos.y += 12; // Approach slightly above payload
                    const distToTarget = Math.sqrt(minDistSq);
                    if (distToTarget < 45) {
                        targetSpeedKmh = 80; // Slow down to latch winch
                    }
                } else {
                    this.activeTargetPos.set(0, 25, 0);
                }
            }
        } else if (track && track.gates && track.gates.length > 0) {
            // Circuit & Teamwork Squad Spline & Gate Navigation
            const currentGate = track.gates[nextGateIndex % track.gates.length];
            const distToGate = drone.position.distanceTo(currentGate.position);

            if (distToGate < 45 && track.gates.length > 1) {
                // Lookahead to the gate after next for a smooth racing line
                const upcomingGate = track.gates[(nextGateIndex + 1) % track.gates.length];
                const blend = Math.max(0, 1.0 - (distToGate / 45));
                this.activeTargetPos.copy(currentGate.position).lerp(upcomingGate.position, blend * 0.45);
            } else {
                this.activeTargetPos.copy(currentGate.position);
            }

            // Adjust vertical offset for comfortable altitude corridor
            this.activeTargetPos.y += 2.0;
        } else {
            // Fallback default forward waypoint
            _fwdVec.set(0, 0, 1).applyQuaternion(drone.quaternion);
            this.activeTargetPos.copy(drone.position).addScaledVector(_fwdVec, 50);
        }

        // Transform target into drone's local coordinate frame
        _toTarget.subVectors(this.activeTargetPos, drone.position);
        _invQuat.copy(drone.quaternion).invert();
        _localTarget.copy(_toTarget).applyQuaternion(_invQuat);

        // Compute yaw and pitch steering errors
        const distanceToTarget = _toTarget.length();
        let desiredYaw = 0;
        let desiredPitch = 0;

        if (distanceToTarget > 0.1) {
            // Local space: X is right, Y is up, Z is forward
            const angleYaw = Math.atan2(_localTarget.x, _localTarget.z);
            const horizontalDist = Math.hypot(_localTarget.x, _localTarget.z);
            const anglePitch = Math.atan2(_localTarget.y, Math.max(1.0, horizontalDist));

            desiredYaw = THREE.MathUtils.clamp(-angleYaw * autoCfg.STEER_GAIN, -1.0, 1.0);
            desiredPitch = THREE.MathUtils.clamp(anglePitch * autoCfg.PITCH_GAIN, -1.0, 1.0);
        }

        // Skyscraper Proximity & Obstacle Evasion
        if (track && track.buildingAABBs && track.buildingAABBs.length > 0) {
            const dronePos = drone.position;
            const lookDistance = 28.0;

            for (let i = 0; i < track.buildingAABBs.length; i++) {
                const b = track.buildingAABBs[i];
                if (dronePos.y > b.max.y + 2 || dronePos.y < b.min.y - 2) continue;

                const midX = (b.min.x + b.max.x) * 0.5;
                const midZ = (b.min.z + b.max.z) * 0.5;
                const halfW = (b.max.x - b.min.x) * 0.5 + 4.5;
                const halfD = (b.max.z - b.min.z) * 0.5 + 4.5;

                const dx = dronePos.x - midX;
                const dz = dronePos.z - midZ;
                const distSq = dx * dx + dz * dz;
                const safetyRad = Math.max(halfW, halfD) + lookDistance;

                if (distSq < safetyRad * safetyRad) {
                    // Check if current velocity or heading is aiming directly into building
                    _avoidVec.set(dx, 0, dz).normalize();
                    const dot = drone.velocity.clone().normalize().dot(_avoidVec);
                    if (dot < 0.2) {
                        // Project avoidance vector to local space
                        _avoidVec.applyQuaternion(_invQuat);
                        const avoidSteer = _avoidVec.x > 0 ? 0.85 : -0.85;
                        desiredYaw = THREE.MathUtils.lerp(desiredYaw, avoidSteer, 0.65);
                        if (dronePos.y < b.max.y) {
                            desiredPitch = Math.max(desiredPitch, 0.45); // Pitch up to clear low roofs
                        }
                    }
                }
            }
        }

        // Autonomous Throttle Modulation
        let forwardThrust = 1.0;
        const turnSeverity = Math.abs(desiredYaw);

        if (turnSeverity > 0.65) {
            forwardThrust = 0.55; // Airbrake into sharp hairpins
        } else if (turnSeverity > 0.35) {
            forwardThrust = 0.85;
        } else {
            forwardThrust = 1.0;
            // On wide open straights with good heading alignment, engage nitro boost
            if (autoCfg.ALLOW_BOOST_ON_STRAIGHTS && distanceToTarget > 60 && drone.nitroAmount > 35) {
                shouldBoost = true;
            }
        }

        // Apply calculated autonomous commands into inputState
        inputState.forward = forwardThrust;
        inputState.steerYaw = desiredYaw;
        inputState.roll = desiredYaw;
        inputState.pitch = desiredPitch;
        inputState.isNitroHeld = shouldBoost;
    }
}
