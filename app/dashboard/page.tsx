import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileText,
  PlusCircle,
  Clock,
  CheckCircle,
  FileCheck,
  LogOut,
} from "lucide-react";
import type { Agreement, AgreementStatus } from "@/lib/types/database";

export const dynamic = "force-dynamic";

type AgreementRow = Pick<Agreement, "id" | "title" | "status" | "created_at">;

async function getMyAgreements(): Promise<{
  drafts: AgreementRow[];
  pending: AgreementRow[];
  signed: AgreementRow[];
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { drafts: [], pending: [], signed: [] };

    const { data: rows } = await supabase
      .from("agreements")
      .select("id, title, status, created_at")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    const list = (rows ?? []) as AgreementRow[];
    return {
      drafts: list.filter((r) => r.status === "draft"),
      pending: list.filter((r) => r.status === "pending"),
      signed: list.filter((r) => r.status === "signed"),
    };
  } catch {
    return { drafts: [], pending: [], signed: [] };
  }
}

function StatusBadge({ status }: { status: AgreementStatus | string }) {
  const map: Record<AgreementStatus, { label: string; icon: typeof FileText; className: string }> = {
    draft: { label: "Draft", icon: FileText, className: "bg-muted text-muted-foreground" },
    pending: { label: "Pending", icon: Clock, className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
    signed: { label: "Signed", icon: CheckCircle, className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
    voided: { label: "Voided", icon: FileText, className: "bg-destructive/10 text-destructive" },
  };
  const s = status as AgreementStatus;
  const { label, icon: Icon, className } = map[s] ?? map.draft;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function AgreementCard({ agreement }: { agreement: AgreementRow }) {
  return (
    <Link href={`/dashboard/${agreement.id}`}>
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
  const { drafts, pending, signed } = await getMyAgreements();

  return (
    <main className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
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

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-medium">
            <Clock className="h-5 w-5" />
            Pending
          </h2>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending agreements.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {pending.map((a) => (
                <AgreementCard key={a.id} agreement={a as AgreementRow} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-medium">
            <FileCheck className="h-5 w-5" />
            Signed
          </h2>
          {signed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No signed agreements yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {signed.map((a) => (
                <AgreementCard key={a.id} agreement={a as AgreementRow} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-medium">
            <FileText className="h-5 w-5" />
            Drafts
          </h2>
          {drafts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No drafts.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {drafts.map((a) => (
                <AgreementCard key={a.id} agreement={a as AgreementRow} />
              ))}
            </div>
          )}
        </section>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/" className="underline">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
