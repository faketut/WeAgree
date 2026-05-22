import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileSignature, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="mx-auto max-w-2xl space-y-8 text-center">
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center rounded-lg bg-primary/10 p-3">
            <FileSignature className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            We Agree
          </h1>
          <p className="text-lg text-muted-foreground">
            Create, share, and sign agreements with trust and immutability.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link href="/login">
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link href="/login?redirectTo=/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Sign in with GitHub to create agreements and collect signatures.
        </p>
      </div>
    </main>
  );
}
