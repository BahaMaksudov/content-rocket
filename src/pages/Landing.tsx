import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, forwardRef, lazy } from "react";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ContactSalesModal } from "@/components/landing/ContactSalesModal";
import { SignOutConfirmationModal } from "@/components/SignOutConfirmationModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Heart } from "lucide-react";
import {
  Rocket,
  Zap,
  Globe,
  Image,
  Eye,
  ArrowRight,
  Check,
  Play,
  Clock,
  Users,
  TrendingUp,
  Target,
  Sparkles,
  Twitter,
  Linkedin,
  Video,
  FileText,
  ChevronRight,
  Star,
  Building2,
  Settings,
  LogOut,
  LayoutDashboard,
  ChevronDown,
  Lock,
  ShieldCheck,
  MapPin,
  CreditCard,
  Info,
  LockKeyhole,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CanonicalHead } from "@/components/seo/CanonicalHead";

// Animation variants — lightweight for mobile
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

// Shared viewport config — trigger early at 10%
const earlyViewport = { once: true, amount: 0.1 } as const;

// Sticky Navigation
function StickyNav() {
  const [scrolled, setScrolled] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch user profile when authenticated
  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data);
        });
    } else {
      setProfile(null);
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleSignOutClick = (e: React.MouseEvent) => {
    // Shift+click bypasses confirmation modal for faster exit
    if (e.shiftKey) {
      handleSignOut();
    } else {
      setShowSignOutModal(true);
    }
  };

  const getUserDisplayName = () => {
    if (profile?.full_name) return profile.full_name;
    if (user?.email) return user.email;
    return "User";
  };

  const getUserInitials = () => {
    const name = getUserDisplayName();
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-[#1a1f2e]/95 backdrop-blur-lg border-b border-border shadow-lg" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 h-[68px] flex items-center justify-between">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-3">
          <img
            src="/vidlogic-logo.png"
            alt="VidLogic AI"
            className="h-[44px] w-[44px] object-contain transition-all duration-300 hover:scale-[1.4] hover:drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]"
          />
          <span className="font-bold text-xl md:text-2xl leading-none">
            VidLogic <span className="text-primary">AI</span>
          </span>
        </Link>

        {/* Only show navigation links for logged-out users */}
        {!user && (
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#demo" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Demo
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </a>
            <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Blog
            </Link>
          </div>
        )}

        <div className="flex items-center gap-3">
          {loading ? (
            // Loading state - prevents flash
            <>
              <Skeleton className="h-9 w-20 hidden sm:block" />
              <Skeleton className="h-9 w-32" />
            </>
          ) : user ? (
            // Logged in state
            <>
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link to="/dashboard" className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2 pl-2 pr-3">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={profile?.avatar_url || undefined} alt={getUserDisplayName()} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline max-w-[120px] truncate text-sm">{getUserDisplayName()}</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
                  <div className="px-2 py-1.5 text-sm font-medium truncate">{user.email}</div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/dashboard" className="flex items-center">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/settings" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOutClick}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <SignOutConfirmationModal
                open={showSignOutModal}
                onOpenChange={setShowSignOutModal}
                onConfirm={handleSignOut}
              />
            </>
          ) : (
            // Logged out state
            <>
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link to="/auth">Log in</Link>
              </Button>
              <Button asChild className="gradient-primary text-primary-foreground shadow-lg btn-glow">
                <Link to="/auth">Start Creating Free</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.nav>
  );
}

// Hero background — disable animated blobs on mobile for perf
function HeroBackground() {
  const isMobile = useIsMobile();
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(187_94%_43%_/_0.2),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_30%_80%,hsl(217_91%_30%_/_0.25),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_80%_20%,hsl(199_89%_48%_/_0.15),transparent)]" />
      {!isMobile && (
        <>
          <motion.div
            className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/15 rounded-full blur-[150px] will-change-transform"
            animate={{ x: [0, 30, -20, 0], y: [0, -20, 15, 0], scale: [1, 1.1, 0.95, 1] }}
            transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[hsl(199_89%_48%_/_0.12)] rounded-full blur-[130px] will-change-transform"
            animate={{ x: [0, -25, 20, 0], y: [0, 25, -15, 0], scale: [1, 0.95, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 15, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[hsl(222_47%_20%_/_0.3)] rounded-full blur-[100px] will-change-transform"
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
          />
        </>
      )}
    </div>
  );
}

// Hero Section
function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Mesh gradient background — static on mobile, animated on desktop */}
      <HeroBackground />

      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black_40%,transparent_100%)] opacity-20" />

      <div className="relative container mx-auto px-4 py-20 lg:py-32">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial="initial"
          animate="animate"
          variants={staggerContainer}
        >
          {/* Floating badge */}
          <motion.div variants={fadeInUp} className="mb-8">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="inline-block"
            >
              <Badge
                variant="secondary"
                className="px-4 py-2 text-sm font-semibold bg-[hsl(187_94%_43%_/_0.2)] text-[hsl(187_94%_60%)] border border-[hsl(187_94%_43%_/_0.3)] shadow-[0_0_20px_hsl(187_94%_43%_/_0.15)]"
              >
                🤖 BETA: Agentic Content Engine
              </Badge>
            </motion.div>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            variants={fadeInUp}
            className="text-3xl sm:text-5xl lg:text-7xl font-semibold mb-6 tracking-tight leading-[1.1]"
          >
            Turn YouTube Videos or Ideas
            <span className="block mt-2 text-gradient">Into Viral Content</span>
            {/* <span className="block mt-2">in Seconds</span> */}
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={fadeInUp}
            className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed px-2"
          >
            VidLogicAI helps creators repurpose YouTube videos into viral assets or use Agentic AI to generate viral
            scripts from any topic for TikTok, Reels, and YouTube Shorts.
          </motion.p>

          {/* CTA buttons */}
          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Button
              asChild
              size="lg"
              className="gradient-primary text-primary-foreground text-base sm:text-lg px-8 h-14 shadow-xl btn-glow hover:shadow-primary/40 transition-shadow"
            >
              <Link to="/auth" className="flex items-center gap-2">
                Launch Your Content Agent ✨
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="text-base sm:text-lg px-8 h-14 border-border hover:bg-card"
            >
              <a href="#demo" className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Watch Demo
              </a>
            </Button>
          </motion.div>

          {/* Trust caption */}
          <motion.p variants={fadeInUp} className="text-sm text-muted-foreground mb-6">
            No credit card required • Free forever plan available
          </motion.p>

          {/* Platform icons */}
          <motion.div variants={fadeInUp} className="flex items-center justify-center gap-4 mb-16">
            <span className="text-xs sm:text-sm text-muted-foreground font-medium">Optimized for:</span>
            <div className="flex items-center gap-3">
              {/* TikTok */}
              <div
                className="h-8 w-8 rounded-lg bg-[hsl(var(--secondary))] flex items-center justify-center"
                title="TikTok"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-foreground">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.99a8.21 8.21 0 0 0 4.76 1.52V7.12a4.83 4.83 0 0 1-1-.43z" />
                </svg>
              </div>
              {/* Instagram */}
              <div
                className="h-8 w-8 rounded-lg bg-[hsl(var(--secondary))] flex items-center justify-center"
                title="Instagram Reels"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-foreground">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                </svg>
              </div>
              {/* YouTube */}
              <div
                className="h-8 w-8 rounded-lg bg-[hsl(var(--secondary))] flex items-center justify-center"
                title="YouTube Shorts"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-foreground">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div variants={fadeInUp} className="grid grid-cols-3 gap-8 max-w-lg mx-auto">
            {[
              { value: "10K+", label: "Creators" },
              { value: "1M+", label: "Content Pieces" },
              { value: "50hrs", label: "Saved Weekly" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gradient">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-muted-foreground/50 rounded-full" />
        </div>
      </motion.div>
    </section>
  );
}

// How It Works Section
function HowItWorksSection() {
  const steps = [
    {
      step: "01",
      icon: Sparkles,
      title: "Generate",
      desc: "Paste a topic or idea and our AI creates hooks, scene blueprints, overlays, and captions — in seconds.",
    },
    {
      step: "02",
      icon: Video,
      title: "Produce",
      desc: "Use ElevenLabs for AI voiceover and CapCut to assemble your scenes. Our blueprint is your shot-list.",
    },
    {
      step: "03",
      icon: Globe,
      title: "Publish",
      desc: "Export and post to TikTok, Instagram Reels, or YouTube Shorts. Optimized for each platform.",
    },
  ];

  return (
    <section className="py-20 lg:py-28 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,hsl(187_94%_43%_/_0.06),transparent)]" />
      <div className="relative container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={earlyViewport}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <Badge variant="outline" className="mb-4 text-primary border-primary/30">
            How It Works
          </Badge>
          <h2 className="text-3xl lg:text-5xl font-bold mb-4">
            Master the <span className="text-gradient">Viral Workflow</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Three steps from idea to published viral content.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={earlyViewport}
              transition={{ duration: 0.4, delay: index * 0.15 }}
            >
              <Card className="premium-card h-full text-center relative overflow-hidden group hover:border-primary/30 transition-colors">
                <div className="absolute top-4 right-4 text-5xl font-bold text-primary/10 select-none">{step.step}</div>
                <CardContent className="pt-8 pb-6 px-6 flex flex-col items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <step.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Connecting arrows (desktop) */}
        <div className="hidden md:flex justify-center items-center gap-0 max-w-5xl mx-auto mt-8">
          <div className="flex-1 flex justify-center">
            <div className="h-[2px] w-16 bg-gradient-to-r from-transparent to-primary/40" />
          </div>
          <ChevronRight className="h-5 w-5 text-primary/40 -mx-2" />
          <div className="flex-1 flex justify-center">
            <div className="h-[2px] w-full bg-primary/20" />
          </div>
          <ChevronRight className="h-5 w-5 text-primary/40 -mx-2" />
          <div className="flex-1 flex justify-center">
            <div className="h-[2px] w-16 bg-gradient-to-l from-transparent to-primary/40" />
          </div>
        </div>
      </div>
    </section>
  );
}

// Problem Section
function ProblemSection() {
  const problems = [
    {
      icon: Clock,
      title: "Hours of Manual Work",
      desc: "Writing threads, posts, and blogs from scratch takes forever",
    },
    { icon: Users, title: "Inconsistent Posting", desc: "Running out of content ideas leads to weeks of silence" },
    { icon: TrendingUp, title: "Missed Opportunities", desc: "Your videos have goldmine content going to waste" },
  ];

  return (
    <section className="py-20 lg:py-32 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={earlyViewport}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <Badge variant="outline" className="mb-4 text-rocket border-rocket/30">
            The Problem
          </Badge>
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            Creating Content is a<span className="text-rocket"> Full-Time Job</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            You spend hours recording videos, but then spend even more hours turning that content into posts, threads,
            and articles. Sound familiar?
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {problems.map((problem, index) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={earlyViewport}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full border-destructive/20 bg-destructive/5 hover:border-destructive/40 transition-colors">
                <CardContent className="p-6 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4 mx-auto">
                    <problem.icon className="h-7 w-7 text-destructive" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{problem.title}</h3>
                  <p className="text-muted-foreground">{problem.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Solution Section (The Big Four)
function SolutionSection() {
  const features = [
    {
      icon: Zap,
      title: "Batch Processing",
      description: "One click generates X threads, LinkedIn posts, TikTok scripts, and SEO blogs simultaneously.",
      color: "primary",
      gradient: "from-primary to-electric",
    },
    {
      icon: Globe,
      title: "Global Reach",
      description:
        "Instantly translate all content to Spanish, Hindi, Mandarin and many other languages while keeping your brand voice.",
      color: "success",
      gradient: "from-success to-emerald-400",
    },
    {
      icon: Image,
      title: "AI Visuals",
      description: "Generate scroll-stopping thumbnails and hero images that match your content perfectly.",
      color: "rocket",
      gradient: "from-rocket to-warning",
    },
    {
      icon: Eye,
      title: "Social Previews",
      description: "See exactly how your content looks on X, LinkedIn, and TikTok before you post.",
      color: "info",
      gradient: "from-info to-primary",
    },
  ];

  return (
    <section id="features" className="py-20 lg:py-32 bg-card/30 relative">
      {/* Background accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />

      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={earlyViewport}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <Badge variant="outline" className="mb-4 text-primary border-primary/30">
            The Solution
          </Badge>
          <h2 className="text-3xl lg:text-5xl font-semibold mb-6">
            Four Core Capabilities,
            <span className="text-gradient"> One Platform</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            VidLogic AI doesn't just repurpose — it analyzes, structures, and delivers. Every feature is engineered for
            accuracy and precision.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={earlyViewport}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
            >
              <Card className="h-full border-border hover:border-primary/50 transition-all duration-300 group overflow-hidden">
                <CardContent className="p-8">
                  <div
                    className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Interactive Demo Section
function DemoSection() {
  return (
    <section id="demo" className="py-20 lg:py-32 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={earlyViewport}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <Badge variant="outline" className="mb-4 text-rocket border-rocket/30">
            See It In Action
          </Badge>
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            From YouTube URL to
            <span className="text-gradient"> Structured Intelligence</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Watch how VidLogic AI analyzes a single video and generates precise, logic-driven content in seconds.
          </p>
        </motion.div>

        {/* Demo mockup */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={earlyViewport}
          transition={{ duration: 0.6 }}
          className="max-w-5xl mx-auto relative"
        >
          {/* Cyan glow effect behind video */}
          <div
            aria-hidden
            className="absolute -inset-4 rounded-3xl opacity-40 blur-2xl"
            style={{ background: "radial-gradient(ellipse at center, hsl(var(--primary) / 0.3), transparent 70%)" }}
          />
          <div
            className="relative w-full rounded-xl overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.3)] border border-white/10"
            style={{ aspectRatio: "16 / 9" }}
          >
            <iframe
              src="https://www.youtube.com/embed/nrQTqTrKqBM?rel=0"
              title="VidLogic AI Demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// Early Access — Feature Highlights
function TrustedByCreatorsSection() {
  const featureCards = [
    {
      id: "1",
      title: "Speed",
      icon: Zap,
      description: "Turn a 20-minute video into a 2,000-word blog post in under a minute.",
    },
    {
      id: "2",
      title: "Precision",
      icon: Target,
      description: "AI-engineered to capture the core takeaways without the fluff.",
    },
    {
      id: "3",
      title: "Growth",
      icon: TrendingUp,
      description: "Effortlessly scale your presence across LinkedIn, X, and your personal blog.",
    },
  ];

  return (
    <section className="py-20 lg:py-28 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />

      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={earlyViewport}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <Badge variant="outline" className="mb-4 text-primary border-primary/30">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Early Access
          </Badge>
          <h2 className="text-3xl lg:text-5xl font-bold mb-4">
            Logic-Driven <span className="text-gradient">Video Intelligence</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join early-access creators using VidLogic AI to extract structured insights from every video.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {featureCards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={earlyViewport}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="border-border/50 bg-card/60 backdrop-blur-sm hover:border-primary/40 transition-all duration-300 h-full">
                <CardContent className="p-6 space-y-4 text-center">
                  <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <card.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{card.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Pricing Section
function PricingSection({
  onUpgradeClick,
  highlightedPlan,
}: {
  onUpgradeClick: (tier: "starter" | "pro" | "agency") => void;
  highlightedPlan?: string | null;
}) {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for trying out VidLogic AI",
      highlight: null,
      features: [
        "3 generations per month",
        "X threads & LinkedIn posts",
        "Viral Script Generator (Manual)",
        "Standard AI",
        "Manage up to 3 testimonials (Internal only)",
        {
          text: "Content Agent Access",
          locked: true,
          tooltip: "Automated weekly content planning and batch script generation.",
        },
        "Community support",
      ],
      cta: "Start Free",
      ctaAction: "auth" as const,
      tier: null,
      popular: false,
    },
    {
      name: "Starter",
      price: "$9.99",
      period: "/month",
      description: "For creators getting started",
      highlight: null,
      features: [
        "25 generations per month",
        "All social formats + blog posts",
        "Viral Script Generator",
        {
          text: "Full Agentic AI Content Agent",
          isNew: true,
          tooltip: "Automated weekly content planning and batch script generation.",
        },
        "1 brand voice",
        "Social Proof Tools — Unlimited Testimonials",
        "Embeddable Wall of Love Widget",
        "Email support",
      ],
      cta: "Get Starter",
      ctaAction: "upgrade" as const,
      tier: "starter" as const,
      popular: false,
    },
    {
      name: "Pro",
      price: "$19.99",
      period: "/month",
      description: "Best value — under $20/mo",
      highlight: null,
      features: [
        "60 generations per month",
        "Viral Script Generator",
        {
          text: "Priority Agentic AI Planning",
          isNew: true,
          tooltip: "Automated weekly content planning and batch script generation.",
        },
        "Style Mimicking (AI voice training)",
        "Priority processing",
        "No watermarks",
        "3 brand voices",
        "Social Proof Tools — Unlimited Testimonials",
        "Embeddable Wall of Love Widget",
        "API access",
      ],
      cta: "Go Pro",
      ctaAction: "upgrade" as const,
      tier: "pro" as const,
      popular: true,
    },
    {
      name: "Agency",
      price: "$99.99",
      period: "/month",
      description: "For teams & content agencies",
      highlight: "Team",
      features: [
        "250 generations per month",
        "Viral Script Generator",
        {
          text: "Priority Agentic AI Planning",
          isNew: true,
          tooltip: "Automated weekly content planning and batch script generation.",
        },
        "10 brand voices",
        "Team workspace (5 members)",
        "Bulk export",
        "Style Mimicking",
        "Social Proof Tools — Unlimited Testimonials",
        "Embeddable Wall of Love Widget",
        "Priority support",
        "Custom integrations",
      ],
      cta: "Upgrade to Agency",
      ctaAction: "upgrade" as const,
      tier: "agency" as const,
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-20 lg:py-32 bg-card/30 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />

      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={earlyViewport}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <Badge variant="outline" className="mb-4 text-primary border-primary/30">
            Simple Pricing
          </Badge>
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            Choose Your
            <span className="text-gradient"> Launch Plan</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free and upgrade when you're ready. No hidden fees, cancel anytime.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {plans.map((plan, index) => {
            const isHighlighted = highlightedPlan && plan.name.toLowerCase() === highlightedPlan;
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={earlyViewport}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative ${isHighlighted ? "animate-pulse-slow ring-2 ring-primary ring-offset-2 ring-offset-background rounded-xl" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-gradient-to-r from-primary to-rocket text-white shadow-lg">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
                      <Building2 className="h-3 w-3 mr-1" />
                      {plan.highlight}
                    </Badge>
                  </div>
                )}
                <Card
                  className={`h-full ${plan.popular ? "border-primary ring-2 ring-primary/20" : plan.highlight ? "border-amber-500/50 ring-2 ring-amber-500/20" : "border-border"} transition-all duration-300 hover:border-primary/50`}
                >
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <TooltipProvider delayDuration={300}>
                      <ul className="space-y-3">
                        {plan.features.map((feature, fi) => {
                          const isObj = typeof feature === "object";
                          const text = isObj ? feature.text : feature;
                          const isLocked = isObj && feature.locked;
                          const isNew = isObj && feature.isNew;
                          const tooltipText = isObj ? feature.tooltip : null;
                          const isSocialProof =
                            text.includes("Social Proof") ||
                            text.includes("Wall of Love") ||
                            text.includes("testimonials");
                          return (
                            <li key={fi} className="flex items-start gap-3">
                              {isLocked ? (
                                <LockKeyhole className="h-5 w-5 text-muted-foreground/40 shrink-0 mt-0.5" />
                              ) : (
                                <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                              )}
                              <span
                                className={`text-sm ${isLocked ? "text-muted-foreground/40" : "text-muted-foreground"}`}
                              >
                                {text}
                                {isNew && (
                                  <Badge className="ml-1.5 text-[9px] px-1.5 py-0 bg-primary/20 text-primary border-0 align-middle">
                                    New
                                  </Badge>
                                )}
                                {isSocialProof && (
                                  <Badge className="ml-1.5 text-[9px] px-1.5 py-0 bg-rocket/20 text-rocket border-0 align-middle">
                                    New
                                  </Badge>
                                )}
                                {tooltipText && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="inline-block h-3.5 w-3.5 ml-1 text-muted-foreground/50 hover:text-muted-foreground cursor-help align-middle" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-[200px] text-xs">
                                      {tooltipText}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </TooltipProvider>
                    {plan.ctaAction === "upgrade" && plan.tier ? (
                      <Button
                        onClick={() => onUpgradeClick(plan.tier!)}
                        className={`w-full ${
                          plan.tier === "agency"
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                            : "gradient-primary text-primary-foreground"
                        }`}
                      >
                        {plan.cta}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    ) : (
                      <Button
                        asChild
                        className={`w-full ${plan.popular ? "gradient-primary text-primary-foreground" : ""}`}
                        variant={plan.popular ? "default" : "outline"}
                      >
                        <Link to="/auth">
                          {plan.cta}
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Payment trust section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={earlyViewport}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10 text-center"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-success" />
              <span>Secure payments processed via Stripe</span>
            </div>
            <span className="hidden sm:inline text-muted-foreground/50">•</span>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" />
              <span>Cancel anytime</span>
            </div>
            <span className="hidden sm:inline text-muted-foreground/50">•</span>
            <span>All prices include applicable taxes</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// FAQ Section
function FAQSection() {
  const faqs = [
    {
      question: "How does VidLogic AI work?",
      answer:
        "Simply paste a YouTube URL and our AI analyzes the transcript to extract intelligence and generate platform-optimized content. You get X threads, LinkedIn posts, TikTok scripts, and SEO blog posts — all from one video.",
    },
    {
      question: "What languages do you support for translation?",
      answer:
        "Currently, we support translation to Spanish, Hindi, Mandarin, Uzbek and Russian. More languages are coming soon. Our AI maintains your brand voice across all translations.",
    },
    {
      question: "Can I customize the generated content?",
      answer:
        "Absolutely! All generated content is fully editable. You can also save Brand Voices to ensure consistent tone and style across all your content.",
    },
    {
      question: "Do I own the content generated?",
      answer:
        "Yes, 100%. All content generated through VidLogic AI is yours to use however you like — no attribution required.",
    },
    {
      question: "What if I'm not satisfied?",
      answer:
        "We offer a 7-day money-back guarantee on all paid plans. If VidLogic AI isn't right for you, just reach out and we'll refund you — no questions asked.",
    },
    {
      question: "Is there an API available?",
      answer:
        "Yes! Pro and Agency plans include API access so you can integrate VidLogic AI into your existing workflows and tools.",
    },
  ];

  return (
    <section id="faq" className="py-20 lg:py-32 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={earlyViewport}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <Badge variant="outline" className="mb-4 text-primary border-primary/30">
            FAQ
          </Badge>
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">Got Questions?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about VidLogic AI.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-border rounded-xl px-6 data-[state=open]:border-primary/50 transition-colors"
              >
                <AccordionTrigger className="text-left hover:no-underline py-5">
                  <span className="font-medium">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}

// Trust Section
function TrustSection() {
  const logos = ["Creator Academy", "Social Surge", "Content Labs", "Viral Media", "Growth Hub"];

  return (
    <section className="py-16 border-t border-b border-border bg-card/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="text-sm text-muted-foreground mb-8">TRUSTED BY LEADING CREATORS AND AGENCIES</p>
          <div className="flex flex-wrap justify-center items-center gap-8 lg:gap-16">
            {logos.map((logo) => (
              <div
                key={logo}
                className="text-xl font-bold text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              >
                {logo}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// CTA Section
const CTASection = forwardRef<HTMLElement>((_, ref) => {
  return (
    <section ref={ref} className="py-20 lg:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-rocket/10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[100px]" />

      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            Ready to 10x Your
            <span className="text-gradient"> Content Output?</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-10">
            Join thousands of creators who are saving hours every week. Start for free—no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="gradient-primary text-primary-foreground text-lg px-10 h-14 shadow-xl btn-glow"
            >
              <Link to="/auth" className="flex items-center gap-2">
                Launch Your Content Agent
                <Sparkles className="h-5 w-5" />
              </Link>
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Free forever plan • No credit card required • Cancel anytime
          </p>
        </motion.div>
      </div>
    </section>
  );
});
CTASection.displayName = "CTASection";

// Footer
const Footer = forwardRef<HTMLElement>((_, ref) => {
  return (
    <footer ref={ref} className="py-12 border-t border-border bg-card/30">
      <div className="container mx-auto px-4">
        {/* Main footer grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
          {/* Brand & Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img src="/vidlogic-logo.png" alt="VidLogic AI" className="h-8 w-8 object-contain" />
              <span className="font-semibold">
                VidLogic <span className="text-primary">AI</span>
              </span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">VidLogic AI</p>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Sharon, MA USA</span>
              </div>
            </div>
          </div>

          {/* Legal Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Legal</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <Link to="/terms#refunds" className="hover:text-foreground transition-colors">
                Refund Policy
              </Link>
              <Link to="/contact" className="hover:text-foreground transition-colors">
                Contact Us
              </Link>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Product</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#pricing" className="hover:text-foreground transition-colors">
                Pricing
              </a>
              <a href="#demo" className="hover:text-foreground transition-colors">
                Demo
              </a>
              <a href="#faq" className="hover:text-foreground transition-colors">
                FAQ
              </a>
            </div>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Resources</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/blog" className="hover:text-foreground transition-colors">
                Blog
              </Link>
              <Link to="/blog/how-to-repurpose-youtube-videos" className="hover:text-foreground transition-colors">
                Repurpose YouTube Videos
              </Link>
              <Link to="/tools/youtube-to-linkedin" className="hover:text-foreground transition-colors">
                YouTube to LinkedIn
              </Link>
            </div>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Support</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <a href="mailto:support@vidlogicai.com" className="hover:text-foreground transition-colors">
                support@vidlogicai.com
              </a>
              <Link to="/contact" className="hover:text-foreground transition-colors">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>

        {/* Trust badges and copyright */}
        <div className="pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 text-xs text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                <span>Powered by Stripe</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 text-xs text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span>256-bit SSL Secured</span>
              </div>
            </div>

            {/* Copyright */}
            <p className="text-sm text-muted-foreground text-center">
              © {new Date().getFullYear()} VidLogic AI. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
});
Footer.displayName = "Footer";

// Main Landing Page
export default function Landing() {
  const [contactSalesOpen, setContactSalesOpen] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightedPlan = searchParams.get("plan");

  // Redirect authenticated users to dashboard immediately
  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  // Auto-scroll to pricing section when ?plan= is present
  useEffect(() => {
    if (highlightedPlan) {
      // Small delay to allow page to render
      const timer = setTimeout(() => {
        const pricingSection = document.getElementById("pricing");
        if (pricingSection) {
          pricingSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 300);
      // Clean up the plan param after scrolling
      const cleanupTimer = setTimeout(() => {
        searchParams.delete("plan");
        setSearchParams(searchParams, { replace: true });
      }, 5000);
      return () => {
        clearTimeout(timer);
        clearTimeout(cleanupTimer);
      };
    }
  }, [highlightedPlan, searchParams, setSearchParams]);

  // Handle upgrade button clicks from pricing section
  const handleUpgradeClick = (tier: "starter" | "pro" | "agency") => {
    if (user) {
      navigate(`/dashboard?upgrade=${tier}`);
    } else {
      navigate(`/auth?redirect=/dashboard&upgrade=${tier}`);
    }
  };

  // Show loading state while checking auth to prevent flash
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-9 w-9 rounded-full flex items-center justify-center animate-pulse">
          <img src="/vidlogic-logo.png" alt="Loading" className="h-9 w-9 rounded-full object-contain" />
        </div>
      </div>
    );
  }

  // Don't render landing page for authenticated users (redirect will happen)
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <CanonicalHead
        title="VidLogic AI | AI Content Agent & Viral Script Generator for YouTube Creators"
        description="Turn any YouTube video into viral scripts, LinkedIn posts, blog articles, and threads with VidLogic AI's Content Agent. Free AI-powered YouTube to viral content engine."
      />
      <StickyNav />
      <HeroSection />
      <HowItWorksSection />
      <TrustedByCreatorsSection />
      <TrustSection />
      <ProblemSection />
      <SolutionSection />
      <DemoSection />
      <PricingSection onUpgradeClick={handleUpgradeClick} highlightedPlan={highlightedPlan} />
      <FAQSection />
      <CTASection />
      <Footer />
      <ContactSalesModal open={contactSalesOpen} onOpenChange={setContactSalesOpen} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "VidLogic AI",
              url: "https://vidlogicai.com",
              logo: "https://vidlogicai.com/vidlogic-logo.png",
              sameAs: ["https://twitter.com/VidLogicAI"],
              description: "AI-powered content repurposing platform that turns YouTube videos into viral scripts, social posts, and blog articles.",
            },
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "VidLogic AI",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              url: "https://vidlogicai.com",
              description: "AI Content Agent and Viral Script Generator for YouTube creators. Repurpose videos into LinkedIn posts, Twitter threads, and blog articles.",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
                description: "Free plan available with monthly generation credits",
              },
            },
          ]),
        }}
      />
    </div>
  );
}
