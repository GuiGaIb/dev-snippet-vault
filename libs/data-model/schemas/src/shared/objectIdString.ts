import z from 'zod';

/**
 * Regex for a 24-character hexadecimal string, representing a MongoDB ObjectId.
 * MongoDB ObjectId consists of:
 * - A 4-byte timestamp, representing the ObjectId's creation, measured in seconds since the Unix epoch.
 * - A 5-byte random value generated once per client-side process. This random value is unique to the machine and process. If the process restarts or the primary node of the process changes, this value is re-generated.
 * - A 3-byte incrementing counter per client-side process, initialized to a random value. The counter resets when a process restarts.
 */
export const objectIdHexRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Zod schema for a 24-character hexadecimal string that matches {@link objectIdHexRegex}.
 *
 * Parsing with output a transformed string with:
 * - trimmed whitespace
 * - converted to lowercase
 */
export const objectIdStringSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(objectIdHexRegex);
