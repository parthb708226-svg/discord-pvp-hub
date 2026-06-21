import { itemForSlug } from "@/lib/mc-items";
import { cn } from "@/lib/utils";

interface Props {
  slug?: string | null;
  fallback?: string;
  size?: number;
  className?: string;
}

export function McIcon({ slug, fallback, size = 32, className }: Props) {
  const src = itemForSlug(slug);
  if (!src) {
    return (
      <span className={cn("inline-flex items-center justify-center", className)} style={{ width: size, height: size, fontSize: size * 0.8 }}>
        {fallback ?? "❓"}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      width={size}
      height={size}
      style={{ width: size, height: size, imageRendering: "pixelated" }}
      className={cn("inline-block select-none drop-shadow-[0_2px_0_rgba(0,0,0,0.45)]", className)}
    />
  );
}
