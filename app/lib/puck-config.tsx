'use client';

import { useRef, useEffect } from 'react';
import type { Config } from '@measured/puck';
import { DropZone } from '@measured/puck';
export { jsonToPuckData, componentsToHtml, htmlToPuckData, htmlToComponents } from './puck-components';
export type { ClaudeComponent } from './puck-components';

// ---------------------------------------------------------------------------
// Component prop types
// ---------------------------------------------------------------------------

type HtmlBlockProps = {
  html: string;
};

type FlexProps = {
  direction: 'column' | 'row';
  justifyContent: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  alignItems: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  wrap: 'nowrap' | 'wrap';
  gap: number;
  backgroundColor: string;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  maxWidth: string;
  borderRadius: string;
};

type GridProps = {
  numColumns: number;
  gap: number;
  alignItems: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  backgroundColor: string;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  maxWidth: string;
  borderRadius: string;
};

type SpaceProps = {
  size: string;
  direction: 'vertical' | 'horizontal';
};

type HeadingProps = {
  text: string;
  level: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  color: string;
  fontSize: string;
  fontWeight: string;
  textAlign: 'left' | 'center' | 'right';
};

type TextProps = {
  text: string;
  color: string;
  fontSize: string;
  fontWeight: string;
  textAlign: 'left' | 'center' | 'right';
};

type ImageProps = {
  src: string;
  alt: string;
  width: string;
  height: string;
  objectFit: 'cover' | 'contain' | 'fill' | 'none';
  borderRadius: string;
};

type ButtonProps = {
  text: string;
  href: string;
  backgroundColor: string;
  color: string;
  fontSize: string;
  fontWeight: string;
  paddingX: string;
  paddingY: string;
  borderRadius: string;
  fullWidth: boolean;
};

type DividerProps = {
  color: string;
  thickness: string;
};

type Components = {
  HtmlBlock: HtmlBlockProps;
  Flex: FlexProps;
  Grid: GridProps;
  Space: SpaceProps;
  Heading: HeadingProps;
  Text: TextProps;
  Image: ImageProps;
  Button: ButtonProps;
  Divider: DividerProps;
};

// ---------------------------------------------------------------------------
// HtmlBlock renderer — uses Shadow DOM to isolate HTML from Puck/Tailwind CSS
// ---------------------------------------------------------------------------

function HtmlBlockRender({ html }: { html: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<ShadowRoot | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    if (!shadowRef.current) {
      shadowRef.current = hostRef.current.attachShadow({ mode: 'open' });
    }

    shadowRef.current.innerHTML = html || '';
  }, [html]);

  return <div ref={hostRef} style={{ width: '100%' }} />;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const puckConfig: Config<Components> = {
  categories: {
    layout: {
      components: ['Flex', 'Grid', 'Space'],
      title: 'Layout',
    },
    content: {
      components: ['Heading', 'Text', 'Image', 'Button'],
      title: 'Content',
    },
    utility: {
      components: ['Divider', 'HtmlBlock'],
      title: 'Utility',
    },
  },
  components: {
    // ----- HtmlBlock (backward compat) -----
    HtmlBlock: {
      fields: {
        html: { type: 'textarea' },
      },
      defaultProps: {
        html: '<div style="padding:16px">Empty block</div>',
      },
      render: ({ html }) => {
        return <HtmlBlockRender html={html} />;
      },
    },

    // ----- Flex -----
    Flex: {
      fields: {
        direction: {
          type: 'radio',
          options: [
            { label: 'Column', value: 'column' },
            { label: 'Row', value: 'row' },
          ],
        },
        justifyContent: {
          type: 'select',
          options: [
            { label: 'Start', value: 'flex-start' },
            { label: 'Center', value: 'center' },
            { label: 'End', value: 'flex-end' },
            { label: 'Space Between', value: 'space-between' },
            { label: 'Space Around', value: 'space-around' },
          ],
        },
        alignItems: {
          type: 'select',
          options: [
            { label: 'Start', value: 'flex-start' },
            { label: 'Center', value: 'center' },
            { label: 'End', value: 'flex-end' },
            { label: 'Stretch', value: 'stretch' },
          ],
        },
        wrap: {
          type: 'radio',
          options: [
            { label: 'No Wrap', value: 'nowrap' },
            { label: 'Wrap', value: 'wrap' },
          ],
        },
        gap: { type: 'number', min: 0 },
        backgroundColor: { type: 'text' },
        paddingTop: { type: 'text' },
        paddingRight: { type: 'text' },
        paddingBottom: { type: 'text' },
        paddingLeft: { type: 'text' },
        maxWidth: { type: 'text' },
        borderRadius: { type: 'text' },
      },
      defaultProps: {
        direction: 'column',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        wrap: 'nowrap',
        gap: 0,
        backgroundColor: '',
        paddingTop: '0px',
        paddingRight: '0px',
        paddingBottom: '0px',
        paddingLeft: '0px',
        maxWidth: '100%',
        borderRadius: '0px',
      },
      render: ({
        direction,
        justifyContent,
        alignItems,
        wrap,
        gap,
        backgroundColor,
        paddingTop,
        paddingRight,
        paddingBottom,
        paddingLeft,
        maxWidth,
        borderRadius,
      }) => {
        return (
          <div
            style={{
              backgroundColor: backgroundColor || undefined,
              paddingTop,
              paddingRight,
              paddingBottom,
              paddingLeft,
              maxWidth,
              borderRadius,
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <DropZone
              zone="children"
              style={{
                display: 'flex',
                flexDirection: direction,
                flexWrap: wrap,
                justifyContent,
                alignItems,
                gap: `${gap}px`,
              }}
            />
          </div>
        );
      },
    },

    // ----- Grid -----
    Grid: {
      fields: {
        numColumns: { type: 'number', min: 1, max: 12 },
        gap: { type: 'number', min: 0 },
        alignItems: {
          type: 'select',
          options: [
            { label: 'Start', value: 'flex-start' },
            { label: 'Center', value: 'center' },
            { label: 'End', value: 'flex-end' },
            { label: 'Stretch', value: 'stretch' },
          ],
        },
        backgroundColor: { type: 'text' },
        paddingTop: { type: 'text' },
        paddingRight: { type: 'text' },
        paddingBottom: { type: 'text' },
        paddingLeft: { type: 'text' },
        maxWidth: { type: 'text' },
        borderRadius: { type: 'text' },
      },
      defaultProps: {
        numColumns: 2,
        gap: 16,
        alignItems: 'stretch',
        backgroundColor: '',
        paddingTop: '0px',
        paddingRight: '0px',
        paddingBottom: '0px',
        paddingLeft: '0px',
        maxWidth: '100%',
        borderRadius: '0px',
      },
      render: ({
        numColumns,
        gap,
        alignItems,
        backgroundColor,
        paddingTop,
        paddingRight,
        paddingBottom,
        paddingLeft,
        maxWidth,
        borderRadius,
      }) => {
        return (
          <div
            style={{
              backgroundColor: backgroundColor || undefined,
              paddingTop,
              paddingRight,
              paddingBottom,
              paddingLeft,
              maxWidth,
              borderRadius,
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <DropZone
              zone="children"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${numColumns}, 1fr)`,
                gap: `${gap}px`,
                alignItems,
              }}
            />
          </div>
        );
      },
    },

    // ----- Space -----
    Space: {
      inline: true,
      fields: {
        size: { type: 'text' },
        direction: {
          type: 'radio',
          options: [
            { label: 'Vertical', value: 'vertical' },
            { label: 'Horizontal', value: 'horizontal' },
          ],
        },
      },
      defaultProps: {
        size: '24px',
        direction: 'vertical',
      },
      render: ({ size, direction }) => {
        return (
          <div
            style={{
              height: direction === 'vertical' ? size : '0px',
              width: direction === 'horizontal' ? size : '0px',
            }}
          />
        );
      },
    },

    // ----- Heading -----
    Heading: {
      fields: {
        text: { type: 'textarea' },
        level: {
          type: 'select',
          options: [
            { label: 'H1', value: 'h1' },
            { label: 'H2', value: 'h2' },
            { label: 'H3', value: 'h3' },
            { label: 'H4', value: 'h4' },
            { label: 'H5', value: 'h5' },
            { label: 'H6', value: 'h6' },
          ],
        },
        color: { type: 'text' },
        fontSize: { type: 'text' },
        fontWeight: { type: 'text' },
        textAlign: {
          type: 'select',
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right', value: 'right' },
          ],
        },
      },
      defaultProps: {
        text: 'Heading',
        level: 'h2',
        color: '#000000',
        fontSize: '24px',
        fontWeight: '700',
        textAlign: 'left',
      },
      render: ({ text, level, color, fontSize, fontWeight, textAlign }) => {
        const Tag = level;
        return (
          <Tag
            style={{
              color,
              fontSize,
              fontWeight,
              textAlign,
              margin: 0,
            }}
          >
            {text}
          </Tag>
        );
      },
    },

    // ----- Text -----
    Text: {
      fields: {
        text: { type: 'textarea' },
        color: { type: 'text' },
        fontSize: { type: 'text' },
        fontWeight: { type: 'text' },
        textAlign: {
          type: 'select',
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right', value: 'right' },
          ],
        },
      },
      defaultProps: {
        text: 'Paragraph text',
        color: '#333333',
        fontSize: '16px',
        fontWeight: '400',
        textAlign: 'left',
      },
      render: ({ text, color, fontSize, fontWeight, textAlign }) => {
        return (
          <p style={{ color, fontSize, fontWeight, textAlign, margin: 0 }}>
            {text}
          </p>
        );
      },
    },

    // ----- Image -----
    Image: {
      fields: {
        src: { type: 'text' },
        alt: { type: 'text' },
        width: { type: 'text' },
        height: { type: 'text' },
        objectFit: {
          type: 'select',
          options: [
            { label: 'Cover', value: 'cover' },
            { label: 'Contain', value: 'contain' },
            { label: 'Fill', value: 'fill' },
            { label: 'None', value: 'none' },
          ],
        },
        borderRadius: { type: 'text' },
      },
      defaultProps: {
        src: '',
        alt: '',
        width: '100%',
        height: 'auto',
        objectFit: 'cover',
        borderRadius: '0px',
      },
      render: ({ src, alt, width, height, objectFit, borderRadius }) => {
        if (!src) {
          return (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f3f4f6',
                padding: '32px',
                color: '#9ca3af',
              }}
            >
              No image source
            </div>
          );
        }
        return (
          <img
            src={src}
            alt={alt}
            style={{ width, height, objectFit, borderRadius, display: 'block' }}
          />
        );
      },
    },

    // ----- Button -----
    Button: {
      fields: {
        text: { type: 'text' },
        href: { type: 'text' },
        backgroundColor: { type: 'text' },
        color: { type: 'text' },
        fontSize: { type: 'text' },
        fontWeight: { type: 'text' },
        paddingX: { type: 'text' },
        paddingY: { type: 'text' },
        borderRadius: { type: 'text' },
        fullWidth: {
          type: 'radio',
          options: [
            { label: 'Yes', value: true },
            { label: 'No', value: false },
          ],
        },
      },
      defaultProps: {
        text: 'Click me',
        href: '#',
        backgroundColor: '#2563eb',
        color: '#ffffff',
        fontSize: '16px',
        fontWeight: '600',
        paddingX: '24px',
        paddingY: '12px',
        borderRadius: '8px',
        fullWidth: false,
      },
      render: ({
        text,
        href,
        backgroundColor,
        color,
        fontSize,
        fontWeight,
        paddingX,
        paddingY,
        borderRadius,
        fullWidth,
      }) => {
        return (
          <a
            href={href}
            style={{
              display: fullWidth ? 'block' : 'inline-block',
              backgroundColor,
              color,
              fontSize,
              fontWeight,
              padding: `${paddingY} ${paddingX}`,
              borderRadius,
              textDecoration: 'none',
              textAlign: 'center',
              cursor: 'pointer',
              width: fullWidth ? '100%' : undefined,
              boxSizing: 'border-box',
              border: 'none',
            }}
          >
            {text}
          </a>
        );
      },
    },

    // ----- Divider -----
    Divider: {
      fields: {
        color: { type: 'text' },
        thickness: { type: 'text' },
      },
      defaultProps: {
        color: '#e5e7eb',
        thickness: '1px',
      },
      render: ({ color, thickness }) => {
        return (
          <hr
            style={{
              border: 'none',
              borderTop: `${thickness} solid ${color}`,
              margin: 0,
              width: '100%',
            }}
          />
        );
      },
    },
  },
};
