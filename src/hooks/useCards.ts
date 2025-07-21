'use client';

import { useState, useEffect } from 'react';
import { ClientCardService } from '@/services/cardService';
import { ClientTagService } from '@/services/tagService';
import type { Card, CardFormData, Tag } from '@/types';

export function useCards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [cardsCount, setCardsCount] = useState(0);

  // Загрузка тегов при инициализации
  useEffect(() => {
    void loadTags();
  }, []);

  // Уведомляем о изменении количества карточек
  useEffect(() => {
    setCardsCount(cards.length);
  }, [cards.length]);

  const loadCards = async () => {
    try {
      const fetchedCards = await ClientCardService.getCards();
      setCards(fetchedCards);
    } catch (error) {
      console.error('Error loading cards:', error);
      throw new Error('Ошибка загрузки карточек');
    }
  };

  const loadTags = async (forceRefresh = false) => {
    try {
      const tags = await ClientTagService.getTags(forceRefresh);
      setAvailableTags(tags);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const handleAddCard = async (cardData: CardFormData) => {
    try {
      const newCard = await ClientCardService.createCard(
        cardData.germanWord.trim(),
        cardData.translation.trim(),
        cardData.tagIds
      );
      setCards((prev) => [newCard, ...prev]);
      // Обновляем теги только если создавались новые теги
      if (cardData.tagIds && cardData.tagIds.length > 0) {
        await loadTags(true);
      }
    } catch (error) {
      console.error('Error adding card:', error);
      throw new Error('Ошибка добавления карточки');
    }
  };

  const handleUpdateCard = async (id: string, cardData: CardFormData) => {
    try {
      const updatedCard = await ClientCardService.updateCard(id, {
        germanWord: cardData.germanWord.trim(),
        translation: cardData.translation.trim(),
        tagIds: cardData.tagIds,
      });
      setCards((prev) =>
        prev.map((card) => (card.id === id ? updatedCard : card))
      );
      // Обновляем теги только если создавались новые теги
      if (cardData.tagIds && cardData.tagIds.length > 0) {
        await loadTags(true);
      }
    } catch (error) {
      console.error('Error updating card:', error);
      throw new Error('Ошибка обновления карточки');
    }
  };

  const handleDeleteCard = async (id: string) => {
    try {
      await ClientCardService.deleteCard(id);
      setCards((prev) => prev.filter((card) => card.id !== id));
    } catch (error) {
      console.error('Error deleting card:', error);
      throw new Error('Ошибка удаления карточки');
    }
  };

  const handleBulkImport = async (cards: CardFormData[]) => {
    try {
      const importedCards = await ClientCardService.createBulkCards(cards);
      setCards((prev) => [...importedCards, ...prev]);
      // Обновляем теги только если импортировались карточки с тегами
      const hasTags = cards.some(
        (card) => card.tagIds && card.tagIds.length > 0
      );
      if (hasTags) {
        await loadTags(true);
      }
    } catch (error) {
      console.error('Error importing cards:', error);
      throw new Error('Ошибка импорта карточек');
    }
  };

  return {
    cards,
    availableTags,
    cardsCount,
    loadCards,
    loadTags,
    handleAddCard,
    handleUpdateCard,
    handleDeleteCard,
    handleBulkImport,
  };
}
