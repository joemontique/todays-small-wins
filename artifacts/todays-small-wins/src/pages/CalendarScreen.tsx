export default function CalendarScreen() {
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center" data-testid="calendar-screen">
      <span className="text-5xl mb-4">📅</span>
      <h2 className="text-xl font-bold text-foreground mb-2">Calendar</h2>
      <p className="text-muted-foreground text-sm max-w-xs">
        Browse your daily logs and wins by date. Calendar view coming soon.
      </p>
    </div>
  );
}
