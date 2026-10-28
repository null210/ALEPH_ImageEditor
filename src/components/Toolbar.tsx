import { FileUploadButton } from './FileUploadButton';
import { RatioTabs } from './RatioTabs';
import type { Ratio } from '../domain/types';

interface Props {
  ratio: Ratio;
  onRatioChange: (ratio: Ratio) => void;
  onFile: (file: File) => void;
  onExportPng: () => void;
  onSaveTemplate: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  onOpenTemplates: () => void;
  onAddText: () => void;
  onDeleteText: () => void;
  canDeleteText: boolean;
  cloneActive: boolean;
  onCloneToggle: () => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  canUndoClone: boolean;
  onUndoClone: () => void;
  cropActive: boolean;
  onCropToggle: () => void;
  canApplyCrop: boolean;
  onCropApply: () => void;
  onCropCancel: () => void;
}

export function Toolbar(props: Props) {
  const toolButton = (icon: string, tooltip: string, onClick: () => void, options?: { danger?: boolean; active?: boolean; disabled?: boolean }) => (
    <button
      type="button"
      className={`icon-button${options?.danger ? ' danger' : ''}${options?.active ? ' primary' : ''}`}
      title={tooltip}
      aria-label={tooltip}
      data-tooltip={tooltip}
      onClick={onClick}
      disabled={options?.disabled}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );

  return (
    <header className="toolbar">
      <div className="tool-group" aria-label="이미지 도구">
        <FileUploadButton icon="🖼️" tooltip="이미지 불러오기" onFile={props.onFile} />
        <RatioTabs value={props.ratio} onChange={props.onRatioChange} />
      </div>
      <div className="tool-group" aria-label="편집 도구">
        {toolButton('➕', '문구 추가', props.onAddText)}
        {toolButton('🗑️', '선택한 문구 삭제', props.onDeleteText, { danger: true, disabled: !props.canDeleteText })}
        {toolButton('🖌️', props.cloneActive ? '클론 도장 끄기' : '클론 도장 켜기', props.onCloneToggle, { active: props.cloneActive })}
        {toolButton('↩️', '클론 실행 취소', props.onUndoClone, { disabled: !props.canUndoClone })}
        {toolButton('✂️', props.cropActive ? '잘라내기 모드 끄기' : '이미지 잘라내기', props.onCropToggle, { active: props.cropActive })}
        {props.cropActive && toolButton('✅', '잘라내기 적용', props.onCropApply, { active: true, disabled: !props.canApplyCrop })}
        {props.cropActive && toolButton('❌', '잘라내기 취소', props.onCropCancel, { danger: true })}
        {props.cloneActive && (
          <label className="toolbar-size" title="클론 도장 크기" data-tooltip="클론 도장 크기">
            <input type="range" min="0.01" max="0.12" step="0.005" value={props.brushSize} onChange={(e) => props.onBrushSizeChange(Number(e.target.value))} />
          </label>
        )}
      </div>
      <div className="spacer" />
      <div className="tool-group" aria-label="파일 도구">
        {toolButton('📚', '템플릿 열기', props.onOpenTemplates)}
        {toolButton('💾', '현재 템플릿 저장', props.onSaveTemplate)}
        <FileUploadButton icon="📂" tooltip="JSON 불러오기" onFile={props.onImportJson} />
        {toolButton('📤', 'JSON 내보내기', props.onExportJson)}
        {toolButton('⬇️', 'PNG 내려받기', props.onExportPng, { active: true })}
      </div>
    </header>
  );
}
