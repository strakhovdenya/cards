export interface SpeechOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: string;
}

import { useCallback } from 'react';

export interface SpeechSettings {
  voice: string;
  rate: number;
  pitch: number;
  volume: number;
  enabled: boolean;
  lang?: string;
}

export interface SpeechService {
  speak(text: string, options?: SpeechOptions): Promise<void>;
  stop(): void;
  isSupported(): boolean;
  getAvailableVoices(): Promise<SpeechSynthesisVoice[]>;
}

class WebSpeechService implements SpeechService {
  private synthesis: SpeechSynthesis | null = null;
  private utterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    // Проверяем, что мы на клиенте
    if (typeof window !== 'undefined') {
      this.synthesis = window.speechSynthesis;
    }
  }

  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      this.synthesis !== null
    );
  }

  async speak(text: string, options: SpeechOptions = {}): Promise<void> {
    if (!this.isSupported() || !this.synthesis) {
      throw new Error('Speech synthesis is not supported in this browser');
    }

    // Останавливаем предыдущее произношение и ждем завершения
    this.stop();

    // Небольшая задержка для стабильности
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Загружаем сохраненные настройки
    const savedSettings = this.getSavedSettings();

    return new Promise((resolve, reject) => {
      this.utterance = new SpeechSynthesisUtterance(text);

      // Применяем сохраненные настройки или настройки по умолчанию
      this.utterance.lang = options.lang ?? savedSettings.lang ?? 'de-DE';
      this.utterance.rate = options.rate ?? savedSettings.rate ?? 0.8;
      this.utterance.pitch = options.pitch ?? savedSettings.pitch ?? 1.0;
      this.utterance.volume = options.volume ?? savedSettings.volume ?? 1.0;

      // Выбираем голос с проверкой доступности
      let selectedVoice = null;
      if (options.voice) {
        selectedVoice = this.getVoiceByName(options.voice);
      } else if (savedSettings.voice) {
        selectedVoice = this.getVoiceByName(savedSettings.voice);
      } else {
        selectedVoice = this.getGermanVoice();
      }

      // Проверяем, что голос доступен
      if (selectedVoice) {
        this.utterance.voice = selectedVoice;
      } else {
        // Если выбранный голос недоступен, используем первый доступный
        const voices = this.synthesis!.getVoices();
        if (voices.length > 0) {
          this.utterance.voice = voices[0];
        }
      }

      this.utterance.onend = () => {
        this.utterance = null;
        resolve();
      };

      this.utterance.onerror = (event) => {
        this.utterance = null;
        console.warn('Speech synthesis error:', event.error);

        // Если ошибка связана с голосом, пробуем без выбора голоса
        if (event.error === 'interrupted' || event.error === 'not-allowed') {
          this.utterance = new SpeechSynthesisUtterance(text);
          this.utterance.lang = options.lang ?? savedSettings.lang ?? 'de-DE';
          this.utterance.rate = options.rate ?? savedSettings.rate ?? 0.8;
          this.utterance.pitch = options.pitch ?? savedSettings.pitch ?? 1.0;
          this.utterance.volume = options.volume ?? savedSettings.volume ?? 1.0;

          this.utterance.onend = () => {
            this.utterance = null;
            resolve();
          };

          this.utterance.onerror = (retryEvent) => {
            this.utterance = null;
            reject(new Error(`Speech synthesis error: ${retryEvent.error}`));
          };

          this.synthesis!.speak(this.utterance);
        } else {
          reject(new Error(`Speech synthesis error: ${event.error}`));
        }
      };

      this.synthesis!.speak(this.utterance);
    });
  }

  stop(): void {
    if (this.synthesis?.speaking) {
      this.synthesis.cancel();
    }
    this.utterance = null;
  }

  async getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
    if (!this.isSupported() || !this.synthesis) {
      return [];
    }

    // Если голоса уже загружены
    if (this.synthesis.getVoices().length > 0) {
      return this.synthesis.getVoices();
    }

    // Ждем загрузки голосов
    return new Promise((resolve) => {
      const voices = this.synthesis!.getVoices();
      if (voices.length > 0) {
        resolve(voices);
      } else {
        this.synthesis!.onvoiceschanged = () => {
          resolve(this.synthesis!.getVoices() ?? []);
        };
      }
    });
  }

  private getGermanVoice(): SpeechSynthesisVoice | null {
    if (!this.synthesis) return null;
    const voices = this.synthesis.getVoices();
    const germanVoices = voices.filter(
      (voice) =>
        voice.lang.startsWith('de') ||
        voice.name.toLowerCase().includes('german') ||
        voice.name.toLowerCase().includes('deutsch')
    );

    // Предпочитаем женский голос для немецкого
    const femaleGermanVoice = germanVoices.find(
      (voice) =>
        voice.name.toLowerCase().includes('female') ||
        voice.name.toLowerCase().includes('anna') ||
        voice.name.toLowerCase().includes('helena')
    );

    return femaleGermanVoice ?? germanVoices[0] ?? voices[0] ?? null;
  }

  private getVoiceByName(voiceName: string): SpeechSynthesisVoice | null {
    if (!this.synthesis) return null;
    const voices = this.synthesis.getVoices();
    return voices.find((voice) => voice.name === voiceName) ?? null;
  }

  private getSavedSettings(): Partial<SpeechSettings> {
    try {
      const saved = localStorage.getItem('speechSettings');
      if (saved) {
        const settings = JSON.parse(saved) as SpeechSettings;
        return settings.enabled ? settings : {};
      }
    } catch (error) {
      console.error('Error loading speech settings:', error);
    }
    return {};
  }
}

// Создаем экземпляр сервиса
export const speechService = new WebSpeechService();

// Хук для использования в компонентах
export const useSpeech = () => {
  const speak = useCallback(async (text: string, options?: SpeechOptions) => {
    try {
      await speechService.speak(text, options);
    } catch (error) {
      console.error('Speech error:', error);
    }
  }, []);

  const stop = useCallback(() => {
    speechService.stop();
  }, []);

  const isSupported = useCallback(() => {
    return speechService.isSupported();
  }, []);

  const getAvailableVoices = useCallback(async () => {
    return await speechService.getAvailableVoices();
  }, []);

  return {
    speak,
    stop,
    isSupported,
    getAvailableVoices,
  };
};
