import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { FileSignature, LogOut, KeyRound } from "lucide-react";

type SiteHeaderProps = {
  /** Show user-area links (Dashboard, Passkeys, Sign out). Default true. */
  authed?: boolean;
  /** Optional right-side custom slot. */
  rightSlot?: React.ReactNode;
};

/**
 * Sticky site header used across authenticated pages.
 * Keep server-friendly: no client hooks, no JS state.
 */
export function SiteHeader({ authed = true, rightSlot }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <Link
          href={authed ? "/dashboard" : "/"}
          className="group inline-flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background transition-transform group-hover:scale-[1.04]">
            <FileSignature className="h-4 w-4" />
          </span>
          <span>We Agree</span>
        </Link>

        <nav className="flex items-center gap-1">
          {rightSlot}
          {authed && (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="gap-1.5">
                <Link href="/settings/passkeys">
                  <KeyRound className="h-3.5 w-3.5" />
                  Passkeys
                </Link>
              </Button>
              <ThemeToggle />
              <form action="/auth/signout" method="post">
                <Button type="submit" variant="ghost" size="icon" title="Sign out">
                  <LogOut className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
          {!authed && <ThemeToggle />}
        </nav>
      </div>
    </header>
  );
}
