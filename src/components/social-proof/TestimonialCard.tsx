import { Star, Twitter, Linkedin, Globe, ExternalLink, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TestimonialCardProps {
  testimonial: {
    id: string;
    author_name: string;
    author_title: string | null;
    content: string;
    rating: number;
    source_url: string | null;
    source_platform: string | null;
    is_featured: boolean;
    avatar_url?: string | null;
  };
  onDelete?: (id: string) => void;
  onToggleFeatured?: (id: string, featured: boolean) => void;
  showActions?: boolean;
}

const platformIcon = (platform: string | null) => {
  switch (platform) {
    case "twitter": return <Twitter className="h-4 w-4" />;
    case "linkedin": return <Linkedin className="h-4 w-4" />;
    default: return <Globe className="h-4 w-4" />;
  }
};

export function TestimonialCard({ testimonial, onDelete, onToggleFeatured, showActions = true }: TestimonialCardProps) {
  return (
    <Card className="premium-card group hover:border-primary/30 transition-all duration-300 break-inside-avoid mb-4">
      <CardContent className="p-5 space-y-3">
        {/* Stars */}
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} className={`h-4 w-4 ${star <= testimonial.rating ? "fill-warning text-warning" : "text-muted-foreground/20"}`} />
          ))}
        </div>

        {/* Content */}
        <p className="text-sm text-foreground/90 leading-relaxed">"{testimonial.content}"</p>

        {/* Author */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary overflow-hidden shrink-0">
              {testimonial.avatar_url ? (
                <img src={`${testimonial.avatar_url}?t=${Date.now()}`} alt={testimonial.author_name} className="h-full w-full object-cover" />
              ) : (
                testimonial.author_name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{testimonial.author_name}</p>
              {testimonial.author_title && (
                <p className="text-xs text-muted-foreground">{testimonial.author_title}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {testimonial.source_platform && (
              <span className="text-muted-foreground">{platformIcon(testimonial.source_platform)}</span>
            )}
            {testimonial.source_url && (
              <a href={testimonial.source_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-2 pt-1">
            {onToggleFeatured && (
              <Badge
                variant={testimonial.is_featured ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => onToggleFeatured(testimonial.id, !testimonial.is_featured)}
              >
                {testimonial.is_featured ? "★ Featured" : "Feature"}
              </Badge>
            )}
            {onDelete && (
              <Button variant="ghost" size="sm" onClick={() => onDelete(testimonial.id)} className="h-7 px-2 text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
