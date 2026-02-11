import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Star, MessageSquareQuote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TopTestimonialsWidget() {
  const { user } = useAuth();

  const { data: testimonials } = useQuery({
    queryKey: ["top-testimonials", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("rating", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  if (!testimonials || testimonials.length === 0) return null;

  return (
    <Card className="premium-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquareQuote className="h-4 w-4 text-primary" />
          Top Social Proof
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {testimonials.map((t: any) => (
          <div key={t.id} className="p-2 rounded-lg bg-muted/30 space-y-1">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`h-3 w-3 ${s <= t.rating ? "fill-warning text-warning" : "text-muted-foreground/20"}`} />
              ))}
            </div>
            <p className="text-xs text-foreground/80 line-clamp-2">"{t.content}"</p>
            <p className="text-xs text-muted-foreground">— {t.author_name}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
