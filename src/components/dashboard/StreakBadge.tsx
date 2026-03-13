import { Progress } from "@/components/ui/progress";
import { Flame } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface StreakBadgeProps {
  currentStreak: number;
  className?: string;
}

export function StreakBadge({ currentStreak, className = "" }: StreakBadgeProps) {
  const streakInCycle = currentStreak % 7;
  const progressPercent = currentStreak === 0 ? 0 : streakInCycle === 0 && currentStreak > 0 ? 100 : (streakInCycle / 7) * 100;
  const daysToBonus = streakInCycle === 0 && currentStreak > 0 ? 0 : 7 - streakInCycle;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border ${className}`}>
          <div className="flex items-center gap-1.5">
            <Flame className={`h-4 w-4 ${currentStreak > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
            <span className="text-sm font-semibold">
              {currentStreak > 0 ? `${currentStreak} Day Streak` : "No Streak"}
            </span>
          </div>
          <div className="w-16">
            <Progress value={progressPercent} className="h-1.5" />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[200px]">
        <p className="text-xs">
          {daysToBonus === 0
            ? "🎉 You earned 5 bonus credits! Keep going!"
            : `Approve content ${daysToBonus} more day${daysToBonus !== 1 ? "s" : ""} in a row to earn 5 bonus credits.`}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
