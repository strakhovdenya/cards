export interface Card {
  id: string;
  germanWord: string;
  translation: string;
  user_id: string; // UUID пользователя
  tags: string[]; // Теги для карточки
  learned: boolean; // Выучена ли карточка
  createdAt: Date;
  updatedAt: Date;
}

export interface CardFormData {
  germanWord: string;
  translation: string;
  tags?: string[]; // Опциональные теги при создании
}

// Добавляю новые типы для работы с API
export interface CreateCardRequest {
  germanWord: string;
  translation: string;
  tags?: string[];
  user_id?: string; // Пока опциональный
}

export interface UpdateCardRequest {
  germanWord?: string;
  translation?: string;
  tags?: string[];
  learned?: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
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
