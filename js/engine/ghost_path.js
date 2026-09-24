/*
================================================================================
BARCH AERO-CANYON RACING - SLOW ROADS GHOST PATH TRAJECTORY RIBBON
Analytical 3-second projected steering arc with glowing core & pulsing head dot
================================================================================
*/

import { CONFIG } from '../config.js';

// Pre-allocated static math vectors for zero memory allocation in simulation loop
const _tangent = new THREE.Vector3();
const _binormal = new THREE.Vector3();
const _center = new THREE.Vector3();
const _posA = new THREE.Vector3();
const _posB = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

export class GhostPath {
    constructor(scene, tier = null) {
        this.scene = scene;
        this.tier = tier;
        this.visible = true;

        // Trajectory resolution: 36 segments over 3 seconds (~12 points per second)
        this.sampleCount = 36;
        this.predictionSeconds = 3.0;
        this.ribbonWidth = 1.4; // Base ribbon width in meters

        // Vertex counts: (sampleCount + 1) * 2 vertices (quad strip)
        const vertCount = (this.sampleCount + 1) * 2;
        this.positions = new Float32Array(vertCount * 3);
        this.colors = new Float32Array(vertCount * 4); // RGBA for smooth alpha fade
        this.uvs = new Float32Array(vertCount * 2);
        const indices = new Uint16Array(this.sampleCount * 6);

        // Pre-compute immutable quad indices
        for (let i = 0; i < this.sampleCount; i++) {
            const v0 = i * 2;
            const v1 = v0 + 1;
            const v2 = v0 + 2;
            const v3 = v0 + 3;

            const idx = i * 6;
            indices[idx] = v0;
            indices[idx + 1] = v2;
            indices[idx + 2] = v1;

            indices[idx + 3] = v1;
            indices[idx + 4] = v2;
            indices[idx + 5] = v3;
        }

        // Initialize vertex buffer geometry
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 4));
        this.geometry.setAttribute('uv', new THREE.BufferAttribute(this.uvs, 2));
        this.geometry.setIndex(new THREE.BufferAttribute(indices, 1));

        // High-purity glowing white material matching Slow Roads trajectory ribbon
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                pulseIntensity: { value: 1.0 }
            },
            vertexShader: `
                attribute vec4 color;
                varying vec4 vColor;
                varying vec2 vUv;
                void main() {
                    vColor = color;
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec4 vColor;
                varying vec2 vUv;
                uniform float time;
                uniform float pulseIntensity;

                void main() {
                    // Soft lateral gaussian fade from white core to transparent edge
                    float lateral = abs(vUv.x - 0.5) * 2.0;
                    float lateralAlpha = exp(-lateral * lateral * 3.5);

                    // Longitudinal pulse wave travelling forward along trajectory
                    float wave = 0.85 + 0.15 * sin(vUv.y * 12.0 - time * 6.0);

                    float finalAlpha = vColor.a * lateralAlpha * wave * pulseIntensity;
                    if (finalAlpha < 0.005) discard;

                    // Core luminous white highlight
                    vec3 coreColor = mix(vec3(0.85, 0.95, 1.0), vec3(1.0, 1.0, 1.0), pow(lateralAlpha, 2.0));
                    gl_FragColor = vec4(coreColor, finalAlpha);
                }
            `,
            transparent: true,
            blending: (typeof THREE !== 'undefined' && THREE.AdditiveBlending) ? THREE.AdditiveBlending : THREE.NormalBlending,
            depthWrite: false,
            side: (typeof THREE !== 'undefined' && THREE.DoubleSide) ? THREE.DoubleSide : 2
        });

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.frustumCulled = false;
        this.mesh.renderOrder = 9;
        this.scene.add(this.mesh);

        // Leading Pulsing Head Marker Dot
        const dotGeo = new THREE.RingGeometry(0.1, 0.65, 24);
        const dotMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.92,
            side: (typeof THREE !== 'undefined' && THREE.DoubleSide) ? THREE.DoubleSide : 2,
            depthWrite: false,
            blending: (typeof THREE !== 'undefined' && THREE.AdditiveBlending) ? THREE.AdditiveBlending : THREE.NormalBlending
        });
        this.headDot = new THREE.Mesh(dotGeo, dotMat);
        this.headDot.rotation.x = -Math.PI / 2;
        this.headDot.frustumCulled = false;
        this.headDot.renderOrder = 10;
        this.scene.add(this.headDot);
    }

    update(drone, track = null, dt = 0.016, time = 0) {
        if (!this.visible || !drone || !drone.position) {
            if (this.mesh) this.mesh.visible = false;
            if (this.headDot) this.headDot.visible = false;
            return;
        }

        if (this.mesh) this.mesh.visible = true;
        if (this.headDot) this.headDot.visible = true;

        if (this.material && this.material.uniforms && this.material.uniforms.time) {
            this.material.uniforms.time.value = time;
        }

        // Current drone speed & kinematic velocity
        const speedMs = Math.max(8.0, (drone.speedKmh || 0) / 3.6);
        const dronePos = drone.position;

        // Forward heading vector
        if (drone.quaternion) {
            _forward.set(0, 0, 1).applyQuaternion(drone.quaternion).normalize();
        } else {
            _forward.set(0, 0, 1);
        }

        // Ground reference: find roadbed height below drone
        let groundY = dronePos.y - 1.2;
        const spline = (track && track.spline) || drone.trackSpline;

        // Spline arc tracking
        const totalPredictionDist = Math.max(25.0, speedMs * this.predictionSeconds);

        let splineT = 0;
        if (spline && typeof spline.getPointAt === 'function') {
            // Find current approximate spline parameter t
            if (drone.currentSplineT !== undefined) {
                splineT = drone.currentSplineT;
            } else {
                splineT = 0;
            }
        }

        // Generate trajectory ribbon vertices
        for (let i = 0; i <= this.sampleCount; i++) {
            const frac = i / this.sampleCount; // 0.0 at drone -> 1.0 at 3-second horizon
            const dist = frac * totalPredictionDist;

            // Project position ahead: blend kinematic steering trajectory with roadbed spline
            if (spline && typeof spline.getPointAt === 'function') {
                const stepT = (splineT + (dist / 3200.0)) % 1.0;
                const spPoint = spline.getPointAt(stepT);
                _tangent.copy(spline.getTangentAt(stepT)).normalize();

                // Lateral offset blends from drone's current lane position into roadbed center
                const laneDecay = Math.pow(1.0 - frac, 1.4);
                const lateralX = (dronePos.x - spPoint.x) * laneDecay;
                const lateralZ = (dronePos.z - spPoint.z) * laneDecay;

                _center.set(
                    spPoint.x + lateralX,
                    Math.min(dronePos.y - 0.2, spPoint.y + 0.12), // Glides on top of roadbed surface
                    spPoint.z + lateralZ
                );
            } else {
                // Ballistic dead-reckoning fallback if no spline active
                _tangent.copy(_forward);
                _center.copy(dronePos).addScaledVector(_forward, dist);
                _center.y = groundY + 0.12;
            }

            // Normal and binormal for ribbon width expansion
            _binormal.crossVectors(_tangent, _up).normalize();
            if (_binormal.lengthSq() < 0.001) _binormal.set(1, 0, 0);

            // Subtle width taper towards the horizon tip
            const width = this.ribbonWidth * (1.0 - frac * 0.45);
            _posA.copy(_center).addScaledVector(_binormal, -width * 0.5);
            _posB.copy(_center).addScaledVector(_binormal, width * 0.5);

            // Populate vertex coordinates
            const vIdx = i * 2;
            const pIdx = vIdx * 3;
            this.positions[pIdx] = _posA.x;
            this.positions[pIdx + 1] = _posA.y;
            this.positions[pIdx + 2] = _posA.z;

            this.positions[pIdx + 3] = _posB.x;
            this.positions[pIdx + 4] = _posB.y;
            this.positions[pIdx + 5] = _posB.z;

            // UVs: X in [0, 1] across width, Y in [0, 1] along trajectory length
            const uvIdx = vIdx * 2;
            this.uvs[uvIdx] = 0.0;
            this.uvs[uvIdx + 1] = frac;
            this.uvs[uvIdx + 2] = 1.0;
            this.uvs[uvIdx + 3] = frac;

            // Longitudinal alpha fade: bright at craft, smoothly dissolving to 0 at 3-second tip
            const alpha = Math.pow(1.0 - frac, 1.25) * 0.95;
            const cIdx = vIdx * 4;
            // Left vertex color RGBA
            this.colors[cIdx] = 1.0;
            this.colors[cIdx + 1] = 1.0;
            this.colors[cIdx + 2] = 1.0;
            this.colors[cIdx + 3] = alpha;
            // Right vertex color RGBA
            this.colors[cIdx + 4] = 1.0;
            this.colors[cIdx + 5] = 1.0;
            this.colors[cIdx + 6] = 1.0;
            this.colors[cIdx + 7] = alpha;

            // Update head dot position & pulsing animation at the leading tip
            if (i === this.sampleCount && this.headDot) {
                this.headDot.position.copy(_center);
                this.headDot.position.y += 0.05; // Slightly above roadbed

                // Orient disc along roadbed normal
                this.headDot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), _up);

                // Elegant breathing pulse (matching Slow Roads screenshot)
                const pulse = 1.0 + 0.28 * Math.sin(time * 5.5);
                this.headDot.scale.set(pulse, pulse, pulse);
            }
        }

        // Zero-GC in-place buffer refresh
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
        this.geometry.attributes.uv.needsUpdate = true;
    }

    setVisible(visible) {
        this.visible = !!visible;
        if (this.mesh) this.mesh.visible = this.visible;
        if (this.headDot) this.headDot.visible = this.visible;
    }

    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
            this.mesh = null;
        }

        if (this.headDot) {
            this.scene.remove(this.headDot);
            if (this.headDot.geometry) this.headDot.geometry.dispose();
            if (this.headDot.material) this.headDot.material.dispose();
            this.headDot = null;
        }
    }
}
