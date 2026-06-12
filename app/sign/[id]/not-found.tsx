import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileQuestion } from "lucide-react";

export default function SignNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper p-4">
      <Card className="w-full max-w-md border-border shadow-paper">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-sm border border-border bg-muted text-muted-foreground">
            <FileQuestion className="h-6 w-6" />
          </div>
          <p className="eyebrow">404 &middot; agreement</p>
          <CardTitle className="font-serif text-2xl font-semibold tracking-tight">
            Signing link invalid
          </CardTitle>
          <CardDescription className="text-pretty">
            This link may be wrong, or the agreement may have been removed or already signed. Ask
            the sender for a new link.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild size="lg">
            <Link href="/">Back to home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
