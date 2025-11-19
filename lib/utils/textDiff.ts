/**
 * Simple text diff utility to detect meaningful changes between two texts
 */

export interface TextDiffResult {
  hasChanges: boolean;
  changes: string[];
  changePercentage: number;
}

/**
 * Normalize text by removing extra whitespace and converting to lowercase
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract meaningful words from text (removes common stop words and short words)
 */
function extractMeaningfulWords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how',
  ]);

  return text
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word.toLowerCase()))
    .slice(0, 100); // Limit to first 100 meaningful words
}

/**
 * Calculate similarity percentage between two texts
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(extractMeaningfulWords(text1));
  const words2 = new Set(extractMeaningfulWords(text2));

  if (words1.size === 0 && words2.size === 0) return 100;
  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return (intersection.size / union.size) * 100;
}

/**
 * Detect changes between two texts
 */
export function detectTextChanges(oldText: string, newText: string): TextDiffResult {
  const normalizedOld = normalizeText(oldText);
  const normalizedNew = normalizeText(newText);

  // If texts are identical, no changes
  if (normalizedOld === normalizedNew) {
    return {
      hasChanges: false,
      changes: [],
      changePercentage: 0,
    };
  }

  // Calculate similarity
  const similarity = calculateSimilarity(normalizedOld, normalizedNew);
  const changePercentage = 100 - similarity;

  // Extract meaningful changes
  const changes: string[] = [];
  const words1 = extractMeaningfulWords(normalizedOld);
  const words2 = extractMeaningfulWords(normalizedNew);
  const set1 = new Set(words1);
  const set2 = new Set(words2);

  // Find new words
  const newWords = [...set2].filter(w => !set1.has(w));
  if (newWords.length > 0) {
    changes.push(`Added ${newWords.length} new terms: ${newWords.slice(0, 5).join(', ')}`);
  }

  // Find removed words
  const removedWords = [...set1].filter(w => !set2.has(w));
  if (removedWords.length > 0) {
    changes.push(`Removed ${removedWords.length} terms: ${removedWords.slice(0, 5).join(', ')}`);
  }

  // Check for significant content changes
  const oldLength = normalizedOld.length;
  const newLength = normalizedNew.length;
  const lengthDiff = Math.abs(oldLength - newLength) / Math.max(oldLength, newLength);

  if (lengthDiff > 0.1) {
    if (newLength > oldLength) {
      changes.push(`Content expanded by ${Math.round(lengthDiff * 100)}%`);
    } else {
      changes.push(`Content reduced by ${Math.round(lengthDiff * 100)}%`);
    }
  }

  // Consider it a meaningful change if similarity is less than 85%
  const hasChanges = changePercentage > 15 || changes.length > 0;

  return {
    hasChanges,
    changes: changes.slice(0, 5), // Limit to 5 changes
    changePercentage: Math.round(changePercentage * 10) / 10,
  };
}

