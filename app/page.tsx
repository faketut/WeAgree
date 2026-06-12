import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import {
  ArrowRight,
  ShieldCheck,
  Fingerprint,
  Link2,
  PenTool,
  FileText,
  CheckCircle2,
} from "lucide-react";

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
        {/* Hero — editorial, paper, no glow */}
        <section className="border-b border-border bg-paper">
          <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pb-24 pt-20 text-center md:pt-28">
            <p className="eyebrow mb-6">A record you can verify</p>

            <h1 className="text-balance font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
              Agreements,
              <br />
              <span className="italic text-primary">on the record.</span>
            </h1>

            <p className="text-pretty mt-7 max-w-xl font-serif text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Draft, share, and sign agreements bound to a passkey on the signer&rsquo;s own device,
              with an immutable on-chain audit trail anyone can verify.
            </p>

            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
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

            <p className="mt-6 text-xs text-muted-foreground">
              Sign in with GitHub · no credit card required
            </p>
          </div>
        </section>

        {/* Trust pillars — hairline-divided, document-style three column */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-5xl px-4 py-14 md:py-20">
            <p className="eyebrow mb-8 text-center">Three guarantees</p>
            <div className="grid gap-px overflow-hidden border-y border-border bg-border sm:grid-cols-3">
              <Pillar
                icon={<Fingerprint className="h-5 w-5" />}
                title="Passkey-signed"
                body="Every signature is bound to a WebAuthn passkey on the signer's own device. No shared secrets. No copy-paste."
              />
              <Pillar
                icon={<ShieldCheck className="h-5 w-5" />}
                title="Tamper-evident"
                body="Content is hashed with canonical JSON and Ed25519-signed. Any change — a comma, a date — breaks the proof."
              />
              <Pillar
                icon={<Link2 className="h-5 w-5" />}
                title="On-chain anchored"
                body="Final proof hashes are anchored on a public ledger. Verifiable by anyone, forever, without us."
              />
            </div>
          </div>
        </section>

        {/* Workflow — three steps, numbered serif, hairline rules */}
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-5xl px-4 py-14 md:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="eyebrow mb-4">How it works</p>
              <h2 className="text-balance font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                Draft. Sign. Anchor.
              </h2>
              <p className="mt-4 text-pretty text-muted-foreground">
                Three steps, no third-party identity vendor, no email-link signature ceremony.
              </p>
            </div>
            <ol className="mt-12 grid gap-8 sm:grid-cols-3">
              <Step
                n={1}
                icon={<FileText className="h-4 w-4" />}
                title="Draft"
                body="Author in plain Markdown. Insert {{signature}} spots where parties must sign."
              />
              <Step
                n={2}
                icon={<PenTool className="h-4 w-4" />}
                title="Sign"
                body="Each party signs with their passkey. Their device produces an Ed25519 signature over the canonical document hash."
              />
              <Step
                n={3}
                icon={<CheckCircle2 className="h-4 w-4" />}
                title="Anchor"
                body="When all parties have signed, the final proof hash is written on-chain. Export a one-page receipt anyone can verify offline."
              />
            </ol>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center md:py-24">
            <p className="divider-ornament mb-6 text-xs">§</p>
            <h2 className="text-balance font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              Make your next agreement{" "}
              <span className="italic text-primary">provable</span>.
            </h2>
            <p className="mt-5 text-pretty text-muted-foreground">
              No more &ldquo;trust me, the PDF is unchanged.&rdquo; A proof anyone can verify, on a
              public ledger.
            </p>
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link href="/login">
                  Get started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer>
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} We Agree</span>
            <Link href="/login" className="transition-colors hover:text-foreground">
              Sign in →
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}

function Pillar({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col gap-3 bg-background p-7">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-border bg-card text-primary">
        {icon}
      </div>
      <div className="space-y-1.5">
        <h3 className="font-serif text-lg font-semibold tracking-tight">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  body,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="flex flex-col gap-3 border-t border-border pt-6 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 sm:first:border-l-0 sm:first:pl-0">
      <div className="flex items-baseline gap-3">
        <span className="font-serif text-3xl font-semibold leading-none text-primary">
          {String(n).padStart(2, "0")}
        </span>
        <div className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-border text-muted-foreground">
          {icon}
        </div>
      </div>
      <div className="space-y-1.5">
        <h3 className="font-serif text-lg font-semibold tracking-tight">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </li>
  );
}
