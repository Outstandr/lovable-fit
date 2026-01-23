import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { signInWithGoogle as googleAuthSignIn, signOutFromGoogle } from "@/services/googleAuthService";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
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

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<{ error: string | null }> => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          return { error: "This email is already registered. Please sign in instead." };
        }
        return { error: error.message };
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

  const signInWithGoogle = async (): Promise<{ error: string | null }> => {
    // Use the new platform-aware Google Auth service
    // This uses native sign-in on iOS/Android, web OAuth on browsers
    return await googleAuthSignIn();
  };

  const signOut = async () => {
    // Explicitly clear local state immediately to prevent race conditions
    setSession(null);
    setUser(null);
    setLoading(false);

    // Sign out from Google (native platforms only)
    await signOutFromGoogle();

    // Perform Supabase sign out
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut }}>
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
