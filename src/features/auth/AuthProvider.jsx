import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  apiRequest,
  getApiBaseUrl,
  setUnauthorizedHandler,
} from "../../api/client.js";
import { supabase } from "../../api/supabase.js";

const AuthContext = createContext(null);

const loadProfile = (token) =>
  apiRequest("auth/profile", { token }).then((result) => result.data);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [profileReload, setProfileReload] = useState(0);
  const [invitationConfig, setInvitationConfig] = useState(false);
  useEffect(() => {
    let current = true;
    fetch(getApiBaseUrl() + "/auth/config")
      .then((response) => {
        if (!response.ok)
          throw new Error("Optional invitation capability unavailable");
        return response.json();
      })
      .then((result) => {
        if (current)
          setInvitationConfig(Boolean(result.data?.invitations_enabled));
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, []);

  useEffect(() => {
    let current = true;
    setProfile(null);
    setProfileError("");
    if (session?.access_token) {
      loadProfile(session.access_token)
        .then((profile) => {
          if (current) setProfile(profile);
        })
        .catch((error) => {
          if (current) setProfileError(error.message);
        });
    }
    return () => {
      current = false;
    };
  }, [session?.access_token, profileReload]);

  function refreshProfile() {
    setProfileReload((value) => value + 1);
  }
  async function saveCompany(companyName) {
    const result = await apiRequest("auth/profile", {
      method: "PATCH",
      token: session.access_token,
      body: { company_name: companyName.trim() },
    });
    setProfile(result.data);
  }
  async function saveCompanySettings(settings) {
    const result = await apiRequest("company", {
      method: "PATCH",
      token: session.access_token,
      body: settings,
    });
    setProfile((previous) => ({
      ...previous,
      company_name: result.data.name,
      company: result.data,
    }));
  }

  useEffect(() => {
    if (!supabase) {
      setAuthError(
        "Sign-in is not configured. Set the public Supabase URL and anon key in the frontend environment.",
      );
      setLoading(false);
      return undefined;
    }
    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (active) {
          setSession(nextSession);
          setLoading(false);
        }
      },
    );
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setAuthError(error.message);
      setSession(data.session);
      setLoading(false);
    });
    setUnauthorizedHandler(() => {
      supabase.auth.signOut();
      setSession(null);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
      setUnauthorizedHandler(undefined);
    };
  }, []);

  async function joinCompany(companyId) {
    await apiRequest("auth/join-company", {
      method: "POST",
      token: session.access_token,
      body: { company_id: companyId },
    });
    const profile = await loadProfile(session.access_token);
    setProfile(profile);
  }

  async function signIn(email, password) {
    const result = await apiRequest("auth/login", {
      method: "POST",
      body: { email, password },
    });
    if (!result?.data?.session)
      throw new Error("The API did not return a sign-in session.");
    const { error } = await supabase.auth.setSession({
      access_token: result.data.session.access_token,
      refresh_token: result.data.session.refresh_token,
    });
    if (error) throw error;
  }

  async function signUp(email, password, companyName) {
    const result = await apiRequest("auth/signup", {
      method: "POST",
      body: {
        email,
        password,
        ...(!(invitationConfig || profile?.invitations_enabled)
          ? { company_name: companyName }
          : {}),
      },
    });
    if (result?.data?.session) {
      const { error } = await supabase.auth.setSession({
        access_token: result.data.session.access_token,
        refresh_token: result.data.session.refresh_token,
      });
      if (error) throw error;
      return { confirmationRequired: false };
    }
    return { confirmationRequired: true };
  }

  async function signInWithGoogle() {
    const redirectTo = `${window.location.origin}/auth/callback`;
    const result = await apiRequest(
      `auth/google?redirect_to=${encodeURIComponent(redirectTo)}`,
    );
    if (!result?.data?.url)
      throw new Error("The API did not return a Google sign-in URL.");
    window.location.assign(result.data.url);
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
  }

  const value = useMemo(
    () => ({
      session,
      user: session?.user || null,
      loading,
      authError,
      profile,
      profileError,
      invitationsEnabled:
        invitationConfig || Boolean(profile?.invitations_enabled),
      joinCompany,
      refreshProfile,
      saveCompany,
      saveCompanySettings,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
    }),
    [session, loading, authError, profile, profileError, invitationConfig],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
