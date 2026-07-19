"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
type Theme = "light" | "dark";
export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    const saved = localStorage.getItem("mirqo-theme");
    const initial =
      saved === "dark" || saved === "light"
        ? saved
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
    setMounted(true);
  }, []);
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("mirqo-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Use light mode" : "Use dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
    >
      {mounted && theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
