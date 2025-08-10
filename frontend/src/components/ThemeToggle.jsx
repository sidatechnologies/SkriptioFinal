import React from "react";
import { useTheme } from "../theme";
import { Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";

export default function ThemeToggle({ className }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <Button
      variant="ghost"
      className={className}
      aria-label="Toggle theme"
      onClick={toggle}
      title={isDark ? "Switch to light" : "Switch to dark"}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}