import z from 'zod';

const DEFAULT_INDENT_WIDTH = 2;
const DEFAULT_MAX_CONSECUTIVE_NEWLINES = 2;

/**
 * Normalizes a single line of multiline content.
 *
 * Leading indentation is treated separately from the rest of the line:
 * - leading tabs count as `indentWidth` spaces
 * - leading indentation is floored to a multiple of `indentWidth`
 * - the remaining content is whitespace-collapsed and trimmed
 *
 * Lines containing only spaces/tabs become empty strings.
 */
function normalizeMultilineLine(line: string, indentWidth: number): string {
  if (/^[ \t]*$/.test(line)) {
    return '';
  }

  const leadingMatch = line.match(/^([ \t]*)([\s\S]*)$/);
  if (!leadingMatch) {
    return '';
  }

  const rawLeading = leadingMatch[1];
  const rest = leadingMatch[2];

  let width = 0;
  for (const ch of rawLeading) {
    width += ch === '\t' ? indentWidth : 1;
  }
  const flooredWidth = Math.floor(width / indentWidth) * indentWidth;
  const leading = ' '.repeat(flooredWidth);

  const content = rest.replace(/\s+/g, ' ').trim();
  return leading + content;
}

/**
 * Trims outer whitespace from the full string, normalizes line endings,
 * normalizes each line independently, and collapses runs of blank lines to
 * `maxConsecutiveNewlines`.
 */
function preprocessNormalizedMultiline(
  raw: string,
  indentWidth: number,
  maxConsecutiveNewlines: number,
): string {
  const trimmed = raw.trim();
  const lines = trimmed
    .replace(/\r?\n/g, '\n')
    .split('\n')
    .map((line) => normalizeMultilineLine(line, indentWidth));

  let out = lines.join('\n');
  if (maxConsecutiveNewlines > 0) {
    const collapse = new RegExp(`\\n{${maxConsecutiveNewlines + 1},}`, 'g');
    out = out.replace(collapse, '\n'.repeat(maxConsecutiveNewlines));
  }
  return out;
}

/**
 * Creates a Zod schema for a multi-line string with optional min and max length
 * constraints (evaluated after preprocessing).
 *
 * Only `minLength` and `maxLength` participate in validation. The remaining
 * options only control preprocessing before validation occurs.
 *
 * Preprocessing:
 *
 * 1. Trim outer whitespace from the full string. This removes surrounding blank
 *    lines and also removes indentation from the first line.
 * 2. Normalize line breaks to `\n`.
 * 3. On each line: treat leading spaces/tabs as indentation; expand each tab to
 *    `indentWidth` spaces; floor total indent width to a multiple of
 *    `indentWidth`; collapse remaining inner whitespace to single spaces and
 *    trim that segment (same idea as `getNormalizedLineSchema`).
 * 4. Blank lines (only spaces/tabs) become empty lines.
 * 5. Collapse runs of more than `maxConsecutiveNewlines` consecutive newlines
 *    down to that many.
 *
 * Defaults:
 * - `indentWidth`: `2`
 * - `maxConsecutiveNewlines`: `2`
 */
export const getNormalizedMultilineSchema = z
  .function({
    input: [
      z
        .object({
          /**
           * Optional minimum length of the string after preprocessing.
           */
          minLength: z.number().int().nonnegative().optional(),
          /**
           * Optional maximum length of the string after preprocessing.
           */
          maxLength: z.number().int().nonnegative().optional(),
          /**
           * Visual width of one tab in spaces for leading indentation, and the
           * step size when flooring indentation.
           *
           * @default 2
           */
          indentWidth: z.number().int().positive().optional(),
          /**
           * Maximum number of consecutive newlines allowed after collapsing
           * longer runs.
           *
           * @default 2
           */
          maxConsecutiveNewlines: z.number().int().positive().optional(),
        })
        .superRefine(({ maxLength = Infinity, minLength = 0 }, ctx) => {
          if (minLength > maxLength) {
            ctx.addIssue({
              code: 'too_big',
              input: minLength,
              maximum: maxLength,
              origin: 'number',
              path: ['minLength'],
              message: "'minLength' cannot be greater than 'maxLength'",
              continue: false,
            });
            return;
          }

          if (maxLength < minLength) {
            ctx.addIssue({
              code: 'too_small',
              input: maxLength,
              minimum: minLength,
              origin: 'number',
              path: ['maxLength'],
              message: "'maxLength' cannot be less than 'minLength'",
              continue: false,
            });
          }
        })
        .default(() => ({})),
    ],
  })
  .implement(
    ({ maxLength, minLength, maxConsecutiveNewlines, indentWidth } = {}) => {
      let schema = z.string();
      if (minLength !== undefined) schema = schema.min(minLength);
      if (maxLength !== undefined) schema = schema.max(maxLength);
      const iw = indentWidth ?? DEFAULT_INDENT_WIDTH;
      const maxNl = maxConsecutiveNewlines ?? DEFAULT_MAX_CONSECUTIVE_NEWLINES;
      return z.preprocess(
        (x: string) => preprocessNormalizedMultiline(x, iw, maxNl),
        schema,
      );
    },
  );
