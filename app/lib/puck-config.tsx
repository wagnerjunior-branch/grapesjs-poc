import type { Config } from '@measured/puck';

/**
 * Puck editor component configuration.
 *
 * Three component types:
 * - HtmlBlock: renders converted Figma HTML as a single block
 * - TextElement: editable text (headings, paragraphs)
 * - ImageElement: editable image with URL and alt
 */

type HtmlBlockProps = {
  html: string;
};

type TextElementProps = {
  content: string;
  tag: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  className: string;
};

type ImageElementProps = {
  src: string;
  alt: string;
  className: string;
};

type Components = {
  HtmlBlock: HtmlBlockProps;
  TextElement: TextElementProps;
  ImageElement: ImageElementProps;
};

export const puckConfig: Config<Components> = {
  categories: {
    layout: {
      components: ['HtmlBlock'],
      title: 'Layout',
    },
    content: {
      components: ['TextElement', 'ImageElement'],
      title: 'Content',
    },
  },
  components: {
    HtmlBlock: {
      fields: {
        html: {
          type: 'textarea',
        },
      },
      defaultProps: {
        html: '<div class="p-4">Empty block</div>',
      },
      render: ({ html }) => {
        return <div dangerouslySetInnerHTML={{ __html: html }} />;
      },
    },
    TextElement: {
      fields: {
        content: { type: 'textarea' },
        tag: {
          type: 'select',
          options: [
            { label: 'Heading 1', value: 'h1' },
            { label: 'Heading 2', value: 'h2' },
            { label: 'Heading 3', value: 'h3' },
            { label: 'Paragraph', value: 'p' },
            { label: 'Span', value: 'span' },
          ],
        },
        className: { type: 'text' },
      },
      defaultProps: {
        content: 'Edit this text',
        tag: 'p',
        className: '',
      },
      render: ({ content, tag, className }) => {
        const Tag = tag;
        return <Tag className={className}>{content}</Tag>;
      },
    },
    ImageElement: {
      fields: {
        src: { type: 'text' },
        alt: { type: 'text' },
        className: { type: 'text' },
      },
      defaultProps: {
        src: '',
        alt: '',
        className: 'max-w-full h-auto',
      },
      render: ({ src, alt, className }) => {
        if (!src) {
          return (
            <div className="flex items-center justify-center bg-gray-100 p-8 text-gray-400">
              No image source
            </div>
          );
        }
        return <img src={src} alt={alt} className={className} />;
      },
    },
  },
};

/**
 * Build Puck data from imported HTML.
 * Wraps the full HTML in a single HtmlBlock component.
 */
export function htmlToPuckData(html: string) {
  return {
    content: [
      {
        type: 'HtmlBlock' as const,
        props: {
          html,
          id: 'html-block-1',
        },
      },
    ],
    root: { props: {} },
  };
}
