/**
 * Utility functions for parsing and formatting music chart titles from filenames.
 */

/**
 * Formats a raw file name into a clean, properly capitalized music chart title.
 * Corrects contractions and possessives so letters following an apostrophe remain lowercase (e.g., "It's", "Don't", "Bach's", "O'clock").
 */
export function formatTitleFromFilename(filename: string): string {
  if (!filename) return '';

  // 1. Remove file extension
  let baseName = filename.replace(/\.[^/.]+$/, '').trim();

  // 2. Normalize hyphens and underscores:
  // Convert underscores to spaces
  baseName = baseName.replace(/_/g, ' ');
  // Convert standalone hyphens between words (kebab-case) into spaces, while preserving " - "
  baseName = baseName.replace(/([a-zA-Z0-9])-([a-zA-Z0-9])/g, '$1 $2');
  // Collapse duplicate whitespace
  baseName = baseName.replace(/\s+/g, ' ').trim();

  if (!baseName) return 'Untitled Chart';

  // 3. Word-by-word title casing:
  // Split into tokens while preserving delimiters (whitespace, parentheses, quotes, brackets, slashes, punctuation)
  const tokens = baseName.split(/(\s+|[-–—\(\)\[\]"“”:;,\/]+)/);

  const capitalizedTokens = tokens.map((token) => {
    // If token is whitespace or punctuation delimiter, keep as-is
    if (!token || /^(\s+|[-–—\(\)\[\]"“”:;,\/]+)$/.test(token)) {
      return token;
    }

    // Check if token contains internal apostrophe (straight ' or curly ’ or ‘)
    // e.g. "it's", "IT'S", "don't", "DON'T", "bach's", "rock'n'roll", "o'connor"
    if (/['’‘]/.test(token)) {
      const parts = token.split(/(['’‘])/);
      const formattedParts = parts.map((part, idx) => {
        if (part === "'" || part === "’" || part === "‘") {
          return part;
        }
        if (idx === 0) {
          return capitalizeWord(part);
        }
        const lowerPart = part.toLowerCase();
        // Common contraction/possessive suffixes or single letters: 's, 't, 'd, 're, 've, 'll, 'm, 'em, 'n, 'clock
        if (['s', 't', 'd', 're', 've', 'll', 'm', 'em', 'n', 'clock'].includes(lowerPart)) {
          return lowerPart;
        }
        // Known Irish/Scottish/French name prefixes like O' or D':
        const prevPart = idx >= 2 ? parts[idx - 2].toLowerCase() : '';
        if (prevPart === 'o' || prevPart === 'd') {
          return capitalizeWord(part);
        }
        // Default contractions/possessives remain lowercase after apostrophe
        return lowerPart;
      });
      return formattedParts.join('');
    }

    // Standard word
    return capitalizeWord(token);
  });

  let result = capitalizedTokens.join('');

  // 4. Post-processing safety: ensure any residual `'[A-Z]` for standard contractions is normalized
  result = result.replace(/([a-zA-Z])(['’‘])([A-Z])\b/g, (match, before, apostrophe, letter) => {
    // Contraction single letter like 's, 't, 'd, 'm
    return `${before}${apostrophe}${letter.toLowerCase()}`;
  });
  result = result.replace(/([a-zA-Z])(['’‘])(Re|Ve|Ll|Em)\b/gi, (match, before, apostrophe, suffix) => {
    return `${before}${apostrophe}${suffix.toLowerCase()}`;
  });

  return result;
}

function capitalizeWord(word: string): string {
  if (!word) return '';
  
  // Check for common musical abbreviations and catalogs to preserve standard styling
  const upper = word.toUpperCase();
  if (['OP', 'OP.', 'NO', 'NO.', 'BWV', 'KV', 'HOB', 'BPM', 'PDF', 'BASS', 'SATB', 'SSA'].includes(upper)) {
    if (upper === 'OP' || upper === 'OP.') return 'Op.';
    if (upper === 'NO' || upper === 'NO.') return 'No.';
    return upper;
  }
  
  // Roman numerals: I, II, III, IV, V, VI, VII, VIII, IX, X, XI, XII
  if (/^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)$/i.test(word)) {
    return upper;
  }

  // If the word was entirely UPPERCASE and longer than 1 character (e.g. "SONATA"), lowercase the remainder
  if (word === word.toUpperCase() && word.length > 1) {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }

  return word.charAt(0).toUpperCase() + word.slice(1);
}
