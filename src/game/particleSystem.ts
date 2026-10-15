import * as THREE from 'three';

/**
 * High-performance Zero-GC Particle System for Racing:
 * - Tire smoke plumes on drifts
 * - Exhaust flame bursts & nitro sparks
 * - Impact spark showers on collisions
 */

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
  alpha: number;
}

export class ParticleSystem {
  private maxParticles: number = 240;
  private particles: Particle[] = [];
  private pointsMesh: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;

  // Pre-allocated scratch helpers
  private static _vec = new THREE.Vector3();

  constructor(scene: THREE.Group) {
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);

    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        position: new THREE.Vector3(0, -999, 0),
        velocity: new THREE.Vector3(),
        color: new THREE.Color(1, 1, 1),
        size: 0,
        life: 0,
        maxLife: 1,
        alpha: 0,
      });
      this.positions[i * 3 + 1] = -999;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    // Custom procedural smoke / spark sprite canvas
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(240, 240, 255, 0.8)');
    grad.addColorStop(0.7, 'rgba(200, 200, 210, 0.3)');
    grad.addColorStop(1, 'rgba(180, 180, 190, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fill();

    const spriteTexture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      map: spriteTexture,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.pointsMesh = new THREE.Points(this.geometry, material);
    this.pointsMesh.frustumCulled = false;
    scene.add(this.pointsMesh);
  }

  /**
   * Spawns tire smoke puff behind car when sliding / drifting
   */
  public emitTireSmoke(pos: THREE.Vector3, lateralVelocity: THREE.Vector3) {
    const p = this.getAvailableParticle();
    if (!p) return;

    p.position.copy(pos);
    p.position.y += 0.15;
    p.velocity.set(
      (Math.random() - 0.5) * 0.8 - lateralVelocity.x * 0.15,
      0.35 + Math.random() * 0.4,
      (Math.random() - 0.5) * 0.8 - lateralVelocity.z * 0.15
    );
    p.color.setRGB(0.88, 0.9, 0.94);
    p.size = 1.6 + Math.random() * 1.2;
    p.life = 0;
    p.maxLife = 0.65 + Math.random() * 0.35;
    p.alpha = 0.7;
  }

  /**
   * Spawns nitro flame spark from exhausts
   */
  public emitNitroSpark(pos: THREE.Vector3, forwardDir: THREE.Vector3) {
    const p = this.getAvailableParticle();
    if (!p) return;

    p.position.copy(pos);
    p.velocity.copy(forwardDir).multiplyScalar(-8.0).add(
      ParticleSystem._vec.set((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5)
    );
    // Cyan to electric blue nitro tint
    p.color.setRGB(0.1, 0.8, 1.0);
    p.size = 1.2;
    p.life = 0;
    p.maxLife = 0.22;
    p.alpha = 1.0;
  }

  /**
   * Spawns metal contact sparks on barrier or rival car collisions
   */
  public emitCrashSparks(pos: THREE.Vector3, count: number = 8) {
    for (let k = 0; k < count; k++) {
      const p = this.getAvailableParticle();
      if (!p) break;

      p.position.copy(pos);
      p.velocity.set(
        (Math.random() - 0.5) * 7.0,
        1.5 + Math.random() * 4.0,
        (Math.random() - 0.5) * 7.0
      );
      // Bright orange/gold sparks
      p.color.setRGB(1.0, 0.65 + Math.random() * 0.35, 0.1);
      p.size = 0.9;
      p.life = 0;
      p.maxLife = 0.35 + Math.random() * 0.25;
      p.alpha = 1.0;
    }
  }

  private getAvailableParticle(): Particle | null {
    for (let i = 0; i < this.particles.length; i++) {
      if (this.particles[i].life >= this.particles[i].maxLife) {
        return this.particles[i];
      }
    }
    return null;
  }

  /**
   * Update particle kinematics and buffer arrays (zero new allocations)
   */
  public update(dt: number) {
    const posAttr = this.geometry.attributes.position;
    const colAttr = this.geometry.attributes.color;
    const sizeAttr = this.geometry.attributes.size;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      if (p.life < p.maxLife) {
        p.life += dt;
        p.position.addScaledVector(p.velocity, dt);
        p.velocity.y -= 2.0 * dt; // Gravity
        p.velocity.multiplyScalar(0.96); // Air resistance

        const progress = p.life / p.maxLife;
        const currentSize = p.size * (1.0 + progress * 1.5);
        const currentAlpha = p.alpha * (1.0 - progress);

        this.positions[i * 3] = p.position.x;
        this.positions[i * 3 + 1] = p.position.y;
        this.positions[i * 3 + 2] = p.position.z;

        this.colors[i * 3] = p.color.r * currentAlpha;
        this.colors[i * 3 + 1] = p.color.g * currentAlpha;
        this.colors[i * 3 + 2] = p.color.b * currentAlpha;

        this.sizes[i] = currentSize;
      } else {
        this.positions[i * 3 + 1] = -999;
        this.sizes[i] = 0;
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }
}
