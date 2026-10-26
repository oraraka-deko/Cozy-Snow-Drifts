import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export const isSoftwareGl = (() => {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
})();

export class ThreeRenderer {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public keyLight!: THREE.DirectionalLight;
  public hemiLight!: THREE.HemisphereLight;
  public rimLight!: THREE.DirectionalLight;
  public fog!: THREE.Fog;

  // Camera tracking & dynamics
  public cameraOffset: THREE.Vector3 = new THREE.Vector3(19, 21, 19);
  public currentLookAt: THREE.Vector3 = new THREE.Vector3(0, 1.0, 0);
  public cameraShake: number = 0;
  public isTitleScreen: boolean = true;
  public titleOrbitAngle: number = 0;

  // Loop pacing
  private frameId: number = 0;
  private isDestroyed: boolean = false;
  private onTickCallback: ((dt: number) => void) | null = null;
  private lastTime: number = performance.now();

  // Scratch vectors for zero GC
  private _targetPos: THREE.Vector3 = new THREE.Vector3();
  private _desiredCamPos: THREE.Vector3 = new THREE.Vector3();

  constructor(container: HTMLDivElement) {
    this.scene = new THREE.Scene();

    // 1. Cozy Winter Atmosphere & Sky
    const skyColor = 0xb4cce8; // Crisp winter sky
    this.scene.background = new THREE.Color(skyColor);
    this.fog = new THREE.Fog(skyColor, 45, 125);
    this.scene.fog = this.fog;

    // 2. Camera: Isometric 3D Perspective
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(36, aspect, 0.5, 300);
    this.camera.position.set(24, 25, 24);
    this.camera.lookAt(0, 1.0, 0);

    // 3. WebGLRenderer with Modern Pipeline
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));

    this.renderer.shadowMap.enabled = !isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 4. Procedural Studio Reflection (RoomEnvironment)
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch {
      // Fallback if context doesn't support pmrem
    }

    // 5. Lighting Rig (Key Light + Cool Sky Fill + Warm Rim)
    this.setupLighting();

    // 6. Resize handling
    window.addEventListener('resize', this.handleResize);

    // 7. Start render loop
    this.startLoop();
  }

  private setupLighting() {
    // Cool sky / warm snow ground bounce
    this.hemiLight = new THREE.HemisphereLight(0xdff9fb, 0xf6e58d, 0.85);
    this.scene.add(this.hemiLight);

    // Warm winter key sun light (Golden hour winter sun)
    this.keyLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
    this.keyLight.position.set(35, 45, 25);
    this.keyLight.castShadow = !isSoftwareGl;

    if (!isSoftwareGl) {
      this.keyLight.shadow.mapSize.width = 2048;
      this.keyLight.shadow.mapSize.height = 2048;
      this.keyLight.shadow.camera.near = 1.0;
      this.keyLight.shadow.camera.far = 130;
      const d = 42;
      this.keyLight.shadow.camera.left = -d;
      this.keyLight.shadow.camera.right = d;
      this.keyLight.shadow.camera.top = d;
      this.keyLight.shadow.camera.bottom = -d;
      this.keyLight.shadow.bias = -0.0005;
      this.keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.keyLight);

    // Soft Blue Rim Light for crisp snow edges
    this.rimLight = new THREE.DirectionalLight(0x70a1ff, 0.9);
    this.rimLight.position.set(-30, 25, -30);
    this.scene.add(this.rimLight);
  }

  public setTimeOfDay(time: 'day' | 'sunset' | 'twilight' | 'aurora') {
    if (time === 'day') {
      const sky = 0xb4cce8;
      this.scene.background = new THREE.Color(sky);
      this.fog.color.setHex(sky);
      this.fog.near = 45;
      this.fog.far = 130;
      this.keyLight.color.setHex(0xfff5e6);
      this.keyLight.intensity = 2.2;
      this.hemiLight.color.setHex(0xdff9fb);
      this.hemiLight.groundColor.setHex(0xf6e58d);
      this.renderer.toneMappingExposure = 1.15;
    } else if (time === 'sunset') {
      const sky = 0xe08f78;
      this.scene.background = new THREE.Color(sky);
      this.fog.color.setHex(sky);
      this.fog.near = 40;
      this.fog.far = 120;
      this.keyLight.color.setHex(0xff793f);
      this.keyLight.intensity = 2.4;
      this.hemiLight.color.setHex(0xfdcb6e);
      this.hemiLight.groundColor.setHex(0x303952);
      this.renderer.toneMappingExposure = 1.25;
    } else if (time === 'twilight') {
      const sky = 0x1f2747;
      this.scene.background = new THREE.Color(sky);
      this.fog.color.setHex(sky);
      this.fog.near = 35;
      this.fog.far = 100;
      this.keyLight.color.setHex(0x575fcf);
      this.keyLight.intensity = 1.0;
      this.hemiLight.color.setHex(0x3c40c6);
      this.hemiLight.groundColor.setHex(0x0f172a);
      this.renderer.toneMappingExposure = 1.35;
    } else if (time === 'aurora') {
      const sky = 0x0c2461;
      this.scene.background = new THREE.Color(sky);
      this.fog.color.setHex(sky);
      this.fog.near = 35;
      this.fog.far = 105;
      this.keyLight.color.setHex(0x05c46b);
      this.keyLight.intensity = 1.2;
      this.hemiLight.color.setHex(0x0be881);
      this.hemiLight.groundColor.setHex(0x1e272e);
      this.renderer.toneMappingExposure = 1.4;
    }
  }

  public triggerCameraShake(intensity: number = 0.4) {
    this.cameraShake = Math.max(this.cameraShake, intensity);
  }

  public updateCamera(targetPosition: THREE.Vector3, vehicleYaw: number, dt: number) {
    if (this.isTitleScreen) {
      // Cinematic slow orbit around town square
      this.titleOrbitAngle += dt * 0.12;
      const radius = 34;
      this.camera.position.set(
        Math.cos(this.titleOrbitAngle) * radius,
        18 + Math.sin(this.titleOrbitAngle * 0.5) * 3,
        Math.sin(this.titleOrbitAngle) * radius
      );
      this.camera.lookAt(0, 2.5, 0);
      return;
    }

    // Smooth exponential damping follow
    this._targetPos.copy(targetPosition);
    this._targetPos.y += 1.0;

    this.currentLookAt.x = THREE.MathUtils.damp(this.currentLookAt.x, this._targetPos.x, 6.0, dt);
    this.currentLookAt.y = THREE.MathUtils.damp(this.currentLookAt.y, this._targetPos.y, 6.0, dt);
    this.currentLookAt.z = THREE.MathUtils.damp(this.currentLookAt.z, this._targetPos.z, 6.0, dt);

    this._desiredCamPos.copy(this.currentLookAt).add(this.cameraOffset);

    // Apply decaying camera shake
    if (this.cameraShake > 0.001) {
      this.cameraShake = THREE.MathUtils.damp(this.cameraShake, 0, 8.0, dt);
      const shakeX = (Math.random() - 0.5) * this.cameraShake * 1.5;
      const shakeY = (Math.random() - 0.5) * this.cameraShake * 1.5;
      const shakeZ = (Math.random() - 0.5) * this.cameraShake * 1.5;
      this._desiredCamPos.x += shakeX;
      this._desiredCamPos.y += shakeY;
      this._desiredCamPos.z += shakeZ;
    }

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this._desiredCamPos.x, 6.0, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this._desiredCamPos.y, 6.0, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, this._desiredCamPos.z, 6.0, dt);

    this.camera.lookAt(this.currentLookAt);

    // Key light follows player to preserve high-res shadow coverage
    this.keyLight.position.set(
      this.currentLookAt.x + 35,
      45,
      this.currentLookAt.z + 25
    );
    this.keyLight.target.position.copy(this.currentLookAt);
    this.keyLight.target.updateMatrixWorld();
  }

  public setTickCallback(cb: (dt: number) => void) {
    this.onTickCallback = cb;
  }

  private startLoop() {
    const afterDraw = (cb: () => void) => {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.isDestroyed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 60);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (this.isDestroyed) return;

      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(rawDt, 0.05); // clamp delta time for stability

      if (this.onTickCallback) {
        this.onTickCallback(dt);
      }

      this.renderer.render(this.scene, this.camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    this.lastTime = performance.now();
    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private handleResize = () => {
    if (!this.renderer.domElement.parentElement) return;
    const parent = this.renderer.domElement.parentElement;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public dispose() {
    this.isDestroyed = true;
    window.removeEventListener('resize', this.handleResize);
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.renderer.dispose();
  }
}
