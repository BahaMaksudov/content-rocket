import { useState } from "react";
import { useNavigate, Navigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Rocket, ArrowLeft, RefreshCw, Bug } from "lucide-react";
import { z } from "zod";
import { VerificationPending } from "@/components/auth/VerificationPending";

const authSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [showVerificationPending, setShowVerificationPending] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [showResendOption, setShowResendOption] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [isTestingResend, setIsTestingResend] = useState(false);
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  // Get redirect and upgrade params for post-auth navigation
  const redirectPath = searchParams.get("redirect") || "/dashboard";
  const upgradeTier = searchParams.get("upgrade");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    // Preserve upgrade param when redirecting logged-in users
    const targetPath = upgradeTier ? `${redirectPath}?upgrade=${upgradeTier}` : redirectPath;
    return <Navigate to={targetPath} replace />;
  }

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    
    setIsResendingVerification(true);
    try {
      const redirectUrl = `${window.location.origin}/auth/callback`;
      
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: unverifiedEmail,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Failed to resend email",
          description: error.message,
        });
      } else {
        toast({
          title: "Verification email sent!",
          description: "Please check your inbox and spam folder.",
        });
        setShowResendOption(false);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred.",
      });
    } finally {
      setIsResendingVerification(false);
    }
  };

  // Debug function to test Resend connection independently
  const handleTestResend = async () => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please enter an email address to send the test to.",
      });
      return;
    }

    setIsTestingResend(true);
    console.log("[Auth] Testing Resend connection to:", email);

    try {
      const { data, error } = await supabase.functions.invoke("test-resend", {
        body: {
          to: email,
          subject: "🧪 Resend Connection Test - Rocket Content",
          message: "This test confirms your Resend API key and domain are working correctly!"
        }
      });

      console.log("[Auth] Test Resend response:", { data, error });

      if (error) {
        console.error("[Auth] Test Resend function error:", error);
        toast({
          variant: "destructive",
          title: "Resend Test Failed",
          description: `Function error: ${error.message}`,
        });
        return;
      }

      if (data?.success) {
        toast({
          title: "✅ Resend Test Successful!",
          description: `Test email sent to ${email}. Check your inbox!`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Resend Test Failed",
          description: data?.error || "Unknown error from Resend API",
        });
        console.error("[Auth] Resend API error details:", data);
      }
    } catch (err) {
      console.error("[Auth] Test Resend unexpected error:", err);
      toast({
        variant: "destructive",
        title: "Test Failed",
        description: err instanceof Error ? err.message : "Unexpected error occurred",
      });
    } finally {
      setIsTestingResend(false);
    }
  };

  const handleAuth = async (action: "login" | "signup") => {
    const validation = authSchema.safeParse({ email, password });
    
    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: validation.error.errors[0].message,
      });
      return;
    }

    setIsLoading(true);
    setShowResendOption(false);

    try {
      if (action === "signup") {
        console.log("[Auth] Attempting signup for:", email);
        const result = await signUp(email, password);
        console.log("[Auth] Signup result:", { 
          hasError: !!result.error, 
          errorMessage: result.error?.message,
          errorName: result.error?.name
        });

        if (result.error) {
          let errorMessage = result.error.message;
          const errorDetails = JSON.stringify(result.error, null, 2);
          console.error("[Auth] Signup error details:", errorDetails);
          
          // Check for rate limiting (429)
          if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
            errorMessage = "Too many signup attempts. Please wait a few minutes and try again.";
          }
          // Check for user already registered
          else if (errorMessage.includes("User already registered")) {
            errorMessage = "This email is already registered. Please sign in instead, or check your inbox for a verification email.";
          }
          // Check for validation errors (400)
          else if (errorMessage.includes("Invalid") || errorMessage.includes("validation")) {
            errorMessage = `Validation error: ${result.error.message}`;
          }

          toast({
            variant: "destructive",
            title: "Sign Up Failed",
            description: errorMessage,
          });
          
          // Also show the raw error in console for debugging
          console.error("[Auth] Full error object:", result.error);
        } else {
          console.log("[Auth] Signup successful, showing verification pending screen");
          // Show verification pending screen instead of redirecting
          setPendingEmail(email);
          setShowVerificationPending(true);
        }
      } else {
        // Login flow
        const result = await signIn(email, password);

        if (result.error) {
          let errorMessage = result.error.message;
          
          // Check for unconfirmed email error
          if (errorMessage.includes("Email not confirmed") || 
              errorMessage.includes("email not confirmed") ||
              errorMessage.includes("not confirmed")) {
            setUnverifiedEmail(email);
            setShowResendOption(true);
            toast({
              variant: "destructive",
              title: "Email Not Verified",
              description: "Please confirm your email address before logging in.",
            });
          } else if (errorMessage.includes("Invalid login credentials")) {
            errorMessage = "Invalid email or password. Please try again.";
            toast({
              variant: "destructive",
              title: "Sign In Failed",
              description: errorMessage,
            });
          } else {
            toast({
              variant: "destructive",
              title: "Sign In Failed",
              description: errorMessage,
            });
          }
        } else {
          toast({
            title: "Welcome back!",
          });
          // Navigate to redirect path, preserving upgrade param if present
          const targetPath = upgradeTier ? `${redirectPath}?upgrade=${upgradeTier}` : redirectPath;
          navigate(targetPath);
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
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
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    onKeyDown={(e) => e.key === "Enter" && handleAuth("login")}
                  />
                </div>
                <Button
                  className="w-full gradient-primary text-primary-foreground"
                  onClick={() => handleAuth("login")}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
                </Button>
                
                {/* Resend verification email option */}
                {showResendOption && (
                  <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border">
                    <p className="text-sm text-muted-foreground mb-3">
                      Haven't received the verification email?
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResendVerification}
                      disabled={isResendingVerification}
                      className="w-full"
                    >
                      {isResendingVerification ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Resend Verification Email
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    onKeyDown={(e) => e.key === "Enter" && handleAuth("signup")}
                  />
                </div>
                <Button
                  className="w-full gradient-primary text-primary-foreground"
                  onClick={() => handleAuth("signup")}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
                </Button>
                
                {/* Debug: Test Resend Connection */}
                <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-dashed border-border">
                  <p className="text-xs text-muted-foreground mb-2">🔧 Debug: Test email delivery</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestResend}
                    disabled={isTestingResend || !email}
                    className="w-full"
                  >
                    {isTestingResend ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Testing Resend...
                      </>
                    ) : (
                      <>
                        <Bug className="mr-2 h-3 w-3" />
                        Send Test Email
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service
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
