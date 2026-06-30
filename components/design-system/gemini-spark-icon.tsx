import type { SVGProps } from "react";

/** Spark a 4 punte — silhouette ispirata a Gemini, `currentColor` per adattarsi al tema del tasto. */
export function GeminiSparkIcon({ className, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      {...rest}
    >
      <path
        d="M12 2.25c.35 2.65 2.1 4.4 4.75 4.75-2.65.35-4.4 2.1-4.75 4.75-.35-2.65-2.1-4.4-4.75-4.75 2.65-.35 4.4-2.1 4.75-4.75Z"
        fill="currentColor"
      />
      <path
        d="M18.5 12.75c.22 1.65 1.32 2.75 2.97 2.97-1.65.22-2.75 1.32-2.97 2.97-.22-1.65-1.32-2.75-2.97-2.97 1.65-.22 2.75-1.32 2.97-2.97Z"
        fill="currentColor"
        opacity="0.88"
      />
      <path
        d="M5.5 14.5c.18 1.35 1.08 2.25 2.43 2.43-1.35.18-2.25 1.08-2.43 2.43-.18-1.35-1.08-2.25-2.43-2.43 1.35-.18 2.25-1.08 2.43-2.43Z"
        fill="currentColor"
        opacity="0.72"
      />
    </svg>
  );
}
