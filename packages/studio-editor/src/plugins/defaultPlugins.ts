import type { Editor } from 'grapesjs';
import type { StudioPlugin } from '../types';

export function defaultPlugins(): StudioPlugin[] {
  return [
    // Plugin to add default custom blocks
    (editor) => {
      const blockManager = editor.BlockManager;

      blockManager.add('custom-button-primary', {
        label: 'Open',
        category: 'Custom Buttons',
        content: `<button class="custom-btn-primary" style="background-color: white; border: none; border-radius: 25px; padding: 4px 12px; cursor: pointer; height: 25px; min-width: 83px; align-self: auto; display: flex; justify-content: center; align-items: center; color: #0072c3; font-size: 10px; font-family: 'IBM Plex Sans', sans-serif; font-weight: 400;">Open App</button>`,
      });
    },
    // Plugin to remove unwanted blocks (example)
    (editor) => {
      const bm = editor.BlockManager;
      const blocksToRemove = ['link', 'map', 'quote'];

      blocksToRemove.forEach((id) => {
        try {
          bm.remove(id);
        } catch {
          // Ignore errors if block doesn't exist
        }
      });
    },
  ];
}
