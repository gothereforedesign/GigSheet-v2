/**
 * Re-exporting from categoryStorage for backward compatibility
 */

export * from './categoryStorage';

// Legacy Aliases
import {
  CategoryColorKey,
  CategoryColorPalette,
  ALL_CATEGORY_PALETTES,
  DEFAULT_SHEET_MUSIC_CATEGORIES,
  DEFAULT_SHEET_MUSIC_COLORS,
  getStoredCategories,
  saveStoredCategories,
  getStoredCategoryColors,
  saveStoredCategoryColors,
  getCategoryPalette,
} from './categoryStorage';

export type GenreColorKey = CategoryColorKey;
export type GenreColorPalette = CategoryColorPalette;
export const GENRE_PALETTES = ALL_CATEGORY_PALETTES;
export const DEFAULT_GENRES = DEFAULT_SHEET_MUSIC_CATEGORIES;
export const DEFAULT_GENRE_COLORS = DEFAULT_SHEET_MUSIC_COLORS;

export function getStoredGenres(): string[] {
  return getStoredCategories('sheet_music');
}

export function saveStoredGenres(genres: string[]): void {
  saveStoredCategories('sheet_music', genres);
}

export function getStoredGenreColors(): Record<string, CategoryColorKey> {
  return getStoredCategoryColors('sheet_music');
}

export function saveStoredGenreColors(colors: Record<string, CategoryColorKey>): void {
  saveStoredCategoryColors('sheet_music', colors);
}

export function getGenrePalette(
  genreName: string | undefined,
  genreColorsMap: Record<string, CategoryColorKey> = {}
): CategoryColorPalette {
  return getCategoryPalette(genreName, genreColorsMap, 'sheet_music');
}
