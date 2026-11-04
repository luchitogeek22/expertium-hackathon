import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";

/** Tema oscuro/claro con persistencia y clase en <html>. */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("expertium-theme", theme);
    } catch {
      /* almacenamiento no disponible */
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggle };
}
