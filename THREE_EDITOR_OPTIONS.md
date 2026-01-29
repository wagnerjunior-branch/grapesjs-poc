# Three Editor Options Explained

## Overview

The `/figma-editor` page now offers **THREE ways** to edit the banner template:

1. 🔵 **GrapeJS Visual Editor** - Full visual editing
2. 🟢 **Form Editor (Body Only)** - Simple content editing (body content)
3. 🟣 **Form Editor (Full HTML)** - Complete document editing (NEW!)

---

## 🤔 Which Button Should You Use?

### Option 1: GrapeJS Visual Editor (Blue)
**[Open in GrapeJS Visual Editor]**

**Loads:** GrapeJS projectData format
**Edits:** Visual drag-and-drop
**Use When:**
- ✅ You need to change layout
- ✅ You want to add/remove components
- ✅ You need styling controls
- ✅ You're comfortable with visual editors

---

### Option 2: Form Editor - Body Only (Green)
**[Open in Form Editor (Body Only)]**

**Loads:** Body content only (between `<body></body>` tags)
**Excludes:** `<head>`, `<script>`, `<style>`, `<link>` tags
**Preview:** Wrapped with Tailwind CDN automatically

**Use When:**
- ✅ You only need to edit text content
- ✅ You want the simplest form interface
- ✅ You don't care about `<head>` section
- ✅ Quick content updates

**What You Can Edit:**
- Headings
- Paragraphs
- Button text
- Image URLs and alt text

**What You Cannot Edit:**
- Page title
- Meta tags
- External scripts
- Style definitions

---

### Option 3: Form Editor - Full HTML (Purple - NEW!)
**[Open in Form Editor (Full HTML)]**

**Loads:** Complete HTML document
**Includes:** Everything - `<head>`, `<body>`, `<script>`, `<style>`, `<link>` tags
**Preview:** Uses the exact document structure
**No GrapeJS Conversion:** Direct HTML file loading

**Use When:**
- ✅ You need to edit the complete document
- ✅ You want to preserve the exact structure
- ✅ You need access to `<head>` elements
- ✅ You want to edit inline styles or scripts
- ✅ You're bypassing GrapeJS entirely

**What You Can Edit:**
- Everything from Body Only option, PLUS:
- Page title (in `<head>`)
- Meta tags
- Inline styles
- Embedded scripts
- Font imports
- Custom CSS

---

## 📊 Detailed Comparison

| Feature | GrapeJS Editor | Form Editor (Body) | Form Editor (Full) |
|---------|----------------|--------------------|--------------------|
| **Button Color** | 🔵 Blue | 🟢 Green | 🟣 Purple |
| **Edit Layout** | ✅ Yes | ❌ No | ❌ No |
| **Edit Text** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Edit Images** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Edit Title** | ❌ No | ❌ No | ✅ Yes |
| **Edit Meta Tags** | ❌ No | ❌ No | ✅ Yes |
| **Edit Styles** | ✅ Via panel | ❌ No | ✅ Via form |
| **Edit Scripts** | ❌ No | ❌ No | ✅ Yes |
| **HTML Loaded** | GrapeJS JSON | Body only | Full document |
| **Preview** | Canvas | Iframe + CDN | Iframe (exact) |
| **Complexity** | 🟡 Moderate | 🟢 Simple | 🟡 Moderate |
| **Best For** | Designers | Quick edits | Complete control |

---

## 🔍 What Gets Loaded

### Original File: `/public/banner-standard-right.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Standard Banner - Right Layout</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600&display=swap');
    body {
      font-family: 'IBM Plex Sans', sans-serif;
    }
  </style>
</head>
<body class="bg-gray-100 p-8">
  <!-- Banner Container -->
  <div class="max-w-2xl mx-auto bg-[#a5daff] rounded-lg...">
    <button class="absolute top-3 right-3...">Close</button>
    <div class="flex flex-col sm:flex-row...">
      <img src="..." alt="..." />
      <h2>Enter your description or title here.</h2>
      <p>Enter your secondary text here.</p>
      <button>Open in App</button>
    </div>
  </div>
</body>
</html>
```

---

### Option 1: GrapeJS Editor Loads

**Format:** GrapeJS projectData (JSON)

```json
{
  "pages": [{
    "component": {
      "type": "wrapper",
      "components": [
        { "tagName": "div", "classes": ["max-w-2xl", "mx-auto", ...], ... }
      ]
    }
  }]
}
```

**Converted to:** GrapeJS internal format
**Edit via:** Visual canvas with drag-and-drop

---

### Option 2: Form Editor (Body Only) Loads

**Extracted Section:**
```html
<!-- Only content between <body></body> -->
<div class="max-w-2xl mx-auto bg-[#a5daff] rounded-lg...">
  <button class="absolute top-3 right-3...">Close</button>
  <div class="flex flex-col sm:flex-row...">
    <img src="..." alt="..." />
    <h2>Enter your description or title here.</h2>
    <p>Enter your secondary text here.</p>
    <button>Open in App</button>
  </div>
</div>
```

**Preview Wrapped As:**
```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="...IBM Plex Sans...">
</head>
<body>
  <!-- Your body content here -->
</body>
</html>
```

**Editable Elements Detected:**
- h2: "Enter your description..."
- p: "Enter your secondary..."
- button: "Open in App"
- img src and alt

**Cannot Edit:**
- Page title (not loaded)
- Meta tags (not loaded)
- Original styles (re-wrapped with CDN)

---

### Option 3: Form Editor (Full HTML) Loads

**Complete Document:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Standard Banner - Right Layout</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600&display=swap');
    body {
      font-family: 'IBM Plex Sans', sans-serif;
    }
  </style>
</head>
<body class="bg-gray-100 p-8">
  <!-- Complete body content -->
  <div class="max-w-2xl mx-auto bg-[#a5daff] rounded-lg...">
    ...
  </div>
</body>
</html>
```

**Preview Uses:** Exact same structure (no wrapping)

**Editable Elements Detected:**
- title: "Standard Banner - Right Layout"
- style: CSS rules (as text)
- All body elements (h2, p, button, img)

**Can Edit:**
- ✅ Page title in `<head>`
- ✅ Meta tags (if you add detection)
- ✅ Inline styles
- ✅ All body content
- ✅ Everything!

---

## 🎯 Example Use Cases

### Use Case 1: Change Campaign Text
**Goal:** Update heading and button for new campaign

**Best Option:** 🟢 **Form Editor (Body Only)**
- Why: Fastest for text-only changes
- Time: 30 seconds
- No need for full document

### Use Case 2: Update Page Title for SEO
**Goal:** Change `<title>` tag for better SEO

**Best Option:** 🟣 **Form Editor (Full HTML)**
- Why: Only option that loads `<head>` section
- Time: 1 minute
- Can edit title, meta description, etc.

### Use Case 3: Modify Inline Styles
**Goal:** Change font-family in `<style>` tag

**Best Option:** 🟣 **Form Editor (Full HTML)**
- Why: Only option that loads `<style>` tags
- Time: 2 minutes
- Can edit CSS directly

### Use Case 4: Complete Banner Redesign
**Goal:** Change layout, colors, add new sections

**Best Option:** 🔵 **GrapeJS Visual Editor**
- Why: Need visual drag-and-drop
- Time: 5-10 minutes
- Full design control

### Use Case 5: A/B Test Headlines
**Goal:** Quick headline variations

**Best Option:** 🟢 **Form Editor (Body Only)**
- Why: Fastest text editing
- Time: 15 seconds per variant
- No distractions

---

## 🔧 Technical Details

### Form Editor (Body Only)
```typescript
// Loads
const bodyMatch = fileContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
let bodyContent = bodyMatch[1];
bodyContent = bodyContent.replace(/<!-- Demo Info -->[\s\S]*?<\/div>/, '');
initialHtml = bodyContent.trim();

// Preview wraps with
wrapHtmlWithDocument(html) // Adds Tailwind CDN
```

### Form Editor (Full HTML)
```typescript
// Loads
let fileContent = await fs.readFile(bannerPath, 'utf-8');
fileContent = fileContent.replace(/<!-- Demo Info -->[\s\S]*?<\/div>\s*<\/body>/, '</body>');
initialHtml = fileContent.trim();

// Preview checks
const isFullDocument = html.trim().toLowerCase().startsWith('<!doctype');
const completeHtml = isFullDocument ? html : wrapHtmlWithDocument(html);
```

---

## 🚀 How to Use

### Step 1: Visit
```
http://localhost:3000/figma-editor
```

### Step 2: Choose Your Option

**Quick Text Edit?** → Click 🟢 Green button
```
[Open in Form Editor (Body Only)]
```

**Need Full Document Control?** → Click 🟣 Purple button
```
[Open in Form Editor (Full HTML)]
```

**Need Layout Changes?** → Click 🔵 Blue button
```
[Open in GrapeJS Visual Editor]
```

### Step 3: Edit

**Body Only:**
- Edit text fields
- Update images
- Export body content

**Full HTML:**
- Edit page title
- Edit text fields
- Edit styles
- Update images
- Export complete document

**GrapeJS:**
- Visual editing
- Drag-and-drop
- Style panel
- Export HTML/CSS

---

## 📤 Export Differences

### Form Editor (Body Only)
**Clean Export:**
```html
<div class="max-w-2xl mx-auto bg-[#a5daff]...">
  <!-- Only body content -->
</div>
```

**Annotated Export:**
```html
<div class="max-w-2xl mx-auto..." data-editable-id="1">
  <!-- Body content with IDs -->
</div>
```

### Form Editor (Full HTML)
**Clean Export:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Your Edited Title</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <!-- Complete document -->
</body>
</html>
```

**Annotated Export:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <title data-editable-id="1">Your Edited Title</title>
</head>
<body>
  <!-- Content with IDs -->
</body>
</html>
```

---

## 💡 Pro Tips

### Tip 1: Start with Body Only
Most content updates don't need the full document. Start with the green button for speed.

### Tip 2: Use Full HTML for Complete Control
When you need to edit everything including `<head>` tags, use the purple button.

### Tip 3: Test Exports
Export and test the HTML to ensure it works standalone with all required dependencies.

### Tip 4: Keep GrapeJS for Layout
Only use form editors for content. Use GrapeJS when you need to change structure.

---

## ✨ Summary Table

| Your Need | Click This Button |
|-----------|------------------|
| Edit text only | 🟢 Body Only |
| Edit page title | 🟣 Full HTML |
| Edit meta tags | 🟣 Full HTML |
| Edit inline styles | 🟣 Full HTML |
| Edit scripts | 🟣 Full HTML |
| Change layout | 🔵 GrapeJS |
| Quick updates | 🟢 Body Only |
| Complete control | 🟣 Full HTML |
| Visual design | 🔵 GrapeJS |

---

**Three buttons, three use cases, complete flexibility!** 🎉

Try all three to see which fits your workflow best!
