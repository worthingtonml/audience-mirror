// app/results/page.tsx
import MetricHelpButton from "../components/MetricHelpButton";

export default function ResultsPage() {
  return (
    <main className="p-6">
      <header className="mb-3">
        <h1 className="text-3xl font-bold">Market Intelligence Dashboard</h1>
        <p className="mt-2 text-gray-600 max-w-4xl">
          We analyzed your patient data and ranked ZIP codes by how closely they match your best customers'
          demographics, spending patterns, and location preferences. Each area below shows match scores,
          local competition levels, distance from your practice, and projected patient volume.
        </p>
      </header>

      {/* Black button between intro and Top Target Areas */}
      <div className="mb-6">
        <MetricHelpButton />
      </div>

      <h2 className="text-2xl font-bold mb-4">Top Target Areas</h2>
      {/* render your cards/grid here */}
    </main>
  );
}
