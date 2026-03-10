import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./pages/Authcontext";
import Navbar from "./components/navbar";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import AddStock from "./pages/AddStock";
import Management from "./pages/Management";
import AuthPage from "./pages/AuthPage";

// Protected route wrapper
function ProtectedRoute({ element }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return element;
}

// Main layout component
function AppLayout() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex h-screen bg-white font-mono">
      {isAuthenticated && <Navbar />}
      <main className="flex-1 overflow-y-auto p-6">
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={<ProtectedRoute element={<Dashboard />} />} />
          <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
          <Route path="/inventory" element={<ProtectedRoute element={<Inventory />} />} />
          <Route path="/add-stock" element={<ProtectedRoute element={<AddStock />} />} />
          <Route path="/management" element={<ProtectedRoute element={<Management />} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
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