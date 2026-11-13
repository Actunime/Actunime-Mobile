export interface IReleaseNotes {
  markdown: string;
  text: string;
  count: number;
}
export function groupSubjects(subjects: readonly string[]): { title: string; items: string[] }[];
export function buildReleaseNotes(subjects: readonly string[], options?: { maxText?: number }): IReleaseNotes;
