import { useCallback, useRef, useState } from 'react';
import { createUndoStack, popUndo, pushUndo, type UndoStack } from '../domain/history';
import type { SourceImage } from '../domain/types';

/**
 * 이미지 픽셀 편집(배경 제거)의 실행 취소 기록.
 * 스냅샷은 SourceImage 전체(dataUrl 포함)라서 직전 상태로 "완벽히" 복원된다 (TEST-06).
 */
export function useImageHistory(limit?: number) {
  const stackRef = useRef<UndoStack<SourceImage>>(createUndoStack<SourceImage>(limit));
  const [size, setSize] = useState(0);

  const record = useCallback((snapshot: SourceImage) => {
    stackRef.current = pushUndo(stackRef.current, { ...snapshot });
    setSize(stackRef.current.items.length);
  }, []);

  const undo = useCallback((): SourceImage | undefined => {
    const { stack, item } = popUndo(stackRef.current);
    stackRef.current = stack;
    setSize(stack.items.length);
    return item;
  }, []);

  const clear = useCallback(() => {
    stackRef.current = createUndoStack<SourceImage>(stackRef.current.limit);
    setSize(0);
  }, []);

  return { record, undo, clear, canUndo: size > 0 };
}
