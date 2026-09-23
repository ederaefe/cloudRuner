/*
================================================================================
BARCH AERO-CANYON RACING - 3D SPLINE TRACK & INSTANCED ENVIRONMENT
Procedural CatmullRom ribbon, holographic hexagonal gates, and industrial props
================================================================================
*/

import { CONFIG } from '../config.js';

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

        this.buildTrackSpline();
        this.createTrackRibbon();
        this.createHolographicGates();
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
            const up = new THREE.Vector3(0, 1, 0);
            const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

            // Left and right track edge coordinates
            const pL = pt.clone().addScaledVector(normal, -width / 2);
            const pR = pt.clone().addScaledVector(normal, width / 2);

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
            const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
            edgePtsL.push(pt.clone().addScaledVector(normal, -width / 2));
            edgePtsR.push(pt.clone().addScaledVector(normal, width / 2));
        }

        const edgeLineL = new THREE.Line(new THREE.BufferGeometry().setFromPoints(edgePtsL), lineMat);
        const edgeLineR = new THREE.Line(new THREE.BufferGeometry().setFromPoints(edgePtsR), lineMat);
        this.scene.add(edgeLineL);
        this.scene.add(edgeLineR);
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

    populateInstancedEnvironment() {
        // High-density instanced industrial skyscraper monoliths and crane gantries
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

        for (let i = 0; i < count; i++) {
            let bx = (Math.random() - 0.5) * spread;
            let bz = (Math.random() - 0.5) * spread;
            let by = -20;

            const bw = 18 + Math.random() * 28;
            const bd = 18 + Math.random() * 28;
            const bh = 50 + Math.random() * maxHeight;

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
        this.gates.forEach(g => {
            this.scene.remove(g.mesh);
            g.mesh.geometry.dispose();
        });
        this.gates = [];

        this.instancedProps.forEach(ip => {
            this.scene.remove(ip);
            ip.geometry.dispose();
        });
        this.instancedProps = [];

        this.trackObjects.forEach(to => {
            this.scene.remove(to);
            if (to.geometry) to.geometry.dispose();
        });
        this.trackObjects = [];
    }
}
