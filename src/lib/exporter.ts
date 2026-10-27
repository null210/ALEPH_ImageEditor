import { renderProject, targetFor } from './renderer';
import type { Project } from '../domain/types';

export async function exportProjectPng(
  project: Project,
  image: HTMLImageElement | null,
): Promise<Blob> {
  await document.fonts?.ready;

  const target = targetFor(project);
  const canvas = document.createElement('canvas');
  canvas.width = target.width;
  canvas.height = target.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');

  renderProject(ctx, project, image, target);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('PNG 인코딩 실패'))),
      'image/png',
    );
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
