import { test, expect, type Page } from '@playwright/test';

test.describe('/demo page', () => {
  test('opens without login in the shared shell', async ({ page }) => {
    await page.goto('/demo');

    // Stays on /demo — no redirect to login
    await expect(page).toHaveURL('/demo');

    // Shared app header with the guest badge instead of a demo banner
    await expect(page.getByText('German Word Cards')).toBeVisible();
    await expect(page.getByText('Гость')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Редактирование' })
    ).toBeDisabled();

    // Wait for loading spinner to disappear (Supabase fetch)
    await expect(page.getByRole('progressbar')).toBeHidden({ timeout: 15_000 });

    // Card counter chip appears, e.g. "1 из 12"
    await expect(page.getByText(/\d+ из \d+/)).toBeVisible();
  });

  test('card flip works', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.getByRole('progressbar')).toBeHidden({ timeout: 15_000 });

    // Before flipping: hint shows translation direction
    await expect(page.getByText(/нажмите для показа/i)).toBeVisible();

    // Click the flip button
    await page.getByRole('button', { name: 'Перевернуть' }).click();

    // After flipping: hint changes to "return" prompt
    await expect(page.getByText('Нажмите для возврата')).toBeVisible();
  });
});

// Мобильная геометрия на подменённых guest GET: живые данные не нужны,
// а длинные слова проверяют перенос
const LONG_WORD = 'Donaudampfschifffahrtsgesellschaftskapitän';
const LONG_TRANSLATION =
  'капитан дунайского пароходного общества с очень длинным переводом';
const NOW = '2026-10-29T00:00:00.000Z';
const PERSONS = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie / Sie'];

const card = (index: number) => ({
  id: `card-${index}`,
  germanWord: `${LONG_WORD}${index}`,
  translation: LONG_TRANSLATION,
  user_id: 'user-demo',
  learned: false,
  tags: [],
  createdAt: NOW,
  updatedAt: NOW,
});

const noun = (index: number) => ({
  ...card(index),
  id: `noun-${index}`,
  base_form: `${LONG_WORD}${index}`,
  word_type: 'noun',
  grammar_data: { article: 'der' },
});

const verb = (index: number) => ({
  id: `verb-${index}`,
  infinitive: `${LONG_WORD}en${index}`,
  translation: LONG_TRANSLATION,
  conjugations: PERSONS.map((person) => ({
    person,
    form: `${LONG_WORD}e`,
    translation: LONG_TRANSLATION,
  })),
  user_id: 'user-demo',
  learned: false,
  createdAt: NOW,
  updatedAt: NOW,
});

const INDEXES = [1, 2, 3];

const GUEST_RESPONSES: Record<string, unknown> = {
  '/api/cards': INDEXES.map(card),
  '/api/nouns': INDEXES.map(noun),
  '/api/tags': [],
  '/api/verbs': INDEXES.map(verb),
  '/api/verbs/random': verb(1),
  '/api/time/random': {
    id: 'time-1',
    time_value: '10:30',
    hour: 10,
    minute: 30,
    formal_description: 'zehn Uhr dreißig',
    formal_words: ['zehn', 'Uhr', 'dreißig'],
    informal_description: 'halb elf',
    informal_words: ['halb', 'elf'],
    word_pool: ['zehn', 'Uhr', 'dreißig', 'halb', 'elf', 'Viertel', 'nach'],
    difficulty_level: 1,
    is_active: true,
    created_at: NOW,
  },
};

const routeGuestApi = async (page: Page) => {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const data = GUEST_RESPONSES[url.pathname];
    const isGuestRead =
      route.request().method() === 'GET' &&
      url.searchParams.get('guest') === '1';
    if (!isGuestRead || data === undefined) {
      await route.fulfill({ status: 404, json: { error: 'not found' } });
      return;
    }
    await route.fulfill({ json: { data } });
  });
};

interface ScreenCase {
  name: string;
  menu: RegExp[];
  lastAction: string;
}

const SCREENS: ScreenCase[] = [
  {
    name: 'cards',
    menu: [/^Слова/, /^Карточки/],
    lastAction: 'Перемешать',
  },
  { name: 'articles', menu: [/^Слова/, /^Артикли/], lastAction: 'Вперёд' },
  {
    name: 'verbs-view',
    menu: [/^Глаголы/, /^Просмотр/],
    lastAction: 'Перемешать',
  },
  {
    name: 'verbs-training',
    menu: [/^Глаголы/, /^Тренировка/],
    lastAction: 'Следующий глагол',
  },
  {
    name: 'verbs-study',
    menu: [/^Глаголы/, /^Изучение Изучение/],
    lastAction: 'Перемешать',
  },
  { name: 'time', menu: [/^Время/], lastAction: 'Начать заново' },
];

const WIDTHS = [320, 375, 390, 430];
const HEIGHTS = [568, 390];

const openScreen = async (page: Page, screenCase: ScreenCase) => {
  await page.getByRole('button', { name: 'Изучение', exact: true }).click();
  for (const name of screenCase.menu) {
    await page.getByRole('button', { name }).click();
  }
  await expect(page.getByRole('dialog')).toHaveCount(0);
};

const expectNoHorizontalScroll = async (page: Page, label: string) => {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
  expect(overflow, label).toBeLessThanOrEqual(0);
};

// Последнее действие экрана после прокрутки видно над нижней панелью
const expectLastActionAboveNavigation = async (
  page: Page,
  screenCase: ScreenCase,
  label: string
) => {
  const action = page
    .getByRole('button', { name: screenCase.lastAction })
    .last();
  await action.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  const actionBox = await action.boundingBox();
  const navigationBox = await page
    .getByRole('button', { name: 'Изучение', exact: true })
    .boundingBox();
  expect(actionBox, label).not.toBeNull();
  expect(navigationBox, label).not.toBeNull();
  expect(actionBox!.y + actionBox!.height, label).toBeLessThanOrEqual(
    navigationBox!.y
  );
  await action.click();
};

test.describe('/demo mobile layout (mocked guest data)', () => {
  for (const width of WIDTHS) {
    for (const height of HEIGHTS) {
      test(`six screens fit ${width}x${height}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await routeGuestApi(page);
        await page.goto('/demo');
        await expect(page.getByText('Гость')).toBeVisible();

        for (const screenCase of SCREENS) {
          const label = `${screenCase.name} ${width}x${height}`;
          await openScreen(page, screenCase);
          await expect(
            page.getByRole('button', { name: screenCase.lastAction }).last()
          ).toBeVisible();
          await expectNoHorizontalScroll(page, label);
          await expectLastActionAboveNavigation(page, screenCase, label);
        }
      });
    }
  }

  test('guest learned mark survives reload and stays on device', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await routeGuestApi(page);
    await page.goto('/demo');

    await page.getByRole('button', { name: 'Отметить как выученное' }).click();
    await expect(page.getByRole('button', { name: 'Выучено' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('button', { name: 'Выучено' })).toBeVisible();
  });
});
