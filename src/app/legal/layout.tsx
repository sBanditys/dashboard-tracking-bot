import Link from "next/link";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-foreground/10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            href="/"
            className="text-sm font-medium hover:underline"
          >
            ← Tracking Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="prose prose-invert prose-sm sm:prose-base max-w-none">
          {children}
        </div>
      </main>

      <footer className="border-t border-foreground/10 mt-16">
        <div className="max-w-4xl mx-auto px-4 py-6 text-sm text-foreground/60">
          <p>&copy; {new Date().getFullYear()} Tracking Dashboard. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
