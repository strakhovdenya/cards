import type { Card } from '@/types';
import type {
  CardEditorStrategy,
  EditorField,
  EditorFormData,
} from '@/types/cardEditorStrategy';
import { BasicCardEditorStrategy } from './BasicCardEditorStrategy';
import { NounCardEditorStrategy } from './NounCardEditorStrategy';

// Создаем единственные экземпляры стратегий для оптимизации
const basicCardEditorStrategy = new BasicCardEditorStrategy();
const nounCardEditorStrategy = new NounCardEditorStrategy();

export class AdaptiveCardEditorStrategy implements CardEditorStrategy<Card> {
  private getStrategy(card: Card): CardEditorStrategy<Card> {
    // Для существительных используем специальную стратегию
    if (card.word_type === 'noun') {
      return nounCardEditorStrategy;
    }

    // Для всех остальных типов используем базовую стратегию
    return basicCardEditorStrategy;
  }

  getEditorFields(card?: Card, currentWordType?: string): EditorField[] {
    // Всегда показываем поле "Тип слова" для возможности изменения типа
    const baseFields: EditorField[] = [
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
        helperText: 'Выберите тип слова для отображения соответствующих полей',
      },
    ];

    // Определяем тип слова для отображения полей
    const wordType = currentWordType ?? card?.word_type;

    // Добавляем специфичные поля в зависимости от типа слова
    if (wordType === 'noun') {
      const nounFields: EditorField[] = [
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
      return [...baseFields, ...nounFields];
    }

    // Для других типов слов возвращаем только базовые поля
    return baseFields;
  }

  getInitialFormData(card?: Card): EditorFormData {
    if (card) {
      // Для существующей карточки всегда инициализируем с данными из БД
      const grammarData = card.grammar_data as
        | { article?: string; plural?: string }
        | undefined;

      return {
        germanWord: card.germanWord ?? '',
        translation: card.translation ?? '',
        tags: card.tags?.map((tag) => tag.name) ?? [],
        word_type: card.word_type ?? undefined,
        base_form: card.base_form ?? '',
        grammar_data: card.grammar_data ?? undefined,
        article: grammarData?.article ?? '',
        plural: grammarData?.plural ?? '',
      };
    }

    // Для новой карточки возвращаем базовые поля
    return {
      germanWord: '',
      translation: '',
      tags: [],
      word_type: undefined,
      base_form: '',
      grammar_data: undefined,
      article: '',
      plural: '',
    };
  }

  validateFields(formData: EditorFormData): Partial<EditorFormData> {
    // Если указан тип слова, используем соответствующую стратегию
    if (formData.word_type === 'noun') {
      return nounCardEditorStrategy.validateFields(formData);
    }

    return basicCardEditorStrategy.validateFields();
  }

  supports(): boolean {
    return true; // Адаптивная стратегия поддерживает все карточки
  }

  getType(): string {
    return 'adaptive-card-editor';
  }

  getDisplayName(): string {
    return 'Универсальный редактор';
  }
}
