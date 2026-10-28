export type Ratio = '1:1' | '4:5' | '9:16';
export type Align = 'left' | 'center' | 'right';
export type Weight = 400 | 700;
export type FontFamily = 'system-ui' | 'Arial' | 'Georgia' | 'Times New Roman' | 'Courier New';

export interface TextItem {
  id: string;
  content: string;
  x: number;          // 0~1 정규화 (캔버스 폭 기준)
  y: number;          // 0~1 정규화 (캔버스 높이 기준)
  fontSize: number;   // 캔버스 폭 대비 비율
  color: string;      // #RRGGBB
  fontFamily: FontFamily;
  align: Align;
  weight: Weight;
  lineHeight: number; // 배수
}

export interface SourceImage {
  dataUrl: string;
  width: number;
  height: number;
  name: string;
  scale: number;
  x: number;
  y: number;
}

export interface CloneDab {
  x: number;
  y: number;
  radius: number;
  opacity: number;
}

export interface CloneStroke {
  id: string;
  originX: number;
  originY: number;
  sourceX: number;
  sourceY: number;
  dabs: CloneDab[];
}

export interface Project {
  version: 1;
  ratio: Ratio;
  image: SourceImage | null;
  texts: TextItem[];
  cloneStrokes: CloneStroke[];
}

export interface Template {
  id: string;
  name: string;
  createdAt: number;
  ratio: Ratio;
  texts: TextItem[];
}

/** JSON/템플릿으로 주고받는 최소 단위 (id·createdAt·name 제외). */
export interface TemplatePayload {
  version: 1;
  ratio: Ratio;
  texts: TextItem[];
}
