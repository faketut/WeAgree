import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, FileText } from "lucide-react";
import type { AgreementStatus } from "@/lib/types/database";

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
    variant: "secondary",
    className:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    variant: "outline",
    className:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  },
  signed: {
    label: "Signed",
    icon: CheckCircle,
    variant: "default",
    className:
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  },
  voided: { label: "Voided", icon: FileText, variant: "destructive" },
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
    <Badge variant={cfg.variant} className={[cfg.className, className].filter(Boolean).join(" ")}>
      <Icon className="mr-1 h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}
