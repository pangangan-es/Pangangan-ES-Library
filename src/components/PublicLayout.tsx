import { useState, useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Library, ShieldCheck, Download } from "lucide-react";
import { SchoolBrand, SCHOOL_ADDRESS, SCHOOL_NAME } from "@/components/SchoolBrand";
import { ScrollProgressBar } from "@/components/motion/MotionPrimitives";
import { useAuth } from "@/features/auth/AuthProvider";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PublicLayout() {
  const { status } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone display mode
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const installedHandler = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  async function handleInstallApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choiceResult = await installPrompt.userChoice;
    if (choiceResult.outcome === "accepted") {
      setIsInstalled(true);
    }
    setInstallPrompt(null);
  }

  const navItems = [
    { to: "/", label: "Home", icon: Home, end: true },
    { to: "/catalog", label: "Catalog", icon: Library },
    {
      to: status === "signedIn" ? "/staff" : "/login",
      label: status === "signedIn" ? "Staff workspace" : "Staff sign in",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-paper-100 text-ink-900 selection:bg-gold-200 selection:text-navy-900 font-sans">
      <ScrollProgressBar />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-gold-500 focus:px-4 focus:py-2.5 focus:font-bold focus:text-navy-900 focus:shadow-xl focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Desktop & Tablet Sticky Glass Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-navy-900/95 border-b border-white/10 shadow-sm transition-all duration-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            to="/"
            className="group flex items-center gap-3 rounded-2xl p-1 transition-transform hover:scale-[1.01]"
            aria-label={`${SCHOOL_NAME} library home`}
          >
            <SchoolBrand inverse compact />
          </Link>

          {/* Desktop Navigation with Animated Active Pill & Optional Install App Button */}
          <div className="flex items-center gap-3">
            {installPrompt && !isInstalled && (
              <button
                type="button"
                onClick={handleInstallApp}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-gold-500/20 hover:bg-gold-500/30 border border-gold-400/50 px-3.5 py-1.5 text-xs font-bold text-gold-300 hover:text-white transition-all shadow-sm active:scale-95"
                title="Install Pangangan ES Library Hub"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Install App</span>
              </button>
            )}

            <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-1.5 p-1 rounded-full bg-navy-800/80 border border-white/10">
              {navItems.map((item) => {
                const active = item.end
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to);

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={`relative flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-200 ${
                      active ? "text-navy-900 font-bold" : "text-ink-100 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="desktopActivePill"
                        className="absolute inset-0 rounded-full bg-gold-500"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <item.icon className={`h-4 w-4 ${active ? "text-navy-900" : "text-gold-400"}`} />
                      {item.label}
                    </span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Floating Install Button */}
      {installPrompt && !isInstalled && (
        <div className="md:hidden fixed top-20 right-4 z-40">
          <button
            type="button"
            onClick={handleInstallApp}
            className="inline-flex items-center gap-1.5 rounded-full bg-navy-900/95 backdrop-blur-md border border-gold-400/60 px-3 py-1.5 text-xs font-bold text-gold-300 shadow-xl active:scale-95"
          >
            <Download className="h-3.5 w-3.5 text-gold-400" />
            <span>Install App</span>
          </button>
        </div>
      )}

      {/* Main Content Area with Page Transitions */}
      <main id="main" className={`flex-1 ${isHome ? "w-full pb-24 md:pb-12" : "mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 pb-24 md:pb-12"}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Floating Glass Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-4 left-4 right-4 z-50 md:hidden rounded-3xl bg-navy-900/90 backdrop-blur-xl border border-white/15 p-1.5 shadow-2xl ring-1 ring-black/20"
      >
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const active = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={`relative flex flex-col items-center justify-center flex-1 py-2 rounded-2xl text-xs font-semibold transition-colors duration-200 ${
                  active ? "text-navy-900 font-bold" : "text-ink-200 hover:text-white"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="mobileActivePill"
                    className="absolute inset-0 rounded-2xl bg-gradient-to-r from-gold-400 to-gold-500 shadow-md shadow-gold-500/30"
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  />
                )}
                <span className="relative z-10 flex flex-col items-center gap-1">
                  <item.icon className={`h-5 w-5 ${active ? "text-navy-900" : "text-gold-400"}`} />
                  <span className="truncate max-w-[85px]">{item.label}</span>
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <footer className="no-print mt-auto border-t border-paper-300 bg-white/70 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div className="flex items-center gap-3">
              <img
                src="/pangangan_es_library_hub_logo.svg"
                alt="Pangangan ES Library Hub logo"
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-contain bg-white shadow-sm ring-1 ring-ink-900/10 p-0.5"
              />
              <div>
                <p className="font-display font-bold text-navy-900 text-base">
                  {SCHOOL_NAME} Library Hub
                </p>
                <p className="text-xs text-ink-600">
                  {SCHOOL_ADDRESS} · Republic of the Philippines
                </p>
              </div>
            </div>

            <p className="text-xs text-ink-500 max-w-md">
              A reading and literacy sanctuary dedicated to empowering learners, teachers, and the Pangangan school community.
            </p>

            <div className="flex items-center gap-4 text-xs font-medium text-ink-600">
              <Link to="/catalog" className="hover:text-gold-600 hover:underline">
                Explore Catalog
              </Link>
              <span>•</span>
              <Link to={status === "signedIn" ? "/staff" : "/login"} className="hover:text-gold-600 hover:underline">
                Staff Portal
              </Link>
              {installPrompt && !isInstalled && (
                <>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={handleInstallApp}
                    className="hover:text-gold-600 hover:underline inline-flex items-center gap-1 text-gold-700 font-bold"
                  >
                    <Download className="h-3 w-3" />
                    <span>Install App</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
