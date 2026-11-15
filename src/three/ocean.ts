import * as THREE from 'three';
import { TimeOfDay } from '../types/game';

const RAIN_COUNT = 180;

export class OceanSimulation {
  public readonly group = new THREE.Group();
  private waterMesh: THREE.Mesh;
  private waterGeo: THREE.PlaneGeometry;
  private waterMat: THREE.MeshStandardMaterial;
  private basePos: Float32Array;
  private rainMesh: THREE.InstancedMesh;
  private rainData: Array<{ x: number; y: number; z: number; speed: number }> = [];
  private rainDummy = new THREE.Object3D();
  private raftFootprints: Array<{ x: number; z: number }> = [];
  private footprintHalf = 1.25;

  constructor() {
    this.waterGeo = new THREE.PlaneGeometry(180, 180, 72, 72);
    this.waterGeo.rotateX(-Math.PI / 2);

    const posAttr = this.waterGeo.attributes.position as THREE.BufferAttribute;
    this.basePos = new Float32Array(posAttr.array.length);
    this.basePos.set(posAttr.array as Float32Array);

    this.waterMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0c7b96'),
      emissive: new THREE.Color('#053447'),
      emissiveIntensity: 0.35,
      roughness: 0.24,
      metalness: 0.12,
      flatShading: true,
    });

    this.waterMesh = new THREE.Mesh(this.waterGeo, this.waterMat);
    this.waterMesh.receiveShadow = true;
    this.group.add(this.waterMesh);

    // Deep abyss backdrop plane beneath waves
    const deepGeo = new THREE.PlaneGeometry(240, 240);
    deepGeo.rotateX(-Math.PI / 2);
    const deepMat = new THREE.MeshBasicMaterial({ color: '#063345' });
    const deepMesh = new THREE.Mesh(deepGeo, deepMat);
    deepMesh.position.y = -2.2;
    this.group.add(deepMesh);

    // Pooled 3D rain streaks for storms
    const rainGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.95, 4);
    const rainMat = new THREE.MeshBasicMaterial({
      color: '#bfe8ff',
      transparent: true,
      opacity: 0.55,
    });
    this.rainMesh = new THREE.InstancedMesh(rainGeo, rainMat, RAIN_COUNT);
    this.rainMesh.visible = false;
    this.rainMesh.frustumCulled = false;

    for (let i = 0; i < RAIN_COUNT; i++) {
      this.rainData.push({
        x: (Math.random() - 0.5) * 34,
        y: Math.random() * 14 + 1,
        z: (Math.random() - 0.5) * 34,
        speed: 14 + Math.random() * 6,
      });
    }
    this.group.add(this.rainMesh);
  }

  public setRaftFootprints(centers: Array<{ x: number; z: number }>, tileSize: number): void {
    this.raftFootprints = centers;
    this.footprintHalf = tileSize * 0.62;
  }

  public getWaveHeight(x: number, z: number, time: number, stormFactor: number): number {
    const amp = 0.12 + stormFactor * 0.16;
    const w1 = Math.sin(x * 0.32 + time * 1.45) * amp;
    const w2 = Math.cos(z * 0.28 + time * 1.15) * (amp * 0.78);
    const w3 = Math.sin((x + z) * 0.19 - time * 0.95) * (amp * 0.55);
    return -0.14 + w1 + w2 + w3;
  }

  private getDampedVertexHeight(wx: number, wz: number, time: number, stormFactor: number): number {
    const raw = this.getWaveHeight(wx, wz, time, stormFactor);
    if (this.raftFootprints.length === 0) return raw;

    let minDist = Infinity;
    for (let i = 0; i < this.raftFootprints.length; i++) {
      const fp = this.raftFootprints[i];
      const dx = Math.abs(wx - fp.x);
      const dz = Math.abs(wz - fp.z);
      const boxDist = Math.max(dx, dz);
      if (boxDist < minDist) {
        minDist = boxDist;
      }
    }

    if (minDist < this.footprintHalf) {
      // Smoothly keep water surface cleanly below raft deck and furniture
      return Math.min(raw, -0.18);
    }
    if (minDist < this.footprintHalf + 1.4) {
      const blend = (minDist - this.footprintHalf) / 1.4;
      const suppressed = Math.min(raw, -0.16);
      return suppressed + (raw - suppressed) * blend;
    }
    return raw;
  }

  public update(
    time: number,
    dt: number,
    stormFactor: number,
    timeOfDay: TimeOfDay,
    focusX: number,
    focusZ: number,
  ): void {
    const posAttr = this.waterGeo.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const offsetX = focusX * 0.25;
    const offsetZ = focusZ * 0.25;

    for (let i = 0; i < arr.length; i += 3) {
      const wx = this.basePos[i] + offsetX;
      const wz = this.basePos[i + 2] + offsetZ;
      arr[i + 1] = this.getDampedVertexHeight(wx, wz, time, stormFactor);
    }
    posAttr.needsUpdate = true;
    this.waterGeo.computeVertexNormals();

    this.waterMesh.position.set(offsetX, 0, offsetZ);

    if (timeOfDay === 'night') {
      this.waterMat.color.setHex(stormFactor > 0.5 ? 0x093142 : 0x0a4962);
      this.waterMat.emissive.setHex(0x031824);
    } else if (timeOfDay === 'evening') {
      this.waterMat.color.setHex(stormFactor > 0.5 ? 0x0e4f66 : 0x106f8a);
      this.waterMat.emissive.setHex(0x162938);
    } else {
      this.waterMat.color.setHex(stormFactor > 0.5 ? 0x0c5970 : 0x0e87a4);
      this.waterMat.emissive.setHex(0x043447);
    }

    // Update storm rain streaks
    if (stormFactor > 0.25) {
      this.rainMesh.visible = true;
      (this.rainMesh.material as THREE.MeshBasicMaterial).opacity = Math.min(0.6, stormFactor * 0.55);
      for (let i = 0; i < RAIN_COUNT; i++) {
        const drop = this.rainData[i];
        drop.y -= drop.speed * dt;
        drop.x -= 2.4 * dt;
        if (drop.y < 0) {
          drop.y = 14 + Math.random() * 3;
          drop.x = focusX + (Math.random() - 0.5) * 32;
          drop.z = focusZ + (Math.random() - 0.5) * 32;
        }
        this.rainDummy.position.set(drop.x, drop.y, drop.z);
        this.rainDummy.rotation.z = -0.18;
        this.rainDummy.updateMatrix();
        this.rainMesh.setMatrixAt(i, this.rainDummy.matrix);
      }
      this.rainMesh.instanceMatrix.needsUpdate = true;
    } else {
      this.rainMesh.visible = false;
    }
  }

  public dispose(): void {
    this.waterGeo.dispose();
    this.waterMat.dispose();
    this.rainMesh.geometry.dispose();
    (this.rainMesh.material as THREE.Material).dispose();
  }
}
