import type {
  LanguageService,
  LanguageServiceOptions,
} from '@backend/dao/services/language';

export type LanguageLocals = {
  WithLanguageService: {
    languageServiceOptions?: LanguageServiceOptions;
    languageService: LanguageService;
  };
};
