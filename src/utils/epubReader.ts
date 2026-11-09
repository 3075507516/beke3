import JSZip from 'jszip';

export interface ParsedBookContent {
  title?: string;
  author?: string;
  chapters: { title: string; text: string }[];
  fullText: string;
}

/**
 * Parses an EPUB file (which is a ZIP container containing OEBPS/XHTML files)
 * and extracts chapter texts and titles.
 */
export async function parseEpubFile(fileOrBlob: Blob): Promise<ParsedBookContent> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(fileOrBlob);
  const chapters: { title: string; text: string }[] = [];
  let fullText = '';
  let bookTitle = '';

  // 1. Try finding container.xml to locate content.opf
  let opfPath = '';
  const containerFile = loadedZip.file('META-INF/container.xml');
  if (containerFile) {
    const containerXml = await containerFile.async('text');
    const match = containerXml.match(/full-path=["']([^"']+)["']/i);
    if (match && match[1]) {
      opfPath = match[1];
    }
  }

  // Fallback to searching for any .opf file
  if (!opfPath) {
    const opfFiles = Object.keys(loadedZip.files).filter(f => f.endsWith('.opf'));
    if (opfFiles.length > 0) {
      opfPath = opfFiles[0];
    }
  }

  // Extract metadata from opf if found
  if (opfPath && loadedZip.file(opfPath)) {
    try {
      const opfXml = await loadedZip.file(opfPath)!.async('text');
      const titleMatch = opfXml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
      if (titleMatch) bookTitle = titleMatch[1].trim();
    } catch (e) {
      console.warn('Failed parsing OPF XML', e);
    }
  }

  // 2. Collect all HTML / XHTML / XML document files sorted
  const contentFilePaths = Object.keys(loadedZip.files)
    .filter(
      path =>
        !path.startsWith('META-INF/') &&
        !path.endsWith('.opf') &&
        !path.endsWith('.ncx') &&
        (path.endsWith('.html') || path.endsWith('.xhtml') || path.endsWith('.htm') || path.endsWith('.xml'))
    )
    .sort();

  for (let i = 0; i < contentFilePaths.length; i++) {
    const path = contentFilePaths[i];
    try {
      const html = await loadedZip.file(path)!.async('text');
      // Simple parser using DOMParser in browser
      if (typeof DOMParser !== 'undefined') {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        // Extract headings
        const heading = doc.querySelector('h1, h2, h3, title')?.textContent?.trim() || `第 ${i + 1} 节`;
        // Remove style, script tags
        doc.querySelectorAll('style, script').forEach(node => node.remove());
        const text = (doc.body?.textContent || '').trim().replace(/\n\s*\n/g, '\n\n');

        if (text.length > 50) {
          chapters.push({ title: heading, text });
          fullText += `\n\n=== ${heading} ===\n\n${text}`;
        }
      } else {
        // Fallback stripping
        const clean = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (clean.length > 50) {
          chapters.push({ title: `第 ${i + 1} 节`, text: clean });
          fullText += `\n\n${clean}`;
        }
      }
    } catch (err) {
      console.warn(`Error reading epub section ${path}`, err);
    }
  }

  return {
    title: bookTitle,
    chapters: chapters.length > 0 ? chapters : [{ title: '全文内容', text: fullText }],
    fullText: fullText.trim(),
  };
}
