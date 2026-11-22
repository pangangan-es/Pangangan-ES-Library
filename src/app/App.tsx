import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { PublicLayout } from "@/components/PublicLayout";
import { StaffLayout } from "@/components/StaffLayout";
import { LoadingBlock } from "@/components/Feedback";
import { RequireRole } from "@/features/auth/RequireRole";
import { ACCESS } from "@/features/auth/access";
import HomePage from "@/pages/HomePage";
import CatalogPage from "@/pages/CatalogPage";
import LoginPage from "@/pages/LoginPage";
import NotFoundPage from "@/pages/NotFoundPage";

// Private areas are code-split so public visitors never download staff code.
const SetPasswordPage = lazy(() => import("@/pages/SetPasswordPage"));
const StaffHomePage = lazy(() => import("@/pages/StaffHomePage"));
const LoansPage = lazy(() => import("@/pages/LoansPage"));
const HistoryPage = lazy(() => import("@/pages/HistoryPage"));
const AdminBooksPage = lazy(() => import("@/pages/AdminBooksPage"));
const AdminCategoriesPage = lazy(() => import("@/pages/AdminCategoriesPage"));
const AdminAcademicStructurePage = lazy(() => import("@/pages/AdminAcademicStructurePage"));
const AdminAnnouncementsPage = lazy(() => import("@/pages/AdminAnnouncementsPage"));
const AdminPeoplePage = lazy(() => import("@/pages/AdminPeoplePage"));
const AccountPage = lazy(() => import("@/pages/AccountPage"));

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Suspense fallback={<LoadingBlock />}>
        <Routes>
          {/* Public. There is deliberately no registration route. */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/set-password" element={<SetPasswordPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Staff. Guards are UX; Row Level Security is the real enforcement. */}
          <Route element={<RequireRole allow={ACCESS.staffHome} />}>
            <Route element={<StaffLayout />}>
              <Route path="/staff" element={<StaffHomePage />} />
              <Route path="/staff/account" element={<AccountPage />} />

              <Route element={<RequireRole allow={ACCESS.circulation} />}>
                <Route path="/staff/loans" element={<LoansPage />} />
                <Route path="/staff/history" element={<HistoryPage />} />
              </Route>

              <Route element={<RequireRole allow={ACCESS.admin} />}>
                <Route path="/admin/books" element={<AdminBooksPage />} />
                <Route path="/admin/categories" element={<AdminCategoriesPage />} />
                <Route path="/admin/academic-structure" element={<AdminAcademicStructurePage />} />
                <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />
                <Route path="/admin/users" element={<AdminPeoplePage />} />
                <Route path="/admin/people" element={<AdminPeoplePage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </MotionConfig>
  );
}
