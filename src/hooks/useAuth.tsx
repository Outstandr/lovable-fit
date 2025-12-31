import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string, accessCode: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Add timeout to prevent infinite loading on cold start
        const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
          setTimeout(() => {
            console.log('[Auth] Session fetch timeout - proceeding without session');
            resolve({ data: { session: null } });
          }, 10000)
        );

        const sessionPromise = supabase.auth.getSession();

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);

        if (isMounted) {
          console.log('[Auth] Initial session:', session?.user?.id);
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      } catch (error) {
        console.error('[Auth] Error getting session:', error);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        console.log('[Auth] State change:', event, session?.user?.id);

        // Don't log out on SIGNED_OUT event if we still have a valid session
        if (event === 'SIGNED_OUT') {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            console.log('[Auth] Ignoring SIGNED_OUT, session still valid');
            return;
          }
        }

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, displayName: string, accessCode: string): Promise<{ error: string | null }> => {
    try {
      // Validate access code
      const { data: codeData, error: codeError } = await supabase
        .from("access_codes")
        .select("*")
        .eq("code", accessCode.toUpperCase().trim())
        .eq("is_used", false)
        .maybeSingle();

      if (codeError) {
        return { error: "Error validating access code" };
      }

      if (!codeData) {
        return { error: "Invalid or already used access code" };
      }

      // Sign up user
      const redirectUrl = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            display_name: displayName.toUpperCase(),
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          return { error: "This email is already registered. Please sign in instead." };
        }
        return { error: error.message };
      }

      if (data.user) {
        // Mark access code as used
        await supabase
          .from("access_codes")
          .update({
            is_used: true,
            used_by: data.user.id,
            used_at: new Date().toISOString()
          })
          .eq("id", codeData.id);
      }

      return { error: null };
    } catch (err) {
      return { error: "An unexpected error occurred" };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          return { error: "Invalid email or password" };
        }
        return { error: error.message };
      }

      return { error: null };
    } catch (err) {
      return { error: "An unexpected error occurred" };
    }
  };

  const signOut = async () => {
    // Explicitly clear local state immediately to prevent race conditions
    setSession(null);
    setUser(null);
    setLoading(false);

    // Perform Supabase sign out
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
