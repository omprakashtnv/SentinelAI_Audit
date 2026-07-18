import { useEffect, useMemo, useState } from "react";

import { useTheme } from "@/app/theme/theme-provider";

export function useMonacoTheme() {
  const { theme } = useTheme();
  const [systemDark, setSystemDark] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return useMemo(() => {
    if (theme === "dark" || (theme === "system" && systemDark)) {
      return "vs-dark";
    }

    return "light";
  }, [systemDark, theme]);
}
