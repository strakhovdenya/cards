export interface ParsedCard {
  germanWord: string;
  translation: string;
  lineNumber: number;
  isDuplicate?: boolean;
}

export interface ParseResult {
  cards: ParsedCard[];
  errors: string[];
  duplicates: ParsedCard[];
  newCards: ParsedCard[];
}

export interface BulkImportStrategy {
  parseText(text: string, existingCards: unknown[]): ParseResult;
  getGptPrompt(): string;
  getFormatExample(): string;
  getDisplayName(): string;
  getType(): string;
}
