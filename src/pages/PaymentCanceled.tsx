import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket, ArrowRight, Mail, BookOpen, RefreshCw } from "lucide-react";

export default function PaymentCanceled() {
  const handleRetryCheckout = async () => {
    // Redirect to dashboard where they can try upgrading again
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <div className="relative inline-block">
            <div className="h-28 w-28 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Rocket className="h-14 w-14 text-muted-foreground" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-accent/50 text-accent-foreground px-3 py-1 rounded-full text-xs font-semibold border border-accent">
              HOLD
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Not quite ready to launch?</h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              No worries! Your rocket is still on the launchpad, ready when you are.
            </p>
          </div>
        </div>

        {/* Try Again Section */}
        <Card className="bg-card border-primary/20">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Ready to give it another shot?</CardTitle>
            <CardDescription>
              If something went wrong with your payment, you can try again with a different card.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={handleRetryCheckout} size="lg" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>

        {/* Two Column Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Help Section */}
          <Card className="bg-card border-border hover:border-primary/30 transition-colors">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Need help deciding?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <CardDescription>
                Have a question before upgrading? We're here to help you make the right choice.
              </CardDescription>
              <Button variant="outline" asChild className="w-full gap-2">
                <a href="mailto:support@contentrocket.app">
                  Talk to an Expert
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Alternative Offer */}
          <Card className="bg-card border-border hover:border-primary/30 transition-colors">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Looking for something else?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <CardDescription>
                Check out our free guide on YouTube growth to kickstart your content journey.
              </CardDescription>
              <Button variant="outline" asChild className="w-full gap-2">
                <Link to="/">
                  Explore Free Resources
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Back to Dashboard */}
        <div className="text-center">
          <Button variant="ghost" asChild>
            <Link to="/">← Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
