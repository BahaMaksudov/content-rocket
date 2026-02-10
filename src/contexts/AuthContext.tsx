import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { identifyUser, resetUser, trackSignUp, trackLogin } from "@/lib/posthog";
import { toast } from "@/hooks/use-toast";


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

  // Check if user has a profile, sign out if not (deleted user detection)
  const checkProfileExists = async (userId: string): Promise<boolean> => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    
    return !!profile;
  };

  const handleDeletedUser = async () => {
    console.log("[Auth] User profile not found - signing out deleted user");
    resetUser();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    toast({
      title: "Account not found",
      description: "Your account no longer exists.",
      variant: "destructive",
    });
  };

  useEffect(() => {
    // Track whether we've already identified the user to prevent duplicate calls
    let hasIdentified = false;
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Only identify user once per session to prevent duplicate PostHog calls
        if (session?.user && !hasIdentified) {
          hasIdentified = true;
          // Use setTimeout to avoid calling during render and check profile
          setTimeout(async () => {
            const profileExists = await checkProfileExists(session.user.id);
            if (!profileExists) {
              await handleDeletedUser();
              return;
            }
            identifyUser(session.user.id, session.user.email || "");
          }, 0);
        }
        
        // Reset if user signs out
        if (!session?.user) {
          hasIdentified = false;
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        // Check if profile exists before accepting this session
        const profileExists = await checkProfileExists(session.user.id);
        if (!profileExists) {
          await handleDeletedUser();
          return;
        }
        
        setSession(session);
        setUser(session.user);
        setLoading(false);
        
        // Only identify if not already done by auth state change
        if (!hasIdentified) {
          hasIdentified = true;
          identifyUser(session.user.id, session.user.email || "");
        }
      } else {
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);


  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/auth/callback`;
    console.log(`[Auth] SignUp redirect: ${redirectUrl}`);
    
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
    
    // Detect duplicate signup: when email confirmation is enabled,
    // Supabase returns a user with empty identities array instead of an error
    if (!error && data.user && data.user.identities?.length === 0) {
      console.log("[Auth] Detected duplicate signup - user already exists");
      return { 
        error: new Error("user_already_registered") as Error 
      };
    }
    
    // Track sign up and trigger welcome email if signup was successful
    if (!error && data.user && data.user.identities && data.user.identities.length > 0) {
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
