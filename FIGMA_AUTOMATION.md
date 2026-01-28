# Automated Figma Processing - How It Works

## The Problem
Web apps can't directly trigger Claude Code - only you (the user) can by sending messages in chat.

## The Solution
**Skip the UI form entirely for submission. Use the chat directly.**

## ✅ Automated Workflow (Simplest)

### Step 1: Paste Figma URL in Chat
Just paste your Figma URL here:
```
https://www.figma.com/design/uXhPriLGgHXFqLIZw4xx3T/Banners?node-id=3556-11384
```

### Step 2: I Auto-Process
I automatically:
1. Detect it's a Figma URL
2. Invoke `/html-renderer` skill
3. Generate HTML and save to `html/`
4. Provide direct link to edit

### Step 3: Click Link & Edit
```
✅ Ready! Edit here: http://localhost:3000/template-editor?demo=figma-banner
```

## Why This Works
- ✅ No UI interaction needed
- ✅ Fully automated
- ✅ Uses existing html-renderer skill
- ✅ One-step process

## The UI Purpose
The `/figma-editor` page is now just:
- Instructions on how to use
- Link to demo
- Examples of URL format

NOT for submitting URLs - that happens in chat.
