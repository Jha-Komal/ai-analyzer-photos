import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-5">
        {Icon && (
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              tone === "positive" && "bg-positive/10 text-positive",
              tone === "negative" && "bg-negative/10 text-negative",
              tone === "neutral" && "bg-primary-light text-primary",
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div>
          <div className="text-xl font-bold tabular-nums text-foreground">{value}</div>
          <div className="text-xs text-muted">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
