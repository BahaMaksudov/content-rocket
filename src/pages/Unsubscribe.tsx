import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";

type UnsubscribeStatus = "loading" | "success" | "error" | "missing_id";

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<UnsubscribeStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const userId = searchParams.get("user_id");

  useEffect(() => {
    const processUnsubscribe = async () => {
      if (!userId) {
        setStatus("missing_id");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("send-welcome-emails", {
          body: {
            action: "unsubscribe",
            user_id: userId,
          },
        });

        if (error) {
          console.error("Unsubscribe error:", error);
          setErrorMessage(error.message || "Failed to process unsubscribe request");
          setStatus("error");
          return;
        }

        if (data?.error) {
          setErrorMessage(data.error);
          setStatus("error");
          return;
        }

        setStatus("success");
      } catch (err) {
        console.error("Unsubscribe error:", err);
        setErrorMessage("An unexpected error occurred");
        setStatus("error");
      }
    };

    processUnsubscribe();
  }, [userId]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === "loading" && (
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            )}
            {status === "success" && (
              <CheckCircle className="h-12 w-12 text-primary" />
            )}
            {(status === "error" || status === "missing_id") && (
              <XCircle className="h-12 w-12 text-destructive" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {status === "loading" && "Processing..."}
            {status === "success" && "Unsubscribed Successfully"}
            {status === "error" && "Unsubscribe Failed"}
            {status === "missing_id" && "Invalid Link"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && (
            <p className="text-muted-foreground">
              Please wait while we process your unsubscribe request...
            </p>
          )}

          {status === "success" && (
            <>
              <p className="text-muted-foreground">
                You have been successfully unsubscribed from our welcome email series.
                You will no longer receive marketing emails from us.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>Important account emails will still be sent</span>
              </div>
            </>
          )}

          {status === "error" && (
            <p className="text-muted-foreground">
              {errorMessage || "We couldn't process your unsubscribe request. Please try again or contact support."}
            </p>
          )}

          {status === "missing_id" && (
            <p className="text-muted-foreground">
              The unsubscribe link appears to be invalid or incomplete.
              Please use the link provided in your email.
            </p>
          )}

          <div className="pt-4">
            <Button asChild variant="outline">
              <Link to="/">Return to Homepage</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
