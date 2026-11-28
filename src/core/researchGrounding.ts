export interface ResearchSource { title: string; url: string; }
export interface GroundingMetadataLike { groundingChunks?: Array<{ web?: { title?: string; uri?: string } }>; webSearchQueries?: string[]; }
export function extractResearchSources(metadata: GroundingMetadataLike | undefined): ResearchSource[] {
  const unique = new Map<string, ResearchSource>();
  for (const chunk of metadata?.groundingChunks ?? []) {
    const url = chunk.web?.uri;
    if (!url || !/^https:\/\//i.test(url)) continue;
    if (!unique.has(url)) unique.set(url, { title: chunk.web?.title?.trim() || new URL(url).hostname, url });
  }
  return [...unique.values()].slice(0, 8);
}
export function formatResearchResponse(answer: string, sources: ResearchSource[]): string {
  const citationBlock = sources.length ? "\n\nSources:\n" + sources.map((source, index) => `[${index + 1}] ${source.title}\n${source.url}`).join("\n") : "";
  return answer.trim() + citationBlock;
}
