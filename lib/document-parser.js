import { unzipSync } from 'fflate';
import { validateDocument } from './workspace-model.js';

// Only these fixed messages may leave the parser. Library errors can contain
// file names or document fragments, so everything else is replaced by generic
// guidance before it is stored or shown to a signed-in user.
const SAFE_MESSAGES = new Set([
  'This PDF exceeds 50 pages. Upload a shorter document.',
  'This DOCX expands beyond the safe processing limit.',
  'This file is not a readable DOCX document.',
  'No selectable text was found. Scanned PDFs need OCR before upload; automatic OCR is not available.',
  'This document contains too much text. Upload a shorter version.',
  'Document processing timed out. Try a shorter file.',
  'Document processing failed. Export a fresh PDF or DOCX.',
  'Document processing stopped. Try a smaller file.',
  'Could not start processing. Please retry.',
  'The private document could not be read. Re-upload it.',
  'The document size changed. Re-upload it.',
  'The extracted text could not be saved. Please retry.',
  'Processing failed.',
]);
export function safeDocumentMessage(message) {
  const text = String(message || '');
  return SAFE_MESSAGES.has(text)
    ? text
    : 'Document processing failed. Export a fresh PDF or DOCX.';
}
export function draftRecords(text) {
  // Extracted lines remain source text; classifications are tentative until reviewed.
  const headings = {
    education: 'Education',
    experience: 'Employment',
    employment: 'Employment',
    internships: 'Internship',
    internship: 'Internship',
    research: 'Research',
    projects: 'Project',
    publications: 'Publication',
    awards: 'Award',
    honors: 'Award',
    certifications: 'Certification',
    courses: 'Course',
    skills: 'Technical skill',
    languages: 'Language',
    leadership: 'Leadership',
    volunteering: 'Volunteering',
    activities: 'Club',
    competitions: 'Competition',
  };
  let kind = 'Project';
  const rows = [];
  for (const line of text
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean)) {
    const label = line
      .toLowerCase()
      .replace(/[^a-z ]/g, '')
      .trim();
    if (headings[label]) {
      kind = headings[label];
      continue;
    }
    if (line.length < 4 || rows.length >= 80) continue;
    rows.push({
      kind,
      title: line.slice(0, 200),
      details: line.slice(0, 4000),
      organization: '',
      ai_allowed: false,
    });
  }
  return rows;
}
export async function parseDocument(buffer, name) {
  const bytes = new Uint8Array(buffer);
  const type = validateDocument({ name, size: bytes.length, type: '' }, bytes);
  let text = '',
    pages = null;
  if (type === 'application/pdf') {
    const { getDocumentProxy, extractText } = await import('unpdf');
    const pdf = await getDocumentProxy(bytes, {
      maxImageSize: 16777216,
      isEvalSupported: false,
      stopAtErrors: true,
    });
    try {
      pages = pdf.numPages;
      if (pages > 50)
        throw Error('This PDF exceeds 50 pages. Upload a shorter document.');
      text = (await extractText(pdf, { mergePages: true })).text;
    } finally {
      await pdf.loadingTask.destroy();
    }
  } else {
    let total = 0,
      count = 0,
      hasDocument = false;
    unzipSync(bytes, {
      filter(entry) {
        count++;
        total += entry.originalSize;
        if (count > 1000 || total > 41943040 || entry.originalSize > 10485760)
          throw Error('This DOCX expands beyond the safe processing limit.');
        if (entry.name === 'word/document.xml') hasDocument = true;
        return false;
      },
    });
    if (!hasDocument) throw Error('This file is not a readable DOCX document.');
    const mammoth = await import('mammoth');
    text = (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value;
  }
  text = text.replaceAll('\0', '').trim();
  if (!text)
    throw Error(
      'No selectable text was found. Scanned PDFs need OCR before upload; automatic OCR is not available.',
    );
  if (text.length > 200000)
    throw Error(
      'This document contains too much text. Upload a shorter version.',
    );
  return { text, pages, draft: draftRecords(text) };
}
