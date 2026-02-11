import { TestimonialCard } from "./TestimonialCard";

interface Testimonial {
  id: string;
  author_name: string;
  author_title: string | null;
  content: string;
  rating: number;
  source_url: string | null;
  source_platform: string | null;
  is_featured: boolean;
}

interface WallPreviewProps {
  testimonials: Testimonial[];
}

export function WallPreview({ testimonials }: WallPreviewProps) {
  if (testimonials.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>No testimonials yet. Add some to see the Wall of Love!</p>
      </div>
    );
  }

  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
      {testimonials.map((t) => (
        <TestimonialCard key={t.id} testimonial={t} showActions={false} />
      ))}
    </div>
  );
}
