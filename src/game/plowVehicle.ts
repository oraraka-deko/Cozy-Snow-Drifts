import * as THREE from 'three';
import { VehicleUpgrades } from '../types/game';

export class PlowVehicle {
  public group: THREE.Group;
  public chassis: THREE.Mesh;
  public bladeGroup: THREE.Group;
  public bladeMesh: THREE.Mesh;
  public bladeGlowMesh: THREE.Mesh;
  public wheels: THREE.Mesh[] = [];
  public frontWheelPivots: THREE.Group[] = [];
  public beaconMesh: THREE.Mesh;
  public beaconLight: THREE.PointLight;
  public headlights: THREE.SpotLight[] = [];
  public exhaustPoints: THREE.Vector3[] = [];
  
  // Dynamic dimensions based on upgrades
  public currentBladeWidth: number = 2.4;
  private currentBladeAngle: number = 0;
  private beaconTime: number = 0;
  private wheelRotation: number = 0;

  constructor(upgrades: VehicleUpgrades) {
    this.group = new THREE.Group();

    // 1. Primary Silhouette: Rugged Pickup / Unimog Snow-Truck Chassis
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0xee5a24, // High-visibility bright safety orange
      roughness: 0.35,
      metalness: 0.45,
    });
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x2c3e50,
      roughness: 0.6,
      metalness: 0.7,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe0e6ed,
      roughness: 0.15,
      metalness: 0.9,
    });
    const rubberMat = new THREE.MeshStandardMaterial({
      color: 0x1e272e,
      roughness: 0.85,
      metalness: 0.1,
    });
    const cabinGlassMat = new THREE.MeshStandardMaterial({
      color: 0xffeaa7,
      roughness: 0.2,
      metalness: 0.1,
      emissive: 0xffd32a,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.88,
    });

    // Lower Frame / Subchassis
    const frameGeo = new THREE.BoxGeometry(1.4, 0.4, 2.8);
    const frameMesh = new THREE.Mesh(frameGeo, darkMetalMat);
    frameMesh.position.y = 0.55;
    frameMesh.castShadow = true;
    frameMesh.receiveShadow = true;
    this.group.add(frameMesh);

    // Main Cab Body
    const cabGeo = new THREE.BoxGeometry(1.36, 0.75, 1.3);
    const cabMesh = new THREE.Mesh(cabGeo, chassisMat);
    cabMesh.position.set(0, 1.1, -0.1);
    cabMesh.castShadow = true;
    this.group.add(cabMesh);

    // Front Hood Engine Bay
    const hoodGeo = new THREE.BoxGeometry(1.3, 0.5, 0.9);
    const hoodMesh = new THREE.Mesh(hoodGeo, chassisMat);
    hoodMesh.position.set(0, 0.85, 0.95);
    hoodMesh.castShadow = true;
    this.group.add(hoodMesh);

    // Radiator Grille
    const grilleGeo = new THREE.BoxGeometry(1.0, 0.35, 0.08);
    const grilleMesh = new THREE.Mesh(grilleGeo, darkMetalMat);
    grilleMesh.position.set(0, 0.85, 1.41);
    this.group.add(grilleMesh);

    // Cab Windows (Front windshield, side windows, rear)
    const windshieldGeo = new THREE.BoxGeometry(1.22, 0.45, 0.08);
    const windshield = new THREE.Mesh(windshieldGeo, cabinGlassMat);
    windshield.position.set(0, 1.25, 0.55);
    windshield.rotation.x = -0.15;
    this.group.add(windshield);

    const sideWindowGeo = new THREE.BoxGeometry(1.38, 0.35, 0.8);
    const sideWindows = new THREE.Mesh(sideWindowGeo, cabinGlassMat);
    sideWindows.position.set(0, 1.25, -0.1);
    this.group.add(sideWindows);

    // Warm Interior Cabin Glow
    const cabinLight = new THREE.PointLight(0xfffae6, 0.8, 3.5);
    cabinLight.position.set(0, 1.2, -0.1);
    this.group.add(cabinLight);

    // Driver Silhouette (Cute cozy low-poly bobble head)
    const driverGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const driverMat = new THREE.MeshStandardMaterial({ color: 0x34495e, roughness: 0.8 });
    const driverMesh = new THREE.Mesh(driverGeo, driverMat);
    driverMesh.position.set(0.25, 1.15, -0.1);
    this.group.add(driverMesh);

    // Cozy Beanie hat on driver
    const beanieGeo = new THREE.ConeGeometry(0.19, 0.22, 8);
    const beanieMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.9 });
    const beanie = new THREE.Mesh(beanieGeo, beanieMat);
    beanie.position.set(0.25, 1.3, -0.1);
    beanie.rotation.z = -0.1;
    this.group.add(beanie);

    // 2. Secondary Read: Amber Rooftop Beacon Light
    const beaconBaseGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.08, 12);
    const beaconBase = new THREE.Mesh(beaconBaseGeo, darkMetalMat);
    beaconBase.position.set(0, 1.5, -0.2);
    this.group.add(beaconBase);

    const beaconGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.16, 12);
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xff9f1a,
      emissive: 0xff9f1a,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });
    this.beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    this.beaconMesh.position.set(0, 1.6, -0.2);
    this.group.add(this.beaconMesh);

    this.beaconLight = new THREE.PointLight(0xff9f1a, 1.2, 5.0);
    this.beaconLight.position.set(0, 1.7, -0.2);
    this.group.add(this.beaconLight);

    // Dual Exhaust Stacks behind cab
    const exhaustGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8);
    [-0.55, 0.55].forEach((xPos) => {
      const exhaustMesh = new THREE.Mesh(exhaustGeo, chromeMat);
      exhaustMesh.position.set(xPos, 1.35, -0.8);
      this.group.add(exhaustMesh);
      // Top bend
      const capGeo = new THREE.BoxGeometry(0.08, 0.03, 0.12);
      const cap = new THREE.Mesh(capGeo, darkMetalMat);
      cap.position.set(xPos, 1.82, -0.83);
      cap.rotation.x = -0.3;
      this.group.add(cap);
      this.exhaustPoints.push(new THREE.Vector3(xPos, 1.85, -0.8));
    });

    // Rear Salt Grit Hopper Bed
    const hopperBedGeo = new THREE.BoxGeometry(1.36, 0.55, 1.0);
    const hopperBed = new THREE.Mesh(hopperBedGeo, darkMetalMat);
    hopperBed.position.set(0, 0.85, -1.0);
    hopperBed.castShadow = true;
    this.group.add(hopperBed);

    // Salt Spreader Funnel & Spinner Disc
    const spreaderGeo = new THREE.ConeGeometry(0.3, 0.4, 8);
    const spreader = new THREE.Mesh(spreaderGeo, darkMetalMat);
    spreader.position.set(0, 0.45, -1.55);
    spreader.rotation.x = Math.PI;
    this.group.add(spreader);

    const spinnerDiscGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.04, 8);
    const spinnerDisc = new THREE.Mesh(spinnerDiscGeo, chromeMat);
    spinnerDisc.position.set(0, 0.22, -1.55);
    this.group.add(spinnerDisc);

    // 3. Wheels & Heavy Tread Studded Tires (4 Wheels)
    const tireGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.34, 14);
    tireGeo.rotateZ(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.36, 10);
    rimGeo.rotateZ(Math.PI / 2);

    const wheelPositions = [
      { x: -0.82, y: 0.38, z: 0.85, isFront: true },
      { x: 0.82, y: 0.38, z: 0.85, isFront: true },
      { x: -0.82, y: 0.38, z: -0.85, isFront: false },
      { x: 0.82, y: 0.38, z: -0.85, isFront: false },
    ];

    wheelPositions.forEach((pos) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(pos.x, pos.y, pos.z);

      const tire = new THREE.Mesh(tireGeo, rubberMat);
      tire.castShadow = true;
      const rim = new THREE.Mesh(rimGeo, chromeMat);

      const wheelMeshGroup = new THREE.Group();
      wheelMeshGroup.add(tire);
      wheelMeshGroup.add(rim);

      if (pos.isFront) {
        wheelGroup.add(wheelMeshGroup);
        this.frontWheelPivots.push(wheelGroup);
        this.wheels.push(wheelMeshGroup as unknown as THREE.Mesh);
      } else {
        wheelGroup.add(wheelMeshGroup);
        this.wheels.push(wheelMeshGroup as unknown as THREE.Mesh);
      }
      this.group.add(wheelGroup);
    });

    // 4. Front Articulated Heavy Snow Plow Blade
    this.bladeGroup = new THREE.Group();
    this.bladeGroup.position.set(0, 0.35, 1.55);

    // Hydraulic Push Arms
    const armGeo = new THREE.BoxGeometry(0.12, 0.12, 0.6);
    [-0.45, 0.45].forEach((armX) => {
      const arm = new THREE.Mesh(armGeo, darkMetalMat);
      arm.position.set(armX, 0.1, -0.28);
      arm.rotation.x = 0.2;
      this.bladeGroup.add(arm);
    });

    // Compute blade width based on upgrade
    this.currentBladeWidth = 2.4 + (upgrades.plowWidthLevel - 1) * 0.55;

    // Curved Curved Plow Blade Geometry
    const bladeCurve = new THREE.Shape();
    bladeCurve.moveTo(-0.15, 0);
    bladeCurve.quadraticCurveTo(0.0, 0.4, -0.15, 0.75);
    bladeCurve.lineTo(-0.25, 0.75);
    bladeCurve.quadraticCurveTo(-0.1, 0.4, -0.25, 0);
    bladeCurve.closePath();

    const extrudeSettings = {
      steps: 1,
      depth: this.currentBladeWidth,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 2,
    };
    const bladeGeo = new THREE.ExtrudeGeometry(bladeCurve, extrudeSettings);
    bladeGeo.rotateY(Math.PI / 2);
    bladeGeo.center();

    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xf1c40f, // Heavy duty bright plow yellow
      roughness: 0.35,
      metalness: 0.65,
    });
    this.bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
    this.bladeMesh.position.set(0, 0.2, 0.15);
    this.bladeMesh.castShadow = true;
    this.bladeGroup.add(this.bladeMesh);

    // Heated Blade Coils (Glow element when heated blade unlocked)
    const coilGeo = new THREE.BoxGeometry(this.currentBladeWidth * 0.9, 0.08, 0.08);
    const coilMat = new THREE.MeshStandardMaterial({
      color: 0xff3838,
      emissive: 0xff5252,
      emissiveIntensity: upgrades.heatedBladeLevel > 0 ? 1.5 : 0.0,
      roughness: 0.3,
    });
    this.bladeGlowMesh = new THREE.Mesh(coilGeo, coilMat);
    this.bladeGlowMesh.position.set(0, 0.1, 0.25);
    this.bladeGroup.add(this.bladeGlowMesh);

    // Rubber Edge Squeegee / Wear Bar
    const wearBarGeo = new THREE.BoxGeometry(this.currentBladeWidth + 0.1, 0.1, 0.15);
    const wearBar = new THREE.Mesh(wearBarGeo, rubberMat);
    wearBar.position.set(0, -0.15, 0.15);
    this.bladeGroup.add(wearBar);

    // Blade Corner Marker Flags (Cute snow guides)
    const markerGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.6, 6);
    const flagGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const orangeFlagMat = new THREE.MeshStandardMaterial({ color: 0xff4757, roughness: 0.5 });

    [-this.currentBladeWidth / 2, this.currentBladeWidth / 2].forEach((xPos) => {
      const pole = new THREE.Mesh(markerGeo, darkMetalMat);
      pole.position.set(xPos, 0.45, 0.15);
      this.bladeGroup.add(pole);

      const flag = new THREE.Mesh(flagGeo, orangeFlagMat);
      flag.position.set(xPos, 0.75, 0.15);
      this.bladeGroup.add(flag);
    });

    this.group.add(this.bladeGroup);

    // 5. Powerful Headlight Cones (cast light on snow ahead)
    [-0.52, 0.52].forEach((hX) => {
      const headlightHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12), chromeMat);
      headlightHousing.rotation.x = Math.PI / 2;
      headlightHousing.position.set(hX, 0.85, 1.42);
      this.group.add(headlightHousing);

      const spot = new THREE.SpotLight(0xfffae6, 2.5, 22, Math.PI / 5, 0.45, 1.2);
      spot.position.set(hX, 0.85, 1.45);
      spot.target.position.set(hX * 0.3, 0.1, 10);
      this.group.add(spot);
      this.group.add(spot.target);
      this.headlights.push(spot);
    });

    // Shadow contact fake plate for grounding
    const contactShadowGeo = new THREE.PlaneGeometry(2.4, 3.8);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      color: 0x0a101d,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.02;
    this.group.add(contactShadow);

    this.chassis = cabMesh;
  }

  /**
   * Rebuild or scale plow blade when upgrade changes
   */
  public updateBladeUpgrade(upgrades: VehicleUpgrades) {
    this.currentBladeWidth = 2.4 + (upgrades.plowWidthLevel - 1) * 0.55;
    const scaleFactor = this.currentBladeWidth / 2.4;
    this.bladeMesh.scale.set(scaleFactor, 1, 1);
    this.bladeGlowMesh.scale.set(scaleFactor, 1, 1);

    if (upgrades.heatedBladeLevel > 0) {
      (this.bladeGlowMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.4 + upgrades.heatedBladeLevel * 0.4;
    } else {
      (this.bladeGlowMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.0;
    }
  }

  /**
   * Animate vehicle wheels, blade articulation, beacon rotation, suspension
   */
  public update(dt: number, speed: number, steerAngle: number, isPlowing: boolean) {
    // 1. Wheel spin & steering
    this.wheelRotation += (speed * dt * 3.5);
    this.wheels.forEach((w) => {
      w.rotation.x = this.wheelRotation;
    });

    // Front wheel steer angle with smooth return
    this.frontWheelPivots.forEach((pivot) => {
      pivot.rotation.y = steerAngle * 0.75;
    });

    // 2. Articulated Blade dynamic tilt
    // When turning or plowing, the blade tilts slightly into the push angle
    const targetBladeAngle = -steerAngle * 0.45;
    this.currentBladeAngle = THREE.MathUtils.damp(this.currentBladeAngle, targetBladeAngle, 8.0, dt);
    this.bladeGroup.rotation.y = this.currentBladeAngle;

    // Subtle blade lift/bounce when pushing heavy snow
    const bladeBounce = isPlowing ? Math.sin(Date.now() * 0.02) * 0.02 : 0;
    this.bladeGroup.position.y = 0.35 + bladeBounce;

    // 3. Flashing Amber Beacon Light (rotating beacon effect)
    this.beaconTime += dt * 8.0;
    const pulse = 0.6 + 0.4 * Math.sin(this.beaconTime);
    this.beaconLight.intensity = 1.0 + pulse * 2.0;
    (this.beaconMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0 + pulse * 2.0;

    // 4. Subtle suspension bounce
    const suspensionPitch = Math.min(0.04, Math.abs(speed) * 0.005);
    this.group.position.y = 0;
  }
}
