'use client';

import { useState } from 'react';
import { BlocksProvider } from '@grapesjs/react';
import type { Block } from 'grapesjs';

interface BlockItemProps {
  block: Block;
  dragStart: (block: Block, ev?: Event) => void;
  dragStop: (cancel?: boolean) => void;
}

function BlockItem({ block, dragStart, dragStop }: BlockItemProps) {
  return (
    <div
      draggable
      onDragStart={(e) => dragStart(block, e.nativeEvent)}
      onDragEnd={() => dragStop(false)}
      className="flex flex-col items-center justify-center p-3 rounded-lg border cursor-grab transition-colors bg-(--editor-block-bg) border-(--editor-block-border) hover:bg-(--editor-block-hover-bg) hover:border-(--editor-block-hover-border)"
    >
      <div
        className="w-8 h-8 mb-1 flex items-center justify-center text-(--editor-block-icon-color)"
        dangerouslySetInnerHTML={{ __html: block.getMedia() || '' }}
      />
      <span className="text-xs text-center text-(--editor-text-primary)">
        {block.getLabel()}
      </span>
    </div>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="flex items-start pt-4 border-r bg-(--editor-bg-sidebar) border-(--editor-border-color)">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 hover:bg-gray-100 rounded text-(--editor-text-secondary)"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 border-r flex flex-col overflow-y-auto bg-(--editor-bg-sidebar) border-(--editor-border-color)">
      {/* Collapse button */}
      <div className="flex justify-end p-2">
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 hover:bg-gray-100 rounded text-(--editor-text-secondary)"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      </div>

      <BlocksProvider>
        {({ mapCategoryBlocks, dragStart, dragStop }) => (
          <div className="px-4 pb-4">
            {Array.from(mapCategoryBlocks).map(([category, blocks]) => (
              <div key={category} className="mb-6">
                <h3 className="text-sm font-semibold mb-1 text-(--editor-text-primary)">
                  {category}
                </h3>
                <p className="text-xs mb-3 text-(--editor-text-muted)">
                  {category === 'Rows'
                    ? 'Drag a row into your message'
                    : 'Drag and drop a block into a row'}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {blocks.map((block) => (
                    <BlockItem
                      key={block.getId()}
                      block={block}
                      dragStart={dragStart}
                      dragStop={dragStop}
                    />
                  ))}
                </div>
                {/* Separator */}
                <div className="mt-4 border-b border-(--editor-border-color)" />
              </div>
            ))}
          </div>
        )}
      </BlocksProvider>
    </div>
  );
}
