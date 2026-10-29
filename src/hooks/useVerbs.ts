'use client';

import { useState } from 'react';
import { getVerbs, createVerb } from '@/services/verbService';
import type { Verb, VerbFormData } from '@/types';

export function useVerbs() {
  const [verbs, setVerbs] = useState<Verb[]>([]);

  const loadVerbs = async () => {
    try {
      const fetchedVerbs = await getVerbs();
      setVerbs(fetchedVerbs);
    } catch (error) {
      console.error('Error loading verbs:', error);
      throw error instanceof Error ? error : new Error(String(error));
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
      throw error instanceof Error ? error : new Error(String(error));
    }
  };

  return {
    verbs,
    loadVerbs,
    handleBulkVerbImport,
  };
}
