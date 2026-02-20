"use client";

import { useEffect } from "react";
import {
  applyThemePreference,
  getStoredThemePreference,
} from "@/lib/theme";

export function ThemeInitializer() {
  useEffect(() => {
    const preference = getStoredThemePreference();
    applyThemePreference(preference);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onMediaChange = () => {
      if (getStoredThemePreference() === "system") {
        applyThemePreference("system");
      }
    };

    media.addEventListener("change", onMediaChange);
    return () => media.removeEventListener("change", onMediaChange);
  }, []);

  return null;
}

