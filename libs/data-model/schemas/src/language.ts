import type { TLanguage, TLanguageVersion } from '@models/types/language';
import z from 'zod';
import { getNormalizedLineSchema } from './shared/normalizedLine.js';
import { objectIdLikeSchema } from './shared/objectIdLike.js';
import { timeStampsSchema } from './shared/timestamps.js';

export const languageVersionSchema = z.object({
  id: objectIdLikeSchema,
  versionId: getNormalizedLineSchema({
    minLength: 1,
    maxLength: 64,
  }),
  sortIdx: z.number().int().nonnegative(),
}) satisfies z.ZodType<TLanguageVersion>;

export const languageSchema = z.object({
  ...timeStampsSchema.shape,
  id: objectIdLikeSchema,
  name: getNormalizedLineSchema({
    minLength: 1,
    maxLength: 64,
  }),
  versions: z.array(languageVersionSchema).superRefine((versions, ctx) => {
    const { versionIds, sortIdxs } = extractVersionDuplicates(versions);
    versionIds.forEach(([index, versionId]) => {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'versionId'],
        message: `Version ID '${versionId}' is not unique`,
      });
    });
    sortIdxs.forEach(([index, sortIdx]) => {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'sortIdx'],
        message: `Sort index '${sortIdx}' is not unique`,
      });
    });
  }),
}) satisfies z.ZodType<TLanguage>;

export type TLanguageInput = z.input<typeof languageSchema>;

export const createLanguageSchema = z.object({
  name: languageSchema.shape.name,
  versions: z
    .array(languageVersionSchema.omit({ id: true }))
    .superRefine((versions, ctx) => {
      const { versionIds, sortIdxs } = extractVersionDuplicates(versions);
      versionIds.forEach(([index, versionId]) => {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'versionId'],
          message: `Version ID '${versionId}' is not unique`,
        });
      });
      sortIdxs.forEach(([index, sortIdx]) => {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'sortIdx'],
          message: `Sort index '${sortIdx}' is not unique`,
        });
      });
    })
    .default(() => []),
});

export type TCreateLanguageInput = z.input<typeof createLanguageSchema>;

/**
 * Finds duplicate `versionId` and `sortIdx` values in version metadata.
 *
 * The first occurrence of each value is treated as canonical; only subsequent
 * occurrences are reported, paired with the index where the duplicate appears.
 */
export function extractVersionDuplicates(
  versions: Omit<TLanguageVersion, 'id'>[],
): {
  versionIds: [index: number, versionId: string][];
  sortIdxs: [index: number, sortIdx: number][];
} {
  const seenVersionIds = new Set<string>();
  const seenSortIdxs = new Set<number>();
  const versionIds: [index: number, versionId: string][] = [];
  const sortIdxs: [index: number, sortIdx: number][] = [];
  // Opus 4.6: for-loop avoids per-iteration closure allocation from .forEach()
  for (let i = 0; i < versions.length; i++) {
    const { versionId, sortIdx } = versions[i];
    // Opus 4.6: else-branch skips redundant .add() for values already in the Set
    if (seenVersionIds.has(versionId)) {
      versionIds.push([i, versionId]);
    } else {
      seenVersionIds.add(versionId);
    }
    if (seenSortIdxs.has(sortIdx)) {
      sortIdxs.push([i, sortIdx]);
    } else {
      seenSortIdxs.add(sortIdx);
    }
  }
  return { versionIds, sortIdxs };
}

/**
 * Reorders versions by ascending `sortIdx` and rewrites their indexes to a
 * compact sequential range starting at `0`.
 *
 * This intentionally preserves version order-by-age semantics while removing
 * gaps in caller-provided sort indexes.
 */
export function minimizeVersionSortIdxs(
  versions: TLanguageVersion[],
): TLanguageVersion[] {
  // Opus 4.6: reuse the array allocated by .toSorted() instead of
  // chaining .map(), avoiding a second array allocation
  const sorted = versions.toSorted((a, b) => a.sortIdx - b.sortIdx);
  for (let i = 0; i < sorted.length; i++) {
    sorted[i] = {
      id: sorted[i].id,
      versionId: sorted[i].versionId,
      sortIdx: i,
    };
  }
  return sorted;
}
