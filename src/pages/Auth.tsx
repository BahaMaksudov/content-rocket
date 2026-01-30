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
import { Loader2, Rocket, ArrowLeft, RefreshCw } from "lucide-react";
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
        const result = await signUp(email, password);

        if (result.error) {
          let errorMessage = result.error.message;
          
          if (errorMessage.includes("User already registered")) {
            errorMessage = "This email is already registered. Please sign in instead.";
          }

          toast({
            variant: "destructive",
            title: "Sign Up Failed",
            description: errorMessage,
          });
        } else {
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
