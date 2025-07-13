export interface Card {
  id: string;
  germanWord: string;
  translation: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CardFormData {
  germanWord: string;
  translation: string;
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
