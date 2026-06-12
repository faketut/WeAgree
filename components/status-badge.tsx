import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, FileText, Ban } from "lucide-react";
import type { AgreementStatus } from "@/lib/types/database";

// Editorial Legal status palette:
// - draft   : neutral ink on paper, hairline border
// - pending : burnt-amber on warm cream (uses --warning channel)
// - signed  : deep moss on parchment    (uses --success channel)
// - voided  : oxblood/destructive
export const STATUS_CONFIG: Record<
  AgreementStatus,
  {
    label: string;
    icon: typeof FileText;
    variant: "secondary" | "destructive" | "default" | "outline";
    className?: string;
  }
> = {
  draft: {
    label: "Draft",
    icon: FileText,
    variant: "outline",
    className:
      "border-border bg-muted/60 text-muted-foreground",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    variant: "outline",
    className:
      "border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.10)] text-[hsl(var(--warning))]",
  },
  signed: {
    label: "Signed",
    icon: CheckCircle,
    variant: "outline",
    className:
      "border-[hsl(var(--success)/0.35)] bg-[hsl(var(--success)/0.10)] text-[hsl(var(--success))]",
  },
  voided: {
    label: "Voided",
    icon: Ban,
    variant: "outline",
    className:
      "border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.10)] text-[hsl(var(--destructive))]",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: AgreementStatus;
  className?: string;
}) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <Badge
      variant={cfg.variant}
      className={[
        "gap-1.5 rounded-sm px-2 py-0.5 font-medium uppercase tracking-wider text-[10px]",
        cfg.className,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}
