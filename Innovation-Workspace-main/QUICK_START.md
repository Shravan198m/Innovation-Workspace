# 🚀 QUICK START GUIDE - Academic Project Operating System

## ⚡ 5-MINUTE SETUP

### **STEP 1: Update Database Schema**

```bash
# Connect to your PostgreSQL database
psql -U postgres -d innovation_hub -f server/schema.sql
```

If tables already exist, they will be skipped and new ones created.

---

### **STEP 2: Update App Routes (client/src/App.jsx)**

Add these imports at the top:
```javascript
import ReportsTab from "./pages/ReportsTab";
import BudgetTab from "./pages/BudgetTab";
import DocumentsTab from "./pages/DocumentsTab";
```

Add these routes to your router (around line where you define ProjectBoard):
```javascript
<Route path="/projects/:projectId/reports" element={<ReportsTab currentUserRole={currentUserRole} projectId={projectId} />} />
<Route path="/projects/:projectId/budget" element={<BudgetTab currentUserRole={currentUserRole} projectId={projectId} />} />
<Route path="/projects/:projectId/documents" element={<DocumentsTab currentUserRole={currentUserRole} projectId={projectId} />} />
```

---

### **STEP 3: Update ProjectWorkspaceShell (client/src/components/ProjectWorkspaceShell.jsx)**

Replace the header section with:
```javascript
import ProjectHeader from "./ProjectHeader";

export default function ProjectWorkspaceShell({ children, project, currentUserRole }) {
  return (
    <section className="h-full overflow-y-auto">
      <ProjectHeader projectId={project.id} />
      
      {/* Tab Navigation - Keep existing */}
      <div className="border-b border-slate-200 bg-white px-6">
        <nav className="flex gap-4">
          {/* ... existing tab code ... */}
        </nav>
      </div>

      <div className="p-4">{children}</div>
    </section>
  );
}
```

---

### **STEP 4: Start the Application**

```bash
# Terminal 1: Start backend
cd server
npm start

# Terminal 2: Start frontend
cd client
npm start
```

---

### **STEP 5: Configure Project Assignment Emails (Resend)**

Server email flow is already wired in [server/routes/projectRoutes.js](server/routes/projectRoutes.js) and [server/lib/email.js](server/lib/email.js).

Create or update [server/.env](server/.env) with:

```env
RESEND_API_KEY=your_resend_api_key_here
RESEND_FROM="Shiktra Technologies <noreply@shiktratechnologies.com>"
```

Temporary sender for quick testing:

```env
RESEND_FROM="Shiktra Technologies <onboarding@resend.dev>"
```

Run a direct email test:

```bash
cd server
npm run test:project-assignment-email -- --to=you@example.com --name="Test User" --projectName="Demo" --role="Student"
```

If email send fails with `403`/domain verification errors:

1. Open https://resend.com/domains
2. Verify your domain (for example `shiktratechnologies.com`)
3. Add SPF and DKIM DNS records at your DNS provider
4. Retry the test script

When creating a project through API, the response now includes an `emailSummary` block so you can verify recipient-level delivery outcome immediately.

Example response shape:

```json
{
  "id": 123,
  "name": "Demo Project",
  "emailSummary": {
    "total": 3,
    "sent": 2,
    "failed": 1,
    "results": [
      { "recipient": "mentor@example.com", "status": "sent", "messageId": "..." },
      { "recipient": "student@example.com", "status": "failed", "reason": "Resend API error (...)" }
    ]
  }
}
```

Use this to confirm whether failures are from email delivery or from project creation logic.

---

## 🧪 TESTING THE SYSTEM

### **Test 1: View Team Members**
1. Navigate to any project
2. Look at the header - should show team members with avatars

### **Test 2: Submit a Report**
1. Click "Reports" tab
2. Click "📝 Submit New Report"
3. Fill form and submit
4. Report should appear as "PENDING"

### **Test 3: Add Budget Item**
1. Click "Budget" tab
2. Click "➕ Add Budget Item"
3. Select category and enter amount
4. Item appears as "PENDING"

### **Test 4: Upload Document**
1. Click "Documents" tab
2. Click "📤 Upload Document"
3. Enter filename and type
4. Document appears as "PENDING"

### **Test 5: Mentor Approval (if logged in as MENTOR)**
1. Approve a pending report
2. Budget item should change to "APPROVED"
3. Add mentor comment

---

## 🎯 NEXT INTEGRATIONS (Optional)

### **File Upload (Real Files)**
Currently using simulated file paths. To enable real uploads:

```javascript
// In DocumentsTab.jsx - Add FileInput
const handleFileSelect = (e) => {
  const file = e.target.files[0];
  // Upload to cloud storage (AWS S3, Azure Blob, etc.)
  // Get file path and then call API
};
```

### **Cloud Storage Integration**
```javascript
// Use axios to upload to:
// - AWS S3
// - Azure Blob Storage  
// - Google Cloud Storage
```

---

## 🗂️ PROJECT STRUCTURE

```
inn/
├── SYSTEM_DESIGN.md (Complete spec)
├── IMPLEMENTATION_SUMMARY.md (What was done)
├── QUICK_START.md (This file)
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ProjectHeader.jsx (NEW)
│   │   │   ├── ProjectWorkspaceShell.jsx (UPDATED)
│   │   │   └── ... (other components)
│   │   ├── pages/
│   │   │   ├── ReportsTab.jsx (NEW)
│   │   │   ├── BudgetTab.jsx (NEW)
│   │   │   ├── DocumentsTab.jsx (NEW)
│   │   │   └── ... (other pages)
│   │   └── App.jsx (NEEDS UPDATE)
│   └── package.json
│
└── server/
    ├── index.js (UPDATED - new routes registered)
    ├── schema.sql (UPDATED - new tables)
    ├── routes/
    │   ├── budgetRoutes.js (NEW)
    │   ├── documentRoutes.js (NEW)
    │   ├── teamMemberRoutes.js (NEW)
    │   ├── taskRoutes.js (existing)
    │   ├── reportRoutes.js (existing)
    │   ├── projectRoutes.js (existing)
    │   └── authRoutes.js (existing)
    └── package.json
```

---

## 🐛 TROUBLESHOOTING

### **Error: "Cannot GET /api/budgets"**
✅ Solution: Make sure `server/index.js` has route registration:
```javascript
const budgetRoutes = require("./routes/budgetRoutes");
app.use("/api/budgets", budgetRoutes);
```

### **Error: "Table does not exist"**
✅ Solution: Run schema.sql:
```bash
psql -U postgres -d innovation_hub -f server/schema.sql
```

### **Error: "Cannot read property 'map' of undefined"**
✅ Solution: Check API response in browser DevTools → Network tab
Make sure API returns array, not object

### **Pages not showing**
✅ Solution: Make sure routes are added to App.jsx and components are imported

---

## 📚 API EXAMPLES

### **Get Team Members**
```bash
GET http://localhost:5000/api/team-members/1
```

Response:
```json
[
  {
    "id": 1,
    "projectId": 1,
    "name": "Priya Rao",
    "usn": "CS001",
    "email": "priya@example.com",
    "photo": "url",
    "role": "MENTOR",
    "joinedAt": "2026-04-10T10:00:00Z"
  }
]
```

### **Create Budget Item**
```bash
POST http://localhost:5000/api/budgets/1
Content-Type: application/json

{
  "category": "Hardware",
  "amount": 25000,
  "notes": "Laptops for team"
}
```

### **Approve Report**
```bash
PUT http://localhost:5000/api/reports/5
Content-Type: application/json

{
  "status": "APPROVED",
  "mentorComment": "Excellent work!"
}
```

---

## ✨ FEATURES CHECKLIST

- ✅ Team member display with avatars
- ✅ Daily & Weekly reports
- ✅ Report approval workflow
- ✅ Budget tracking with approval
- ✅ Budget summary & progress
- ✅ Document management (DPR, Resources)
- ✅ Status badges (Pending, Approved, Rejected)
- ✅ Role-based access control
- ✅ Responsive design
- ✅ Complete API backend

---

## 🎓 YOUR SYSTEM IS READY! 🚀

Go navigate to your project and explore the new tabs:
- 📊 **Reports** - Submit and approve reports
- 💰 **Budget** - Track project budget
- 📁 **Documents** - Manage DPR and files

Enjoy your enterprise-ready Academic Project Operating System! ✨

