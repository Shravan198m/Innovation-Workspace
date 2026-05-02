# 🎓 Academic Project Operating System - Complete System Design

---

## 📋 TABLE OF CONTENTS
1. **Architecture Overview**
2. **UI/UX Design (Pixel-Level)**
3. **Frontend Component Structure**
4. **Backend API Documentation**
5. **Database Schema**
6. **Role-Based Access Control**

---

# 🏗️ PART 1: ARCHITECTURE OVERVIEW

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   FRONTEND (React)                      │
├─────────────────────────────────────────────────────────┤
│  ProjectWorkspaceShell (Layout)                         │
│  ├─ Header (Project Info + Team + Progress)            │
│  ├─ Tab Navigation                                      │
│  └─ Tab Content (Dynamic)                              │
│      ├─ Board → Kanban (4 columns)                      │
│      ├─ Reports → Daily/Weekly Reports                 │
│      ├─ Budget → Budget Tracking                        │
│      └─ Documents → File Upload & DPR                   │
└─────────────────────────────────────────────────────────┘
         ↓ (API Calls)
┌─────────────────────────────────────────────────────────┐
│              BACKEND (Node.js + Express)                │
├─────────────────────────────────────────────────────────┤
│  API Routes:                                            │
│  ├─ /api/auth/*          (Authentication)              │
│  ├─ /api/projects/*      (Project Management)          │
│  ├─ /api/tasks/*         (Task Management)             │
│  ├─ /api/reports/*       (Reports)                     │
│  ├─ /api/budgets/*       (Budget Tracking)             │
│  ├─ /api/documents/*     (File Management)             │
│  └─ /api/team-members/*  (Team Management)             │
└─────────────────────────────────────────────────────────┘
         ↓ (Database Queries)
┌─────────────────────────────────────────────────────────┐
│           DATABASE (PostgreSQL)                         │
├─────────────────────────────────────────────────────────┤
│  Tables:                                                │
│  ├─ users (Authentication & Roles)                     │
│  ├─ projects (Project Info)                            │
│  ├─ team_members (Project Team)                        │
│  ├─ tasks (Kanban Cards)                               │
│  ├─ reports (Daily/Weekly Reports)                     │
│  ├─ budgets (Budget Entries)                           │
│  ├─ documents (File Uploads)                           │
│  └─ tasks_attachments (Task Files)                     │
└─────────────────────────────────────────────────────────┘
```

---

# 🎨 PART 2: UI/UX DESIGN (PIXEL-LEVEL)

## SECTION A: HEADER LAYOUT (FIXED TOP)

```
┌────────────────────────────────────────────────────────────┐
│ ← Back to Projects     🎓 Mentor Controlled Workspace     │
│ PROJECT: Innovation Hub AI                    Completion: 75%
│ Mentor: Dr. Rajesh Kumar | Department: Computer Science   │
│ ─────────────────────────────────────────────────────────── │
│ TEAM MEMBERS:                                              │
│ [👤 Priya Rao]  [👤 Vinay Kumar]  [👤 Ananya Sharma]      │
│  USN: CS001      USN: CS002        USN: CS003              │
│ ─────────────────────────────────────────────────────────── │
│ [ Board ] [ Reports ] [ Budget ] [ Documents ]             │
└────────────────────────────────────────────────────────────┘
```

**Header Specs:**
- **Color:** Gradient background (project accent color)
- **Text Color:** White
- **Height:** ~200px with team section
- **Content:**
  - Project name (h1, 28px)
  - Mentor name (14px)
  - Department (14px)
  - Progress bar (visual indicator)
  - Team member avatars (circular, 40px)
  - Members show: Photo, Name, USN

---

## SECTION B: TAB 1 - BOARD (KANBAN)

```
┌──────────────────────────────────────────────────────────────┐
│  COLUMN 1          │ COLUMN 2         │  COLUMN 3   │ COL 4 │
│  TASK (5)          │ IN PROGRESS (3)  │  REVIEW (2) │ DONE 1│
├────────────────────┼──────────────────┼─────────────┼────── │
│                    │                  │             │       │
│ ┌─────────────┐   │ ┌──────────────┐ │ ┌────────────┤       │
│ │ 🟢 Design UI│   │ │ 🟠 Setup DB  │ │ │Review Docs│       │
│ │ Due: 25 Apr │   │ │ Due: 28 Apr  │ │ │Due: 20 Apr       │
│ │ Priya Rao   │   │ │ Vinay Kumar  │ │ │ Ananya   │ │ ┌──┤
│ │ [Comment]   │   │ │ [Comment]    │ │ │ [Cmnt]  │ │ │Done│
│ └─────────────┘   │ └──────────────┘ │ └────────────┤ │    │
│                    │                  │             │ └──┘
│ ┌─────────────┐   │ ┌──────────────┐ │             │       │
│ │ 🟢 API Dev  │   │ │ Testing      │ │             │       │
│ │ Due: 20 May │   │ │ Due: 30 Apr  │ │             │       │
│ │ Vinay Kumar │   │ │ Priya Rao    │ │             │       │
│ └─────────────┘   │ └──────────────┘ │             │       │
│                    │                  │             │       │
│ [+ Add Task]       │ [+ Add Task]     │[+ Add Task] │       │
└────────────────────┴──────────────────┴─────────────┴────── ┘
```

**Kanban Board Specs:**
- **Columns:** TASK, IN PROGRESS, REVIEW, COMPLETED
- **Cards per column:** Sorted by due date
- **Card Size:** 280px width, auto height
- **Spacing:** 16px between columns, 12px between cards

### Card Structure (Detailed View):

```
┌─ CARD (280px × 140px) ────────────────────┐
│ 🔴 Design UI                               │
│ ─────────────────────────────────────────  │
│ Create polished interface for project      │
│ 📅 2026-04-25  👤 Priya Rao               │
│ 🏷️  Enhancement  ⭐⭐⭐⭐⭐                 │
│ ─────────────────────────────────────────  │
│ 💬 2 comments  📎 1 attachment             │
│ ✓ Approved    ⏱️ 3 days left              │
└───────────────────────────────────────────┘
```

**Card Fields:**
- Title (bold, 14px)
- Description (12px, limited to 2 lines)
- Due date (📅 icon)
- Assigned member (👤 with name)
- Priority badge (color-coded)
- Comments count
- Attachments count
- Approval status
- Time remaining

---

## SECTION C: TAB 2 - REPORTS

```
┌──────────────────────────────────────────────────────┐
│  📊 DAILY REPORTS          📋 WEEKLY REPORTS         │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌────────────────────────────────────────────────┐ │
│  │ Date: 2026-04-14                               │ │
│  │ Submitted by: Priya Rao                        │ │
│  │ Status: ✅ APPROVED                            │ │
│  │ ─────────────────────────────────────────────  │ │
│  │ Tasks Completed: 3                             │ │
│  │ Challenges: API rate limiting, fixed          │ │
│  │ Next Steps: Database optimization             │ │
│  │ Time Spent: 8 hours                            │ │
│  │ ─────────────────────────────────────────────  │ │
│  │ Mentor Comment: "Good progress!"               │ │
│  │ [Edit] [Delete]                               │ │
│  └────────────────────────────────────────────────┘ │
│                                                       │
│  ┌────────────────────────────────────────────────┐ │
│  │ Date: 2026-04-13                               │ │
│  │ Submitted by: Vinay Kumar                      │ │
│  │ Status: ⏳ PENDING                              │ │
│  │ ...                                             │ │
│  └────────────────────────────────────────────────┘ │
│                                                       │
│  [📝 Submit New Report] [📥 Download All]           │
└──────────────────────────────────────────────────────┘
```

**Report Fields:**
- Date submitted
- Author name
- Status badge (PENDING, APPROVED, REJECTED)
- Report content (expandable)
- Mentor feedback (editable by mentor)
- Edit/Delete buttons (only for author + mentor)

---

## SECTION D: TAB 3 - BUDGET

```
┌──────────────────────────────────────────────────────┐
│  💰 PROJECT BUDGET TRACKING                          │
│  Total Budget: ₹50,000  |  Spent: ₹32,500  |  Left: ₹17,500
│  Progress: ████████░░░░░░░░░░░░ 65%                 │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌────────────────────────────────────────────────┐ │
│  │ 💻 Hardware (Laptops)      ₹25,000  ✅ Approved │ │
│  │ 🚀 Software Licenses        ₹5,000  ✅ Approved │ │
│  │ 📚 Books & Resources        ₹2,500  ⏳ Pending  │ │
│  │ ☕ Misc Events              ₹5,000  ❌ Rejected │ │
│  └────────────────────────────────────────────────┘ │
│                                                       │
│  [➕ Add New Budget Item]                            │
│  [📊 Download Budget Report]                        │
└──────────────────────────────────────────────────────┘
```

**Budget Fields:**
- Category
- Amount
- Status (PENDING, APPROVED, REJECTED)
- Approval date
- Notes

---

## SECTION E: TAB 4 - DOCUMENTS

```
┌──────────────────────────────────────────────────────┐
│  📁 PROJECT DOCUMENTS & FILES                        │
├──────────────────────────────────────────────────────┤
│                                                       │
│  📄 DPR (Design Project Report)                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ [📎 project_design_v2.pdf]    2026-04-10      │ │
│  │ Status: ✅ Approved          Size: 2.3 MB     │ │
│  │ Uploaded by: Priya Rao       Downloaded: 5 ✓  │ │
│  │ [View] [Download] [Delete]                    │ │
│  └────────────────────────────────────────────────┘ │
│                                                       │
│  📄 Project Resources                                │
│  ┌────────────────────────────────────────────────┐ │
│  │ [📎 research_paper.pdf]       2026-04-08      │ │
│  │ [📎 system_requirements.docx] 2026-03-20      │ │
│  │ [📎 meeting_notes_april.txt]  2026-04-14      │ │
│  └────────────────────────────────────────────────┘ │
│                                                       │
│  [➕ Upload New Document]                            │
└──────────────────────────────────────────────────────┘
```

---

# 🧩 PART 3: FRONTEND COMPONENT STRUCTURE

## Component Hierarchy

```
App
└── ProjectBoard
    └── ProjectWorkspaceShell (Layout)
        ├── ProjectHeader
        │   ├── ProjectInfo
        │   ├── ProgressBar
        │   └── TeamMembers
        ├── TabNavigation
        └── TabContent (Dynamic)
            ├── BoardTab
            │   ├── KanbanColumn (×4)
            │   │   └── TaskCard (Multiple)
            │   │       ├── CardPreview
            │   │       ├── TaskModal (onClick)
            │   │       │   ├── TaskDetails
            │   │       │   ├── CommentsSection
            │   │       │   └── AttachmentsSection
            │   │       └── CardActions
            │   └── AddTaskInput
            ├── ReportsTab
            │   ├── ReportFilterTabs
            │   ├── ReportList
            │   │   └── ReportCard
            │   └── SubmitReportForm
            ├── BudgetTab
            │   ├── BudgetSummary
            │   │   └── ProgressVisualization
            │   ├── BudgetTable
            │   │   └── BudgetRow
            │   └── AddBudgetForm
            └── DocumentsTab
                ├── DPRSection
                │   └── DocumentList
                └── ResourcesSection
                    └── DocumentList
```

---

# 🔌 PART 4: BACKEND API DOCUMENTATION

## Base URL
```
http://localhost:5000/api
```

### 1. PROJECT ENDPOINTS

#### GET /projects/:projectId
Get project details with team members
```json
Response {
  "id": 1,
  "name": "Innovation Hub AI",
  "mentor": "Dr. Rajesh Kumar",
  "department": "Computer Science",
  "progress": 75,
  "accent": "from-blue-500 to-blue-600",
  "team_members": [
    {
      "id": 1,
      "name": "Priya Rao",
      "usn": "CS001",
      "photo": "url",
      "role": "MENTOR"
    }
  ]
}
```

#### GET /projects/:projectId/summary
Get complete project summary (for header display)
```json
Response {
  "project": {...},
  "stats": {
    "total_tasks": 15,
    "completed_tasks": 8,
    "pending_tasks": 7,
    "team_count": 3
  }
}
```

---

### 2. TASK ENDPOINTS

#### GET /tasks/:projectId
Get all tasks for a project
```json
Response [
  {
    "id": 1,
    "project_id": 1,
    "title": "Design UI",
    "description": "Create polished interface",
    "status": "TASK",
    "due_date": "2026-04-25",
    "assignee": "Priya Rao",
    "priority": "HIGH",
    "approval_status": "APPROVED",
    "mentor_note": "Good work",
    "comments": 2,
    "attachments": 1,
    "created_at": "2026-04-10",
    "updated_at": "2026-04-14"
  }
]
```

#### POST /tasks/:projectId
Create new task
```json
Request {
  "title": "Design UI",
  "description": "Create interface",
  "due_date": "2026-04-25",
  "assignee": "Priya Rao",
  "priority": "HIGH"
}
Response { "id": 1, "status": "TASK", ... }
```

#### PUT /tasks/:taskId
Update task
```json
Request {
  "status": "IN PROGRESS",
  "description": "Updated...",
  "mentor_note": "Looks good"
}
Response { "id": 1, ... }
```

#### POST /tasks/:taskId/comments
Add comment to task
```json
Request {
  "author": "Priya Rao",
  "text": "This needs review",
  "role": "STUDENT"
}
Response { "id": "c1", "author": "...", "text": "...", "created_at": "..." }
```

#### POST /tasks/:taskId/attachments
Add attachment to task
```json
Request { file: multipart/form-data }
Response { "id": 1, "filename": "...", "size": 2048 }
```

---

### 3. REPORT ENDPOINTS

#### GET /reports/:projectId
Get all reports for project
```json
Response [
  {
    "id": 1,
    "project_id": 1,
    "user_name": "Priya Rao",
    "type": "DAILY",
    "content": "Completed UI design...",
    "status": "APPROVED",
    "mentor_comment": "Good work",
    "created_at": "2026-04-14"
  }
]
```

#### POST /reports/:projectId
Submit new report
```json
Request {
  "type": "DAILY",
  "content": "Completed tasks...",
  "user_name": "Priya Rao"
}
Response { "id": 1, "status": "PENDING", ... }
```

#### PUT /reports/:reportId
Mentor approves/rejects report
```json
Request {
  "status": "APPROVED",
  "mentor_comment": "Excellent work"
}
Response { "id": 1, ... }
```

---

### 4. BUDGET ENDPOINTS

#### GET /budgets/:projectId
Get budget entries
```json
Response [
  {
    "id": 1,
    "project_id": 1,
    "category": "Hardware",
    "amount": 25000,
    "status": "APPROVED",
    "notes": "Laptops for team",
    "created_at": "2026-04-10"
  }
]
```

#### POST /budgets/:projectId
Add budget item
```json
Request {
  "category": "Hardware",
  "amount": 25000,
  "notes": "Laptops"
}
Response { "id": 1, "status": "PENDING", ... }
```

#### PUT /budgets/:budgetId
Mentor approves/rejects budget
```json
Request {
  "status": "APPROVED"
}
Response { "id": 1, ... }
```

---

### 5. DOCUMENT ENDPOINTS

#### GET /documents/:projectId
Get uploaded documents
```json
Response [
  {
    "id": 1,
    "project_id": 1,
    "filename": "dpr.pdf",
    "type": "DPR",
    "size": 2048,
    "uploaded_by": "Priya Rao",
    "status": "APPROVED",
    "created_at": "2026-04-14"
  }
]
```

#### POST /documents/:projectId/upload
Upload document
```json
Request { file: multipart/form-data, type: "DPR" }
Response { "id": 1, "filename": "...", ... }
```

---

### 6. TEAM MEMBER ENDPOINTS

#### GET /projects/:projectId/team
Get team members
```json
Response [
  {
    "id": 1,
    "project_id": 1,
    "name": "Priya Rao",
    "usn": "CS001",
    "email": "priya@example.com",
    "photo": "url",
    "role": "MENTOR"
  }
]
```

#### POST /projects/:projectId/team
Add team member
```json
Request {
  "name": "New Member",
  "usn": "CS004",
  "email": "member@example.com",
  "role": "STUDENT"
}
Response { "id": 2, ... }
```

---

# 🗄️ PART 5: DATABASE SCHEMA

```sql
-- Users table (existing)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'STUDENT',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table (enhanced)
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  mentor TEXT NOT NULL,
  department TEXT NOT NULL,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  accent TEXT,
  description TEXT,
  start_date DATE,
  due_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Team members table (NEW)
CREATE TABLE team_members (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  usn TEXT NOT NULL,
  email TEXT,
  photo TEXT,
  role TEXT NOT NULL DEFAULT 'STUDENT', -- MENTOR, STUDENT
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, usn)
);

-- Tasks table (enhanced)
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'TASK', -- TASK, IN PROGRESS, REVIEW, COMPLETED
  due_date DATE,
  assignee TEXT DEFAULT '',
  priority TEXT DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
  approval_status TEXT DEFAULT 'not-requested', -- not-requested, pending, approved, rejected
  mentor_note TEXT DEFAULT '',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task comments table (NEW)
CREATE TABLE task_comments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  author_role TEXT NOT NULL, -- MENTOR, STUDENT
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task attachments table (NEW)
CREATE TABLE task_attachments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  size INTEGER,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reports table (enhanced)
CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  type TEXT NOT NULL, -- DAILY, WEEKLY
  content TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  mentor_comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP
);

-- Budgets table (NEW)
CREATE TABLE budgets (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  created_by TEXT NOT NULL,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents table (NEW)
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  type TEXT NOT NULL, -- DPR, RESOURCE, OTHER
  size INTEGER,
  uploaded_by TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_team_members_project ON team_members(project_id);
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX idx_task_comments_task ON task_comments(task_id);
CREATE INDEX idx_task_attachments_task ON task_attachments(task_id);
CREATE INDEX idx_reports_project_type ON reports(project_id, type);
CREATE INDEX idx_budgets_project ON budgets(project_id);
CREATE INDEX idx_documents_project ON documents(project_id);
```

---

# 🔐 PART 6: ROLE-BASED ACCESS CONTROL

## MENTOR Permissions
- ✅ View all project data
- ✅ Create, edit, delete tasks
- ✅ Assign tasks to students
- ✅ Approve/reject reports
- ✅ Approve/reject budgets
- ✅ Approve/reject documents
- ✅ Add comments to tasks
- ✅ Manage team members
- ✅ View project analytics

## STUDENT Permissions
- ✅ View assigned tasks
- ✅ Update own tasks
- ✅ Submit reports
- ✅ Upload documents
- ✅ Add comments to tasks
- ✅ View team info
- ❌ Cannot delete tasks
- ❌ Cannot approve/reject anything
- ❌ Cannot manage team
- ❌ Cannot modify budgets

---

## Implementation Strategy

### Frontend (React)

```javascript
// src/hooks/useAccessControl.js
export const useAccessControl = (userRole) => {
  return {
    canEdit: (resource) => userRole === 'MENTOR' || resource.authorId === userId,
    canDelete: () => userRole === 'MENTOR',
    canApprove: () => userRole === 'MENTOR',
    canAssign: () => userRole === 'MENTOR',
    canManageTeam: () => userRole === 'MENTOR',
  };
};

// Usage in components
const { currentUserRole } = props;
const access = useAccessControl(currentUserRole);

if (!access.canEdit()) {
  // Show read-only view
}
```

### Backend (Node.js)

```javascript
// server/middleware/accessControl.js
const requireMentor = (req, res, next) => {
  if (req.user.role !== 'MENTOR') {
    return res.status(403).json({ error: 'Mentor access required' });
  }
  next();
};

// Usage in routes
router.put('/tasks/:id', requireMentor, updateTask);
router.post('/reports/:id/approve', requireMentor, approveReport);
```

---

# 🚀 NEXT STEPS

1. Update database schema
2. Create backend API routes
3. Create React components
4. Implement styling
5. Test role-based access
6. Deploy to production

