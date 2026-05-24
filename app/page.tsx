import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { ArrowRight, ShieldCheck, Fingerprint, Link2, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader
        authed={false}
        rightSlot={
          <>
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/login">
                Get started
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </>
        }
      />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.35]" />
          <div className="pointer-events-none absolute inset-0 bg-spotlight" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background" />
          <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 pb-20 pt-24 text-center md:pt-32">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <Sparkles className="h-3 w-3" />
              Cryptographic agreements, made simple
            </div>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Agreements you can{" "}
              <span className="bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                actually trust.
              </span>
            </h1>
            <p className="text-balance mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Draft, share, and sign agreements with passkey-backed digital signatures and an
              immutable on-chain audit trail.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link href="/login">
                  Get started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login?redirectTo=/dashboard">Open dashboard</Link>
              </Button>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              Sign in with GitHub · no credit card required
            </p>
          </div>
        </section>

        {/* Trust pillars */}
        <section className="border-t border-border/60 bg-muted/30">
          <div className="mx-auto grid max-w-5xl gap-px overflow-hidden bg-border sm:grid-cols-3">
            <Feature
              icon={<Fingerprint className="h-5 w-5" />}
              title="Passkey-signed"
              body="Every signature is bound to a WebAuthn passkey on the signer's own device. No shared secrets."
            />
            <Feature
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Tamper-evident"
              body="Content is hashed with canonical JSON and Ed25519-signed. Any change breaks the proof."
            />
            <Feature
              icon={<Link2 className="h-5 w-5" />}
              title="On-chain anchored"
              body="Final proof hashes are anchored on a public ledger so anyone can verify, forever."
            />
          </div>
        </section>

        {/* Footer mark */}
        <section className="border-t border-border/60">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} We Agree</span>
            <Link href="/login" className="hover:text-foreground">
              Sign in →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col gap-3 bg-background p-6">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-foreground">
        {icon}
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
