import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink, Loader2, Youtube } from "lucide-react";
import { CanonicalHead } from "@/components/seo/CanonicalHead";

interface PublicBlogPost {
  id: string;
  slug: string;
  title: string;
  tl_dr: string | null;
  insights: string[];
  youtube_url: string | null;
  youtube_video_id: string | null;
  meta_description: string | null;
  author_name: string | null;
  created_at: string;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<PublicBlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("public_blog_posts" as any)
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
      } else {
        const row: any = data;
        setPost({
          ...row,
          insights: Array.isArray(row.insights) ? row.insights : [],
        });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Inject Article + BreadcrumbList JSON-LD
  useEffect(() => {
    if (!post) return;
    const ld = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          headline: post.title,
          description: post.meta_description || post.tl_dr || "",
          datePublished: post.created_at,
          dateModified: post.created_at,
          author: { "@type": "Organization", name: post.author_name || "VidLogic AI" },
          publisher: {
            "@type": "Organization",
            name: "VidLogic AI",
            logo: { "@type": "ImageObject", url: "https://vidlogicai.com/vidlogic-logo.png" },
          },
          mainEntityOfPage: `https://vidlogicai.com/blog/${post.slug}`,
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://vidlogicai.com/" },
            { "@type": "ListItem", position: 2, name: "Blog", item: "https://vidlogicai.com/blog" },
            { "@type": "ListItem", position: 3, name: post.title, item: `https://vidlogicai.com/blog/${post.slug}` },
          ],
        },
      ],
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(ld);
    script.dataset.blogJsonld = "1";
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [post]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold">Article not found</h1>
          <p className="text-muted-foreground">This blog post may have been removed or the link is incorrect.</p>
          <Button onClick={() => navigate("/blog")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to blog
          </Button>
        </div>
      </div>
    );
  }

  const metaTitle = `${post.title} | VidLogic AI`;
  const metaDesc =
    post.meta_description ||
    (post.insights[0] ? `${post.title} — ${post.insights[0]}` : post.tl_dr || post.title).slice(0, 160);

  return (
    <div className="min-h-screen bg-background">
      <CanonicalHead title={metaTitle.slice(0, 60)} description={metaDesc} />

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link to="/blog" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" />
          All articles
        </Link>

        <article className="space-y-8">
          <header className="space-y-4">
            <Badge variant="outline" className="text-xs">
              AI-generated insights
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight break-words">{post.title}</h1>
            <p className="text-sm text-muted-foreground">
              Published {new Date(post.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
              {post.author_name ? ` · Source: ${post.author_name}` : ""}
            </p>
          </header>

          {post.tl_dr && (
            <section
              aria-label="TL;DR summary"
              className="rounded-lg border border-primary/20 bg-primary/5 p-4 sm:p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">TL;DR</p>
              <p className="text-base leading-relaxed">{post.tl_dr}</p>
            </section>
          )}

          {/* Embed source video for E-E-A-T */}
          {post.youtube_video_id && (
            <section aria-label="Source video">
              <div className="relative w-full overflow-hidden rounded-lg border border-border" style={{ paddingTop: "56.25%" }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${post.youtube_video_id}`}
                  title={post.title}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              {post.youtube_url && (
                <a
                  href={post.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Youtube className="h-3 w-3" /> Watch source on YouTube
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </section>
          )}

          {post.insights.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-4">Key Takeaways</h2>
              <ul className="list-disc pl-6 space-y-3 text-base leading-relaxed">
                {post.insights.map((insight, i) => (
                  <li key={i}>{insight}</li>
                ))}
              </ul>
            </section>
          )}

          {!post.youtube_video_id && post.youtube_url && (
            <section>
              <h2 className="text-2xl font-bold mb-2">Source</h2>
              <a
                href={post.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <Youtube className="h-4 w-4" /> Watch the original video
                <ExternalLink className="h-4 w-4" />
              </a>
            </section>
          )}

          <section className="rounded-lg border border-border bg-card p-5 sm:p-6 text-center space-y-3">
            <h2 className="text-xl font-semibold">Turn any YouTube video into a week of content</h2>
            <p className="text-sm text-muted-foreground">
              VidLogic AI generates LinkedIn posts, X threads, and SEO summaries like this one — automatically.
            </p>
            <Button asChild>
              <Link to="/auth?mode=signup">Try VidLogic AI free</Link>
            </Button>
          </section>
        </article>
      </div>
    </div>
  );
}
