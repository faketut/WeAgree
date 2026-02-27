import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  PlusCircle,
  Clock,
  CheckCircle,
  FileCheck,
  LogOut,
  FileCog,
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
  Edit3,
} from "lucide-react";
import type { AgreementStatus } from "@/lib/types/database";
import { deleteAgreement } from "@/app/actions/agreements";
import { deleteTemplate } from "@/app/actions/templates";

export const dynamic = "force-dynamic";

type DashboardAgreementRow = {
  id: string;
  title: string;
  status: AgreementStatus;
  created_at: string;
  signed_at: string | null;
  required_signatures: number | null;
};

type DashboardTemplateRow = {
  id: string;
  title: string;
  created_at: string | null;
};

type SearchParams = Record<string, string | string[] | undefined>;

const PAGE_SIZE = 10;

const STATUS_CONFIG: Record<
  AgreementStatus,
  {
    label: string;
    icon: typeof FileText;
    variant: "secondary" | "destructive" | "default" | "outline";
    className?: string;
  }
> = {
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

function StatusBadge({ status }: { status: AgreementStatus }) {
  const { label, icon: Icon, variant, className } = STATUS_CONFIG[status];
  return (
    <Badge variant={variant} className={className}>
      <Icon className="mr-1 h-3 w-3" />
      {label}
    </Badge>
  );
}

function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = raw ? Number.parseInt(raw, 10) : 1;
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

function buildHref(
  searchParams: SearchParams,
  updates: Partial<Record<"search" | "pendingPage" | "signedPage" | "templatesPage", string>>
): string {
  const params = new URLSearchParams();

  const entries = Object.entries(searchParams);
  for (const [key, value] of entries) {
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        params.append(key, v);
      }
    } else {
      params.set(key, value);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (!value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }

  const qs = params.toString();
  return qs ? `/dashboard?${qs}` : "/dashboard";
}

function PaginationControls({
  page,
  total,
  pageParam,
  searchParams,
}: {
  page: number;
  total: number | null;
  pageParam: "pendingPage" | "signedPage" | "templatesPage";
  searchParams: SearchParams;
}) {
  if (!total || total <= PAGE_SIZE) {
    return null;
  }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="flex items-center justify-between gap-2 pt-3 text-xs text-muted-foreground">
      <span>
        Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <Button
          asChild
          size="icon"
          variant="outline"
          disabled={!hasPrev}
          className="h-7 w-7"
        >
          <Link
            href={
              hasPrev
                ? buildHref(searchParams, { [pageParam]: String(page - 1) })
                : "#"
            }
            aria-disabled={!hasPrev}
          >
            <ChevronLeft className="h-3 w-3" />
          </Link>
        </Button>
        <Button
          asChild
          size="icon"
          variant="outline"
          disabled={!hasNext}
          className="h-7 w-7"
        >
          <Link
            href={
              hasNext
                ? buildHref(searchParams, { [pageParam]: String(page + 1) })
                : "#"
            }
            aria-disabled={!hasNext}
          >
            <ChevronRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function SearchBox({ searchParams }: { searchParams: SearchParams }) {
  const searchValueRaw = searchParams.search;
  const searchValue = Array.isArray(searchValueRaw)
    ? searchValueRaw[0] ?? ""
    : searchValueRaw ?? "";

  return (
    <form
      method="get"
      className="flex w-full max-w-md items-center gap-2"
    >
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          name="search"
          defaultValue={searchValue}
          placeholder="Search agreements and templates…"
          className="pl-8"
        />
      </div>
      <Button type="submit" variant="outline" size="sm">
        Search
      </Button>
    </form>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const searchRaw = sp.search;
  const search =
    typeof searchRaw === "string"
      ? searchRaw.trim()
      : Array.isArray(searchRaw)
        ? (searchRaw[0] ?? "").trim()
        : "";

  const pendingPage = parsePage(sp.pendingPage);
  const signedPage = parsePage(sp.signedPage);
  const templatesPage = parsePage(sp.templatesPage);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">
          You must be signed in to view your dashboard.
        </p>
      </main>
    );
  }

  const basePendingQuery = supabase
    .from("agreements")
    .select(
      "id, title, status, created_at, signed_at, required_signatures",
      { count: "exact" }
    )
    .eq("creator_id", user.id)
    .eq("status", "pending");

  const baseSignedQuery = supabase
    .from("agreements")
    .select(
      "id, title, status, created_at, signed_at, required_signatures",
      { count: "exact" }
    )
    .eq("creator_id", user.id)
    .eq("status", "signed");

  const baseTemplatesQuery = supabase
    .from("templates")
    .select("id, title, created_at", { count: "exact" })
    .eq("user_id", user.id);

  const pendingQuery = search
    ? basePendingQuery.ilike("title", `%${search}%`)
    : basePendingQuery;
  const signedQuery = search
    ? baseSignedQuery.ilike("title", `%${search}%`)
    : baseSignedQuery;
  const templatesQuery = search
    ? baseTemplatesQuery.ilike("title", `%${search}%`)
    : baseTemplatesQuery;

  const pendingFrom = (pendingPage - 1) * PAGE_SIZE;
  const signedFrom = (signedPage - 1) * PAGE_SIZE;
  const templatesFrom = (templatesPage - 1) * PAGE_SIZE;

  const [pendingRes, signedRes, templatesRes] = await Promise.all([
    pendingQuery
      .order("created_at", { ascending: false })
      .range(pendingFrom, pendingFrom + PAGE_SIZE - 1),
    signedQuery
      .order("created_at", { ascending: false })
      .range(signedFrom, signedFrom + PAGE_SIZE - 1),
    templatesQuery
      .order("created_at", { ascending: false })
      .range(templatesFrom, templatesFrom + PAGE_SIZE - 1),
  ]);

  const pending: DashboardAgreementRow[] =
    pendingRes.data?.map((r: any) => ({
      id: r.id as string,
      title: r.title as string,
      status: r.status as AgreementStatus,
      created_at: r.created_at as string,
      signed_at: (r.signed_at as string | null) ?? null,
      required_signatures:
        typeof r.required_signatures === "number"
          ? (r.required_signatures as number)
          : null,
    })) ?? [];
  const pendingTotal = pendingRes.count ?? null;

  const signed: DashboardAgreementRow[] =
    signedRes.data?.map((r: any) => ({
      id: r.id as string,
      title: r.title as string,
      status: r.status as AgreementStatus,
      created_at: r.created_at as string,
      signed_at: (r.signed_at as string | null) ?? null,
      required_signatures:
        typeof r.required_signatures === "number"
          ? (r.required_signatures as number)
          : null,
    })) ?? [];
  const signedTotal = signedRes.count ?? null;

  const templates: DashboardTemplateRow[] =
    templatesRes.data?.map((t: any) => ({
      id: t.id as string,
      title: t.title as string,
      created_at: (t.created_at as string | null) ?? null,
    })) ?? [];
  const templatesTotal = templatesRes.count ?? null;

  return (
    <main className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your agreements and templates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild>
              <Link href="/create" className="inline-flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                New Agreement
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link
                href="/templates/new"
                className="inline-flex items-center gap-2"
              >
                <FileCog className="h-4 w-4" />
                New Template
              </Link>
            </Button>
            <form action="/auth/signout" method="post">
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <SearchBox searchParams={sp} />
        </div>

        <Separator />

        {/* Pending agreements table */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Pending agreements
            </h2>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                Agreements awaiting all required signatures. You can delete
                pending agreements you no longer need.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pending.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pending agreements.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="py-2 pr-4 text-left font-medium">
                          Title
                        </th>
                        <th className="py-2 px-4 text-left font-medium">
                          Created
                        </th>
                        <th className="py-2 px-4 text-left font-medium">
                          Status
                        </th>
                        <th className="py-2 px-4 text-left font-medium">
                          Signatures
                        </th>
                        <th className="py-2 pl-4 text-right font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pending.map((a) => (
                        <tr
                          key={a.id}
                          className="border-b last:border-0 hover:bg-muted/40"
                        >
                          <td className="py-2 pr-4 align-middle">
                            <Link
                              href={`/dashboard/${a.id}`}
                              className="line-clamp-1 font-medium hover:underline"
                            >
                              {a.title}
                            </Link>
                          </td>
                          <td className="py-2 px-4 align-middle text-xs text-muted-foreground">
                            {new Date(a.created_at).toLocaleString()}
                          </td>
                          <td className="py-2 px-4 align-middle">
                            <StatusBadge status={a.status} />
                          </td>
                          <td className="py-2 px-4 align-middle text-xs text-muted-foreground">
                            {a.required_signatures ?? 1} required
                          </td>
                          <td className="py-2 pl-4 align-middle text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                              >
                                <Link href={`/dashboard/${a.id}`}>View</Link>
                              </Button>
                              <form
                                action={async () => {
                                  "use server";
                                  await deleteAgreement(a.id);
                                }}
                              >
                                <Button
                                  type="submit"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive"
                                  title="Delete pending agreement"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <PaginationControls
                    page={pendingPage}
                    total={pendingTotal}
                    pageParam="pendingPage"
                    searchParams={sp}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Signed agreements table */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <FileCheck className="h-5 w-5 text-muted-foreground" />
              Signed agreements
            </h2>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                Finalized agreements that have collected all required
                signatures. These are read-only.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {signed.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No signed agreements yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="py-2 pr-4 text-left font-medium">
                          Title
                        </th>
                        <th className="py-2 px-4 text-left font-medium">
                          Signed at
                        </th>
                        <th className="py-2 px-4 text-left font-medium">
                          Status
                        </th>
                        <th className="py-2 pl-4 text-right font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {signed.map((a) => (
                        <tr
                          key={a.id}
                          className="border-b last:border-0 hover:bg-muted/40"
                        >
                          <td className="py-2 pr-4 align-middle">
                            <Link
                              href={`/dashboard/${a.id}`}
                              className="line-clamp-1 font-medium hover:underline"
                            >
                              {a.title}
                            </Link>
                          </td>
                          <td className="py-2 px-4 align-middle text-xs text-muted-foreground">
                            {a.signed_at
                              ? new Date(a.signed_at).toLocaleString()
                              : "—"}
                          </td>
                          <td className="py-2 px-4 align-middle">
                            <StatusBadge status={a.status} />
                          </td>
                          <td className="py-2 pl-4 align-middle text-right">
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                            >
                              <Link href={`/dashboard/${a.id}`}>View</Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <PaginationControls
                    page={signedPage}
                    total={signedTotal}
                    pageParam="signedPage"
                    searchParams={sp}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Templates table */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <FileCog className="h-5 w-5 text-muted-foreground" />
              Templates
            </h2>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                Reusable agreement templates. Create, edit, or delete templates
                from here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No templates yet. Create one to reuse its content when
                  drafting agreements.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="py-2 pr-4 text-left font-medium">
                          Title
                        </th>
                        <th className="py-2 px-4 text-left font-medium">
                          Created
                        </th>
                        <th className="py-2 pl-4 text-right font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {templates.map((t) => (
                        <tr
                          key={t.id}
                          className="border-b last:border-0 hover:bg-muted/40"
                        >
                          <td className="py-2 pr-4 align-middle">
                            <Link
                              href={`/templates/${t.id}/edit`}
                              className="line-clamp-1 font-medium hover:underline"
                            >
                              {t.title}
                            </Link>
                          </td>
                          <td className="py-2 px-4 align-middle text-xs text-muted-foreground">
                            {t.created_at
                              ? new Date(t.created_at).toLocaleString()
                              : "—"}
                          </td>
                          <td className="py-2 pl-4 align-middle text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                asChild
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                title="Edit template"
                              >
                                <Link href={`/templates/${t.id}/edit`}>
                                  <Edit3 className="h-4 w-4" />
                                </Link>
                              </Button>
                              <form
                                action={async () => {
                                  "use server";
                                  await deleteTemplate(t.id);
                                }}
                              >
                                <Button
                                  type="submit"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive"
                                  title="Delete template"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <PaginationControls
                    page={templatesPage}
                    total={templatesTotal}
                    pageParam="templatesPage"
                    searchParams={sp}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}

