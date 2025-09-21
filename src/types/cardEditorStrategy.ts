import type { Card, CardFormData } from './index';

// Интерфейс для дополнительных полей редактора
export interface EditorField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'json';
  required?: boolean;
  options?: string[]; // для select полей
  placeholder?: string;
  helperText?: string;
}

// Интерфейс для данных формы редактора
export interface EditorFormData extends CardFormData {
  word_type?: string;
  base_form?: string;
  grammar_data?: Record<string, unknown>;
  // Дополнительные поля для существительных
  article?: string;
  plural?: string;
}

// Интерфейс стратегии редактора карточек
export interface CardEditorStrategy<T extends Card = Card> {
  // Получить дополнительные поля для редактирования
  getEditorFields(card?: T, currentWordType?: string): EditorField[];

  // Получить начальные данные формы
  getInitialFormData(card?: T): EditorFormData;

  // Валидация дополнительных полей
  validateFields(formData: EditorFormData): Partial<EditorFormData>;

  // Проверить, поддерживает ли стратегия данный тип карточки
  supports(card: T): boolean;

  // Получить тип стратегии
  getType(): string;

  // Получить название стратегии для UI
  getDisplayName(): string;
}
