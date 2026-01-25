import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className={cn("min-h-screen p-8", "bg-background text-white")}>
      <main className="flex flex-col gap-8 items-center">
        <h1 className="text-4xl font-bold">Tracking Dashboard</h1>
        <div className={cn("p-6 rounded", "bg-surface border border-border")}>
          <p className="mb-4">Theme configuration test:</p>
          <ul className="space-y-2">
            <li>Background: <span className="text-accent-purple">#1a1a1a</span></li>
            <li>Surface: <span className="text-accent-purple">#2d2d2d</span></li>
            <li>Accent: <span className="text-accent-purple">#8B5CF6</span></li>
          </ul>
        </div>
      </main>
    </div>
  );
}
