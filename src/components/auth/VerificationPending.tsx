import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2, ArrowLeft, Rocket, RefreshCw } from "lucide-react";

interface VerificationPendingProps {
  email: string;
  onBack: () => void;
}

export function VerificationPending({ email, onBack }: VerificationPendingProps) {
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      const redirectUrl = `${window.location.origin}/auth/callback`;
      
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
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
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsResending(false);
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
          <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-16 max-w-md">
        <Card className="border-border bg-card">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Check Your Email</CardTitle>
            <CardDescription className="mt-2">
              We've sent a verification link to:
            </CardDescription>
            <p className="font-medium text-foreground mt-1">{email}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Click the link in the email to verify your account and access the dashboard.
              Don't forget to check your spam folder!
            </p>
            
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                onClick={handleResendEmail}
                disabled={isResending}
                className="w-full"
              >
                {isResending ? (
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
              
              <Button
                variant="ghost"
                onClick={onBack}
                className="w-full text-muted-foreground"
              >
                Use a different email
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Rocket Content. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
