// Интерфейс стратегии для отображения карточек
export interface CardData {
  id: string;
  learned: boolean;
  createdAt: Date;
  updatedAt: Date;
  user_id: string;
}

// Данные для отображения на карточке
export interface CardDisplayData {
  frontText: string;
  backText: string;
  speechText: string; // текст для произношения
  tags?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  additionalInfo?: Record<string, unknown>; // дополнительные данные для отображения
}

// Интерфейс стратегии для карточек
export interface CardStrategy<T extends CardData = CardData> {
  // Получить данные для отображения карточки
  getDisplayData(card: T, frontSide: 'german' | 'russian'): CardDisplayData;

  // Получить текст для произношения
  getSpeechText(card: T): string;

  // Получить теги карточки
  getTags(
    card: T
  ): Array<{ id: string; name: string; color: string }> | undefined;

  // Проверить, поддерживает ли стратегия данный тип карточки
  supports(card: T): boolean;

  // Получить тип стратегии
  getType(): string;
}

// Контекст для стратегии
export interface CardStrategyContext {
  frontSide: 'german' | 'russian';
  isFlipped: boolean;
  onToggleLearned?: (card: CardData) => Promise<void>;
}
