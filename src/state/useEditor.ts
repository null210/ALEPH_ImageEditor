import { useMemo, useReducer } from 'react';
import { DEFAULTS, LIMITS } from '../domain/constants';
import { createId } from '../domain/id';
import type { CloneDab, CloneStroke, Project, Ratio, Template, TextItem } from '../domain/types';

function createTextItem(id = createId()): TextItem {
  return {
    id,
    content: '문구를 입력하세요',
    x: 0.5,
    y: 0.5,
    fontSize: DEFAULTS.fontSize,
    color: DEFAULTS.color,
    fontFamily: DEFAULTS.fontFamily,
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
  cloneStrokes: [],
};

type Action =
  | { type: 'SET_IMAGE'; image: Project['image'] }
  | { type: 'UPDATE_IMAGE'; patch: Partial<NonNullable<Project['image']>> }
  | { type: 'SET_RATIO'; ratio: Ratio }
  | { type: 'ADD_TEXT'; id: string }
  | { type: 'UPDATE_TEXT'; id: string; patch: Partial<Omit<TextItem, 'id'>> }
  | { type: 'REMOVE_TEXT'; id: string }
  | { type: 'APPLY_TEMPLATE'; template: Template }
  | { type: 'ADD_CLONE_STROKE'; stroke: CloneStroke }
  | { type: 'ADD_CLONE_DAB'; id: string; dab: CloneDab }
  | { type: 'UNDO_CLONE' };

function reducer(project: Project, action: Action): Project {
  switch (action.type) {
    case 'SET_IMAGE':
      return { ...project, image: action.image };
    case 'UPDATE_IMAGE':
      return project.image ? { ...project, image: { ...project.image, ...action.patch } } : project;
    case 'SET_RATIO':
      return { ...project, ratio: action.ratio };
    case 'ADD_TEXT':
      if (project.texts.length >= LIMITS.maxTexts) return project;
      return { ...project, texts: [...project.texts, createTextItem(action.id)] };
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
    case 'ADD_CLONE_STROKE':
      return { ...project, cloneStrokes: [...(project.cloneStrokes ?? []), action.stroke] };
    case 'ADD_CLONE_DAB':
      return {
        ...project,
        cloneStrokes: (project.cloneStrokes ?? []).map((stroke) =>
          stroke.id === action.id ? { ...stroke, dabs: [...(stroke.dabs ?? []), action.dab] } : stroke,
        ),
      };
    case 'UNDO_CLONE':
      return { ...project, cloneStrokes: (project.cloneStrokes ?? []).slice(0, -1) };
      return project;
  }
}

export function useEditor() {
  const [project, dispatch] = useReducer(reducer, initialProject);

  const actions = useMemo(
    () => ({
      setImage: (image: Project['image']) => dispatch({ type: 'SET_IMAGE', image }),
      updateImage: (patch: Partial<NonNullable<Project['image']>>) => dispatch({ type: 'UPDATE_IMAGE', patch }),
      setRatio: (ratio: Ratio) => dispatch({ type: 'SET_RATIO', ratio }),
      addText: () => {
        const id = createId();
        dispatch({ type: 'ADD_TEXT', id });
        return id;
      },
      updateText: (id: string, patch: Partial<Omit<TextItem, 'id'>>) =>
        dispatch({ type: 'UPDATE_TEXT', id, patch }),
      removeText: (id: string) => dispatch({ type: 'REMOVE_TEXT', id }),
      applyTemplate: (template: Template) =>
        dispatch({ type: 'APPLY_TEMPLATE', template }),
      startCloneStroke: (stroke: CloneStroke) =>
        dispatch({ type: 'ADD_CLONE_STROKE', stroke }),
      addCloneDab: (id: string, dab: CloneDab) =>
        dispatch({ type: 'ADD_CLONE_DAB', id, dab }),
      undoClone: () => dispatch({ type: 'UNDO_CLONE' }),
    }),
    [],
  );

  return { project, actions };
}
