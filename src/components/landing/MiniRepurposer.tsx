import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, ArrowRight, Zap } from "lucide-react";

export function MiniRepurposer() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [hooks, setHooks] = useState<{ text: string; style: string }[] | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    const urlPattern = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]+)/;
    if (!urlPattern.test(url)) {
      setError("Please enter a valid YouTube URL");
      return;
    }

    setLoading(true);
    setError("");
    setHooks(null);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-hook-preview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ youtubeUrl: url.trim() }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate hooks");
      }

      const data = await res.json();
      setHooks(data.hooks?.slice(0, 3) || []);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Input
            type="url"
            placeholder="Paste a YouTube URL to get free viral hooks..."
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(""); }}
            className="h-12 sm:h-14 pl-4 pr-4 bg-card/80 border-border text-base rounded-xl backdrop-blur-sm"
            disabled={loading}
          />
        </div>
        <Button
          type="submit"
          disabled={loading || !url.trim()}
          className="h-12 sm:h-14 px-6 gradient-primary text-primary-foreground rounded-xl shadow-lg btn-glow whitespace-nowrap"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Zap className="h-5 w-5 mr-2" />
              Get Free Hooks
            </>
          )}
        </Button>
      </form>

      {error && (
        <p className="text-destructive text-sm mt-2 text-center">{error}</p>
      )}

      <AnimatePresence>
        {hooks && hooks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
            className="mt-6 space-y-3"
          >
            <p className="text-sm text-muted-foreground text-center font-medium">
              🎣 Your viral hooks are ready:
            </p>
            <div className="space-y-2.5">
              {hooks.map((hook, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.12, duration: 0.3 }}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-card/60 border border-border backdrop-blur-sm"
                >
                  <Badge variant="secondary" className="text-[10px] shrink-0 mt-0.5">
                    {hook.style}
                  </Badge>
                  <p className="text-sm text-foreground leading-relaxed">"{hook.text}"</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="pt-4 text-center"
            >
              <Button
                asChild
                size="lg"
                className="gradient-primary text-primary-foreground shadow-xl btn-glow h-12 px-8"
              >
                <Link to="/auth" className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Get the Full Script & Visuals
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Free account • No credit card required
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
