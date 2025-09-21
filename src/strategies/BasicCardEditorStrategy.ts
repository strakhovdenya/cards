import type { Card } from '@/types';
import type {
  CardEditorStrategy,
  EditorField,
  EditorFormData,
} from '@/types/cardEditorStrategy';

export class BasicCardEditorStrategy implements CardEditorStrategy<Card> {
  getEditorFields(): EditorField[] {
    // Базовая стратегия не добавляет дополнительных полей
    return [];
  }

  getInitialFormData(card?: Card): EditorFormData {
    return {
      germanWord: card?.germanWord ?? '',
      translation: card?.translation ?? '',
      tags: card?.tags?.map((tag) => tag.name) ?? [],
      word_type: card?.word_type ?? undefined,
      base_form: card?.base_form ?? undefined,
      grammar_data: card?.grammar_data ?? undefined,
    };
  }

  validateFields(): Partial<EditorFormData> {
    const errors: Partial<EditorFormData> = {};

    // Базовая валидация уже есть в CardEditor, здесь только дополнительные поля
    return errors;
  }

  supports(card: Card): boolean {
    // Поддерживает все карточки, которые не являются существительными
    return card.word_type !== 'noun';
  }

  getType(): string {
    return 'basic-card-editor';
  }

  getDisplayName(): string {
    return 'Обычная карточка';
  }
}
