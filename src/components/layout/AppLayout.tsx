import { ReactNode, useState, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AnimatePresence } from "framer-motion";
import { AppSidebar } from "./AppSidebar";
import { PaymentFailedBanner } from "@/components/dashboard/PaymentFailedBanner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SignOutConfirmationModal } from "@/components/SignOutConfirmationModal";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageTransition } from "@/components/layout/PageTransition";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { Settings, LogOut, ChevronDown, CreditCard, User } from "lucide-react";
import { SUBSCRIPTION_TIERS } from "@/lib/subscription-tiers";

interface AppLayoutProps {
  children: ReactNode;
}

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/history": "History",
  "/brand-voices": "Brand Voices",
  "/settings": "Settings",
  "/billing": "Billing",
  "/developer": "Developer API",
  "/social-proof": "Wall of Love",
  "/team": "Team Workspace",
  "/agent": "Content Agent",
  "/agent/queue": "Agent Queue",
  "/agent/settings": "Agent Settings",
};

const agentSubTitles: Record<string, string> = {
  "setup": "Setup",
  "weekly": "Weekly Plan",
  "history": "History",
};

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { tier } = useSubscription();
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);

  const currentTitle = routeTitles[location.pathname] || "Dashboard";
  const agentView = location.pathname === "/agent"
    ? new URLSearchParams(location.search).get("view") || ""
    : "";
  const agentSubTitle = agentSubTitles[agentView] || null;
  const tierConfig = SUBSCRIPTION_TIERS[tier];

  // Fetch user profile in real-time
  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) setProfile(data);
      };
      fetchProfile();

      // Subscribe to real-time changes
      const channel = supabase
        .channel("profile-changes")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            setProfile(payload.new as { full_name: string | null; avatar_url: string | null });
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setProfile(null);
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleSignOutClick = (e: React.MouseEvent) => {
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

  // Truncate email for mobile display
  const getTruncatedEmail = (email: string) => {
    const [local, domain] = email.split("@");
    if (local.length > 4) {
      return `${local.slice(0, 4)}...@${domain}`;
    }
    return email;
  };

  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="h-[100dvh] flex w-full overflow-hidden">
        {/* Sidebar hidden on mobile, shown on desktop */}
        {!isMobile && <AppSidebar />}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ height: '100%' }}>
          <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-background/95 backdrop-blur-lg sticky top-0 z-50 shrink-0">
            {/* Left side: Sidebar trigger + Breadcrumbs */}
            <div className="flex items-center min-h-[44px]">
              {!isMobile && <SidebarTrigger className="mr-4" />}
              <Breadcrumb>
                <BreadcrumbList className="flex-nowrap text-xs sm:text-sm">
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                        Dashboard
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {location.pathname !== "/dashboard" && (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        {agentSubTitle || location.pathname.startsWith("/agent/") ? (
                          <BreadcrumbLink asChild>
                            <Link to="/agent" className="text-muted-foreground hover:text-foreground transition-colors">
                              {location.pathname === "/agent" ? currentTitle : routeTitles["/agent"] || "Content Agent"}
                            </Link>
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage className="font-medium">{currentTitle}</BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                      {(agentSubTitle || (location.pathname.startsWith("/agent/") && location.pathname !== "/agent")) && (
                        <>
                          <BreadcrumbSeparator />
                          <BreadcrumbItem>
                            <BreadcrumbPage className="font-medium">
                              {agentSubTitle || currentTitle}
                            </BreadcrumbPage>
                          </BreadcrumbItem>
                        </>
                      )}
                    </>
                  )}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* Right side: User Menu */}
            <div className="flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-3 h-9 active-press">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={profile?.avatar_url || undefined} alt={getUserDisplayName()} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    {/* Desktop: Show name, Mobile: Hide or show icon only */}
                    <span className="hidden sm:inline max-w-[150px] truncate text-sm font-medium">
                      {getUserDisplayName()}
                    </span>
                    {/* Mobile: Show truncated email or just the avatar */}
                    <span className="sm:hidden text-xs text-muted-foreground max-w-[100px] truncate">
                      {user?.email ? getTruncatedEmail(user.email) : ""}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover border-border z-[100]">
                  <div className="px-3 py-2 space-y-1">
                    <p className="text-sm font-medium truncate">{getUserDisplayName()}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    <Badge
                      variant="outline"
                      className={`text-xs mt-1 ${
                        tier === "agency"
                          ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400"
                          : tier === "pro"
                            ? "bg-primary/10 border-primary/30 text-primary"
                            : "bg-muted border-border text-muted-foreground"
                      }`}
                    >
                      {tierConfig.name} Plan
                    </Badge>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/settings" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/billing" className="flex items-center">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Billing
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOutClick}
                    className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          {/* Scrollable content area */}
          <AnimatePresence mode="wait">
            <PageTransition>
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 pb-20 md:pb-6" style={{ WebkitOverflowScrolling: 'touch' }}>
                <PaymentFailedBanner />
                {children}
              </div>
            </PageTransition>
          </AnimatePresence>
          {/* Minimalist Dashboard Footer - desktop only */}
          <footer className="hidden md:block border-t border-border/50 px-4 py-3 bg-background/50 shrink-0">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4">
                <Link to="/privacy" className="hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
                <Link to="/terms" className="hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
                <Link to="/terms#refunds" className="hover:text-foreground transition-colors">
                  Refund Policy
                </Link>
                <a href="mailto:support@vidlogicai.com" className="hover:text-foreground transition-colors">
                  Contact Support
                </a>
              </div>
              <span className="text-muted-foreground/70">© {new Date().getFullYear()} VidLogic AI</span>
            </div>
          </footer>
        </main>
      </div>
      {/* Mobile bottom tab bar */}
      {isMobile && <MobileBottomNav />}
      <SignOutConfirmationModal open={showSignOutModal} onOpenChange={setShowSignOutModal} onConfirm={handleSignOut} />
    </SidebarProvider>
  );
}
