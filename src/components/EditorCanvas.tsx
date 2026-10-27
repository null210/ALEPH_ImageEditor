import { useEffect, useRef, useState } from 'react';
import { renderProject, targetFor } from '../lib/renderer';
import type { Project } from '../domain/types';

interface Props {
  project: Project;
  image: HTMLImageElement | null;
}

export function EditorCanvas({ project, image }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displayWidth, setDisplayWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setDisplayWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || displayWidth === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const target = targetFor(project, displayWidth * dpr);
    canvas.width = target.width;
    canvas.height = target.height;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayWidth * (target.height / target.width)}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) renderProject(ctx, project, image, target);
  }, [project, image, displayWidth]);

  return (
    <div ref={containerRef} className="canvas-container">
      <canvas ref={canvasRef} />
    </div>
  );
}
