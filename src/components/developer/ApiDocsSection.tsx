import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Rocket, Key, Lock, Code, Zap } from "lucide-react";

const API_BASE_URL = "https://dhcafytgwolxijdiprdr.supabase.co";

export function ApiDocsSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Rocket className="h-5 w-5 text-primary shrink-0" />
          Developer API: Getting Started
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Learn how to integrate Rocket Content into your applications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-2 py-0.5 text-xs">1</Badge>
            <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
              <Key className="h-4 w-4 shrink-0" />
              Generate Your API Key
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground pl-6 sm:pl-8">
            Go to the section above and click "Generate New Key". Copy your key immediately as it will never be shown again for security reasons.
          </p>
        </div>

        {/* Step 2 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-2 py-0.5 text-xs">2</Badge>
            <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
              <Lock className="h-4 w-4 shrink-0" />
              Authentication
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground pl-6 sm:pl-8">
            All requests must include your key in the header:
          </p>
          <div className="ml-6 sm:ml-8 p-3 bg-muted rounded-lg font-mono text-xs sm:text-sm overflow-x-auto">
            <code>Authorization: Bearer YOUR_API_KEY</code>
          </div>
        </div>

        {/* Step 3 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-2 py-0.5 text-xs">3</Badge>
            <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
              <Code className="h-4 w-4 shrink-0" />
              Example Request
            </h3>
          </div>
          <div className="ml-6 sm:ml-8 space-y-2">
            <p className="text-xs sm:text-sm text-muted-foreground">
              <strong>Endpoint:</strong>
            </p>
            <div className="p-3 bg-muted rounded-lg font-mono text-xs sm:text-sm overflow-x-auto">
              <code className="whitespace-nowrap">POST {API_BASE_URL}/functions/v1/api-gateway</code>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-3">
              <strong>Body:</strong>
            </p>
            <pre className="p-3 bg-muted rounded-lg font-mono text-xs sm:text-sm overflow-x-auto max-w-full">
{`{
  "action": "generate",
  "transcript": "Your video transcript here...",
  "tone": "Professional",
  "audience": "Tech entrepreneurs"
}`}</pre>
          </div>
        </div>

        {/* Step 4 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-2 py-0.5 text-xs">4</Badge>
            <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
              <Zap className="h-4 w-4 shrink-0" />
              Rate Limits
            </h3>
          </div>
          <div className="pl-6 sm:pl-8 text-xs sm:text-sm text-muted-foreground space-y-1">
            <p>• Pro users: <strong>1,000 requests per month</strong></p>
            <p>• Rate limit: <strong>10 requests per minute</strong></p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
