import { type WellnessEvent } from "@/lib/eventSystem";

interface DebugPanelProps {
  events: WellnessEvent[];
  dayKey: string;
  wins: number;
}

export default function DebugPanel({ events, dayKey, wins }: DebugPanelProps) {
  return (
    <div
      className="fixed inset-x-3 bottom-24 z-50 bg-card border border-border rounded-2xl shadow-xl p-4 overflow-y-auto max-h-72 text-xs"
      data-testid="debug-panel"
    >
      <p className="font-bold text-amber-700 mb-2 text-sm">🐛 Debug Panel</p>
      <div className="space-y-1 text-muted-foreground">
        <div className="flex gap-2">
          <span className="font-semibold text-foreground">day_key:</span>
          <span data-testid="debug-day-key">{dayKey}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold text-foreground">wins:</span>
          <span data-testid="debug-wins">{wins}</span>
        </div>
        <div>
          <span className="font-semibold text-foreground">events ({events.length}):</span>
          <pre
            className="mt-1 bg-muted rounded-lg p-2 overflow-x-auto text-[10px] leading-relaxed"
            data-testid="debug-events"
          >
            {JSON.stringify(events, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
