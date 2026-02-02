import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useOrganization } from "@/hooks/use-organization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Users, UserPlus, Crown, Mail, Trash2, Clock, Building2, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ContactSalesModal } from "@/components/landing/ContactSalesModal";

export default function Team() {
  const { user } = useAuth();
  const { isAgency } = useSubscription();
  const {
    organization,
    members,
    invites,
    isAdmin,
    isLoading,
    createOrganization,
    sendInvite,
    removeMember,
    cancelInvite,
    seatLimit,
    seatsUsed,
  } = useOrganization();

  const [orgName, setOrgName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [showContactSales, setShowContactSales] = useState(false);

  // Not on Agency plan
  if (!isAgency) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto">
          <Card className="border-border bg-card text-center">
            <CardContent className="p-12">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Team Workspaces</h2>
              <p className="text-muted-foreground mb-6">
                Collaborate with up to 5 team members on the Agency plan. Share content, brand voices, and work together seamlessly.
              </p>
              <Button asChild>
                <a href="/billing">Upgrade to Agency</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Card className="border-border bg-card">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // No organization yet - create one
  if (!organization) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto">
          <Card className="border-border bg-card">
            <CardHeader className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Create Your Team Workspace</CardTitle>
              <CardDescription>
                Set up a workspace to collaborate with your team. You can invite up to 5 members.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Team Name</label>
                <Input
                  placeholder="e.g., Acme Marketing Team"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                disabled={!orgName.trim() || createOrganization.isPending}
                onClick={() => createOrganization.mutate(orgName.trim())}
              >
                {createOrganization.isPending ? "Creating..." : "Create Team Workspace"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const handleSendInvite = () => {
    if (!inviteEmail.trim()) return;
    
    if (seatsUsed >= seatLimit) {
      setShowContactSales(true);
      return;
    }

    sendInvite.mutate(inviteEmail.trim(), {
      onSuccess: () => setInviteEmail(""),
    });
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              {organization.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your team workspace and invite members
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {seatsUsed} / {seatLimit} seats
          </Badge>
        </div>

        {/* Invite Section */}
        {isAdmin && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Invite Teammate
              </CardTitle>
              <CardDescription>
                Send an invitation email to add a new team member
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  placeholder="teammate@company.com"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendInvite()}
                />
                <Button 
                  onClick={handleSendInvite}
                  disabled={!inviteEmail.trim() || sendInvite.isPending}
                >
                  {sendInvite.isPending ? "Sending..." : "Send Invite"}
                </Button>
              </div>
              {seatsUsed >= seatLimit && (
                <p className="text-sm text-amber-500 mt-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Seat limit reached. 
                  <button 
                    className="underline hover:no-underline"
                    onClick={() => setShowContactSales(true)}
                  >
                    Contact sales for Enterprise
                  </button>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pending Invites */}
        {isAdmin && invites && invites.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Pending Invites
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{invite.email}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Expires {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => cancelInvite.mutate(invite.id)}
                    disabled={cancelInvite.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Team Members */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {members?.map((member) => {
              const profile = member.profiles as { full_name: string | null; email: string | null; avatar_url: string | null } | undefined;
              const isOwner = member.user_id === organization.owner_id;
              const isCurrentUser = member.user_id === user?.id;
              const initials = (profile?.full_name || profile?.email || "?")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {profile?.full_name || profile?.email || "Unknown"}
                        </p>
                        {isOwner && (
                          <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
                            <Crown className="h-3 w-3 mr-1" />
                            Owner
                          </Badge>
                        )}
                        {!isOwner && member.role === "admin" && (
                          <Badge variant="secondary">Admin</Badge>
                        )}
                        {isCurrentUser && (
                          <Badge variant="outline">You</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{profile?.email}</p>
                    </div>
                  </div>
                  
                  {isAdmin && !isOwner && !isCurrentUser && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove team member?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {profile?.full_name || profile?.email} will lose access to the team workspace and shared content.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeMember.mutate(member.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <ContactSalesModal open={showContactSales} onOpenChange={setShowContactSales} />
      </div>
    </AppLayout>
  );
}
