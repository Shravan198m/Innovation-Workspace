# Innovation Hub Architecture

## 0) Final Positioning (Submission + Demo)
- System: Mentor-Controlled Academic Project Management System with Integrated Budget and Reporting
- Intended outcomes:
  - Institutional project monitoring workflow
  - Mentor-governed approvals across reports, budget, and documents
  - Production-ready API + database + frontend integration

### Viva Statement
Unlike Trello, our system introduces mentor-controlled workflow, structured academic reporting, and an Excel-based budget management system, making it suitable for institutional project monitoring.

### Validated End-to-End Flow
Login -> Dashboard -> Select Project -> Board -> Reports -> Budget -> Documents

## 1) UI Layout (Single Project Workspace)
- Header (fixed): project identity and team overview
  - Team name (project name)
  - Mentor name
  - Department
  - Progress bar
  - Team members list (avatar, name, USN)
- Tab navigation:
  - Board
  - Reports
  - Budget
  - Documents
- Board tab:
  - Kanban columns: TASK, IN PROGRESS, REVIEW, COMPLETED
  - Task cards with modal details
- Reports tab:
  - Daily/Weekly submission
  - Mentor approval/rejection with status history
- Budget tab:
  - Budget request entries and mentor approval/rejection
- Documents tab:
  - DPR/document metadata submissions and mentor review status

## 2) Frontend Structure (React)
- `client/src/App.jsx`: route orchestration and protected routing
- `client/src/context/AuthContext.jsx`: auth state, login, register, logout
- `client/src/context/ProjectsContext.jsx`: project state and server sync
- `client/src/components/`:
  - `Navbar.jsx`
  - `ProjectWorkspaceShell.jsx`
  - `Board.jsx`
  - `ProtectedRoute.jsx`
- `client/src/pages/`:
  - `AuthPage.jsx`
  - `Dashboard.jsx`
  - `ProjectBoard.jsx`
  - `Reports.jsx`
  - `Budget.jsx`
  - `Documents.jsx`
- `client/src/services/api.js`: axios instance with JWT interceptor

## 3) Backend APIs (Express)
- Base URL: `http://localhost:5000/api`

### Auth
- `POST /auth/register`
- `POST /auth/login`

### Projects
- `GET /projects`
- `POST /projects` (mentor/admin)

### Tasks
- `GET /tasks/:projectId`
- `POST /tasks`
- `PUT /tasks/:taskId`
- `PUT /tasks/reorder`
- `DELETE /tasks/:taskId`
- Backend guard: mentor/admin required for completion/approval transitions

### Reports
- `GET /reports/:projectId`
- `POST /reports`
- `PUT /reports/:id` (mentor/admin)

### Budget
- `GET /budgets/:projectId`
- `POST /budgets`
- `PUT /budgets/:id/status` (mentor/admin)

### Documents
- `GET /documents/:projectId`
- `POST /documents`
- `PUT /documents/:id/status` (mentor/admin)

## 4) Database Schema (PostgreSQL)
- `users`
  - id, name, email, password_hash, role, created_at
- `projects`
  - id, name, mentor, department, progress, team_count, team_members (JSONB), due_date, accent, created_at
- `tasks`
  - id, title, status, description, due_date, assignee, comments (JSONB), approval_status, mentor_note, order_index, updated_at, project_id
- `reports`
  - id, project_id, user_name, type, content, status, mentor_comment, created_at
- `budget_entries`
  - id, project_id, item_name, vendor_name, amount, notes, status, approved_by, created_at
- `documents`
  - id, project_id, file_name, category, file_url, uploaded_by, status, reviewed_by, created_at

## 5) Security Model
- JWT-based authentication
- Token attached in `Authorization: Bearer <token>`
- Role guards:
  - Student: submit/update own operational data
  - Mentor/Admin: approve reports, budget, documents, and task completion

## 6) Current Integration State
- Frontend and backend are wired.
- If backend/database is unavailable, some pages fallback with warning messages.
- Apply `server/schema.sql`, configure `server/.env`, then run both apps.
