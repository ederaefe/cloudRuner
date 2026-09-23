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

function createProceduralTexture(width, height, drawFn) {
    if (typeof document === 'undefined' || !document.createElement) {
        return null;
    }
    try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) drawFn(ctx, width, height);
        if (typeof THREE !== 'undefined' && THREE.CanvasTexture) {
            const tex = new THREE.CanvasTexture(canvas);
            if (THREE.RepeatWrapping) {
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
            }
            return tex;
        }
    } catch (e) {
        return null;
    }
    return null;
}

// Task 11: Deterministic Mulberry32 Seedable PRNG
export class SeededRNG {
    constructor(seedStr = 'BARCH-ALPHA') {
        let hash = 0;
        const s = String(seedStr);
        for (let i = 0; i < s.length; i++) {
            hash = ((hash << 5) - hash) + s.charCodeAt(i);
            hash |= 0;
        }
        this.s = (hash >>> 0) || 123456789;
    }

    random() {
        let t = (this.s += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    range(min, max) {
        return min + this.random() * (max - min);
    }
}

export class TrackBuilder {
    constructor(scene, tier, sector = null, seed = 'BARCH-ALPHA', skyline = null) {
        this.scene = scene;
        this.tier = tier;
        let baseSector = sector || CONFIG.SECTORS[0];
        if (skyline) {
            this.skyline = skyline;
            this.sector = {
                ...baseSector,
                sunColor: skyline.sunColor !== undefined ? skyline.sunColor : baseSector.sunColor,
                skyColor: skyline.skyColor !== undefined ? skyline.skyColor : baseSector.skyColor,
                zenithColor: skyline.zenithColor !== undefined ? skyline.zenithColor : baseSector.zenithColor,
                horizonColor: skyline.horizonColor !== undefined ? skyline.horizonColor : baseSector.horizonColor,
                fogDensity: skyline.fogDensity !== undefined ? skyline.fogDensity : baseSector.fogDensity,
                gridColor: skyline.gridColor !== undefined ? skyline.gridColor : baseSector.gridColor,
                windowGlow: skyline.windowGlow !== undefined ? skyline.windowGlow : baseSector.windowGlow
            };
        } else {
            this.sector = baseSector;
            this.skyline = null;
        }
        this.seed = seed;
        this.rng = new SeededRNG(seed);
        this.spline = null;
        this.gates = [];
        this.instancedProps = [];
        this.trackObjects = [];
        this.skyBridges = [];
        this.tunnels = [];
        this.buildingAABBs = [];
        this.launchPad = null;
        this.lastNearMissTime = 0;
        this.skyDome = null;
        this.canyonFloor = null;
        this.trackMesh = null;
        this.trackMaterial = null;
        this.trackTexture = null;
        this.buildingTexture = null;
        this.turbulenceZones = [];

        this.buildTrackSpline();
        this.createSkyDome();
        this.createDistantSkylineSilhouettes();
        this.createCanyonFloor();
        this.createTrackRibbon();
        this.createHolographicGates();
        this.createLaunchPad();
        this.populateInstancedEnvironment();
        this.createProceduralTunnels();
        this.createAtmosphericTurbulencePockets();
    }

    buildTrackSpline() {
        // High-velocity 3D urban canyon loop with altitude climbs, dives, and sharp chicanes
        const basePoints = [
            [0, 15, 0],
            [60, 25, 120],
            [140, 50, 220],
            [80, 80, 360],
            [-60, 45, 450],
            [-180, 20, 380],
            [-240, 60, 240],
            [-200, 95, 100],
            [-80, 70, -40],
            [40, 30, -120],
            [160, 10, -80],
            [100, 12, -20]
        ];

        // Task 11: Seed-based deterministic waypoint modulation
        const seedScale = 0.22;
        const rawPoints = basePoints.map((bp, idx) => {
            const rx = (this.rng.random() - 0.5) * 45 * seedScale;
            const ry = (this.rng.random() - 0.5) * 25 * seedScale;
            const rz = (this.rng.random() - 0.5) * 45 * seedScale;
            return new THREE.Vector3(bp[0] + rx, Math.max(12, bp[1] + ry), bp[2] + rz);
        });

        // Task 20: Gaussian altitude smoothing kernel across cyclic waypoints
        const n = rawPoints.length;
        const smoothedPoints = [];
        for (let i = 0; i < n; i++) {
            const prev = rawPoints[(i - 1 + n) % n];
            const curr = rawPoints[i];
            const next = rawPoints[(i + 1) % n];
            // 3-point Gaussian kernel [0.25, 0.5, 0.25]
            const smoothY = prev.y * 0.22 + curr.y * 0.56 + next.y * 0.22;
            smoothedPoints.push(new THREE.Vector3(curr.x, smoothY, curr.z));
        }

        this.spline = new THREE.CatmullRomCurve3(smoothedPoints, true, 'centripetal', 0.5);
    }

    createSkyDome() {
        const skyGeo = new THREE.SphereGeometry(1800, 24, 16);
        const posAttr = skyGeo.attributes && skyGeo.attributes.position;
        if (posAttr && typeof posAttr.count === 'number' && typeof posAttr.getY === 'function') {
            const colorAttr = new Float32Array(posAttr.count * 3);
            const zenith = new THREE.Color(this.sector.zenithColor || 0x040814);
            const horizon = new THREE.Color(this.sector.horizonColor || this.sector.skyColor || 0x07111f);
            const tempCol = new THREE.Color();

            for (let i = 0; i < posAttr.count; i++) {
                const ny = Math.max(0, Math.min(1.0, (posAttr.getY(i) + 400) / 2200));
                tempCol.copy(horizon).lerp(zenith, Math.pow(ny, 0.75));
                colorAttr[i * 3] = tempCol.r;
                colorAttr[i * 3 + 1] = tempCol.g;
                colorAttr[i * 3 + 2] = tempCol.b;
            }
            skyGeo.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));
        }

        const skyMat = new THREE.MeshBasicMaterial({
            vertexColors: true,
            side: THREE.BackSide,
            fog: false
        });

        this.skyDome = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(this.skyDome);
    }

    createDistantSkylineSilhouettes() {
        // Task 19: Distant Parallax Horizon Skyline Silhouettes
        const count = 36;
        const radius = 1200;
        const silhouetteMat = new THREE.MeshBasicMaterial({
            color: this.sector.zenithColor || 0x040814,
            side: THREE.DoubleSide,
            fog: false
        });

        const silhouetteGroup = new THREE.Group();

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const w = 45 + this.rng.random() * 65;
            const h = 80 + this.rng.random() * 160;
            const geo = new THREE.PlaneGeometry(w, h);
            geo.translate(0, h / 2 - 20, 0);

            const mesh = new THREE.Mesh(geo, silhouetteMat);
            mesh.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
            mesh.lookAt(0, 0, 0);
            silhouetteGroup.add(mesh);
        }

        this.scene.add(silhouetteGroup);
        this.silhouetteGroup = silhouetteGroup;
    }

    createProceduralTunnels() {
        if (!this.spline) return;
        // Task 16: Procedural Hexagonal Enclosed Service Tunnels
        const tunnelRadius = 14;
        const hexGeo = new THREE.CylinderGeometry(tunnelRadius, tunnelRadius, 4, 6, 1, true);
        hexGeo.rotateX(Math.PI / 2);

        const hexMat = new THREE.MeshStandardMaterial({
            color: 0x141824,
            metalness: 0.8,
            roughness: 0.3,
            wireframe: false
        });

        const framePoints = [0.38, 0.40, 0.42, 0.76, 0.78, 0.80];
        framePoints.forEach(t => {
            const pt = this.spline.getPointAt(t);
            const tangent = this.spline.getTangentAt(t).normalize();

            const ringMesh = new THREE.Mesh(hexGeo, hexMat);
            ringMesh.position.copy(pt);
            ringMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
            this.scene.add(ringMesh);
            this.tunnels.push(ringMesh);
        });
    }

    createCanyonFloor() {
        const floorGeo = new THREE.PlaneGeometry(2400, 2400, 1, 1);
        floorGeo.rotateX(-Math.PI / 2);

        const gridHex = (this.sector.gridColor !== undefined) ? this.sector.gridColor : 0x00e5ff;
        const gridRgb = '#' + gridHex.toString(16).padStart(6, '0');

        const floorTexture = createProceduralTexture(256, 256, (ctx, w, h) => {
            ctx.fillStyle = '#03070f';
            ctx.fillRect(0, 0, w, h);

            // Cybernetic grid lines
            ctx.strokeStyle = gridRgb;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.35;

            const step = 32;
            for (let x = 0; x <= w; x += step) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
                ctx.stroke();
            }
            for (let y = 0; y <= h; y += step) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }

            // Tech node intersections
            ctx.fillStyle = gridRgb;
            ctx.globalAlpha = 0.65;
            for (let x = 0; x <= w; x += step) {
                for (let y = 0; y <= h; y += step) {
                    ctx.fillRect(x - 2, y - 2, 4, 4);
                }
            }
        });

        if (floorTexture) {
            floorTexture.repeat.set(75, 75);
        }

        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x111622,
            map: floorTexture,
            roughness: 0.8,
            metalness: 0.2
        });

        this.canyonFloor = new THREE.Mesh(floorGeo, floorMat);
        this.canyonFloor.position.y = -24;
        this.canyonFloor.receiveShadow = this.tier.shadows;
        this.scene.add(this.canyonFloor);
    }

    createTrackRibbon() {
        // Extrude a dual-rail energy track ribbon along the spline
        const segments = 240;
        const width = CONFIG.TRACK.RIBBON_WIDTH;

        const ribbonGeo = new THREE.BufferGeometry();
        const positions = [];
        const uvs = [];
        const indices = [];

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const pt = this.spline.getPointAt(t);
            const tangent = this.spline.getTangentAt(t).normalize();
            
            // Task 3: Calculate curvature and banking angle for superelevation
            const nextT = Math.min(1.0, t + 0.005);
            const nextTangent = this.spline.getTangentAt(nextT).normalize();
            const turnRate = (nextTangent.x * tangent.z - nextTangent.z * tangent.x) / 0.005;
            const bankAngle = Math.max(-0.55, Math.min(0.55, turnRate * 0.4));
            
            const localUp = _up.clone().applyAxisAngle(tangent, bankAngle);
            _normal.crossVectors(tangent, localUp).normalize();

            // Left and right track edge coordinates
            const pL = pt.clone().addScaledVector(_normal, -width / 2);
            const pR = pt.clone().addScaledVector(_normal, width / 2);

            positions.push(pL.x, pL.y, pL.z);
            positions.push(pR.x, pR.y, pR.z);

            const v = (i / segments) * 60.0;
            uvs.push(0, v);
            uvs.push(1, v);

            if (i < segments) {
                const base = i * 2;
                indices.push(base, base + 1, base + 2);
                indices.push(base + 1, base + 3, base + 2);
            }
        }

        ribbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        ribbonGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        ribbonGeo.setIndex(indices);
        ribbonGeo.computeVertexNormals();

        // High-tech procedural track ribbon texture with directional speed chevrons
        const trackEmissiveHex = (this.sector.trackEmissive !== undefined) ? this.sector.trackEmissive : 0x00f0ff;
        const trackEmissiveRgb = '#' + trackEmissiveHex.toString(16).padStart(6, '0');
        const trackEdgeHex = (this.sector.trackEdge !== undefined) ? this.sector.trackEdge : 0x0E7C7B;
        const trackEdgeRgb = '#' + trackEdgeHex.toString(16).padStart(6, '0');

        this.trackTexture = createProceduralTexture(128, 256, (ctx, w, h) => {
            // Dark carbon roadbed base
            ctx.fillStyle = '#090d16';
            ctx.fillRect(0, 0, w, h);

            // Subtle carbon-weave pattern
            ctx.fillStyle = '#0f1724';
            for (let y = 0; y < h; y += 4) {
                ctx.fillRect(0, y, w, 2);
            }

            // Luminous neon side boundaries
            ctx.fillStyle = trackEdgeRgb;
            ctx.fillRect(0, 0, 8, h);
            ctx.fillRect(w - 8, 0, 8, h);

            // Center lane energy channel
            ctx.fillStyle = '#06101d';
            ctx.fillRect(w * 0.5 - 18, 0, 36, h);

            // Glowing directional chevrons (forward motion indicator)
            ctx.strokeStyle = trackEmissiveRgb;
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            const numChevrons = 4;
            const spacing = h / numChevrons;
            for (let c = 0; c < numChevrons; c++) {
                const cy = c * spacing + spacing * 0.5;
                ctx.beginPath();
                ctx.moveTo(w * 0.5 - 14, cy - 10);
                ctx.lineTo(w * 0.5, cy + 6);
                ctx.lineTo(w * 0.5 + 14, cy - 10);
                ctx.stroke();
            }

            // High-intensity core glow
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            for (let c = 0; c < numChevrons; c++) {
                const cy = c * spacing + spacing * 0.5;
                ctx.beginPath();
                ctx.moveTo(w * 0.5 - 12, cy - 9);
                ctx.lineTo(w * 0.5, cy + 5);
                ctx.lineTo(w * 0.5 + 12, cy - 9);
                ctx.stroke();
            }
        });

        if (this.trackTexture) {
            this.trackTexture.repeat.set(1, 1);
        }

        this.trackMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            map: this.trackTexture,
            roughness: 0.35,
            metalness: 0.65,
            side: THREE.DoubleSide
        });

        const trackMesh = new THREE.Mesh(ribbonGeo, this.trackMaterial);
        trackMesh.receiveShadow = this.tier.shadows;
        this.scene.add(trackMesh);
        this.trackMesh = trackMesh;

        // Neon track borders
        const lineMat = new THREE.LineBasicMaterial({ color: trackEdgeHex, linewidth: 2 });
        const edgePtsL = [];
        const edgePtsR = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const pt = this.spline.getPointAt(t);
            const tangent = this.spline.getTangentAt(t).normalize();
            
            const nextT = Math.min(1.0, t + 0.005);
            const nextTangent = this.spline.getTangentAt(nextT).normalize();
            const turnRate = (nextTangent.x * tangent.z - nextTangent.z * tangent.x) / 0.005;
            const bankAngle = Math.max(-0.55, Math.min(0.55, turnRate * 0.4));
            
            const localUp = _up.clone().applyAxisAngle(tangent, bankAngle);
            _normal.crossVectors(tangent, localUp).normalize();
            
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

        // Procedural skyscraper facade texture with glowing office windows and neon trim
        const windowGlowHex = (this.sector.windowGlow !== undefined) ? this.sector.windowGlow : 0xfff3b0;
        const windowGlowRgb = '#' + windowGlowHex.toString(16).padStart(6, '0');
        const trimHex = (this.sector.trimColor !== undefined) ? this.sector.trimColor : 0x00ffff;
        const trimRgb = '#' + trimHex.toString(16).padStart(6, '0');

        this.buildingTexture = createProceduralTexture(256, 256, (ctx, w, h) => {
            // Dark metallic structural facade
            ctx.fillStyle = '#151c28';
            ctx.fillRect(0, 0, w, h);

            // Vertical structural columns/mullions
            ctx.fillStyle = '#0b1018';
            const colWidth = 16;
            for (let x = 0; x < w; x += colWidth) {
                ctx.fillRect(x + colWidth - 2, 0, 2, h);
            }

            // High-density illuminated futuristic windows
            const cols = 16;
            const rows = 32;
            const cellW = w / cols;
            const cellH = h / rows;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const wx = c * cellW + 2;
                    const wy = r * cellH + 2;
                    const ww = cellW - 4;
                    const wh = cellH - 3;

                    // Pseudo-random deterministic window illumination
                    const hash = (r * 17 + c * 31 + (r % 3) * 7) % 100;
                    if (hash < 34) {
                        // Soft warm office amber/gold
                        ctx.fillStyle = windowGlowRgb;
                        ctx.globalAlpha = 0.9;
                        ctx.fillRect(wx, wy, ww, wh);
                    } else if (hash < 50) {
                        // Sci-fi cyan / cool data center glow
                        ctx.fillStyle = trimRgb;
                        ctx.globalAlpha = 0.8;
                        ctx.fillRect(wx, wy, ww, wh);
                    } else {
                        // Unlit dark glass with faint structural tint
                        ctx.fillStyle = '#080d16';
                        ctx.globalAlpha = 0.95;
                        ctx.fillRect(wx, wy, ww, wh);
                    }
                }
            }

            // Horizontal neon floor dividing bands
            ctx.globalAlpha = 0.95;
            ctx.fillStyle = trimRgb;
            for (let r = 0; r < rows; r += 8) {
                ctx.fillRect(0, r * cellH, w, 2);
            }
            ctx.globalAlpha = 1.0;
        });

        if (this.buildingTexture) {
            this.buildingTexture.repeat.set(2, 6);
        }

        // Vibrant PBR building material with support for per-instance colors and facade texture
        const buildingMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            map: this.buildingTexture,
            roughness: 0.45,
            metalness: 0.55
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

    update(speedKmh = 0, dt = 0.016) {
        // Animate glowing track chevrons proportional to forward velocity
        if (this.trackTexture && this.trackTexture.offset) {
            const flowRate = Math.max(0.4, speedKmh / 90.0);
            this.trackTexture.offset.y -= flowRate * dt * 2.2;
        }

        // Slow atmospheric sky dome celestial rotation
        if (this.skyDome) {
            this.skyDome.rotation.y += dt * 0.005;
        }
    }

    createAtmosphericTurbulencePockets() {
        if (!this.spline) return;
        this.turbulenceZones = [];

        // Seed 4 strategic atmospheric turbulence pockets along circuit
        const samplePoints = [0.18, 0.42, 0.68, 0.88];
        samplePoints.forEach(t => {
            const center = this.spline.getPointAt(t);
            this.turbulenceZones.push({
                position: center.clone().add(new THREE.Vector3(0, (Math.random() - 0.5) * 6, 0)),
                radius: 22.0,
                radiusSq: 484.0 // 22 * 22
            });
        });
    }

    checkTurbulence(position) {
        if (!this.turbulenceZones || this.turbulenceZones.length === 0) return false;
        for (let i = 0; i < this.turbulenceZones.length; i++) {
            const z = this.turbulenceZones[i];
            if (position.distanceToSquared(z.position) < z.radiusSq) {
                return true;
            }
        }
        return false;
    }

    dispose() {
        if (this.skyDome) {
            this.scene.remove(this.skyDome);
            if (this.skyDome.geometry) this.skyDome.geometry.dispose();
            if (this.skyDome.material) this.skyDome.material.dispose();
            this.skyDome = null;
        }

        if (this.canyonFloor) {
            this.scene.remove(this.canyonFloor);
            if (this.canyonFloor.geometry) this.canyonFloor.geometry.dispose();
            if (this.canyonFloor.material) {
                if (this.canyonFloor.material.map) this.canyonFloor.material.map.dispose();
                this.canyonFloor.material.dispose();
            }
            this.canyonFloor = null;
        }

        if (this.trackTexture) {
            this.trackTexture.dispose();
            this.trackTexture = null;
        }

        if (this.buildingTexture) {
            this.buildingTexture.dispose();
            this.buildingTexture = null;
        }

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

        if (this.silhouetteGroup) {
            this.scene.remove(this.silhouetteGroup);
            this.silhouetteGroup.traverse(c => {
                if (c.geometry) c.geometry.dispose();
                if (c.material) {
                    if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
                    else c.material.dispose();
                }
            });
            this.silhouetteGroup = null;
        }

        this.tunnels.forEach(t => {
            this.scene.remove(t);
            if (t.geometry) t.geometry.dispose();
            if (t.material) {
                if (Array.isArray(t.material)) t.material.forEach(m => m.dispose());
                else t.material.dispose();
            }
        });
        this.tunnels = [];

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
