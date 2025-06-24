import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const Hero3DBackground: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);

  useEffect(() => {
    const width = mountRef.current?.clientWidth || window.innerWidth;
    const height = mountRef.current?.clientHeight || 400;
    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 15);
    cameraRef.current = camera;
    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0); // transparent background
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;
    // Add to DOM
    if (mountRef.current) {
      mountRef.current.appendChild(renderer.domElement);
    }
    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 1.2);
    directional.position.set(5, 10, 7.5);
    scene.add(directional);
    // Load GLB model (from public/assets/ for Vite)
    const loader = new GLTFLoader();
    let loadedModel: THREE.Object3D | null = null;
    loader.load('/assets/wallet.glb', (gltf: any) => {
      loadedModel = gltf.scene;
      // Center and scale the model for hero effect
      gltf.scene.scale.set(4, 4, 4);
      // Log all mesh materials for debug and force visibility
      gltf.scene.traverse((child: any) => {
        if (child.isMesh) {
          console.log('Mesh:', child.name, 'Material:', child.material);
        }
      });
      // Center the model at (0,0,0) using bounding box
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const center = new THREE.Vector3();
      box.getCenter(center);
      gltf.scene.position.sub(center);
      scene.add(gltf.scene);
      modelRef.current = gltf.scene;
      // Set camera to a fixed position
      camera.position.set(0, 0, 20);
      camera.near = 0.1;
      camera.far = 1000;
      camera.updateProjectionMatrix();
      // Log bounding box size and camera position
      const size = new THREE.Vector3();
      box.getSize(size);
      console.log('Bounding box size:', size);
      console.log('Camera position:', camera.position);
    },
    (xhr: ProgressEvent<EventTarget>) => {},
    (error: ErrorEvent) => {
      console.error('GLB model failed to load', error);
    });
    // Animation
    const animate = () => {
      if (modelRef.current) {
        modelRef.current.rotation.y += 0.012;
        modelRef.current.rotation.x += 0.004;
      }
      renderer.render(scene, camera);
      requestRef.current = requestAnimationFrame(animate);
    };
    animate();
    // Handle resize
    const handleResize = () => {
      const w = mountRef.current?.clientWidth || window.innerWidth;
      const h = mountRef.current?.clientHeight || 400;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);
    // Cleanup
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (loadedModel) scene.remove(loadedModel);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 2, // above gradient, below text
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    />
  );
};

export default Hero3DBackground; 