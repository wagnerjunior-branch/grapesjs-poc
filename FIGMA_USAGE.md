# How to Use the Figma to Form Editor

## 🎯 The Correct Workflow

### Quick Demo (Works Immediately)

**Just visit this link**:
```
http://localhost:3000/template-editor?demo=figma-banner
```

Your Figma banner is already loaded and ready to edit!

---

## 🆕 Processing New Figma Designs

Here's the correct 3-step workflow:

### Step 1: Get Your Figma URL

1. Open Figma
2. Select your frame/component
3. Copy the URL from browser (must include `node-id`)

Example:
```
https://www.figma.com/design/uXhPriLGgHXFqLIZw4xx3T/Banners?node-id=3556-11384
```

### Step 2: Validate the URL

1. Go to: `http://localhost:3000/figma-editor`
2. Paste your URL
3. Click **"Generate Template"**

You'll see a purple box with:
- ✅ URL validated
- 📋 A message to copy

### Step 3: Request Processing

**Click the "Copy Message" button**, then **paste it here in the chat**.

It will look like:
```
Please process this Figma design and load it in the form editor: [your-url]
```

**Then I (Claude) will**:
1. ✅ Call Figma MCP `get_design_context`
2. ✅ Convert React code to clean HTML
3. ✅ Save to `html/` directory
4. ✅ Give you a direct link to edit

---

## 🚀 Alternative: Just Ask Me Directly

You can skip the UI entirely and just paste your Figma URL in chat:

**Say**:
> Please convert this Figma design to the form editor:
> https://www.figma.com/design/abc123/File?node-id=1-2

**I'll respond with**:
> ✅ Done! Edit here: http://localhost:3000/template-editor?demo=figma-banner

---

## 📊 Why This Workflow?

**The Figma MCP requires Claude Code to make the API calls.** The web app can't directly call the Figma MCP - only I (Claude) can.

So the workflow is:
1. **You** → Paste URL in UI (validates format)
2. **UI** → Shows "copy this message"
3. **You** → Paste message in chat
4. **Me (Claude)** → Process design, generate HTML
5. **You** → Get direct link to edit

---

## 🎨 What I Do When Processing

When you request a Figma design, here's what happens:

### 1. Call Figma MCP
```typescript
mcp__plugin_figma_figma__get_design_context({
  fileKey: "uXhPriLGgHXFqLIZw4xx3T",
  nodeId: "3556:11384",
  clientLanguages: "html,css",
  clientFrameworks: "tailwind"
})
```

### 2. Receive React Code
```jsx
const img = "https://www.figma.com/api/mcp/asset/...";
export default function Component() {
  return (
    <div className="flex gap-4">
      <img src={img} alt="..." />
      <h2>Title</h2>
    </div>
  );
}
```

### 3. Convert to Clean HTML
```html
<div class="flex gap-4">
  <img src="https://www.figma.com/api/mcp/asset/..." alt="..." />
  <h2>Title</h2>
</div>
```

### 4. Wrap in Document
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- IBM Plex Sans font -->
</head>
<body>
  <!-- Your converted HTML -->
</body>
</html>
```

### 5. Save to File
```
html/figma-{fileKey}-{nodeId}-{timestamp}.html
```

### 6. Return Link
```
http://localhost:3000/template-editor?demo=figma-banner
```

---

## ✅ Example: Process Your Banner

**You already have this URL**:
```
https://www.figma.com/design/uXhPriLGgHXFqLIZw4xx3T/Banners?node-id=3556-11384&m=dev
```

**Just say in chat**:
> Please process this Figma design and load it in the form editor: https://www.figma.com/design/uXhPriLGgHXFqLIZw4xx3T/Banners?node-id=3556-11384&m=dev

**I'll**:
1. Call Figma MCP
2. Generate HTML
3. Save to `html/`
4. Reply with link

**You'll get**:
> ✅ Processed! Edit here: http://localhost:3000/template-editor?demo=figma-banner

---

## 🎯 Quick Reference

| Action | Method |
|--------|--------|
| **Try demo instantly** | Visit `/template-editor?demo=figma-banner` |
| **Validate URL** | Paste in `/figma-editor` UI |
| **Process new design** | Copy message from UI, paste in chat |
| **Direct request** | Paste Figma URL in chat, ask me to process |

---

## 💡 Pro Tips

### Fastest Workflow
Skip the UI, just paste Figma URLs directly in chat:
> Convert this: https://figma.com/design/...?node-id=...

### Bulk Processing
Want multiple designs? Paste them all:
> Please process these Figma designs:
> 1. https://figma.com/design/...?node-id=1-2
> 2. https://figma.com/design/...?node-id=3-4

### Re-edit Later
Export with "Annotated HTML" option to keep `data-editable-id` attributes.
Then you can load it back into the editor later.

---

## 🐛 Troubleshooting

### UI Says "Processing..." Forever

**Problem**: The UI can't trigger me automatically.

**Solution**: Copy the message from the purple box and paste it in chat.

### "Invalid URL" Error

**Check**:
- URL from `figma.com`
- Has `node-id` parameter
- Format: `?node-id=123-456`

### Can't Find Generated HTML

**Look in**:
```bash
ls -la html/
```

Files match: `figma-{fileKey}-{nodeId}-*.html`

---

## 🎉 Ready to Try?

**Right now, you can**:

1. **Try the demo**: http://localhost:3000/template-editor?demo=figma-banner

2. **Process new design**: Paste this in chat:
   ```
   Please process this Figma design: [your-url]
   ```

3. **Edit & Export**: Use the form editor to customize and export

---

**That's it!** The workflow is now clear and actually works. 🚀
