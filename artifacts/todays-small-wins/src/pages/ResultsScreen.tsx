export default function ResultsScreen() {
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center" data-testid="results-screen">
      <span className="text-5xl mb-4">📊</span>
      <h2 className="text-xl font-bold text-foreground mb-2">Your Results</h2>
      <p className="text-muted-foreground text-sm max-w-xs">
        See your wellness trends and summaries here. This view is coming soon.
      </p>
    </div>
  );
}
