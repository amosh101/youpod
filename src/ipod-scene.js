const BODY_WIDTH = 6.18;
const BODY_HEIGHT = 10.35;
const BODY_RADIUS = 0.55;
const BEVEL = 0.14;
const BODY_DEPTH = 0.5;
const FRONT_Z = BODY_DEPTH / 2 + BEVEL;
const BEZEL_WIDTH = 5;
const BEZEL_HEIGHT = 4;
const BEZEL_Y = 2.45;
const LCD_WIDTH = 4.5;
const LCD_HEIGHT = 3.375;
const LCD_Y = BEZEL_Y;
const WHEEL_RADIUS = 1.9;
const WHEEL_Y = -2.75;
const CENTER_RADIUS = 0.76;

export function createIpodScene({ THREE, canvas, lcd, stage }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 100);
  const pressTarget = { rx: 0, ry: 0, cz: 0 };
  const pressState = { rx: 0, ry: 0, cz: 0 };
  let wheelPoint = { x: 0, y: 0, radius: 1 };
  let isRotated = false;
  let viewportWidth = 0;
  let animationFrame = 0;
  let resizeTimeout = 0;
  let shadow;
  let body;
  let bezel;
  let wheel;
  let dirty = true;

  function createEnvironment() {
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 512;
    textureCanvas.height = 256;
    const context = textureCanvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.48, '#b9c1ca');
    gradient.addColorStop(0.52, '#444b54');
    gradient.addColorStop(1, '#14171b');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 256);

    const softbox = context.createLinearGradient(0, 50, 0, 210);
    softbox.addColorStop(0, '#ffffff');
    softbox.addColorStop(1, '#cfd5dc');
    context.fillStyle = softbox;
    context.fillRect(290, 50, 190, 160);
    context.fillStyle = '#fff';
    context.fillRect(60, 40, 90, 60);

    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.encoding = THREE.sRGBEncoding;
    return texture;
  }

  function roundedRectangle(width, height, radius) {
    const shape = new THREE.Shape();
    const x = -width / 2;
    const y = -height / 2;
    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.absarc(x + width - radius, y + radius, radius, -Math.PI / 2, 0);
    shape.lineTo(x + width, y + height - radius);
    shape.absarc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2);
    shape.lineTo(x + radius, y + height);
    shape.absarc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI);
    shape.lineTo(x, y + radius);
    shape.absarc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5);
    return shape;
  }

  function createShadow() {
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 460;
    textureCanvas.height = 670;
    const context = textureCanvas.getContext('2d');
    context.shadowColor = 'rgba(0,0,0,.75)';
    context.shadowBlur = 46;
    context.fillStyle = '#000';
    const width = 309;
    const height = 517;
    const x = (460 - width) / 2;
    const y = (670 - height) / 2;
    const radius = 26;
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
    context.fill();

    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.encoding = THREE.sRGBEncoding;
    shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(9.2, 13.4),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })
    );
    shadow.position.set(0, -0.35, -0.5);
    scene.add(shadow);
  }

  function createWheelDecal() {
    const size = 1024;
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = size;
    textureCanvas.height = size;
    const context = textureCanvas.getContext('2d');
    context.fillStyle = '#9a9ca1';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '700 64px "Helvetica Neue",Helvetica,Arial,sans-serif';
    if ('letterSpacing' in context) context.letterSpacing = '6px';
    context.fillText('MENU', size / 2, size * 0.16);

    const triangle = (x, y, radius, direction) => {
      context.beginPath();
      context.moveTo(x + direction * radius, y);
      context.lineTo(x - direction * radius * 0.8, y - radius);
      context.lineTo(x - direction * radius * 0.8, y + radius);
      context.closePath();
      context.fill();
    };

    const side = size * 0.1;
    triangle(side, size / 2, 36, -1);
    triangle(side + 64, size / 2, 36, -1);
    triangle(size - side, size / 2, 36, 1);
    triangle(size - side - 64, size / 2, 36, 1);
    triangle(size / 2 - 40, size * 0.84, 34, 1);
    context.fillRect(size / 2 + 8, size * 0.84 - 31, 15, 62);
    context.fillRect(size / 2 + 34, size * 0.84 - 31, 15, 62);

    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.encoding = THREE.sRGBEncoding;
    texture.anisotropy = 4;
    return texture;
  }

  function createModel() {
    scene.environment = createEnvironment();
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(-3, 6, 9);
    scene.add(keyLight);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x778088, 0.45));

    createShadow();

    const bodyGeometry = new THREE.ExtrudeGeometry(
      roundedRectangle(BODY_WIDTH - 2 * BEVEL, BODY_HEIGHT - 2 * BEVEL, BODY_RADIUS - BEVEL),
      { depth: BODY_DEPTH, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 8, curveSegments: 40 }
    );
    bodyGeometry.translate(0, 0, -BODY_DEPTH / 2);
    body = new THREE.Mesh(bodyGeometry, new THREE.MeshStandardMaterial({
      color: 0xf2f2ef, roughness: 0.28, metalness: 0, envMapIntensity: 0.9
    }));
    scene.add(body);

    const bezelGeometry = new THREE.ExtrudeGeometry(roundedRectangle(BEZEL_WIDTH, BEZEL_HEIGHT, 0.24), {
      depth: 0.04, bevelEnabled: false, curveSegments: 24
    });
    bezel = new THREE.Mesh(bezelGeometry, new THREE.MeshStandardMaterial({
      color: 0x060607, roughness: 0.14, metalness: 0, envMapIntensity: 0.7
    }));
    bezel.position.set(0, BEZEL_Y, FRONT_Z);
    scene.add(bezel);

    wheel = new THREE.Group();
    wheel.position.set(0, WHEEL_Y, FRONT_Z);
    scene.add(wheel);
    const wheelBase = new THREE.Mesh(
      new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.05, 128).rotateX(Math.PI / 2).translate(0, 0, 0.025),
      new THREE.MeshStandardMaterial({ color: 0xe9e9e6, roughness: 0.5, metalness: 0, envMapIntensity: 0.6 })
    );
    wheel.add(wheelBase);
    const groove = new THREE.Mesh(
      new THREE.RingGeometry(WHEEL_RADIUS + 0.005, WHEEL_RADIUS + 0.05, 128),
      new THREE.MeshBasicMaterial({ color: 0xb9bbbe })
    );
    groove.position.z = 0.003;
    wheel.add(groove);

    const decal = new THREE.Mesh(
      new THREE.CircleGeometry(WHEEL_RADIUS, 96),
      new THREE.MeshBasicMaterial({ map: createWheelDecal(), transparent: true })
    );
    decal.position.z = 0.052;
    wheel.add(decal);

    const centerGroup = new THREE.Group();
    centerGroup.position.z = 0.05;
    wheel.add(centerGroup);
    const centerButton = new THREE.Mesh(
      new THREE.CylinderGeometry(CENTER_RADIUS, CENTER_RADIUS, 0.05, 96).rotateX(Math.PI / 2).translate(0, 0, 0.025),
      new THREE.MeshStandardMaterial({ color: 0xdededa, roughness: 0.35, metalness: 0, envMapIntensity: 0.8 })
    );
    centerGroup.add(centerButton);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(CENTER_RADIUS, CENTER_RADIUS + 0.045, 96),
      new THREE.MeshBasicMaterial({ color: 0xaeb0b3 })
    );
    ring.position.z = 0.053;
    wheel.add(ring);
    return centerGroup;
  }

  const centerGroup = createModel();

  function project(x, y, z, width, height) {
    const point = new THREE.Vector3(x, y, z).project(camera);
    return { x: (point.x * 0.5 + 0.5) * width, y: (-point.y * 0.5 + 0.5) * height };
  }

  function layout() {
    const viewport = window.visualViewport;
    const screenWidth = Math.round(viewport ? viewport.width : window.innerWidth);
    const screenHeight = Math.round(viewport ? viewport.height : window.innerHeight);
    isRotated = screenWidth > screenHeight;
    viewportWidth = screenWidth;
    const width = isRotated ? screenHeight : screenWidth;
    const height = isRotated ? screenWidth : screenHeight;

    stage.style.width = `${width}px`;
    stage.style.height = `${height}px`;
    stage.style.left = `${isRotated ? (screenWidth - width) / 2 : 0}px`;
    stage.style.top = `${isRotated ? (screenHeight - height) / 2 : 0}px`;
    stage.style.transform = isRotated ? 'rotate(90deg)' : 'none';
    renderer.setSize(width, height, false);
    camera.aspect = width / height;

    const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const stretchY = Math.max(1, (BODY_WIDTH / BODY_HEIGHT) / camera.aspect);
    body.scale.y = stretchY;
    bezel.position.y = BEZEL_Y * stretchY;
    wheel.position.y = WHEEL_Y * stretchY;
    shadow.scale.y = stretchY;
    shadow.position.y = -0.35 * stretchY;

    const distance = Math.max(
      BODY_HEIGHT * stretchY / (2 * tangent),
      BODY_WIDTH / (2 * tangent * camera.aspect)
    ) + FRONT_Z;
    camera.position.set(0, 0, distance);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    const screenTop = project(-LCD_WIDTH / 2, LCD_Y * stretchY + LCD_HEIGHT / 2, FRONT_Z + 0.04, width, height);
    const screenBottom = project(LCD_WIDTH / 2, LCD_Y * stretchY - LCD_HEIGHT / 2, FRONT_Z + 0.04, width, height);
    const lcdScale = (screenBottom.x - screenTop.x) / 320;
    lcd.style.transform = `translate(${screenTop.x}px, ${screenTop.y}px) scale(${lcdScale})`;

    const wheelCenter = project(0, WHEEL_Y * stretchY, FRONT_Z + 0.05, width, height);
    const wheelEdge = project(WHEEL_RADIUS, WHEEL_Y * stretchY, FRONT_Z + 0.05, width, height);
    wheelPoint = { x: wheelCenter.x, y: wheelCenter.y, radius: wheelEdge.x - wheelCenter.x };
    dirty = true;
  }

  function animate() {
    let moving = false;
    for (const key of Object.keys(pressTarget)) {
      const difference = pressTarget[key] - pressState[key];
      if (Math.abs(difference) > 0.0004) {
        pressState[key] += difference * 0.35;
        moving = true;
      } else {
        pressState[key] = pressTarget[key];
      }
    }
    wheel.rotation.x = pressState.rx;
    wheel.rotation.y = pressState.ry;
    centerGroup.position.z = 0.05 + pressState.cz;
    if (moving || dirty) {
      renderer.render(scene, camera);
      dirty = false;
    }
    animationFrame = requestAnimationFrame(animate);
  }

  const handleResize = () => layout();
  const handleOrientationChange = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(layout, 200);
  };
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleOrientationChange);
  window.visualViewport?.addEventListener('resize', handleResize);
  layout();
  animate();

  return {
    canvas,
    getWheelMetrics: () => ({ ...wheelPoint }),
    mapPointer(event) {
      return isRotated
        ? { x: event.clientY, y: viewportWidth - event.clientX }
        : { x: event.clientX, y: event.clientY };
    },
    press(dx, dy, center) {
      if (center) {
        pressTarget.cz = -0.03;
        pressTarget.rx = 0;
        pressTarget.ry = 0;
      } else {
        pressTarget.cz = 0;
        pressTarget.rx = dy / wheelPoint.radius * 0.05;
        pressTarget.ry = dx / wheelPoint.radius * 0.05;
      }
    },
    release() {
      pressTarget.cz = 0;
      pressTarget.rx = 0;
      pressTarget.ry = 0;
    },
    destroy() {
      cancelAnimationFrame(animationFrame);
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.visualViewport?.removeEventListener('resize', handleResize);
      renderer.dispose();
    }
  };
}
