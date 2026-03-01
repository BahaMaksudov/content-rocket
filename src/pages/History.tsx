import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History as HistoryIcon, Film, Sparkles } from "lucide-react";
import { YouTubeHistoryTab } from "@/components/history/YouTubeHistoryTab";
import { ViralScriptsHistoryTab } from "@/components/history/ViralScriptsHistoryTab";

interface Generation {
  id: string;
  youtube_url: string | null;
  video_title: string | null;
  transcript_method: string | null;
  tone: string | null;
  audience: string | null;
  twitter_hooks: unknown;
  linkedin_post: string | null;
  short_form_scripts: unknown;
  blog_post: string | null;
  created_at: string;
  target_language: string | null;
}

export type { Generation };

export default function History() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("youtube");

  const { data: generations, isLoading, refetch } = useQuery({
    queryKey: ["generations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generations")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Generation[];
    },
    enabled: !!user,
  });

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <HistoryIcon className="h-8 w-8 text-primary" />
            Generation History
          </h1>
          <p className="text-muted-foreground">
            Browse and revisit your previously generated content
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger
              value="youtube"
              className={`rounded-lg transition-all duration-200 gap-2 ${
                activeTab === "youtube"
                  ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                  : "bg-slate-800/50 text-slate-400 hover:text-slate-200"
              }`}
            >
              <Film className="h-4 w-4" />
              🎥 YouTube Analysis
            </TabsTrigger>
            <TabsTrigger
              value="viral"
              className={`rounded-lg transition-all duration-200 gap-2 ${
                activeTab === "viral"
                  ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                  : "bg-slate-800/50 text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              ✍️ Viral Scripts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="youtube">
            <YouTubeHistoryTab
              generations={generations}
              isLoading={isLoading}
              refetch={refetch}
            />
          </TabsContent>

          <TabsContent value="viral">
            <ViralScriptsHistoryTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
