import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";

/** Short fade/slide on route change. Enter-only so it never delays the next task. Disabled for reduced motion. */
export function PageTransition({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const { pathname } = useLocation();
  return (
    <motion.div
      key={pathname}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.14, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
