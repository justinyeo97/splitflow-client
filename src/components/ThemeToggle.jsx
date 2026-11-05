import { useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme || "light",
  );
  const dark = theme === "dark";

  function toggleTheme() {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      localStorage.setItem("splitflow-theme", next);
    } catch {
      // Switching still works when browser storage is unavailable.
    }
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label="Dark mode"
      aria-pressed={dark}
      title={`Switch to ${dark ? "light" : "dark"} mode`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
        strokeLinejoin="round" aria-hidden="true">
        {dark ? <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
        </> : <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />}
      </svg>
      <span>{dark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
