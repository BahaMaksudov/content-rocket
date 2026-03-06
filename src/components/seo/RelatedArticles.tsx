import { Link } from "react-router-dom";
import { ArrowRight, Calendar } from "lucide-react";

const ARTICLES = [
  {
    slug: "/blog/how-to-repurpose-youtube-videos",
    title: "How to Repurpose YouTube Videos into a Month of Content",
    excerpt: "Turn a single YouTube video into LinkedIn posts, blog articles, Twitter threads, and more — in under 60 seconds.",
    date: "February 14, 2026",
  },
  {
    slug: "/tools/youtube-to-linkedin",
    title: "Free YouTube to LinkedIn Post Generator",
    excerpt: "Paste a YouTube URL and get a publish-ready LinkedIn post in under 30 seconds. No editing skills needed.",
    date: "Tool",
  },
];

interface RelatedArticlesProps {
  /** Slug of the current page to exclude from the list */
  currentSlug?: string;
  title?: string;
}

export function RelatedArticles({ currentSlug, title = "Related Articles" }: RelatedArticlesProps) {
  const filtered = ARTICLES.filter((a) => a.slug !== currentSlug);
  if (filtered.length === 0) return null;

  return (
    <section className="px-4 py-16">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-8 text-2xl font-bold tracking-tight">{title}</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {filtered.map((article) => (
            <Link
              key={article.slug}
              to={article.slug}
              className="group flex flex-col rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-md"
            >
              <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {article.date}
              </p>
              <h3 className="mb-2 text-lg font-semibold group-hover:text-primary transition-colors">
                {article.title}
              </h3>
              <p className="mb-4 flex-1 text-sm text-muted-foreground">{article.excerpt}</p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                Read more <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
