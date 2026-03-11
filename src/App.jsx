import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./pages/Authcontext";
import Navbar      from "./components/Navbar";
import Dashboard   from "./pages/Dashboard";
import Inventory   from "./pages/Inventory";
import AddStock    from "./pages/AddStock";
import Management  from "./pages/Management";
import AuthPage    from "./pages/AuthPage";

function FullPageSpinner() {
  return (
    <div className="flex items-center justify-center h-screen bg-white">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ element, adminOnly = false }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  console.log("ProtectedRoute______________________", user, isAuthenticated,"))))))))0")

  if (isLoading) return <FullPageSpinner />;

  // Now it's safe to check
  if (!isAuthenticated || !user?.isActive) return <Navigate to="/auth" replace />;
  if (adminOnly && !user?.isAdmin) return <Navigate to="/dashboard" replace />;

  return element;
}


function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  console.log("AppLayout___________", isAuthenticated, isLoading, "______________}}}}}}")

  if (isLoading) return <FullPageSpinner />;

  return (
    <div className="flex h-screen bg-white font-mono">
      {isAuthenticated && <Navbar />}
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/auth"       element={<AuthPage />} />
          <Route path="/"           element={<ProtectedRoute element={<Dashboard />} />} />
          <Route path="/dashboard"  element={<ProtectedRoute element={<Dashboard />} />} />
          <Route path="/inventory"  element={<ProtectedRoute element={<Inventory />} />} />
          <Route path="/add-stock"  element={<ProtectedRoute element={<AddStock />} adminOnly />} />
          <Route path="/management" element={<ProtectedRoute element={<Management />} />} />
          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  );
}