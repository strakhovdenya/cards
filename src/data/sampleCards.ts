// Интерфейс для sample карточек (с тегами как строки для миграции)
interface SampleCard {
  id: string;
  germanWord: string;
  translation: string;
  user_id: string;
  tags: string[]; // Массив строк для миграции
  learned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Используем константную дату для избежания проблем с гидратацией
const SAMPLE_DATE = '2024-01-01T00:00:00.000Z';

// Временный UUID для sample данных
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';

export const sampleCards: SampleCard[] = [
  {
    id: '1',
    germanWord: 'der Hund',
    translation: 'собака',
    user_id: DEFAULT_USER_ID,
    tags: ['животные', 'базовый', 'мужской род'],
    learned: false,
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
  {
    id: '2',
    germanWord: 'die Katze',
    translation: 'кошка',
    user_id: DEFAULT_USER_ID,
    tags: ['животные', 'базовый', 'женский род'],
    learned: false,
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
  {
    id: '3',
    germanWord: 'das Haus',
    translation: 'дом',
    user_id: DEFAULT_USER_ID,
    tags: ['места', 'базовый', 'средний род'],
    learned: false,
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
  {
    id: '4',
    germanWord: 'die Schule',
    translation: 'школа',
    user_id: DEFAULT_USER_ID,
    tags: ['места', 'базовый', 'женский род'],
    learned: false,
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
  {
    id: '5',
    germanWord: 'das Wasser',
    translation: 'вода',
    user_id: DEFAULT_USER_ID,
    tags: ['базовый', 'средний род'],
    learned: false,
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
  {
    id: '6',
    germanWord: 'der Freund',
    translation: 'друг',
    user_id: DEFAULT_USER_ID,
    tags: ['семья и отношения', 'базовый', 'мужской род'],
    learned: false,
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
  {
    id: '7',
    germanWord: 'die Zeit',
    translation: 'время',
    user_id: DEFAULT_USER_ID,
    tags: ['время', 'базовый', 'женский род'],
    learned: false,
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
  {
    id: '8',
    germanWord: 'das Buch',
    translation: 'книга',
    user_id: DEFAULT_USER_ID,
    tags: ['предметы', 'базовый', 'средний род'],
    learned: false,
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
  {
    id: '9',
    germanWord: 'die Arbeit',
    translation: 'работа',
    user_id: DEFAULT_USER_ID,
    tags: ['работа', 'базовый', 'женский род'],
    learned: false,
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
  {
    id: '10',
    germanWord: 'das Auto',
    translation: 'машина',
    user_id: DEFAULT_USER_ID,
    tags: ['транспорт', 'базовый', 'средний род'],
    learned: false,
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
  {
    id: '11',
    germanWord: 'die Familie',
    translation: 'семья',
    user_id: DEFAULT_USER_ID,
    tags: ['семья и отношения', 'базовый', 'женский род'],
    learned: false,
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
  {
    id: '12',
    germanWord: 'der Tag',
    translation: 'день',
    user_id: DEFAULT_USER_ID,
    tags: ['время', 'базовый', 'мужской род'],
    learned: false,
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
  {
    id: '13',
    germanWord: 'die Liebe',
    translation: 'любовь',
    user_id: DEFAULT_USER_ID,
    tags: ['семья и отношения', 'базовый', 'женский род'],
    learned: false,
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
  {
    id: '14',
    germanWord: 'das Geld',
    translation: 'деньги',
    user_id: DEFAULT_USER_ID,
    tags: ['работа', 'базовый', 'средний род'],
    learned: false,
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
  {
    id: '15',
    germanWord: 'die Musik',
    translation: 'музыка',
    user_id: DEFAULT_USER_ID,
    tags: ['искусство', 'базовый', 'женский род'],
    learned: false,
    createdAt: new Date(SAMPLE_DATE),
    updatedAt: new Date(SAMPLE_DATE),
  },
];
