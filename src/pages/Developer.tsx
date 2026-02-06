import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Key, Copy, Trash2, Plus, Loader2, Check, Rocket, Code, Lock, Zap } from "lucide-react";
import { format } from "date-fns";

interface ApiKey {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
}

export default function Developer() {
  const { isPro, loading: subLoading } = useSubscription();
  const { user, session } = useAuth();
  const { toast } = useToast();
  
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch API keys
  useEffect(() => {
    const fetchApiKeys = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from("user_api_keys")
          .select("id, name, created_at, last_used_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        setApiKeys(data || []);
      } catch (error) {
        console.error("Error fetching API keys:", error);
        toast({
          title: "Error",
          description: "Failed to load API keys",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchApiKeys();
    }
  }, [user, toast]);

  // Generate a random API key
  const generateRandomKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "sk_";
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Hash the key using SHA-256
  const hashKey = async (key: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  };

  // Handle generating a new API key
  const handleGenerateKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your API key",
        variant: "destructive",
      });
      return;
    }

    if (!user) return;

    setGenerating(true);
    try {
      const rawKey = generateRandomKey();
      const keyHash = await hashKey(rawKey);

      const { error } = await supabase
        .from("user_api_keys")
        .insert({
          user_id: user.id,
          key_hash: keyHash,
          name: newKeyName.trim(),
        });

      if (error) throw error;

      setGeneratedKey(rawKey);
      
      // Refresh the list
      const { data } = await supabase
        .from("user_api_keys")
        .select("id, name, created_at, last_used_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      setApiKeys(data || []);
      setNewKeyName("");

      toast({
        title: "API Key Generated",
        description: "Copy your key now - it won't be shown again!",
      });
    } catch (error) {
      console.error("Error generating API key:", error);
      toast({
        title: "Error",
        description: "Failed to generate API key",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Handle deleting an API key
  const handleDeleteKey = async (keyId: string) => {
    setDeletingId(keyId);
    try {
      const { error } = await supabase
        .from("user_api_keys")
        .delete()
        .eq("id", keyId);

      if (error) throw error;

      setApiKeys(prev => prev.filter(k => k.id !== keyId));
      toast({
        title: "API Key Deleted",
        description: "The API key has been revoked",
      });
    } catch (error) {
      console.error("Error deleting API key:", error);
      toast({
        title: "Error",
        description: "Failed to delete API key",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async () => {
    if (!generatedKey) return;
    
    try {
      await navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "API key copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Close modal and reset state
  const handleCloseModal = () => {
    setShowKeyModal(false);
    setGeneratedKey(null);
    setNewKeyName("");
    setCopied(false);
  };

  // Redirect non-Pro users
  if (!subLoading && !isPro) {
    return <Navigate to="/billing" replace />;
  }

  const supabaseUrl = "https://dhcafytgwolxijdiprdr.supabase.co";

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-0">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Developer API</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage your API keys and integrate Rocket Content into your workflows
          </p>
        </div>

        {/* API Keys Management */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Key className="h-5 w-5 text-primary" />
                  API Keys
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Your secret API keys are listed below. Keep them secure!
                </CardDescription>
              </div>
              <Dialog open={showKeyModal} onOpenChange={setShowKeyModal}>
                <DialogTrigger asChild>
                  <Button className="gap-2 w-full sm:w-auto">
                    <Plus className="h-4 w-4" />
                    Generate New Key
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {generatedKey ? "Your New API Key" : "Generate API Key"}
                    </DialogTitle>
                    <DialogDescription>
                      {generatedKey 
                        ? "Copy this key now. For security, it won't be shown again."
                        : "Give your API key a name to help you identify it later."}
                    </DialogDescription>
                  </DialogHeader>
                  
                  {!generatedKey ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="keyName">Key Name</Label>
                        <Input
                          id="keyName"
                          placeholder="e.g., Production App, Development"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                        />
                      </div>
                      <DialogFooter>
                        <Button 
                          onClick={handleGenerateKey} 
                          disabled={generating}
                          className="gap-2"
                        >
                          {generating ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Key className="h-4 w-4" />
                              Generate Key
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-muted rounded-lg font-mono text-sm break-all">
                        {generatedKey}
                      </div>
                      <Button 
                        onClick={copyToClipboard} 
                        variant="outline" 
                        className="w-full gap-2"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4 text-primary" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy to Clipboard
                          </>
                        )}
                      </Button>
                      <DialogFooter>
                        <Button onClick={handleCloseModal}>Done</Button>
                      </DialogFooter>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No API keys yet</p>
                <p className="text-sm">Generate your first key to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div 
                    key={key.id}
                    className="flex items-center justify-between p-3 sm:p-4 border rounded-lg bg-card gap-2"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="font-medium truncate">{key.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Created {format(new Date(key.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          disabled={deletingId === key.id}
                        >
                          {deletingId === key.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{key.name}"? This action cannot be undone and will immediately revoke access.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteKey(key.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Getting Started Documentation */}
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
                  <code className="whitespace-nowrap">POST {supabaseUrl}/functions/v1/api-gateway</code>
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
      </div>
    </AppLayout>
  );
}
