import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RefundEligibility {
  eligible: boolean;
  reason: string;
  canCancel: boolean;
  withinRefundWindow?: boolean;
  daysSinceCreation?: number;
  generationsUsed?: number;
  isFirstSubscription?: boolean;
  subscriptionEnd?: string;
}

interface CancelResult {
  success: boolean;
  immediate: boolean;
  periodEnd?: string;
  message?: string;
}

interface UseRefundWorkflowReturn {
  eligibility: RefundEligibility | null;
  loading: boolean;
  refundLoading: boolean;
  cancelLoading: boolean;
  checkEligibility: () => Promise<void>;
  processRefund: () => Promise<CancelResult>;
  cancelAtPeriodEnd: () => Promise<CancelResult>;
}

export function useRefundWorkflow(): UseRefundWorkflowReturn {
  const { session } = useAuth();
  const { toast } = useToast();
  const [eligibility, setEligibility] = useState<RefundEligibility | null>(null);
  const [loading, setLoading] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const checkEligibility = useCallback(async () => {
    if (!session?.access_token) {
      setEligibility(null);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-refund-eligibility", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      setEligibility(data);
    } catch (error) {
      console.error("Error checking refund eligibility:", error);
      setEligibility(null);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  const processRefund = useCallback(async (): Promise<CancelResult> => {
    if (!session?.access_token) {
      toast({
        variant: "destructive",
        title: "Please log in to request a refund",
      });
      return { success: false, immediate: true };
    }

    setRefundLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-refund", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Refund Processed",
          description: "Your subscription has been canceled and you've been refunded. Access removed immediately.",
        });
        return { success: true, immediate: true, message: data.message };
      } else {
        throw new Error(data?.error || "Failed to process refund");
      }
    } catch (error: any) {
      console.error("Error processing refund:", error);
      toast({
        variant: "destructive",
        title: "Refund Failed",
        description: error?.message || "Unable to process your refund. Please contact support.",
      });
      return { success: false, immediate: true };
    } finally {
      setRefundLoading(false);
    }
  }, [session?.access_token, toast]);

  const cancelAtPeriodEnd = useCallback(async (): Promise<CancelResult> => {
    if (!session?.access_token) {
      toast({
        variant: "destructive",
        title: "Please log in to cancel your subscription",
      });
      return { success: false, immediate: false };
    }

    setCancelLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-subscription", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Subscription Canceled",
          description: data.message,
        });
        return { 
          success: true, 
          immediate: false, 
          periodEnd: data.periodEnd,
          message: data.message 
        };
      } else {
        throw new Error(data?.error || "Failed to cancel subscription");
      }
    } catch (error: any) {
      console.error("Error canceling subscription:", error);
      toast({
        variant: "destructive",
        title: "Cancellation Failed",
        description: error?.message || "Unable to cancel your subscription. Please try again.",
      });
      return { success: false, immediate: false };
    } finally {
      setCancelLoading(false);
    }
  }, [session?.access_token, toast]);

  return {
    eligibility,
    loading,
    refundLoading,
    cancelLoading,
    checkEligibility,
    processRefund,
    cancelAtPeriodEnd,
  };
}
