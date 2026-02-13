import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-semibold">Secure Agreement Platform</h1>
      <p className="mt-2 text-muted-foreground">Trust & Immutability for digital agreements.</p>
      <Link href="/login" className="mt-6 text-primary underline">
        Go to Login
      </Link>
    </main>
  );
}
