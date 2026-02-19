import { useState } from "react";
import { Home, History, Mic, Sparkles, Clock, Code, Users, Rocket, Crown, ArrowUpRight, Zap, Heart } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/contexts/SubscriptionContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditsRemaining } from "@/components/dashboard/CreditsRemaining";
import { PremiumModal } from "@/components/PremiumModal";
import { SUBSCRIPTION_TIERS } from "@/lib/subscription-tiers";
import { trackUpgradeClicked } from "@/lib/posthog";
import vidlogicLogo from "@/assets/vidlogic-logo.png";

const mainNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Brand Voices", url: "/brand-voices", icon: Mic },
  { title: "Social Proof", url: "/social-proof", icon: Heart },
];

const proNavItems = [
  { title: "Developer API", url: "/developer", icon: Code },
];

export function AppSidebar() {
  const { tier } = useSubscription();
  const navigate = useNavigate();
  const { setOpenMobile, isMobile } = useSidebar();
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  const [showModal, setShowModal] = useState(false);
  const [modalTier, setModalTier] = useState<"starter" | "pro" | "agency">("pro");

  const openUpgrade = (t: "starter" | "pro" | "agency") => {
    trackUpgradeClicked(t, `sidebar_${tier}_user`);
    if (isMobile) setOpenMobile(false);
    setModalTier(t);
    setShowModal(true);
  };

  return (
    <Sidebar className="border-r border-sidebar-border gradient-sidebar">
      {/* Header with Logo */}
      <SidebarHeader className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img src={vidlogicLogo} alt="VidLogic AI" className="h-[44px] w-[44px] object-contain transition-all duration-300 hover:scale-[1.4] hover:drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
          <div>
            <h1 className="text-xl font-bold text-foreground">VidLogic AI</h1>
            <p className="text-xs text-muted-foreground">Intelligent Content Engine</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-4">
        {/* Featured: History Tab */}
        <SidebarGroup className="px-3 mb-2">
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Recent
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/history"
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sidebar-foreground transition-all duration-200 hover:bg-primary/10 hover:text-foreground group"
                    activeClassName="nav-active bg-primary/15 text-foreground font-medium"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <History className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium block truncate">History</span>
                      <p className="text-xs text-muted-foreground truncate">View past content</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 bg-primary/20 text-primary border-0 text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      New
                    </Badge>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Main Navigation */}
        <SidebarGroup className="px-3">
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent hover:text-foreground"
                      activeClassName="nav-active bg-sidebar-accent text-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Pro Features Navigation */}
        {(tier === "starter" || tier === "pro" || tier === "agency") && (
          <SidebarGroup className="px-3">
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Pro Features
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {proNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent hover:text-foreground"
                        activeClassName="nav-active bg-sidebar-accent text-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4 text-primary" />
                        <span>{item.title}</span>
                        <Badge variant="secondary" className="ml-auto text-xs bg-primary/20 text-primary border-0">
                          Pro
                        </Badge>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Agency Features Navigation */}
        {tier === "agency" && (
          <SidebarGroup className="px-3">
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Team
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/team"
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent hover:text-foreground"
                      activeClassName="nav-active bg-sidebar-accent text-foreground font-medium"
                    >
                      <Users className="h-4 w-4 text-primary" />
                      <span>Team Workspace</span>
                      <Badge variant="secondary" className="ml-auto text-xs bg-primary/20 text-primary border-0">
                        Agency
                      </Badge>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer with Credits and Upgrades */}
      <SidebarFooter className="p-4 border-t border-sidebar-border space-y-2">
        <CreditsRemaining />

        {tier !== "agency" && (
          <Button
            variant="outline"
            onClick={() => openUpgrade("agency")}
            className="w-full relative overflow-hidden border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 hover:from-primary/20 hover:via-primary/10 hover:to-primary/20 text-foreground hover:text-foreground transition-all duration-300"
          >
            <Rocket className="h-4 w-4 mr-2" />
            Upgrade to Agency
            <ArrowUpRight className="h-3.5 w-3.5 ml-auto opacity-70" />
          </Button>
        )}

        {(tier === "free" || tier === "starter") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openUpgrade("pro")}
            className="w-full text-primary/80 hover:text-primary hover:bg-primary/10 transition-all"
          >
            <Crown className="h-4 w-4 mr-2 text-primary" />
            Upgrade to Pro
            <ArrowUpRight className="h-3 w-3 ml-auto text-primary/50" />
          </Button>
        )}

        {tier === "free" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openUpgrade("starter")}
            className="w-full text-secondary-foreground/80 hover:text-secondary-foreground hover:bg-secondary/20 transition-all"
          >
            <Zap className="h-4 w-4 mr-2 text-secondary-foreground" />
            Upgrade to Starter
            <ArrowUpRight className="h-3 w-3 ml-auto text-secondary-foreground/50" />
          </Button>
        )}

        <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-sidebar-accent/50">
          <Badge
            variant="outline"
            className={`text-xs ${tier === "agency" ? "bg-gradient-to-r from-primary/20 to-primary/10 border-primary/30 text-primary" : "border-primary/30 text-primary"}`}
          >
            {tierConfig.name} Plan
          </Badge>
        </div>
      </SidebarFooter>

      <PremiumModal open={showModal} onOpenChange={setShowModal} tier={modalTier} />
    </Sidebar>
  );
}
