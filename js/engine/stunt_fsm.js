/*
================================================================================
BARCH AERO-CANYON RACING - AEROBATIC STUNT STATE MACHINE (FSM)
Manages Snap Aileron Rolls, Knife-Edge Flight, and Pugachev Cobra Airbrake
================================================================================
*/

import { CONFIG } from '../config.js';
import { ParticleSystem } from './particle_system.js';

const PARTICLE_TYPES = ParticleSystem.PARTICLE_TYPES;

export const STUNT_STATES = {
    NORMAL: 'NORMAL',
    SNAP_ROLL_LEFT: 'SNAP_ROLL_LEFT',
    SNAP_ROLL_RIGHT: 'SNAP_ROLL_RIGHT',
    KNIFE_EDGE: 'KNIFE_EDGE',
    COBRA_AIRBRAKE: 'COBRA_AIRBRAKE'
};

const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

export class StuntFSM {
    constructor(soundEngine = null, onStuntTriggered = null) {
        this.sound = soundEngine;
        this.onStunt = onStuntTriggered;
        this.state = STUNT_STATES.NORMAL;
        this.stateTimer = 0.0;

        // Base flight attitude Euler angles
        this.currentYaw = 0;
        this.currentPitch = 0;
        this.currentRoll = 0;

        // Roll offset for snap maneuvers
        this.stuntRollProgress = 0;
    }

    setHeadingFromDirection(directionVector) {
        if (!directionVector) return;
        this.currentYaw = Math.atan2(directionVector.x, directionVector.z);
        this.currentPitch = 0;
        this.currentRoll = 0;
        this.stuntRollProgress = 0;
    }

    syncWithQuaternion(quaternion) {
        if (!quaternion) return;
        _euler.setFromQuaternion(quaternion, 'YXZ');
        this.currentYaw = _euler.y;
        this.currentPitch = _euler.x;
        this.currentRoll = _euler.z;
        this.stuntRollProgress = 0;
    }

    isDriftActive() {
        return this.state === STUNT_STATES.SNAP_ROLL_LEFT || 
               this.state === STUNT_STATES.SNAP_ROLL_RIGHT || 
               this.state === STUNT_STATES.KNIFE_EDGE;
    }

    isCobraActive() {
        return this.state === STUNT_STATES.COBRA_AIRBRAKE;
    }

    notify(title, bonus) {
        if (this.onStunt) this.onStunt(title, bonus);
        if (this.sound) this.sound.playStuntSuccess();
    }

    update(drone, inputState, dt) {
        const flightCfg = CONFIG.FLIGHT;
        const stuntCfg = CONFIG.STUNTS;

        const maxNitro = drone.nitroMaxCapacity || CONFIG.NITRO.MAX_CAPACITY;

        // Check for Stunt transitions from Normal State
        if (this.state === STUNT_STATES.NORMAL) {
            if (inputState.stuntRollLeft) {
                inputState.stuntRollLeft = false;
                this.state = STUNT_STATES.SNAP_ROLL_LEFT;
                this.stateTimer = 0;
                this.stuntRollProgress = 0;
                drone.group.scale.set(0.6, 0.6, 0.6); // Compress hitbox during roll
                this.notify('SNAP ROLL LEFT', `+${stuntCfg.SNAP_ROLL_NITRO_GAIN}% NITRO`);
                drone.nitroAmount = Math.min(maxNitro, drone.nitroAmount + stuntCfg.SNAP_ROLL_NITRO_GAIN);
                drone.emitStuntParticles(PARTICLE_TYPES.STUNT_ROLL);
            } else if (inputState.stuntRollRight) {
                inputState.stuntRollRight = false;
                this.state = STUNT_STATES.SNAP_ROLL_RIGHT;
                this.stateTimer = 0;
                this.stuntRollProgress = 0;
                drone.group.scale.set(0.6, 0.6, 0.6);
                this.notify('SNAP ROLL RIGHT', `+${stuntCfg.SNAP_ROLL_NITRO_GAIN}% NITRO`);
                drone.nitroAmount = Math.min(maxNitro, drone.nitroAmount + stuntCfg.SNAP_ROLL_NITRO_GAIN);
                drone.emitStuntParticles(PARTICLE_TYPES.STUNT_ROLL);
            } else if (inputState.isCobraTriggered) {
                inputState.isCobraTriggered = false;
                if (drone.speedKmh > 110) {
                    this.state = STUNT_STATES.COBRA_AIRBRAKE;
                    this.stateTimer = 0;
                    this.notify('COBRA AIRBRAKE', '-62% SPEED DUMP');
                    drone.velocity.multiplyScalar(1.0 - stuntCfg.COBRA_SPEED_DUMP);
                    drone.emitStuntParticles(PARTICLE_TYPES.STUNT_COBRA);
                }
            } else if (inputState.isKnifeEdgeHeld) {
                this.state = STUNT_STATES.KNIFE_EDGE;
                this.notify('KNIFE-EDGE ENGAGED', 'SLIT PENETRATION');
                drone.emitStuntParticles(PARTICLE_TYPES.STUNT_KNIFE);
            }
        }

        // Process active stunt states
        switch (this.state) {
            case STUNT_STATES.SNAP_ROLL_LEFT:
            case STUNT_STATES.SNAP_ROLL_RIGHT: {
                this.stateTimer += dt;
                const progress = Math.min(1.0, this.stateTimer / stuntCfg.SNAP_ROLL_DURATION);
                const rollDirection = (this.state === STUNT_STATES.SNAP_ROLL_LEFT) ? 1 : -1;
                this.stuntRollProgress = rollDirection * Math.PI * 2 * progress;

                // Standard yaw steering continues during snap roll
                this.currentYaw -= inputState.steerYaw * flightCfg.YAW_RATE * dt;

                if (progress >= 1.0) {
                    this.state = STUNT_STATES.NORMAL;
                    this.stuntRollProgress = 0;
                    drone.group.scale.set(1.0, 1.0, 1.0); // Restore hitbox
                }
                break;
            }

            case STUNT_STATES.KNIFE_EDGE: {
                // Sustain 90 degree bank (+/- PI/2)
                const targetKnifeBank = (inputState.steerYaw >= 0) ? -Math.PI / 2 : Math.PI / 2;
                this.currentRoll = THREE.MathUtils.lerp(this.currentRoll, targetKnifeBank, dt * 8.0);
                this.currentYaw -= inputState.steerYaw * flightCfg.YAW_RATE * 0.8 * dt;

                // Award continuous streaming Nitro
                drone.nitroAmount = Math.min(maxNitro, drone.nitroAmount + stuntCfg.KNIFE_EDGE_NITRO_RATE * dt);

                if (!inputState.isKnifeEdgeHeld) {
                    this.state = STUNT_STATES.NORMAL;
                }
                break;
            }

            case STUNT_STATES.COBRA_AIRBRAKE: {
                this.stateTimer += dt;
                const progress = Math.min(1.0, this.stateTimer / stuntCfg.COBRA_DURATION);

                // Subtle retro-thrust pitch cushion, then smoothly recover
                if (progress < 0.5) {
                    this.currentPitch = THREE.MathUtils.lerp(this.currentPitch, 0.15, dt * 16.0);
                } else {
                    this.currentPitch = THREE.MathUtils.lerp(this.currentPitch, 0.0, dt * 8.0);
                }

                if (progress >= 1.0) {
                    this.state = STUNT_STATES.NORMAL;
                    this.currentPitch = 0.0;
                }
                break;
            }

            case STUNT_STATES.NORMAL:
            default: {
                // Standard car-like yaw steering
                this.currentYaw -= inputState.steerYaw * flightCfg.YAW_RATE * dt;

                // Visual chassis banking: lean into the turn, ease back upright slowly (zen weight-shift)
                const targetRoll = -inputState.steerYaw * flightCfg.BANKING_TILT;
                const isSteering = Math.abs(inputState.steerYaw) > 0.08;
                const rollRate = isSteering ? 4.5 : 2.2; // Lean in gently, ease out even slower
                this.currentRoll = THREE.MathUtils.lerp(this.currentRoll, targetRoll, dt * rollRate);

                // Locked level horizon: pitch held firmly at 0.0
                this.currentPitch = THREE.MathUtils.lerp(this.currentPitch, 0.0, dt * 10.0);
                break;
            }
        }

        // Apply Euler orientation to drone quaternion (zero-allocation)
        _euler.set(
            this.currentPitch,
            this.currentYaw,
            this.currentRoll + this.stuntRollProgress,
            'YXZ'
        );
        drone.quaternion.setFromEuler(_euler);

        // Reset one-shot input triggers
        inputState.stuntRollLeft = false;
        inputState.stuntRollRight = false;
        inputState.isCobraTriggered = false;
    }
}
