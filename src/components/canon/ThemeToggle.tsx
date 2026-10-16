"use client";

import { CONTROL_CLASS } from "@/constants/canon/ui";
import { useTheme } from "@/hooks/canon/use-theme";
import { cn } from "@/utils/cn";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const toLight = theme === "dark";

  return (
    <button
      aria-label={`Switch to ${toLight ? "light" : "dark"} theme`}
      className={cn(CONTROL_CLASS, "inline-flex w-9 items-center justify-center px-0 sm:w-7")}
      onClick={toggleTheme}
      title={`Switch to ${toLight ? "light" : "dark"} theme`}
      type="button"
    >
      {/* The icon shows where the button takes you, matching its label. */}
      <svg
        aria-hidden="true"
        className="size-3.5 transition-transform duration-[260ms] ease-out motion-reduce:transition-none"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        viewBox="0 0 24 24"
      >
        {toLight ? (
          <>
            <circle cx={12} cy={12} r={4} />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </>
        ) : (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        )}
      </svg>
    </button>
  );
}
