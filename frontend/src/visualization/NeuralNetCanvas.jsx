import { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

const BLUE = new THREE.Color('hsl(210,90%,65%)');
const RED  = new THREE.Color('hsl(0,80%,60%)');
const GOLD = new THREE.Color('hsl(50,100%,72%)');

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function weightToColor(w) {
  const clamped = Math.max(-1, Math.min(1, w));
  if (clamped >= 0) {
    return BLUE.clone().multiplyScalar(0.3 + clamped * 0.7);
  } else {
    return RED.clone().multiplyScalar(0.3 + Math.abs(clamped) * 0.7);
  }
}

export default function NeuralNetCanvas({ weights, activations, config }) {
  const mountRef = useRef(null);
  const stateRef = useRef({
    nodes: [],      // [{mesh, layerIdx, nodeIdx}]
    edges: [],      // [{line, w1, w2, material}]
    scene: null,
    camera: null,
    renderer: null,
    animId: null,
    targetActivations: [],
    currentActivations: [],
    targetWeights: [],     // [edgeIdx] = value
    currentWeights: [],    // [edgeIdx] = value
  });

  // Parse network shape from config
  const shape = useMemo(() => {
    if (!config) return [3, 4, 3];
    const neurons = config.neurons ?? [4, 4];
    return neurons;
  }, [config]);

  // ─── Scene setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth;
    const H = el.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    // Camera
    const camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, 0.1, 2000);
    camera.position.z = 500;

    // Scene
    const scene = new THREE.Scene();

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const ptLight = new THREE.PointLight(0x4499ff, 1.5, 2000);
    ptLight.position.set(0, 200, 300);
    scene.add(ptLight);

    stateRef.current.scene = scene;
    stateRef.current.camera = camera;
    stateRef.current.renderer = renderer;

    // Build network
    buildNetwork(stateRef.current, shape, W, H);

    // Render loop
    const animate = () => {
      const s = stateRef.current;
      s.animId = requestAnimationFrame(animate);

      // Lerp activations
      if (s.targetActivations.length > 0) {
        s.targetActivations.forEach((layer, li) => {
          if (!s.currentActivations[li]) s.currentActivations[li] = new Array(layer.length).fill(0);
          layer.forEach((target, ni) => {
            s.currentActivations[li][ni] = lerp(s.currentActivations[li][ni] ?? 0, target, 0.15);
          });
        });
      }

      // Applying activations to node glow
      s.nodes.forEach(({ mesh, layerIdx, nodeIdx }) => {
        const act = s.currentActivations?.[layerIdx]?.[nodeIdx] ?? 0;
        const intensity = Math.min(1, act * 2.5);
        const glowColor = GOLD.clone().multiplyScalar(intensity);
        mesh.material.emissive = glowColor;
        mesh.material.emissiveIntensity = intensity * 1.8;
        mesh.scale.setScalar(1 + intensity * 0.2);
      });

      // Lerp weights
      if (s.targetWeights.length > 0) {
        if (s.currentWeights.length !== s.targetWeights.length) {
          s.currentWeights = [...s.targetWeights];
        }
        s.edges.forEach((edge, i) => {
          const target = s.targetWeights[i] ?? 0;
          s.currentWeights[i] = lerp(s.currentWeights[i] ?? 0, target, 0.1);
          const w = s.currentWeights[i];
          const color = weightToColor(w);
          edge.material.color.copy(color);
          edge.material.opacity = 0.2 + Math.min(Math.abs(w), 1) * 0.7;
        });
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      const W2 = el.clientWidth;
      const H2 = el.clientHeight;
      camera.left   = -W2 / 2;
      camera.right  =  W2 / 2;
      camera.top    =  H2 / 2;
      camera.bottom = -H2 / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(el);

    return () => {
      cancelAnimationFrame(stateRef.current.animId);
      ro.disconnect();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [shape]);

  // ─── Rebuild when shape/config changes ────────────────────────────────────
  useEffect(() => {
    const s = stateRef.current;
    if (!s.scene) return;
    clearNetwork(s);
    const el = mountRef.current;
    buildNetwork(s, shape, el.clientWidth, el.clientHeight);
  }, [shape]);

  // ─── Update weights ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!weights?.length) return;
    const s = stateRef.current;

    const newTargets = s.edges.map((edge) => {
      // The backend model might use prefix like 'net.0.weight' or 'layers.0.weight'
      const searchPattern = `.${edge.layerIdx * 2}.weight`;
      const layerWeight = weights.find(w => w.name.endsWith(searchPattern) || w.name.includes(searchPattern));
      
      if (!layerWeight) return 0;
      
      const values = layerWeight.values; // [out][in]
      if (values[edge.toIdx] && values[edge.toIdx][edge.fromIdx] !== undefined) {
        return values[edge.toIdx][edge.fromIdx];
      }
      return 0;
    });

    s.targetWeights = newTargets;
  }, [weights]);

  // ─── Update activations ────────────────────────────────────────────────────
  useEffect(() => {
    if (!activations?.length) return;
    const s = stateRef.current;

    const layerCount = shape.length;
    const newTargets = Array.from({ length: layerCount }, (_, li) => {
      const layerAct = activations.find((a) => a.layer === li);
      if (!layerAct) return Array(shape[li]).fill(0);
      const vals = layerAct.values;
      return Array.from({ length: shape[li] }, (_, ni) => vals[ni % vals.length] ?? 0);
    });
    s.targetActivations = newTargets;
  }, [activations, shape]);

  return (
    <div
      ref={mountRef}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}
    />
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildNetwork(s, shape, W, H) {
  const layerCount = shape.length;
  const xSpacing = Math.min(W * 0.8 / Math.max(layerCount - 1, 1), 180);
  const xStart   = -((layerCount - 1) * xSpacing) / 2;
  const MAX_SHOW = 8; // max visible nodes per layer
  const NODE_R   = 10;

  const positions = [];  // [layer][node] = {x, y}

  shape.forEach((n, li) => {
    const count = Math.min(n, MAX_SHOW);
    const ySpacing = Math.min(H * 0.7 / Math.max(count - 1, 1), 60);
    const yStart   = -((count - 1) * ySpacing) / 2;
    const xPos     = xStart + li * xSpacing;
    positions[li]  = [];

    for (let ni = 0; ni < count; ni++) {
      const yPos = yStart + ni * ySpacing;
      positions[li][ni] = { x: xPos, y: yPos };

      // Sphere geometry
      const geo = new THREE.SphereGeometry(NODE_R, 24, 24);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.15, 0.15, 0.15),
        emissive: new THREE.Color(0, 0, 0),
        emissiveIntensity: 0,
        metalness: 0.3,
        roughness: 0.65,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(xPos, yPos, 0);
      s.scene.add(mesh);
      s.nodes.push({ mesh, layerIdx: li, nodeIdx: ni });
    }

    // Layer label
    addLabel(s.scene, `L${li + 1}\n(${n})`, xPos, -(H * 0.38));
  });

  s.currentActivations = shape.map((n) => Array(Math.min(n, MAX_SHOW)).fill(0));
  s.targetActivations  = shape.map((n) => Array(Math.min(n, MAX_SHOW)).fill(0));

  // Edges
  for (let li = 0; li < layerCount - 1; li++) {
    const fromNodes = positions[li];
    const toNodes   = positions[li + 1];

    fromNodes.forEach(({ x: x1, y: y1 }, ni1) => {
      toNodes.forEach(({ x: x2, y: y2 }, ni2) => {
        const points = [
          new THREE.Vector3(x1, y1, -1),
          new THREE.Vector3(x2, y2, -1),
        ];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({
          color: new THREE.Color(0.35, 0.35, 0.35),
          transparent: true,
          opacity: 0.25,
        });
        const line = new THREE.Line(geo, mat);
        s.scene.add(line);
        s.edges.push({ material: mat, fromIdx: ni1, toIdx: ni2, layerIdx: li });
      });
    });
  }
}

function clearNetwork(s) {
  s.nodes.forEach(({ mesh }) => {
    s.scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  });
  s.edges.forEach(({ material }) => material.dispose());
  // remove all lines
  const toRemove = [];
  s.scene.traverse((obj) => {
    if (obj instanceof THREE.Line || obj instanceof THREE.Sprite) toRemove.push(obj);
  });
  toRemove.forEach((obj) => s.scene.remove(obj));
  s.nodes = [];
  s.edges = [];
}

function addLabel(scene, text, x, y) {
  const canvas = document.createElement('canvas');
  canvas.width  = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'transparent';
  ctx.clearRect(0, 0, 128, 64);
  ctx.fillStyle = 'hsl(0,0%,40%)';
  ctx.font = '500 11px Inter, sans-serif';
  ctx.textAlign = 'center';
  const lines = text.split('\n');
  lines.forEach((line, i) => ctx.fillText(line, 64, 20 + i * 16));

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.8 });
  const sprite = new THREE.Sprite(mat);
  sprite.position.set(x, y, 0);
  sprite.scale.set(80, 40, 1);
  scene.add(sprite);
}
