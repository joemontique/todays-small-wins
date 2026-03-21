export default function ProgressScreen() {
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center" data-testid="progress-screen">
      <span className="text-5xl mb-4">📈</span>
      <h2 className="text-xl font-bold text-foreground mb-2">Your Progress</h2>
      <p className="text-muted-foreground text-sm max-w-xs">
        Track streaks, milestones, and long-term wellness progress here. Coming soon.
      </p>
    </div>
  );
}
