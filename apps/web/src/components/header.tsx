import { Link } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

export default function Header() {
  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-2">
      <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
        <LayoutDashboard className="h-5 w-5" />
        <span>QuickBoard</span>
      </Link>
      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}
