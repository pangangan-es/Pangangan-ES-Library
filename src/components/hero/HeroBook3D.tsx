import { Suspense, useState, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, PresentationControls, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, MousePointerClick, ArrowUpRight } from "lucide-react";
import type { CatalogBook } from "@/types/domain";

// =============================================================================
// 1. PROCEDURAL 3D MINI ELEMENTS (PLANET, PENCIL, ORBITING BOOKS)
// =============================================================================

/**
 * Science & Discovery: A stylized 3D planet with a golden Saturn-like ring.
 */
function MiniPlanet({ position }: { position: [number, number, number] }) {
  const planetRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (planetRef.current) {
      planetRef.current.rotation.y += delta * 0.8;
      planetRef.current.rotation.x = Math.sin(Date.now() * 0.0015) * 0.15;
    }
  });

  return (
    <group ref={planetRef} position={position}>
      {/* Planet sphere - bright sky blue */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.26, 32, 32]} />
        <meshStandardMaterial
          color="#0EA5E9"
          roughness={0.25}
          metalness={0.2}
        />
      </mesh>
      {/* Planetary Ring - golden yellow */}
      <mesh rotation={[Math.PI / 2.6, 0.2, 0]}>
        <torusGeometry args={[0.42, 0.035, 16, 64]} />
        <meshStandardMaterial
          color="#F59E0B"
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>
    </group>
  );
}

/**
 * Elementary School Touch: A cheerful 3D yellow pencil bobbing above the pages.
 */
function MiniPencil({ position }: { position: [number, number, number] }) {
  const pencilRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (pencilRef.current) {
      pencilRef.current.rotation.z += delta * 0.5;
      pencilRef.current.position.y += Math.sin(Date.now() * 0.003) * 0.001;
    }
  });

  return (
    <group ref={pencilRef} position={position} rotation={[0.4, 0.3, -0.6]} scale={0.75}>
      {/* Yellow Hexagonal Body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.65, 6]} />
        <meshStandardMaterial color="#FBBF24" roughness={0.3} />
      </mesh>
      {/* Wooden Cone Tip */}
      <mesh position={[0, 0.42, 0]}>
        <coneGeometry args={[0.07, 0.2, 6]} />
        <meshStandardMaterial color="#FDE68A" roughness={0.5} />
      </mesh>
      {/* Graphite Lead Tip */}
      <mesh position={[0, 0.49, 0]}>
        <coneGeometry args={[0.025, 0.07, 6]} />
        <meshStandardMaterial color="#1E293B" roughness={0.2} />
      </mesh>
      {/* Metal Ferrule Band */}
      <mesh position={[0, -0.36, 0]}>
        <cylinderGeometry args={[0.072, 0.072, 0.08, 16]} />
        <meshStandardMaterial color="#CBD5E1" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Pink Eraser */}
      <mesh position={[0, -0.45, 0]}>
        <cylinderGeometry args={[0.068, 0.068, 0.1, 16]} />
        <meshStandardMaterial color="#FB7185" roughness={0.6} />
      </mesh>
    </group>
  );
}

/**
 * Miniature Orbiting Books revolving around the central storybook.
 */
interface MiniBookProps {
  color: string;
  radius: number;
  speed: number;
  yOffset: number;
  initialAngle: number;
}

function OrbitingMiniBook({ color, radius, speed, yOffset, initialAngle }: MiniBookProps) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime() * speed + initialAngle;
      meshRef.current.position.x = Math.cos(t) * radius;
      meshRef.current.position.z = Math.sin(t) * radius;
      meshRef.current.position.y = yOffset + Math.sin(t * 2) * 0.15;
      meshRef.current.rotation.y = -t + Math.PI / 2;
      meshRef.current.rotation.x = Math.sin(t) * 0.2;
    }
  });

  return (
    <group ref={meshRef}>
      {/* Mini Book Cover */}
      <mesh castShadow scale={[0.22, 0.28, 0.06]}>
        <boxGeometry />
        <meshStandardMaterial color={color} roughness={0.3} />
      </mesh>
      {/* Mini Book Pages */}
      <mesh position={[0.01, 0, 0]} scale={[0.2, 0.26, 0.045]}>
        <boxGeometry />
        <meshStandardMaterial color="#FFFBF2" roughness={0.5} />
      </mesh>
    </group>
  );
}

/**
 * Gem-like floating stars.
 */
function FloatingGemStar({ position, color = "#F59E0B" }: { position: [number, number, number]; color?: string }) {
  const gemRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (gemRef.current) {
      gemRef.current.rotation.x += delta * 1.2;
      gemRef.current.rotation.y += delta * 0.9;
    }
  });

  return (
    <mesh ref={gemRef} position={position} scale={0.12}>
      <octahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={color} roughness={0.1} metalness={0.7} />
    </mesh>
  );
}

// =============================================================================
// 2. CENTERPIECE — LEVITATING OPEN STORYBOOK
// =============================================================================

interface StorybookProps {
  isBursting: boolean;
  onBookClick: () => void;
}

function OpenStorybook({ isBursting, onBookClick }: StorybookProps) {
  const bookGroupRef = useRef<THREE.Group>(null);
  const targetScale = useRef(1);

  useFrame((_, delta) => {
    if (bookGroupRef.current) {
      // Smooth spring scale bounce when clicked
      const desired = isBursting ? 1.15 : 1.0;
      targetScale.current = THREE.MathUtils.damp(targetScale.current, desired, 14, delta);
      bookGroupRef.current.scale.setScalar(targetScale.current);
    }
  });

  // Create subtle curved page stack geometry with smooth boxes
  const pageLayers = useMemo(() => {
    return [0, 1, 2].map((i) => ({
      key: i,
      yOffset: i * 0.018,
      spread: i * 0.03,
    }));
  }, []);

  return (
    <group
      ref={bookGroupRef}
      onClick={(e) => {
        e.stopPropagation();
        onBookClick();
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      {/* ----------------- LEFT COVER & PAGES (ANGLED) ----------------- */}
      <group position={[-0.72, 0, 0]} rotation={[0, 0, 0.16]}>
        {/* Navy Blue Hardcover with Gold Edge */}
        <mesh position={[0, -0.06, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.35, 0.05, 1.7]} />
          <meshStandardMaterial color="#0F1E3D" roughness={0.25} metalness={0.2} />
        </mesh>

        {/* Golden Corner Trims */}
        <mesh position={[-0.62, -0.05, 0.8]}>
          <boxGeometry args={[0.12, 0.055, 0.12]} />
          <meshStandardMaterial color="#F59E0B" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[-0.62, -0.05, -0.8]}>
          <boxGeometry args={[0.12, 0.055, 0.12]} />
          <meshStandardMaterial color="#F59E0B" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Stacked Cream Pages */}
        {pageLayers.map(({ key, yOffset, spread }) => (
          <mesh key={`left-page-${key}`} position={[0.02 - spread * 0.5, yOffset, 0]} receiveShadow>
            <boxGeometry args={[1.28, 0.035, 1.62]} />
            <meshStandardMaterial color="#FFFBF2" roughness={0.6} />
          </mesh>
        ))}

        {/* Decorative Golden Emblem on Top Page */}
        <mesh position={[-0.2, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.5, 0.5]} />
          <meshStandardMaterial
            color="#F59E0B"
            transparent
            opacity={0.3}
            roughness={0.4}
          />
        </mesh>
      </group>

      {/* ----------------- RIGHT COVER & PAGES (ANGLED) ----------------- */}
      <group position={[0.72, 0, 0]} rotation={[0, 0, -0.16]}>
        {/* Navy Blue Hardcover with Gold Edge */}
        <mesh position={[0, -0.06, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.35, 0.05, 1.7]} />
          <meshStandardMaterial color="#0F1E3D" roughness={0.25} metalness={0.2} />
        </mesh>

        {/* Golden Corner Trims */}
        <mesh position={[0.62, -0.05, 0.8]}>
          <boxGeometry args={[0.12, 0.055, 0.12]} />
          <meshStandardMaterial color="#F59E0B" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0.62, -0.05, -0.8]}>
          <boxGeometry args={[0.12, 0.055, 0.12]} />
          <meshStandardMaterial color="#F59E0B" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Stacked Cream Pages */}
        {pageLayers.map(({ key, yOffset, spread }) => (
          <mesh key={`right-page-${key}`} position={[-0.02 + spread * 0.5, yOffset, 0]} receiveShadow>
            <boxGeometry args={[1.28, 0.035, 1.62]} />
            <meshStandardMaterial color="#FFFBF2" roughness={0.6} />
          </mesh>
        ))}

        {/* Decorative Faint Text Lines Simulation */}
        <mesh position={[0.2, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.6, 0.7]} />
          <meshStandardMaterial
            color="#38BDF8"
            transparent
            opacity={0.25}
            roughness={0.4}
          />
        </mesh>
      </group>

      {/* ----------------- BOOK SPINE & RIBBON ----------------- */}
      {/* Central Spine */}
      <mesh position={[0, -0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 1.72, 16]} />
        <meshStandardMaterial color="#0F1E3D" roughness={0.3} metalness={0.2} />
      </mesh>

      {/* Golden Bookmark Ribbon Draped from Spine */}
      <mesh position={[0, 0.02, 0.9]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[0.12, 0.02, 0.45]} />
        <meshStandardMaterial color="#F59E0B" roughness={0.2} metalness={0.5} />
      </mesh>

      {/* ----------------- GOLDEN INNER GLOW ----------------- */}
      <pointLight position={[0, 0.35, 0]} color="#F59E0B" intensity={4} distance={3.2} />
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.4, 1.4]} />
        <meshBasicMaterial color="#FEF3C7" transparent opacity={0.35} />
      </mesh>

      {/* ----------------- RISING POP-UP ELEMENTS ----------------- */}
      <MiniPlanet position={[-0.85, 0.9, 0.2]} />
      <MiniPencil position={[0.8, 0.85, -0.1]} />
      <FloatingGemStar position={[0, 1.25, 0.1]} color="#F59E0B" />
      <FloatingGemStar position={[-0.4, 0.75, -0.4]} color="#0EA5E9" />
      <FloatingGemStar position={[0.55, 0.65, 0.4]} color="#10B981" />
    </group>
  );
}

// =============================================================================
// 3. MAIN 3D CANVAS COMPONENT
// =============================================================================

export function HeroBook3D({ spotlightBook }: { spotlightBook?: CatalogBook | null }) {
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isBursting, setIsBursting] = useState(false);

  function handleTriggerBurst() {
    setHasInteracted(true);
    setIsBursting(true);
    setTimeout(() => {
      setIsBursting(false);
    }, 900);
  }

  return (
    <div className="relative h-[320px] sm:h-[400px] md:h-[460px] lg:h-[520px] w-full flex items-center justify-center select-none">
      {/* 3D React Three Fiber Canvas */}
      <Suspense fallback={<HeroBook3DSkeleton />}>
        <Canvas
          camera={{ position: [0, 1.4, 4.4], fov: 46 }}
          dpr={[1, 2]}
          onPointerDown={() => setHasInteracted(true)}
          className="relative z-10 touch-pan-y"
          style={{ width: "100%", height: "100%" }}
        >
          {/* Ambient & Warm Directional Lighting */}
          <ambientLight intensity={0.9} />
          <directionalLight position={[5, 8, 5]} intensity={1.6} castShadow />
          <directionalLight position={[-4, -2, -2]} intensity={0.5} color="#38BDF8" />
          <pointLight position={[0, -2, 2]} intensity={0.4} color="#FFFBF2" />

          {/* Interactive Presentation Controls (Drag to rotate with bouncy spring snap) */}
          <PresentationControls
            global={false}
            cursor
            snap
            speed={1.6}
            rotation={[0.22, -0.28, 0]}
            polar={[-Math.PI / 5, Math.PI / 5]}
            azimuth={[-Math.PI / 2.2, Math.PI / 2.2]}
            damping={0.2}
          >
            {/* Smooth Floating Physics */}
            <Float
              speed={2.2}
              rotationIntensity={0.35}
              floatIntensity={0.65}
              floatingRange={[-0.1, 0.1]}
            >
              {/* Central Levitating Storybook */}
              <OpenStorybook
                isBursting={isBursting}
                onBookClick={handleTriggerBurst}
              />

              {/* 4 Orbiting Colorful Miniature Books */}
              <OrbitingMiniBook
                color="#F59E0B"
                radius={2.1}
                speed={0.6}
                yOffset={0.2}
                initialAngle={0}
              />
              <OrbitingMiniBook
                color="#0EA5E9"
                radius={2.2}
                speed={0.55}
                yOffset={-0.3}
                initialAngle={Math.PI * 0.5}
              />
              <OrbitingMiniBook
                color="#10B981"
                radius={1.9}
                speed={0.7}
                yOffset={0.45}
                initialAngle={Math.PI}
              />
              <OrbitingMiniBook
                color="#F43F5E"
                radius={2.3}
                speed={0.45}
                yOffset={-0.15}
                initialAngle={Math.PI * 1.5}
              />

              {/* Magical Storybook Sparkles Drifting Upward */}
              <Sparkles
                count={isBursting ? 120 : 45}
                scale={isBursting ? 5.5 : 3.8}
                size={isBursting ? 4.5 : 2.5}
                speed={isBursting ? 2.5 : 0.6}
                color="#F59E0B"
                opacity={0.85}
              />
            </Float>
          </PresentationControls>
        </Canvas>
      </Suspense>

      {/* =========================================================================
          4. LAYERED FRAMER MOTION HUD OVERLAYS (POINTER-EVENTS-NONE ON WRAPPER)
         ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-3 sm:p-5">
        {/* Top Header Strip: Readers Badge (Left) + Interactive Hint Pill (Right) */}
        <div className="flex items-center justify-between gap-2">
          {/* Top-Left Floating Pill */}
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="flex items-center gap-2 rounded-xl border border-paper-300 bg-white/95 backdrop-blur-md px-3 py-1.5 shadow-sm"
          >
            <BookOpen className="h-4 w-4 text-amber-700" />
            <span className="text-xs font-semibold text-navy-950 font-sans">
              Pangangan ES Library
            </span>
          </motion.div>

          {/* Top-Right Interactive Hint Pill (Fades out gently after first interaction) */}
          <AnimatePresence>
            {!hasInteracted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.25 } }}
                className="flex items-center gap-1.5 rounded-full border border-paper-300 bg-white/95 backdrop-blur-md px-3.5 py-1.5 text-xs font-medium text-navy-900 shadow-sm"
              >
                <MousePointerClick className="h-3.5 w-3.5 text-amber-700" />
                <span className="hidden sm:inline">Click or drag to rotate 3D view</span>
                <span className="sm:hidden">Drag to rotate</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Floating Glass Featured Card (Dynamically driven by live database book) */}
        {spotlightBook && (
          <div className="flex justify-end">
            <div className="pointer-events-auto max-w-xs sm:max-w-sm">
              <Link
                to={`/catalog?q=${encodeURIComponent(spotlightBook.title)}`}
                className="group flex items-center gap-3 rounded-2xl border border-paper-300 bg-white/95 backdrop-blur-md p-3 shadow-storybook hover:shadow-storybook-hover hover:border-amber-300 transition-colors duration-200"
              >
                <div className="flex h-10 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900 font-bold border border-amber-200">
                  <BookOpen className="h-4 w-4 text-amber-800" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-[10px] font-semibold text-ink-500 uppercase tracking-wider font-mono">
                      {spotlightBook.category?.split(" ")[0] || "Spotlight"}
                    </p>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium font-sans border ${
                        spotlightBook.available_copies > 0
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-amber-50 border-amber-200 text-amber-800"
                      }`}
                    >
                      {spotlightBook.available_copies > 0 ? "Available" : "On Loan"}
                    </span>
                  </div>
                  <p className="truncate text-xs font-bold text-navy-900 group-hover:text-amber-800 transition-colors">
                    {spotlightBook.title}
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-ink-400 group-hover:text-amber-800 transition-colors shrink-0" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// 4. ANIMATED SKELETON FALLBACK WHILE THREE.JS INITIALIZES
// =============================================================================

function HeroBook3DSkeleton() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center rounded-2xl bg-white/60 border border-paper-300 p-8 text-center backdrop-blur-sm">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 text-stone-700 border border-stone-200">
        <BookOpen className="h-8 w-8 text-amber-700" />
      </div>
      <p className="mt-4 font-display text-sm font-bold text-navy-900">
        Loading 3D Storybook Scene...
      </p>
      <p className="text-xs text-ink-500 mt-1 font-sans">
        Preparing library 3D model
      </p>
    </div>
  );
}
