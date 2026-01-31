import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles } from "lucide-react";

interface CreateBrandVoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVoiceCreated: (voiceId: string) => void;
}

export function CreateBrandVoiceModal({ open, onOpenChange, onVoiceCreated }: CreateBrandVoiceModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("brand_voices")
        .insert([{
          user_id: user.id,
          name: name.trim(),
          description: description.trim(),
          writing_style: description.trim(), // Use description as writing style for AI
          tone: null,
          key_phrases: null,
          target_audience: null,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["brandVoices"] });
      toast({ 
        title: "Brand voice created!", 
        description: `"${data.name}" is now available and selected.` 
      });
      onVoiceCreated(data.id);
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error creating voice", 
        description: error.message 
      });
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Name is required" });
      return;
    }
    
    if (!description.trim()) {
      toast({ variant: "destructive", title: "Description is required" });
      return;
    }
    
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create Brand Voice
          </DialogTitle>
          <DialogDescription>
            Define a unique writing style for your content. This will guide the AI to match your brand's personality.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="voice-name">Voice Name *</Label>
            <Input
              id="voice-name"
              placeholder="e.g., My Brand Voice"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="voice-description">Voice Description *</Label>
            <Textarea
              id="voice-description"
              placeholder="Describe the tone and style... e.g., 'Speak like a knowledgeable friend who simplifies complex topics. Use casual language, occasional humor, and end with actionable takeaways.'"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Be specific about tone, personality, and writing style you want the AI to follow.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 gradient-primary text-primary-foreground"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create Voice"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
