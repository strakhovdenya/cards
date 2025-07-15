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
  createdAt: Date;
  updatedAt: Date;
}

export interface CardFormData {
  germanWord: string;
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
  user_id?: string; // Пока опциональный
}

export interface BulkCreateCardsRequest {
  cards: CreateCardRequest[];
}

export interface UpdateCardRequest {
  germanWord?: string;
  translation?: string;
  tagIds?: string[]; // Массив ID тегов
  learned?: boolean;
}

// Новые типы для работы с тегами
export interface CreateTagRequest {
  name: string;
  color?: string; // Опциональный, есть значение по умолчанию
  user_id?: string; // Пока опциональный
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
