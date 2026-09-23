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

export class TrackBuilder {
    constructor(scene, tier, sector = null) {
        this.scene = scene;
        this.tier = tier;
        this.sector = sector || CONFIG.SECTORS[0];
        this.spline = null;
        this.gates = [];
        this.instancedProps = [];
        this.trackObjects = [];
        this.buildingAABBs = [];
        this.launchPad = null;

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
        // High-density instanced industrial skyscraper monoliths with safety corridor clearance
        const count = this.tier.maxProps;
        const boxGeo = new THREE.BoxGeometry(1, 1, 1);
        boxGeo.translate(0, 0.5, 0);

        const buildingMat = new THREE.MeshStandardMaterial({
            color: 0x09121d,
            roughness: 0.8,
            metalness: 0.2
        });

        const instancedCity = new THREE.InstancedMesh(boxGeo, buildingMat, count);
        instancedCity.castShadow = this.tier.shadows;
        instancedCity.receiveShadow = this.tier.shadows;

        const dummy = new THREE.Object3D();
        const spread = this.sector.buildingSpread || 700;
        const maxHeight = this.sector.buildingHeightMax || 140;

        // Pre-sample spline points to guarantee zero collision with flight path
        const sampleCount = 64;
        const splineSamples = [];
        for (let s = 0; s < sampleCount; s++) {
            splineSamples.push(this.spline.getPointAt(s / sampleCount));
        }

        for (let i = 0; i < count; i++) {
            let bx = 0, bz = 0, bw = 0, bd = 0, bh = 0;
            let valid = false;
            let attempts = 0;

            while (!valid && attempts < 20) {
                attempts++;
                bx = (Math.random() - 0.5) * spread;
                bz = (Math.random() - 0.5) * spread;
                bw = 18 + Math.random() * 28;
                bd = 18 + Math.random() * 28;
                bh = 50 + Math.random() * maxHeight;

                // Ensure building does not clip through the track corridor or checkpoint gates
                let tooClose = false;
                const minClearance = 32 + Math.max(bw, bd) * 0.5;
                const minClearanceSq = minClearance * minClearance;

                for (let s = 0; s < sampleCount; s++) {
                    const sp = splineSamples[s];
                    const dx = bx - sp.x;
                    const dz = bz - sp.z;
                    if (dx * dx + dz * dz < minClearanceSq) {
                        tooClose = true;
                        break;
                    }
                }

                // Check distance to launch pad
                if (bx * bx + bz * bz < 42 * 42) {
                    tooClose = true;
                }

                if (!tooClose) {
                    valid = true;
                }
            }

            if (!valid) {
                // If max attempts reached, push building to safe outer perimeter
                bx += (bx >= 0 ? 55 : -55);
                bz += (bz >= 0 ? 55 : -55);
            }

            const by = -20;
            dummy.position.set(bx, by, bz);
            dummy.scale.set(bw, bh, bd);
            dummy.updateMatrix();

            instancedCity.setMatrixAt(i, dummy.matrix);

            this.buildingAABBs.push({
                min: new THREE.Vector3(bx - bw / 2, by, bz - bd / 2),
                max: new THREE.Vector3(bx + bw / 2, by + bh, bz + bd / 2)
            });
        }

        instancedCity.instanceMatrix.needsUpdate = true;
        this.scene.add(instancedCity);
        this.instancedProps.push(instancedCity);
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

        this.trackObjects.forEach(to => {
            this.scene.remove(to);
            if (to.geometry) to.geometry.dispose();
            if (to.material) {
                if (Array.isArray(to.material)) to.material.forEach(m => m.dispose());
                else to.material.dispose();
            }
        });
        this.trackObjects = [];
    }
}
