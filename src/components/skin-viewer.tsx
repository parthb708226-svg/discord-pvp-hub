import { useEffect, useRef } from "react";

interface Props {
  username: string;
  width?: number;
  height?: number;
  className?: string;
  /** disable mouse rotation (good for small hover previews) */
  staticView?: boolean;
}

export function SkinViewer({ username, width = 240, height = 360, className, staticView = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let viewer: any;
    let cancelled = false;
    (async () => {
      const skinview3d = await import("skinview3d");
      if (cancelled || !canvasRef.current) return;
      viewer = new skinview3d.SkinViewer({
        canvas: canvasRef.current,
        width,
        height,
        skin: `https://mc-heads.net/skin/${encodeURIComponent(username)}`,
      });
      viewer.animation = new skinview3d.WalkingAnimation();
      viewer.animation.speed = 0.6;
      viewer.zoom = 0.9;
      if (!staticView) {
        viewer.controls.enableRotate = true;
        viewer.controls.enableZoom = false;
        viewer.controls.enablePan = false;
      } else {
        viewer.controls.enableRotate = false;
        viewer.controls.enableZoom = false;
        viewer.controls.enablePan = false;
      }
    })();
    return () => {
      cancelled = true;
      try { viewer?.dispose?.(); } catch { /* ignore */ }
    };
  }, [username, width, height, staticView]);

  return <canvas ref={canvasRef} className={className} />;
}
