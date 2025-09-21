// Новый интерфейс для тегов
export interface Tag {
  id: string;
  name: string;
  color: string; // Цвет в hex формате
  user_id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Обновленный интерфейс для карточек (теги теперь массив объектов Tag)
export interface Card {
  id: string;
  germanWord: string;
  translation: string;
  user_id: string; // UUID пользователя
  tags: Tag[]; // Массив объектов тегов вместо строк
  learned: boolean; // Выучена ли карточка
  word_type?: string; // Тип слова (noun, verb, adjective, etc.)
  base_form?: string; // Базовая форма слова
  grammar_data?: Record<string, unknown>; // JSON с грамматическими данными
  createdAt: Date;
  updatedAt: Date;
}

export interface CardFormData {
  germanWord: string;
  word_type?: string;
  base_form?: string;
  grammar_data?: Record<string, unknown>;
  translation: string;
  tagIds?: string[]; // Массив ID тегов вместо массива строк
  tags?: string[]; // Для обратной совместимости (имена тегов для UI)
}

// Добавляю новые типы для работы с API
export interface CreateCardRequest {
  germanWord: string;
  translation: string;
  tagIds?: string[]; // Массив ID тегов
  tags?: string[]; // Для обратной совместимости
  word_type?: string;
  base_form?: string;
  grammar_data?: Record<string, unknown>;
}

export interface BulkCreateCardsRequest {
  cards: CreateCardRequest[];
}

export interface UpdateCardRequest {
  germanWord?: string;
  translation?: string;
  tagIds?: string[]; // Массив ID тегов
  learned?: boolean;
  word_type?: string;
  base_form?: string;
  grammar_data?: Record<string, unknown>;
}

// Новые типы для работы с тегами
export interface CreateTagRequest {
  name: string;
  color?: string; // Опциональный, есть значение по умолчанию
}

export interface UpdateTagRequest {
  name?: string;
  color?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Типы для вопросов времени
export interface TimeQuestion {
  id: string;
  time_value: string;
  hour: number;
  minute: number;
  formal_description: string;
  formal_words: string[];
  informal_description: string;
  informal_words: string[];
  word_pool: string[];
  difficulty_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Интерфейсы для данных из базы данных (snake_case)
export interface DatabaseCard {
  id: string;
  german_word: string;
  translation: string;
  user_id: string;
  learned: boolean;
  word_type?: string;
  base_form?: string;
  grammar_data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  tags?: DatabaseCardTag[];
}

export interface DatabaseTag {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseCardTag {
  tag: DatabaseTag;
}

// Интерфейс для ошибок Supabase
export interface SupabaseError {
  message: string;
  code?: string;
}

export interface CardViewerState {
  currentCard: Card | null;
  isFlipped: boolean;
  cards: Card[];
  viewedCards: Set<string>;
}

export interface CardEditorState {
  cards: Card[];
  editingCard: Card | null;
  isModalOpen: boolean;
}

export type ViewMode = 'viewer' | 'editor';
export interface AppState {
  cards: Card[];
  viewMode: ViewMode;
}

// Типы для Supabase данных
export interface Invite {
  id: string;
  email: string | null;
  invite_code: string;
  invited_by: string;
  used: boolean;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

// Типы для Supabase ошибок
export interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

// Типы для результатов Supabase запросов
export interface SupabaseResponse<T> {
  data: T | null;
  error: SupabaseError | null;
}

export interface SupabaseListResponse<T> {
  data: T[] | null;
  error: SupabaseError | null;
}

// Новые типы для глаголов
export interface VerbConjugation {
  person: string;
  form: string;
  translation: string;
}

export interface VerbExamples {
  affirmativeSentence: string; // Утвердительное предложение на нем.
  affirmativeTranslation: string; // Перевод утвердительного предложения
  questionSentence: string; // Вопрос с этим глаголом (нем.)
  questionTranslation: string; // Перевод вопроса
  shortAnswer: string; // Краткий ответ (нем.)
  shortAnswerTranslation: string; // Перевод краткого ответа
}

export interface Verb {
  id: string;
  infinitive: string; // Инфинитив глагола (например, "arbeiten")
  translation: string; // Перевод инфинитива
  conjugations: VerbConjugation[]; // Спряжения по лицам
  examples?: VerbExamples; // Примеры предложений
  user_id: string;
  learned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VerbFormData {
  infinitive: string;
  translation: string;
  conjugations: VerbConjugation[];
}

export interface CreateVerbRequest {
  infinitive: string;
  translation: string;
  conjugations: VerbConjugation[];
  examples?: VerbExamples;
}

export interface BulkCreateVerbsRequest {
  verbs: CreateVerbRequest[];
}

export interface UpdateVerbRequest {
  infinitive?: string;
  translation?: string;
  conjugations?: VerbConjugation[];
  examples?: VerbExamples;
  learned?: boolean;
}

// Типы для базы данных глаголов (snake_case)
export interface DatabaseVerb {
  id: string;
  infinitive: string;
  translation: string;
  conjugations: VerbConjugation[];
  examples?: VerbExamples;
  user_id: string;
  learned: boolean;
  created_at: string;
  updated_at: string;
}

// Типы для тренировки глаголов
export interface VerbTrainingState {
  currentVerb: Verb | null;
  currentPerson: string | null;
  isFormVisible: boolean;
  verbs: Verb[];
  viewedVerbs: Set<string>;
}

export interface VerbTableState {
  verbs: Verb[];
  selectedVerb: Verb | null;
  isModalOpen: boolean;
}

export interface VerbAppState {
  verbs: Verb[];
}
