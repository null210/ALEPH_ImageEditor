/**
 * 배경 제거 기능 사전 고정 검사 TEST-01 ~ TEST-10 (로직 계층).
 * DOM이 필요한 부분은 순수 함수(선택 영역·알고리즘·렌더 모드·히스토리)로 검증한다.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  checkSelection, rectFromDrag, toDisplayRect, toPixelRect,
  MIN_SELECTION_PX, SELECTION_MESSAGES,
} from '../domain/selection';
import { removeBackgroundInRect, type PixelBuffer } from '../lib/backgroundRemoval';
import { backgroundModeFor, imageDisplayBox } from '../lib/renderer';
import { createUndoStack, popUndo, pushUndo } from '../domain/history';
import type { Project, SourceImage } from '../domain/types';

// ── 테스트 픽셀 버퍼 헬퍼 ────────────────────────────────────────
type RGB = [number, number, number];

function solid(width: number, height: number, color: RGB): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) data.set([...color, 255], i * 4);
  return { data, width, height };
}
function paint(buf: PixelBuffer, x0: number, y0: number, w: number, h: number, color: RGB) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) buf.data.set([...color, 255], (y * buf.width + x) * 4);
}
const alphaAt = (buf: PixelBuffer, x: number, y: number) => buf.data[(y * buf.width + x) * 4 + 3];
const noYield = () => Promise.resolve();

const image = (patch: Partial<SourceImage> = {}): SourceImage => ({
  dataUrl: 'data:image/png;base64,', width: 200, height: 100, name: 'a.png', scale: 1, x: 0.5, y: 0.5, ...patch,
});
const project = (img: SourceImage | null): Project => ({ version: 1, ratio: '1:1', image: img, texts: [], cloneStrokes: [] });
const fakeEl = (w: number, h: number) => ({ naturalWidth: w, naturalHeight: h }) as HTMLImageElement;

describe('배경 제거 TEST-01 ~ TEST-10', () => {
  it('TEST-01 이미지가 원본 비율을 유지하며 캔버스에 맞춰진다', () => {
    const box = imageDisplayBox(project(image()), fakeEl(200, 100), 1080, 1080);
    expect(box.width / box.height).toBeCloseTo(2, 5);
    expect(box.width).toBeLessThanOrEqual(1080);
    expect(box.left).toBeGreaterThanOrEqual(0);
  });

  it('TEST-02 드래그 중 매 지점마다 선택 박스가 계산된다 (방향 무관·경계 보정)', () => {
    const box = { left: 100, top: 50, width: 400, height: 200 };
    const forward = rectFromDrag({ x: 100, y: 50 }, { x: 300, y: 150 }, box);
    const backward = rectFromDrag({ x: 300, y: 150 }, { x: 100, y: 50 }, box);
    expect(forward).toEqual({ x: 0, y: 0, width: 0.5, height: 0.5 });
    expect(backward).toEqual(forward);
    // 이미지 밖까지 드래그해도 이미지 경계로 잘린다
    expect(rectFromDrag({ x: 0, y: 0 }, { x: 9999, y: 9999 }, box)).toEqual({ x: 0, y: 0, width: 1, height: 1 });
    // 화면에 그릴 점선 박스 좌표로 역변환
    expect(toDisplayRect(forward!, box)).toEqual({ left: 100, top: 50, width: 200, height: 100 });
  });

  it('TEST-03 영역이 있으면 검증을 통과하고 즉시 연산이 시작된다', async () => {
    const check = checkSelection({ x: 0, y: 0, width: 0.5, height: 0.5 }, image());
    expect(check.ok).toBe(true);
    const onProgress = vi.fn();
    const promise = removeBackgroundInRect(solid(20, 20, [255, 255, 255]), { x: 0, y: 0, width: 20, height: 20 }, { onProgress, yieldFn: noYield });
    await promise;
    expect(onProgress).toHaveBeenCalled();
  });

  it('TEST-04 단색 배경은 투명해지고 가운데 피사체는 보존된다', async () => {
    const buf = solid(40, 40, [250, 250, 250]);
    paint(buf, 15, 15, 10, 10, [200, 30, 30]); // 빨간 피사체
    const result = await removeBackgroundInRect(buf, { x: 0, y: 0, width: 40, height: 40 }, { yieldFn: noYield });
    expect(result.background).toEqual([250, 250, 250]);
    expect(result.removed).toBe(40 * 40 - 10 * 10);
    expect(alphaAt(buf, 0, 0)).toBe(0);
    expect(alphaAt(buf, 20, 20)).toBe(255);
  });

  it('TEST-05 영역 없이 실행하면 "선택된 영역이 없습니다" 안내', () => {
    expect(checkSelection(null, image())).toEqual({ ok: false, reason: '선택된 영역이 없습니다.' });
    expect(SELECTION_MESSAGES.noSelection).toBe('선택된 영역이 없습니다.');
  });

  it('TEST-06 실행 취소 시 직전 이미지 상태 그대로 복구된다', () => {
    const original = image({ dataUrl: 'data:original' });
    const stack = pushUndo(createUndoStack<SourceImage>(), original);
    const { stack: next, item } = popUndo(stack);
    expect(item).toEqual(original);
    expect(next.items).toHaveLength(0);
    expect(popUndo(next).item).toBeUndefined(); // 빈 스택에서도 예외 없음
  });

  it('TEST-07 투명 이미지는 내보내기 시 배경을 칠하지 않는다', () => {
    expect(backgroundModeFor(project(image({ hasTransparency: true })), 'export')).toBe('transparent');
    expect(backgroundModeFor(project(image({ hasTransparency: true })), 'preview')).toBe('checker');
    // 기존 동작(불투명 이미지)은 그대로 검정 배경
    expect(backgroundModeFor(project(image()), 'export')).toBe('solid');
  });

  it('TEST-08 큰 영역은 청크 단위로 이벤트 루프에 양보하며 진행률을 보고한다', async () => {
    const yieldFn = vi.fn(() => Promise.resolve());
    const progress: number[] = [];
    await removeBackgroundInRect(solid(300, 300, [0, 0, 0]), { x: 0, y: 0, width: 300, height: 300 }, {
      chunkSize: 10_000, yieldFn, onProgress: (r) => progress.push(r),
    });
    expect(yieldFn.mock.calls.length).toBeGreaterThanOrEqual(8);
    expect(progress.at(-1)).toBe(1);
    expect([...progress].sort((a, b) => a - b)).toEqual(progress); // 단조 증가
  });

  it('TEST-09 아주 작은 영역은 경고만 하고 예외가 없다', async () => {
    const tiny = { x: 0, y: 0, width: (MIN_SELECTION_PX - 1) / 200, height: (MIN_SELECTION_PX - 1) / 100 };
    expect(checkSelection(tiny, image())).toEqual({ ok: false, reason: SELECTION_MESSAGES.tooSmall });
    expect(checkSelection({ x: 0, y: 0, width: 10 / 200, height: 10 / 100 }, image()).ok).toBe(true);
    // 알고리즘 자체도 0 크기·버퍼 밖 영역을 안전하게 처리
    const buf = solid(10, 10, [1, 2, 3]);
    await expect(removeBackgroundInRect(buf, { x: 50, y: 50, width: 0, height: 0 }, { yieldFn: noYield }))
      .resolves.toEqual({ removed: 0, background: null });
    expect(toPixelRect({ x: 0.99, y: 0.99, width: 0.5, height: 0.5 }, 100, 100)).toEqual({ x: 99, y: 99, width: 1, height: 1 });
  });

  it('TEST-10 연속 3회 선택·제거가 서로 간섭 없이 누적되고 히스토리는 상한을 지킨다', async () => {
    const buf = solid(90, 30, [255, 255, 255]);
    paint(buf, 10, 10, 10, 10, [0, 0, 255]);
    paint(buf, 40, 10, 10, 10, [0, 0, 255]);
    paint(buf, 70, 10, 10, 10, [0, 0, 255]);
    let stack = createUndoStack<number>(2);
    for (let i = 0; i < 3; i++) {
      const res = await removeBackgroundInRect(buf, { x: i * 30, y: 0, width: 30, height: 30 }, { yieldFn: noYield });
      expect(res.removed).toBe(30 * 30 - 100);
      expect(alphaAt(buf, i * 30 + 15, 15)).toBe(255); // 피사체 보존
      stack = pushUndo(stack, i);
    }
    expect(stack.items).toEqual([1, 2]); // 상한 2 → 오래된 스냅샷 폐기
    // 이미 투명해진 영역을 다시 처리해도 안전
    await expect(removeBackgroundInRect(buf, { x: 0, y: 0, width: 30, height: 30 }, { yieldFn: noYield }))
      .resolves.toMatchObject({ removed: 0 });
  });
});
