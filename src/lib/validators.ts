/**
 * Shared validation schemas using Zod v4-native patterns.
 *
 * Zod v4 Audit Result (Phase 17, ERR-04):
 * - Zero Zod imports found in src/ as of 2026-02-23
 * - No deprecated v3 patterns to replace (.email(), .uuid(), .flatten(), .format(), .errors)
 * - Zod v4.3.6 is installed; these schemas use v4-native top-level forms
 *
 * Usage: Import these schemas in any component or hook that needs validation.
 * These replace the deprecated v3 patterns (z.string().email() -> z.email()).
 */

import { z } from 'zod';

// --- String format validators (v4 top-level forms) ---

/** Email address validator with custom error message */
export const emailSchema = z.email({ message: 'Please enter a valid email address' });

/** UUID validator with custom error message */
export const uuidSchema = z.uuid({ message: 'Invalid identifier format' });

/** URL validator with custom error message */
export const urlSchema = z.url({ message: 'Please enter a valid URL' });

// --- Common field schemas ---

/**
 * Discord guild ID (snowflake — numeric string, 17-20 digits).
 * Uses v4's .check() with ctx.value and ctx.issues for custom validation.
 */
export const guildIdSchema = z.string().check((ctx) => {
  if (!/^\d{17,20}$/.test(ctx.value)) {
    ctx.issues.push({ code: 'custom', message: 'Invalid Discord server ID', input: ctx.value });
  }
});

/**
 * Non-empty trimmed string.
 * Uses v4's .check() with ctx.value and ctx.issues for custom validation.
 */
export const nonEmptyString = z.string().check((ctx) => {
  if (ctx.value.trim().length === 0) {
    ctx.issues.push({ code: 'custom', message: 'This field cannot be empty', input: ctx.value });
  }
});

// --- Error formatting ---

/**
 * Extract user-friendly error messages from a Zod validation result.
 * Uses v4's .issues (not deprecated .errors alias).
 *
 * @param error - ZodError from a failed safeParse
 * @returns Array of human-readable error messages
 */
export function formatZodErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => issue.message);
}
