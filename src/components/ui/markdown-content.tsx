'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Code } from 'lucide-react';

interface MarkdownContentProps {
  content: string;
  className?: string;
  showSourceToggle?: boolean;
}

/**
 * Check if content appears to be HTML
 */
function isHtmlContent(content: string): boolean {
  // Check for common HTML patterns
  return /<(html|head|body|div|table|tr|td|p|span|a|img|br|hr)\b/i.test(content);
}

/**
 * Convert HTML email to readable plain text
 */
function htmlToPlainText(html: string): string {
  let text = html;

  // Remove style and script tags with their content
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // Convert common block elements to newlines
  text = text.replace(/<\/(p|div|tr|h[1-6]|li|br|hr)[^>]*>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<hr\s*\/?>/gi, '\n---\n');

  // Convert links to markdown format [text](url)
  text = text.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi, '[$2]($1)');

  // Convert images to markdown format
  text = text.replace(/<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi, '![$2]($1)');
  text = text.replace(/<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']+)["'][^>]*\/?>/gi, '![$1]($2)');
  text = text.replace(/<img[^>]*src=["']([^"']+)["'][^>]*\/?>/gi, '![]($1)');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  text = text.replace(/&nbsp;/gi, ' ');
  text = text.replace(/&amp;/gi, '&');
  text = text.replace(/&lt;/gi, '<');
  text = text.replace(/&gt;/gi, '>');
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/&#39;/gi, "'");
  text = text.replace(/&copy;/gi, '©');
  text = text.replace(/&reg;/gi, '®');
  text = text.replace(/&trade;/gi, '™');
  text = text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));

  // Clean up excessive whitespace
  text = text.replace(/[ \t]+/g, ' '); // Multiple spaces/tabs to single space
  text = text.replace(/\n[ \t]+/g, '\n'); // Remove leading whitespace on lines
  text = text.replace(/[ \t]+\n/g, '\n'); // Remove trailing whitespace on lines
  text = text.replace(/\n{3,}/g, '\n\n'); // Multiple newlines to double

  return text.trim();
}

/**
 * Clean email body by removing redundant headers and handling HTML
 */
function cleanEmailBody(content: string): string {
  let cleaned = content;

  // Convert HTML to plain text if needed
  if (isHtmlContent(cleaned)) {
    cleaned = htmlToPlainText(cleaned);
  }

  // Remove common email header lines that are redundant with our UI
  const headerPatterns = [
    /^From:\s*.+$/gim,
    /^Subject:\s*.+$/gim,
    /^To:\s*.+$/gim,
    /^Date:\s*.+$/gim,
    /^Sent:\s*.+$/gim,
    /^Cc:\s*.+$/gim,
    /^Reply-To:\s*.+$/gim,
  ];

  for (const pattern of headerPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Remove multiple consecutive blank lines (more than 2)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Trim leading/trailing whitespace
  return cleaned.trim();
}

/**
 * Truncate a URL for display, keeping the domain and start/end visible
 */
function truncateUrl(url: string, maxLength: number = 50): string {
  if (url.length <= maxLength) return url;

  try {
    const parsed = new URL(url);
    const domain = parsed.hostname;
    const path = parsed.pathname + parsed.search;

    // If domain alone is close to max, just truncate simply
    if (domain.length > maxLength - 10) {
      return url.slice(0, maxLength - 3) + '...';
    }

    // Show domain + start of path + ... + end of path
    const availableForPath = maxLength - domain.length - 10;
    if (path.length > availableForPath && availableForPath > 10) {
      const startChars = Math.floor(availableForPath / 2);
      const endChars = Math.floor(availableForPath / 2);
      return `${domain}${path.slice(0, startChars)}...${path.slice(-endChars)}`;
    }

    return url.slice(0, maxLength - 3) + '...';
  } catch {
    return url.slice(0, maxLength - 3) + '...';
  }
}

/**
 * Check if a line is likely part of an email footer/signature
 */
function isFooterLine(line: string, lineIndex: number, totalLines: number): boolean {
  const trimmed = line.trim();

  // Common signature delimiters
  if (trimmed === '--' || trimmed === '---' || trimmed === '----------') {
    return true;
  }

  // Common footer patterns (case insensitive)
  const footerPatterns = [
    /^sent from my/i,
    /^get outlook for/i,
    /^to opt out/i,
    /^unsubscribe/i,
    /^click here to unsubscribe/i,
    /^you('re| are) receiving this/i,
    /^this email was sent/i,
    /^add partners who should receive/i,
    /^message type:/i,
    /^\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|way|lane|ln)/i, // Address
  ];

  for (const pattern of footerPatterns) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }

  return false;
}

/**
 * Process text to convert plain URLs to clickable links
 */
function processTextWithLinks(
  text: string,
  keyPrefix: string,
  keyIndex: { current: number }
): React.ReactNode[] {
  const elements: React.ReactNode[] = [];

  // Match URLs that aren't already in markdown format
  // This regex matches http/https URLs
  const urlRegex = /(https?:\/\/[^\s<>\[\]"']+)/g;

  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      elements.push(
        <span key={`${keyPrefix}-text-${keyIndex.current++}`}>
          {text.slice(lastIndex, match.index)}
        </span>
      );
    }

    const url = match[1];
    // Check if it's an image URL
    const isImage = /\.(png|jpg|jpeg|gif|webp|svg)(\?|$)/i.test(url);

    if (isImage) {
      elements.push(
        <img
          key={`${keyPrefix}-img-${keyIndex.current++}`}
          src={url}
          alt="Image"
          className="max-w-full max-h-96 rounded-md my-2 border"
          loading="lazy"
        />
      );
    } else {
      elements.push(
        <a
          key={`${keyPrefix}-link-${keyIndex.current++}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline break-all"
          title={url}
        >
          {truncateUrl(url)}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    elements.push(
      <span key={`${keyPrefix}-text-${keyIndex.current++}`}>
        {text.slice(lastIndex)}
      </span>
    );
  }

  return elements;
}

/**
 * Simple markdown renderer that handles:
 * - Images: ![alt](url) and standalone image URLs
 * - Links: [text](url) and plain URLs (auto-linked)
 * - Long URL truncation for readability
 * - Email footer/signature detection and styling
 * - Line breaks
 */
export function MarkdownContent({ content, className = '', showSourceToggle = false }: MarkdownContentProps) {
  const [showSource, setShowSource] = useState(false);

  // Check if content was transformed (HTML or had headers stripped)
  const wasTransformed = useMemo(() => {
    if (!content) return false;
    return isHtmlContent(content) || /^(From|Subject|To|Date|Sent|Cc|Reply-To):\s/im.test(content);
  }, [content]);

  const rendered = useMemo(() => {
    if (!content) return null;

    // Clean email content (HTML to text, strip headers)
    const cleanedContent = cleanEmailBody(content);

    // Split content by lines to process each line
    const lines = cleanedContent.split('\n');
    const elements: React.ReactNode[] = [];
    let inFooter = false;
    let footerStartIndex = -1;

    // First pass: detect where footer starts
    for (let i = 0; i < lines.length; i++) {
      if (isFooterLine(lines[i], i, lines.length)) {
        // Check if this looks like the start of a footer section
        // (signature delimiter or footer-like content in bottom half of email)
        const trimmed = lines[i].trim();
        if (trimmed === '--' || trimmed === '---' || trimmed === '----------' || i > lines.length * 0.5) {
          footerStartIndex = i;
          break;
        }
      }
    }

    lines.forEach((line, lineIndex) => {
      const keyIndex = { current: 0 };
      const lineElements: React.ReactNode[] = [];

      // Check if we're in the footer section
      if (footerStartIndex >= 0 && lineIndex >= footerStartIndex) {
        inFooter = true;
      }

      // Process markdown images first: ![alt](url)
      const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
      let lastIndex = 0;
      let match;
      let remaining = line;

      while ((match = imageRegex.exec(line)) !== null) {
        // Add text before the image
        if (match.index > lastIndex) {
          const textBefore = line.slice(lastIndex, match.index);
          lineElements.push(...processTextWithLinks(textBefore, `${lineIndex}`, keyIndex));
        }

        const [, alt, url] = match;
        lineElements.push(
          <img
            key={`${lineIndex}-mdimg-${keyIndex.current++}`}
            src={url}
            alt={alt || 'Image'}
            className="max-w-full max-h-96 rounded-md my-2 border"
            loading="lazy"
          />
        );

        lastIndex = match.index + match[0].length;
      }

      // Process remaining text after images
      if (lastIndex < line.length) {
        remaining = line.slice(lastIndex);

        // Process markdown links: [text](url)
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let linkLastIndex = 0;
        let linkMatch;

        while ((linkMatch = linkRegex.exec(remaining)) !== null) {
          if (linkMatch.index > linkLastIndex) {
            const textBefore = remaining.slice(linkLastIndex, linkMatch.index);
            lineElements.push(...processTextWithLinks(textBefore, `${lineIndex}`, keyIndex));
          }

          const [, text, url] = linkMatch;
          lineElements.push(
            <a
              key={`${lineIndex}-mdlink-${keyIndex.current++}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
              title={url}
            >
              {text}
            </a>
          );

          linkLastIndex = linkMatch.index + linkMatch[0].length;
        }

        // Process any remaining text (including plain URLs)
        if (linkLastIndex < remaining.length) {
          const finalText = remaining.slice(linkLastIndex);
          lineElements.push(...processTextWithLinks(finalText, `${lineIndex}`, keyIndex));
        }
      }

      // Handle empty lines
      if (lineElements.length === 0) {
        lineElements.push(<span key={`${lineIndex}-empty`}>&nbsp;</span>);
      }

      // Wrap line with footer styling if in footer section
      const lineClassName = inFooter
        ? 'min-h-[1.4em] text-muted-foreground text-sm'
        : 'min-h-[1.5em]';

      elements.push(
        <div key={`line-${lineIndex}`} className={lineClassName}>
          {lineElements}
        </div>
      );
    });

    return elements;
  }, [content]);

  return (
    <div className={className}>
      <div className="whitespace-pre-wrap">{rendered}</div>

      {/* View source toggle - only show if content was transformed */}
      {showSourceToggle && wasTransformed && (
        <div className="mt-4 border-t pt-3">
          <button
            onClick={() => setShowSource(!showSource)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showSource ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <Code className="h-3 w-3" />
            <span>View original</span>
          </button>

          {showSource && (
            <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-x-auto max-h-96 overflow-y-auto">
              <code>{content}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
