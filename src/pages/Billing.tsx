import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { SUBSCRIPTION_TIERS } from "@/lib/subscription-tiers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Crown, 
  Rocket, 
  Sparkles, 
  ExternalLink, 
  Loader2, 
  Receipt,
  Calendar,
  Check,
  ArrowRight,
  Download
} from "lucide-react";

interface PaymentHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_date: string;
  invoice_pdf_url: string | null;
  description: string | null;
}

export default function Billing() {
  const { user, session } = useAuth();
  const { tier, loading: subscriptionLoading, subscriptionEnd } = useSubscription();
  const { toast } = useToast();
  const [portalLoading, setPortalLoading] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);

  const fetchPaymentHistory = useCallback(async () => {
    if (!user) {
      setPaymentHistory([]);
      setHistoryLoading(false);
      return;
    }

    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("payment_history")
        .select("id, amount, currency, status, payment_date, invoice_pdf_url, description")
        .eq("user_id", user.id)
        .order("payment_date", { ascending: false })
        .limit(10);

      if (error) throw error;
      setPaymentHistory(data || []);
    } catch (error) {
      console.error("Error fetching payment history:", error);
      setPaymentHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  // Fetch payment history
  useEffect(() => {
    fetchPaymentHistory();
  }, [fetchPaymentHistory]);

  const handleSyncPaymentHistory = async () => {
    if (!session) {
      toast({ variant: "destructive", title: "Please log in to sync invoices" });
      return;
    }

    setSyncLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-payment-history", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      await fetchPaymentHistory();

      toast({
        title: "Invoices synced",
        description:
          typeof data?.inserted === "number"
            ? `Added ${data.inserted} invoice(s) to your history.`
            : "Your payment history has been refreshed.",
      });
    } catch (error: any) {
      console.error("Sync payment history error:", error);
      toast({
        variant: "destructive",
        title: "Unable to sync invoices",
        description: error?.message || "Please try again.",
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const tierConfig = SUBSCRIPTION_TIERS[tier];
  const isPaidPlan = tier === "pro" || tier === "agency";

  const handleManageSubscription = async () => {
    if (!session) {
      toast({ variant: "destructive", title: "Please log in to manage your subscription" });
      return;
    }

    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (error: any) {
      console.error("Portal error:", error);
      toast({
        variant: "destructive",
        title: "Unable to open billing portal",
        description: error.message || "Please try again later",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const getTierIcon = () => {
    switch (tier) {
      case "agency":
        return <Rocket className="h-6 w-6" />;
      case "pro":
        return <Crown className="h-6 w-6" />;
      default:
        return <Sparkles className="h-6 w-6" />;
    }
  };

  const getTierGradient = () => {
    switch (tier) {
      case "agency":
        return "from-amber-500 to-orange-500";
      case "pro":
        return "from-primary to-electric";
      default:
        return "from-muted-foreground to-muted-foreground";
    }
  };


  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-primary" />
            Billing
          </h1>
          <p className="text-muted-foreground">
            Manage your subscription and payment details
          </p>
        </div>

        {/* Current Plan Card */}
        <Card className="border-border bg-card overflow-hidden">
          <div className={`h-1.5 bg-gradient-to-r ${getTierGradient()}`} />
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {getTierIcon()}
                Current Plan
              </span>
              <Badge 
                className={`${
                  tier === "agency" 
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0" 
                    : tier === "pro"
                    ? "bg-primary/20 text-primary border-primary/30"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {tierConfig.name}
              </Badge>
            </CardTitle>
            <CardDescription>
              {tier === "free" 
                ? "You're on the free plan with limited features"
                : `You're subscribed to ${tierConfig.name} at $${tierConfig.price}/month`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscriptionLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-10 w-40" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-foreground">
                      ${tierConfig.price}
                      <span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </p>
                    <p className="text-sm text-muted-foreground">Monthly Price</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-foreground flex items-center gap-2">
                      {isPaidPlan && subscriptionEnd ? (
                        new Date(subscriptionEnd).toLocaleDateString("en-US", { 
                          month: "short", 
                          day: "numeric",
                          year: "numeric"
                        })
                      ) : (
                        "—"
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isPaidPlan ? "Next Billing Date" : "No Active Subscription"}
                    </p>
                  </div>
                </div>

                {/* Plan Features */}
                <div className="pt-2">
                  <p className="text-sm font-medium mb-2">Plan includes:</p>
                  <ul className="grid gap-1.5">
                    {tierConfig.features.slice(0, 4).map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  {isPaidPlan ? (
                    <Button
                      onClick={handleManageSubscription}
                      disabled={portalLoading}
                      className="gradient-primary text-primary-foreground"
                    >
                      {portalLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Opening Portal...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Manage Subscription
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button asChild className="gradient-primary text-primary-foreground">
                      <Link to="/#pricing" className="flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        View Pro Features
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                  
                  {tier === "pro" && (
                    <Button variant="outline" asChild>
                      <Link to="/#pricing" className="flex items-center gap-2">
                        <Rocket className="h-4 w-4" />
                        Upgrade to Agency
                      </Link>
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Payment History Card */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Payment History
            </CardTitle>
            <CardDescription>
              {isPaidPlan 
                ? "View and download your invoices"
                : "Subscribe to a plan to see your payment history"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : paymentHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No payment history available</p>
                <p className="text-xs mt-1">
                  {isPaidPlan 
                    ? "Your first invoice will appear after billing" 
                    : "Subscribe to Pro or Agency to get started"
                  }
                </p>
                {isPaidPlan && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSyncPaymentHistory}
                      disabled={syncLoading}
                      className="gap-2"
                    >
                      {syncLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Syncing…
                        </>
                      ) : (
                        <>
                          <Receipt className="h-4 w-4" />
                          Sync invoices now
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {paymentHistory.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {new Date(payment.payment_date).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {payment.description || "Subscription payment"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          ${(payment.amount / 100).toFixed(2)}
                        </p>
                        <Badge variant="secondary" className="text-xs bg-success/10 text-success border-0">
                          {payment.status}
                        </Badge>
                      </div>
                      {payment.invoice_pdf_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          className="h-8 w-8"
                        >
                          <a href={payment.invoice_pdf_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                
                {isPaidPlan && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                    className="w-full mt-2 text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View All Invoices in Stripe
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Card */}
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                <CreditCard className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="font-medium mb-1">Need help with billing?</p>
                <p className="text-sm text-muted-foreground mb-3">
                  View our cancellation policy or contact support for billing inquiries.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/terms#refund-policy">
                      Cancellation Policy
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/contact">
                      Contact Support
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
