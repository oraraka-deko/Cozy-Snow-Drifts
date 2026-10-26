import * as THREE from 'three';

export interface WorldObstacle {
  x: number;
  z: number;
  radius: number;
  type: 'cabin' | 'tree' | 'lamp' | 'fence' | 'rock' | 'snowman';
}

export interface ChimneySmoke {
  position: THREE.Vector3;
  mesh: THREE.Mesh;
  particles: { mesh: THREE.Mesh; initialY: number; life: number; speed: number }[];
}

export class WorldGenerator {
  public obstacles: WorldObstacle[] = [];
  public worldGroup: THREE.Group;
  public groundMesh!: THREE.Mesh;
  public roadGroup: THREE.Group;
  public chimneys: ChimneySmoke[] = [];
  public townCenter: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  // Road grid bounds for snow coverage
  public townWidth: number = 140;
  public townDepth: number = 140;

  constructor() {
    this.worldGroup = new THREE.Group();
    this.roadGroup = new THREE.Group();
    this.worldGroup.add(this.roadGroup);
  }

  public generateTown(timeOfDay: 'day' | 'sunset' | 'twilight' | 'aurora' = 'day'): {
    group: THREE.Group;
    obstacles: WorldObstacle[];
    roads: { x1: number; z1: number; x2: number; z2: number; width: number }[];
  } {
    // 1. Natural Infinite Ground with gentle snow elevation
    const groundGeo = new THREE.PlaneGeometry(360, 360, 48, 48);
    groundGeo.rotateX(-Math.PI / 2);

    // Subtle gentle rolling snowdrifts
    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const distFromCenter = Math.sqrt(vx * vx + vz * vz);
      // Gentle slope near mountains / outskirts, flat in town streets
      if (distFromCenter > 45) {
        const elevation = Math.sin(vx * 0.05) * Math.cos(vz * 0.05) * 3.5 + (distFromCenter - 45) * 0.08;
        posAttr.setY(i, Math.max(0, elevation));
      }
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xf5f6fa, // crisp snow white
      roughness: 0.9,
      metalness: 0.05,
    });
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.receiveShadow = true;
    this.worldGroup.add(this.groundMesh);

    // 2. Road Network Layout
    // Cleared / dark asphalt roads underneath snow
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x2f3640,
      roughness: 0.85,
      metalness: 0.15,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const roads = [
      // Main Avenue (North-South)
      { x1: 0, z1: -65, x2: 0, z2: 65, width: 8.5 },
      // Cross Street (East-West)
      { x1: -65, z1: 0, x2: 65, z2: 0, width: 8.5 },
      // Ring Boulevard
      { x1: -45, z1: -45, x2: 45, z2: -45, width: 7.0 },
      { x1: -45, z1: 45, x2: 45, z2: 45, width: 7.0 },
      { x1: -45, z1: -45, x2: -45, z2: 45, width: 7.0 },
      { x1: 45, z1: -45, x2: 45, z2: 45, width: 7.0 },
      // Driveway connections & cozy cul-de-sacs
      { x1: -22, z1: -45, x2: -22, z2: -20, width: 6.0 },
      { x1: 22, z1: -45, x2: 22, z2: -20, width: 6.0 },
      { x1: -22, z1: 20, x2: -22, z2: 45, width: 6.0 },
      { x1: 22, z1: 20, x2: 22, z2: 45, width: 6.0 },
      // Village Square Apron
      { x1: 0, z1: 0, x2: 0, z2: 0, width: 22.0 },
    ];

    roads.forEach((road) => {
      const lengthX = Math.abs(road.x2 - road.x1);
      const lengthZ = Math.abs(road.z2 - road.z1);
      const isSquare = lengthX === 0 && lengthZ === 0;

      const rGeo = isSquare
        ? new THREE.PlaneGeometry(road.width, road.width)
        : new THREE.PlaneGeometry(
            lengthX > 0 ? lengthX + road.width : road.width,
            lengthZ > 0 ? lengthZ + road.width : road.width
          );

      rGeo.rotateX(-Math.PI / 2);
      const rMesh = new THREE.Mesh(rGeo, roadMat);
      rMesh.position.set((road.x1 + road.x2) / 2, 0.03, (road.z1 + road.z2) / 2);
      rMesh.receiveShadow = true;
      this.roadGroup.add(rMesh);
    });

    // 3. Central Town Square Feature: Cozy Alpine Clock Tower / Town Hall
    this.createTownHall(0, -22);

    // 4. Cozy Alpine Cabins & Chalets (placed along roads with cozy yards)
    const cabinSpots = [
      { x: -14, z: -14, rot: 0.3 },
      { x: 14, z: -14, rot: -0.3 },
      { x: -14, z: 14, rot: 2.8 },
      { x: 14, z: 14, rot: -2.8 },

      { x: -34, z: -25, rot: 1.57 },
      { x: 34, z: -25, rot: -1.57 },
      { x: -34, z: 25, rot: 1.57 },
      { x: 34, z: 25, rot: -1.57 },

      { x: -25, z: -55, rot: 0 },
      { x: 25, z: -55, rot: 0 },
      { x: -25, z: 55, rot: Math.PI },
      { x: 25, z: 55, rot: Math.PI },
    ];

    cabinSpots.forEach((spot, idx) => {
      this.createAlpineCabin(spot.x, spot.z, spot.rot, idx);
    });

    // 5. Frozen Pond with wooden dock and bench
    this.createFrozenPond(22, 22);

    // 6. Cozy Victorian / Alpine Streetlamps with warm light glows
    const lampPositions = [
      { x: -5, z: -10 },
      { x: 5, z: -10 },
      { x: -5, z: 10 },
      { x: 5, z: 10 },
      { x: -10, z: -5 },
      { x: -10, z: 5 },
      { x: 10, z: -5 },
      { x: 10, z: 5 },

      { x: -5, z: -35 },
      { x: 5, z: -35 },
      { x: -5, z: 35 },
      { x: 5, z: 35 },
      { x: -35, z: -5 },
      { x: 35, z: -5 },
      { x: -35, z: 5 },
      { x: 35, z: 5 },
    ];

    lampPositions.forEach((pos) => {
      this.createStreetLamp(pos.x, 0, pos.z);
    });

    // 7. Layered Pine Trees with procedural snow caps
    this.generatePineForest();

    // 8. Snowmen with carrot noses and top hats!
    this.createSnowman(-8, 8);
    this.createSnowman(12, -8);
    this.createSnowman(-28, 30);

    // 9. Natural Perimeter Alpine Cliff Barriers (so no boxed indoor walls!)
    this.createPerimeterRidge();

    return {
      group: this.worldGroup,
      obstacles: this.obstacles,
      roads,
    };
  }

  /**
   * Cozy Alpine Cabin: Composite 5-part model with warm glowing windows and smoking stone chimney
   */
  private createAlpineCabin(x: number, z: number, rotation: number, index: number) {
    const cabinGroup = new THREE.Group();
    cabinGroup.position.set(x, 0, z);
    cabinGroup.rotation.y = rotation;

    const woodColors = [0x795548, 0x6d4c41, 0x5d4037, 0x4e342e];
    const woodMat = new THREE.MeshStandardMaterial({
      color: woodColors[index % woodColors.length],
      roughness: 0.8,
      metalness: 0.05,
    });
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x57606f,
      roughness: 0.9,
      metalness: 0.1,
    });
    const snowRoofMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.75,
      metalness: 0.05,
    });
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xffd32a,
      emissive: 0xffc048,
      emissiveIntensity: 0.85,
      roughness: 0.2,
    });

    // Stone foundation
    const foundGeo = new THREE.BoxGeometry(6.4, 0.6, 6.4);
    const foundMesh = new THREE.Mesh(foundGeo, stoneMat);
    foundMesh.position.y = 0.3;
    foundMesh.castShadow = true;
    foundMesh.receiveShadow = true;
    cabinGroup.add(foundMesh);

    // Timber log walls
    const wallGeo = new THREE.BoxGeometry(6.0, 3.2, 6.0);
    const wallMesh = new THREE.Mesh(wallGeo, woodMat);
    wallMesh.position.y = 2.2;
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    cabinGroup.add(wallMesh);

    // Steep Pitched Snow Roof (A-frame gable)
    const roofCurve = new THREE.Shape();
    roofCurve.moveTo(-3.4, 0);
    roofCurve.lineTo(0, 2.6);
    roofCurve.lineTo(3.4, 0);
    roofCurve.closePath();

    const roofSettings = { steps: 1, depth: 6.8, bevelEnabled: false };
    const roofGeo = new THREE.ExtrudeGeometry(roofCurve, roofSettings);
    roofGeo.center();
    const roofMesh = new THREE.Mesh(roofGeo, snowRoofMat);
    roofMesh.position.set(0, 4.6, 0);
    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;
    cabinGroup.add(roofMesh);

    // Cozy Glowing Windows (front and side)
    const winGeo = new THREE.PlaneGeometry(0.9, 1.1);
    const win1 = new THREE.Mesh(winGeo, windowMat);
    win1.position.set(-1.4, 2.2, 3.02);
    cabinGroup.add(win1);

    const win2 = new THREE.Mesh(winGeo, windowMat);
    win2.position.set(1.4, 2.2, 3.02);
    cabinGroup.add(win2);

    // Front Timber Door
    const doorGeo = new THREE.PlaneGeometry(1.0, 1.8);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.7 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 1.5, 3.02);
    cabinGroup.add(door);

    // Warm Window Porch Light
    const porchLight = new THREE.PointLight(0xffbe76, 1.2, 6.0);
    porchLight.position.set(0, 2.8, 3.4);
    cabinGroup.add(porchLight);

    // Stone Chimney with Puffy Smoke
    const chimneyGeo = new THREE.BoxGeometry(0.9, 3.5, 0.9);
    const chimney = new THREE.Mesh(chimneyGeo, stoneMat);
    chimney.position.set(1.8, 4.2, -1.2);
    chimney.castShadow = true;
    cabinGroup.add(chimney);

    // Register chimney for animated smoke particles
    this.createChimneySmoke(x + Math.cos(rotation) * 1.8 - Math.sin(rotation) * -1.2, 6.0, z + Math.sin(rotation) * 1.8 + Math.cos(rotation) * -1.2);

    this.worldGroup.add(cabinGroup);

    // Register obstacle
    this.obstacles.push({
      x,
      z,
      radius: 4.2,
      type: 'cabin',
    });
  }

  /**
   * Town Hall / Alpine Clock Tower in town center
   */
  private createTownHall(x: number, z: number) {
    const hallGroup = new THREE.Group();
    hallGroup.position.set(x, 0, z);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x636e72, roughness: 0.85 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xb71540, roughness: 0.7 }); // Festive alpine red trim
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    const clockMat = new THREE.MeshStandardMaterial({
      color: 0xfff200,
      emissive: 0xfff200,
      emissiveIntensity: 0.6,
      roughness: 0.3,
    });

    // Base hall
    const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(10.0, 4.5, 8.0), stoneMat);
    baseMesh.position.y = 2.25;
    baseMesh.castShadow = true;
    hallGroup.add(baseMesh);

    // Roof
    const roofMesh = new THREE.Mesh(new THREE.ConeGeometry(7.0, 3.5, 4), snowMat);
    roofMesh.position.y = 6.2;
    roofMesh.rotation.y = Math.PI / 4;
    roofMesh.castShadow = true;
    hallGroup.add(roofMesh);

    // Clock Tower Spire
    const towerMesh = new THREE.Mesh(new THREE.BoxGeometry(3.2, 6.0, 3.2), woodMat);
    towerMesh.position.set(0, 8.0, 0);
    towerMesh.castShadow = true;
    hallGroup.add(towerMesh);

    // Spire Roof
    const spireRoof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 4.5, 4), snowMat);
    spireRoof.position.set(0, 13.2, 0);
    spireRoof.rotation.y = Math.PI / 4;
    spireRoof.castShadow = true;
    hallGroup.add(spireRoof);

    // Clock Face
    const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.1, 16), clockMat);
    clock.rotation.x = Math.PI / 2;
    clock.position.set(0, 9.2, 1.62);
    hallGroup.add(clock);

    // Warm Town Hall Entrance Chandelier
    const hallLight = new THREE.PointLight(0xfffa65, 2.0, 12.0);
    hallLight.position.set(0, 2.5, 4.5);
    hallGroup.add(hallLight);

    this.worldGroup.add(hallGroup);
    this.obstacles.push({ x, z, radius: 6.2, type: 'cabin' });
  }

  /**
   * Frozen pond with ice sheet and wooden safety railings
   */
  private createFrozenPond(x: number, z: number) {
    const pondGroup = new THREE.Group();
    pondGroup.position.set(x, 0.05, z);

    // Ice surface with subtle specular shine
    const iceGeo = new THREE.CylinderGeometry(8.5, 8.5, 0.1, 24);
    const iceMat = new THREE.MeshStandardMaterial({
      color: 0x74b9ff,
      roughness: 0.15,
      metalness: 0.5,
      emissive: 0x0984e3,
      emissiveIntensity: 0.15,
      transparent: true,
      opacity: 0.9,
    });
    const iceMesh = new THREE.Mesh(iceGeo, iceMat);
    iceMesh.receiveShadow = true;
    pondGroup.add(iceMesh);

    // Snow bank rim around pond
    const rimGeo = new THREE.TorusGeometry(8.5, 0.6, 6, 24);
    rimGeo.rotateX(Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    pondGroup.add(rimMesh);

    // Wooden park bench by the pond
    const benchGroup = new THREE.Group();
    benchGroup.position.set(0, 0, 9.5);
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x4a2810, roughness: 0.8 });
    const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 0.8), benchMat);
    benchSeat.position.y = 0.5;
    benchGroup.add(benchSeat);
    pondGroup.add(benchGroup);

    this.worldGroup.add(pondGroup);
    this.obstacles.push({ x, z, radius: 8.8, type: 'rock' });
  }

  /**
   * Victorian / Alpine Streetlamp with warm lantern glow
   */
  private createStreetLamp(x: number, y: number, z: number) {
    const lampGroup = new THREE.Group();
    lampGroup.position.set(x, y, z);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.4, metalness: 0.8 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xffeaa7,
      emissive: 0xffd32a,
      emissiveIntensity: 1.8,
      roughness: 0.1,
    });

    // Pole
    const poleMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3.8, 8), metalMat);
    poleMesh.position.y = 1.9;
    poleMesh.castShadow = true;
    lampGroup.add(poleMesh);

    // Lantern fixture
    const lanternMesh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.45), glassMat);
    lanternMesh.position.y = 3.8;
    lampGroup.add(lanternMesh);

    // Lantern Cap with snow
    const capMesh = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.35, 4), metalMat);
    capMesh.position.y = 4.2;
    capMesh.rotation.y = Math.PI / 4;
    lampGroup.add(capMesh);

    // Point Light casting warm golden light on the snow
    const lampLight = new THREE.PointLight(0xffbe76, 1.4, 9.0);
    lampLight.position.y = 3.8;
    lampGroup.add(lampLight);

    this.worldGroup.add(lampGroup);
    this.obstacles.push({ x, z, radius: 0.5, type: 'lamp' });
  }

  /**
   * Procedural Pine Tree with 3 layered snow-covered foliage cones
   */
  public createPineTree(x: number, z: number, scale: number = 1.0) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, 0, z);
    treeGroup.scale.set(scale, scale, scale);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.9 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1e3725, roughness: 0.85 }); // deep pine green
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });

    // Trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 2.2, 7), trunkMat);
    trunk.position.y = 1.1;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // 3 Tiers of Pine Foliage with Snow on top
    const tiers = [
      { y: 2.2, radius: 2.4, height: 2.0 },
      { y: 3.4, radius: 1.8, height: 1.8 },
      { y: 4.4, radius: 1.2, height: 1.6 },
    ];

    tiers.forEach((tier) => {
      // Green pine cone
      const cone = new THREE.Mesh(new THREE.ConeGeometry(tier.radius, tier.height, 7), foliageMat);
      cone.position.y = tier.y;
      cone.castShadow = true;
      treeGroup.add(cone);

      // Snow frosting cap
      const snowCap = new THREE.Mesh(new THREE.ConeGeometry(tier.radius * 0.95, tier.height * 0.45, 7), snowMat);
      snowCap.position.y = tier.y + tier.height * 0.28;
      snowCap.castShadow = true;
      treeGroup.add(snowCap);
    });

    this.worldGroup.add(treeGroup);
    this.obstacles.push({ x, z, radius: 1.2 * scale, type: 'tree' });
  }

  /**
   * Forest clustering around the town
   */
  private generatePineForest() {
    const treeClusters = [
      // Park Grove near pond
      { cx: 32, cz: 12, count: 6, spread: 8 },
      { cx: 12, cz: 32, count: 6, spread: 8 },
      // Roadside lines
      { cx: -18, cz: -32, count: 4, spread: 5 },
      { cx: 18, cz: -32, count: 4, spread: 5 },
      { cx: -18, cz: 32, count: 4, spread: 5 },
      { cx: 18, cz: 32, count: 4, spread: 5 },
      // Outskirt groves
      { cx: -52, cz: -20, count: 8, spread: 12 },
      { cx: 52, cz: -20, count: 8, spread: 12 },
      { cx: -52, cz: 20, count: 8, spread: 12 },
      { cx: 52, cz: 20, count: 8, spread: 12 },
    ];

    treeClusters.forEach((cluster) => {
      for (let i = 0; i < cluster.count; i++) {
        const tx = cluster.cx + (Math.random() - 0.5) * cluster.spread * 2;
        const tz = cluster.cz + (Math.random() - 0.5) * cluster.spread * 2;
        const scale = 0.85 + Math.random() * 0.35;
        this.createPineTree(tx, tz, scale);
      }
    });
  }

  /**
   * Cute Snowman with carrot nose, top hat, and charcoal eyes
   */
  private createSnowman(x: number, z: number) {
    const snowmanGroup = new THREE.Group();
    snowmanGroup.position.set(x, 0, z);

    const snowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.6 });
    const carrotMat = new THREE.MeshStandardMaterial({ color: 0xff6348, roughness: 0.5 });
    const scarfMat = new THREE.MeshStandardMaterial({ color: 0xeb2f06, roughness: 0.8 });

    // Bottom snowball
    const bottom = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 12), snowMat);
    bottom.position.y = 0.7;
    bottom.castShadow = true;
    snowmanGroup.add(bottom);

    // Middle snowball
    const mid = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 12), snowMat);
    mid.position.y = 1.7;
    mid.castShadow = true;
    snowmanGroup.add(mid);

    // Red Scarf
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.12, 6, 14), scarfMat);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 2.1;
    snowmanGroup.add(scarf);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 12), snowMat);
    head.position.y = 2.45;
    head.castShadow = true;
    snowmanGroup.add(head);

    // Carrot Nose
    const carrot = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 6), carrotMat);
    carrot.rotation.x = Math.PI / 2;
    carrot.position.set(0, 2.45, 0.45);
    snowmanGroup.add(carrot);

    // Top Hat
    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.05, 12), hatMat);
    hatBrim.position.y = 2.8;
    snowmanGroup.add(hatBrim);

    const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.45, 12), hatMat);
    hatCrown.position.y = 3.05;
    snowmanGroup.add(hatCrown);

    this.worldGroup.add(snowmanGroup);
    this.obstacles.push({ x, z, radius: 0.8, type: 'snowman' });
  }

  /**
   * Natural Alpine Cliff & Rock Perimeter (no ugly rectangular walls!)
   */
  private createPerimeterRidge() {
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x485460, roughness: 0.95 });
    const snowCapMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });

    // Place mountain outcrops and heavy pine barriers at the boundaries (x: ±70, z: ±70)
    const perimeterPoints = [];
    const radius = 68;
    for (let angle = 0; angle < Math.PI * 2; angle += 0.22) {
      perimeterPoints.push({
        x: Math.cos(angle) * (radius + Math.sin(angle * 4) * 6),
        z: Math.sin(angle) * (radius + Math.cos(angle * 3) * 6),
      });
    }

    perimeterPoints.forEach((pt) => {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(4.0 + Math.random() * 2.5, 0),
        rockMat
      );
      rock.position.set(pt.x, 2.5 + Math.random() * 2.0, pt.z);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.worldGroup.add(rock);

      const snowCap = new THREE.Mesh(new THREE.SphereGeometry(3.5, 6, 6), snowCapMat);
      snowCap.position.set(pt.x, rock.position.y + 2.2, pt.z);
      snowCap.scale.set(1.1, 0.4, 1.1);
      this.worldGroup.add(snowCap);

      this.obstacles.push({ x: pt.x, z: pt.z, radius: 4.5, type: 'rock' });
    });
  }

  /**
   * Chimney smoke puff setup
   */
  private createChimneySmoke(x: number, y: number, z: number) {
    const smokeGroup = new THREE.Group();
    smokeGroup.position.set(x, y, z);

    const smokeMat = new THREE.MeshBasicMaterial({
      color: 0xecf0f1,
      transparent: true,
      opacity: 0.4,
    });
    const smokeGeo = new THREE.SphereGeometry(0.3, 6, 6);

    const particles: { mesh: THREE.Mesh; initialY: number; life: number; speed: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const mesh = new THREE.Mesh(smokeGeo, smokeMat);
      mesh.position.set((Math.random() - 0.5) * 0.2, i * 0.6, (Math.random() - 0.5) * 0.2);
      mesh.scale.setScalar(0.7 + i * 0.35);
      smokeGroup.add(mesh);
      particles.push({
        mesh,
        initialY: i * 0.6,
        life: i * 0.25,
        speed: 0.4 + Math.random() * 0.2,
      });
    }

    this.worldGroup.add(smokeGroup);
    this.chimneys.push({
      position: new THREE.Vector3(x, y, z),
      mesh: smokeGroup as unknown as THREE.Mesh,
      particles,
    });
  }

  /**
   * Animate chimney smoke puffs
   */
  public updateSmoke(dt: number) {
    this.chimneys.forEach((ch) => {
      ch.particles.forEach((p) => {
        p.life += dt * p.speed;
        if (p.life > 1.0) {
          p.life = 0;
          p.mesh.position.y = 0;
          p.mesh.position.x = (Math.random() - 0.5) * 0.2;
          p.mesh.position.z = (Math.random() - 0.5) * 0.2;
        }
        p.mesh.position.y = p.life * 2.5;
        p.mesh.position.x += dt * 0.15; // gentle breeze
        const scale = 0.5 + p.life * 1.5;
        p.mesh.scale.setScalar(scale);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - p.life) * 0.4);
      });
    });
  }
}
