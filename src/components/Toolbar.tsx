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
}

export function Toolbar(props: Props) {
  return (
    <header className="toolbar">
      <FileUploadButton onFile={props.onFile} />
      <RatioTabs value={props.ratio} onChange={props.onRatioChange} />
      <div className="spacer" />
      <button type="button" onClick={props.onOpenTemplates}>템플릿</button>
      <button type="button" onClick={props.onSaveTemplate}>템플릿 저장</button>
      <FileUploadButton label="JSON 불러오기" onFile={props.onImportJson} />
      <button type="button" onClick={props.onExportJson}>JSON 내보내기</button>
      <button type="button" className="primary" onClick={props.onExportPng}>PNG 내려받기</button>
    </header>
  );
}
