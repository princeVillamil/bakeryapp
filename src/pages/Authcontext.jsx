import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../api/SupabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user,            setUser]            = useState(null);
  const [isLoading,       setIsLoading]       = useState(true);

  const fetchProfile = async (supabaseUser) => {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role, full_name, avatar_url, status, staff_id, job_title, shift, phone, salary, employment_status")
      .eq("id", supabaseUser.id)
      .single();

    if (error) console.error("fetchProfile error:", error.message);

    return {
      id:               supabaseUser.id,
      email:            supabaseUser.email,
      fullName:         profile?.full_name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split("@")[0] || "User",
      avatarUrl:        profile?.avatar_url || supabaseUser.user_metadata?.avatar_url || null,
      provider:         supabaseUser.app_metadata?.provider || "email",
      // auth role
      role:             profile?.role   || "staff",
      isAdmin:          profile?.role   === "admin",
      // account status
      status:           profile?.status || "pending",
      isActive:         profile?.status === "active",
      isPending:        profile?.status === "pending",
      isRejected:       profile?.status === "rejected",
      // staff details
      staffId:          profile?.staff_id,
      jobTitle:         profile?.job_title,
      shift:            profile?.shift,
      phone:            profile?.phone,
      salary:           profile?.salary,
      employmentStatus: profile?.employment_status,
    };
  };

  useEffect(() => {
    let isMounted = true;

    // Step 1: check for an existing session on mount

    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (session?.user) {
        const formatted = await fetchProfile(session.user);
        if (!isMounted) return;
        setUser(formatted);
        setIsAuthenticated(formatted.isActive); // ← sets auth
      }
      setIsLoading(false); // ← this fires as a separate state update
    };

    initSession();

    // Step 2: listen for future sign-in / sign-out events
    // NOTE: do NOT make this callback async — Supabase does not await it.
    // Instead, call an inner async function and handle errors explicitly.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          // Kick off profile fetch without making the callback itself async
          fetchProfile(session.user).then((formatted) => {
            if (!isMounted) return;
            setUser(formatted);
            setIsAuthenticated(formatted.isActive);
            setIsLoading(false);
          }).catch((err) => {
            console.error("onAuthStateChange fetchProfile error:", err);
            if (!isMounted) return;
            setIsLoading(false);
          });
        } else {
          if (!isMounted) return;
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const register = async ({ email, password, firstName, lastName }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: `${firstName} ${lastName}` } },
    });
    if (error) throw error;
    return data;
  };

  const loginWithOAuth = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, isLoading, login, register, loginWithOAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}