import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "./Authcontext";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: "", password: "", confirmPassword: "", firstName: "", lastName: "" });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [serverError, setServerError] = useState(null);

  const { login, register, loginWithOAuth, isAuthenticated, user, isLoading: authLoading } = useAuth();

  // Wait for auth to resolve before rendering anything
  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  console.log(user, user.status )
  // Already logged in and active — redirect immediately at render time, no useEffect needed
  if (isAuthenticated && user?.isActive) return <Navigate to="/dashboard" replace />;

  // Account state screens
  if (user?.isPending)          return <PendingScreen email={user.email} />;
  if (user?.isRejected)         return <RejectedScreen email={user.email} />;
  if (successMsg === "pending") return <PendingScreen email={formData.email} />;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: "" }));
    setServerError(null);
  };

  const validate = () => {
    const e = {};
    if (!isLogin) {
      if (!formData.firstName.trim()) e.firstName = "First name is required";
      if (!formData.lastName.trim())  e.lastName  = "Last name is required";
    }
    if (!formData.email) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = "Enter a valid email";
    if (!formData.password) e.password = "Password is required";
    else if (formData.password.length < 6) e.password = "Minimum 6 characters";
    if (!isLogin) {
      if (!formData.confirmPassword) e.confirmPassword = "Please confirm your password";
      else if (formData.password !== formData.confirmPassword) e.confirmPassword = "Passwords do not match";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    setServerError(null);
    try {
      if (isLogin) {
        await login({ email: formData.email, password: formData.password });
        // Once login resolves, Supabase fires onAuthStateChange → AuthContext updates
        // → this component re-renders → hits the Navigate above automatically
      } else {
        await register({ email: formData.email, password: formData.password, firstName: formData.firstName, lastName: formData.lastName });
        setSuccessMsg("pending");
      }
    } catch (err) {
      setServerError(err.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    setServerError(null);
    try { await loginWithOAuth(provider); }
    catch (err) { setServerError(err.message); }
  };

  const toggle = () => {
    setIsLogin((v) => !v);
    setFormData({ email: "", password: "", confirmPassword: "", firstName: "", lastName: "" });
    setErrors({});
    setServerError(null);
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-sm">

          {/* Logo */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
                <rect x="2" y="2" width="20" height="20" strokeWidth="2" />
                <path d="M2 2L22 22M22 2L2 22" strokeWidth="2" strokeLinecap="square" />
              </svg>
              <span className="text-xs font-bold uppercase tracking-widest text-black">¡Vamos Coffee</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
              {isLogin ? "Sign In" : "Request Access"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isLogin ? "Access your bakery dashboard" : "Submit your account for admin approval"}
            </p>
          </div>

          {serverError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{serverError}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Juan" error={errors.firstName} />
                <Field label="Last Name"  name="lastName"  value={formData.lastName}  onChange={handleChange} placeholder="Dela Cruz" error={errors.lastName} />
              </div>
            )}
            <Field label="Email"    name="email"    type="email"    value={formData.email}    onChange={handleChange} placeholder="you@bakery.com" error={errors.email} />
            <Field label="Password" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="••••••••" error={errors.password} />
            {!isLogin && (
              <Field label="Confirm Password" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" error={errors.confirmPassword} />
            )}

            <button type="submit" disabled={isLoading}
              className="w-full py-2.5 px-4 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
              {isLoading
                ? <><Spinner /><span>{isLogin ? "Signing in..." : "Submitting..."}</span></>
                : <span>{isLogin ? "Sign In" : "Request Access"}</span>}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-xs"><span className="px-2 bg-white text-gray-400">or continue with</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <OAuthButton label="Google" onClick={() => handleOAuth("google")} icon={<GoogleIcon />} />
            <OAuthButton label="GitHub" onClick={() => handleOAuth("github")} icon={<GitHubIcon />} />
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button type="button" onClick={toggle} className="ml-1 font-semibold text-black hover:underline">
              {isLogin ? "Request access" : "Sign in"}
            </button>
          </p>

        </div>
      </div>

      {/* Right — decorative */}
      <div className="hidden lg:flex w-1/2 bg-black items-center justify-center p-12">
        <div className="text-center text-white max-w-xs">
          <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" className="w-12 h-12">
              <rect x="2" y="2" width="20" height="20" strokeWidth="1.5" />
              <path d="M2 2L22 22M22 2L2 22" strokeWidth="1.5" strokeLinecap="square" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">¡Vamos Coffee</h2>
          <p className="text-sm text-white/60 leading-relaxed">Bakery inventory & staff management. Fast, clean, and built for your team.</p>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Field({ label, name, type = "text", value, onChange, placeholder, error }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
        className={`w-full px-4 py-2.5 rounded-lg border text-sm text-black transition-all focus:outline-none focus:ring-2 focus:ring-black ${error ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"}`} />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function OAuthButton({ label, onClick, icon }) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all">
      {icon} {label}
    </button>
  );
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />;
}

function PendingScreen({ email }) {
  const { logout } = useAuth();
  const navigate   = useNavigate();
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#b45309" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-black mb-2">Awaiting Approval</h2>
        <p className="text-sm text-gray-500 mb-1">Your account request has been submitted.</p>
        <p className="text-sm text-gray-400 mb-6">An admin will review <span className="font-medium text-gray-600">{email}</span> shortly.</p>
        <button onClick={async () => { await logout(); navigate("/auth"); }}
          className="px-5 py-2 text-sm font-medium border border-gray-200 rounded-lg text-gray-500 hover:border-gray-400 transition-colors">
          Back to Sign In
        </button>
      </div>
    </div>
  );
}

function RejectedScreen({ email }) {
  const { logout } = useAuth();
  const navigate   = useNavigate();
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#dc2626" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-black mb-2">Access Denied</h2>
        <p className="text-sm text-gray-500 mb-1">Your account request was not approved.</p>
        <p className="text-sm text-gray-400 mb-6">Contact your manager for <span className="font-medium text-gray-600">{email}</span>.</p>
        <button onClick={async () => { await logout(); navigate("/auth"); }}
          className="px-5 py-2 text-sm font-medium border border-gray-200 rounded-lg text-gray-500 hover:border-gray-400 transition-colors">
          Back to Sign In
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  );
}