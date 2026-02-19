import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Clock, Tag } from "lucide-react";

const POSTS = [
  {
    slug: "how-to-repurpose-youtube-videos",
    title: "How to Repurpose YouTube Videos into a Month of Content",
    excerpt:
      "Most creators leave 90% of their content value on the table. Learn the exact system for turning a single YouTube video into LinkedIn posts, blog articles, Twitter threads, and more.",
    date: "February 14, 2026",
    readTime: "8 min read",
    tag: "Strategy",
  },
];

export default function Blog() {
  return (
    <>
      <title>Blog — YouTube Content Repurposing Tips | VidLogic AI</title>

      <div className="min-h-screen bg-background text-foreground">
        {/* Nav */}
        <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link to="/" className="text-lg font-bold tracking-tight text-foreground">
              VidLogic <span className="text-primary">AI</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Blog
              </Link>
              <Link to="/auth">
                <Button size="sm">Get Started Free</Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="px-4 pb-16 pt-16 text-center">
          <div className="mx-auto max-w-2xl">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
              VidLogic Blog
            </span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Repurposing insights &amp;{" "}
              <span className="text-gradient">
                creator strategies
              </span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Practical guides to help you turn your YouTube content into a full content engine.
            </p>
          </div>
        </section>

        {/* Posts grid */}
        <section className="mx-auto max-w-5xl px-4 pb-24">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {POSTS.map((post) => (
              <article
                key={post.slug}
                className="group flex flex-col rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Placeholder thumbnail */}
                <div className="h-44 rounded-t-xl" style={{ background: "var(--gradient-glow)" }} />
                <div className="flex flex-1 flex-col gap-3 p-6">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" /> {post.tag}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {post.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {post.readTime}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold leading-snug group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  <p className="flex-1 text-sm text-muted-foreground">{post.excerpt}</p>
                  <Link
                    to={`/blog/${post.slug}`}
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    Read article <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/50 px-4 py-6 text-center text-xs text-muted-foreground">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 sm:flex-row">
            <span>© {new Date().getFullYear()} VidLogic AI. All rights reserved.</span>
            <div className="flex gap-4">
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
