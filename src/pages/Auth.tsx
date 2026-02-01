import { useState, useMemo } from "react";
import { useNavigate, Navigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, Rocket, ArrowLeft, RefreshCw, AlertCircle, UserPlus, Info } from "lucide-react";
import { z } from "zod";
import { VerificationPending } from "@/components/auth/VerificationPending";
import { getEmailRedirectTo } from "@/lib/auth-redirect";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const authSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// Error type for better UX
type AuthError = {
  type: "error" | "warning" | "info";
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [showVerificationPending, setShowVerificationPending] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get redirect and upgrade params for post-auth navigation
  const redirectPath = searchParams.get("redirect") || "/dashboard";
  const upgradeTier = searchParams.get("upgrade");

  // Client-side validation
  const isEmailValid = useMemo(() => {
    return emailSchema.safeParse(email).success;
  }, [email]);

  const isPasswordValid = useMemo(() => {
    return password.length >= 6;
  }, [password]);

  const isFormValid = isEmailValid && isPasswordValid;

  // Clear error when switching tabs or changing inputs
  const handleTabChange = (value: string) => {
    setActiveTab(value as "login" | "signup");
    setAuthError(null);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (authError) setAuthError(null);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (authError) setAuthError(null);
  };

  // Switch to signup with pre-filled email
  const switchToSignup = () => {
    setActiveTab("signup");
    setAuthError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    const targetPath = upgradeTier ? `${redirectPath}?upgrade=${upgradeTier}` : redirectPath;
    return <Navigate to={targetPath} replace />;
  }

  const handleResendVerification = async () => {
    if (!email) return;
    
    setIsResendingVerification(true);
    try {
      const redirectUrl = getEmailRedirectTo("/auth/callback");
      
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        toast.error("Failed to resend email", {
          description: error.message,
        });
      } else {
        toast.success("Verification email sent!", {
          description: "Please check your inbox and spam folder.",
        });
        setAuthError(null);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsResendingVerification(false);
    }
  };

  const handleAuth = async (action: "login" | "signup") => {
    // Clear any previous error
    setAuthError(null);

    const validation = authSchema.safeParse({ email, password });
    
    if (!validation.success) {
      setAuthError({
        type: "error",
        title: "Validation Error",
        message: validation.error.errors[0].message,
      });
      return;
    }

    setIsLoading(true);

    try {
      if (action === "signup") {
        console.log("[Auth] Attempting signup for:", email);
        const result = await signUp(email, password);

        if (result.error) {
          let errorMessage = result.error.message;
          console.error("[Auth] Signup error:", errorMessage);
          
          // Map errors to friendly messages
          if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
            setAuthError({
              type: "warning",
              title: "Too Many Attempts",
              message: "Please wait a few minutes before trying again.",
            });
          } else if (errorMessage.includes("User already registered")) {
            setAuthError({
              type: "info",
              title: "Account Already Exists",
              message: "This email is already registered. Try signing in, or check your inbox for a verification email.",
              action: {
                label: "Switch to Sign In",
                onClick: () => {
                  setActiveTab("login");
                  setAuthError(null);
                },
              },
            });
          } else {
            setAuthError({
              type: "error",
              title: "Sign Up Failed",
              message: errorMessage,
            });
          }
        } else {
          console.log("[Auth] Signup successful, showing verification pending screen");
          setPendingEmail(email);
          setShowVerificationPending(true);
        }
      } else {
        // Login flow
        const result = await signIn(email, password);

        if (result.error) {
          let errorMessage = result.error.message;
          console.error("[Auth] Sign in error:", errorMessage);
          
          // Map errors to friendly messages with actions
          if (errorMessage.includes("Email not confirmed") || 
              errorMessage.includes("email not confirmed") ||
              errorMessage.includes("not confirmed")) {
            setAuthError({
              type: "warning",
              title: "Email Not Verified",
              message: "Please verify your email address before signing in. Check your inbox or request a new verification email.",
              action: {
                label: "Resend Verification Email",
                onClick: handleResendVerification,
              },
            });
          } else if (errorMessage.includes("Invalid login credentials")) {
            // Check if we should suggest signup
            setAuthError({
              type: "info",
              title: "Account Not Found",
              message: "We couldn't find an account with this email. Would you like to create one?",
              action: {
                label: "Sign Up Instead",
                onClick: switchToSignup,
              },
            });
          } else {
            setAuthError({
              type: "error",
              title: "Sign In Failed",
              message: errorMessage,
            });
          }
        } else {
          toast.success("Welcome back!");
          const targetPath = upgradeTier ? `${redirectPath}?upgrade=${upgradeTier}` : redirectPath;
          navigate(targetPath);
        }
      }
    } catch (error) {
      setAuthError({
        type: "error",
        title: "Unexpected Error",
        message: "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show verification pending screen if user just signed up
  if (showVerificationPending) {
    return (
      <VerificationPending 
        email={pendingEmail} 
        onBack={() => {
          setShowVerificationPending(false);
          setEmail("");
          setPassword("");
        }} 
      />
    );
  }

  // Get alert styling based on error type
  const getAlertStyles = (type: AuthError["type"]) => {
    switch (type) {
      case "error":
        return "border-destructive/50 bg-destructive/10 text-destructive";
      case "warning":
        return "border-amber-500/50 bg-amber-500/10 text-amber-400";
      case "info":
        return "border-primary/50 bg-primary/10 text-primary";
      default:
        return "";
    }
  };

  const getAlertIcon = (type: AuthError["type"]) => {
    switch (type) {
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      case "warning":
        return <AlertCircle className="h-4 w-4" />;
      case "info":
        return <Info className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-rocket flex items-center justify-center">
              <Rocket className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Rocket Content</span>
          </Link>
          <Button variant="ghost" asChild>
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-16 max-w-md">
        <Card className="border-border bg-card">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Welcome</CardTitle>
            <CardDescription>
              Transform your YouTube content into viral posts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              {/* Inline Alert for errors */}
              {authError && (
                <Alert className={`mb-4 ${getAlertStyles(authError.type)}`}>
                  <div className="flex items-start gap-3">
                    {getAlertIcon(authError.type)}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{authError.title}</p>
                      <AlertDescription className="mt-1 text-sm opacity-90">
                        {authError.message}
                      </AlertDescription>
                      {authError.action && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={authError.action.onClick}
                          disabled={isResendingVerification}
                          className="mt-2 h-8 px-3 text-xs font-medium hover:bg-white/10"
                        >
                          {isResendingVerification ? (
                            <>
                              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <UserPlus className="mr-1.5 h-3 w-3" />
                              {authError.action.label}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </Alert>
              )}

              <TabsContent value="login" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    disabled={isLoading}
                    className={email && !isEmailValid ? "border-destructive/50" : ""}
                  />
                  {email && !isEmailValid && (
                    <p className="text-xs text-destructive">Please enter a valid email</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    disabled={isLoading}
                    onKeyDown={(e) => e.key === "Enter" && isFormValid && handleAuth("login")}
                  />
                </div>
                <Button
                  className="w-full gradient-primary text-primary-foreground"
                  onClick={() => handleAuth("login")}
                  disabled={isLoading || !isFormValid}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    disabled={isLoading}
                    className={email && !isEmailValid ? "border-destructive/50" : ""}
                  />
                  {email && !isEmailValid && (
                    <p className="text-xs text-destructive">Please enter a valid email</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    disabled={isLoading}
                    onKeyDown={(e) => e.key === "Enter" && isFormValid && handleAuth("signup")}
                  />
                  {password && !isPasswordValid && (
                    <p className="text-xs text-destructive">Password must be at least 6 characters</p>
                  )}
                </div>
                <Button
                  className="w-full gradient-primary text-primary-foreground"
                  onClick={() => handleAuth("signup")}
                  disabled={isLoading || !isFormValid}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          By continuing, you agree to our{" "}
          <Link to="/terms" className="underline hover:text-foreground">
            Terms of Service
          </Link>
        </p>
      </main>

      {/* Simple Footer */}
      <footer className="border-t border-border py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Rocket Content. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
