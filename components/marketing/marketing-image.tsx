import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const EXTS = ["webp", "png", "jpg", "jpeg"] as const;

function find(name: string): string | null {
  for (const ext of EXTS) {
    if (existsSync(path.join(process.cwd(), "public", "marketing", `${name}.${ext}`))) return `/marketing/${name}.${ext}`;
  }
  return null;
}

/** Renders public/marketing/<name>.(webp|png|jpg) when present, otherwise the illustrated fallback. */
export function MarketingImage({
  name, alt, width, height, fallback, className, priority, frame = true,
}: {
  name: string; alt: string; width: number; height: number; fallback: ReactNode;
  className?: string; priority?: boolean; frame?: boolean;
}) {
  const src = find(name);
  if (!src) return <>{fallback}</>;
  return (
    <Image
      src={src} alt={alt} width={width} height={height} priority={priority} sizes="(min-width: 1024px) 45vw, 100vw"
      className={cn("h-auto w-full", frame && "rounded-xl border shadow-xl", className)}
    />
  );
}
