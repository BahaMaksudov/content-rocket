import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, Youtube, Brain, Linkedin, Zap, CheckCircle2 } from "lucide-react";

const STEPS = [
  {
    icon: Youtube,
    step: "01",
    title: "Fetch Your Video",
    description:
      "Paste any YouTube URL and our engine instantly pulls the full transcript — no manual copying, no plugins needed.",
  },
  {
    icon: Brain,
    step: "02",
    title: "Analyze & Repurpose",
    description:
      "VidLogic AI extracts your key insights, structures your ideas, and applies your brand voice to craft a scroll-stopping post.",
  },
  {
    icon: Linkedin,
    step: "03",
    title: "Post to LinkedIn",
    description:
      "Copy your polished LinkedIn post, share it with one click, and watch your video content reach a professional audience.",
  },
];

const FAQS = [
  {
    q: "Can I convert any YouTube video to a LinkedIn post?",
    a: "Yes — as long as the video has a transcript (auto-generated or manual captions), VidLogic AI can process it. This covers the vast majority of YouTube videos, including your own unlisted or private videos.",
  },
  {
    q: "How long does the YouTube to LinkedIn conversion take?",
    a: "Typically under 30 seconds. VidLogic AI fetches the transcript and generates a polished LinkedIn post in one seamless step, so you can publish while the topic is still fresh.",
  },
  {
    q: "Will the LinkedIn post sound like me?",
    a: "Absolutely. You can define a custom Brand Voice — setting your tone, style, and key phrases — so every generated post reads like you wrote it yourself, not a robot.",
  },
  {
    q: "Does this work for long YouTube videos?",
    a: "Yes. VidLogic AI is built to handle long-form content like webinars, tutorials, and podcasts, distilling hours of video into a concise, high-impact LinkedIn post your network will actually read.",
  },
  {
    q: "Is there a free plan available?",
    a: "Yes! You can get started for free with a set of monthly generation credits. No credit card required to try it out — just sign up and paste your first YouTube URL.",
  },
];

const BENEFITS = [
  "No video editing skills required",
  "Preserves your authentic voice",
  "Works on any device",
  "Supports 20+ languages",
];

export default function YouTubeToLinkedIn() {
  return (
    <>
      {/* SEO Meta — injected at build via index.html, but title update handled here */}
      <title>Free YouTube to LinkedIn Post Generator | VidLogic AI</title>

      <div className="min-h-screen bg-background text-foreground">
        {/* ── Minimal top nav ───────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link to="/" className="text-lg font-bold tracking-tight text-foreground">
              VidLogic <span className="text-primary">AI</span>
            </Link>
            <Link to="/auth">
              <Button size="sm">Get Started Free</Button>
            </Link>
          </div>
        </header>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-4 pb-24 pt-20 text-center">
          {/* Glow backdrop */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: "var(--gradient-hero)" }}
          />

          <div className="relative mx-auto max-w-3xl">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
              <Zap className="h-3.5 w-3.5" />
              Free Tool — No Credit Card Required
            </span>

            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl">
              Free YouTube to{" "}
              <span className="bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
                LinkedIn Post
              </span>{" "}
              Generator
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Paste a YouTube URL and get a publish-ready LinkedIn post in under 30 seconds. No editing skills, no copy-pasting — just intelligent repurposing.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/dashboard">
                <Button size="lg" className="gap-2 px-8 text-base">
                  Start Generating Free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="px-8 text-base">
                  Create Free Account
                </Button>
              </Link>
            </div>

            {/* Social proof micro-line */}
            <p className="mt-6 text-sm text-muted-foreground/70">
              Trusted by 1,000+ content creators &amp; marketers
            </p>

            {/* Quick benefit pills */}
            <ul className="mt-8 flex flex-wrap justify-center gap-3">
              {BENEFITS.map((b) => (
                <li
                  key={b}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── How it Works ─────────────────────────────────────────────── */}
        <section className="bg-card/50 px-4 py-20" id="how-it-works">
          <div className="mx-auto max-w-5xl">
            <div className="mb-14 text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                How it works
              </h2>
              <p className="mt-3 text-muted-foreground">
                Three steps — from raw YouTube video to a LinkedIn post your audience will engage with.
              </p>
            </div>

            <ol className="relative grid gap-8 md:grid-cols-3">
              {/* Connector line (desktop) */}
              <div
                aria-hidden
                className="absolute left-1/2 top-8 hidden h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent md:block"
              />

              {STEPS.map(({ icon: Icon, step, title, description }) => (
                <li
                  key={step}
                  className="relative flex flex-col items-center rounded-xl border border-border bg-card p-8 text-center shadow-sm"
                >
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full border border-primary/40 bg-background px-3 py-0.5 text-xs font-bold text-primary">
                    STEP {step}
                  </span>
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </li>
              ))}
            </ol>

            <div className="mt-12 text-center">
              <Link to="/dashboard">
                <Button size="lg" className="gap-2 px-8">
                  Try It Now — It&apos;s Free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <section className="px-4 py-20" id="faq">
          <div className="mx-auto max-w-3xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Frequently Asked Questions
              </h2>
              <p className="mt-3 text-muted-foreground">
                Everything you need to know about repurposing YouTube videos for LinkedIn.
              </p>
            </div>

            <Accordion type="single" collapsible className="space-y-3">
              {FAQS.map(({ q, a }, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="rounded-xl border border-border bg-card px-6"
                >
                  <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
                    {q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ── Bottom CTA ───────────────────────────────────────────────── */}
        <section className="border-t border-border/50 bg-card/30 px-4 py-20 text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Start repurposing your YouTube content today
            </h2>
            <p className="mt-4 text-muted-foreground">
              Join thousands of creators turning one video into a week of LinkedIn content — for free.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/dashboard">
                <Button size="lg" className="gap-2 px-10 text-base">
                  Go to Dashboard <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────── */}
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

        {/* JSON-LD structured data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: FAQS.map(({ q, a }) => ({
                "@type": "Question",
                name: q,
                acceptedAnswer: { "@type": "Answer", text: a },
              })),
            }),
          }}
        />
      </div>
    </>
  );
}
