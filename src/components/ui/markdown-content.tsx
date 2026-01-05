'use client';

import { useMemo } from 'react';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * Simple markdown renderer that handles:
 * - Images: ![alt](url) and standalone image URLs
 * - Links: [text](url)
 * - Line breaks
 */
export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  const rendered = useMemo(() => {
    if (!content) return null;

    // Split content by lines to process each line
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];

    lines.forEach((line, lineIndex) => {
      const lineElements: React.ReactNode[] = [];
      let remaining = line;
      let keyIndex = 0;

      // Process markdown images: ![alt](url)
      const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
      let lastIndex = 0;
      let match;

      while ((match = imageRegex.exec(line)) !== null) {
        // Add text before the image
        if (match.index > lastIndex) {
          lineElements.push(
            <span key={`${lineIndex}-text-${keyIndex++}`}>
              {line.slice(lastIndex, match.index)}
            </span>
          );
        }

        const [, alt, url] = match;
        lineElements.push(
          <img
            key={`${lineIndex}-img-${keyIndex++}`}
            src={url}
            alt={alt || 'Image'}
            className="max-w-full max-h-96 rounded-md my-2 border"
            loading="lazy"
          />
        );

        lastIndex = match.index + match[0].length;
      }

      // Add remaining text after last image
      if (lastIndex < line.length) {
        remaining = line.slice(lastIndex);

        // Process links in remaining text: [text](url)
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let linkLastIndex = 0;
        let linkMatch;

        while ((linkMatch = linkRegex.exec(remaining)) !== null) {
          if (linkMatch.index > linkLastIndex) {
            lineElements.push(
              <span key={`${lineIndex}-linktext-${keyIndex++}`}>
                {remaining.slice(linkLastIndex, linkMatch.index)}
              </span>
            );
          }

          const [, text, url] = linkMatch;
          lineElements.push(
            <a
              key={`${lineIndex}-link-${keyIndex++}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {text}
            </a>
          );

          linkLastIndex = linkMatch.index + linkMatch[0].length;
        }

        if (linkLastIndex < remaining.length) {
          // Check for standalone image URLs
          const urlImageRegex = /(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s]*)?)/gi;
          const finalRemaining = remaining.slice(linkLastIndex);
          let urlLastIndex = 0;
          let urlMatch;

          while ((urlMatch = urlImageRegex.exec(finalRemaining)) !== null) {
            if (urlMatch.index > urlLastIndex) {
              lineElements.push(
                <span key={`${lineIndex}-urltext-${keyIndex++}`}>
                  {finalRemaining.slice(urlLastIndex, urlMatch.index)}
                </span>
              );
            }

            lineElements.push(
              <img
                key={`${lineIndex}-urlimg-${keyIndex++}`}
                src={urlMatch[1]}
                alt="Image"
                className="max-w-full max-h-96 rounded-md my-2 border"
                loading="lazy"
              />
            );

            urlLastIndex = urlMatch.index + urlMatch[0].length;
          }

          if (urlLastIndex < finalRemaining.length) {
            lineElements.push(
              <span key={`${lineIndex}-final-${keyIndex++}`}>
                {finalRemaining.slice(urlLastIndex)}
              </span>
            );
          }
        }
      } else if (lineElements.length === 0) {
        // Empty line
        lineElements.push(<span key={`${lineIndex}-empty`}>&nbsp;</span>);
      }

      elements.push(
        <div key={`line-${lineIndex}`} className="min-h-[1.5em]">
          {lineElements.length > 0 ? lineElements : <br />}
        </div>
      );
    });

    return elements;
  }, [content]);

  return <div className={`whitespace-pre-wrap ${className}`}>{rendered}</div>;
}
