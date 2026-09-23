/*
================================================================================
BARCH AERO-CANYON RACING - EXTRACTION & CARGO DELIVERY ENGINE
Manages rooftop cargo payloads, magnetic winch latching, and base drop zones
================================================================================
*/

import { CONFIG } from '../config.js';

export class ExtractionEngine {
    constructor(scene, soundEngine, onPayloadDelivered) {
        this.scene = scene;
        this.sound = soundEngine;
        this.onDelivered = onPayloadDelivered;

        this.payloads = [];
        this.basePlatform = null;
        this.dropRing = null;
        this.carrierDrone = null;
        this.payloadOnHook = null;

        // Visual winch cable
        this.winchGroup = new THREE.Group();
        const cableGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.0, 4);
        const cableMat = new THREE.MeshBasicMaterial({ color: 0x88bbdd });
        this.cableMesh = new THREE.Mesh(cableGeo, cableMat);
        this.winchGroup.add(this.cableMesh);
        this.winchGroup.visible = false;
        this.scene.add(this.winchGroup);

        // Attached cargo box on drone belly
        this.carriedBox = null;

        this.totalCount = 0;
        this.deliveredCount = 0;
        this.aiDeliveredCount = 0;
        this.isDropping = false;
        this.dropTimer = 0.0;
    }

    buildBaseZone() {
        const baseGroup = new THREE.Group();

        // Heavy industrial landing platform
        const platformGeo = new THREE.CylinderGeometry(18, 22, 4, 32);
        const platformMat = new THREE.MeshStandardMaterial({
            color: 0x111b29,
            roughness: 0.7,
            metalness: 0.3
        });
        const platform = new THREE.Mesh(platformGeo, platformMat);
        platform.position.y = -2;
        platform.receiveShadow = true;
        baseGroup.add(platform);

        // Glowing orange drop zone ring
        const ringGeo = new THREE.RingGeometry(4.0, 6.5, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xE8580A,
            side: THREE.DoubleSide
        });
        this.dropRing = new THREE.Mesh(ringGeo, ringMat);
        this.dropRing.rotation.x = -Math.PI / 2;
        this.dropRing.position.y = 0.15;
        baseGroup.add(this.dropRing);

        this.scene.add(baseGroup);
        this.basePlatform = baseGroup;
    }

    spawnPayloads(buildingAABBs, count) {
        this.totalCount = count;
        this.deliveredCount = 0;
        this.aiDeliveredCount = 0;

        const boxGeo = new THREE.BoxGeometry(2.6, 2.0, 2.6);
        const boxMat = new THREE.MeshStandardMaterial({
            color: 0xff3333,
            roughness: 0.4,
            metalness: 0.6
        });

        const pyrGeo = new THREE.ConeGeometry(3.5, 6.0, 4);
        pyrGeo.rotateX(Math.PI);
        const pyrMat = new THREE.MeshBasicMaterial({
            color: 0x0E7C7B,
            wireframe: true,
            transparent: true,
            opacity: 0.8
        });

        // Pick building tops for payload spawns
        const shuffled = [...buildingAABBs].sort(() => 0.5 - Math.random());
        for (let i = 0; i < count; i++) {
            const b = shuffled[i % shuffled.length];
            const pGroup = new THREE.Group();

            const boxMesh = new THREE.Mesh(boxGeo, boxMat);
            boxMesh.castShadow = true;
            pGroup.add(boxMesh);

            const pyrMesh = new THREE.Mesh(pyrGeo, pyrMat);
            pyrMesh.position.y = 8;
            pGroup.add(pyrMesh);

            const spawnX = (b.min.x + b.max.x) / 2;
            const spawnZ = (b.min.z + b.max.z) / 2;
            const spawnY = b.max.y + 1.2;

            pGroup.position.set(spawnX, spawnY, spawnZ);
            this.scene.add(pGroup);

            this.payloads.push({
                id: i,
                group: pGroup,
                pyramid: pyrMesh,
                box: boxMesh,
                position: pGroup.position,
                active: true
            });
        }
    }

    update(playerDrone, winchRadius, aiRacers, isVersusAi, dt) {
        // Animate floating beacons
        const time = performance.now() * 0.003;
        this.payloads.forEach(p => {
            if (p.active) {
                p.pyramid.position.y = 8 + Math.sin(time + p.id) * 0.8;
                p.pyramid.rotation.y += dt * 2.0;

                // 1. Player magnetic winch latch
                if (!this.payloadOnHook && !this.isDropping) {
                    const distToPlayer = playerDrone.position.distanceTo(p.position);
                    if (distToPlayer < winchRadius) {
                        this.latchPayload(playerDrone, p);
                    }
                }

                // 2. Versus AI drone collection check
                if (isVersusAi && aiRacers) {
                    aiRacers.forEach(ai => {
                        const distToAi = ai.drone.position.distanceTo(p.position);
                        if (distToAi < 8.0) {
                            p.active = false;
                            p.group.visible = false;
                            this.aiDeliveredCount++;
                            if (this.onDelivered) {
                                this.onDelivered('RIVAL DELIVERED CARGO', this.deliveredCount, this.aiDeliveredCount, this.totalCount);
                            }
                        }
                    });
                }
            }
        });

        // 3. Drop Zone check when carrying cargo
        if (this.payloadOnHook && !this.isDropping) {
            const distToBase = Math.hypot(playerDrone.position.x, playerDrone.position.z);
            if (distToBase < CONFIG.EXTRACTION.BASE_DROP_RADIUS && playerDrone.position.y < CONFIG.EXTRACTION.BASE_DROP_ALT_MAX && playerDrone.position.y > 0) {
                this.startDropSequence(playerDrone);
            }
        }

        // 4. Drop animation sequence
        if (this.isDropping) {
            this.dropTimer += dt;
            const dropDuration = 1.6;

            if (this.dropTimer >= dropDuration) {
                this.finalizeDelivery();
            } else {
                const progress = this.dropTimer / dropDuration;
                if (this.carriedBox) {
                    this.carriedBox.position.y = -1.5 - (progress * 12.0);
                }
            }
        }
    }

    latchPayload(drone, payload) {
        this.payloadOnHook = payload;
        payload.active = false;
        payload.group.visible = false;

        // Attach visual box to drone
        if (!this.carriedBox) {
            const boxGeo = new THREE.BoxGeometry(2.2, 1.8, 2.2);
            const boxMat = new THREE.MeshStandardMaterial({ color: 0xbd8a3a, roughness: 0.5 });
            this.carriedBox = new THREE.Mesh(boxGeo, boxMat);
            this.carriedBox.position.set(0, -1.8, 0);
            drone.group.add(this.carriedBox);
        }
        this.carriedBox.visible = true;

        if (this.sound) this.sound.playGateChime();
        if (this.onDelivered) {
            this.onDelivered('CARGO LATCHED - RETURN TO BASE', this.deliveredCount, this.aiDeliveredCount, this.totalCount);
        }
    }

    startDropSequence(drone) {
        this.isDropping = true;
        this.dropTimer = 0.0;
        if (this.sound) this.sound.playNearMiss();
    }

    finalizeDelivery() {
        this.isDropping = false;
        this.payloadOnHook = null;
        if (this.carriedBox) {
            this.carriedBox.visible = false;
        }

        this.deliveredCount++;
        if (this.sound) this.sound.playStuntSuccess();

        if (this.onDelivered) {
            this.onDelivered('EXTRACTION CONFIRMED', this.deliveredCount, this.aiDeliveredCount, this.totalCount);
        }
    }

    dispose() {
        this.payloads.forEach(p => {
            this.scene.remove(p.group);
            p.box.geometry.dispose();
            p.pyramid.geometry.dispose();
        });
        this.payloads = [];

        if (this.basePlatform) {
            this.scene.remove(this.basePlatform);
            this.basePlatform = null;
        }

        if (this.carriedBox) {
            if (this.carriedBox.parent) this.carriedBox.parent.remove(this.carriedBox);
            this.carriedBox.geometry.dispose();
            this.carriedBox = null;
        }
    }
}
