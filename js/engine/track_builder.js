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

// Procedural Shape Grammar: 3-Tier Multi-Setback Brutalist Monolith with 45° Chamfered Bevels
export function createMonolithGeometry() {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    function addQuad(p0, p1, p2, p3, norm = null) {
        const idx = Math.floor(positions.length / 3);
        positions.push(p0.x, p0.y, p0.z);
        positions.push(p1.x, p1.y, p1.z);
        positions.push(p2.x, p2.y, p2.z);
        positions.push(p3.x, p3.y, p3.z);

        if (!norm) {
            const vA = new THREE.Vector3().subVectors(p1, p0);
            const vB = new THREE.Vector3().subVectors(p3, p0);
            const n = new THREE.Vector3().crossVectors(vA, vB).normalize();
            for (let i = 0; i < 4; i++) normals.push(n.x, n.y, n.z);
        } else {
            for (let i = 0; i < 4; i++) normals.push(norm.x, norm.y, norm.z);
        }

        uvs.push(0, 0, 1, 0, 1, 1, 0, 1);

        indices.push(idx, idx + 1, idx + 2);
        indices.push(idx, idx + 2, idx + 3);
    }

    function getOctagon(w, d, bevel, y) {
        const hw = w * 0.5;
        const hd = d * 0.5;
        const b = Math.min(bevel, Math.min(hw, hd) * 0.4);
        return [
            new THREE.Vector3(hw - b, y, hd),       // 0
            new THREE.Vector3(hw, y, hd - b),       // 1 (chamfer 0->1: 45°)
            new THREE.Vector3(hw, y, -hd + b),      // 2
            new THREE.Vector3(hw - b, y, -hd),      // 3 (chamfer 2->3: -45°)
            new THREE.Vector3(-hw + b, y, -hd),     // 4
            new THREE.Vector3(-hw, y, -hd + b),     // 5 (chamfer 4->5: 45°)
            new THREE.Vector3(-hw, y, hd - b),      // 6
            new THREE.Vector3(-hw + b, y, hd)       // 7 (chamfer 6->7: -45°)
        ];
    }

    function addTierWalls(botPts, topPts) {
        for (let k = 0; k < 8; k++) {
            const next = (k + 1) % 8;
            addQuad(botPts[k], botPts[next], topPts[next], topPts[k]);
        }
    }

    function addShelf(innerPts, outerPts) {
        const upNorm = new THREE.Vector3(0, 1, 0);
        for (let k = 0; k < 8; k++) {
            const next = (k + 1) % 8;
            addQuad(outerPts[k], outerPts[next], innerPts[next], innerPts[k], upNorm);
        }
    }

    function addCap(pts, y, isTop = true) {
        const center = new THREE.Vector3(0, y, 0);
        const norm = new THREE.Vector3(0, isTop ? 1 : -1, 0);
        for (let k = 0; k < 8; k++) {
            const next = (k + 1) % 8;
            const idx = Math.floor(positions.length / 3);
            if (isTop) {
                positions.push(center.x, center.y, center.z);
                positions.push(pts[k].x, pts[k].y, pts[k].z);
                positions.push(pts[next].x, pts[next].y, pts[next].z);
                for (let i = 0; i < 3; i++) normals.push(norm.x, norm.y, norm.z);
                uvs.push(0.5, 0.5, 0, 1, 1, 1);
                indices.push(idx, idx + 1, idx + 2);
            } else {
                positions.push(center.x, center.y, center.z);
                positions.push(pts[next].x, pts[next].y, pts[next].z);
                positions.push(pts[k].x, pts[k].y, pts[k].z);
                for (let i = 0; i < 3; i++) normals.push(norm.x, norm.y, norm.z);
                uvs.push(0.5, 0.5, 1, 1, 0, 1);
                indices.push(idx, idx + 1, idx + 2);
            }
        }
    }

    // Tier 1: Podium Base (y: 0.0 to 0.22, footprint 1.0 x 1.0, 45° corner bevels)
    const t1Bot = getOctagon(1.0, 1.0, 0.10, 0.0);
    const t1Top = getOctagon(1.0, 1.0, 0.10, 0.22);
    addCap(t1Bot, 0.0, false);
    addTierWalls(t1Bot, t1Top);

    // Tier 2: Tower Shaft (y: 0.22 to 0.82, footprint 0.80 x 0.80, 45° corner bevels)
    const t2Bot = getOctagon(0.80, 0.80, 0.08, 0.22);
    const t2Top = getOctagon(0.80, 0.80, 0.08, 0.82);
    addShelf(t2Bot, t1Top);
    addTierWalls(t2Bot, t2Top);

    // Tier 3: Crown Penthouse & Mechanical Spire Base (y: 0.82 to 0.94 / 1.0)
    const t3Bot = getOctagon(0.54, 0.54, 0.06, 0.82);
    const t3Top = getOctagon(0.54, 0.54, 0.06, 0.94);
    addShelf(t3Bot, t2Top);
    addTierWalls(t3Bot, t3Top);

    const t4Bot = getOctagon(0.32, 0.32, 0.04, 0.94);
    const t4Top = getOctagon(0.32, 0.32, 0.04, 1.0);
    addShelf(t4Bot, t3Top);
    addTierWalls(t4Bot, t4Top);
    addCap(t4Top, 1.0, true);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
    geo.setIndex(indices);
    if (typeof geo.computeVertexNormals === 'function') {
        geo.computeVertexNormals();
    }
    return geo;
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
        // Master 3D Aerial Circuit:
        // Stratosphere Staging (750m) -> 7-10s Deep Dive Funnel -> 450m Calibration Straightaway ->
        // Canyon Chicane & Obstacle Run -> 90° Vertical Sky-Ramp Ascension Sprint -> Finish Portal (750m)
        const basePoints = [
            [0,    750,  0],     // Point 0: Stratosphere Launch Grid (Stratosphere Staging)
            [0,    680,  80],    // Point 1: Funnel lip & plunge initiation
            [20,   500,  220],   // Point 2: Supersonic vertical plunge through clouds
            [30,   280,  440],   // Point 3: Stratosphere fog boundary crossing
            [15,   110,  700],   // Point 4: Approaching city canopy
            [5,    42,   920],   // Point 5: Parabolic recovery curve pullout
            [0,    28,   1080],  // Point 6: Pullout complete, wide 450m straightaway entry (y=28m)
            [0,    28,   1530],  // Point 7: End of 450m calibration straightaway (1080 -> 1530 = 450m)
            [180,  34,   1850],  // Point 8: Canyon entry turn
            [450,  46,   2200],  // Point 9: Banked outer sweeping arc
            [280,  54,   2600],  // Point 10: Chicane crest
            [-160, 44,   2700],  // Point 11: Tight canyon S-bend
            [-520, 32,   2300],  // Point 12: Low-altitude river run
            [-680, 36,   1700],  // Point 13: Skyline sweeping curve
            [-480, 32,   1050],  // Point 14: Industrial return corridor
            [-240, 28,   500],   // Point 15: Run-up straight to ascension ramp
            [-60,  28,   140],   // Point 16: Foot of 90° vertical sky-ramp
            [-30,  48,   40],    // Point 17: Ramp entry curve
            [-10,  150,  -20],   // Point 18: Steep vertical ascension climb
            [0,    360,  -50],   // Point 19: Vertical rocket burn through clouds
            [0,    600,  -40],   // Point 20: High stratosphere sprint
            [0,    750,  -15]    // Point 21: Summit finish portal, closing loop into Point 0
        ];

        // Seed-based deterministic waypoint modulation (preserves vertical launch/dive geometry)
        const seedScale = 0.18;
        const rawPoints = basePoints.map((bp, idx) => {
            // Keep launch platforms, deep dive entry, and finish summit unjittered for precise alignment
            const isCriticalPoint = (idx === 0 || idx === 1 || idx === 6 || idx === 7 || idx >= 20);
            const rx = isCriticalPoint ? 0 : (this.rng.random() - 0.5) * 60 * seedScale;
            const ry = isCriticalPoint ? 0 : (this.rng.random() - 0.5) * 20 * seedScale;
            const rz = isCriticalPoint ? 0 : (this.rng.random() - 0.5) * 60 * seedScale;
            return new THREE.Vector3(bp[0] + rx, Math.max(22, bp[1] + ry), bp[2] + rz);
        });

        // Altitude smoothing across non-critical waypoints
        const n = rawPoints.length;
        const smoothedPoints = [];
        for (let i = 0; i < n; i++) {
            const isCriticalPoint = (i <= 2 || i === 6 || i === 7 || i >= 18);
            if (isCriticalPoint) {
                smoothedPoints.push(rawPoints[i].clone());
            } else {
                const prev = rawPoints[(i - 1 + n) % n];
                const curr = rawPoints[i];
                const next = rawPoints[(i + 1) % n];
                const smoothY = prev.y * 0.22 + curr.y * 0.56 + next.y * 0.22;
                smoothedPoints.push(new THREE.Vector3(curr.x, smoothY, curr.z));
            }
        }

        this.spline = new THREE.CatmullRomCurve3(smoothedPoints, true, 'centripetal', 0.5);
    }

    createSkyDome() {
        const skyGeo = new THREE.SphereGeometry(5000, 32, 20);
        const posAttr = skyGeo.attributes && skyGeo.attributes.position;
        if (posAttr && typeof posAttr.count === 'number' && typeof posAttr.getY === 'function') {
            const colorAttr = new Float32Array(posAttr.count * 3);
            const zenith = new THREE.Color(this.sector.zenithColor || 0x040814);
            const horizon = new THREE.Color(this.sector.horizonColor || this.sector.skyColor || 0x07111f);
            const sunCol = new THREE.Color(this.sector.sunColor || 0xfff5ea);
            const tempCol = new THREE.Color();

            // Solar direction vector (from zenith angle)
            const sunDir = new THREE.Vector3(0.35, 0.72, 0.45).normalize();

            for (let i = 0; i < posAttr.count; i++) {
                const vx = (typeof posAttr.getX === 'function') ? posAttr.getX(i) : 0;
                const vy = posAttr.getY(i);
                const vz = (typeof posAttr.getZ === 'function') ? posAttr.getZ(i) : 0;
                const vLen = Math.hypot(vx, vy, vz) || 1.0;
                const vDirX = vx / vLen;
                const vDirY = vy / vLen;
                const vDirZ = vz / vLen;

                // Analytical Rayleigh scattering across normalized elevation
                const ny = Math.max(0, Math.min(1.0, (vy + 400) / 5200));
                tempCol.copy(horizon).lerp(zenith, Math.pow(ny, 0.68));

                // Solar zenith cosine and Mie forward scattering halo
                const cosGamma = Math.max(-1.0, Math.min(1.0, vDirX * sunDir.x + vDirY * sunDir.y + vDirZ * sunDir.z));
                const g = 0.78;
                const mie = (1.0 - g * g) / Math.pow(1.0 + g * g - 2.0 * g * cosGamma, 1.5) * 0.12;

                if (ny > 0.04) {
                    tempCol.lerp(sunCol, Math.min(0.60, mie * 0.42));
                }

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
        const count = 36;
        const radius = 4000;
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
        const floorGeo = new THREE.PlaneGeometry(8000, 8000, 1, 1);
        floorGeo.rotateX(-Math.PI / 2);

        const gridHex = (this.sector.gridColor !== undefined) ? this.sector.gridColor : 0x00e5ff;
        const gridCol = new THREE.Color(gridHex);
        const baseCol = new THREE.Color(0x03070f);

        // Direction 3 Micro-Payload: Mathematical Procedural GLSL Grid Shader
        // Replaces 2D Canvas rasterization with pure GPU mathematical rendering & depth fade
        let floorMat;
        if (typeof THREE.ShaderMaterial === 'function') {
            floorMat = new THREE.ShaderMaterial({
                uniforms: {
                    uBaseColor: { value: baseCol },
                    uGridColor: { value: gridCol },
                    uGridScale: { value: 90.0 },
                    uLineWidth: { value: 0.04 }
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 uBaseColor;
                    uniform vec3 uGridColor;
                    uniform float uGridScale;
                    uniform float uLineWidth;
                    varying vec2 vUv;

                    void main() {
                        vec2 g = abs(fract(vUv * uGridScale) - 0.5);
                        float line = step(0.5 - uLineWidth, max(g.x, g.y));

                        // Atmospheric depth fade matching dark sky horizon
                        float depth = gl_FragCoord.z / gl_FragCoord.w;
                        float fogFactor = smoothstep(200.0, 3200.0, depth);
                        vec3 finalCol = mix(mix(uBaseColor, uGridColor, line * 0.45), uBaseColor, fogFactor);

                        gl_FragColor = vec4(finalCol, 1.0);
                    }
                `
            });
        } else {
            floorMat = new THREE.MeshBasicMaterial({ color: 0x03070f });
        }

        this.canyonFloor = new THREE.Mesh(floorGeo, floorMat);
        this.canyonFloor.position.y = -24;
        this.canyonFloor.receiveShadow = this.tier.shadows;
        this.scene.add(this.canyonFloor);
    }

    createTrackRibbon() {
        // Minimalist Single Laser Vector Corridor - eliminates wide roadbed ribbon
        const segments = 240;
        const trackEmissiveHex = (this.sector.trackEmissive !== undefined) ? this.sector.trackEmissive : 0x00f0ff;
        const trackEdgeHex = (this.sector.trackEdge !== undefined) ? this.sector.trackEdge : 0x0E7C7B;

        const corePts = [];
        const glowPts = [];
        const conduitPts = [];

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const pt = this.spline.getPointAt(t);
            // Core laser line: primary guiding beam centered on flight path
            corePts.push(new THREE.Vector3(pt.x, pt.y - 0.4, pt.z));
            // Atmospheric glow halo: concentric bloom beam for enhanced visibility
            glowPts.push(new THREE.Vector3(pt.x, pt.y - 0.38, pt.z));
            // Navigational depth conduit: secondary grounding guide line beneath
            conduitPts.push(new THREE.Vector3(pt.x, pt.y - 1.2, pt.z));
        }

        const LineClass = THREE.LineLoop || THREE.Line;

        // 1. High-intensity core laser line
        const coreMat = new THREE.LineBasicMaterial({
            color: trackEmissiveHex,
            transparent: true,
            opacity: 0.95,
            linewidth: 2
        });
        const coreLine = new LineClass(new THREE.BufferGeometry().setFromPoints(corePts), coreMat);

        // 2. Diffuse atmospheric halo glow
        const glowMat = new THREE.LineBasicMaterial({
            color: trackEmissiveHex,
            transparent: true,
            opacity: 0.35,
            linewidth: 4
        });
        const glowLine = new LineClass(new THREE.BufferGeometry().setFromPoints(glowPts), glowMat);

        // 3. Grounding navigational conduit
        const conduitMat = new THREE.LineBasicMaterial({
            color: trackEdgeHex,
            transparent: true,
            opacity: 0.20,
            linewidth: 1
        });
        const conduitLine = new LineClass(new THREE.BufferGeometry().setFromPoints(conduitPts), conduitMat);

        this.scene.add(coreLine);
        this.scene.add(glowLine);
        this.scene.add(conduitLine);

        // Maintain exact 3-object registration for zero GC/memory leaks & test suite verification
        this.trackObjects.push(coreLine, glowLine, conduitLine);
    }

    createHolographicGates() {
        const totalGates = CONFIG.TRACK.TOTAL_GATES;
        const gateRadius = CONFIG.TRACK.GATE_RADIUS;

        // Circular holographic ring geometry (32-segment smooth circle)
        const circleGeo = new THREE.RingGeometry(gateRadius - 0.45, gateRadius, 32);
        const circleMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85
        });

        const innerGeo = new THREE.RingGeometry(gateRadius * 0.72, gateRadius * 0.76, 32);
        const innerMat = new THREE.MeshBasicMaterial({
            color: 0x00e5ff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.45
        });

        for (let i = 0; i < totalGates; i++) {
            const t = i / totalGates;
            const pos = this.spline.getPointAt(t);
            const tangent = this.spline.getTangentAt(t).normalize();

            const gateGroup = new THREE.Group();
            gateGroup.position.copy(pos);
            gateGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

            // Outer primary circular ring
            const outerMesh = new THREE.Mesh(circleGeo, circleMat.clone());
            gateGroup.add(outerMesh);

            // Inner concentric pulse ring
            const innerMesh = new THREE.Mesh(innerGeo, innerMat.clone());
            gateGroup.add(innerMesh);

            // Start/Finish gate has distinctive orange tint
            if (i === 0) {
                outerMesh.material.color.setHex(0xE8580A);
                innerMesh.material.color.setHex(0xffaa00);
                gateGroup.scale.set(1.2, 1.2, 1.2);
            }

            this.scene.add(gateGroup);
            this.gates.push({
                index: i,
                position: pos,
                normal: tangent,
                mesh: outerMesh,
                group: gateGroup,
                passed: false
            });
        }
    }

    createLaunchPad() {
        const padGroup = new THREE.Group();
        const startPoint = this.spline.getPointAt(0);
        this.stagingPositions = [];
        this.stagingPlatforms = [];
        this.portals = [];

        // 4 individual floating launch slabs spaced side-by-side in the stratosphere (y ~ 750m)
        const laneOffsets = [-24, -8, 8, 24]; // Lane 1 (x=-8) is Player; Lanes 0, 2, 3 are AI Rivals
        const laneColors = [0xff9900, 0x00f0ff, 0xff00aa, 0x00ff88]; // Color-coded portal rings

        // Hexagonal floating cantilever platform geometry
        const platformGeo = new THREE.CylinderGeometry(6.8, 7.8, 1.4, 6);
        const platformMat = new THREE.MeshStandardMaterial({
            color: 0x16202e,
            roughness: 0.65,
            metalness: 0.45
        });

        // Platform glowing border ring
        const ringGeo = new THREE.RingGeometry(5.8, 6.7, 6);
        const decalGeo = new THREE.RingGeometry(1.6, 2.6, 24);

        // Futuristic Portal Ring Geometry (with headless environment fallbacks)
        const portalRingGeo = (THREE.TorusGeometry) 
            ? new THREE.TorusGeometry(4.8, 0.35, 12, 32) 
            : new THREE.RingGeometry(4.4, 5.2, 24);
        const portalFieldGeo = (THREE.CircleGeometry) 
            ? new THREE.CircleGeometry(4.6, 24) 
            : new THREE.RingGeometry(0.1, 4.6, 24);

        laneOffsets.forEach((offsetX, idx) => {
            const laneCol = laneColors[idx];
            const px = startPoint.x + offsetX;
            const py = startPoint.y;
            const pz = startPoint.z;

            // Staging hover position for drone
            this.stagingPositions.push(new THREE.Vector3(px, py, pz));

            const slabGroup = new THREE.Group();
            slabGroup.position.set(px, py - 1.8, pz);

            // 1. Floating Hex Slab
            const slab = new THREE.Mesh(platformGeo, platformMat);
            slab.receiveShadow = this.tier.shadows;
            slabGroup.add(slab);

            // 2. Glowing platform border
            const ringMat = new THREE.MeshBasicMaterial({
                color: laneCol,
                side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.72;
            slabGroup.add(ring);

            // 3. Staging Target Chevron
            const decalMat = new THREE.MeshBasicMaterial({
                color: idx === 1 ? 0x00ffff : 0xffaa00,
                side: THREE.DoubleSide
            });
            const decal = new THREE.Mesh(decalGeo, decalMat);
            decal.rotation.x = -Math.PI / 2;
            decal.position.y = 0.73;
            slabGroup.add(decal);

            // 4. Color-Coded Portal Gate behind each platform (z = -12)
            const portalGroup = new THREE.Group();
            portalGroup.position.set(px, py + 2.5, pz - 12.0);

            const portalRingMat = new THREE.MeshBasicMaterial({ color: laneCol });
            const portalRing = new THREE.Mesh(portalRingGeo, portalRingMat);
            portalGroup.add(portalRing);

            const portalFieldMat = new THREE.MeshBasicMaterial({
                color: laneCol,
                transparent: true,
                opacity: 0.28,
                side: THREE.DoubleSide
            });
            const portalField = new THREE.Mesh(portalFieldGeo, portalFieldMat);
            portalGroup.add(portalField);

            padGroup.add(slabGroup);
            padGroup.add(portalGroup);
            this.stagingPlatforms.push(slabGroup);
            this.portals.push(portalGroup);
        });

        // 5. Grand Champion Finish Portal at Stratosphere Summit (y ~ 750m)
        const finishPortalGeo = (THREE.TorusGeometry)
            ? new THREE.TorusGeometry(14.0, 1.1, 16, 48)
            : new THREE.RingGeometry(12.8, 15.2, 32);
        const finishPortalMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
        const finishPortal = new THREE.Mesh(finishPortalGeo, finishPortalMat);
        finishPortal.position.set(startPoint.x, startPoint.y + 4.0, startPoint.z - 14.0);
        padGroup.add(finishPortal);
        this.finishPortal = finishPortal;

        this.scene.add(padGroup);
        this.launchPad = padGroup;
    }

    populateInstancedEnvironment() {
        const count = this.tier.maxProps;
        const monolithGeo = createMonolithGeometry();

        // Procedural Minimalist Brutalism facade texture (Option C)
        const windowGlowHex = (this.sector.windowGlow !== undefined) ? this.sector.windowGlow : 0xfff3b0;
        const windowGlowRgb = '#' + windowGlowHex.toString(16).padStart(6, '0');
        const trimHex = (this.sector.trimColor !== undefined) ? this.sector.trimColor : 0x00ffff;
        const trimRgb = '#' + trimHex.toString(16).padStart(6, '0');

        this.buildingTexture = createProceduralTexture(256, 256, (ctx, w, h) => {
            // Warm limestone / travertine base tone
            ctx.fillStyle = '#E8E4DA';
            ctx.fillRect(0, 0, w, h);

            // Deep recessed shadow apertures & vertical reveal channels
            ctx.fillStyle = '#1C222E';
            const colWidth = 32;
            for (let x = 0; x < w; x += colWidth) {
                ctx.fillRect(x + colWidth - 4, 0, 3, h);
            }

            // Minimalist geometric window apertures
            const cols = 8;
            const rows = 16;
            const cellW = w / cols;
            const cellH = h / rows;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const wx = c * cellW + 6;
                    const wy = r * cellH + 4;
                    const ww = cellW - 12;
                    const wh = cellH - 8;

                    // Deep recessed shadow aperture
                    ctx.fillStyle = '#1C222E';
                    ctx.globalAlpha = 0.95;
                    ctx.fillRect(wx, wy, ww, wh);

                    // Soft warm interior glow on selected units
                    const hash = (r * 13 + c * 29) % 100;
                    if (hash < 24) {
                        ctx.fillStyle = windowGlowRgb;
                        ctx.globalAlpha = 0.85;
                        ctx.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
                    }
                }
            }
            ctx.globalAlpha = 1.0;
        });

        if (this.buildingTexture) {
            this.buildingTexture.repeat.set(2, 6);
        }

        // Option C Matte PBR building material with analytical canyon height AO
        const buildingMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            map: this.buildingTexture,
            roughness: 0.92, // Matte limestone / terracotta
            metalness: 0.04
        });

        // Analytical Canyon Height AO (diffuse shadowing at canyon floor, sky bounce on rooftops)
        if (typeof buildingMat.onBeforeCompile === 'function' || buildingMat.onBeforeCompile !== undefined) {
            buildingMat.onBeforeCompile = (shader) => {
                if (!shader || !shader.vertexShader || !shader.fragmentShader) return;
                shader.vertexShader = shader.vertexShader.replace(
                    '#include <common>',
                    `#include <common>\nvarying float vWorldY;`
                );
                shader.vertexShader = shader.vertexShader.replace(
                    '#include <begin_vertex>',
                    `#include <begin_vertex>\n#ifdef USE_INSTANCING\nvec4 wPos = instanceMatrix * vec4(transformed, 1.0);\nvWorldY = wPos.y;\n#else\nvWorldY = (modelMatrix * vec4(transformed, 1.0)).y;\n#endif`
                );
                shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <common>',
                    `#include <common>\nvarying float vWorldY;`
                );
                shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <dithering_fragment>',
                    `#include <dithering_fragment>\nfloat canyonHeightAo = clamp((vWorldY - (-20.0)) / 95.0, 0.42, 1.0);\ngl_FragColor.rgb *= canyonHeightAo;`
                );
            };
        }

        const instancedCity = new THREE.InstancedMesh(monolithGeo, buildingMat, count);
        instancedCity.castShadow = this.tier.shadows;
        instancedCity.receiveShadow = this.tier.shadows;

        const dummy = new THREE.Object3D();
        const spread = this.sector.buildingSpread || 700;
        const maxHeight = this.sector.buildingHeightMax || 140;

        // Curated Option C Minimalist Brutalism palette
        const optionCPalette = [0xF4F1EA, 0xE8E4DA, 0xC85A32, 0xD97746, 0x2B3A4A, 0xF4F1EA, 0xC85A32, 0xE8E4DA];
        const palette = (this.sector.buildingColors && this.sector.buildingColors.length > 0)
            ? this.sector.buildingColors
            : optionCPalette;

        // Pre-sample spline points for corridor framing and safety envelopes
        const sampleCount = 96;
        const splineSamples = [];
        const splineNormals = [];
        for (let s = 0; s < sampleCount; s++) {
            const t = s / sampleCount;
            const pt = this.spline.getPointAt(t);
            const tan = this.spline.getTangentAt(t).normalize();
            const norm = new THREE.Vector3().crossVectors(tan, _up);
            if (norm.lengthSq() < 0.001) {
                norm.set(1, 0, 0);
            } else {
                norm.normalize();
            }
            splineSamples.push(pt);
            splineNormals.push(norm);
        }

        const canyonCount = Math.floor(count * 0.65);
        const outerCount = count - canyonCount;
        const tempColor = new THREE.Color();

        // 1. Canyon-Aligned Flankers (Guaranteed Safety Envelope)
        for (let i = 0; i < canyonCount; i++) {
            const sampleIdx = Math.floor((i / canyonCount) * sampleCount) % sampleCount;
            const sp = splineSamples[sampleIdx];
            const norm = splineNormals[sampleIdx];
            const side = (i % 2 === 0) ? 1 : -1;

            // Enforce open skyway setbacks: push buildings well clear of the flight corridor
            const trackWidth = CONFIG.TRACK.RIBBON_WIDTH || 14;
            // On high altitude dive and ascension sections, keep buildings extra far from vertical drop
            const isHighAltitude = sp.y > 65;
            const corridorSetback = isHighAltitude
                ? (160 + ((i * 7) % 60))
                : ((trackWidth * 0.5) + 65 + ((i * 7) % 35));
            const lateralJitter = ((i * 13) % 15) - 7.5;

            const bw = 22 + ((i * 11) % 26);
            const bd = 22 + ((i * 17) % 26);
            // Cap height so tops stay well below flight elevation
            const maxAllowedHeight = isHighAltitude ? 45 : Math.max(30, maxHeight - 30);
            const bh = 45 + ((i * 23) % maxAllowedHeight);

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

        // 2. Outer Urban Skyline Clusters (Strict 3D Radial Clearance)
        for (let i = 0; i < outerCount; i++) {
            const instIdx = canyonCount + i;
            let bx = 0, bz = 0, bw = 0, bd = 0, bh = 0;
            let valid = false;
            let attempts = 0;

            while (!valid && attempts < 35) {
                attempts++;
                const angle = (i / outerCount) * Math.PI * 2 + (attempts * 0.12);
                const radius = 180 + Math.random() * (spread * 0.5);
                bx = Math.cos(angle) * radius;
                bz = Math.sin(angle) * radius;
                bw = 26 + Math.random() * 34;
                bd = 26 + Math.random() * 34;
                bh = 65 + Math.random() * maxHeight;

                let tooClose = false;
                const minClearance = 44 + Math.max(bw, bd) * 0.5;
                const minClearanceSq = minClearance * minClearance;

                // Test against all spline samples to eliminate any path encroachment
                for (let s = 0; s < sampleCount; s++) {
                    const sp = splineSamples[s];
                    const dx = bx - sp.x;
                    const dz = bz - sp.z;
                    if (dx * dx + dz * dz < minClearanceSq) {
                        const buildingTop = -20 + bh;
                        if (buildingTop > sp.y - 18.0) {
                            tooClose = true;
                            break;
                        }
                    }
                }

                // Staging drop clearance
                if (Math.abs(bx) < 70 && Math.abs(bz) < 90) {
                    tooClose = true;
                }

                if (!tooClose) {
                    valid = true;
                }
            }

            // Safe fallback perimeter placement if clearance search is exhausted
            if (!valid) {
                const safeAngle = (i / outerCount) * Math.PI * 2;
                bx = Math.cos(safeAngle) * (spread * 0.75 + 400);
                bz = Math.sin(safeAngle) * (spread * 0.75 + 400);
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

        // Scale-Giving Rooftop Props: Instanced HVAC Chiller Units
        const hvacCandidates = this.buildingAABBs.filter((b, idx) => idx % 3 === 2 && b.width >= 20 && b.depth >= 20);
        if (hvacCandidates.length > 0) {
            const hvacCount = hvacCandidates.length;
            const hvacGeo = new THREE.BoxGeometry(4.2, 1.6, 2.4);
            const hvacMat = new THREE.MeshStandardMaterial({
                color: 0x334155,
                roughness: 0.75,
                metalness: 0.25
            });
            const instancedHvac = new THREE.InstancedMesh(hvacGeo, hvacMat, hvacCount);
            instancedHvac.receiveShadow = this.tier.shadows;

            const dummy = new THREE.Object3D();
            for (let i = 0; i < hvacCount; i++) {
                const b = hvacCandidates[i];
                dummy.position.set(b.topCenter.x + 2.0, b.topCenter.y + 0.8, b.topCenter.z - 2.0);
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                instancedHvac.setMatrixAt(i, dummy.matrix);
            }
            instancedHvac.instanceMatrix.needsUpdate = true;
            this.scene.add(instancedHvac);
            this.instancedProps.push(instancedHvac);
        }

        // Sky-Bridges spanning across canyon walls
        this.createSkyBridges();
    }

    createSkyBridges() {
        if (!this.spline) return;
        // Position skybridges across horizontal canyon corridors (avoiding vertical dive and ascension ramp)
        const bridgeFractions = [0.42, 0.54, 0.66];
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
            const norm = new THREE.Vector3().crossVectors(tan, _up);
            if (norm.lengthSq() < 0.001) {
                norm.set(1, 0, 0);
            } else {
                norm.normalize();
            }

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
            const target = g.group || g.mesh;
            if (target) {
                this.scene.remove(target);
                target.traverse?.(c => {
                    if (c.geometry) c.geometry.dispose();
                    if (c.material) {
                        if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
                        else c.material.dispose();
                    }
                });
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

TrackBuilder.createMonolithGeometry = createMonolithGeometry;
