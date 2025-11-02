import type { Profile } from './supabase';

// Build a short subtitle for people lists to help disambiguate same full names
// Example output: "Class of 2016 • House: Aggrey • Accra"
export function formatProfileSubtitle(p?: Partial<Profile> | null): string {
  if (!p) return '';
  const parts: string[] = [];
  // Order: year group, house, class (aka stream), location
  if ((p as any).graduation_year) {
    parts.push(`Class of ${String((p as any).graduation_year)}`);
  } else if ((p as any).year_group) {
    parts.push(String((p as any).year_group));
  }
  if ((p as any).house) {
    parts.push(`House: ${String((p as any).house)}`);
  }
  if ((p as any).class) {
    parts.push(`Class: ${String((p as any).class)}`);
  }
  if ((p as any).location) {
    parts.push(String((p as any).location));
  }
  return parts.join(' • ');
}
