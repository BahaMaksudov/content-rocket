import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { identifyUser, resetUser, trackSignUp, trackLogin } from "@/lib/posthog";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Identify user for analytics when they sign in
        if (session?.user) {
          setTimeout(() => {
            identifyUser(session.user.id, session.user.email || "");
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Identify existing session user
      if (session?.user) {
        identifyUser(session.user.id, session.user.email || "");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/auth/callback`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    
    // Track sign up and trigger welcome email if signup was successful
    if (!error && data.user) {
      // Track sign up event
      trackSignUp(data.user.id, email);
      
      try {
        await supabase.functions.invoke("send-welcome-emails", {
          body: {
            action: "send_immediate",
            user_id: data.user.id,
            user_email: email,
            user_name: fullName || email.split("@")[0],
          },
        });
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Don't block signup if email fails
      }
    }
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // Track login event
    if (!error && data.user) {
      trackLogin(data.user.id, email);
    }
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    resetUser(); // Reset PostHog user on logout
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
