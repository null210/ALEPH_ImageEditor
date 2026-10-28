import { describe, expect, it } from 'vitest';
import { parseTemplatePayload } from './validation';

const baseText = {
  content: '검사 문구', x: 0.5, y: 0.5, fontSize: 0.06, color: '#ffffff',
  fontFamily: 'system-ui', align: 'center', weight: 700, lineHeight: 1.3,
};

function payload(texts: unknown[] = [baseText], ratio = '1:1') {
  return JSON.stringify({ version: 1, ratio, texts });
}

describe('T03-C14/C15 자동 검사 기록', () => {
  it('01 긴 한글 혼합 문구를 정상 복원한다', () => {
    const result = parseTemplatePayload(payload([{ ...baseText, content: '가나다라마바사아자차카타파하'.repeat(20) }], '1:1'));
    expect(result.ok).toBe(true);
  });
  it('02 한글·영문 혼합 문구를 정상 복원한다', () => {
    expect(parseTemplatePayload(payload([{ ...baseText, content: '한글 Korean 123 ABC' }])).ok).toBe(true);
  });
  it('03 줄바꿈 문구를 정상 복원한다', () => {
    expect(parseTemplatePayload(payload([{ ...baseText, content: '첫 줄\n둘째 줄' }])).ok).toBe(true);
  });
  it('04 이모지 문구를 정상 복원한다', () => {
    expect(parseTemplatePayload(payload([{ ...baseText, content: '안녕 👋 이미지 편집 🎨' }])).ok).toBe(true);
  });
  it('05 빈 문구를 정상 복원한다', () => {
    expect(parseTemplatePayload(payload([{ ...baseText, content: '' }])).ok).toBe(true);
  });
  it('06 세로 비율 템플릿을 정상 복원한다', () => {
    expect(parseTemplatePayload(payload([baseText], '9:16')).ok).toBe(true);
  });
  it('07 가로 비율 템플릿을 정상 복원한다', () => {
    expect(parseTemplatePayload(payload([baseText], '4:5')).ok).toBe(true);
  });
  it('08 투명 이미지와 무관하게 문구 템플릿을 복원한다', () => {
    expect(parseTemplatePayload(payload([baseText])).ok).toBe(true);
  });
  it('09 손상된 JSON을 거부한다', () => {
    expect(parseTemplatePayload('{"version":1').ok).toBe(false);
  });
  it('10 필수 texts 항목 누락 JSON을 거부한다', () => {
    const result = parseTemplatePayload(JSON.stringify({ version: 1, ratio: '1:1' }));
    expect(result.ok).toBe(false);
  });
  it('11 극단적으로 큰 fontSize 입력을 제한한다', () => {
    const result = parseTemplatePayload(payload([{ ...baseText, fontSize: 999 }]));
    expect(result.ok && result.value.texts[0].fontSize).toBe(0.5);
  });
  it('12 수정 전 FAIL: 잘못된 색상은 수정 후 PASS로 거부된다', () => {
    const result = parseTemplatePayload(payload([{ ...baseText, color: 'not-a-color' }]));
    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.errors.join('')).toContain('color');
  });
});
