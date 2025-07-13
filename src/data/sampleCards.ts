import { Card } from '@/types';

// Используем константную дату для избежания проблем с гидратацией
const SAMPLE_DATE = '2024-01-01T00:00:00.000Z';

export const sampleCards: Card[] = [
  {
    id: '1',
    germanWord: 'der Hund',
    translation: 'собака',
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
  {
    id: '2',
    germanWord: 'die Katze',
    translation: 'кошка',
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
  {
    id: '3',
    germanWord: 'das Haus',
    translation: 'дом',
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
  {
    id: '4',
    germanWord: 'die Schule',
    translation: 'школа',
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
  {
    id: '5',
    germanWord: 'das Wasser',
    translation: 'вода',
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
  {
    id: '6',
    germanWord: 'der Freund',
    translation: 'друг',
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
  {
    id: '7',
    germanWord: 'die Zeit',
    translation: 'время',
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
  {
    id: '8',
    germanWord: 'das Buch',
    translation: 'книга',
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
  {
    id: '9',
    germanWord: 'die Arbeit',
    translation: 'работа',
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
  {
    id: '10',
    germanWord: 'das Auto',
    translation: 'машина',
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
  {
    id: '11',
    germanWord: 'die Familie',
    translation: 'семья',
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
  {
    id: '12',
    germanWord: 'der Tag',
    translation: 'день',
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
  {
    id: '13',
    germanWord: 'die Liebe',
    translation: 'любовь',
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
  {
    id: '14',
    germanWord: 'das Geld',
    translation: 'деньги',
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
  {
    id: '15',
    germanWord: 'die Musik',
    translation: 'музыка',
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
];
