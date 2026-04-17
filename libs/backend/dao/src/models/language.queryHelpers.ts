import type { types } from '@typegoose/typegoose';
import type { CLanguage } from './language.js';

export function byName(
  this: types.QueryHelperThis<typeof CLanguage, LanguageQueryHelpers>,
  name: string,
) {
  return this.find({ name: name.trim() });
}

export interface LanguageQueryHelpers {
  byName: types.AsQueryMethod<typeof byName>;
}
