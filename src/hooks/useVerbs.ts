'use client';

import { useState } from 'react';
import {
  getVerbs,
  createVerb,
  updateVerb,
  deleteVerb,
} from '@/services/verbService';
import type { Verb, VerbFormData } from '@/types';

export function useVerbs() {
  const [verbs, setVerbs] = useState<Verb[]>([]);
  const [editingVerb, setEditingVerb] = useState<Verb | null>(null);
  const [verbFormData, setVerbFormData] = useState({
    infinitive: '',
    translation: '',
    conjugations: [
      { person: 'ich', form: '', translation: '' },
      { person: 'du', form: '', translation: '' },
      { person: 'er/sie/es', form: '', translation: '' },
      { person: 'wir', form: '', translation: '' },
      { person: 'ihr', form: '', translation: '' },
      { person: 'sie / Sie', form: '', translation: '' },
    ],
  });

  const loadVerbs = async () => {
    try {
      const fetchedVerbs = await getVerbs();
      setVerbs(fetchedVerbs);
    } catch (error) {
      console.error('Error loading verbs:', error);
      throw new Error('Ошибка загрузки глаголов');
    }
  };

  const handleVerbUpdate = (updatedVerb: Verb) => {
    setVerbs((prev) =>
      prev.map((v) => (v.id === updatedVerb.id ? updatedVerb : v))
    );
  };

  const handleAddVerb = () => {
    setEditingVerb(null);
    setVerbFormData({
      infinitive: '',
      translation: '',
      conjugations: [
        { person: 'ich', form: '', translation: '' },
        { person: 'du', form: '', translation: '' },
        { person: 'er/sie/es', form: '', translation: '' },
        { person: 'wir', form: '', translation: '' },
        { person: 'ihr', form: '', translation: '' },
        { person: 'sie / Sie', form: '', translation: '' },
      ],
    });
  };

  const handleEditVerb = (verb: Verb) => {
    setEditingVerb(verb);
    setVerbFormData({
      infinitive: verb.infinitive,
      translation: verb.translation,
      conjugations: verb.conjugations || [
        { person: 'ich', form: '', translation: '' },
        { person: 'du', form: '', translation: '' },
        { person: 'er/sie/es', form: '', translation: '' },
        { person: 'wir', form: '', translation: '' },
        { person: 'ihr', form: '', translation: '' },
        { person: 'sie / Sie', form: '', translation: '' },
      ],
    });
  };

  const handleVerbFormChange = (
    field: keyof typeof verbFormData,
    value: string
  ) => {
    setVerbFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleConjugationChange = (
    index: number,
    field: keyof (typeof verbFormData.conjugations)[0],
    value: string
  ) => {
    setVerbFormData((prev) => ({
      ...prev,
      conjugations: prev.conjugations.map((conj, i) =>
        i === index ? { ...conj, [field]: value } : conj
      ),
    }));
  };

  const handleVerbSubmit = async () => {
    if (!verbFormData.infinitive.trim() || !verbFormData.translation.trim()) {
      throw new Error('Заполните все обязательные поля');
    }

    try {
      if (editingVerb) {
        const updatedVerb = await updateVerb(editingVerb.id, verbFormData);
        setVerbs((prev) =>
          prev.map((v) => (v.id === editingVerb.id ? updatedVerb : v))
        );
      } else {
        const newVerb = await createVerb(verbFormData);
        setVerbs((prev) => [newVerb, ...prev]);
      }
    } catch (error) {
      console.error('Error saving verb:', error);
      throw new Error('Ошибка сохранения глагола');
    }
  };

  const handleVerbDelete = async (id: string) => {
    if (!window.confirm('Удалить этот глагол?')) return;

    try {
      await deleteVerb(id);
      setVerbs((prev) => prev.filter((v) => v.id !== id));
    } catch (error) {
      console.error('Error deleting verb:', error);
      throw new Error('Ошибка удаления глагола');
    }
  };

  const handleBulkVerbImport = async (verbs: VerbFormData[]) => {
    try {
      const importedVerbs = await Promise.all(
        verbs.map((verb) => createVerb(verb))
      );
      setVerbs((prev) => [...importedVerbs, ...prev]);
    } catch (error) {
      console.error('Error importing verbs:', error);
      throw new Error('Ошибка импорта глаголов');
    }
  };

  return {
    verbs,
    editingVerb,
    verbFormData,
    loadVerbs,
    handleVerbUpdate,
    handleAddVerb,
    handleEditVerb,
    handleVerbFormChange,
    handleConjugationChange,
    handleVerbSubmit,
    handleVerbDelete,
    handleBulkVerbImport,
  };
}
