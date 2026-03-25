import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LogOut } from "lucide-react";

interface SignOutConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function SignOutConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
}: SignOutConfirmationModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="animate-scale-in border-border bg-background">
        <AlertDialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <LogOut className="h-6 w-6 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center text-xl">
            Are you sure you want to log out?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-muted-foreground">
            You will need to sign back in to access your VidLogic AI dashboard and AI tools.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2 mt-4">
          <AlertDialogCancel className="w-full sm:w-auto order-2 sm:order-1 bg-primary text-primary-foreground hover:bg-primary/90 border-0">
            Stay Logged In
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="w-full sm:w-auto order-1 sm:order-2 bg-transparent border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
