interface HeaderProps {
  wins: number;
  onLoginClick: () => void;
  showLoginButton: boolean;
}

export default function Header({ wins, onLoginClick, showLoginButton }: HeaderProps) {
  return (
    <header
      className="fixed top-0 left-0 right-0 max-w-md mx-auto z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between"
      data-testid="header"
    >
      <div className="flex flex-col">
        <span className="text-base font-semibold text-foreground leading-tight tracking-tight">
          Today's Small Wins
        </span>
        <span
          className="text-sm text-amber-600 font-medium"
          data-testid="text-win-count"
        >
          ✨ {wins} {wins === 1 ? "win" : "wins"}
        </span>
      </div>

      {showLoginButton && (
        <button
          onClick={onLoginClick}
          className="text-sm font-medium bg-primary text-primary-foreground rounded-full px-4 py-1.5 hover:opacity-90 active:scale-95 transition-all"
          data-testid="button-login"
        >
          Log In
        </button>
      )}
    </header>
  );
}
