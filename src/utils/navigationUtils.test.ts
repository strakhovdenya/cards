import { describe, it, expect } from 'vitest';
import {
  getSubtitleText,
  type NavigationState,
  type ViewMode,
  type MainViewMode,
  type StudyMode,
  type VerbMode,
  type WordsMode,
} from '@/utils/navigationUtils';

const baseState: NavigationState = {
  viewMode: 'viewer',
  mainViewMode: 'study',
  studyMode: 'cards',
  verbMode: 'view',
  wordsMode: 'cards',
};

const stateWith = (patch: Partial<NavigationState>): NavigationState => ({
  ...baseState,
  ...patch,
});

// Оракул: дословная копия вложенного тернарника из AuthenticatedApp.tsx до рефакторинга.
// Фиксирует порядок и приоритет веток независимо от новой реализации.
const legacySubtitleText = ({
  viewMode,
  mainViewMode,
  studyMode,
  wordsMode,
}: NavigationState): string | null =>
  viewMode === 'invites'
    ? 'Приглашения'
    : mainViewMode === 'study'
      ? studyMode === 'verbs'
        ? 'Глаголы'
        : studyMode === 'time'
          ? 'Времена'
          : wordsMode === 'articles'
            ? 'Артикли'
            : 'Существительные'
      : mainViewMode === 'edit'
        ? viewMode === 'verbs'
          ? 'Глаголы'
          : viewMode === 'editor'
            ? 'Существительные'
            : null
        : null;

describe('getSubtitleText', () => {
  it('returns "Приглашения" for invites view', () => {
    expect(getSubtitleText(stateWith({ viewMode: 'invites' }))).toBe(
      'Приглашения'
    );
  });

  it('returns "Глаголы" for study + verbs', () => {
    expect(
      getSubtitleText(stateWith({ mainViewMode: 'study', studyMode: 'verbs' }))
    ).toBe('Глаголы');
  });

  it('returns "Времена" for study + time', () => {
    expect(
      getSubtitleText(stateWith({ mainViewMode: 'study', studyMode: 'time' }))
    ).toBe('Времена');
  });

  it('returns "Артикли" for study + cards + articles', () => {
    expect(
      getSubtitleText(
        stateWith({
          mainViewMode: 'study',
          studyMode: 'cards',
          wordsMode: 'articles',
        })
      )
    ).toBe('Артикли');
  });

  it('returns "Существительные" for study + cards + default words mode', () => {
    expect(
      getSubtitleText(
        stateWith({
          mainViewMode: 'study',
          studyMode: 'cards',
          wordsMode: 'cards',
        })
      )
    ).toBe('Существительные');
  });

  it('returns "Глаголы" for edit + verbs view', () => {
    expect(
      getSubtitleText(stateWith({ mainViewMode: 'edit', viewMode: 'verbs' }))
    ).toBe('Глаголы');
  });

  it('returns "Существительные" for edit + editor view', () => {
    expect(
      getSubtitleText(stateWith({ mainViewMode: 'edit', viewMode: 'editor' }))
    ).toBe('Существительные');
  });

  it('returns null for edit with an unrecognised view', () => {
    expect(
      getSubtitleText(stateWith({ mainViewMode: 'edit', viewMode: 'viewer' }))
    ).toBeNull();
  });

  describe('branch priority', () => {
    it('invites wins over study and edit', () => {
      for (const mainViewMode of ['study', 'edit'] as const) {
        expect(
          getSubtitleText(
            stateWith({
              viewMode: 'invites',
              mainViewMode,
              studyMode: 'verbs',
            })
          )
        ).toBe('Приглашения');
      }
    });

    it('study ignores viewMode (viewMode "verbs" does not leak into study)', () => {
      expect(
        getSubtitleText(
          stateWith({
            mainViewMode: 'study',
            viewMode: 'verbs',
            studyMode: 'time',
          })
        )
      ).toBe('Времена');
    });

    it('edit ignores studyMode and wordsMode', () => {
      expect(
        getSubtitleText(
          stateWith({
            mainViewMode: 'edit',
            viewMode: 'viewer',
            studyMode: 'verbs',
            wordsMode: 'articles',
          })
        )
      ).toBeNull();
    });
  });

  describe('exhaustive equivalence with the pre-refactor ternary', () => {
    const viewModes: ViewMode[] = ['viewer', 'editor', 'invites', 'verbs'];
    const mainViewModes: MainViewMode[] = ['study', 'edit'];
    const studyModes: StudyMode[] = ['cards', 'verbs', 'time'];
    const verbModes: VerbMode[] = ['view', 'training', 'study'];
    const wordsModes: WordsMode[] = ['cards', 'articles'];

    const allStates: NavigationState[] = [];
    for (const viewMode of viewModes) {
      for (const mainViewMode of mainViewModes) {
        for (const studyMode of studyModes) {
          for (const verbMode of verbModes) {
            for (const wordsMode of wordsModes) {
              allStates.push({
                viewMode,
                mainViewMode,
                studyMode,
                verbMode,
                wordsMode,
              });
            }
          }
        }
      }
    }

    it('covers every state combination', () => {
      expect(allStates).toHaveLength(4 * 2 * 3 * 3 * 2);
    });

    it.each(allStates)('matches legacy result for %o', (state) => {
      expect(getSubtitleText(state)).toBe(legacySubtitleText(state));
    });
  });
});
