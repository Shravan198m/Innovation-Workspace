import { useEffect, useState } from "react";
import api from "../services/api";

const STATUS_CONFIG = {
  PENDING: { icon: "⏳", color: "bg-yellow-100 text-yellow-800" },
  APPROVED: { icon: "✅", color: "bg-green-100 text-green-800" },
  REJECTED: { icon: "❌", color: "bg-red-100 text-red-800" },
};

const DOCUMENT_TYPES = {
  DPR: { label: "Design Project Report", icon: "📋" },
  RESOURCE: { label: "Project Resources", icon: "📚" },
  OTHER: { label: "Other Documents", icon: "📄" },
};

export default function DocumentsTab({ projectId, currentUserRole, projectAccent = "from-cyan-700 to-teal-500" }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadData, setUploadData] = useState({
    fileName: "",
    category: "DPR",
    fileUrl: "",
  });

  useEffect(() => {
    fetchDocuments();
  }, [projectId]);

  const fetchDocuments = async () => {
    try {
      const response = await api.get(`/documents/${projectId}`);
      setDocuments(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to fetch documents", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!uploadData.fileName.trim()) {
      alert("Please enter file name");
      return;
    }

    try {
      await api.post(`/documents`, {
        projectId,
        fileName: uploadData.fileName.trim(),
        category: uploadData.category,
        fileUrl: uploadData.fileUrl.trim(),
      });

      setUploadData({ fileName: "", category: "DPR", fileUrl: "" });
      setShowUploadForm(false);
      fetchDocuments();
      alert("Document uploaded successfully!");
    } catch (error) {
      alert("Failed to upload document");
    }
  };

  const handleApprove = async (docId, status) => {
    if (currentUserRole !== "MENTOR" && currentUserRole !== "ADMIN") {
      alert("Only mentors can approve documents");
      return;
    }

    try {
      await api.put(`/documents/${docId}/status`, { status });
      fetchDocuments();
      alert(`Document ${status.toLowerCase()}!`);
    } catch (error) {
      alert("Failed to update document status");
    }
  };

  const groupedDocuments = {
    DPR: documents.filter((d) => d.category === "DPR"),
    RESOURCE: documents.filter((d) => d.category === "RESOURCE"),
    OTHER: documents.filter((d) => d.category === "OTHER"),
  };

  const DocumentCard = ({ doc }) => (
    <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(15,23,42,0.10)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-2xl">
              {DOCUMENT_TYPES[doc.category]?.icon || "📄"}
            </span>
            <div>
              <h4 className="text-base font-semibold text-slate-900">{doc.fileName}</h4>
              <p className="text-xs text-slate-500">
                Uploaded by {doc.uploadedBy}
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            {new Date(doc.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
              STATUS_CONFIG[doc.status]?.color
            }`}
          >
            {STATUS_CONFIG[doc.status]?.icon} {doc.status}
          </span>

          <div className="flex gap-2">
            <button
              onClick={() =>
                doc.fileUrl
                  ? window.open(doc.fileUrl, "_blank")
                  : alert("No file URL provided for this document")
              }
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              title="View/Download"
            >
              📥
            </button>

            {currentUserRole === "MENTOR" && doc.status === "PENDING" && (
              <>
                <button
                  onClick={() => handleApprove(doc.id, "APPROVED")}
                  className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
                  title="Approve"
                >
                  ✅
                </button>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className={`bg-gradient-to-r ${projectAccent} px-6 py-6 text-white sm:px-8`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/80">Documents</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Project Documents</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">
                DPR uploads, resource files, and project documents organized in a clean enterprise view.
              </p>
            </div>

            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-slate-950/20 transition hover:bg-slate-100"
            >
              {showUploadForm ? "Close Upload" : "📤 Upload Document"}
            </button>
          </div>
        </div>

        <div className="grid gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:grid-cols-3 sm:px-8">
          {[
            { label: "Total Documents", value: documents.length },
            { label: "Pending Review", value: documents.filter((doc) => doc.status === "PENDING").length },
            { label: "Approved", value: documents.filter((doc) => doc.status === "APPROVED").length },
          ].map((item) => (
            <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{item.value}</p>
            </article>
          ))}
        </div>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
          <div className="mb-5">
            <h3 className="text-xl font-semibold text-slate-900">Upload Document</h3>
            <p className="text-sm text-slate-500">Add a DPR, resource file, or supporting project asset.</p>
          </div>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Document Type *
                </label>
                <select
                  value={uploadData.category}
                  onChange={(e) => setUploadData({ ...uploadData, category: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                >
                  {Object.entries(DOCUMENT_TYPES).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  File Name *
                </label>
                <input
                  type="text"
                  value={uploadData.fileName}
                  onChange={(e) => setUploadData({ ...uploadData, fileName: e.target.value })}
                  placeholder="document_name.pdf"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                File URL (optional)
              </label>
              <input
                type="text"
                value={uploadData.fileUrl}
                onChange={(e) => setUploadData({ ...uploadData, fileUrl: e.target.value })}
                placeholder="https://example.com/file.pdf"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
              />
            </div>

            <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="mb-2 text-slate-700">📋 Select file to upload</p>
              <p className="text-xs text-slate-500">(Simulated - Enter filename above)</p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Upload
              </button>
              <button
                type="button"
                onClick={() => setShowUploadForm(false)}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Documents sections */}
      {loading ? (
        <div className="rounded-[24px] border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
          Loading documents...
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(DOCUMENT_TYPES).map(([type, { label, icon }]) => (
            <div key={type}>
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                  {icon}
                </span>
                <h3 className="text-lg font-semibold text-slate-900">{label}</h3>
                {groupedDocuments[type].length > 0 && (
                  <span className="text-sm text-slate-500">
                    ({groupedDocuments[type].length})
                  </span>
                )}
              </div>

              {groupedDocuments[type].length === 0 ? (
                <p className="rounded-[20px] border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500 shadow-sm">
                  No {label.toLowerCase()} uploaded
                </p>
              ) : (
                <div className="space-y-3">
                  {groupedDocuments[type].map((doc) => (
                    <DocumentCard key={doc.id} doc={doc} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
