# @grapejs-poc/studio-editor

Internal wrapper for @grapesjs/studio-sdk that encapsulates Studio SDK initialization, applies design system theme, registers default plugins, and enforces restrictions through validation policy.

## When to use

Use this wrapper when you want to:
- Standardize editor appearance and behavior across the app
- Restrict options without maintaining a fork of Studio SDK
- Centralize plugins, rules, and theme in a versioned location

## Structure

```
packages/studio-editor/
├── src/
│   ├── index.ts                    # Main exports
│   ├── types.ts                    # TypeScript types
│   ├── theme/
│   │   └── theme.css              # Design system theme
│   ├── plugins/
│   │   └── defaultPlugins.ts      # Default plugins
│   ├── policy/
│   │   └── applyPolicy.ts         # Security policy
│   └── react/
│       └── StudioEditor.tsx       # React component
└── package.json
```

## Usage

```tsx
import { StudioEditor } from '@grapejs-poc/studio-editor';

function MyEditor() {
  return (
    <StudioEditor
      options={{
        licenseKey: process.env.NEXT_PUBLIC_GRAPESJS_LICENSE_KEY || '',
        pages: false,
        project: { type: 'web' },
      }}
      policy={{
        allowedClasses: ['se-btn', 'se-card', 'se-text'],
        disallowTags: ['script', 'iframe', 'video'],
      }}
      onReady={(editor) => {
        editor.setComponents('<div class="se-card">Hello</div>');
      }}
      style={{ height: 800 }}
    />
  );
}
```

## Customization

### Plugins

Default plugins are defined in `src/plugins/defaultPlugins.ts`. You can extend or replace them as needed.

### Security Policy

The default policy is defined in `src/policy/applyPolicy.ts` and can be customized via the component's `policy` prop.

### Theme

The CSS theme is in `src/theme/theme.css` and is automatically applied through the `.se-root` class.

## Layered Restrictions

The wrapper applies restrictions in three layers:

1. **Config and plugins**: Removes unwanted panels, commands, blocks, traits, and style properties
2. **CSS**: Hides UI items that should not appear
3. **Policy**: Prevents bypass via events and component sanitization
