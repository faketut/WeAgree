import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  PlusCircle,
  Clock,
  CheckCircle,
  FileCheck,
  LogOut,
} from "lucide-react";
import type { AgreementStatus } from "@/lib/types/database";

export const dynamic = "force-dynamic";

type DashboardAgreement = {
  id: string;
  title: string;
  status: AgreementStatus;
  created_at: string;
};

async function getMyAgreements(): Promise<{
  pending: DashboardAgreement[];
  signed: DashboardAgreement[];
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { pending: [], signed: [] };

    const { data: rows, error } = await supabase
      .from("agreements")
      .select("id, title, status, created_at")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    if (error || !rows) return { pending: [], signed: [] };

    const list: DashboardAgreement[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status as AgreementStatus,
      created_at: r.created_at,
    }));

    return {
      pending: list.filter((a) => a.status === "pending"),
      signed: list.filter((a) => a.status === "signed"),
    };
  } catch {
    return { pending: [], signed: [] };
  }
}

const STATUS_CONFIG: Record<
  AgreementStatus,
  { label: string; icon: typeof FileText; variant: "secondary" | "destructive" | "default" | "outline"; className?: string }
> = {
  pending: { label: "Pending", icon: Clock, variant: "outline", className: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" },
  signed: { label: "Signed", icon: CheckCircle, variant: "default", className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" },
  voided: { label: "Voided", icon: FileText, variant: "destructive" },
};

function StatusBadge({ status }: { status: AgreementStatus }) {
  const { label, icon: Icon, variant, className } = STATUS_CONFIG[status];
  return (
    <Badge variant={variant} className={className}>
      <Icon className="mr-1 h-3 w-3" />
      {label}
    </Badge>
  );
}

function AgreementCard({ agreement }: { agreement: DashboardAgreement }) {
  return (
    <Link href={`/dashboard/${agreement.id}`} className="block">
      <Card className="transition-colors hover:bg-muted/50">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base line-clamp-1">{agreement.title}</CardTitle>
            <StatusBadge status={agreement.status} />
          </div>
          <CardDescription>
            {new Date(agreement.created_at).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}

export default async function DashboardPage() {
  const { pending, signed } = await getMyAgreements();

  return (
    <main className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Manage your agreements</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild>
              <Link href="/create" className="inline-flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                New Agreement
              </Link>
            </Button>
            <form action="/auth/signout" method="post">
              <Button type="submit" variant="ghost" size="icon" title="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </header>

        <Separator />

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Pending
          </h2>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending agreements.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {pending.map((a) => (
                <AgreementCard key={a.id} agreement={a} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FileCheck className="h-5 w-5 text-muted-foreground" />
            Signed
          </h2>
          {signed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No signed agreements yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {signed.map((a) => (
                <AgreementCard key={a.id} agreement={a} />
              ))}
            </div>
          )}
        </section>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/" className="underline underline-offset-4 hover:text-foreground">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
