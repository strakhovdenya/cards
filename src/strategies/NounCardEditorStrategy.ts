import type { Card } from '@/types';
import type {
  CardEditorStrategy,
  EditorField,
  EditorFormData,
} from '@/types/cardEditorStrategy';

export class NounCardEditorStrategy implements CardEditorStrategy<Card> {
  getEditorFields(): EditorField[] {
    return [
      {
        name: 'word_type',
        label: 'Тип слова',
        type: 'select',
        required: false,
        options: [
          'noun',
          'verb',
          'adjective',
          'adverb',
          'preposition',
          'conjunction',
          'other',
        ],
        helperText: 'Выберите тип слова для лучшей категоризации',
      },
      {
        name: 'base_form',
        label: 'Базовая форма',
        type: 'text',
        required: false,
        placeholder: 'Например: der Mann (для мужского рода)',
        helperText: 'Базовая форма с артиклем (der/die/das + слово)',
      },
      {
        name: 'article',
        label: 'Артикль',
        type: 'select',
        required: false,
        options: ['der', 'die', 'das'],
        helperText: 'Род существительного',
      },
      {
        name: 'plural',
        label: 'Множественное число',
        type: 'text',
        required: false,
        placeholder: 'Например: die Männer',
        helperText: 'Форма множественного числа с артиклем',
      },
    ];
  }

  getInitialFormData(card?: Card): EditorFormData {
    const grammarData = card?.grammar_data as
      | { article?: string; plural?: string }
      | undefined;

    return {
      germanWord: card?.germanWord ?? '',
      translation: card?.translation ?? '',
      tags: card?.tags?.map((tag) => tag.name) ?? [],
      word_type: card?.word_type ?? 'noun',
      base_form: card?.base_form ?? '',
      grammar_data: card?.grammar_data ?? undefined,
      // Извлекаем отдельные поля из grammar_data для удобства редактирования
      article: grammarData?.article ?? '',
      plural: grammarData?.plural ?? '',
    };
  }

  validateFields(formData: EditorFormData): Partial<EditorFormData> {
    const errors: Partial<EditorFormData> = {};

    // Валидация для существительных
    if (formData.word_type === 'noun') {
      // Если указан артикль, проверяем его корректность
      if (
        formData.article &&
        !['der', 'die', 'das'].includes(formData.article)
      ) {
        errors.article = 'Артикль должен быть der, die или das';
      }
    }

    return errors;
  }

  supports(card: Card): boolean {
    return card.word_type === 'noun';
  }

  getType(): string {
    return 'noun-card-editor';
  }

  getDisplayName(): string {
    return 'Существительное';
  }
}
