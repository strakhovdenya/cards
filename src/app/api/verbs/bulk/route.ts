import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { isDuplicateGermanWord, extractGermanWords } from '@/utils/verbUtils';
import type { BulkCreateVerbsRequest, ApiResponse } from '@/types';

interface DbVerb {
  id: string;
  infinitive: string;
  translation: string;
  conjugations: Array<{
    person: string;
    form: string;
    translation: string;
  }>;
  examples?: {
    affirmativeSentence: string;
    affirmativeTranslation: string;
    questionSentence: string;
    questionTranslation: string;
    shortAnswer: string;
    shortAnswerTranslation: string;
  } | null;
  user_id: string;
  learned: boolean;
  created_at: string;
  updated_at: string;
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({
      cookies: () => cookieStore,
    });

    // Проверяем аутентификацию
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Получаем данные из запроса
    const body = (await request.json()) as BulkCreateVerbsRequest;

    if (!body.verbs || !Array.isArray(body.verbs) || body.verbs.length === 0) {
      return NextResponse.json(
        { error: 'Неверный формат данных' },
        { status: 400 }
      );
    }

    // Получаем существующие глаголы для проверки дубликатов
    const { data: existingVerbs, error: fetchError } = await supabase
      .from('verbs')
      .select('infinitive')
      .eq('user_id', user.id);

    if (fetchError) {
      console.error('Error fetching existing verbs:', fetchError);
      return NextResponse.json(
        { error: 'Ошибка при проверке дубликатов' },
        { status: 500 }
      );
    }

    const existingGermanWords = extractGermanWords(existingVerbs || []);

    // Валидируем каждый глагол
    const validPersons = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie / Sie'];
    const duplicateVerbs: string[] = [];

    for (const verb of body.verbs) {
      if (!verb.infinitive || !verb.translation) {
        return NextResponse.json(
          { error: 'Неполные данные глагола' },
          { status: 400 }
        );
      }

      if (!verb.conjugations || !Array.isArray(verb.conjugations)) {
        return NextResponse.json(
          { error: `Глагол "${verb.infinitive}" не имеет спряжений` },
          { status: 400 }
        );
      }

      if (verb.conjugations.length !== 6) {
        return NextResponse.json(
          {
            error: `Глагол "${verb.infinitive}" должен иметь ровно 6 форм спряжения`,
          },
          { status: 400 }
        );
      }

      // Проверяем наличие всех форм спряжения
      const persons = verb.conjugations.map((c) => c.person);
      for (const person of validPersons) {
        if (!persons.includes(person)) {
          return NextResponse.json(
            { error: `Глагол "${verb.infinitive}" не имеет формы "${person}"` },
            { status: 400 }
          );
        }
      }

      // Проверяем уникальность форм спряжения
      const uniquePersons = new Set(persons);
      if (uniquePersons.size !== 6) {
        return NextResponse.json(
          {
            error: `Глагол "${verb.infinitive}" имеет дублирующиеся формы спряжения`,
          },
          { status: 400 }
        );
      }

      // Проверяем на дубликаты среди существующих глаголов
      if (isDuplicateGermanWord(verb.infinitive, existingGermanWords)) {
        duplicateVerbs.push(verb.infinitive);
      }
    }

    // Если есть дубликаты, возвращаем ошибку
    if (duplicateVerbs.length > 0) {
      return NextResponse.json(
        {
          error: `Следующие глаголы уже существуют: ${duplicateVerbs.join(', ')}`,
        },
        { status: 409 }
      );
    }

    // Проверяем дубликаты внутри нового списка
    const newGermanWords = body.verbs.map((v) => v.infinitive);
    const uniqueNewWords = new Set(
      newGermanWords.map((word) =>
        word.trim().toLowerCase().replace(/,/g, '').replace(/\s+/g, '')
      )
    );

    if (uniqueNewWords.size !== newGermanWords.length) {
      return NextResponse.json(
        { error: 'В списке есть дублирующиеся глаголы' },
        { status: 400 }
      );
    }

    // Подготавливаем данные для вставки
    const verbsToInsert = body.verbs.map((verb) => ({
      infinitive: verb.infinitive,
      translation: verb.translation,
      conjugations: verb.conjugations,
      examples: verb.examples ?? null,
      user_id: user.id,
      learned: false,
    }));

    // Вставляем глаголы в базу данных
    const { data: insertedVerbs, error: insertError } = await supabase
      .from('verbs')
      .insert(verbsToInsert)
      .select('*');

    if (insertError) {
      console.error('Ошибка вставки глаголов:', insertError);
      return NextResponse.json(
        { error: 'Ошибка при создании глаголов' },
        { status: 500 }
      );
    }

    // Преобразуем данные в нужный формат
    const verbs = (insertedVerbs as DbVerb[]).map((verb) => ({
      id: verb.id,
      infinitive: verb.infinitive,
      translation: verb.translation,
      conjugations: verb.conjugations,
      examples: verb.examples,
      user_id: verb.user_id,
      learned: verb.learned,
      createdAt: new Date(verb.created_at),
      updatedAt: new Date(verb.updated_at),
    }));

    const response: ApiResponse<typeof verbs> = {
      data: verbs,
      message: `Успешно создано ${verbs.length} глаголов`,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Ошибка массового импорта глаголов:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
