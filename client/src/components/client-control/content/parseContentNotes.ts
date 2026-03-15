/**
 * Parse structured fields from content item notes (e.g. AI-generated idea format).
 */

export interface ParsedContentNotes {
  hook?: string;
  format?: string;
  caption?: string;
  bestTime?: string;
  hashtags?: string;
  whyThisWorks?: string;
  score?: number;
  visualBrief?: string;
}

export function parseContentNotes(notes: string | null | undefined): ParsedContentNotes {
  const result: ParsedContentNotes = {};
  const raw = (notes ?? "").trim();
  if (!raw) return result;

  const hookMatch = raw.match(/Hook:\s*([^\n|]+)/i);
  if (hookMatch) result.hook = hookMatch[1].trim();

  const formatMatch = raw.match(/Format:\s*([^\n|]+)/i);
  if (formatMatch) result.format = formatMatch[1].trim();

  const goalMatch = raw.match(/(?:Goal|Why):\s*([^\n|]+)/i);
  if (goalMatch) result.whyThisWorks = goalMatch[1].trim();

  const ctaMatch = raw.match(/CTA:\s*([^\n|]+)/i);
  if (ctaMatch) result.caption = ctaMatch[1].trim();
  if (!result.caption) {
    const firstLine = raw.split("\n")[0]?.trim();
    if (firstLine && !/^(Hook|Format|Goal|Why|Score|Visual|Best time|Hashtags):/i.test(firstLine)) {
      result.caption = firstLine;
    }
  }

  const visualMatch = raw.match(/Visual:\s*([\s\S]+?)(?=Score:|$)/i);
  if (visualMatch) result.visualBrief = visualMatch[1].trim();

  const scoreMatch = raw.match(/Score:\s*(\d+)\/10/i);
  if (scoreMatch) result.score = parseInt(scoreMatch[1], 10);

  const bestTimeMatch = raw.match(/(?:Best time|Best Time):\s*([^\n|]+)/i);
  if (bestTimeMatch) result.bestTime = bestTimeMatch[1].trim();

  const hashtagsMatch = raw.match(/Hashtags?:\s*([^\n|]+)/i);
  if (hashtagsMatch) result.hashtags = hashtagsMatch[1].trim();

  return result;
}
