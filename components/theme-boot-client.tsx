"use client";

import { useEffect } from "react";

type ThemeBootProps = {
  script: string;
};

export function ThemeBoot({ script }: ThemeBootProps) {
  useEffect(() => {
    if (!script.trim()) return;

    const el = document.createElement("script");
    el.innerHTML = script;
    document.head.appendChild(el);

    return () => {
      el.remove();
    };
  }, [script]);

  return null;
}
