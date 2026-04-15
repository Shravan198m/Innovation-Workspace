# 🎨 VISUAL DESIGN GUIDE - Academic Project Operating System

## 📐 COLOR SCHEME & TYPOGRAPHY

### **Color Palette**
```
Primary      → Blue (#3B82F6)    - Used for buttons, active states
Success      → Green (#10B981)   - Progress bars, approved items
Warning      → Yellow (#FBBF24)  - Pending items
Error        → Red (#EF4444)     - Rejected items
Neutral      → Slate (#94A3B8)   - Text, borders
Background   → White (#FFFFFF)   - Card backgrounds
```

### **Typography**
```
Heading 1    → 28px Bold         - Project name
Heading 2    → 24px Bold         - Tab titles
Heading 3    → 18px Semibold     - Card titles
Body         → 14px Regular      - Main text
Small        → 12px Regular      - Metadata
Tiny         → 10px Regular      - Timestamps
```

---

## 🖼️ COMPONENT LAYOUTS

### **1. PROJECT HEADER (Full Width)**

```
┌─────────────────────────────────────────────────────────┐
│ 🎓 INNOVATION HUB AI          completion: █████░░ 75%  │
│ 🧑‍🏫 Mentor: Dr. Rajesh Kumar                            │
│ 🏫 Department: Computer Science                         │
├─────────────────────────────────────────────────────────┤
│ 👥 TEAM MEMBERS                                         │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│ │  👤  Priya   │ │  👤  Vinay   │ │  👤  Ananya  │    │
│ │  Rao         │ │  Kumar       │ │  Sharma      │    │
│ │  CS001       │ │  CS002       │ │  CS003       │    │
│ └──────────────┘ └──────────────┘ └──────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Design Notes:**
- Gradient background (project accent color)
- White text for contrast
- Avatar circles (40px) with initials
- Team info displayed horizontally
- Progress bar shows visual completion

---

### **2. TAB NAVIGATION**

```
┌─────────────────────────────────────────────┐
│ [ Board ] [ Reports ] [ Budget ] [ Docs ]   │
│           ↑ Active tab (blue underline)     │
└─────────────────────────────────────────────┘
```

**Design Notes:**
- Bottom border indicates active tab
- Hover effect: text color changes to darker slate
- Smooth transition (150ms)
- Padding: 12px horizontal, 12px vertical

---

### **3. CARD LAYOUTS**

#### **Report Card**
```
┌─────────────────────────────────────────┐
│ 📊 Weekly Report          [⏳ PENDING]   │
│ ─────────────────────────────────────── │
│ 📅 2026-04-14 • 👤 Priya Rao            │
│ ─────────────────────────────────────── │
│ Completed UI design for dashboard...    │
│ (truncated to 2 lines)                  │
│ ─────────────────────────────────────── │
│ 💬 Mentor: "Good progress!"             │
│ ─────────────────────────────────────── │
│ [✅ Approve] [❌ Reject]  (Mentor view) │
└─────────────────────────────────────────┘
```

**Card Specs:**
- Width: 100% (responsive)
- Padding: 24px
- Border: 1px solid slate-200
- Hover: box-shadow increased
- Transition: 200ms smooth

#### **Budget Card**
```
┌──────────────────────────────────────────┐
│ 💻 Hardware              ₹25,000          │
│ [✅ APPROVED]                            │
│ Laptops for team • Added by Prof. Kumar  │
│ 📅 2026-04-10                            │
│ ─────────────────────────────────────── │
│ [✅ Approve] [❌ Reject] [🗑️ Delete]    │
└──────────────────────────────────────────┘
```

**Budget Card Specs:**
- Horizontal layout (left to right)
- Amount right-aligned and bold
- Status badge with icon
- Action buttons on right side

#### **Document Card**
```
┌──────────────────────────────────────────┐
│ 📋 project_design_v2.pdf      2.3 MB    │
│ Status: [✅ APPROVED]                    │
│ Uploaded by: Priya Rao • 2026-04-10     │
│ ─────────────────────────────────────── │
│ [📥 Download] [✅ Approve] [🗑️ Delete]  │
└──────────────────────────────────────────┘
```

---

### **4. FORM LAYOUTS**

#### **Report Submission Form**
```
┌──────────────────────────────────────────┐
│ Submit New Report                        │
├──────────────────────────────────────────┤
│ Report Type *                            │
│ ┌────────────────────────────────────┐  │
│ │ ▼ Daily Report                     │  │
│ └────────────────────────────────────┘  │
│                                          │
│ Report Content *                         │
│ ┌────────────────────────────────────┐  │
│ │                                    │  │
│ │ Write your report here...          │  │
│ │                                    │  │
│ └────────────────────────────────────┘  │
│ (80px height)                            │
│                                          │
│ [Submit Report] [Cancel]                │
└──────────────────────────────────────────┘
```

**Form Specs:**
- Input height: 40px
- Textarea height: 100px
- Label font: 12px semibold
- Required fields marked with *
- Button spacing: 8px gap

---

### **5. STATUS BADGES**

```
Pending:  ⏳ PENDING  (yellow background, yellow text)
Approved: ✅ APPROVED (green background, green text)
Rejected: ❌ REJECTED (red background, red text)
```

**Badge Specs:**
- Padding: 8px 12px
- Border-radius: 20px (pill shape)
- Font: 12px semibold
- Icon + text inline

---

### **6. BUDGET SUMMARY SECTION**

```
┌─────────────────────────────────────────┐
│ 💰 PROJECT BUDGET                       │
├─────────────────────────────────────────┤
│ ₹50,000      ₹32,500      ₹17,500       │
│ Total          Spent      Remaining      │
│                                          │
│ 65% █████████░░░░░░░░░░░░░░░ Progress  │
└─────────────────────────────────────────┘
```

**Summary Box Specs:**
- Background: Blue gradient
- Text: White
- Grid: 3 columns (equal width)
- Numbers: Large & bold
- Progress bar: 12px height, max-width 100%

---

## 🎯 RESPONSIVE BREAKPOINTS

```
Mobile (< 640px)
- Stack cards vertically
- Full-width inputs
- Single-column layout

Tablet (640px - 1024px)
- 2-column card layout
- Smaller padding (16px)
- Adjusted font sizes

Desktop (> 1024px)
- Full grid layout
- 24px padding
- Side-by-side components
```

---

## 🖱️ INTERACTIVE ELEMENTS

### **Buttons**

**Primary Button (Blue)**
```
┌────────────────┐
│ + Add Budget   │ ← 40px height
└────────────────┘
Background: #3B82F6
Hover: #2563EB (darker)
Active: #1D4ED8 (even darker)
```

**Success Button (Green)**
```
┌────────────────┐
│ ✅ Approve     │
└────────────────┘
Background: #10B981
Hover: #059669
```

**Danger Button (Red)**
```
┌────────────────┐
│ ❌ Reject      │
└────────────────┘
Background: #EF4444
Hover: #DC2626
```

### **Inputs**

**Text Input**
```
┌──────────────────────────┐
│ Enter text here...       │ ← 36px height
└──────────────────────────┘
Border: 1px solid #E2E8F0
Focus: 2px solid #3B82F6 (blue ring)
```

### **Dropdowns**

```
┌──────────────────────────┐
│ Select Category ▼        │
└──────────────────────────┘
Same styling as text input
```

---

## 🎬 ANIMATIONS & TRANSITIONS

```
Hover Effects:
- Box shadow: 200ms ease-out
- Color change: 150ms ease

Loading State:
- Skeleton cards with pulse animation
- Pulse: 2s infinite

Transitions:
- Progress bar fill: 500ms ease
- Tab switch: 200ms ease
- Modal appear: 300ms ease-out
```

---

## 🌙 SPACING SYSTEM

```
8px   → spacing-1  (Button padding)
12px  → spacing-3  (Card internal)
16px  → spacing-4  (Container padding)
24px  → spacing-6  (Section spacing)
32px  → spacing-8  (Major sections)
```

---

## 📊 DATA VISUALIZATION

### **Progress Bar**
```
Current: 75%
████████░░░░░░░░░░░░  (10 segments, 8 filled)
Height: 12px
Border-radius: 6px (full radius on ends)
Gradient: Blue to teal (optional)
```

### **Status Timeline** (Future feature)
```
TASK → IN PROGRESS → REVIEW → COMPLETED
  ✓        ✓          ⏳       ░
```

---

## 🎨 DARK MODE (Future)

```
Background: #0F172A (very dark blue)
Cards: #1E293B (dark slate)
Text: #E2E8F0 (light gray)
Borders: #334155 (dark gray)
```

---

## ♿ ACCESSIBILITY

- ✅ Color contrast ratio ≥ 4.5:1
- ✅ Font sizes ≥ 14px for body text
- ✅ Touch targets ≥ 44px
- ✅ ARIA labels on buttons
- ✅ Keyboard navigation support
- ✅ Focus visible indicators

---

## 🚀 FINAL DESIGN PRINCIPLES

1. **Clarity** - Clean white space, clear hierarchy
2. **Consistency** - Same colors, spacing, styling
3. **Contrast** - Text readable, status clear
4. **Feedback** - User knows what happened
5. **Accessibility** - Works for everyone

This system is ready for production deployment! 🎉

