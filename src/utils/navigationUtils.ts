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

// Учебный экран — одна точка навигации «Изучение»; общий для приложения и демо
export type StudyScreen =
  | 'cards'
  | 'articles'
  | 'verbs-view'
  | 'verbs-training'
  | 'verbs-study'
  | 'time';

export type StudyScreenState = Pick<
  NavigationState,
  'studyMode' | 'wordsMode' | 'verbMode'
>;

export const STUDY_SCREENS: Readonly<Record<StudyScreen, StudyScreenState>> = {
  cards: { studyMode: 'cards', wordsMode: 'cards', verbMode: 'view' },
  articles: { studyMode: 'cards', wordsMode: 'articles', verbMode: 'view' },
  'verbs-view': { studyMode: 'verbs', wordsMode: 'cards', verbMode: 'view' },
  'verbs-training': {
    studyMode: 'verbs',
    wordsMode: 'cards',
    verbMode: 'training',
  },
  'verbs-study': { studyMode: 'verbs', wordsMode: 'cards', verbMode: 'study' },
  time: { studyMode: 'time', wordsMode: 'cards', verbMode: 'view' },
};

export const getStudyScreenSubtitle = (screen: StudyScreen): string | null =>
  getSubtitleText({
    viewMode: 'viewer',
    mainViewMode: 'study',
    ...STUDY_SCREENS[screen],
  });
