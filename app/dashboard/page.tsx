import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">You are logged in.</p>
      <Link href="/" className="mt-6 text-primary underline">
        Back to home
      </Link>
    </main>
  );
}
