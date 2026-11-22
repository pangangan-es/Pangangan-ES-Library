import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { SchoolBrand } from "@/components/SchoolBrand";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/Button";
import { useAuth } from "@/features/auth/AuthProvider";
import { ACCESS, can } from "@/features/auth/access";
import { ROLE_LABELS } from "@/types/domain";
import { ForcePasswordChangeDialog } from "@/features/auth/ForcePasswordChangeDialog";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  show: boolean;
}

export function StaffLayout() {
  const { profile, role, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  const circulation = can(role, ACCESS.circulation);
  const admin = can(role, ACCESS.admin);

  const items: NavItem[] = [
    { to: "/staff", label: "Workspace", end: true, show: true },
    { to: "/staff/loans", label: "Loans and returns", show: circulation },
    { to: "/staff/history", label: "Circulation history", show: circulation },
    { to: "/admin/books", label: "Books", show: admin },
    { to: "/admin/categories", label: "Categories", show: admin },
    { to: "/admin/academic-structure", label: "Grades and sections", show: admin },
    { to: "/admin/announcements", label: "Bulletin & Settings", show: admin },
    { to: "/admin/users", label: "User accounts", show: admin },
    { to: "/staff/account", label: "My account", show: true },
    { to: "/catalog", label: "Public catalog", show: true },
  ];

  const nav = (
    <nav aria-label="Staff">
      <ul className="space-y-1">
        {items
          .filter((i) => i.show)
          .map((i) => (
            <li key={i.to}>
              <NavLink
                to={i.to}
                end={i.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex min-h-[44px] items-center rounded-md px-3 text-sm font-semibold ${
                    isActive ? "bg-white/15 text-white" : "text-ink-100 hover:bg-white/10"
                  }`
                }
              >
                {i.label}
              </NavLink>
            </li>
          ))}
      </ul>
    </nav>
  );

  const account = (
    <div className="border-t border-white/15 pt-4 text-sm text-ink-100">
      <p className="font-semibold text-white">{profile?.full_name}</p>
      <p className="text-xs text-ink-300">{role ? ROLE_LABELS[role] : ""}</p>
      <div className="mt-3 flex flex-col gap-1.5">
        <Link
          to="/staff/account"
          onClick={() => setOpen(false)}
          className="flex min-h-[36px] items-center justify-center rounded-md bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/15"
        >
          My account
        </Link>
        <Button variant="secondary" className="!min-h-[36px] w-full text-xs" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen md:flex">
      <ForcePasswordChangeDialog />
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside className="no-print hidden w-64 shrink-0 flex-col justify-between bg-ink-800 p-4 md:flex">
        <div className="space-y-6">
          <Link to="/staff" className="block rounded-md" aria-label="Staff workspace home">
            <SchoolBrand inverse compact />
          </Link>
          {nav}
        </div>
        {account}
      </aside>

      {/* Mobile header */}
      <header className="no-print bg-ink-800 md:hidden">
        <div className="flex items-center justify-between px-4 py-2">
          <SchoolBrand inverse compact />
          <Button
            variant="secondary"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Close menu" : "Menu"}
          </Button>
        </div>
        {open ? (
          <motion.div
            id="mobile-nav"
            initial={reduce ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.12 }}
            className="space-y-4 px-4 pb-4"
          >
            {nav}
            {account}
          </motion.div>
        ) : null}
      </header>

      <main id="main" className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </main>
    </div>
  );
}
