import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { can } from "@/features/auth/access";
import { LoadingBlock } from "@/components/Feedback";
import type { Role } from "@/types/domain";

/**
 * Route guard. This improves the experience only; every protected read/write is
 * independently enforced by Row Level Security in the database.
 */
export function RequireRole({ allow }: { allow: readonly Role[] }) {
  const { status, role } = useAuth();
  const location = useLocation();

  if (status === "loading") return <LoadingBlock label="Checking your session" />;
  if (status === "signedOut") return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (!can(role, allow)) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center" role="alert">
        <h1 className="font-display text-2xl text-ink-900">You do not have access to this page</h1>
        <p className="mt-2 text-ink-700">
          Your account role does not include this area. If you think this is a mistake, ask the library administrator.
        </p>
      </div>
    );
  }
  return <Outlet />;
}
