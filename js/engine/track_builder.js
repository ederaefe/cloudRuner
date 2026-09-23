/*
================================================================================
BARCH AERO-CANYON RACING - 3D SPLINE TRACK & INSTANCED ENVIRONMENT
Procedural CatmullRom ribbon, holographic hexagonal gates, and industrial props
================================================================================
*/

import { CONFIG } from '../config.js';

// Pre-allocated static vectors for track calculations
const _up = new THREE.Vector3(0, 1, 0);
const _normal = new THREE.Vector3();
const _colNormal = new THREE.Vector3();

export class TrackBuilder {
    constructor(scene, tier, sector = null) {
        this.scene = scene;
        this.tier = tier;
        this.sector = sector || CONFIG.SECTORS[0];
        this.spline = null;
        this.gates = [];
        this.instancedProps = [];
        this.trackObjects = [];
        this.skyBridges = [];
        this.buildingAABBs = [];
        this.launchPad = null;
        this.lastNearMissTime = 0;

        this.buildTrackSpline();
        this.createTrackRibbon();
        this.createHolographicGates();
        this.createLaunchPad();
        this.populateInstancedEnvironment();
    }

    buildTrackSpline() {
        // High-velocity 3D urban canyon loop with altitude climbs, dives, and sharp chicanes
        const points = [
            new THREE.Vector3(0, 15, 0),
            new THREE.Vector3(60, 25, 120),
            new THREE.Vector3(140, 50, 220),
            new THREE.Vector3(80, 80, 360),
            new THREE.Vector3(-60, 45, 450),
            new THREE.Vector3(-180, 20, 380),
            new THREE.Vector3(-240, 60, 240),
            new THREE.Vector3(-200, 95, 100),
            new THREE.Vector3(-80, 70, -40),
            new THREE.Vector3(40, 30, -120),
            new THREE.Vector3(160, 10, -80),
            new THREE.Vector3(100, 12, -20)
        ];

        this.spline = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);
    }

    createTrackRibbon() {
        // Extrude a dual-rail energy track ribbon along the spline
        const segments = 240;
        const width = CONFIG.TRACK.RIBBON_WIDTH;

        const ribbonGeo = new THREE.BufferGeometry();
        const positions = [];
        const indices = [];

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const pt = this.spline.getPointAt(t);
            const tangent = this.spline.getTangentAt(t).normalize();
            _normal.crossVectors(tangent, _up).normalize();

            // Left and right track edge coordinates
            const pL = pt.clone().addScaledVector(_normal, -width / 2);
            const pR = pt.clone().addScaledVector(_normal, width / 2);

            positions.push(pL.x, pL.y, pL.z);
            positions.push(pR.x, pR.y, pR.z);

            if (i < segments) {
                const base = i * 2;
                indices.push(base, base + 1, base + 2);
                indices.push(base + 1, base + 3, base + 2);
            }
        }

        ribbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        ribbonGeo.setIndex(indices);
        ribbonGeo.computeVertexNormals();

        const ribbonMat = new THREE.MeshStandardMaterial({
            color: 0x0c1524,
            roughness: 0.6,
            metalness: 0.4,
            side: THREE.DoubleSide
        });

        const trackMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
        trackMesh.receiveShadow = this.tier.shadows;
        this.scene.add(trackMesh);

        // Neon track borders
        const lineMat = new THREE.LineBasicMaterial({ color: 0x0E7C7B, linewidth: 2 });
        const edgePtsL = [];
        const edgePtsR = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const pt = this.spline.getPointAt(t);
            const tangent = this.spline.getTangentAt(t).normalize();
            _normal.crossVectors(tangent, _up).normalize();
            edgePtsL.push(pt.clone().addScaledVector(_normal, -width / 2));
            edgePtsR.push(pt.clone().addScaledVector(_normal, width / 2));
        }

        const edgeLineL = new THREE.Line(new THREE.BufferGeometry().setFromPoints(edgePtsL), lineMat);
        const edgeLineR = new THREE.Line(new THREE.BufferGeometry().setFromPoints(edgePtsR), lineMat);
        this.scene.add(edgeLineL);
        this.scene.add(edgeLineR);

        this.trackObjects.push(trackMesh, edgeLineL, edgeLineR);
    }

    createHolographicGates() {
        const totalGates = CONFIG.TRACK.TOTAL_GATES;
        const gateRadius = CONFIG.TRACK.GATE_RADIUS;

        // Hexagonal holographic ring geometry
        const hexGeo = new THREE.RingGeometry(gateRadius - 0.4, gateRadius, 6);
        const hexMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85
        });

        for (let i = 0; i < totalGates; i++) {
            const t = i / totalGates;
            const pos = this.spline.getPointAt(t);
            const tangent = this.spline.getTangentAt(t).normalize();

            const gateMesh = new THREE.Mesh(hexGeo, hexMat.clone());
            gateMesh.position.copy(pos);
            gateMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

            // Start/Finish gate has distinctive orange tint
            if (i === 0) {
                gateMesh.material.color.setHex(0xE8580A);
                gateMesh.scale.set(1.2, 1.2, 1.2);
            }

            this.scene.add(gateMesh);
            this.gates.push({
                index: i,
                position: pos,
                normal: tangent,
                mesh: gateMesh,
                passed: false
            });
        }
    }

    createLaunchPad() {
        const padGroup = new THREE.Group();
        const startPoint = this.spline.getPointAt(0);

        // Heavy hexagonal launch platform
        const platformGeo = new THREE.CylinderGeometry(14, 16, 1.6, 6);
        const platformMat = new THREE.MeshStandardMaterial({
            color: 0x111c2b,
            roughness: 0.6,
            metalness: 0.4
        });
        const platform = new THREE.Mesh(platformGeo, platformMat);
        platform.position.set(startPoint.x, startPoint.y - 1.2, startPoint.z);
        platform.receiveShadow = this.tier.shadows;
        padGroup.add(platform);

        // Glowing border ring
        const ringGeo = new THREE.RingGeometry(11.5, 13.5, 6);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x0E7C7B,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(startPoint.x, startPoint.y - 0.38, startPoint.z);
        padGroup.add(ring);

        // Center amber chevron / target decal
        const decalGeo = new THREE.RingGeometry(2.5, 4.5, 32);
        const decalMat = new THREE.MeshBasicMaterial({
            color: 0xE8580A,
            side: THREE.DoubleSide
        });
        const decal = new THREE.Mesh(decalGeo, decalMat);
        decal.rotation.x = -Math.PI / 2;
        decal.position.set(startPoint.x, startPoint.y - 0.36, startPoint.z);
        padGroup.add(decal);

        this.scene.add(padGroup);
        this.launchPad = padGroup;
    }

    populateInstancedEnvironment() {
        const count = this.tier.maxProps;
        const boxGeo = new THREE.BoxGeometry(1, 1, 1);
        boxGeo.translate(0, 0.5, 0);

        // Vibrant PBR building material with support for per-instance colors
        const buildingMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.55,
            metalness: 0.35
        });

        const instancedCity = new THREE.InstancedMesh(boxGeo, buildingMat, count);
        instancedCity.castShadow = this.tier.shadows;
        instancedCity.receiveShadow = this.tier.shadows;

        const dummy = new THREE.Object3D();
        const spread = this.sector.buildingSpread || 700;
        const maxHeight = this.sector.buildingHeightMax || 140;

        // Sector-coordinated color palettes
        const defaultPalette = [0x0F8B8D, 0x1E3D59, 0xEC9A29, 0x17B978, 0x2B4162, 0xFF6E40, 0x38A3A5, 0x57CC99];
        const palette = (this.sector.buildingColors && this.sector.buildingColors.length > 0)
            ? this.sector.buildingColors
            : defaultPalette;

        // Pre-sample spline points for corridor framing and safety envelopes
        const sampleCount = 96;
        const splineSamples = [];
        const splineNormals = [];
        for (let s = 0; s < sampleCount; s++) {
            const t = s / sampleCount;
            const pt = this.spline.getPointAt(t);
            const tan = this.spline.getTangentAt(t).normalize();
            const norm = new THREE.Vector3().crossVectors(tan, _up).normalize();
            splineSamples.push(pt);
            splineNormals.push(norm);
        }

        const canyonCount = Math.floor(count * 0.65);
        const outerCount = count - canyonCount;
        const tempColor = new THREE.Color();

        // 1. Canyon-Aligned Flankers (Architecturally Coordinated Along Spline)
        for (let i = 0; i < canyonCount; i++) {
            const sampleIdx = Math.floor((i / canyonCount) * sampleCount) % sampleCount;
            const sp = splineSamples[sampleIdx];
            const norm = splineNormals[sampleIdx];
            const side = (i % 2 === 0) ? 1 : -1;

            // Safe corridor setback with controlled variation for near-miss opportunities
            const trackWidth = CONFIG.TRACK.RIBBON_WIDTH || 12;
            const corridorSetback = (trackWidth * 0.5) + 22 + ((i * 7) % 24);
            const lateralJitter = ((i * 13) % 15) - 7.5;

            const bw = 22 + ((i * 11) % 26);
            const bd = 22 + ((i * 17) % 26);
            const bh = 55 + ((i * 23) % Math.max(30, maxHeight - 30));

            const bx = sp.x + (norm.x * corridorSetback * side) + (norm.z * lateralJitter);
            const bz = sp.z + (norm.z * corridorSetback * side) - (norm.x * lateralJitter);
            const by = -20;

            dummy.position.set(bx, by, bz);
            dummy.scale.set(bw, bh, bd);
            if (dummy.rotation && typeof dummy.rotation.set === 'function') {
                dummy.rotation.set(0, (i * 0.2), 0);
            } else if (dummy.rotation) {
                dummy.rotation.y = (i * 0.2);
            }
            dummy.updateMatrix();

            instancedCity.setMatrixAt(i, dummy.matrix);

            // Per-instance coordinated color
            const colorHex = palette[i % palette.length];
            tempColor.setHex(colorHex);
            if (typeof instancedCity.setColorAt === 'function') {
                instancedCity.setColorAt(i, tempColor);
            }

            this.buildingAABBs.push({
                min: new THREE.Vector3(bx - bw / 2, by, bz - bd / 2),
                max: new THREE.Vector3(bx + bw / 2, by + bh, bz + bd / 2),
                topCenter: new THREE.Vector3(bx, by + bh, bz),
                width: bw,
                depth: bd,
                height: bh
            });
        }

        // 2. Outer Urban Skyline Clusters (Horizon Monoliths)
        for (let i = 0; i < outerCount; i++) {
            const instIdx = canyonCount + i;
            let bx = 0, bz = 0, bw = 0, bd = 0, bh = 0;
            let valid = false;
            let attempts = 0;

            while (!valid && attempts < 25) {
                attempts++;
                const angle = (i / outerCount) * Math.PI * 2 + (attempts * 0.1);
                const radius = 180 + Math.random() * (spread * 0.5);
                bx = Math.cos(angle) * radius;
                bz = Math.sin(angle) * radius;
                bw = 26 + Math.random() * 34;
                bd = 26 + Math.random() * 34;
                bh = 70 + Math.random() * maxHeight;

                let tooClose = false;
                const minClearance = 36 + Math.max(bw, bd) * 0.5;
                const minClearanceSq = minClearance * minClearance;

                for (let s = 0; s < sampleCount; s += 2) {
                    const sp = splineSamples[s];
                    const dx = bx - sp.x;
                    const dz = bz - sp.z;
                    if (dx * dx + dz * dz < minClearanceSq) {
                        tooClose = true;
                        break;
                    }
                }

                if (bx * bx + bz * bz < 45 * 45) {
                    tooClose = true;
                }

                if (!tooClose) {
                    valid = true;
                }
            }

            if (!valid) {
                bx += (bx >= 0 ? 80 : -80);
                bz += (bz >= 0 ? 80 : -80);
            }

            const by = -20;
            dummy.position.set(bx, by, bz);
            dummy.scale.set(bw, bh, bd);
            if (dummy.rotation && typeof dummy.rotation.set === 'function') {
                dummy.rotation.set(0, (i * 0.45), 0);
            } else if (dummy.rotation) {
                dummy.rotation.y = (i * 0.45);
            }
            dummy.updateMatrix();

            instancedCity.setMatrixAt(instIdx, dummy.matrix);

            const colorHex = palette[(canyonCount + i) % palette.length];
            tempColor.setHex(colorHex);
            if (typeof instancedCity.setColorAt === 'function') {
                instancedCity.setColorAt(instIdx, tempColor);
            }

            this.buildingAABBs.push({
                min: new THREE.Vector3(bx - bw / 2, by, bz - bd / 2),
                max: new THREE.Vector3(bx + bw / 2, by + bh, bz + bd / 2),
                topCenter: new THREE.Vector3(bx, by + bh, bz),
                width: bw,
                depth: bd,
                height: bh
            });
        }

        instancedCity.instanceMatrix.needsUpdate = true;
        if (instancedCity.instanceColor) {
            instancedCity.instanceColor.needsUpdate = true;
        }
        this.scene.add(instancedCity);
        this.instancedProps.push(instancedCity);

        // 3. Instanced Rooftop Architectural Helipads & Communication Spires
        this.createRooftopDetails();
    }

    createRooftopDetails() {
        if (!this.buildingAABBs || this.buildingAABBs.length === 0) return;

        // Select every 3rd building with sufficient roof width for helipads
        const helipadCandidates = this.buildingAABBs.filter((b, idx) => idx % 3 === 0 && b.width >= 24 && b.depth >= 24);
        if (helipadCandidates.length > 0) {
            const padCount = helipadCandidates.length;
            const padGeo = new THREE.CylinderGeometry(5.5, 6.0, 0.6, 16);
            const padMat = new THREE.MeshStandardMaterial({
                color: 0x1f2937,
                roughness: 0.7,
                metalness: 0.3
            });
            const instancedPads = new THREE.InstancedMesh(padGeo, padMat, padCount);
            instancedPads.receiveShadow = this.tier.shadows;

            const dummy = new THREE.Object3D();
            for (let i = 0; i < padCount; i++) {
                const b = helipadCandidates[i];
                dummy.position.set(b.topCenter.x, b.topCenter.y + 0.3, b.topCenter.z);
                if (dummy.rotation && typeof dummy.rotation.set === 'function') dummy.rotation.set(0, 0, 0);
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                instancedPads.setMatrixAt(i, dummy.matrix);
            }
            instancedPads.instanceMatrix.needsUpdate = true;
            this.scene.add(instancedPads);
            this.instancedProps.push(instancedPads);

            // Glowing rooftop ring target
            const ringGeo = new THREE.RingGeometry(3.5, 4.8, 16);
            const trimColor = this.sector.trimColor || 0x00ffff;
            const ringMat = new THREE.MeshBasicMaterial({
                color: trimColor,
                side: THREE.DoubleSide
            });
            const instancedRings = new THREE.InstancedMesh(ringGeo, ringMat, padCount);
            for (let i = 0; i < padCount; i++) {
                const b = helipadCandidates[i];
                dummy.position.set(b.topCenter.x, b.topCenter.y + 0.62, b.topCenter.z);
                if (dummy.rotation && typeof dummy.rotation.set === 'function') {
                    dummy.rotation.set(-Math.PI / 2, 0, 0);
                } else if (dummy.rotation) {
                    dummy.rotation.x = -Math.PI / 2;
                }
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                instancedRings.setMatrixAt(i, dummy.matrix);
            }
            instancedRings.instanceMatrix.needsUpdate = true;
            this.scene.add(instancedRings);
            this.instancedProps.push(instancedRings);
        }

        // Rooftop Communication Spires with Aviation Warning Beacons on tall towers
        const spireCandidates = this.buildingAABBs.filter((b, idx) => idx % 4 === 1 && b.height > 85);
        if (spireCandidates.length > 0) {
            const spireCount = spireCandidates.length;
            const spireGeo = new THREE.CylinderGeometry(0.25, 0.6, 16, 6);
            spireGeo.translate(0, 8, 0);
            const spireMat = new THREE.MeshStandardMaterial({
                color: 0x4b5563,
                metalness: 0.8,
                roughness: 0.2
            });
            const instancedSpires = new THREE.InstancedMesh(spireGeo, spireMat, spireCount);
            
            const beaconGeo = new THREE.SphereGeometry(0.8, 8, 8);
            const beaconMat = new THREE.MeshBasicMaterial({
                color: (this.sector.beaconColors && this.sector.beaconColors[0]) || 0xff0055
            });
            const instancedBeacons = new THREE.InstancedMesh(beaconGeo, beaconMat, spireCount);

            const dummy = new THREE.Object3D();
            for (let i = 0; i < spireCount; i++) {
                const b = spireCandidates[i];
                dummy.position.set(b.topCenter.x, b.topCenter.y, b.topCenter.z);
                if (dummy.rotation && typeof dummy.rotation.set === 'function') dummy.rotation.set(0, 0, 0);
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                instancedSpires.setMatrixAt(i, dummy.matrix);

                dummy.position.set(b.topCenter.x, b.topCenter.y + 16, b.topCenter.z);
                dummy.updateMatrix();
                instancedBeacons.setMatrixAt(i, dummy.matrix);
            }
            instancedSpires.instanceMatrix.needsUpdate = true;
            instancedBeacons.instanceMatrix.needsUpdate = true;

            this.scene.add(instancedSpires);
            this.scene.add(instancedBeacons);
            this.instancedProps.push(instancedSpires, instancedBeacons);
        }

        // Sky-Bridges spanning across canyon walls
        this.createSkyBridges();
    }

    createSkyBridges() {
        if (!this.spline) return;
        const bridgeFractions = [0.25, 0.62, 0.88];
        const bridgeGeo = new THREE.BoxGeometry(42, 3.5, 8);
        const bridgeMat = new THREE.MeshStandardMaterial({
            color: 0x1a2332,
            roughness: 0.5,
            metalness: 0.5
        });

        const trimGeo = new THREE.BoxGeometry(42.2, 0.6, 8.2);
        const trimMat = new THREE.MeshBasicMaterial({
            color: this.sector.trimColor || 0x00ffff
        });

        bridgeFractions.forEach((f) => {
            const pt = this.spline.getPointAt(f);
            const tan = this.spline.getTangentAt(f).normalize();
            const norm = new THREE.Vector3().crossVectors(tan, _up).normalize();

            const bridgeGroup = new THREE.Group();
            const mainMesh = new THREE.Mesh(bridgeGeo, bridgeMat);
            const trimMesh = new THREE.Mesh(trimGeo, trimMat);
            trimMesh.position.y = 1.8;

            bridgeGroup.add(mainMesh);
            bridgeGroup.add(trimMesh);

            // Elevated over track
            bridgeGroup.position.set(pt.x, pt.y + 26, pt.z);
            bridgeGroup.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), norm);

            this.scene.add(bridgeGroup);
            this.skyBridges.push(bridgeGroup);
        });
    }

    checkBuildingCollision(drone, cameraRig = null, soundEngine = null, hud = null, dt = 0.016) {
        if (!drone || !this.buildingAABBs || this.buildingAABBs.length === 0) return false;

        const px = drone.position.x;
        const py = drone.position.y;
        const pz = drone.position.z;
        const droneRadius = 2.2;
        const droneRadiusSq = droneRadius * droneRadius;
        const nearMissDistSq = (droneRadius + 3.8) * (droneRadius + 3.8);

        let collided = false;
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

        for (let i = 0; i < this.buildingAABBs.length; i++) {
            const b = this.buildingAABBs[i];

            // Fast axis-aligned bounding volume pruning
            if (py > b.max.y + 4.0 || py < b.min.y - 2.0) continue;
            const halfW = (b.max.x - b.min.x) * 0.5;
            const halfD = (b.max.z - b.min.z) * 0.5;
            const midX = (b.min.x + b.max.x) * 0.5;
            const midZ = (b.min.z + b.max.z) * 0.5;
            if (Math.abs(px - midX) > halfW + 6.0) continue;
            if (Math.abs(pz - midZ) > halfD + 6.0) continue;

            // Find closest point on AABB to drone center
            const cx = Math.max(b.min.x, Math.min(px, b.max.x));
            const cy = Math.max(b.min.y, Math.min(py, b.max.y));
            const cz = Math.max(b.min.z, Math.min(pz, b.max.z));

            const dx = px - cx;
            const dy = py - cy;
            const dz = pz - cz;
            const distSq = dx * dx + dy * dy + dz * dz;

            // 1. Direct penetration / collision check
            if (distSq < droneRadiusSq) {
                collided = true;
                const dist = Math.sqrt(distSq);

                if (dist > 0.001) {
                    _colNormal.set(dx / dist, dy / dist, dz / dist);
                } else {
                    // Deep penetration fallback: push along smallest overlap axis
                    const overlapX1 = px - b.min.x;
                    const overlapX2 = b.max.x - px;
                    const overlapZ1 = pz - b.min.z;
                    const overlapZ2 = b.max.z - pz;
                    const minOverlap = Math.min(overlapX1, overlapX2, overlapZ1, overlapZ2);
                    if (minOverlap === overlapX1) _colNormal.set(-1, 0, 0);
                    else if (minOverlap === overlapX2) _colNormal.set(1, 0, 0);
                    else if (minOverlap === overlapZ1) _colNormal.set(0, 0, -1);
                    else _colNormal.set(0, 0, 1);
                }

                // Push drone outside the building boundary
                const pushDist = (droneRadius - dist) + 0.2;
                drone.position.addScaledVector(_colNormal, pushDist);

                // Deflect and dampen velocity (elastic bounce with hull energy absorption)
                if (drone.velocity) {
                    const dot = drone.velocity.dot(_colNormal);
                    if (dot < 0) {
                        drone.velocity.addScaledVector(_colNormal, -1.5 * dot);
                    }
                    drone.velocity.multiplyScalar(0.72);
                }

                if (cameraRig && typeof cameraRig.triggerShake === 'function') cameraRig.triggerShake(0.38);
                if (drone.emitCollisionParticles && typeof drone.emitCollisionParticles === 'function') drone.emitCollisionParticles(_colNormal);
                if (soundEngine && typeof soundEngine.playNearMiss === 'function') soundEngine.playNearMiss();
                if (hud && typeof hud.showStuntAlert === 'function' && (now - this.lastNearMissTime > 600)) {
                    hud.showStuntAlert('IMPACT DEFLECTION', 'SHIELD COMPENSATED');
                    this.lastNearMissTime = now;
                }
                break;
            }
            // 2. High-speed near-miss facade buzzing
            else if (distSq < nearMissDistSq && drone.speedKmh > 150) {
                if (now - this.lastNearMissTime > 500) {
                    this.lastNearMissTime = now;
                    if (cameraRig && typeof cameraRig.triggerShake === 'function') cameraRig.triggerShake(0.12);
                    if (soundEngine && typeof soundEngine.playNearMiss === 'function') soundEngine.playNearMiss();
                    const maxN = drone.nitroMaxCapacity || (CONFIG.NITRO?.MAX_CAPACITY || 100);
                    drone.nitroAmount = Math.min(maxN, drone.nitroAmount + 6.0);
                    if (hud && typeof hud.showStuntAlert === 'function') hud.showStuntAlert('FACADE BUZZ', '+6% NITRO RECHARGE');
                }
            }
        }

        return collided;
    }

    dispose() {
        if (this.launchPad) {
            this.scene.remove(this.launchPad);
            this.launchPad.traverse(c => {
                if (c.geometry) c.geometry.dispose();
                if (c.material) {
                    if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
                    else c.material.dispose();
                }
            });
            this.launchPad = null;
        }

        this.gates.forEach(g => {
            if (g.mesh) {
                this.scene.remove(g.mesh);
                if (g.mesh.geometry) g.mesh.geometry.dispose();
                if (g.mesh.material) g.mesh.material.dispose();
            }
        });
        this.gates = [];

        this.instancedProps.forEach(ip => {
            this.scene.remove(ip);
            if (ip.geometry) ip.geometry.dispose();
            if (ip.material) {
                if (Array.isArray(ip.material)) ip.material.forEach(m => m.dispose());
                else ip.material.dispose();
            }
        });
        this.instancedProps = [];

        this.skyBridges.forEach(sb => {
            this.scene.remove(sb);
            sb.traverse(c => {
                if (c.geometry) c.geometry.dispose();
                if (c.material) {
                    if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
                    else c.material.dispose();
                }
            });
        });
        this.skyBridges = [];

        this.trackObjects.forEach(to => {
            this.scene.remove(to);
            if (to.geometry) to.geometry.dispose();
            if (to.material) {
                if (Array.isArray(to.material)) to.material.forEach(m => m.dispose());
                else to.material.dispose();
            }
        });
        this.trackObjects = [];
        this.buildingAABBs = [];
    }
}
