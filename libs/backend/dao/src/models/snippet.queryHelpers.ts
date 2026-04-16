import type { TSnippetLanguageVersionRange } from '@models/types/snippet';
import type { types } from '@typegoose/typegoose';
import type { CSnippet } from './snippet.js';

export function byLanguage(
  this: types.QueryHelperThis<typeof CSnippet, SnippetQueryHelpers>,
  language: string,
): types.QueryHelperThis<typeof CSnippet, SnippetQueryHelpers> {
  return this.where({ language });
}

export function byTags(
  this: types.QueryHelperThis<typeof CSnippet, SnippetQueryHelpers>,
  tag: string,
): types.QueryHelperThis<typeof CSnippet, SnippetQueryHelpers>;
export function byTags(
  this: types.QueryHelperThis<typeof CSnippet, SnippetQueryHelpers>,
  tags: string[],
): types.QueryHelperThis<typeof CSnippet, SnippetQueryHelpers>;
export function byTags(
  this: types.QueryHelperThis<typeof CSnippet, SnippetQueryHelpers>,
  tags: string | string[],
): types.QueryHelperThis<typeof CSnippet, SnippetQueryHelpers> {
  const tagsArray = [tags].flat();
  return this.where({ tags: { $in: tagsArray } });
}

export function byLanguageVersionRange(
  this: types.QueryHelperThis<typeof CSnippet, SnippetQueryHelpers>,
  languageVersionRange: TSnippetLanguageVersionRange,
): types.QueryHelperThis<typeof CSnippet, SnippetQueryHelpers> {
  return this.where({ languageVersionRange });
}

export interface SnippetQueryHelpers {
  byLanguage: types.AsQueryMethod<typeof byLanguage>;
  byTags: types.AsQueryMethod<typeof byTags>;
  byLanguageVersionRange: types.AsQueryMethod<typeof byLanguageVersionRange>;
}
