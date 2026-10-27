import { useCallback, useEffect, useMemo, useState } from 'react';
import { EditorCanvas } from './components/EditorCanvas';
import { Toolbar } from './components/Toolbar';
import { TextList } from './components/TextList';
import { TextInspector } from './components/TextInspector';
import { TemplateDrawer } from './components/TemplateDrawer';
import { Toast } from './components/Toast';
import { useEditor } from './state/useEditor';
import { useToast } from './hooks/useToast';
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
      });
      show('이미지를 불러왔습니다.');
    } catch {
      show('이미지를 불러오지 못했습니다.');
    }
  }, [actions, show]);

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

  const selectedItem = project.texts.find((t) => t.id === selectedId) ?? null;

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
      />
      <main className="layout">
        <EditorCanvas project={project} image={imageEl} />
        <aside className="sidebar">
          <TextList
            texts={project.texts}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRemove={actions.removeText}
            onAdd={actions.addText}
          />
          {selectedItem && (
            <TextInspector
              item={selectedItem}
              onChange={(patch) => actions.updateText(selectedItem.id, patch)}
            />
          )}
        </aside>
      </main>

      <TemplateDrawer
        open={drawerOpen}
        templates={templates}
        onClose={() => setDrawerOpen(false)}
        onLoad={handleLoadTemplate}
        onRename={handleRenameTemplate}
        onDelete={handleDeleteTemplate}
        onSaveCurrent={handleSaveTemplate}
      />
      <Toast message={message} />
    </div>
  );
}
