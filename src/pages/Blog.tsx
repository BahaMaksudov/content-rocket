import { Link } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowRight, Calendar, Clock, Tag, ArrowLeft, Sparkles } from "lucide-react";

const POSTS = [
  {
    slug: "how-to-repurpose-youtube-videos",
    title: "How to Repurpose YouTube Videos into a Month of Content",
    excerpt:
      "Most creators leave 90% of their content value on the table. Learn the exact system for turning a single YouTube video into LinkedIn posts, blog articles, Twitter threads, and more — in under 60 seconds.",
    date: "February 14, 2026",
    readTime: "8 min read",
    tags: ["Strategy", "YouTube"],
    featured: true,
  },
];

const CATEGORY_TAGS = ["All", "Strategy", "YouTube", "SocialMedia", "AITips"];

export default function Blog() {
  const [activeTag, setActiveTag] = useState("All");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const filteredPosts = POSTS.filter(
    (p) => activeTag === "All" || p.tags.includes(activeTag)
  );

  const featuredPost = filteredPosts.find((p) => p.featured);
  const regularPosts = filteredPosts.filter((p) => !p.featured);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <>
      <title>Blog — YouTube Content Repurposing Tips | VidLogic AI</title>

      <div className="min-h-screen bg-background text-foreground">
        {/* Nav */}
        <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link
              to="/"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              <img src="/vidlogic-logo.png" alt="VidLogic AI" className="h-6 w-6 object-contain" />
              <span className="font-bold text-foreground">
                VidLogic <span className="text-primary">AI</span>
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/blog" className="text-sm font-medium text-primary">
                Blog
              </Link>
              <Link to="/auth">
                <Button size="sm" className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Get Started Free
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border/50">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/5 to-background pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.15),transparent)] pointer-events-none" />

          <div className="relative mx-auto max-w-3xl px-4 py-20 text-center">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
              VidLogic AI Insights
            </span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              The Logic of{" "}
              <span className="bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
                Content Scaling
              </span>
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground max-w-2xl mx-auto">
              Master the art of video repurposing. We share strategies, workflows, and AI tips to help you turn every
              YouTube video into a cross-platform content engine.
            </p>

            {/* Category Tags */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              {CATEGORY_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(tag)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                    activeTag === tag
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {tag === "All" ? "All Posts" : `#${tag}`}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Blog Content */}
        <section className="mx-auto max-w-5xl px-4 py-16">

          {/* Featured Post */}
          {featuredPost && (
            <div className="mb-12">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Featured Article</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <article className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-lg hover:border-primary/30">
                <div className="md:flex">
                  {/* Featured thumbnail */}
                  <div
                    className="h-56 w-full shrink-0 md:h-auto md:w-80 rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none"
                    style={{ background: "var(--gradient-glow, linear-gradient(135deg, hsl(var(--primary)/0.3), hsl(var(--primary)/0.05)))" }}
                  >
                    <div className="flex h-full items-center justify-center p-8">
                      <div className="text-center">
                        <div className="mb-3 text-5xl">🎬</div>
                        <p className="text-xs font-medium text-primary/70 uppercase tracking-wider">Video Repurposing</p>
                      </div>
                    </div>
                  </div>

                  {/* Featured content */}
                  <div className="flex flex-1 flex-col justify-between p-8">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0.5">New</Badge>
                        {featuredPost.tags.map((t) => (
                          <span key={t} className="flex items-center gap-1">
                            <Tag className="h-3 w-3" /> {t}
                          </span>
                        ))}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {featuredPost.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {featuredPost.readTime}
                        </span>
                      </div>
                      <h2 className="text-2xl font-bold leading-snug group-hover:text-primary transition-colors">
                        {featuredPost.title}
                      </h2>
                      <p className="text-muted-foreground leading-relaxed">{featuredPost.excerpt}</p>
                    </div>
                    <div className="mt-6">
                      <Link
                        to={`/blog/${featuredPost.slug}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:gap-3"
                      >
                        Read article <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          )}

          {/* Regular Posts Grid */}
          {regularPosts.length > 0 && (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {regularPosts.map((post) => (
                <article
                  key={post.slug}
                  className="group flex flex-col rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/30"
                >
                  <div className="h-44 rounded-t-xl" style={{ background: "var(--gradient-glow, linear-gradient(135deg, hsl(var(--primary)/0.3), hsl(var(--primary)/0.05)))" }} />
                  <div className="flex flex-1 flex-col gap-3 p-6">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {post.tags.map((t) => (
                        <span key={t} className="flex items-center gap-1">
                          <Tag className="h-3 w-3" /> {t}
                        </span>
                      ))}
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
          )}

          {/* Empty state when filter has no results */}
          {filteredPosts.length === 0 && (
            <div className="py-20 text-center text-muted-foreground">
              <p className="text-lg font-medium">No posts match <span className="text-primary">#{activeTag}</span> yet.</p>
              <p className="mt-1 text-sm">Check back soon — we publish weekly.</p>
              <button onClick={() => setActiveTag("All")} className="mt-4 text-sm text-primary hover:underline">
                View all posts →
              </button>
            </div>
          )}
        </section>

        {/* Newsletter Signup */}
        <section className="border-t border-border/50 bg-card/30">
          <div className="mx-auto max-w-2xl px-4 py-16 text-center">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
              Newsletter
            </span>
            <h2 className="mt-3 text-2xl font-bold">Subscribe to Content Logic</h2>
            <p className="mt-2 text-muted-foreground">
              Get the latest repurposing playbooks delivered to your inbox.
            </p>

            {subscribed ? (
              <div className="mt-6 rounded-xl border border-primary/30 bg-primary/10 px-6 py-4">
                <p className="font-semibold text-primary">🎉 You're in! Welcome to the Content Logic community.</p>
                <p className="mt-1 text-sm text-muted-foreground">First playbook lands in your inbox shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="max-w-xs bg-background border-border placeholder:text-muted-foreground/50"
                />
                <Button type="submit" className="gap-2 shrink-0">
                  <Sparkles className="h-4 w-4" />
                  Join
                </Button>
              </form>
            )}
            <p className="mt-3 text-xs text-muted-foreground">No spam. Unsubscribe anytime.</p>
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
