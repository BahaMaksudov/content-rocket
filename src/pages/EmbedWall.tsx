import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, Twitter, Linkedin, Globe, ExternalLink } from "lucide-react";

const platformIcon = (platform: string | null) => {
  switch (platform) {
    case "twitter": return <Twitter className="h-4 w-4" />;
    case "linkedin": return <Linkedin className="h-4 w-4" />;
    default: return <Globe className="h-4 w-4" />;
  }
};

interface Testimonial {
  id: string;
  author_name: string;
  author_title: string | null;
  content: string;
  rating: number;
  source_url: string | null;
  source_platform: string | null;
  is_featured: boolean;
  avatar_url: string | null;
}

export default function EmbedWall() {
  const { userId } = useParams<{ userId: string }>();

  const { data: testimonials = [], isLoading } = useQuery({
    queryKey: ["embed-testimonials", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .eq("user_id", userId!)
        .eq("is_featured", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Testimonial[];
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="p-4 columns-1 sm:columns-2 lg:columns-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 rounded-lg bg-gray-100 animate-pulse mb-4 break-inside-avoid" />
        ))}
      </div>
    );
  }

  if (testimonials.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-gray-400 text-sm">
        No testimonials to display.
      </div>
    );
  }

  return (
    <div className="p-4 columns-1 sm:columns-2 lg:columns-3 gap-4" style={{ fontFamily: "system-ui, sans-serif" }}>
      {testimonials.map((t) => (
        <div
          key={t.id}
          className="break-inside-avoid mb-4 rounded-lg border border-gray-200 bg-white p-5 space-y-3 shadow-sm"
        >
          {/* Stars */}
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-4 w-4 ${star <= t.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
              />
            ))}
          </div>

          {/* Content */}
          <p className="text-sm text-gray-800 leading-relaxed">"{t.content}"</p>

          {/* Author */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 overflow-hidden shrink-0">
                {t.avatar_url ? (
                  <img src={t.avatar_url} alt={t.author_name} className="h-full w-full object-cover" />
                ) : (
                  t.author_name.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{t.author_name}</p>
                {t.author_title && <p className="text-xs text-gray-500">{t.author_title}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              {t.source_platform && platformIcon(t.source_platform)}
              {t.source_url && (
                <a href={t.source_url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-500">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
