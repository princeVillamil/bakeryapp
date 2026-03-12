import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../pages/Authcontext";

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

function PendingApproval({ profile, logout }) {
  const isRejected = profile?.status === "Rejected";

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isRejected ? "bg-red-50" : "bg-gray-100"}`}>
          {isRejected ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8 text-red-400">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        <h2 className="text-2xl font-bold text-black mb-2">
          {isRejected ? "Access Denied" : "Pending Approval"}
        </h2>
        <p className="text-sm text-gray-400 mb-2">
          {isRejected
            ? "Your account request has been declined."
            : "Your account is awaiting admin approval."}
        </p>
        <p className="text-sm text-gray-400 mb-6">
          {isRejected
            ? "Please contact your bakery manager for assistance."
            : "A manager will review your request shortly."}
        </p>
        <p className="text-xs font-mono text-gray-300 mb-6">{profile?.email}</p>
        <button
          onClick={logout}
          className="px-5 py-2 text-sm font-semibold bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function ProtectedRoute() {
  const { isAuthenticated, isApproved, isLoading, profile, logout, user } = useAuth();

  // Still loading auth state
  if (isLoading) return <LoadingSpinner />;

  // Not logged in
  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  // Logged in but profile hasn't loaded yet — keep spinning instead of
  // flashing PendingScreen. Profile fetch is fast so this is barely visible.
  if (!profile) return <LoadingSpinner />;

  // Profile loaded but not approved
  if (!isApproved) return <PendingApproval profile={profile} logout={logout} />;

  return <Outlet />;
}