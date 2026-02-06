import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Key, Copy, Trash2, Plus, Loader2, Check } from "lucide-react";
import { format } from "date-fns";

interface ApiKey {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
}

interface ApiKeysSectionProps {
  apiKeys: ApiKey[];
  setApiKeys: React.Dispatch<React.SetStateAction<ApiKey[]>>;
  loading: boolean;
}

export function ApiKeysSection({ apiKeys, setApiKeys, loading }: ApiKeysSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [generating, setGenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const generateRandomKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "sk_";
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const hashKey = async (key: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const handleGenerateKey = async () => {
    if (!newKeyName.trim()) {
      toast({ title: "Name required", description: "Please enter a name for your API key", variant: "destructive" });
      return;
    }
    if (!user) return;

    setGenerating(true);
    try {
      const rawKey = generateRandomKey();
      const keyHash = await hashKey(rawKey);

      const { error } = await supabase
        .from("user_api_keys")
        .insert({ user_id: user.id, key_hash: keyHash, name: newKeyName.trim() });

      if (error) throw error;
      setGeneratedKey(rawKey);

      const { data } = await supabase
        .from("user_api_keys")
        .select("id, name, created_at, last_used_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setApiKeys(data || []);
      setNewKeyName("");
      toast({ title: "API Key Generated", description: "Copy your key now - it won't be shown again!" });
    } catch (error) {
      console.error("Error generating API key:", error);
      toast({ title: "Error", description: "Failed to generate API key", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    setDeletingId(keyId);
    try {
      const { error } = await supabase.from("user_api_keys").delete().eq("id", keyId);
      if (error) throw error;
      setApiKeys(prev => prev.filter(k => k.id !== keyId));
      toast({ title: "API Key Deleted", description: "The API key has been revoked" });
    } catch (error) {
      console.error("Error deleting API key:", error);
      toast({ title: "Error", description: "Failed to delete API key", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const copyToClipboard = async () => {
    if (!generatedKey) return;
    try {
      await navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied!", description: "API key copied to clipboard" });
    } catch {
      toast({ title: "Error", description: "Failed to copy to clipboard", variant: "destructive" });
    }
  };

  const handleCloseModal = () => {
    setShowKeyModal(false);
    setGeneratedKey(null);
    setNewKeyName("");
    setCopied(false);
  };

  return (
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
                <DialogTitle>{generatedKey ? "Your New API Key" : "Generate API Key"}</DialogTitle>
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
                    <Button onClick={handleGenerateKey} disabled={generating} className="gap-2">
                      {generating ? (
                        <><Loader2 className="h-4 w-4 animate-spin" />Generating...</>
                      ) : (
                        <><Key className="h-4 w-4" />Generate Key</>
                      )}
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg font-mono text-sm break-all">{generatedKey}</div>
                  <Button onClick={copyToClipboard} variant="outline" className="w-full gap-2">
                    {copied ? (
                      <><Check className="h-4 w-4 text-primary" />Copied!</>
                    ) : (
                      <><Copy className="h-4 w-4" />Copy to Clipboard</>
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
              <div key={key.id} className="flex items-center justify-between p-3 sm:p-4 border rounded-lg bg-card gap-2">
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="font-medium truncate">{key.name}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Created {format(new Date(key.created_at), "MMM d, yyyy")}
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={deletingId === key.id}>
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
  );
}
