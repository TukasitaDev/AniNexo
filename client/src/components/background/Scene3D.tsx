'use client';

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

function ParticleSwarm({ isHovering }: { isHovering: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const [targetRotation, setTargetRotation] = useState({ x: 0, y: 0 });
  
  // Generar posiciones aleatorias para las partículas
  const count = 3000;
  const positions = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Distribución esférica
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.5 + Math.random() * 2; // Radio entre 2.5 y 4.5
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    return positions;
  }, [count]);

  // Manejar el movimiento del mouse
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      // Normalizar coordenadas del mouse entre -1 y 1
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      setTargetRotation({
        x: y * 0.2, // Rango de rotación sutil
        y: x * 0.2
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    
    // Rotación base constante
    pointsRef.current.rotation.y += delta * 0.05;
    pointsRef.current.rotation.x += delta * 0.02;

    // Interacción suave con el mouse
    pointsRef.current.rotation.x += (targetRotation.x - pointsRef.current.rotation.x) * 0.05;
    pointsRef.current.rotation.y += (targetRotation.y - pointsRef.current.rotation.y) * 0.05;

    // Efecto de aceleración si isHovering
    if (isHovering) {
      pointsRef.current.rotation.y += delta * 0.1;
    }
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#00E5FF" // Cian AniNexo
          size={0.015}
          sizeAttenuation={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.6}
        />
      </Points>
    </group>
  );
}

export default function Scene3D() {
  const [isVisible, setIsVisible] = useState(true);
  const [dpr, setDpr] = useState(1);

  // Optimización: Pausar renderizado si la pestaña no es visible
  // y ajustar DPR según el dispositivo
  useEffect(() => {
    const handleVisibility = () => {
      setIsVisible(!document.hidden);
    };

    setDpr(Math.min(window.devicePixelRatio, 1.5)); // Limitar DPR para mejor rendimiento

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  if (!isVisible) return null;

  return (
    <div 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        zIndex: -1, 
        pointerEvents: 'none',
        background: 'radial-gradient(circle at center, #0a0b10 0%, #030508 100%)' // Fallback y base
      }}
    >
      <Canvas 
        camera={{ position: [0, 0, 3], fov: 60 }} 
        dpr={dpr}
        gl={{ 
          antialias: false,
          powerPreference: "high-performance",
          alpha: true 
        }}
      >
        <fog attach="fog" args={['#030508', 2, 5]} />
        <ParticleSwarm isHovering={false} />
      </Canvas>
    </div>
  );
}
