/**
 * Category storage and color palette definitions for Sheet Music (6 Flat Blue shades) and Technique (6 Flat Purple shades).
 */

export type BlueColorKey = 
  | 'sky' 
  | 'cobalt' 
  | 'navy' 
  | 'cyan' 
  | 'royal' 
  | 'indigo';

export type PurpleColorKey = 
  | 'violet' 
  | 'deep_purple' 
  | 'lavender' 
  | 'plum' 
  | 'orchid' 
  | 'mulberry';

export type CategoryColorKey = BlueColorKey | PurpleColorKey;

export interface CategoryColorPalette {
  key: CategoryColorKey;
  label: string;
  dotHex: string;
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

// Sheet Music Color Palettes (6 Sequential Muted Shades of Blue: Light to Dark)
export const BLUE_PALETTES: Record<BlueColorKey, CategoryColorPalette> = {
  sky: {
    key: 'sky',
    label: 'Light Slate Blue (Shade 1)',
    dotHex: '#5a92b2',
    badgeBg: 'bg-white/20',
    badgeText: 'text-white',
    badgeBorder: 'border-white/30',
    cardBg: 'bg-[#5a92b2]',
    cardBorder: 'border-[#487e9e]',
    cardHover: 'hover:bg-[#487e9e] hover:border-[#3b6d8b]',
    cardText: 'text-white',
    cardSubtext: 'text-sky-100',
    cardIconBg: 'bg-white/20 text-white',
    cardLeftBorder: 'border-l-[#5a92b2]',
    cardBgHover: 'hover:border-[#3b6d8b]',
  },
  cobalt: {
    key: 'cobalt',
    label: 'Muted Blue (Shade 2)',
    dotHex: '#3b789e',
    badgeBg: 'bg-white/20',
    badgeText: 'text-white',
    badgeBorder: 'border-white/30',
    cardBg: 'bg-[#3b789e]',
    cardBorder: 'border-[#2f6688]',
    cardHover: 'hover:bg-[#2f6688] hover:border-[#255573]',
    cardText: 'text-white',
    cardSubtext: 'text-sky-100',
    cardIconBg: 'bg-white/20 text-white',
    cardLeftBorder: 'border-l-[#3b789e]',
    cardBgHover: 'hover:border-[#255573]',
  },
  cyan: {
    key: 'cyan',
    label: 'Deep Slate Blue (Shade 3)',
    dotHex: '#245f85',
    badgeBg: 'bg-white/20',
    badgeText: 'text-white',
    badgeBorder: 'border-white/30',
    cardBg: 'bg-[#245f85]',
    cardBorder: 'border-[#1b4e70]',
    cardHover: 'hover:bg-[#1b4e70] hover:border-[#143e5a]',
    cardText: 'text-white',
    cardSubtext: 'text-sky-100',
    cardIconBg: 'bg-white/20 text-white',
    cardLeftBorder: 'border-l-[#245f85]',
    cardBgHover: 'hover:border-[#143e5a]',
  },
  navy: {
    key: 'navy',
    label: 'Muted Navy (Shade 4)',
    dotHex: '#184867',
    badgeBg: 'bg-white/20',
    badgeText: 'text-white',
    badgeBorder: 'border-white/30',
    cardBg: 'bg-[#184867]',
    cardBorder: 'border-[#103751]',
    cardHover: 'hover:bg-[#103751] hover:border-[#0b293d]',
    cardText: 'text-white',
    cardSubtext: 'text-sky-100',
    cardIconBg: 'bg-white/20 text-white',
    cardLeftBorder: 'border-l-[#184867]',
    cardBgHover: 'hover:border-[#0b293d]',
  },
  royal: {
    key: 'royal',
    label: 'Deep Navy (Shade 5)',
    dotHex: '#0c4a6e',
    badgeBg: 'bg-white/20',
    badgeText: 'text-white',
    badgeBorder: 'border-white/30',
    cardBg: 'bg-[#0c4a6e]',
    cardBorder: 'border-[#073652]',
    cardHover: 'hover:bg-[#073652] hover:border-[#042438]',
    cardText: 'text-white',
    cardSubtext: 'text-sky-100',
    cardIconBg: 'bg-white/20 text-white',
    cardLeftBorder: 'border-l-[#0c4a6e]',
    cardBgHover: 'hover:border-[#042438]',
  },
  indigo: {
    key: 'indigo',
    label: 'Midnight Navy (Shade 6)',
    dotHex: '#072f48',
    badgeBg: 'bg-white/20',
    badgeText: 'text-white',
    badgeBorder: 'border-white/30',
    cardBg: 'bg-[#072f48]',
    cardBorder: 'border-[#041f32]',
    cardHover: 'hover:bg-[#041f32] hover:border-[#021320]',
    cardText: 'text-white',
    cardSubtext: 'text-sky-100',
    cardIconBg: 'bg-white/20 text-white',
    cardLeftBorder: 'border-l-[#072f48]',
    cardBgHover: 'hover:border-[#021320]',
  },
};

// Technique Color Palettes (6 Sequential Muted Shades of Purple: Light to Dark)
export const PURPLE_PALETTES: Record<PurpleColorKey, CategoryColorPalette> = {
  violet: {
    key: 'violet',
    label: 'Light Mauve Purple (Shade 1)',
    dotHex: '#8b72ac',
    badgeBg: 'bg-white/20',
    badgeText: 'text-white',
    badgeBorder: 'border-white/30',
    cardBg: 'bg-[#8b72ac]',
    cardBorder: 'border-[#79609a]',
    cardHover: 'hover:bg-[#79609a] hover:border-[#695088]',
    cardText: 'text-white',
    cardSubtext: 'text-purple-100',
    cardIconBg: 'bg-white/20 text-white',
    cardLeftBorder: 'border-l-[#8b72ac]',
    cardBgHover: 'hover:border-[#695088]',
  },
  lavender: {
    key: 'lavender',
    label: 'Muted Purple (Shade 2)',
    dotHex: '#755799',
    badgeBg: 'bg-white/20',
    badgeText: 'text-white',
    badgeBorder: 'border-white/30',
    cardBg: 'bg-[#755799]',
    cardBorder: 'border-[#644787]',
    cardHover: 'hover:bg-[#644787] hover:border-[#543875]',
    cardText: 'text-white',
    cardSubtext: 'text-purple-100',
    cardIconBg: 'bg-white/20 text-white',
    cardLeftBorder: 'border-l-[#755799]',
    cardBgHover: 'hover:border-[#543875]',
  },
  deep_purple: {
    key: 'deep_purple',
    label: 'Muted Deep Plum (Shade 3)',
    dotHex: '#603e83',
    badgeBg: 'bg-white/20',
    badgeText: 'text-white',
    badgeBorder: 'border-white/30',
    cardBg: 'bg-[#603e83]',
    cardBorder: 'border-[#502f71]',
    cardHover: 'hover:bg-[#502f71] hover:border-[#41225f]',
    cardText: 'text-white',
    cardSubtext: 'text-purple-100',
    cardIconBg: 'bg-white/20 text-white',
    cardLeftBorder: 'border-l-[#603e83]',
    cardBgHover: 'hover:border-[#41225f]',
  },
  plum: {
    key: 'plum',
    label: 'Deep Muted Purple (Shade 4)',
    dotHex: '#4d296d',
    badgeBg: 'bg-white/20',
    badgeText: 'text-white',
    badgeBorder: 'border-white/30',
    cardBg: 'bg-[#4d296d]',
    cardBorder: 'border-[#3c1c5a]',
    cardHover: 'hover:bg-[#3c1c5a] hover:border-[#2e1148]',
    cardText: 'text-white',
    cardSubtext: 'text-purple-100',
    cardIconBg: 'bg-white/20 text-white',
    cardLeftBorder: 'border-l-[#4d296d]',
    cardBgHover: 'hover:border-[#2e1148]',
  },
  mulberry: {
    key: 'mulberry',
    label: 'Velvet Plum (Shade 5)',
    dotHex: '#3a1658',
    badgeBg: 'bg-white/20',
    badgeText: 'text-white',
    badgeBorder: 'border-white/30',
    cardBg: 'bg-[#3a1658]',
    cardBorder: 'border-[#2c0c46]',
    cardHover: 'hover:bg-[#2c0c46] hover:border-[#1e0534]',
    cardText: 'text-white',
    cardSubtext: 'text-purple-200',
    cardIconBg: 'bg-white/20 text-white',
    cardLeftBorder: 'border-l-[#3a1658]',
    cardBgHover: 'hover:border-[#1e0534]',
  },
  orchid: {
    key: 'orchid',
    label: 'Midnight Purple (Shade 6)',
    dotHex: '#280842',
    badgeBg: 'bg-white/20',
    badgeText: 'text-white',
    badgeBorder: 'border-white/30',
    cardBg: 'bg-[#280842]',
    cardBorder: 'border-[#1b0330]',
    cardHover: 'hover:bg-[#1b0330] hover:border-[#10001f]',
    cardText: 'text-white',
    cardSubtext: 'text-purple-200',
    cardIconBg: 'bg-white/20 text-white',
    cardLeftBorder: 'border-l-[#280842]',
    cardBgHover: 'hover:border-[#10001f]',
  },
};

export const ALL_CATEGORY_PALETTES: Record<string, CategoryColorPalette> = {
  ...BLUE_PALETTES,
  ...PURPLE_PALETTES,
};

// Default Sheet Music Categories & Colors
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

export const DEFAULT_SHEET_MUSIC_COLORS: Record<string, CategoryColorKey> = {
  Hymns: 'sky',
  Jazz: 'cobalt',
  Gospel: 'cyan',
  'Praise & Worship': 'navy',
  Classical: 'royal',
  Pop: 'indigo',
  Choral: 'sky',
  General: 'cobalt',
};

// Default Technique Categories & Colors
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

export const DEFAULT_TECHNIQUE_COLORS: Record<string, CategoryColorKey> = {
  Scales: 'violet',
  Arpeggios: 'lavender',
  'Chords & Voicings': 'deep_purple',
  'Hanon & Warmups': 'plum',
  'Sight Reading': 'mulberry',
  'Rhythm & Grooves': 'orchid',
  'Etudes & Exercises': 'violet',
  'General Technique': 'lavender',
};

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

export function getCategoryPalette(
  categoryName: string | undefined,
  colorsMap: Record<string, CategoryColorKey> = {},
  section: 'sheet_music' | 'technique' = 'sheet_music'
): CategoryColorPalette {
  const defaultCategory = section === 'technique' ? 'Scales' : 'Hymns';
  const defaultPaletteKey = section === 'technique' ? 'violet' : 'sky';
  const name = categoryName || defaultCategory;
  const colorKey = colorsMap[name] || (section === 'technique' ? DEFAULT_TECHNIQUE_COLORS[name] : DEFAULT_SHEET_MUSIC_COLORS[name]) || defaultPaletteKey;
  
  return ALL_CATEGORY_PALETTES[colorKey] || (section === 'technique' ? PURPLE_PALETTES.violet : BLUE_PALETTES.sky);
}
