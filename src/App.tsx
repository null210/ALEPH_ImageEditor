import { useCallback, useEffect, useMemo, useState } from 'react';
import { EditorCanvas } from './components/EditorCanvas';
import { Toolbar } from './components/Toolbar';
import { TemplateDrawer } from './components/TemplateDrawer';
import { TextList } from './components/TextList';
import { TextInspector } from './components/TextInspector';
import { Toast } from './components/Toast';
import { useEditor } from './state/useEditor';
import { useToast } from './hooks/useToast';
import { useImageHistory } from './hooks/useImageHistory';
import { checkSelection, type SelectionRect } from './domain/selection';
import { removeBackgroundFromImage } from './lib/imageProcessing';
import { createId } from './domain/id';
import { parseTemplatePayload, validateImageFile } from './domain/validation';
import { decodeImage, loadImageFromFile } from './lib/imageLoader';
import { downloadBlob, exportProjectPng } from './lib/exporter';
import { createLocalTemplateRepository } from './lib/storage';
import type { Template, TemplatePayload } from './domain/types';

export function App() {
  const { project, actions } = useEditor();
  const repo = useMemo(() => createLocalTemplateRepository(), []);
  const { message, show } = useToast();

  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [cloneActive, setCloneActive] = useState(false);
  const [brushSize, setBrushSize] = useState(0.04);
  const [cropActive, setCropActive] = useState(false);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [selectActive, setSelectActive] = useState(false);
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [removalProgress, setRemovalProgress] = useState<number | null>(null);
  const imageHistory = useImageHistory();

  // 프로젝트 이미지가 바뀌면 HTMLImageElement를 다시 로드
  const dataUrl = project.image?.dataUrl ?? null;
  useEffect(() => {
    if (!dataUrl) { setImageEl(null); return; }
    let cancelled = false;
    decodeImage(dataUrl)
      .then((el) => { if (!cancelled) setImageEl(el); })
      .catch(() => show('이미지를 불러오지 못했습니다.'));
    return () => { cancelled = true; };
  }, [dataUrl, show]);

  // 템플릿 저장소가 바뀌면 목록 재조회
  useEffect(() => { setTemplates(repo.list()); }, [repo, drawerOpen]);

  const handleFile = useCallback(async (file: File) => {
    const validation = await validateImageFile(file);
    if (!validation.ok) { show(validation.reason); return; }
    try {
      const loaded = await loadImageFromFile(file);
      actions.setImage({
        dataUrl: loaded.dataUrl,
        width: loaded.width,
        height: loaded.height,
        name: file.name,
        scale: 1,
        x: 0.5,
        y: 0.5,
      });
      imageHistory.clear();
      setSelection(null);
      show('이미지를 불러왔습니다.');
    } catch {
      show('이미지를 불러오지 못했습니다.');
    }
  }, [actions, show, imageHistory]);

  const handleRemoveBackground = useCallback(async () => {
    if (removalProgress !== null) return; // 중복 실행 방지
    const check = checkSelection(selection, project.image);
    if (!check.ok) { show(check.reason); return; } // TEST-05, TEST-09
    if (!imageEl || !project.image) return;

    const snapshot = project.image;
    setRemovalProgress(0); // 즉시 로딩 표시 (TEST-03, TEST-08)
    try {
      const result = await removeBackgroundFromImage(imageEl, check.pixelRect, {
        onProgress: (ratio) => setRemovalProgress(ratio),
      });
      if (result.removed === 0) {
        show('제거할 배경을 찾지 못했습니다.');
        return;
      }
      imageHistory.record(snapshot);
      actions.updateImage({ dataUrl: result.dataUrl, hasTransparency: true });
      setSelection(null);
      show(`배경을 제거했습니다. (${result.removed.toLocaleString()}px)`);
    } catch {
      show('배경 제거에 실패했습니다.');
    } finally {
      setRemovalProgress(null);
    }
  }, [removalProgress, selection, project.image, imageEl, imageHistory, actions, show]);

  const handleUndoImage = useCallback(() => {
    const previous = imageHistory.undo();
    if (!previous) return;
    actions.setImage(previous);
    show('배경 제거를 취소했습니다.');
  }, [imageHistory, actions, show]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z' || event.shiftKey) return;

      const target = event.target;
      if (target instanceof HTMLElement && (
        target.isContentEditable
        || target.closest('input, textarea, select, [contenteditable="true"]')
      )) return;

      if (!imageHistory.canUndo || removalProgress !== null) return;
      event.preventDefault();
      handleUndoImage();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndoImage, imageHistory.canUndo, removalProgress]);

  const handleCropApply = useCallback(() => {
    if (!cropRect || !imageEl || !project.image) return;
    const sx = Math.max(0, Math.floor(cropRect.x * imageEl.naturalWidth));
    const sy = Math.max(0, Math.floor(cropRect.y * imageEl.naturalHeight));
    const sw = Math.min(imageEl.naturalWidth - sx, Math.max(1, Math.floor(cropRect.width * imageEl.naturalWidth)));
    const sh = Math.min(imageEl.naturalHeight - sy, Math.max(1, Math.floor(cropRect.height * imageEl.naturalHeight)));
    if (sw < 2 || sh < 2) return;

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) { show('잘라내기를 적용하지 못했습니다.'); return; }
    ctx.drawImage(imageEl, sx, sy, sw, sh, 0, 0, sw, sh);
    actions.updateImage({ dataUrl: canvas.toDataURL('image/png'), width: sw, height: sh, scale: 1, x: 0.5, y: 0.5 });
    setCropActive(false);
    setCropRect(null);
    show('이미지를 잘라냈습니다.');
  }, [cropRect, imageEl, project.image, actions, show]);

  const handleCropCancel = useCallback(() => {
    setCropActive(false);
    setCropRect(null);
  }, []);

  const handleExportPng = useCallback(async () => {
    try {
      const blob = await exportProjectPng(project, imageEl);
      downloadBlob(blob, `export-${project.ratio.replace(':', 'x')}.png`);
      show('PNG를 내려받았습니다.');
    } catch {
      show('내보내기에 실패했습니다.');
    }
  }, [project, imageEl, show]);

  const handleSaveTemplate = useCallback((name: string) => {
    const template: Template = {
      id: createId(),
      name,
      createdAt: Date.now(),
      ratio: project.ratio,
      texts: project.texts,
    };
    repo.upsert(template);
    setTemplates(repo.list());
    show(`템플릿 "${name}"을 저장했습니다.`);
  }, [project, repo, show]);

  const handleLoadTemplate = useCallback((template: Template) => {
    actions.applyTemplate(template);
    setDrawerOpen(false);
    show(`템플릿 "${template.name}"을 불러왔습니다.`);
  }, [actions, show]);

  const handleRenameTemplate = useCallback((id: string, name: string) => {
    const target = repo.list().find((t) => t.id === id);
    if (!target) return;
    repo.upsert({ ...target, name });
    setTemplates(repo.list());
  }, [repo]);

  const handleUpdateTemplate = useCallback((id: string) => {
    const target = repo.list().find((template) => template.id === id);
    if (!target) return;
    repo.upsert({
      ...target,
      ratio: project.ratio,
      texts: project.texts.map((text) => ({ ...text })),
    });
    setTemplates(repo.list());
    show(`템플릿 "${target.name}"을 현재 편집 상태로 수정했습니다.`);
  }, [project, repo, show]);

  const handleDeleteTemplate = useCallback((id: string) => {
    repo.remove(id);
    setTemplates(repo.list());
  }, [repo]);

  const handleExportJson = useCallback(() => {
    const payload: TemplatePayload = {
      version: 1,
      ratio: project.ratio,
      texts: project.texts,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'template.json');
  }, [project]);

  const handleImportJson = useCallback(async (file: File) => {
    const text = await file.text();
    const result = parseTemplatePayload(text);
    if (!result.ok) {
      show(`JSON 오류: ${result.errors[0]}${result.errors.length > 1 ? ` 외 ${result.errors.length - 1}건` : ''}`);
      return;
    }
    actions.applyTemplate({
      id: createId(),
      name: file.name.replace(/\.json$/i, ''),
      createdAt: Date.now(),
      ratio: result.value.ratio,
      texts: result.value.texts,
    });
    show('JSON을 복원했습니다.');
  }, [actions, show]);

  const handleAddText = useCallback(() => {
    const id = actions.addText();
    setSelectedId(id);
  }, [actions]);

  const handleDeleteText = useCallback(() => {
    if (!selectedId) return;
    actions.removeText(selectedId);
    setSelectedId(null);
  }, [actions, selectedId]);

  const selectedText = project.texts.find((item) => item.id === selectedId) ?? null;
  const handleRemoveText = useCallback((id: string) => {
    actions.removeText(id);
    if (selectedId === id) setSelectedId(null);
  }, [actions, selectedId]);

  return (
    <div className="app">
      <Toolbar
        ratio={project.ratio}
        onRatioChange={actions.setRatio}
        onFile={handleFile}
        onExportPng={handleExportPng}
        onSaveTemplate={() => setDrawerOpen(true)}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onOpenTemplates={() => setDrawerOpen(true)}
        onAddText={handleAddText}
        onDeleteText={handleDeleteText}
        canDeleteText={selectedId !== null}
        cloneActive={cloneActive}
        onCloneToggle={() => {
          const next = !cloneActive;
          setCloneActive(next);
          if (next) {
            setCropActive(false);
            setCropRect(null);
            setSelectActive(false);
            setSelection(null);
          }
        }}
        brushSize={brushSize}
        onBrushSizeChange={setBrushSize}
        canUndoClone={(project.cloneStrokes?.length ?? 0) > 0}
        onUndoClone={actions.undoClone}
        cropActive={cropActive}
        onCropToggle={() => {
          const next = !cropActive;
          setCropActive(next);
          setCropRect(null);
          if (next) {
            setSelectActive(false);
            setSelection(null);
            setCloneActive(false);
          }
        }}
        canApplyCrop={cropRect !== null}
        onCropApply={handleCropApply}
        onCropCancel={handleCropCancel}
        selectActive={selectActive}
        onSelectToggle={() => {
          setSelectActive((active) => !active);
          setSelection(null);
          setCropActive(false);
          setCloneActive(false);
        }}
        onRemoveBackground={handleRemoveBackground}
        removalProgress={removalProgress}
        canUndoImage={imageHistory.canUndo}
        onUndoImage={handleUndoImage}
      />
      <main className="layout">
        <EditorCanvas
          project={project}
          image={imageEl}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onUpdateText={actions.updateText}
          onUpdateImage={actions.updateImage}
          cloneActive={cloneActive}
          brushSize={brushSize}
          onStartCloneStroke={actions.startCloneStroke}
          onAddCloneDab={actions.addCloneDab}
          cropActive={cropActive}
          cropRect={cropRect}
          onCropRectChange={setCropRect}
          selectActive={selectActive}
          selection={selection}
          onSelectionChange={setSelection}
        />
        <aside className="sidebar">
          <TextList
            texts={project.texts}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRemove={handleRemoveText}
            onAdd={handleAddText}
          />
          {selectedText ? (
            <TextInspector
              item={selectedText}
              onChange={(patch) => actions.updateText(selectedText.id, patch)}
            />
          ) : (
            <section className="panel"><p className="muted">편집할 문구를 선택하세요.</p></section>
          )}
        </aside>
      </main>

      <TemplateDrawer
        open={drawerOpen}
        templates={templates}
        onClose={() => setDrawerOpen(false)}
        onLoad={handleLoadTemplate}
        onRename={handleRenameTemplate}
        onUpdateCurrent={handleUpdateTemplate}
        onDelete={handleDeleteTemplate}
        onSaveCurrent={handleSaveTemplate}
      />
      <Toast message={message} />
    </div>
  );
}
