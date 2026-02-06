import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Mic, Plus, Edit2, Trash2, Star, Loader2, FlaskConical, Crown, AlertCircle } from "lucide-react";
import { PremiumModal } from "@/components/PremiumModal";
import { StyleLabModal } from "@/components/dashboard/StyleLabModal";

interface BrandVoice {
  id: string;
  name: string;
  description: string | null;
  writing_style: string | null;
  tone: string | null;
  key_phrases: string[] | null;
  target_audience: string | null;
  is_default: boolean;
  created_at: string;
}

const toneOptions = ["Professional", "Casual", "Humorous", "Inspirational", "Educational", "Conversational"];
const audienceOptions = ["General", "B2B Professionals", "Tech Enthusiasts", "Young Adults", "Entrepreneurs", "Creatives"];

// Tier limits for custom voices
const VOICE_LIMITS = {
  free: 0,
  pro: 1,
  agency: 10,
} as const;

export default function BrandVoices() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPro, isAgency, tier } = useSubscription();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVoice, setEditingVoice] = useState<BrandVoice | null>(null);
  const [showStyleLab, setShowStyleLab] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [writingStyle, setWritingStyle] = useState("");
  const [tone, setTone] = useState("");
  const [keyPhrases, setKeyPhrases] = useState("");
  const [targetAudience, setTargetAudience] = useState("");

  const { data: brandVoices, isLoading } = useQuery({
    queryKey: ["brandVoices", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_voices")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as BrandVoice[];
    },
    enabled: !!user,
  });

  const voiceCount = brandVoices?.length ?? 0;
  const voiceLimit = VOICE_LIMITS[tier as keyof typeof VOICE_LIMITS] ?? 0;
  const canCreateVoice = isPro || isAgency;
  const isAtLimit = !isAgency && voiceCount >= voiceLimit;

  const createMutation = useMutation({
    mutationFn: async (voiceData: Omit<BrandVoice, 'id' | 'created_at' | 'is_default'>) => {
      const { data, error } = await supabase
        .from("brand_voices")
        .insert([{
          user_id: user!.id,
          name: voiceData.name,
          description: voiceData.description,
          writing_style: voiceData.writing_style,
          tone: voiceData.tone,
          key_phrases: voiceData.key_phrases,
          target_audience: voiceData.target_audience,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brandVoices"] });
      toast({ title: "Brand voice created!" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...voiceData }: Partial<BrandVoice> & { id: string }) => {
      const { data, error } = await supabase
        .from("brand_voices")
        .update(voiceData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brandVoices"] });
      toast({ title: "Brand voice updated!" });
      resetForm();
      setIsDialogOpen(false);
      setEditingVoice(null);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("brand_voices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brandVoices"] });
      toast({ title: "Brand voice deleted" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("brand_voices").update({ is_default: false }).eq("user_id", user!.id);
      const { error } = await supabase.from("brand_voices").update({ is_default: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brandVoices"] });
      toast({ title: "Default brand voice updated" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setWritingStyle("");
    setTone("");
    setKeyPhrases("");
    setTargetAudience("");
  };

  const openEditDialog = (voice: BrandVoice) => {
    setEditingVoice(voice);
    setName(voice.name);
    setDescription(voice.description || "");
    setWritingStyle(voice.writing_style || "");
    setTone(voice.tone || "");
    setKeyPhrases(voice.key_phrases?.join(", ") || "");
    setTargetAudience(voice.target_audience || "");
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Name required" });
      return;
    }

    const voiceData = {
      name: name.trim(),
      description: description.trim() || null,
      writing_style: writingStyle.trim() || null,
      tone: tone || null,
      key_phrases: keyPhrases.trim() ? keyPhrases.split(",").map(p => p.trim()) : null,
      target_audience: targetAudience || null,
    };

    if (editingVoice) {
      updateMutation.mutate({ id: editingVoice.id, ...voiceData });
    } else {
      createMutation.mutate(voiceData);
    }
  };

  const handleNewVoice = () => {
    if (!canCreateVoice) {
      setShowPremiumModal(true);
      return;
    }
    if (isAtLimit) {
      toast({
        variant: "destructive",
        title: "Voice limit reached",
        description: `Your ${tier} plan allows ${voiceLimit} custom voice${voiceLimit !== 1 ? "s" : ""}. Delete an existing voice or upgrade to Agency.`,
      });
      return;
    }
    setIsDialogOpen(true);
  };

  const handleOpenStyleLab = () => {
    if (!canCreateVoice) {
      setShowPremiumModal(true);
      return;
    }
    if (isAtLimit) {
      toast({
        variant: "destructive",
        title: "Voice limit reached",
        description: `Your ${tier} plan allows ${voiceLimit} custom voice${voiceLimit !== 1 ? "s" : ""}. Delete an existing voice or upgrade to Agency.`,
      });
      return;
    }
    setShowStyleLab(true);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Mic className="h-8 w-8 text-primary" />
              Brand Voices
            </h1>
            <p className="text-muted-foreground">
              Create and manage your unique writing styles
            </p>
          </div>

          <div className="flex gap-2">
            {/* Style Lab button */}
            <Button
              variant="outline"
              onClick={handleOpenStyleLab}
              className="border-primary/50 text-primary hover:bg-primary/10"
            >
              <FlaskConical className="h-4 w-4 mr-2" />
              Style Lab
              {!canCreateVoice && <Crown className="h-3 w-3 ml-1" />}
            </Button>

            {/* Manual create */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingVoice(null);
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button
                  className="gradient-primary text-primary-foreground"
                  onClick={(e) => {
                    if (!editingVoice) {
                      e.preventDefault();
                      handleNewVoice();
                    }
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Voice
                  {!canCreateVoice && <Crown className="h-3 w-3 ml-1" />}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingVoice ? "Edit Brand Voice" : "Create Brand Voice"}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Professional Tech Writer"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of this voice..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="writingStyle">Writing Style</Label>
                    <Textarea
                      id="writingStyle"
                      placeholder="e.g., Concise, data-driven, uses analogies..."
                      value={writingStyle}
                      onChange={(e) => setWritingStyle(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tone</Label>
                      <Select value={tone} onValueChange={setTone}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tone" />
                        </SelectTrigger>
                        <SelectContent>
                          {toneOptions.map((t) => (
                            <SelectItem key={t} value={t.toLowerCase()}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Target Audience</Label>
                      <Select value={targetAudience} onValueChange={setTargetAudience}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select audience" />
                        </SelectTrigger>
                        <SelectContent>
                          {audienceOptions.map((a) => (
                            <SelectItem key={a} value={a.toLowerCase()}>{a}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="keyPhrases">Key Phrases (comma-separated)</Label>
                    <Input
                      id="keyPhrases"
                      placeholder="e.g., Let's dive in, Here's the thing, Game-changer"
                      value={keyPhrases}
                      onChange={(e) => setKeyPhrases(e.target.value)}
                    />
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={isPending}
                    className="w-full gradient-primary text-primary-foreground"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : editingVoice ? (
                      "Update Voice"
                    ) : (
                      "Create Voice"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tier Limit Info */}
        {canCreateVoice && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {voiceCount} / {isAgency ? "10" : "1"} custom voice{isAgency ? "s" : ""}
            </Badge>
            {isAtLimit && !isAgency && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Upgrade to Agency for up to 10 voices
              </span>
            )}
          </div>
        )}

        {!canCreateVoice && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-3">
              <Crown className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Custom voices are a Pro feature</p>
                <p className="text-xs text-muted-foreground">
                  Upgrade to Pro (1 voice) or Agency (up to 10 voices) to create AI-trained writing styles.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto border-primary/50 text-primary"
                onClick={() => setShowPremiumModal(true)}
              >
                Upgrade
              </Button>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i} className="border-border bg-card">
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : brandVoices?.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="p-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Mic className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">No custom voices yet</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Train an AI voice from your own writing with <strong>Style Lab</strong>, or create one manually.
              </p>
              {canCreateVoice ? (
                <div className="flex gap-3 justify-center">
                  <Button onClick={handleOpenStyleLab} variant="outline" className="border-primary/50 text-primary">
                    <FlaskConical className="h-4 w-4 mr-2" />
                    Open Style Lab
                  </Button>
                  <Button onClick={handleNewVoice}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Manually
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setShowPremiumModal(true)} variant="outline" className="border-primary/50 text-primary">
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Create Voices
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {brandVoices?.map((voice) => (
              <Card key={voice.id} className="border-border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {voice.name}
                        {voice.is_default && (
                          <Badge className="bg-primary/20 text-primary">Default</Badge>
                        )}
                      </CardTitle>
                      {voice.description && (
                        <CardDescription className="mt-1">{voice.description}</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {voice.tone && <Badge variant="secondary">{voice.tone}</Badge>}
                    {voice.target_audience && <Badge variant="outline">{voice.target_audience}</Badge>}
                  </div>

                  {voice.writing_style && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {voice.writing_style}
                    </p>
                  )}

                  {voice.key_phrases && voice.key_phrases.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {voice.key_phrases.slice(0, 3).map((phrase, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          "{phrase}"
                        </Badge>
                      ))}
                      {voice.key_phrases.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{voice.key_phrases.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-border">
                    {!voice.is_default && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDefaultMutation.mutate(voice.id)}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Set Default
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(voice)}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(voice.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Style Lab Modal */}
      <StyleLabModal
        open={showStyleLab}
        onOpenChange={setShowStyleLab}
      />

      {/* Premium Upgrade Modal */}
      <PremiumModal
        open={showPremiumModal}
        onOpenChange={setShowPremiumModal}
        feature="brand-voice"
      />
    </AppLayout>
  );
}
