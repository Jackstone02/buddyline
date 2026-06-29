import { supabase } from './supabase';

/**
 * Build a display name from Apple's fullName object.
 * Apple only returns the name on the FIRST sign-in, so capture it then.
 */
export function formatAppleName(
  fullName?: { givenName?: string | null; familyName?: string | null } | null
): string {
  if (!fullName) return '';
  return [fullName.givenName, fullName.familyName].filter(Boolean).join(' ').trim();
}

/**
 * Read a likely display name from a social provider's user_metadata
 * (Google/Apple populate one of these on the Supabase user).
 */
export function nameFromUserMetadata(meta?: Record<string, any> | null): string {
  if (!meta) return '';
  return (meta.full_name || meta.name || meta.display_name || '').toString().trim();
}

/**
 * Set profiles.display_name only if it is currently empty — never overwrites
 * a name the user already has. Safe to call after any social sign-in.
 */
export async function setDisplayNameIfEmpty(userId: string, name: string): Promise<void> {
  const clean = name?.trim();
  if (!clean) return;
  const { data } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .single();
  if (data && (!data.display_name || !data.display_name.trim())) {
    await supabase.from('profiles').update({ display_name: clean }).eq('id', userId);
  }
}
