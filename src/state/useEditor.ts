import { useMemo, useReducer } from 'react';
import { DEFAULTS, LIMITS } from '../domain/constants';
import { createId } from '../domain/id';
import type { Project, Ratio, Template, TextItem } from '../domain/types';

function createTextItem(): TextItem {
  return {
    id: createId(),
    content: '문구를 입력하세요',
    x: 0.5,
    y: 0.5,
    fontSize: DEFAULTS.fontSize,
    color: DEFAULTS.color,
    align: DEFAULTS.align,
    weight: DEFAULTS.weight,
    lineHeight: DEFAULTS.lineHeight,
  };
}

const initialProject: Project = {
  version: 1,
  ratio: '1:1',
  image: null,
  texts: [],
};

type Action =
  | { type: 'SET_IMAGE'; image: Project['image'] }
  | { type: 'SET_RATIO'; ratio: Ratio }
  | { type: 'ADD_TEXT' }
  | { type: 'UPDATE_TEXT'; id: string; patch: Partial<Omit<TextItem, 'id'>> }
  | { type: 'REMOVE_TEXT'; id: string }
  | { type: 'APPLY_TEMPLATE'; template: Template };

function reducer(project: Project, action: Action): Project {
  switch (action.type) {
    case 'SET_IMAGE':
      return { ...project, image: action.image };
    case 'SET_RATIO':
      return { ...project, ratio: action.ratio };
    case 'ADD_TEXT':
      if (project.texts.length >= LIMITS.maxTexts) return project;
      return { ...project, texts: [...project.texts, createTextItem()] };
    case 'UPDATE_TEXT':
      return {
        ...project,
        texts: project.texts.map((t) =>
          t.id === action.id ? { ...t, ...action.patch } : t,
        ),
      };
    case 'REMOVE_TEXT':
      return { ...project, texts: project.texts.filter((t) => t.id !== action.id) };
    case 'APPLY_TEMPLATE':
      return {
        ...project,
        ratio: action.template.ratio,
        texts: action.template.texts.map((t) => ({ ...t, id: createId() })),
      };
    default:
      return project;
  }
}

export function useEditor() {
  const [project, dispatch] = useReducer(reducer, initialProject);

  const actions = useMemo(
    () => ({
      setImage: (image: Project['image']) => dispatch({ type: 'SET_IMAGE', image }),
      setRatio: (ratio: Ratio) => dispatch({ type: 'SET_RATIO', ratio }),
      addText: () => dispatch({ type: 'ADD_TEXT' }),
      updateText: (id: string, patch: Partial<Omit<TextItem, 'id'>>) =>
        dispatch({ type: 'UPDATE_TEXT', id, patch }),
      removeText: (id: string) => dispatch({ type: 'REMOVE_TEXT', id }),
      applyTemplate: (template: Template) =>
        dispatch({ type: 'APPLY_TEMPLATE', template }),
    }),
    [],
  );

  return { project, actions };
}
