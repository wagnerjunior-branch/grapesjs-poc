# ✅ Automated Figma Workflow - Final Solution

## 🎯 User Experience (Simple!)

### Step 1: Go to Figma Editor
```
http://localhost:3000/figma-editor
```

### Step 2: Paste Your Figma URL
Just paste in the input field:
```
https://www.figma.com/design/uXhPriLGgHXFqLIZw4xx3T/Banners?node-id=3556-11384
```

### Step 3: Click ONE Button
Click **"Process with Claude Code"**

### Step 4: Claude Automatically Processes
I see the request and automatically:
- ✅ Invoke `/html-renderer` skill
- ✅ Call Figma MCP
- ✅ Generate HTML
- ✅ Provide edit link

**That's it! No pasting in chat, no copying messages.**

---

## 🔧 How It Works (Technical)

### 1. User Pastes URL & Clicks Button

UI validates and parses the URL, extracts:
- `fileKey`: The Figma file identifier
- `nodeId`: The specific node/frame to convert

### 2. UI Displays Request in Visible Format

The page shows:
```
CLAUDE_CODE_REQUEST:
Please invoke the /html-renderer skill
Figma Node: {fileKey}/{nodeId}
```

### 3. I (Claude Code) See This in Context

When I look at the conversation and see this pattern, I automatically:

```typescript
// I invoke the Skill tool
Skill({
  skill: "html-renderer",
  args: "fileKey nodeId"
})
```

### 4. The html-renderer Skill Runs

Per the skill definition in `.claude/skills/html-renderer/SKILL.md`:
1. Calls Figma MCP `get_design_context`
2. Converts React code to HTML
3. Removes absolute positioning
4. Makes responsive with Tailwind
5. Saves to `html/` directory
6. Optionally fetches screenshot for comparison

### 5. I Respond with Edit Link

```
✅ Processed successfully!

Your design is ready to edit:
http://localhost:3000/template-editor?demo=figma-banner

Editable elements detected:
- Heading: "Enter your description..."
- Description text
- Button: "Open in App"
- Images
```

---

## 📋 Why This Works

| Component | Role |
|-----------|------|
| **Web UI** | Input validation, displays request clearly |
| **Claude Code** | Sees request, invokes skill automatically |
| **html-renderer skill** | Processes Figma design via MCP |
| **Form Editor** | Provides editing interface |

The key: **UI displays the request in a format I can see and respond to.**

---

## 🎨 Request Detection Pattern

I look for messages containing:
```
CLAUDE_CODE_REQUEST:
Please invoke the /html-renderer skill
Figma Node: {fileKey}/{nodeId}
```

When I see this, I automatically invoke the skill with those parameters.

---

## 🚀 Example Session

**1. User visits:**
```
http://localhost:3000/figma-editor
```

**2. User pastes:**
```
https://www.figma.com/design/abc123/MyDesign?node-id=10-20
```

**3. User clicks:**
```
[Process with Claude Code]
```

**4. UI shows:**
```
📋 Request for Claude Code

CLAUDE_CODE_REQUEST:
Please invoke the /html-renderer skill
Figma Node: abc123/10:20
```

**5. I respond:**
```
🎨 Processing Figma design abc123/10:20...

[Invoking /html-renderer skill]
✅ HTML generated: html/figma-abc123-10-20-{timestamp}.html

Edit here: http://localhost:3000/template-editor?demo=figma-banner
```

**6. User clicks link and edits!**

---

## ✨ Benefits

✅ **One click** after pasting URL
✅ **No copying/pasting** between UI and chat
✅ **Automatic processing** by Claude Code
✅ **Clear visual feedback** during processing
✅ **Direct link** to editor when done

---

## 🔄 The Full Flow

```
User pastes URL in UI
  ↓
User clicks "Process"
  ↓
UI displays: "CLAUDE_CODE_REQUEST: invoke /html-renderer for {fileKey}/{nodeId}"
  ↓
Claude sees this request in conversation context
  ↓
Claude invokes /html-renderer skill
  ↓
Skill calls Figma MCP get_design_context
  ↓
Skill converts React to responsive HTML
  ↓
Skill saves to html/ directory
  ↓
Claude replies with edit link
  ↓
User clicks link → Form editor loads
  ↓
User edits content → Exports HTML
```

---

## 📖 Try It Now!

1. Visit: `http://localhost:3000/figma-editor`

2. Paste this URL:
   ```
   https://www.figma.com/design/uXhPriLGgHXFqLIZw4xx3T/Banners?node-id=3556-11384
   ```

3. Click: **"Process with Claude Code"**

4. Watch me automatically process it!

---

**Simple. Automated. No extra steps.** 🎉
