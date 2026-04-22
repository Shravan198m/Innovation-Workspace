import { useEffect, useState } from "react";
import api from "../services/api";
import { getApiErrorMessage } from "../services/apiError";
import socket from "../socket";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import StatusBadge from "../components/ui/StatusBadge";
import { normalizeRole } from "../utils/roles";

const REPORT_TYPES = {
  DAILY: "Daily Report",
  WEEKLY: "Weekly Report",
};

function normalizeReportStatus(status) {
  const value = String(status || "submitted").trim().toLowerCase().replace(/[\s-]+/g, "_");

  if (value === "approved") {
    return "completed";
  }

  if (["submitted", "mentor_approved", "completed", "rejected"].includes(value)) {
    return value;
  }

  return "submitted";
}

export default function ReportsTab({ projectId, currentUserRole }) {
  const normalizedRole = normalizeRole(currentUserRole);
  const isStudent = normalizedRole === "student";
  const isMentor = normalizedRole === "mentor";
  const isManager = normalizedRole === "admin";

  const [reports, setReports] = useState([]);
  const [todoTasks, setTodoTasks] = useState([]);
  const [filterType, setFilterType] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState({
    type: "DAILY",
    content: "",
    taskId: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [rejectingReportId, setRejectingReportId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetchReports();
    fetchTodoTasks();
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      return undefined;
    }

    const handleRealtimeReport = (payload) => {
      if (String(payload?.projectId) !== String(projectId)) {
        return;
      }

      fetchReports();
    };

    socket.on("reportAdded", handleRealtimeReport);
    socket.on("reportUpdated", handleRealtimeReport);

    return () => {
      socket.off("reportAdded", handleRealtimeReport);
      socket.off("reportUpdated", handleRealtimeReport);
    };
  }, [projectId]);

  const fetchReports = async () => {
    try {
      const response = await api.get(`/reports/${projectId}`);
      const normalized = Array.isArray(response.data)
        ? response.data.map((report) => ({
            ...report,
            status: normalizeReportStatus(report.status),
          }))
        : [];
      setReports(normalized);
      setMessage("");
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Failed to fetch reports."));
    } finally {
      setLoading(false);
    }
  };

  const fetchTodoTasks = async () => {
    try {
      const response = await api.get(`/tasks/${projectId}`);
      const allTasks = Array.isArray(response.data) ? response.data : [];
      const selectableTasks = allTasks.filter((task) => ["todo", "rejected"].includes(String(task.status || "").toLowerCase()));
      setTodoTasks(selectableTasks);
      setFormData((prev) => {
        if (prev.taskId && selectableTasks.some((task) => String(task.id) === String(prev.taskId))) {
          return prev;
        }

        return { ...prev, taskId: selectableTasks[0] ? String(selectableTasks[0].id) : "" };
      });
    } catch {
      setTodoTasks([]);
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();

    if (!formData.content.trim() && !selectedFile) {
      setMessage("Please enter report content or choose a file.");
      return;
    }

    if (!formData.taskId) {
      setMessage("Please select which To Do task this report belongs to.");
      return;
    }

    try {
      const payload = new FormData();
      payload.append("projectId", String(projectId));
      payload.append("type", formData.type);
      payload.append("content", formData.content);
      payload.append("taskId", String(formData.taskId));
      if (selectedFile) {
        payload.append("file", selectedFile);
      }

      await api.post(`/reports/`, payload, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setFormData({ type: "DAILY", content: "", taskId: "" });
      setSelectedFile(null);
      setShowForm(false);
      fetchReports();
      fetchTodoTasks();
      setMessage("Report submitted successfully.");
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Failed to submit report."));
    }
  };

  const handleMentorApprove = async (reportId) => {
    if (!isMentor) {
      setMessage("Only mentor can approve at stage 1.");
      return;
    }

    try {
      await api.patch(`/reports/${reportId}/mentor-approve`);

      fetchReports();
      fetchTodoTasks();
      setMessage("Report approved by mentor. Waiting for manager final approval.");
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Failed to mentor-approve report."));
    }
  };

  const handleManagerApprove = async (reportId) => {
    if (!isManager) {
      setMessage("Only manager can do final approval.");
      return;
    }

    try {
      await api.patch(`/reports/${reportId}/manager-approve`);
      fetchReports();
      fetchTodoTasks();
      setMessage("Report completed. Final approval marked.");
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Failed to complete report."));
    }
  };

  const handleReject = async (reportId, mentorComment) => {
    if (!isMentor) {
      setMessage("Only mentor can reject reports.");
      return;
    }

    try {
      await api.patch(`/reports/${reportId}/reject`, {
        mentorComment,
      });
      fetchReports();
      fetchTodoTasks();
      setMessage("Report rejected.");
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Failed to reject report."));
    }
  };

  const filteredReports = filterType === "ALL" 
    ? reports 
    : reports.filter((r) => r.type === filterType);

  const resolveReportUrl = (filePath) => {
    const value = String(filePath || "").trim();
    if (!value) {
      return "";
    }

    if (/^https?:\/\//i.test(value)) {
      return value;
    }

    const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
    const backendOrigin = apiBase.replace(/\/api\/?$/, "");
    return `${backendOrigin}${value.startsWith("/") ? "" : "/"}${value}`;
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-[28px] p-0">
        <div className="bg-[linear-gradient(135deg,rgba(37,99,235,0.18)_0%,rgba(14,165,164,0.14)_100%)] px-6 py-6 text-slate-900 sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Reporting</p>
              <h2 className="heading-lg heading-project mt-2">Project Reports</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Daily and weekly reporting with mentor-first approval and manager final completion.
              </p>
              <p className="mt-2 text-xs font-medium text-slate-500">
                Students submit reports, mentor approves stage 1, and manager gives final approval.
              </p>
              <p className="mt-1 text-xs text-slate-500">Each report must be linked to a To Do task.</p>
            </div>

            {isStudent && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="glass-button-primary inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold"
              >
                {showForm ? "Close Form" : "Upload / Submit Report"}
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-3 border-t border-white/35 bg-white/28 px-6 py-5 sm:grid-cols-4 sm:px-8 backdrop-blur-md">
          {[
            { label: "Total Reports", value: reports.length },
            { label: "Submitted", value: reports.filter((report) => normalizeReportStatus(report.status) === "submitted").length },
            { label: "Mentor Approved", value: reports.filter((report) => normalizeReportStatus(report.status) === "mentor_approved").length },
            { label: "Completed", value: reports.filter((report) => normalizeReportStatus(report.status) === "completed").length },
          ].map((item) => (
            <Card key={item.label} className="rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{item.value}</p>
            </Card>
          ))}
        </div>
      </Card>

      {message && (
        <Card className="rounded-[24px] px-4 py-3 text-sm text-slate-700">
          {message}
        </Card>
      )}

      {showForm && isStudent && (
        <Card className="rounded-[24px] p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Submit New Report</h3>
              <p className="text-sm text-slate-500">Use the form below to capture project progress.</p>
            </div>
          </div>

          <form onSubmit={handleSubmitReport} className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Report Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="glass-input w-full rounded-2xl px-4 py-3 text-sm"
                >
                  {Object.entries(REPORT_TYPES).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Linked Task (To Do)
                </label>
                <select
                  value={formData.taskId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, taskId: e.target.value }))}
                  className="glass-input w-full rounded-2xl px-4 py-3 text-sm"
                >
                  {todoTasks.length === 0 ? (
                    <option value="">No To Do task available</option>
                  ) : (
                    todoTasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Report Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write your report here..."
                  className="glass-input min-h-36 w-full rounded-2xl px-4 py-3 text-sm"
                />
              </div>
            </div>

            <div className="glass-card rounded-[22px] border-dashed p-6 text-center">
              <label className="glass-button-secondary inline-flex cursor-pointer items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold">
                📎 Choose File From Computer
                <input
                  type="file"
                  className="hidden"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                />
              </label>
              <p className="mt-3 text-sm text-slate-700">
                {selectedFile ? `Selected: ${selectedFile.name}` : "No file selected"}
              </p>
              <p className="mt-1 text-xs text-slate-500">Optional: Attach PDF, docs, images, or any supporting file.</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="glass-button-primary rounded-2xl px-5 py-3 text-sm font-semibold"
              >
                Submit Report
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="glass-button-secondary rounded-2xl px-5 py-3 text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card className="rounded-[24px] p-4">
        <div className="flex flex-wrap gap-2">
          {["ALL", "DAILY", "WEEKLY"].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                filterType === type
                  ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_12px_24px_rgba(37,99,235,0.3)]"
                  : "glass-button-secondary text-slate-600 hover:text-slate-900"
              }`}
            >
              {type === "ALL" ? "All Reports" : REPORT_TYPES[type]}
            </button>
          ))}
        </div>
      </Card>

      {loading ? (
        <Card className="rounded-[24px] p-8 text-center text-slate-500">
          Loading reports...
        </Card>
      ) : filteredReports.length === 0 ? (
        <Card className="rounded-[24px] border-dashed p-10 text-center text-slate-500">
          No reports submitted yet
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredReports.map((report) => (
            <Card key={report.id} className="app-elevate rounded-[24px] p-5">
              {(() => {
                const status = normalizeReportStatus(report.status);
                const mentorApproved = status === "mentor_approved" || status === "completed";
                const managerApproved = status === "completed";

                return (
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${mentorApproved ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                      Mentor {mentorApproved ? "✓" : "○"}
                    </span>
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${managerApproved ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                      Manager {managerApproved ? "✓" : "○"}
                    </span>
                  </div>
                );
              })()}

              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-lg font-semibold text-slate-900">
                      {REPORT_TYPES[report.type]}
                    </span>
                    <StatusBadge status={normalizeReportStatus(report.status)} />
                    <Badge>{report.type}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    📅 {new Date(report.createdAt).toLocaleDateString()} • 👤 {report.userName}
                  </p>
                </div>

                {isMentor && normalizeReportStatus(report.status) === "submitted" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMentorApprove(report.id)}
                      className="inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      Mentor Approve
                    </button>
                    <button
                      onClick={() => {
                        setRejectingReportId(report.id);
                        setRejectReason("");
                      }}
                      className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {isManager && normalizeReportStatus(report.status) === "mentor_approved" && (
                  <button
                    onClick={() => handleManagerApprove(report.id)}
                    className="inline-flex items-center rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100"
                  >
                    Final Approve
                  </button>
                )}
              </div>

              {report.taskTitle && (
                <div className="mt-3">
                  <span className="glass-pill inline-flex rounded-full px-3 py-1 text-xs font-medium text-slate-700">
                    Linked Task: {report.taskTitle}
                  </span>
                </div>
              )}

              <div className="mt-4 rounded-2xl border border-white/55 bg-white/72 p-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{report.content}</p>
              </div>

              {report.filePath && (
                <div className="mt-3">
                  <a
                    href={resolveReportUrl(report.filePath)}
                    target="_blank"
                    rel="noreferrer"
                    className="glass-button-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold"
                  >
                    📎 Open Attachment
                  </a>
                </div>
              )}

              {report.mentorComment && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 backdrop-blur-sm">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Mentor Comment</p>
                  <p className="text-sm text-slate-700">{report.mentorComment}</p>
                </div>
              )}

              {normalizeReportStatus(report.status) === "mentor_approved" && (
                <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50/80 p-4 text-sm text-cyan-800">
                  Mentor approved. Waiting for manager final approval.
                </div>
              )}

              {normalizeReportStatus(report.status) === "completed" && (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-800">
                  Completed ✓ Final manager approval done.
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {rejectingReportId && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg rounded-[24px] p-5">
            <h3 className="text-lg font-semibold text-slate-900">Reject report</h3>
            <p className="mt-1 text-sm text-slate-500">Enter reason for rejection. This is mandatory and shown to the student.</p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason"
              className="glass-input mt-4 min-h-28 w-full rounded-2xl px-4 py-3 text-sm"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectingReportId(null);
                  setRejectReason("");
                }}
                className="glass-button-secondary rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!rejectReason.trim()) {
                    setMessage("Rejection reason is required.");
                    return;
                  }

                  await handleReject(rejectingReportId, rejectReason.trim());
                  setRejectingReportId(null);
                  setRejectReason("");
                }}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                Submit Reject
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
