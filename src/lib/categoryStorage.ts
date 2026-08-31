/**
 * Category storage and dynamic cascading color palette definitions.
 * Categories dynamically cascade from lightest shade (first on list) to darkest shade (last on list):
 * - Sheet Music: Lightest Blue (#0284c7) -> Darkest Navy (#081c30)
 * - Technique: Lightest Violet (#7c3aed) -> Darkest Plum (#1e0738)
 */

export type CategoryColorKey = string;

export interface CategoryColorPalette {
  key: string;
  label: string;
  dotHex: string;
  cardBgHex: string;
  cardBorderHex: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  cardBg: string;
  cardBorder: string;
  cardHover: string;
  cardText: string;
  cardSubtext: string;
  cardIconBg: string;
  cardLeftBorder: string;
  cardBgHover: string;
}

function toHex(n: number): string {
  const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
  return hex.length === 1 ? '0' + hex : hex;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Computes a dynamic cascading color palette based on an item's position (index) in the category list.
 * Index 0 (first) = Lightest hue
 * Index total-1 (last) = Darkest hue
 */
export function getCascadingCategoryPalette(
  index: number,
  total: number,
  section: 'sheet_music' | 'technique'
): CategoryColorPalette {
  const safeTotal = Math.max(1, total);
  const safeIndex = Math.max(0, Math.min(index, safeTotal - 1));
  const t = safeTotal === 1 ? 0.35 : safeIndex / (safeTotal - 1);

  let r: number, g: number, b: number;
  let borderR: number, borderG: number, borderB: number;

  if (section === 'technique') {
    // Purple spectrum: from Electric Violet (lightest purple) to Deep Midnight Plum (darkest purple)
    // Start (t=0.0): rgb(124, 58, 237) -> #7c3aed
    // End (t=1.0):   rgb(30, 7, 56)    -> #1e0738
    r = Math.round(124 + t * (30 - 124));
    g = Math.round(58 + t * (7 - 58));
    b = Math.round(237 + t * (56 - 237));

    borderR = Math.min(255, Math.round(r * 1.15 + 20));
    borderG = Math.min(255, Math.round(g * 1.1 + 15));
    borderB = Math.min(255, Math.round(b * 1.1 + 25));
  } else {
    // Blue spectrum: from Vibrant Sky Azure (lightest blue) to Deep Midnight Navy (darkest blue)
    // Start (t=0.0): rgb(2, 132, 199)  -> #0284c7
    // End (t=1.0):   rgb(8, 28, 48)    -> #081c30
    r = Math.round(2 + t * (8 - 2));
    g = Math.round(132 + t * (28 - 132));
    b = Math.round(199 + t * (48 - 199));

    borderR = Math.min(255, Math.round(r * 1.1 + 15));
    borderG = Math.min(255, Math.round(g * 1.15 + 20));
    borderB = Math.min(255, Math.round(b * 1.1 + 25));
  }

  const dotHex = rgbToHex(r, g, b);
  const cardBgHex = rgbToHex(r, g, b);
  const cardBorderHex = rgbToHex(borderR, borderG, borderB);

  return {
    key: `cascade_${section}_${safeIndex}`,
    label: `Shade #${safeIndex + 1}`,
    dotHex,
    cardBgHex,
    cardBorderHex,
    badgeBg: section === 'technique' ? 'bg-purple-500/20' : 'bg-sky-500/20',
    badgeText: section === 'technique' ? 'text-purple-100' : 'text-sky-100',
    badgeBorder: section === 'technique' ? 'border-purple-400/40' : 'border-sky-400/40',
    cardBg: '',
    cardBorder: '',
    cardHover: 'hover:brightness-110',
    cardText: 'text-white',
    cardSubtext: 'text-slate-100',
    cardIconBg: 'bg-white/20 text-white',
    cardLeftBorder: '',
    cardBgHover: 'hover:brightness-110',
  };
}

// Backward compatibility static palettes if referenced
export const BLUE_PALETTES: Record<string, CategoryColorPalette> = {
  sky: getCascadingCategoryPalette(0, 6, 'sheet_music'),
  cobalt: getCascadingCategoryPalette(1, 6, 'sheet_music'),
  cyan: getCascadingCategoryPalette(2, 6, 'sheet_music'),
  navy: getCascadingCategoryPalette(3, 6, 'sheet_music'),
  royal: getCascadingCategoryPalette(4, 6, 'sheet_music'),
  indigo: getCascadingCategoryPalette(5, 6, 'sheet_music'),
};

export const PURPLE_PALETTES: Record<string, CategoryColorPalette> = {
  violet: getCascadingCategoryPalette(0, 6, 'technique'),
  lavender: getCascadingCategoryPalette(1, 6, 'technique'),
  deep_purple: getCascadingCategoryPalette(2, 6, 'technique'),
  plum: getCascadingCategoryPalette(3, 6, 'technique'),
  mulberry: getCascadingCategoryPalette(4, 6, 'technique'),
  orchid: getCascadingCategoryPalette(5, 6, 'technique'),
};

export const ALL_CATEGORY_PALETTES: Record<string, CategoryColorPalette> = {
  ...BLUE_PALETTES,
  ...PURPLE_PALETTES,
};

// Default Sheet Music Categories
export const DEFAULT_SHEET_MUSIC_CATEGORIES: string[] = [
  'Hymns',
  'Jazz',
  'Gospel',
  'Praise & Worship',
  'Classical',
  'Pop',
  'Choral',
  'General',
];

export const DEFAULT_SHEET_MUSIC_COLORS: Record<string, CategoryColorKey> = {};

// Default Technique Categories
export const DEFAULT_TECHNIQUE_CATEGORIES: string[] = [
  'Scales',
  'Arpeggios',
  'Chords & Voicings',
  'Hanon & Warmups',
  'Sight Reading',
  'Rhythm & Grooves',
  'Etudes & Exercises',
  'General Technique',
];

export const DEFAULT_TECHNIQUE_COLORS: Record<string, CategoryColorKey> = {};

const SHEET_MUSIC_CATEGORIES_KEY = 'gigsheet_categories_sheet_music';
const SHEET_MUSIC_COLORS_KEY = 'gigsheet_category_colors_sheet_music';
const TECHNIQUE_CATEGORIES_KEY = 'gigsheet_categories_technique';
const TECHNIQUE_COLORS_KEY = 'gigsheet_category_colors_technique';

export function getStoredCategories(section: 'sheet_music' | 'technique'): string[] {
  const key = section === 'technique' ? TECHNIQUE_CATEGORIES_KEY : SHEET_MUSIC_CATEGORIES_KEY;
  const defaultList = section === 'technique' ? DEFAULT_TECHNIQUE_CATEGORIES : DEFAULT_SHEET_MUSIC_CATEGORIES;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((g) => String(g).trim()).filter(Boolean);
      }
    }
  } catch (e) {
    console.warn('Failed to load stored categories:', e);
  }
  return defaultList;
}

export function saveStoredCategories(section: 'sheet_music' | 'technique', categories: string[]): void {
  const key = section === 'technique' ? TECHNIQUE_CATEGORIES_KEY : SHEET_MUSIC_CATEGORIES_KEY;
  try {
    localStorage.setItem(key, JSON.stringify(categories));
  } catch (e) {
    console.warn('Failed to save categories to localStorage:', e);
  }
}

export function getStoredCategoryColors(section: 'sheet_music' | 'technique'): Record<string, CategoryColorKey> {
  const key = section === 'technique' ? TECHNIQUE_COLORS_KEY : SHEET_MUSIC_COLORS_KEY;
  const defaultMap = section === 'technique' ? DEFAULT_TECHNIQUE_COLORS : DEFAULT_SHEET_MUSIC_COLORS;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...defaultMap, ...parsed };
      }
    }
  } catch (e) {
    console.warn('Failed to load category colors:', e);
  }
  return defaultMap;
}

export function saveStoredCategoryColors(section: 'sheet_music' | 'technique', colors: Record<string, CategoryColorKey>): void {
  const key = section === 'technique' ? TECHNIQUE_COLORS_KEY : SHEET_MUSIC_COLORS_KEY;
  try {
    localStorage.setItem(key, JSON.stringify(colors));
  } catch (e) {
    console.warn('Failed to save category colors to localStorage:', e);
  }
}

/**
 * Retrieves the palette for a category dynamically by finding its index in the section's category list.
 */
export function getCategoryPalette(
  categoryName: string | undefined,
  categoriesOrMap?: string[] | Record<string, any>,
  section: 'sheet_music' | 'technique' = 'sheet_music'
): CategoryColorPalette {
  let categoriesList: string[] = [];
  if (Array.isArray(categoriesOrMap)) {
    categoriesList = categoriesOrMap;
  } else {
    categoriesList = getStoredCategories(section);
  }

  if (categoriesList.length === 0) {
    categoriesList = section === 'technique' ? DEFAULT_TECHNIQUE_CATEGORIES : DEFAULT_SHEET_MUSIC_CATEGORIES;
  }

  const defaultCategory = section === 'technique' ? 'Scales' : 'Hymns';
  const targetName = (categoryName || defaultCategory).trim().toLowerCase();
  
  let index = categoriesList.findIndex((c) => c.trim().toLowerCase() === targetName);
  if (index === -1) {
    index = 0;
  }

  return getCascadingCategoryPalette(index, categoriesList.length, section);
}

