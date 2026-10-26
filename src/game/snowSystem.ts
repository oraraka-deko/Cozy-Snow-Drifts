import * as THREE from 'three';

export interface SnowCell {
  x: number;
  z: number;
  instanceIndex: number;
  cleared: boolean;
  depth: number;
}

export class SnowSystem {
  public group: THREE.Group;
  public snowInstancedMesh!: THREE.InstancedMesh;
  public totalSnowCells: number = 0;
  public clearedSnowCells: number = 0;

  // Spatial grid
  private cellSize: number = 1.0;
  private minX: number = -55;
  private maxX: number = 55;
  private minZ: number = -55;
  private maxZ: number = 55;
  private gridWidth: number;
  private gridDepth: number;
  private grid: (SnowCell | null)[][];

  // Ambient falling snow
  private snowflakeCount: number = 750;
  private snowflakeGeometry!: THREE.BufferGeometry;
  private snowflakePoints!: THREE.Points;
  private snowflakePositions!: Float32Array;
  private snowflakeVelocities!: Float32Array;

  // Pooled Snow Spray Particles
  private maxSprayParticles: number = 180;
  private sprayIndex: number = 0;
  private sprayMesh!: THREE.InstancedMesh;
  private sprayParticles: {
    active: boolean;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    life: number;
    scale: number;
  }[] = [];

  // Temporary reusable math objects for zero GC
  private dummyMatrix: THREE.Matrix4 = new THREE.Matrix4();
  private dummyPos: THREE.Vector3 = new THREE.Vector3();
  private dummyScale: THREE.Vector3 = new THREE.Vector3();
  private dummyQuat: THREE.Quaternion = new THREE.Quaternion();

  constructor() {
    this.group = new THREE.Group();

    this.gridWidth = Math.ceil((this.maxX - this.minX) / this.cellSize);
    this.gridDepth = Math.ceil((this.maxZ - this.minZ) / this.cellSize);
    this.grid = Array.from({ length: this.gridWidth }, () =>
      Array.from({ length: this.gridDepth }, () => null)
    );
  }

  public initSnow(
    roads: { x1: number; z1: number; x2: number; z2: number; width: number }[],
    obstacles: { x: number; z: number; radius: number }[]
  ) {
    const candidateCells: { x: number; z: number }[] = [];

    // Find all cells that sit on roads and not inside obstacles
    for (let gx = 0; gx < this.gridWidth; gx++) {
      for (let gz = 0; gz < this.gridDepth; gz++) {
        const worldX = this.minX + gx * this.cellSize + this.cellSize * 0.5;
        const worldZ = this.minZ + gz * this.cellSize + this.cellSize * 0.5;

        // Check if point lies on any road or village square
        let isOnRoad = false;
        for (const road of roads) {
          const minRx = Math.min(road.x1, road.x2) - road.width * 0.5;
          const maxRx = Math.max(road.x1, road.x2) + road.width * 0.5;
          const minRz = Math.min(road.z1, road.z2) - road.width * 0.5;
          const maxRz = Math.max(road.z1, road.z2) + road.width * 0.5;

          if (worldX >= minRx && worldX <= maxRx && worldZ >= minRz && worldZ <= maxRz) {
            isOnRoad = true;
            break;
          }
        }

        if (isOnRoad) {
          // Check if colliding with obstacle
          let insideObstacle = false;
          for (const obs of obstacles) {
            const dx = worldX - obs.x;
            const dz = worldZ - obs.z;
            if (dx * dx + dz * dz < obs.radius * obs.radius) {
              insideObstacle = true;
              break;
            }
          }

          if (!insideObstacle) {
            candidateCells.push({ x: worldX, z: worldZ });
          }
        }
      }
    }

    this.totalSnowCells = candidateCells.length;
    this.clearedSnowCells = 0;

    // Build InstancedMesh for fluffy snow blocks
    const snowBoxGeo = new THREE.BoxGeometry(this.cellSize * 0.98, 0.28, this.cellSize * 0.98);
    const snowMat = new THREE.MeshStandardMaterial({
      color: 0xf8f9fa,
      roughness: 0.88,
      metalness: 0.02,
    });

    this.snowInstancedMesh = new THREE.InstancedMesh(snowBoxGeo, snowMat, this.totalSnowCells);
    this.snowInstancedMesh.receiveShadow = true;
    this.snowInstancedMesh.castShadow = true;

    candidateCells.forEach((pt, index) => {
      const gx = Math.floor((pt.x - this.minX) / this.cellSize);
      const gz = Math.floor((pt.z - this.minZ) / this.cellSize);

      const cell: SnowCell = {
        x: pt.x,
        z: pt.z,
        instanceIndex: index,
        cleared: false,
        depth: 0.28,
      };

      if (gx >= 0 && gx < this.gridWidth && gz >= 0 && gz < this.gridDepth) {
        this.grid[gx][gz] = cell;
      }

      this.dummyPos.set(pt.x, 0.14, pt.z);
      this.dummyScale.set(1, 1, 1);
      this.dummyQuat.identity();
      this.dummyMatrix.compose(this.dummyPos, this.dummyQuat, this.dummyScale);
      this.snowInstancedMesh.setMatrixAt(index, this.dummyMatrix);
    });

    this.snowInstancedMesh.instanceMatrix.needsUpdate = true;
    this.snowInstancedMesh.computeBoundingSphere();
    this.group.add(this.snowInstancedMesh);

    // Setup ambient falling snowflakes
    this.initFallingSnow();

    // Setup pooled spray particles
    this.initSprayParticles();
  }

  /**
   * Ambient falling snow particle system
   */
  private initFallingSnow() {
    this.snowflakePositions = new Float32Array(this.snowflakeCount * 3);
    this.snowflakeVelocities = new Float32Array(this.snowflakeCount * 3);

    for (let i = 0; i < this.snowflakeCount; i++) {
      this.snowflakePositions[i * 3] = (Math.random() - 0.5) * 120;
      this.snowflakePositions[i * 3 + 1] = Math.random() * 30;
      this.snowflakePositions[i * 3 + 2] = (Math.random() - 0.5) * 120;

      this.snowflakeVelocities[i * 3] = (Math.random() - 0.5) * 0.4; // gentle drift
      this.snowflakeVelocities[i * 3 + 1] = -1.2 - Math.random() * 1.5; // fall speed
      this.snowflakeVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }

    this.snowflakeGeometry = new THREE.BufferGeometry();
    this.snowflakeGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.snowflakePositions, 3)
    );

    const snowPointMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.35,
      transparent: true,
      opacity: 0.8,
    });

    this.snowflakePoints = new THREE.Points(this.snowflakeGeometry, snowPointMat);
    this.group.add(this.snowflakePoints);
  }

  /**
   * Pooled spray particle mesh for snow throwing
   */
  private initSprayParticles() {
    const sprayGeo = new THREE.DodecahedronGeometry(0.18, 0);
    const sprayMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
    });

    this.sprayMesh = new THREE.InstancedMesh(sprayGeo, sprayMat, this.maxSprayParticles);
    this.sprayMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.sprayParticles = [];
    for (let i = 0; i < this.maxSprayParticles; i++) {
      this.sprayParticles.push({
        active: false,
        x: 0,
        y: -10,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        scale: 0.1,
      });

      this.dummyPos.set(0, -10, 0);
      this.dummyScale.set(0.001, 0.001, 0.001);
      this.dummyMatrix.compose(this.dummyPos, this.dummyQuat, this.dummyScale);
      this.sprayMesh.setMatrixAt(i, this.dummyMatrix);
    }
    this.sprayMesh.instanceMatrix.needsUpdate = true;
    this.group.add(this.sprayMesh);
  }

  /**
   * Clear snow in a sweep line/box around the plow blade
   * Returns the count of snow cells cleared in this sweep
   */
  public clearSnowAroundBlade(
    bladePos: THREE.Vector3,
    bladeAngle: number,
    bladeWidth: number,
    vehicleSpeed: number
  ): number {
    let clearedCount = 0;
    const halfWidth = bladeWidth * 0.55;
    const sweepDepth = 1.2;

    // Check cells within the bounding radius of the blade
    const checkRadius = halfWidth + sweepDepth;
    const minGx = Math.max(0, Math.floor((bladePos.x - checkRadius - this.minX) / this.cellSize));
    const maxGx = Math.min(this.gridWidth - 1, Math.floor((bladePos.x + checkRadius - this.minX) / this.cellSize));
    const minGz = Math.max(0, Math.floor((bladePos.z - checkRadius - this.minZ) / this.cellSize));
    const maxGz = Math.min(this.gridDepth - 1, Math.floor((bladePos.z + checkRadius - this.minZ) / this.cellSize));

    const forwardX = Math.sin(bladeAngle);
    const forwardZ = Math.cos(bladeAngle);
    const rightX = Math.cos(bladeAngle);
    const rightZ = -Math.sin(bladeAngle);

    let matrixChanged = false;

    for (let gx = minGx; gx <= maxGx; gx++) {
      for (let gz = minGz; gz <= maxGz; gz++) {
        const cell = this.grid[gx][gz];
        if (!cell || cell.cleared) continue;

        // Transform cell coordinate relative to blade center
        const dx = cell.x - bladePos.x;
        const dz = cell.z - bladePos.z;

        const localForward = dx * forwardX + dz * forwardZ;
        const localRight = dx * rightX + dz * rightZ;

        // Is cell within blade scoop area?
        if (Math.abs(localRight) <= halfWidth && localForward >= -0.3 && localForward <= sweepDepth) {
          cell.cleared = true;
          clearedCount++;
          this.clearedSnowCells++;

          // Animate snow disappearance in instanced mesh
          this.dummyPos.set(cell.x, -2.0, cell.z); // drop below ground
          this.dummyScale.set(0.001, 0.001, 0.001);
          this.dummyMatrix.compose(this.dummyPos, this.dummyQuat, this.dummyScale);
          this.snowInstancedMesh.setMatrixAt(cell.instanceIndex, this.dummyMatrix);
          matrixChanged = true;

          // Spawn snow spray ejection!
          const throwDir = localRight >= 0 ? 1 : -1;
          this.spawnSnowSpray(
            bladePos.x + localRight * rightX,
            0.4,
            bladePos.z + localRight * rightZ,
            rightX * throwDir * (2.8 + Math.random() * 2.5) + forwardX * vehicleSpeed * 0.4,
            2.0 + Math.random() * 2.0,
            rightZ * throwDir * (2.8 + Math.random() * 2.5) + forwardZ * vehicleSpeed * 0.4
          );
        }
      }
    }

    if (matrixChanged) {
      this.snowInstancedMesh.instanceMatrix.needsUpdate = true;
    }

    return clearedCount;
  }

  /**
   * Spawns a physical thrown snow chunk/spray
   */
  public spawnSnowSpray(x: number, y: number, z: number, vx: number, vy: number, vz: number) {
    const p = this.sprayParticles[this.sprayIndex];
    p.active = true;
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = vx;
    p.vy = vy;
    p.vz = vz;
    p.life = 0;
    p.scale = 0.8 + Math.random() * 0.6;

    this.sprayIndex = (this.sprayIndex + 1) % this.maxSprayParticles;
  }

  /**
   * Updates snow simulation (falling snow, spray physics)
   */
  public update(dt: number, centerPos: THREE.Vector3) {
    // 1. Falling snow loop
    const pos = this.snowflakePositions;
    const vel = this.snowflakeVelocities;
    for (let i = 0; i < this.snowflakeCount; i++) {
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;

      // Wrap around vehicle center
      if (pos[i * 3 + 1] < 0) {
        pos[i * 3 + 1] = 25 + Math.random() * 5;
        pos[i * 3] = centerPos.x + (Math.random() - 0.5) * 80;
        pos[i * 3 + 2] = centerPos.z + (Math.random() - 0.5) * 80;
      }
    }
    this.snowflakeGeometry.attributes.position.needsUpdate = true;

    // 2. Snow spray particle update
    let sprayChanged = false;
    for (let i = 0; i < this.maxSprayParticles; i++) {
      const p = this.sprayParticles[i];
      if (!p.active) continue;

      p.life += dt * 2.2;
      p.vy -= 9.8 * dt; // gravity
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      if (p.y <= 0.05 || p.life >= 1.0) {
        p.active = false;
        this.dummyPos.set(0, -10, 0);
        this.dummyScale.set(0.001, 0.001, 0.001);
      } else {
        const curScale = (1.0 - p.life) * p.scale;
        this.dummyPos.set(p.x, p.y, p.z);
        this.dummyScale.set(curScale, curScale, curScale);
      }

      this.dummyMatrix.compose(this.dummyPos, this.dummyQuat, this.dummyScale);
      this.sprayMesh.setMatrixAt(i, this.dummyMatrix);
      sprayChanged = true;
    }

    if (sprayChanged) {
      this.sprayMesh.instanceMatrix.needsUpdate = true;
    }
  }

  public getClearedPercentage(): number {
    if (this.totalSnowCells === 0) return 0;
    return Math.min(100, Math.floor((this.clearedSnowCells / this.totalSnowCells) * 100));
  }

  public resetSnow() {
    this.clearedSnowCells = 0;
    for (let gx = 0; gx < this.gridWidth; gx++) {
      for (let gz = 0; gz < this.gridDepth; gz++) {
        const cell = this.grid[gx][gz];
        if (cell) {
          cell.cleared = false;
          this.dummyPos.set(cell.x, 0.14, cell.z);
          this.dummyScale.set(1, 1, 1);
          this.dummyMatrix.compose(this.dummyPos, this.dummyQuat, this.dummyScale);
          this.snowInstancedMesh.setMatrixAt(cell.instanceIndex, this.dummyMatrix);
        }
      }
    }
    this.snowInstancedMesh.instanceMatrix.needsUpdate = true;
  }
}
