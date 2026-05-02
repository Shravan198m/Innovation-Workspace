const baseUrl = process.env.API_BASE_URL || "http://localhost:5000/api";

async function request(method, path, { token, json, formData } = {}) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let body;
  if (json) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (formData) {
    body = formData;
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body,
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text || null;
    }

    return {
      ok: true,
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error?.message || String(error),
      data: null,
    };
  }
}

function buildResult(name, method, path, expectedStatuses, response) {
  const pass = response.ok && expectedStatuses.includes(response.status);
  return {
    name,
    method,
    path,
    expected: expectedStatuses.join("/"),
    status: response.status,
    pass,
    note: response.ok ? "" : response.error,
  };
}

function logTable(results) {
  const title = "API Smoke Test Results";
  console.log(`\n${title}`);
  console.log("-".repeat(title.length));

  const rows = results.map((r, index) => ({
    "#": String(index + 1),
    Name: r.name,
    Method: r.method,
    Path: r.path,
    Expected: r.expected,
    Status: String(r.status),
    Result: r.pass ? "PASS" : "FAIL",
    Note: r.note || "-",
  }));

  const headers = Object.keys(rows[0] || {});
  const widths = headers.map((header) =>
    Math.max(header.length, ...rows.map((row) => String(row[header]).length))
  );

  const line = (values) =>
    values
      .map((value, i) => String(value).padEnd(widths[i], " "))
      .join(" | ");

  console.log(line(headers));
  console.log(widths.map((w) => "-".repeat(w)).join("-|-"));
  rows.forEach((row) => console.log(line(headers.map((header) => row[header]))));

  const passCount = results.filter((r) => r.pass).length;
  console.log(`\nSummary: ${passCount}/${results.length} passed.`);
}

async function main() {
  const now = Date.now();
  const email = `api.tester.${now}@example.com`;
  const password = "Test1234!";

  const results = [];

  const health = await request("GET", "/health");
  results.push(buildResult("Health", "GET", "/health", [200], health));

  const apiRoot = await request("GET", "");
  results.push(buildResult("API Root", "GET", "/", [200], apiRoot));

  const register = await request("POST", "/auth/register", {
    json: { name: "API Tester", email, password, role: "STUDENT" },
  });
  results.push(buildResult("Auth Register", "POST", "/auth/register", [201, 409], register));

  const login = await request("POST", "/auth/login", {
    json: { email, password },
  });
  results.push(buildResult("Auth Login", "POST", "/auth/login", [200], login));

  const google = await request("POST", "/auth/google", {
    json: {},
  });
  results.push(buildResult("Auth Google", "POST", "/auth/google", [400, 401, 500], google));

  const token = login.data?.token || register.data?.token || "";

  const projects = await request("GET", "/projects", { token });
  results.push(buildResult("Projects List", "GET", "/projects", [200], projects));

  const firstProject = Array.isArray(projects.data) ? projects.data[0] : null;
  const projectId = Number(firstProject?.id || 1);

  const projectById = await request("GET", `/projects/${projectId}`, { token });
  results.push(buildResult("Project By ID", "GET", `/projects/${projectId}`, [200, 403, 404], projectById));

  results.push(
    buildResult(
      "Project Create (admin required)",
      "POST",
      "/projects",
      [403],
      await request("POST", "/projects", {
        token,
        json: { name: "Smoke Project", title: "Smoke Project", mentor: "API Tester", department: "IT" },
      })
    )
  );

  results.push(
    buildResult(
      "Project Update (admin required)",
      "PUT",
      `/projects/${projectId}`,
      [403, 404],
      await request("PUT", `/projects/${projectId}`, {
        token,
        json: { name: "Updated Name" },
      })
    )
  );

  results.push(
    buildResult(
      "Project Complete (admin required)",
      "PATCH",
      `/projects/${projectId}/complete`,
      [403, 404],
      await request("PATCH", `/projects/${projectId}/complete`, { token })
    )
  );

  results.push(
    buildResult(
      "Project Delete (admin required)",
      "DELETE",
      `/projects/${projectId}`,
      [403, 404],
      await request("DELETE", `/projects/${projectId}`, { token })
    )
  );

  const tasksList = await request("GET", `/tasks/${projectId}`, { token });
  results.push(buildResult("Tasks By Project", "GET", `/tasks/${projectId}`, [200, 403, 404], tasksList));

  results.push(
    buildResult(
      "Task Search",
      "GET",
      "/tasks/search?q=test",
      [200],
      await request("GET", "/tasks/search?q=test", { token })
    )
  );

  const createTask = await request("POST", "/tasks", {
    token,
    json: {
      title: "Smoke Task",
      description: "Created by API smoke test",
      projectId,
      status: "todo",
      priority: "medium",
    },
  });
  results.push(buildResult("Task Create", "POST", "/tasks", [201, 400, 403, 404], createTask));

  const taskId = Number(createTask.data?.id || createTask.data?.task?.id || 1);

  results.push(
    buildResult(
      "Task Reorder",
      "PUT",
      "/tasks/reorder",
      [200, 400, 403, 404],
      await request("PUT", "/tasks/reorder", { token, json: { projectId, tasks: [] } })
    )
  );

  results.push(
    buildResult(
      "Task Update",
      "PUT",
      `/tasks/${taskId}`,
      [200, 400, 403, 404],
      await request("PUT", `/tasks/${taskId}`, { token, json: { title: "Task Updated" } })
    )
  );

  results.push(
    buildResult(
      "Task Comments Get",
      "GET",
      `/tasks/${taskId}/comments`,
      [200, 403, 404],
      await request("GET", `/tasks/${taskId}/comments`, { token })
    )
  );

  results.push(
    buildResult(
      "Task Comment Create",
      "POST",
      `/tasks/${taskId}/comments`,
      [201, 400, 403, 404],
      await request("POST", `/tasks/${taskId}/comments`, { token, json: { content: "Smoke comment" } })
    )
  );

  results.push(
    buildResult(
      "Task Attachments Get",
      "GET",
      `/tasks/${taskId}/attachments`,
      [200, 403, 404],
      await request("GET", `/tasks/${taskId}/attachments`, { token })
    )
  );

  const taskAttachForm = new FormData();
  taskAttachForm.set("file", new Blob(["smoke attachment"], { type: "text/plain" }), "smoke.txt");
  results.push(
    buildResult(
      "Task Attachment Create",
      "POST",
      `/tasks/${taskId}/attachments`,
      [201, 400, 403, 404],
      await request("POST", `/tasks/${taskId}/attachments`, { token, formData: taskAttachForm })
    )
  );

  results.push(
    buildResult(
      "Task Delete",
      "DELETE",
      `/tasks/${taskId}`,
      [200, 403, 404],
      await request("DELETE", `/tasks/${taskId}`, { token })
    )
  );

  results.push(
    buildResult(
      "Reports By Project",
      "GET",
      `/reports/${projectId}`,
      [200, 403, 404],
      await request("GET", `/reports/${projectId}`, { token })
    )
  );

  const reportForm = new FormData();
  reportForm.set("projectId", String(projectId));
  reportForm.set("title", "Smoke Report");
  reportForm.set("status", "PENDING");
  reportForm.set("file", new Blob(["smoke report"], { type: "text/plain" }), "report.txt");
  const createReport = await request("POST", "/reports", { token, formData: reportForm });
  results.push(buildResult("Report Create", "POST", "/reports", [201, 400, 403, 404], createReport));

  const reportId = Number(createReport.data?.id || createReport.data?.report?.id || 1);
  results.push(
    buildResult(
      "Report Update (mentor/admin required)",
      "PUT",
      `/reports/${reportId}`,
      [403, 404],
      await request("PUT", `/reports/${reportId}`, {
        token,
        json: { status: "APPROVED", feedback: "Smoke update" },
      })
    )
  );

  results.push(
    buildResult(
      "Budget Summary",
      "GET",
      `/budgets/${projectId}/summary`,
      [200, 403, 404],
      await request("GET", `/budgets/${projectId}/summary`, { token })
    )
  );

  const budgets = await request("GET", `/budgets/${projectId}`, { token });
  results.push(buildResult("Budgets By Project", "GET", `/budgets/${projectId}`, [200, 403, 404], budgets));

  const createBudget = await request("POST", `/budgets/${projectId}`, {
    token,
    json: {
      item: "Smoke Budget",
      category: "misc",
      estimatedCost: 100,
      actualCost: 0,
      status: "PENDING",
      notes: "Smoke test row",
    },
  });
  results.push(buildResult("Budget Create", "POST", `/budgets/${projectId}`, [201, 400, 403, 404], createBudget));

  const budgetId = Number(createBudget.data?.id || createBudget.data?.budget?.id || budgets.data?.[0]?.id || 1);

  results.push(
    buildResult(
      "Budget Update (mentor/admin required)",
      "PUT",
      `/budgets/${budgetId}`,
      [403, 404],
      await request("PUT", `/budgets/${budgetId}`, {
        token,
        json: { status: "APPROVED" },
      })
    )
  );

  results.push(
    buildResult(
      "Budget Delete (mentor/admin required)",
      "DELETE",
      `/budgets/${budgetId}`,
      [403, 404],
      await request("DELETE", `/budgets/${budgetId}`, { token })
    )
  );

  results.push(
    buildResult(
      "Chat By Project",
      "GET",
      `/chat/${projectId}`,
      [200, 403, 404],
      await request("GET", `/chat/${projectId}`, { token })
    )
  );

  results.push(
    buildResult(
      "Chat Create",
      "POST",
      `/chat/${projectId}`,
      [201, 400, 403, 404],
      await request("POST", `/chat/${projectId}`, { token, json: { message: "Smoke chat" } })
    )
  );

  results.push(
    buildResult(
      "Documents By Project",
      "GET",
      `/documents/${projectId}`,
      [200, 403, 404],
      await request("GET", `/documents/${projectId}`, { token })
    )
  );

  const docForm = new FormData();
  docForm.set("projectId", String(projectId));
  docForm.set("name", "Smoke Doc");
  docForm.set("file", new Blob(["smoke doc"], { type: "text/plain" }), "doc.txt");
  const createDocument = await request("POST", "/documents", { token, formData: docForm });
  results.push(buildResult("Document Create", "POST", "/documents", [201, 400, 403, 404], createDocument));

  const docId = Number(createDocument.data?.id || createDocument.data?.document?.id || 1);
  results.push(
    buildResult(
      "Document Status Update (mentor/admin required)",
      "PUT",
      `/documents/${docId}/status`,
      [403, 404],
      await request("PUT", `/documents/${docId}/status`, {
        token,
        json: { status: "APPROVED" },
      })
    )
  );

  results.push(
    buildResult(
      "Team Members By Project",
      "GET",
      `/team-members/${projectId}`,
      [200, 403, 404],
      await request("GET", `/team-members/${projectId}`, { token })
    )
  );

  results.push(
    buildResult(
      "Team Member Create (admin required)",
      "POST",
      `/team-members/${projectId}`,
      [403, 404],
      await request("POST", `/team-members/${projectId}`, {
        token,
        json: { name: "Smoke Member", email: `member.${now}@example.com`, role: "STUDENT" },
      })
    )
  );

  results.push(
    buildResult(
      "Team Member Update (admin required)",
      "PUT",
      "/team-members/1",
      [403, 404],
      await request("PUT", "/team-members/1", { token, json: { name: "Updated Member" } })
    )
  );

  results.push(
    buildResult(
      "Team Member Delete (admin required)",
      "DELETE",
      "/team-members/1",
      [403, 404],
      await request("DELETE", "/team-members/1", { token })
    )
  );

  results.push(
    buildResult(
      "Notifications Me",
      "GET",
      "/notifications/me",
      [200],
      await request("GET", "/notifications/me", { token })
    )
  );

  results.push(
    buildResult(
      "Notification Read",
      "PATCH",
      "/notifications/1/read",
      [200, 403, 404],
      await request("PATCH", "/notifications/1/read", { token })
    )
  );

  results.push(
    buildResult(
      "Activity By Project",
      "GET",
      `/activity/${projectId}`,
      [200, 403, 404],
      await request("GET", `/activity/${projectId}`, { token })
    )
  );

  logTable(results);

  const failed = results.filter((r) => !r.pass);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Smoke test runner failed:", error);
  process.exit(1);
});
