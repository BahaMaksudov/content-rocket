import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddTestimonialModal } from "@/components/social-proof/AddTestimonialModal";
import { TestimonialCard } from "@/components/social-proof/TestimonialCard";
import { WallPreview } from "@/components/social-proof/WallPreview";
import { EmbedGenerator } from "@/components/social-proof/EmbedGenerator";
import { Plus, LayoutGrid, List, Code, Heart } from "lucide-react";
import { toast } from "sonner";

export default function SocialProof() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState("manage");

  const { data: testimonials = [], isLoading } = useQuery({
    queryKey: ["testimonials", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: async (newTestimonial: any) => {
      const { error } = await supabase.from("testimonials" as any).insert({
        ...newTestimonial,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
      setShowAddModal(false);
      toast.success("Testimonial added!");
    },
    onError: () => toast.error("Failed to add testimonial"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("testimonials" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
      toast.success("Testimonial deleted");
    },
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const { error } = await supabase.from("testimonials" as any).update({ is_featured: featured }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["testimonials"] }),
  });

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Heart className="h-7 w-7 text-primary" />
              Wall of Love
            </h1>
            <p className="text-muted-foreground mt-1">Collect, manage, and embed social proof on your site</p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Testimonial
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="manage" className="flex items-center gap-2 data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <List className="h-4 w-4" />
              Manage
            </TabsTrigger>
            <TabsTrigger value="wall" className="flex items-center gap-2 data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <LayoutGrid className="h-4 w-4" />
              Wall Preview
            </TabsTrigger>
            <TabsTrigger value="embed" className="flex items-center gap-2 data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <Code className="h-4 w-4" />
              Embed
            </TabsTrigger>
          </TabsList>

          {/* Manage Tab */}
          <TabsContent value="manage" className="mt-6">
            {isLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 rounded-lg bg-muted/30 animate-pulse" />
                ))}
              </div>
            ) : testimonials.length === 0 ? (
              <div className="text-center py-20 space-y-3">
                <Heart className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                <p className="text-muted-foreground">No testimonials yet</p>
                <Button variant="outline" onClick={() => setShowAddModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First
                </Button>
              </div>
            ) : (
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
                {testimonials.map((t: any) => (
                  <TestimonialCard
                    key={t.id}
                    testimonial={t}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onToggleFeatured={(id, featured) => toggleFeaturedMutation.mutate({ id, featured })}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Wall Preview Tab */}
          <TabsContent value="wall" className="mt-6">
            <div className="rounded-xl border border-border/50 p-6 bg-muted/10">
              <WallPreview testimonials={testimonials} />
            </div>
          </TabsContent>

          {/* Embed Tab */}
          <TabsContent value="embed" className="mt-6">
            {user && <EmbedGenerator userId={user.id} />}
          </TabsContent>
        </Tabs>
      </div>

      <AddTestimonialModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSubmit={(data) => addMutation.mutate(data)}
        isSubmitting={addMutation.isPending}
      />
    </AppLayout>
  );
}
