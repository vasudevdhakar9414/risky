import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';

export interface User {
  id?: string;
  username: string;
  email: string;
  role?: string;
  providers?: string[];
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Profile fetcher ──────────────────────────────────────────────────────────
// Tries by id first (standard path).
// Falls back to email lookup to support Google OAuth account linking.
async function fetchProfile(authUserId: string, authEmail?: string) {
  if (!supabase) return null;

  // Primary: match by id
  const { data: byId, error: errById } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUserId)
    .maybeSingle();

  if (errById) console.warn('[Auth] Profile fetch error:', errById.code, errById.message);
  if (byId) return byId;

  // Fallback: match by email (Google OAuth — new UUID, existing profile row)
  if (!authEmail) return null;

  const { data: byEmail, error: errByEmail } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', authEmail)
    .maybeSingle();

  if (errByEmail) console.warn('[Auth] Profile email-fetch error:', errByEmail.code, errByEmail.message);
  if (!byEmail) return null;

  // Link: update profile id to the new auth UUID
  const existingId = (byEmail as any).id;
  if (existingId !== authUserId) {
    const { error: linkErr } = await supabase
      .from('profiles')
      .update({ id: authUserId })
      .eq('email', authEmail);
    if (linkErr) console.warn('[Auth] Account link failed:', linkErr.message);
  }

  return { ...byEmail, id: authUserId };
}

// ─── Auto-create profile for first-time Google OAuth users ───────────────────
async function createOAuthProfile(authUserId: string, email: string, username: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .insert([{ id: authUserId, email, username, role: 'user', currency: '$' }])
    .select('*')
    .single();
  if (error) console.warn('[Auth] Profile creation error:', error.message);
  return data ?? null;
}

// ─── Build User object from auth session + profile row ───────────────────────
function buildUser(authUser: any, profile: any): User {
  return {
    id: authUser.id,
    username:
      profile?.username ||
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      authUser.email?.split('@')[0] ||
      'Trader',
    email: profile?.email || authUser.email || '',
    role: profile?.role,                          // raw DB value — no default
    providers: (authUser.identities ?? []).map((i: any) => i.provider),
  };
}

// ─── AuthProvider ─────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyProfile = async (authUser: any): Promise<User | null> => {
    let profile = await fetchProfile(authUser.id, authUser.email ?? undefined);
    if (!profile && authUser.email) {
      const username =
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        authUser.email.split('@')[0];
      profile = await createOAuthProfile(authUser.id, authUser.email, username);
    }
    return profile ? buildUser(authUser, profile) : null;
  };

  const refreshProfile = async () => {
    if (!supabase || !isSupabaseConfigured) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const profile = await fetchProfile(session.user.id, session.user.email ?? undefined);
    if (!profile) return;

    if (profile.status === 'suspended') {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setUser(null);
      return;
    }

    setIsAuthenticated(true);
    setUser(buildUser(session.user, profile));
  };

  useEffect(() => {
    let subscription: any = null;

    const init = async () => {
      setIsLoading(true);
      if (!isSupabaseConfigured || !supabase) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const sessionUser = await applyProfile(session.user);
          if (sessionUser?.role === undefined && !sessionUser) {
            // suspended or unresolvable
            setIsAuthenticated(false);
            setUser(null);
          } else {
            if (sessionUser && (sessionUser as any)._suspended) {
              await supabase.auth.signOut();
              setIsAuthenticated(false);
              setUser(null);
            } else {
              setIsAuthenticated(true);
              setUser(sessionUser ?? buildUser(session.user, null));
            }
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }

        const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            if (!session?.user) {
              setIsAuthenticated(false);
              setUser(null);
              return;
            }

            const profile = await fetchProfile(session.user.id, session.user.email ?? undefined);

            if (!profile) {
              // Preserve whatever login() already set (race-condition guard)
              setIsAuthenticated(true);
              return;
            }

            if (profile.status === 'suspended') {
              await supabase!.auth.signOut();
              setIsAuthenticated(false);
              setUser(null);
              return;
            }

            // Auto-create profile for first-time Google OAuth users
            let resolvedProfile = profile;
            if (!resolvedProfile && session.user.email) {
              const username =
                session.user.user_metadata?.full_name ||
                session.user.user_metadata?.name ||
                session.user.email.split('@')[0];
              resolvedProfile = await createOAuthProfile(
                session.user.id, session.user.email, username
              );
            }

            if (resolvedProfile) {
              setIsAuthenticated(true);
              setUser(buildUser(session.user, resolvedProfile));
            } else {
              setIsAuthenticated(true);
            }
          }
        );
        subscription = sub;
      } catch (err) {
        console.error('[Auth] Init error:', err);
        setIsAuthenticated(false);
        setUser(null);
      }

      setIsLoading(false);
    };

    init();
    return () => { if (subscription) subscription.unsubscribe(); };
  }, []);

  // ── Email/password login ──────────────────────────────────────────────────
  const login = async (
    usernameOrEmail: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      if (!isSupabaseConfigured || !supabase) {
        setIsLoading(false);
        return { success: false, error: 'Database not configured.' };
      }

      let email = usernameOrEmail;
      if (!usernameOrEmail.includes('@')) {
        const { data: p, error: pErr } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', usernameOrEmail)
          .single();
        if (pErr || !p?.email) {
          setIsLoading(false);
          return { success: false, error: 'Username not found.' };
        }
        email = p.email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setIsLoading(false);
        let msg = error.message;
        if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('invalid credentials'))
          msg = 'Invalid credentials. Access denied.';
        else if (msg.toLowerCase().includes('confirm') || msg.toLowerCase().includes('verified'))
          msg = 'Account not verified. Contact your administrator.';
        return { success: false, error: msg };
      }

      if (data.user) {
        const profile = await fetchProfile(data.user.id, data.user.email ?? undefined);

        if (profile?.status === 'suspended') {
          await supabase.auth.signOut();
          setIsLoading(false);
          return { success: false, error: 'Your account has been suspended.' };
        }

        const sessionUser = buildUser(data.user, profile);
        setIsAuthenticated(true);
        setUser(sessionUser);
        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return { success: false, error: 'Authentication failed.' };
    } catch (e: any) {
      setIsLoading(false);
      return { success: false, error: e.message || 'Sign-in error.' };
    }
  };

  // ── Google OAuth login ────────────────────────────────────────────────────
  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured || !supabase)
      return { success: false, error: 'Database not configured.' };
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Google sign-in failed.' };
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    setIsLoading(true);
    if (isSupabaseConfigured && supabase) {
      try { await supabase.auth.signOut(); }
      catch (err) { console.error('[Auth] Logout error:', err); }
    }
    setIsAuthenticated(false);
    setUser(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, isLoading, login, loginWithGoogle, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
