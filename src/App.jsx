import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import VesselGate from "./pages/VesselGate";
import VesselEntry from "./pages/VesselEntry";
import Crew from "./pages/Crew";
import Compliance from "./pages/Compliance";
import Pending from "./pages/Pending";

// HashRouter is used for static hosts without SPA rewrites (e.g. a hosted demo page).
const Router = import.meta.env.VITE_HASH_ROUTER === "1" ? HashRouter : BrowserRouter;

function RequireAuth({ children, roles }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!profile) {
    return <div className="loading">Your account has no profile yet. Please sign out and in again, or contact your manager.</div>;
  }
  if (profile.status !== "approved") return <Pending />;
  if (roles && !roles.includes(profile.role)) return <Navigate to="/" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/signup" element={<PublicOnly><SignUp /></PublicOnly>} />
          <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/vessels/:id" element={<RequireAuth><VesselGate /></RequireAuth>} />
          <Route path="/crew" element={<RequireAuth roles={["manager", "admin"]}><Crew /></RequireAuth>} />
          <Route path="/compliance" element={<RequireAuth roles={["manager", "admin"]}><Compliance /></RequireAuth>} />
          <Route path="/v/:slug" element={<VesselEntry />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
