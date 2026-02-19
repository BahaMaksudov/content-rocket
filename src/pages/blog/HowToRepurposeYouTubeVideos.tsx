import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Clock, Tag, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const TOC = [
  { id: "why-repurpose", label: "Why Repurpose YouTube Content?" },
  { id: "the-system", label: "The 1-Video → Many-Pieces System" },
  { id: "linkedin", label: "Step 1 — LinkedIn Posts" },
  { id: "twitter", label: "Step 2 — Twitter / X Threads" },
  { id: "blog", label: "Step 3 — Blog Articles" },
  { id: "audio", label: "Step 4 — Micro-Nuggets" },
  { id: "community", label: "Step 5 — Community Teasing" },
  { id: "tools", label: "The Right Tools Make It Easy" },
  { id: "conclusion", label: "Conclusion" },
];

function CtaBanner() {
  return (
    <div className="my-10 flex flex-col items-start gap-4 rounded-xl border border-primary/30 bg-primary/10 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-foreground">Try VidLogic AI for Free</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste a YouTube URL and get a LinkedIn post, blog article, and Twitter thread in under 60 seconds.
        </p>
      </div>
      <Link to="/dashboard" className="shrink-0">
        <Button className="gap-2">
          Get Started Free <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}

export default function HowToRepurposeYouTubeVideos() {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const headings = TOC.map(({ id }) => document.getElementById(id)).filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: "0px 0px -60% 0px", threshold: 0 }
    );

    headings.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <title>How to Repurpose YouTube Videos into a Month of Content | VidLogic AI Blog</title>

      <div className="min-h-screen bg-background text-foreground">
        {/* Nav */}
        <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link to="/" className="text-lg font-bold tracking-tight text-foreground">
              VidLogic <span className="text-primary">AI</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Blog
              </Link>
              <Link to="/dashboard">
                <Button size="sm">Try VidLogic AI Free</Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Breadcrumb */}
        <div className="mx-auto max-w-6xl px-4 pt-6">
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">How to Repurpose YouTube Videos</span>
          </nav>
        </div>

        {/* Layout: sidebar + article */}
        <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-24 pt-10 lg:grid-cols-[240px_1fr]">

          {/* ── Table of Contents (sticky sidebar) ── */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-xl border border-border bg-card p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Table of Contents
              </p>
              <nav className="space-y-1.5">
                {TOC.map(({ id, label }) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className={cn(
                      "block rounded-md px-3 py-1.5 text-sm transition-colors",
                      activeId === id
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* ── Article body ── */}
          <article className="min-w-0">
            {/* Meta */}
            <div className="mb-6 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1">
                <Tag className="h-3 w-3" /> Strategy
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> February 14, 2026
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> 8 min read
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-extrabold leading-snug tracking-tight sm:text-4xl md:text-5xl">
              How to Repurpose YouTube Videos into a Month of Content
            </h1>

            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              The most successful creators in 2026 don't work harder; they work logically. By using VidLogic AI, you can turn a single video into a week's worth of cross-platform content in under 60 seconds.
            </p>

            {/* Top CTA */}
            <CtaBanner />

            {/* ── Section 1 ── */}
            <h2 id="why-repurpose" className="mt-12 scroll-mt-28 text-2xl font-bold tracking-tight">
              Why Repurpose YouTube Content?
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Your YouTube video is not just a video — it's a research document, a thought-leadership essay, a podcast script, and a social media goldmine all at once. Repurposing is about recognising that the hard work (the thinking, the scripting, the expertise) is already done. All that's left is formatting.
            </p>
            <ul className="mt-4 space-y-2 pl-5 text-muted-foreground">
              {[
                "Reach audiences who never watch YouTube",
                "Compound your effort: one recording → 10+ assets",
                "Improve SEO with long-form written content",
                "Build authority on LinkedIn, X, and Google simultaneously",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>

            {/* ── Section 2 ── */}
            <h2 id="the-system" className="mt-12 scroll-mt-28 text-2xl font-bold tracking-tight">
              The 1-Video → Many-Pieces System
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              The core idea is simple: treat your YouTube video as the <em>source of truth</em> for a content cluster. Every piece of written, visual, or audio content you publish that week derives from that single recording. Here's the exact breakdown:
            </p>
            <div className="mt-6 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-card/70 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Asset Type</th>
                    <th className="px-4 py-3">Time to Create (with AI)</th>
                    <th className="px-4 py-3">Platform</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    ["LinkedIn post", "< 1 minute", "LinkedIn"],
                    ["Twitter / X thread", "< 1 minute", "X (Twitter)"],
                    ["Blog article", "5–10 minutes", "Website / SEO"],
                    ["Podcast show notes", "< 2 minutes", "Spotify, Apple"],
                    ["Email newsletter", "< 5 minutes", "Subscribers"],
                    ["Short-form script", "< 1 minute", "TikTok, Reels"],
                  ].map(([asset, time, platform]) => (
                    <tr key={asset} className="text-muted-foreground">
                      <td className="px-4 py-3 font-medium text-foreground">{asset}</td>
                      <td className="px-4 py-3">{time}</td>
                      <td className="px-4 py-3">{platform}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Section 3 ── */}
            <h2 id="linkedin" className="mt-12 scroll-mt-28 text-2xl font-bold tracking-tight">
              Step 1 — LinkedIn Posts
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              LinkedIn is your thought-leadership platform. Your audience here doesn't want a summary of your video — they want the <em>lesson you learned</em> making it. Frame your post around the core <strong className="text-foreground">"Why"</strong> behind your video's topic: why it matters, why most people get it wrong, and why your perspective is worth following.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Start with a bold, professional hook — a counterintuitive truth or a hard-won insight from your niche. Then build your post as a mini thought-leadership essay: 3–5 short paragraphs that show your expertise without selling anything. Close with an open-ended question to drive comments and signal to the algorithm that your content generates conversation.
            </p>
            <blockquote className="my-6 border-l-4 border-primary pl-5 italic text-muted-foreground">
              "The best LinkedIn posts don't recap your video — they reveal the professional insight buried inside it. VidLogic AI surfaces that insight automatically."
            </blockquote>

            {/* ── Section 4 ── */}
            <h2 id="twitter" className="mt-12 scroll-mt-28 text-2xl font-bold tracking-tight">
              Step 2 — Twitter / X Threads
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              X rewards two types of posts: the <strong className="text-foreground">Engagement Hook</strong> and the <strong className="text-foreground">Listicle</strong>. Pull both from the same video for Posts 3 and 4 of your content week.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              The <em>Hot Take</em> post is your engagement hook — a single, bold, slightly controversial statement drawn from your video's core argument. Keep it under 280 characters and watch the replies flood in. The <em>Listicle Thread</em> is the deep-dive: 8–10 tweets, each covering one key insight from your transcript, structured as a numbered list that people save and share.
            </p>
            <ol className="mt-4 space-y-3 pl-5 text-muted-foreground">
              {[
                "Post 3a — Hot Take: one bold, polarising sentence from your video's thesis",
                "Post 3b — Listicle Thread: 'X things I learned from [topic]' (one per tweet)",
                "Tweet 2 of thread: your strongest data point or surprising stat",
                "Final tweet: CTA linking to the full video with a reason to click",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 leading-relaxed">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ol>

            {/* ── Section 5 ── */}
            <h2 id="blog" className="mt-12 scroll-mt-28 text-2xl font-bold tracking-tight">
              Step 3 — Blog Articles
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              This is the highest-effort format, but also the longest-lasting. A well-structured blog post can rank on Google for years and drive compounding organic traffic. The good news: your YouTube transcript is already 80% of the work.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Start with the transcript, remove filler words and verbal tics, add subheadings every 300–400 words, embed the YouTube video at the top, and add a meta description and FAQ section at the bottom. A 20-minute YouTube video can easily become a 2,000-word blog post with minimal editing.
            </p>

            {/* ── Section 6 ── */}
            <h2 id="audio" className="mt-12 scroll-mt-28 text-2xl font-bold tracking-tight">
              Step 4 — Micro-Nuggets (Posts 5–8)
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Every YouTube video is implicitly divided into chapters — distinct segments where you shift topics or make a new point. Each of those chapters is a <strong className="text-foreground">standalone value bomb</strong> waiting to be extracted. VidLogic AI identifies these natural breaks in your transcript and turns each one into a short-form post.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Think of these as micro-content: 150–300 words, punchy, self-contained, and shareable. Post one per day across Instagram captions, LinkedIn carousels, or short-form scripts for TikTok and Reels. Four chapters = four days of content, all from a single video. Each micro-nugget links back to the original video, compounding your views over time.
            </p>

            {/* ── Section 5 ── */}
            <h2 id="community" className="mt-12 scroll-mt-28 text-2xl font-bold tracking-tight">
              Step 5 — Community Teasing (Posts 9–10)
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              The final two posts in your content week are the most underused — and often the most engaging. These are your <strong className="text-foreground">Behind-the-Scenes</strong> and <strong className="text-foreground">FAQ</strong> posts, designed to build community trust and extend the life of your video's reach.
            </p>
            <ul className="mt-4 space-y-2 pl-5 text-muted-foreground">
              {[
                "Post 9 — Behind the Scenes: Share the process of making the video. What surprised you? What almost didn't make the cut? This humanises your brand and rewards loyal followers with insider access.",
                "Post 10 — Community FAQ: Pull the top questions from your video's comment section and answer them in a dedicated post. This signals responsiveness, rewards your community, and creates a content loop that drives people back to the original video.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <blockquote className="my-6 border-l-4 border-primary pl-5 italic text-muted-foreground">
              "Your community doesn't just want your best ideas — they want to feel like they're part of the journey. Posts 9 and 10 make that happen."
            </blockquote>

            {/* ── Section 7 ── */}
            <h2 id="tools" className="mt-12 scroll-mt-28 text-2xl font-bold tracking-tight">
              The Right Tools Make It Easy
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Doing all of this manually is time-consuming. The right AI tool can compress the entire repurposing workflow from hours to minutes. Here's what to look for:
            </p>
            <ul className="mt-4 space-y-2 pl-5 text-muted-foreground">
              {[
                "Automatic transcript extraction from any YouTube URL",
                "Brand voice customisation so every post sounds like you",
                "Multi-format output: LinkedIn, Twitter, blog, and short-form in one click",
                "Bulk processing for channels with a large back-catalogue",
                "Language support for global audiences",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>

            {/* Mid-article CTA */}
            <CtaBanner />

            {/* ── Conclusion ── */}
            <h2 id="conclusion" className="mt-12 scroll-mt-28 text-2xl font-bold tracking-tight">
              Conclusion
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Repurposing your YouTube content is one of the highest-leverage activities a modern creator or marketer can do. The research and expertise are already inside your videos — you just need a system to extract and redistribute them.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Start with LinkedIn (highest ROI, lowest friction), build the habit, and then expand to Twitter threads, blog posts, and podcast show notes. With AI tools like VidLogic AI, the entire workflow takes less time than it took to brew your morning coffee.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground font-medium text-foreground">
              Your video already did the hard work. Let AI do the rest.
            </p>

            {/* Bottom CTA */}
            <CtaBanner />

            {/* Author / metadata */}
            <div className="mt-8 flex items-center gap-4 rounded-xl border border-border bg-card p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                V
              </div>
              <div>
                <p className="text-sm font-semibold">VidLogic AI Team</p>
                <p className="text-xs text-muted-foreground">
                  Helping creators turn one video into a month of content since 2024.
                </p>
              </div>
            </div>
          </article>
        </div>

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

        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              headline: "How to Repurpose YouTube Videos into a Month of Content",
              datePublished: "2026-02-14",
              author: { "@type": "Organization", name: "VidLogic AI" },
              publisher: { "@type": "Organization", name: "VidLogic AI" },
              description:
                "Learn the exact system for turning a single YouTube video into LinkedIn posts, blog articles, Twitter threads, and more.",
            }),
          }}
        />
      </div>
    </>
  );
}
