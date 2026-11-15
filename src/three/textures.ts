import * as THREE from 'three';

function finalizeTexture(canvas: HTMLCanvasElement, maxAniso: number, repeat = 1): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = Math.min(8, Math.max(1, maxAniso));
  tex.needsUpdate = true;
  return tex;
}

export function createWoodPlankTexture(maxAniso: number, warmShift = 0): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const baseR = 176 + warmShift;
  const baseG = 123 + Math.round(warmShift * 0.5);
  const baseB = 71;
  ctx.fillStyle = `rgb(${baseR},${baseG},${baseB})`;
  ctx.fillRect(0, 0, 256, 256);

  const plankH = 64;
  for (let row = 0; row < 4; row++) {
    const y = row * plankH;
    const tone = (row % 2 === 0 ? 10 : -8) + ((row * 17) % 9);
    ctx.fillStyle = `rgb(${baseR + tone},${baseG + Math.round(tone * 0.7)},${baseB + Math.round(tone * 0.4)})`;
    ctx.fillRect(0, y + 2, 256, plankH - 4);

    // Subtle wood grain lines
    ctx.strokeStyle = 'rgba(72, 40, 16, 0.22)';
    ctx.lineWidth = 1.5;
    for (let g = 0; g < 6; g++) {
      const gy = y + 9 + g * 9;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(75, gy + (g % 2 === 0 ? 3 : -3), 175, gy - 2, 256, gy + 1);
      ctx.stroke();
    }

    // Plank seam
    ctx.fillStyle = 'rgba(54, 28, 10, 0.55)';
    ctx.fillRect(0, y, 256, 3);

    // Nail heads
    ctx.fillStyle = '#525866';
    const nailX = row % 2 === 0 ? [20, 236] : [36, 220];
    for (const nx of nailX) {
      ctx.beginPath();
      ctx.arc(nx, y + 14, 2.5, 0, Math.PI * 2);
      ctx.arc(nx, y + plankH - 14, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return finalizeTexture(canvas, maxAniso);
}

export function createHousePlankTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#dcb88f';
  ctx.fillRect(0, 0, 256, 256);

  const plankW = 32;
  for (let col = 0; col < 8; col++) {
    const x = col * plankW;
    const shade = col % 2 === 0 ? 8 : -7;
    ctx.fillStyle = `rgb(${214 + shade}, ${176 + shade}, ${134 + shade})`;
    ctx.fillRect(x + 1, 0, plankW - 2, 256);

    ctx.strokeStyle = 'rgba(110, 68, 34, 0.16)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 6 + i * 6, 0);
      ctx.lineTo(x + 5 + i * 6, 256);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(92, 54, 24, 0.35)';
    ctx.fillRect(x, 0, 2, 256);
  }

  return finalizeTexture(canvas, maxAniso);
}

export function createRoofShingleTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#7b533b';
  ctx.fillRect(0, 0, 256, 256);

  const rows = 8;
  const cols = 6;
  const rh = 256 / rows;
  const cw = 256 / cols;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (cw * 0.5);
    for (let c = -1; c <= cols; c++) {
      const shade = ((r * 7 + c * 11) % 18) - 9;
      ctx.fillStyle = `rgb(${128 + shade}, ${84 + Math.round(shade * 0.7)}, ${60 + Math.round(shade * 0.5)})`;
      ctx.fillRect(c * cw + offset + 2, r * rh + 2, cw - 4, rh - 4);
    }
    ctx.fillStyle = 'rgba(42, 24, 15, 0.45)';
    ctx.fillRect(0, r * rh, 256, 3);
  }

  return finalizeTexture(canvas, maxAniso);
}

export function createRugTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#c4543d';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#f2e4cc';
  ctx.lineWidth = 14;
  ctx.strokeRect(18, 18, 220, 220);

  ctx.strokeStyle = '#2d6b7c';
  ctx.lineWidth = 8;
  ctx.strokeRect(38, 38, 180, 180);

  ctx.fillStyle = '#e7c178';
  ctx.beginPath();
  ctx.moveTo(128, 62);
  ctx.lineTo(194, 128);
  ctx.lineTo(128, 194);
  ctx.lineTo(62, 128);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#245869';
  ctx.beginPath();
  ctx.moveTo(128, 92);
  ctx.lineTo(164, 128);
  ctx.lineTo(128, 164);
  ctx.lineTo(92, 128);
  ctx.closePath();
  ctx.fill();

  return finalizeTexture(canvas, maxAniso);
}

export function createFabricTexture(maxAniso: number, primary = '#c85a43'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = primary;
  ctx.fillRect(0, 0, 128, 128);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 128; i += 8) {
    ctx.fillRect(i, 0, 2, 128);
    ctx.fillRect(0, i, 128, 2);
  }
  return finalizeTexture(canvas, maxAniso);
}
