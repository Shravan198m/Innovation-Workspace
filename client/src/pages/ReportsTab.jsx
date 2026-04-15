import { useEffect, useState } from "react";
import api from "../services/api";
import socket from "../socket";

const REPORT_TYPES = {
  DAILY: "Daily Report",
  WEEKLY: "Weekly Report",
};

const STATUS_CONFIG = {
  PENDING: { icon: "⏳", color: "bg-yellow-100 text-yellow-800" },
  APPROVED: { icon: "✅", color: "bg-green-100 text-green-800" },
  REJECTED: { icon: "❌", color: "bg-red-100 text-red-800" },
};

export default function ReportsTab({ projectId, currentUserRole, projectAccent = "from-cyan-700 to-teal-500" }) {
  const [reports, setReports] = useState([]);
  const [filterType, setFilterType] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: "DAILY",
    content: "",
  });

  useEffect(() => {
    fetchReports();
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
      setReports(response.data);
    } catch (error) {
      console.error("Failed to fetch reports", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!formData.content.trim()) {
      alert("Please enter report content");
      return;
    }

    try {
      await api.post(`/reports/`, {
        projectId,
        type: formData.type,
        content: formData.content,
      });

      setFormData({ type: "DAILY", content: "" });
      setShowForm(false);
      fetchReports();
      alert("Report submitted successfully!");
    } catch (error) {
      alert("Failed to submit report");
    }
  };

  const handleApprove = async (reportId, status) => {
    if (currentUserRole !== "MENTOR") {
      alert("Only mentors can approve reports");
      return;
    }

    try {
      await api.put(`/reports/${reportId}`, {
        status,
        mentorComment: prompt("Add mentor comment (optional):") || "",
      });

      fetchReports();
      alert(`Report ${status.toLowerCase()}!`);
    } catch (error) {
      alert("Failed to update report status");
    }
  };

  const filteredReports = filterType === "ALL" 
    ? reports 
    : reports.filter((r) => r.type === filterType);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className={`bg-gradient-to-r ${projectAccent} px-6 py-6 text-white sm:px-8`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/80">Reporting</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Project Reports</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">
                Daily and weekly reporting with mentor review, approval workflow, and clear traceability.
              </p>
            </div>

            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-50"
            >
              📝 {showForm ? "Close Form" : "Submit New Report"}
            </button>
          </div>
        </div>

        <div className="grid gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:grid-cols-3 sm:px-8">
          {[
            { label: "Total Reports", value: reports.length },
            { label: "Pending", value: reports.filter((report) => report.status === "PENDING").length },
            { label: "Approved", value: reports.filter((report) => report.status === "APPROVED").length },
          ].map((item) => (
            <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{item.value}</p>
            </article>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
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
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
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
                  Report Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write your report here..."
                  className="min-h-36 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Submit Report
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap gap-2">
          {["ALL", "DAILY", "WEEKLY"].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                filterType === type
                  ? "bg-slate-900 text-white shadow-lg"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              {type === "ALL" ? "All Reports" : REPORT_TYPES[type]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-[24px] border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
          Loading reports...
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 shadow-sm">
          No reports submitted yet
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredReports.map((report) => (
            <article
              key={report.id}
              className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(15,23,42,0.10)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-lg font-semibold text-slate-900">
                      {REPORT_TYPES[report.type]}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                        STATUS_CONFIG[report.status]?.color
                      }`}
                    >
                      {STATUS_CONFIG[report.status]?.icon} {report.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    📅 {new Date(report.createdAt).toLocaleDateString()} • 👤 {report.userName}
                  </p>
                </div>

                {currentUserRole === "MENTOR" && report.status === "PENDING" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(report.id, "APPROVED")}
                      className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
                    >
                      ✅ Approve
                    </button>
                    <button
                      onClick={() => handleApprove(report.id, "REJECTED")}
                      className="rounded-xl bg-rose-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-600"
                    >
                      ❌ Reject
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{report.content}</p>
              </div>

              {report.mentorComment && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Mentor Comment</p>
                  <p className="text-sm text-slate-700">{report.mentorComment}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
