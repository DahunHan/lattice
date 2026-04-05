/** Parse YAML-ish frontmatter between --- delimiters */
export function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};

  const result: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key) result[key] = val;
  }
  return result;
}

/** Parse a pipe-delimited markdown table into row objects */
export function parseMarkdownTable(content: string): Record<string, string>[] {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.startsWith('|'));
  if (lines.length < 2) return [];

  const parseRow = (line: string) =>
    line.split('|').slice(1, -1).map(cell => cell.trim());

  const headers = parseRow(lines[0]);

  // Skip separator row (|---|---|...)
  const dataLines = lines.slice(1).filter(l => !l.match(/^\|[\s-:|]+\|$/));

  return dataLines.map(line => {
    const cells = parseRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? '';
    });
    return row;
  });
}

/** Split markdown into sections by heading level */
export function extractSections(content: string): { heading: string; level: number; body: string }[] {
  const sections: { heading: string; level: number; body: string }[] = [];
  const lines = content.split('\n');
  let current: { heading: string; level: number; bodyLines: string[] } | null = null;

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      if (current) {
        sections.push({
          heading: current.heading,
          level: current.level,
          body: current.bodyLines.join('\n').trim(),
        });
      }
      current = {
        heading: headingMatch[2].trim(),
        level: headingMatch[1].length,
        bodyLines: [],
      };
    } else if (current) {
      current.bodyLines.push(line);
    }
  }

  if (current) {
    sections.push({
      heading: current.heading,
      level: current.level,
      body: current.bodyLines.join('\n').trim(),
    });
  }

  return sections;
}

/** Parse CSV content (comma-delimited with header row) */
export function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const cells = line.split(',').map(c => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? '';
    });
    return row;
  });
}
