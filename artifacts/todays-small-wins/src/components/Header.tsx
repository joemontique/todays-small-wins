import { Sun, Moon } from "lucide-react";

interface HeaderProps {
  wins: number;
  user: any;
  profile: any;
  sobrietyDays: number | null;
  onLoginClick: () => void;
  onLogout: () => void;
  showLoginButton: boolean;
  theme: "light" | "dark";
  onThemeToggle: () => void;
}

export default function Header({
  wins,
  user,
  profile,
  sobrietyDays,
  onLoginClick,
  onLogout,
  showLoginButton,
  theme,
  onThemeToggle,
}: HeaderProps) {
  const title = user && profile?.name ? `Hey ${profile.name}` : "Today's Small Wins";

  const winLabel = `✨ ${wins} ${wins === 1 ? "win" : "wins"}`;
  const sobrietyLabel =
    user && sobrietyDays !== null ? ` · 🔥 ${sobrietyDays}d sober` : "";

  return (
    <header
      className="fixed top-0 left-0 right-0 max-w-md mx-auto z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between"
      data-testid="header"
    >
      <div className="flex flex-col min-w-0">
        <span className="text-base font-semibold text-foreground leading-tight tracking-tight truncate">
          {title}
        </span>
        <span
          className="text-sm text-amber-600 dark:text-amber-400 font-medium"
          data-testid="text-win-count"
        >
          {winLabel}{sobrietyLabel}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-2">
        <button
          onClick={onThemeToggle}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-muted hover:bg-secondary active:scale-90 transition-all text-foreground"
          aria-label={theme === "dark" ? "Switch to day mode" : "Switch to night mode"}
          data-testid="button-theme-toggle"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {user ? (
          <button
            onClick={onLogout}
            className="text-sm font-medium bg-muted text-foreground rounded-full px-4 py-1.5 hover:bg-secondary active:scale-95 transition-all"
            data-testid="button-logout"
          >
            Log Out
          </button>
        ) : (
          showLoginButton && (
            <button
              onClick={onLoginClick}
              className="text-sm font-medium bg-primary text-primary-foreground rounded-full px-4 py-1.5 hover:opacity-90 active:scale-95 transition-all"
              data-testid="button-login"
            >
              Log In
            </button>
          )
        )}
      </div>
    </header>
  );
}
