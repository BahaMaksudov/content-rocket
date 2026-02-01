import { Home, History, Mic, Sparkles, Clock, Code } from "lucide-react";
import { NavLink } from "@/components/NavLink";
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
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { UpgradeButton } from "@/components/dashboard/UpgradeButton";
import { CreditsRemaining } from "@/components/dashboard/CreditsRemaining";
import { SUBSCRIPTION_TIERS } from "@/lib/subscription-tiers";

const mainNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Brand Voices", url: "/brand-voices", icon: Mic },
];

const proNavItems = [
  { title: "Developer API", url: "/developer", icon: Code },
];

export function AppSidebar() {
  const { tier } = useSubscription();
  const tierConfig = SUBSCRIPTION_TIERS[tier];

  return (
    <Sidebar className="border-r border-sidebar-border gradient-sidebar">
      {/* Header with Logo */}
      <SidebarHeader className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary premium-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Rocket Content</h1>
            <p className="text-xs text-muted-foreground">Content Studio</p>
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
        {(tier === "pro" || tier === "agency") && (
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
      </SidebarContent>

      {/* Footer with Credits and Upgrade */}
      <SidebarFooter className="p-4 border-t border-sidebar-border space-y-3">
        {/* Credits Remaining */}
        <CreditsRemaining />
        
        {/* Upgrade Button */}
        <div className="flex justify-center">
          <UpgradeButton />
        </div>

        {/* Current Plan Indicator */}
        <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-sidebar-accent/50">
          <Badge 
            variant="outline" 
            className={`text-xs ${tier === "agency" ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400" : "border-primary/30 text-primary"}`}
          >
            {tierConfig.name} Plan
          </Badge>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
