import * as THREE from 'three';

/**
 * Procedural Canvas Texture Generator.
 * Enforces SRGBColorSpace and maximum anisotropy for crisp grazing angles.
 */

export class TextureFactory {
  private static maxAnisotropy: number = 8;

  public static setMaxAnisotropy(val: number) {
    this.maxAnisotropy = Math.max(1, Math.min(16, val));
  }

  /**
   * Asphalt track texture with lane markings and rubber skid marks
   */
  public static createRoadTexture(isNight: boolean = false): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Base asphalt dark tone
    const baseColor = isNight ? '#16181d' : '#2b2d35';
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Procedural asphalt noise / aggregate grains
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const grain = (Math.random() - 0.5) * (isNight ? 18 : 26);
      data[i] = Math.max(0, Math.min(255, data[i] + grain));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grain));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grain));
    }
    ctx.putImageData(imgData, 0, 0);

    // Center dashed line
    ctx.strokeStyle = '#e6af2e'; // Racing amber / yellow
    ctx.lineWidth = 14;
    ctx.setLineDash([90, 60]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    // Outer white boundary lines
    ctx.setLineDash([]);
    ctx.strokeStyle = '#f0f3f6';
    ctx.lineWidth = 20;

    ctx.beginPath();
    ctx.moveTo(40, 0);
    ctx.lineTo(40, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(canvas.width - 40, 0);
    ctx.lineTo(canvas.width - 40, canvas.height);
    ctx.stroke();

    // Subtle rubber tire racing groove marks
    ctx.fillStyle = isNight ? 'rgba(0, 0, 0, 0.4)' : 'rgba(10, 10, 15, 0.35)';
    ctx.fillRect(160, 0, 120, canvas.height);
    ctx.fillRect(canvas.width - 280, 0, 120, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.maxAnisotropy;
    return texture;
  }

  /**
   * Red & White rumble kerb texture for apex and corner exits
   */
  public static createKerbTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    const segments = 8;
    const segWidth = canvas.width / segments;
    for (let i = 0; i < segments; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#d91e2b' : '#f4f6fa';
      ctx.fillRect(i * segWidth, 0, segWidth, canvas.height);

      // Shadow gradient on inner edge
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, 'rgba(0,0,0,0.3)');
      grad.addColorStop(0.3, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = grad;
      ctx.fillRect(i * segWidth, 0, segWidth, canvas.height);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.maxAnisotropy;
    return texture;
  }

  /**
   * Checkered start/finish line texture
   */
  public static createCheckeredTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    const rows = 4;
    const cols = 16;
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#111317' : '#ffffff';
        ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
      }
    }

    // Gold start line border
    ctx.fillStyle = '#ffb703';
    ctx.fillRect(0, 0, canvas.width, 6);
    ctx.fillRect(0, canvas.height - 6, canvas.width, 6);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.maxAnisotropy;
    return texture;
  }

  /**
   * Carbon fiber procedural texture for car spoilers, splitters, diffusers
   */
  public static createCarbonFiberTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#18191c';
    ctx.fillRect(0, 0, 128, 128);

    const size = 16;
    for (let x = 0; x < 128; x += size) {
      for (let y = 0; y < 128; y += size) {
        ctx.fillStyle = (x / size + y / size) % 2 === 0 ? '#26282e' : '#141416';
        ctx.fillRect(x, y, size, size);

        // Highlight stripe
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(x, y, size / 2, size / 2);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);
    texture.anisotropy = this.maxAnisotropy;
    return texture;
  }

  /**
   * Tire tread bump map
   */
  public static createTireTreadTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = '#202020'; // Groove depressions
    for (let y = 0; y < 256; y += 32) {
      ctx.fillRect(0, y, 256, 8);
      // Angular sipes
      ctx.fillRect(30, y + 8, 40, 16);
      ctx.fillRect(150, y + 16, 40, 16);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  }

  /**
   * Soft radial contact shadow texture for car grounding
   */
  public static createContactShadowTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.5)');
    grad.addColorStop(0.85, 'rgba(0, 0, 0, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    // Car footprint shape (rounded rect)
    ctx.beginPath();
    ctx.roundRect(32, 20, 192, 216, 60);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Track barrier sponsor banners
   */
  public static createBarrierBannerTexture(title: string, color: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#0f1115';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 16, canvas.height);
    ctx.fillRect(canvas.width - 16, 0, 16, canvas.height);
    ctx.fillRect(0, 0, canvas.width, 8);
    ctx.fillRect(0, canvas.height - 8, canvas.width, 8);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title.toUpperCase(), canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.maxAnisotropy;
    return texture;
  }
}
