/*
================================================================================
BARCH AERO-CANYON RACING - GPU-ACCELERATED PARTICLE SYSTEM
High-performance pooled particles for exhaust, speed streaks, and visual effects
================================================================================
*/

import { CONFIG } from '../config.js';

// Particle types for different visual effects
const PARTICLE_TYPES = {
    EXHAUST: 0,
    SPEED_STREAK: 1,
    STUNT_ROLL: 2,
    STUNT_KNIFE: 3,
    STUNT_COBRA: 4,
    COLLISION_SPARK: 5,
    ROTOR_WASH: 6
};

// Pre-allocated scratch objects to prevent garbage collection
const _tempVector = new THREE.Vector3();

export class ParticleSystem {
    constructor(scene, tier) {
        this.scene = scene;
        this.tier = tier;
        this.maxParticles = tier.particles || 90;
        
        // Particle pools for different types
        this.particles = [];
        this.activeCount = 0;
        
        // Create particle geometry and material
        this.createParticleSystem();
    }
    
    createParticleSystem() {
        // Create instanced particle geometry using points
        const geometry = new THREE.BufferGeometry();
        
        // Pre-allocate arrays for particle data
        const positions = new Float32Array(this.maxParticles * 3);
        const colors = new Float32Array(this.maxParticles * 3);
        const sizes = new Float32Array(this.maxParticles);
        const life = new Float32Array(this.maxParticles);
        const velocity = new Float32Array(this.maxParticles * 3);
        const types = new Float32Array(this.maxParticles);
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('life', new THREE.BufferAttribute(life, 1));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocity, 3));
        geometry.setAttribute('type', new THREE.BufferAttribute(types, 1));
        
        // Custom shader material for GPU-based particle animation
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                pixelRatio: { value: this.tier.dpr }
            },
            vertexShader: `
                attribute float size;
                attribute float life;
                attribute vec3 velocity;
                attribute float type;
                attribute vec3 color;
                varying float vLife;
                varying float vType;
                varying vec3 vColor;
                uniform float time;
                uniform float pixelRatio;
                
                void main() {
                    vLife = life;
                    vType = type;
                    vColor = color;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    float pz = max(0.5, -mvPosition.z);
                    gl_PointSize = clamp(size * max(0.0, life) * pixelRatio * (300.0 / pz), 1.0, 64.0);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying float vLife;
                varying float vType;
                varying vec3 vColor;
                
                void main() {
                    // Circular particle shape
                    vec2 center = gl_PointCoord - vec2(0.5);
                    float dist = length(center);
                    if (dist > 0.5) discard;
                    
                    // Soft edge
                    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
                    alpha *= vLife; // Fade out over life
                    
                    // Type-specific color modifications
                    vec3 finalColor = vColor;
                    
                    // Add glow for certain types
                    if (vType > 0.5 && vType < 1.5) { // SPEED_STREAK
                        finalColor *= 1.5;
                    }
                    
                    gl_FragColor = vec4(finalColor, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        this.particleSystem = new THREE.Points(geometry, material);
        this.scene.add(this.particleSystem);
        
        // Initialize particle data
        this.positionArray = geometry.attributes.position.array;
        this.colorArray = geometry.attributes.color.array;
        this.sizeArray = geometry.attributes.size.array;
        this.lifeArray = geometry.attributes.life.array;
        this.velocityArray = geometry.attributes.velocity.array;
        this.typeArray = geometry.attributes.type.array;
        this.attributeColor = geometry.attributes.color;
        this.attributePosition = geometry.attributes.position;
        this.attributeSize = geometry.attributes.size;
        this.attributeLife = geometry.attributes.life;
        this.attributeVelocity = geometry.attributes.velocity;
        this.attributeType = geometry.attributes.type;
        
        // Initialize all particles as inactive
        for (let i = 0; i < this.maxParticles; i++) {
            this.lifeArray[i] = 0.0;
            this.sizeArray[i] = 0.0;
        }
        
        geometry.attributes.life.needsUpdate = true;
        geometry.attributes.size.needsUpdate = true;
    }
    
    emit(position, color, velocity, size, lifetime, type) {
        // Find an inactive particle
        let index = -1;
        for (let i = 0; i < this.maxParticles; i++) {
            if (this.lifeArray[i] <= 0.0) {
                index = i;
                break;
            }
        }
        
        // If no inactive particle, recycle the oldest one
        if (index === -1) {
            index = 0;
            let minLife = this.lifeArray[0];
            for (let i = 1; i < this.maxParticles; i++) {
                if (this.lifeArray[i] < minLife) {
                    minLife = this.lifeArray[i];
                    index = i;
                }
            }
        }
        
        // Initialize particle
        const i3 = index * 3;
        this.positionArray[i3] = position.x;
        this.positionArray[i3 + 1] = position.y;
        this.positionArray[i3 + 2] = position.z;
        
        this.colorArray[i3] = color.r;
        this.colorArray[i3 + 1] = color.g;
        this.colorArray[i3 + 2] = color.b;
        
        this.velocityArray[i3] = velocity.x;
        this.velocityArray[i3 + 1] = velocity.y;
        this.velocityArray[i3 + 2] = velocity.z;
        
        this.sizeArray[index] = size;
        this.lifeArray[index] = lifetime;
        this.typeArray[index] = type;
        
        this.attributePosition.needsUpdate = true;
        this.attributeColor.needsUpdate = true;
        this.attributeSize.needsUpdate = true;
        this.attributeLife.needsUpdate = true;
        this.attributeVelocity.needsUpdate = true;
        this.attributeType.needsUpdate = true;

        this.activeCount = Math.max(this.activeCount, index + 1);
    }
    
    emitExhaust(position, direction, speed) {
        const count = Math.min(3, Math.floor(speed / 60)); // More particles at higher speeds
        for (let i = 0; i < count; i++) {
            _tempVector.copy(direction).multiplyScalar(-1).normalize();
            _tempVector.x += (Math.random() - 0.5) * 0.3;
            _tempVector.y += (Math.random() - 0.5) * 0.3;
            _tempVector.z += (Math.random() - 0.5) * 0.3;
            
            const color = new THREE.Color(speed > 200 ? 0x00ffff : (speed > 150 ? 0xE8580A : 0x0E7C7B));
            const size = 0.8 + Math.random() * 0.6;
            const lifetime = 0.4 + Math.random() * 0.3;
            
            this.emit(position, color, _tempVector, size, lifetime, PARTICLE_TYPES.EXHAUST);
        }
    }
    
    emitSpeedStreak(cameraPosition, forward, speed) {
        if (speed < 140) return;
        
        const intensity = Math.min(1.0, (speed - 140) / 180);
        const count = Math.floor(intensity * 2);
        
        for (let i = 0; i < count; i++) {
            _tempVector.copy(forward).multiplyScalar(-1);
            _tempVector.x += (Math.random() - 0.5) * 0.8;
            _tempVector.y += (Math.random() - 0.5) * 0.5;
            _tempVector.z += (Math.random() - 0.5) * 0.8;
            
            const color = new THREE.Color(speed > 280 ? 0x00ffff : 0xffffff);
            const size = 2.0 + Math.random() * 3.0;
            const lifetime = 0.2 + Math.random() * 0.2;
            
            this.emit(cameraPosition, color, _tempVector, size, lifetime, PARTICLE_TYPES.SPEED_STREAK);
        }
    }

    emitWingtipVortices(position, quaternion, speed) {
        if (speed < 120) return;
        const wingSpan = 3.6;
        const vortexColor = new THREE.Color(speed > 220 ? 0x00ffff : 0xaaccff);

        // Left wingtip vortex ribbon
        _tempVector.set(-wingSpan, 0, -0.4).applyQuaternion(quaternion).add(position);
        const trailVelL = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion).multiplyScalar(speed * 0.06);
        this.emit(_tempVector, vortexColor, trailVelL, 1.4, 0.45, PARTICLE_TYPES.SPEED_STREAK);

        // Right wingtip vortex ribbon
        _tempVector.set(wingSpan, 0, -0.4).applyQuaternion(quaternion).add(position);
        const trailVelR = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion).multiplyScalar(speed * 0.06);
        this.emit(_tempVector, vortexColor, trailVelR, 1.4, 0.45, PARTICLE_TYPES.SPEED_STREAK);
    }
    
    emitStuntEffect(position, type) {
        const count = 8;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            _tempVector.set(
                Math.cos(angle),
                (Math.random() - 0.5) * 0.5,
                Math.sin(angle)
            );
            
            let color;
            if (type === PARTICLE_TYPES.STUNT_ROLL) {
                color = new THREE.Color(0x00ffff);
            } else if (type === PARTICLE_TYPES.STUNT_KNIFE) {
                color = new THREE.Color(0x00ff88);
            } else if (type === PARTICLE_TYPES.STUNT_COBRA) {
                color = new THREE.Color(0xff6600);
            }
            
            const size = 1.2 + Math.random() * 0.8;
            const lifetime = 0.5 + Math.random() * 0.3;
            
            this.emit(position, color, _tempVector, size, lifetime, type);
        }
    }
    
    emitCollision(position, normal) {
        const count = 12;
        for (let i = 0; i < count; i++) {
            _tempVector.copy(normal);
            _tempVector.x += (Math.random() - 0.5) * 1.5;
            _tempVector.y += (Math.random() - 0.5) * 1.5;
            _tempVector.z += (Math.random() - 0.5) * 1.5;
            
            const color = new THREE.Color(0xffaa00);
            const size = 0.5 + Math.random() * 0.5;
            const lifetime = 0.3 + Math.random() * 0.2;
            
            this.emit(position, color, _tempVector, size, lifetime, PARTICLE_TYPES.COLLISION_SPARK);
        }
    }
    
    update(dt) {
        // Update particle lifetimes and advance positions along velocity
        let hasActive = false;
        for (let i = 0; i < this.maxParticles; i++) {
            if (this.lifeArray[i] > 0.0) {
                this.lifeArray[i] -= dt;
                const i3 = i * 3;
                this.positionArray[i3] += this.velocityArray[i3] * dt;
                this.positionArray[i3 + 1] += this.velocityArray[i3 + 1] * dt;
                this.positionArray[i3 + 2] += this.velocityArray[i3 + 2] * dt;
                hasActive = true;
            }
        }
        
        // Update only active changing attributes (position and life)
        if (hasActive) {
            this.attributePosition.needsUpdate = true;
            this.attributeLife.needsUpdate = true;
        }
        
        // Update shader time uniform safely
        if (this.particleSystem && this.particleSystem.material && this.particleSystem.material.uniforms && this.particleSystem.material.uniforms.time) {
            this.particleSystem.material.uniforms.time.value += dt;
        }
    }
    
    dispose() {
        if (this.particleSystem) {
            this.scene.remove(this.particleSystem);
            this.particleSystem.geometry.dispose();
            this.particleSystem.material.dispose();
        }
    }
    
    static get PARTICLE_TYPES() {
        return PARTICLE_TYPES;
    }
}