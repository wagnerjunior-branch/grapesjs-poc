# Quick Start Guide - Figma to Form Editor

## 🚀 Fastest Way to Get Started

### Option 1: Load the Demo (Instant)

1. **Start the server**:
   ```bash
   npm run dev
   ```

2. **Click the link or visit**:
   ```
   http://localhost:3000/template-editor?demo=figma-banner
   ```

3. **Start editing!** The form editor loads with a Figma banner ready to edit.

---

## 🎨 Process Your Own Figma Designs

### Step 1: Get Your Figma URL

1. Open your Figma file
2. Select a frame or component
3. Copy the URL from your browser (must include `node-id`)

Example URL:
```
https://www.figma.com/design/uXhPriLGgHXFqLIZw4xx3T/Banners?node-id=3556-11384&m=dev
```

### Step 2: Request Processing

**Method A: Via Figma Editor UI**

1. Go to `http://localhost:3000/figma-editor`
2. Paste your Figma URL
3. Click "Generate Template"
4. Say to Claude: "Please process this Figma design"
5. I'll call the Figma MCP, convert to HTML, and load the editor

**Method B: Direct Request**

Just paste your Figma URL in the chat and say:
> "Please convert this Figma design to HTML and load it in the form editor"

I'll:
1. Call `mcp__plugin_figma_figma__get_design_context`
2. Convert React code to clean HTML
3. Save to `html/` directory
4. Give you a direct link to edit

---

## ✏️ Editing Your Design

Once loaded in the form editor:

### Left Panel: Form
- Edit headings, text, button labels
- Update image URLs
- Change any text content
- See character counts and validation

### Right Panel: Preview
- Live preview of your design
- Updates when you leave a field (onBlur)
- Zoom controls (50% - 200%)

### Top Bar: Actions
- **Copy HTML** - Copy to clipboard
- **Export** - Download as file
  - Clean (production-ready)
  - Annotated (re-editable)

---

## 🔧 How It Works

### When You Submit a Figma URL

1. **I (Claude) process it** by calling:
   ```typescript
   mcp__plugin_figma_figma__get_design_context({
     fileKey: "your-file-key",
     nodeId: "your-node-id"
   })
   ```

2. **Convert React to HTML**:
   - Remove React syntax
   - Convert `className` to `class`
   - Extract image URLs
   - Remove absolute positioning
   - Apply responsive layout

3. **Save to file**:
   ```
   html/figma-{fileKey}-{nodeId}-{timestamp}.html
   ```

4. **Load in editor**:
   ```
   /template-editor?demo=figma-banner
   ```

---

## 📁 File Locations

### Generated HTML Files
```
html/
├── figma-banner-3556-11384.html          # Current demo
└── figma-{fileKey}-{nodeId}-*.html       # Your files
```

### Access in Editor
```
http://localhost:3000/template-editor?demo=figma-banner
```

---

## 🐛 Troubleshooting

### "Processing..." Hangs Forever

**Problem**: The Figma URL was submitted but nothing happened.

**Solution**:
1. Copy your Figma URL
2. In the chat, say: "Please process this Figma URL: [paste URL]"
3. I'll handle it manually and give you a direct link

### Input Text is Grey

**Fixed!** The input now has proper text color (`text-gray-900`).

### Can't Find My Generated HTML

**Check**:
```bash
ls -la html/
```

Look for files matching: `figma-{fileKey}-{nodeId}-*.html`

### Invalid URL Error

**Make sure**:
- URL is from `figma.com`
- Contains `node-id` parameter
- Example: `?node-id=3556-11384`

---

## 💡 Pro Tips

### 1. Selecting Good Figma Nodes

✅ **Good**:
- Complete frames
- Components
- Sections with multiple elements

❌ **Avoid**:
- Individual text layers
- Empty frames
- Deeply nested structures

### 2. Getting Better Editable Forms

The form editor works best with:
- Clear headings (h1-h6)
- Button components with text
- Paragraph text
- Images with alt text

### 3. Exporting HTML

**For Production**:
- Use "Clean HTML" export
- Removes all `data-editable-id` attributes
- Ready to deploy

**For Re-editing**:
- Use "Annotated HTML" export
- Keeps `data-editable-id` attributes
- Can load back into editor later

---

## 🎯 Example Workflow

1. **Design in Figma** → Create your banner/card/layout

2. **Copy URL** → Select element, copy browser URL

3. **Request Processing** →
   ```
   "Claude, please process this Figma design:
   https://www.figma.com/design/abc123/File?node-id=1-2"
   ```

4. **I Process** → Call MCP, convert to HTML, save file

5. **I Provide Link** →
   ```
   "✅ Done! Edit here:
   http://localhost:3000/template-editor?demo=figma-banner"
   ```

6. **You Edit** → Change text, images, content via form

7. **Export** → Download clean HTML for production

---

## 📚 Documentation

- **[FIGMA_WORKFLOW_GUIDE.md](./FIGMA_WORKFLOW_GUIDE.md)** - Complete guide
- **[FIGMA_INTEGRATION_SUMMARY.md](./FIGMA_INTEGRATION_SUMMARY.md)** - Technical details
- **[TEMPLATE_EDITOR_GUIDE.md](./TEMPLATE_EDITOR_GUIDE.md)** - Form editor docs

---

## ⚡ Quick Links

| Link | Purpose |
|------|---------|
| `http://localhost:3000/figma-editor` | Figma URL input |
| `http://localhost:3000/template-editor?demo=figma-banner` | Load demo banner |
| `http://localhost:3000/template-editor?demo=true` | Load original demo |
| `http://localhost:3000/editor` | GrapeJS editor |
| `http://localhost:3000` | Home page |

---

## 🎉 Ready to Try?

**Right now, you can**:

1. Visit: `http://localhost:3000/template-editor?demo=figma-banner`
2. See your Figma banner loaded
3. Edit the content via the form
4. Export modified HTML

**To process new Figma URLs**:

1. Copy your Figma URL
2. Say to me: "Please convert this Figma design: [URL]"
3. I'll process it and give you a link

---

**Made with ❤️ using Next.js, Tailwind CSS, and Figma MCP**
