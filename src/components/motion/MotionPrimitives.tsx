import {
  type ReactNode,
  useRef,
  useEffect,
  useState,
  type MouseEvent,
} from "react";
import {
  motion,
  useInView,
  useScroll,
  useSpring,
  animate,
} from "framer-motion";

/**
 * Slim golden-to-sky-blue Scroll Progress Bar fixed at the very top of the viewport.
 */
export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed left-0 right-0 top-0 z-50 h-1.5 origin-left bg-gradient-to-r from-gold-500 via-sky-500 to-gold-400"
    />
  );
}

/**
 * Triggers smooth spring entrances via whileInView.
 */
interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  className?: string;
}

export function ScrollReveal({
  children,
  delay = 0,
  direction = "up",
  className = "",
}: ScrollRevealProps) {
  const offset = 24;
  const initialVariants = {
    up: { opacity: 0, y: offset },
    down: { opacity: 0, y: -offset },
    left: { opacity: 0, x: offset },
    right: { opacity: 0, x: -offset },
    none: { opacity: 0, scale: 0.96 },
  };

  return (
    <motion.div
      initial={initialVariants[direction]}
      whileInView={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        type: "spring",
        stiffness: 70,
        damping: 18,
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Orchestrates cascading card and grid reveals.
 */
export function StaggerContainer({
  children,
  staggerChildren = 0.08,
  delayChildren = 0,
  className = "",
}: {
  children: ReactNode;
  staggerChildren?: number;
  delayChildren?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren,
            delayChildren,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20, scale: 0.97 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            type: "spring",
            stiffness: 80,
            damping: 16,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Continuous gentle sinusoidal bobbing/tilting for hero visuals & accents.
 */
export function FloatingElement({
  children,
  duration = 5,
  yOffset = 10,
  rotateOffset = 1.5,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  duration?: number;
  yOffset?: number;
  rotateOffset?: number;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      animate={{
        y: [0, -yOffset, 0],
        rotate: [-rotateOffset, rotateOffset, -rotateOffset],
      }}
      transition={{
        duration,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut",
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Smoothly counts from 0 to target stat numbers when scrolled into view.
 */
export function AnimatedCounter({
  target,
  duration = 1.8,
  suffix = "",
  prefix = "",
}: {
  target: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, target, {
      duration,
      ease: [0.16, 1, 0.3, 1], // easeOutExpo
      onUpdate: (value) => setDisplayValue(Math.floor(value)),
    });
    return () => controls.stop();
  }, [isInView, target, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}

/**
 * Interactive spring hover lift with subtle 3D perspective tilt on pointer move.
 */
export function TiltCard({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const rY = ((mouseX / width) - 0.5) * 12; // tilt angle
    const rX = -((mouseY / height) - 0.5) * 12;

    setRotateX(rX);
    setRotateY(rY);
  }

  function handleMouseLeave() {
    setRotateX(0);
    setRotateY(0);
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      animate={{
        rotateX,
        rotateY,
      }}
      whileHover={{
        y: -6,
        scale: 1.015,
        transition: { type: "spring", stiffness: 260, damping: 20 },
      }}
      whileTap={{ scale: 0.98 }}
      style={{ perspective: 1000, transformStyle: "preserve-3d" }}
      className={`transition-shadow duration-300 ${className}`}
    >
      {children}
    </motion.div>
  );
}
