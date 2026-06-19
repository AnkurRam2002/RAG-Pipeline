export function cleanText(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // 1. Remove HTML tags
  cleaned = cleaned.replace(/<[^>]*>?/gm, ' ');

  // 2. Remove Markdown links and images: [text](url) -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

  // 3. Remove Markdown headings (# Heading)
  cleaned = cleaned.replace(/^#+\s+/gm, '');

  // 4. Remove Markdown bold/italic (**bold**, *italic*)
  cleaned = cleaned.replace(/(\*\*|\*|__|_)(.*?)\1/g, '$2');

  // 5. Remove zero-width spaces and control characters (except newline and tab)
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
  cleaned = cleaned.replace(/[^\x20-\x7E\n\t]/g, ' '); // keeps basic ascii and newlines/tabs, converts other weird unicode to spaces

  // 6. Normalize whitespace (replace multiple spaces/tabs with a single space)
  // But preserve paragraph breaks (double newlines)
  cleaned = cleaned.replace(/[ \t]+/g, ' '); // collapse spaces/tabs
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n'); // collapse 3+ newlines to 2

  // 7. Trim leading and trailing whitespace
  return cleaned.trim();
}
