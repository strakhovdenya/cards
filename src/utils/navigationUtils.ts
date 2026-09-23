export type ViewMode = 'viewer' | 'editor' | 'invites' | 'verbs';
export type MainViewMode = 'study' | 'edit';
export type StudyMode = 'cards' | 'verbs' | 'time';
export type VerbMode = 'view' | 'training' | 'study';
export type WordsMode = 'cards' | 'articles';

export interface NavigationState {
  viewMode: ViewMode;
  mainViewMode: MainViewMode;
  studyMode: StudyMode;
  verbMode: VerbMode;
  wordsMode: WordsMode;
}

const WORDS_SUBTITLES: Record<WordsMode, string> = {
  cards: 'Существительные',
  articles: 'Артикли',
};

const STUDY_SUBTITLES: Record<StudyMode, (wordsMode: WordsMode) => string> = {
  verbs: () => 'Глаголы',
  time: () => 'Времена',
  cards: (wordsMode) => WORDS_SUBTITLES[wordsMode],
};

const EDIT_SUBTITLES: Partial<Record<ViewMode, string>> = {
  verbs: 'Глаголы',
  editor: 'Существительные',
};

export const getSubtitleText = ({
  viewMode,
  mainViewMode,
  studyMode,
  wordsMode,
}: NavigationState): string | null => {
  if (viewMode === 'invites') return 'Приглашения';
  if (mainViewMode === 'study') return STUDY_SUBTITLES[studyMode](wordsMode);
  return EDIT_SUBTITLES[viewMode] ?? null;
};
