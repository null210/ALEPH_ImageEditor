import { useEffect, useRef, useState } from 'react';
import { imageDisplayBox, renderProject, targetFor } from '../lib/renderer';
import { measureTextItem } from '../lib/textLayout';
import { clamp } from '../lib/number';
import { LIMITS, RATIO_DIMS } from '../domain/constants';
import { createId } from '../domain/id';
import type { CloneDab, CloneStroke, Project, TextItem } from '../domain/types';

interface Props {
  project: Project;
  image: HTMLImageElement | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateText: (id: string, patch: Partial<Omit<TextItem, 'id'>>) => void;
  onUpdateImage: (patch: Partial<NonNullable<Project['image']>>) => void;
  cloneActive: boolean;
  brushSize: number;
  onStartCloneStroke: (stroke: CloneStroke) => void;
  onAddCloneDab: (id: string, dab: CloneDab) => void;
  cropActive: boolean;
  cropRect: { x: number; y: number; width: number; height: number } | null;
  onCropRectChange: (rect: { x: number; y: number; width: number; height: number } | null) => void;
}

type Handle = 'nw' | 'ne' | 'sw' | 'se';
interface Interaction {
  mode: 'drag' | 'resize';
  id: string;
  startX: number;
  startY: number;
  item: TextItem;
  handle?: Handle;
}

export function EditorCanvas({
  project, image, selectedId, onSelect, onUpdateText, onUpdateImage,
  cloneActive, brushSize, onStartCloneStroke, onAddCloneDab,
  cropActive, cropRect, onCropRectChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const cloneInteractionRef = useRef<string | null>(null);
  const sampleRef = useRef<{ x: number; y: number } | null>(null);
  const imageResizeRef = useRef<{ startDistance: number; startScale: number; centerX: number; centerY: number } | null>(null);
  const imageDragRef = useRef<{ startX: number; startY: number; imageX: number; imageY: number } | null>(null);
  const cropDragRef = useRef<{ startPoint: { x: number; y: number }; box: ReturnType<typeof imageDisplayBox> } | null>(null);
  const [imageSelected, setImageSelected] = useState(false);
  const [displayWidth, setDisplayWidth] = useState(0);
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(null);
  const [samplePoint, setSamplePoint] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const dims = RATIO_DIMS[project.ratio];
      const widthFromHeight = entry.contentRect.height * (dims.w / dims.h);
      setDisplayWidth(Math.floor(Math.min(entry.contentRect.width, widthFromHeight)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [project.ratio]);

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
    if (!ctx) return;
    renderProject(ctx, project, image, target);

    if (imageSelected && image) {
      const box = imageDisplayBox(project, image, target.width, target.height);
      const handleSize = 10 * dpr;
      ctx.save();
      ctx.strokeStyle = '#22c55e';
      ctx.fillStyle = '#ffffff';
      ctx.lineWidth = 2 * dpr;
      ctx.setLineDash([6 * dpr, 4 * dpr]);
      ctx.strokeRect(box.left, box.top, box.width, box.height);
      ctx.setLineDash([]);
      for (const [x, y] of [
        [box.left, box.top], [box.left + box.width, box.top],
        [box.left, box.top + box.height], [box.left + box.width, box.top + box.height],
      ]) {
        ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
        ctx.strokeRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
      }
      ctx.restore();
    }

    if (cropActive && image && cropRect) {
      const box = imageDisplayBox(project, image, target.width, target.height);
      const left = box.left + cropRect.x * box.width;
      const top = box.top + cropRect.y * box.height;
      const width = cropRect.width * box.width;
      const height = cropRect.height * box.height;
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, 0, target.width, top);
      ctx.fillRect(0, top, left, height);
      ctx.fillRect(left + width, top, target.width - left - width, height);
      ctx.fillRect(0, top + height, target.width, target.height - top - height);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2 * dpr;
      ctx.setLineDash([6 * dpr, 4 * dpr]);
      ctx.strokeRect(left, top, width, height);
      ctx.restore();
    }

    if (selectedId) {
      const item = project.texts.find((text) => text.id === selectedId);
      if (item) {
        const box = measureTextItem(ctx, item, target.width, target.height);
        const handleSize = 10 * dpr;
        ctx.save();
        ctx.strokeStyle = '#3b82f6';
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 2 * dpr;
        ctx.setLineDash([6 * dpr, 4 * dpr]);
        ctx.strokeRect(box.left, box.top, box.width, box.height);
        ctx.setLineDash([]);
        for (const [x, y] of [
          [box.left, box.top], [box.left + box.width, box.top],
          [box.left, box.top + box.height], [box.left + box.width, box.top + box.height],
        ]) {
          ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
          ctx.strokeRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
        }
        ctx.restore();
      }
    }

    if (cloneActive && hoverPoint) {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.arc(hoverPoint.x * target.width, hoverPoint.y * target.height, brushSize * target.width, 0, Math.PI * 2);
      ctx.stroke();
      if (samplePoint) {
        ctx.strokeStyle = '#3b82f6';
        ctx.beginPath();
        ctx.moveTo(samplePoint.x * target.width - 5 * dpr, samplePoint.y * target.height);
        ctx.lineTo(samplePoint.x * target.width + 5 * dpr, samplePoint.y * target.height);
        ctx.moveTo(samplePoint.x * target.width, samplePoint.y * target.height - 5 * dpr);
        ctx.lineTo(samplePoint.x * target.width, samplePoint.y * target.height + 5 * dpr);
        ctx.stroke();
      }
      ctx.restore();
    }
  }, [project, image, displayWidth, selectedId, imageSelected, cloneActive, brushSize, hoverPoint, samplePoint, cropActive, cropRect]);

  const pointInCanvas = (event: React.PointerEvent<HTMLCanvasElement>, target: { width: number; height: number }) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * target.width / rect.width,
      y: (event.clientY - rect.top) * target.height / rect.height,
    };
  };

  const handlePoint = (handle: Handle, box: { left: number; top: number; width: number; height: number }) => ({
    x: handle.includes('e') ? box.left + box.width : box.left,
    y: handle.includes('s') ? box.top + box.height : box.top,
  });

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const target = targetFor(project, displayWidth * dpr);
    const point = pointInCanvas(event, target);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (cropActive && image && project.image) {
      const box = imageDisplayBox(project, image, target.width, target.height);
      if (point.x >= box.left && point.x <= box.left + box.width && point.y >= box.top && point.y <= box.top + box.height) {
        cropDragRef.current = { startPoint: point, box };
        canvas.setPointerCapture(event.pointerId);
        onCropRectChange(null);
      }
      return;
    }

    if (cloneActive) {
      const normalized = { x: point.x / target.width, y: point.y / target.height };
      if (event.altKey) {
        sampleRef.current = normalized;
        setSamplePoint(normalized);
        return;
      }
      if (!sampleRef.current) {
        sampleRef.current = normalized;
        setSamplePoint(normalized);
      }
      const source = sampleRef.current;
      const id = createId();
      const dab: CloneDab = { x: normalized.x, y: normalized.y, radius: brushSize, opacity: 1 };
      onStartCloneStroke({
        id,
        originX: normalized.x,
        originY: normalized.y,
        sourceX: source.x,
        sourceY: source.y,
        dabs: [dab],
      });
      cloneInteractionRef.current = id;
      canvas.setPointerCapture(event.pointerId);
      return;
    }

    // 텍스트가 이미지 위에 있어도 텍스트를 먼저 선택한다.
    if (selectedId) {
      const selected = project.texts.find((item) => item.id === selectedId);
      if (selected) {
        const box = measureTextItem(ctx, selected, target.width, target.height);
        const handles: Handle[] = ['nw', 'ne', 'sw', 'se'];
        const threshold = 16 * dpr;
        for (const handle of handles) {
          const hp = handlePoint(handle, box);
          if (Math.abs(point.x - hp.x) <= threshold && Math.abs(point.y - hp.y) <= threshold) {
            interactionRef.current = { mode: 'resize', id: selected.id, startX: point.x, startY: point.y, item: selected, handle };
            canvas.setPointerCapture(event.pointerId);
            return;
          }
        }
      }
    }

    for (let i = project.texts.length - 1; i >= 0; i--) {
      const item = project.texts[i];
      const box = measureTextItem(ctx, item, target.width, target.height);
      if (point.x >= box.left && point.x <= box.left + box.width && point.y >= box.top && point.y <= box.top + box.height) {
        onSelect(item.id);
        interactionRef.current = { mode: 'drag', id: item.id, startX: point.x, startY: point.y, item };
        canvas.setPointerCapture(event.pointerId);
        return;
      }
    }

    if (image && project.image && !cloneActive) {
      const box = imageDisplayBox(project, image, target.width, target.height);
      const center = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      const handles: Handle[] = ['nw', 'ne', 'sw', 'se'];
      const threshold = 16 * dpr;
      for (const handle of handles) {
        const hp = handlePoint(handle, box);
        if (Math.abs(point.x - hp.x) <= threshold && Math.abs(point.y - hp.y) <= threshold) {
          setImageSelected(true);
          const startDistance = Math.max(Math.hypot(hp.x - center.x, hp.y - center.y), 1);
          imageResizeRef.current = { startDistance, startScale: project.image.scale ?? 1, centerX: center.x, centerY: center.y };
          canvas.setPointerCapture(event.pointerId);
          return;
        }
      }
      if (point.x >= box.left && point.x <= box.left + box.width && point.y >= box.top && point.y <= box.top + box.height) {
        setImageSelected(true);
        onSelect(null);
        imageDragRef.current = { startX: point.x, startY: point.y, imageX: project.image.x ?? 0.5, imageY: project.image.y ?? 0.5 };
        canvas.setPointerCapture(event.pointerId);
        return;
      }
    }
    setImageSelected(false);
    onSelect(null);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const target = targetFor(project, displayWidth * dpr);
    const point = pointInCanvas(event, target);
    const normalized = { x: point.x / target.width, y: point.y / target.height };

    if (cloneActive) {
      setHoverPoint(normalized);
      const strokeId = cloneInteractionRef.current;
      if (strokeId) {
        onAddCloneDab(strokeId, { x: normalized.x, y: normalized.y, radius: brushSize, opacity: 1 });
      }
      return;
    }

    const cropDrag = cropDragRef.current;
    if (cropDrag) {
      const { startPoint, box } = cropDrag;
      const left = clamp(Math.min(startPoint.x, point.x), box.left, box.left + box.width);
      const top = clamp(Math.min(startPoint.y, point.y), box.top, box.top + box.height);
      const right = clamp(Math.max(startPoint.x, point.x), box.left, box.left + box.width);
      const bottom = clamp(Math.max(startPoint.y, point.y), box.top, box.top + box.height);
      const width = right - left;
      const height = bottom - top;
      if (width >= 4 && height >= 4) {
        onCropRectChange({
          x: (left - box.left) / box.width,
          y: (top - box.top) / box.height,
          width: width / box.width,
          height: height / box.height,
        });
      }
      return;
    }

    const imageResize = imageResizeRef.current;
    if (imageResize) {
      const distance = Math.hypot(point.x - imageResize.centerX, point.y - imageResize.centerY);
      onUpdateImage({ scale: clamp(imageResize.startScale * distance / imageResize.startDistance, 0.2, 3) });
      return;
    }

    const imageDrag = imageDragRef.current;
    if (imageDrag) {
      onUpdateImage({
        x: clamp(imageDrag.imageX + (point.x - imageDrag.startX) / target.width, 0, 1),
        y: clamp(imageDrag.imageY + (point.y - imageDrag.startY) / target.height, 0, 1),
      });
      return;
    }

    const interaction = interactionRef.current;
    if (!interaction) return;
    if (interaction.mode === 'drag') {
      const x = clamp(interaction.item.x + (point.x - interaction.startX) / target.width, 0, 1);
      const y = clamp(interaction.item.y + (point.y - interaction.startY) / target.height, 0, 1);
      onUpdateText(interaction.id, { x, y });
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx || !interaction.handle) return;
    const box = measureTextItem(ctx, interaction.item, target.width, target.height);
    const handle = handlePoint(interaction.handle, box);
    const opposite: Handle = interaction.handle === 'nw' ? 'se'
      : interaction.handle === 'ne' ? 'sw'
        : interaction.handle === 'sw' ? 'ne' : 'nw';
    const oppositePoint = handlePoint(opposite, box);
    const startDistance = Math.max(Math.hypot(handle.x - oppositePoint.x, handle.y - oppositePoint.y), 1);
    const currentDistance = Math.max(Math.hypot(point.x - oppositePoint.x, point.y - oppositePoint.y), 1);
    const fontSize = clamp(interaction.item.fontSize * (currentDistance / startDistance), LIMITS.minFontSize, LIMITS.maxFontSize);
    onUpdateText(interaction.id, { fontSize });
  };

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (canvasRef.current?.hasPointerCapture(event.pointerId)) {
      canvasRef.current.releasePointerCapture(event.pointerId);
    }
    interactionRef.current = null;
    cloneInteractionRef.current = null;
    imageResizeRef.current = null;
    imageDragRef.current = null;
    cropDragRef.current = null;
  };

  const onDoubleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const target = targetFor(project, displayWidth * dpr);
    const rect = canvas.getBoundingClientRect();
    const point = {
      x: (event.clientX - rect.left) * target.width / rect.width,
      y: (event.clientY - rect.top) * target.height / rect.height,
    };
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (let i = project.texts.length - 1; i >= 0; i--) {
      const item = project.texts[i];
      const box = measureTextItem(ctx, item, target.width, target.height);
      if (point.x >= box.left && point.x <= box.left + box.width && point.y >= box.top && point.y <= box.top + box.height) {
        onSelect(item.id);
        const content = window.prompt('문구 내용', item.content);
        if (content !== null) onUpdateText(item.id, { content });
        return;
      }
    }
  };

  return (
    <div ref={containerRef} className="canvas-container">
      <canvas
        ref={canvasRef}
        className={cropActive ? 'crop-canvas' : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        onPointerLeave={() => setHoverPoint(null)}
      />
    </div>
  );
}
