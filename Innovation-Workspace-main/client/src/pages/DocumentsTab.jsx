import { useEffect, useState } from "react";
import api from "../services/api";
import { getApiErrorMessage } from "../services/apiError";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import StatusBadge from "../components/ui/StatusBadge";
import { canReviewWork } from "../utils/roles";

const DOCUMENT_TYPES = {
  DPR: { label: "Design Project Report", icon: "📋" },
  RESOURCE: { label: "Project Resources", icon: "📚" },
  OTHER: { label: "Other Documents", icon: "📄" },
};

export default function DocumentsTab({ projectId, currentUserRole }) {
  const canReviewDocuments = canReviewWork(currentUserRole);
  const isStudent = String(currentUserRole || "").toLowerCase() === "student";

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadData, setUploadData] = useState({
    fileName: "",
    category: "DPR",
    fileUrl: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, [projectId]);

  const openUploadForCategory = (category) => {
    setUploadData((prev) => ({ ...prev, category }));
    setShowUploadForm(true);
    setMessage("");
  };

  const fetchDocuments = async () => {
    try {
      const response = await api.get(`/documents/${projectId}`);
      setDocuments(Array.isArray(response.data) ? response.data : []);
      setMessage("");
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Failed to fetch documents."));
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    const resolvedFileName = (uploadData.fileName || selectedFile?.name || "").trim();
    if (!resolvedFileName) {
      setMessage("Please enter file name or choose a file.");
      return;
    }

    if (!selectedFile && !uploadData.fileUrl.trim()) {
      setMessage("Please choose a file from your computer or provide file URL.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("projectId", String(projectId));
      formData.append("fileName", resolvedFileName);
      formData.append("category", uploadData.category);
      formData.append("fileUrl", uploadData.fileUrl.trim());

      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      await api.post(`/documents`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setUploadData({ fileName: "", category: "DPR", fileUrl: "" });
      setSelectedFile(null);
      setShowUploadForm(false);
      fetchDocuments();
      setMessage("Document uploaded successfully.");
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Failed to upload document."));
    }
  };

  const handleApprove = async (docId, status) => {
    if (!canReviewDocuments) {
      setMessage("Only mentor or manager can approve documents.");
      return;
    }

    try {
      await api.put(`/documents/${docId}/status`, { status });
      fetchDocuments();
      setMessage(`Document ${status.toLowerCase()}!`);
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Failed to update document status."));
    }
  };

  const groupedDocuments = {
    DPR: documents.filter((d) => d.category === "DPR"),
    RESOURCE: documents.filter((d) => d.category === "RESOURCE"),
    OTHER: documents.filter((d) => d.category === "OTHER"),
  };

  const resolveDocumentUrl = (fileUrl) => {
    const value = String(fileUrl || "").trim();
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

  const DocumentCard = ({ doc }) => (
    <Card className="app-elevate rounded-[22px] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-3">
            <span className="glass-surface flex h-12 w-12 items-center justify-center rounded-2xl text-2xl">
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
          <StatusBadge status={doc.status.toLowerCase()} />
          <Badge>{DOCUMENT_TYPES[doc.category]?.label || doc.category}</Badge>

          <div className="flex gap-2">
            <button
              onClick={() =>
                resolveDocumentUrl(doc.fileUrl)
                  ? window.open(resolveDocumentUrl(doc.fileUrl), "_blank")
                  : alert("No file URL provided for this document")
              }
              className="glass-button-primary rounded-xl px-3 py-2 text-sm font-semibold text-white"
              title="View/Download"
            >
              📥
            </button>
                          {isStudent && (
                            <button
                              onClick={() => setShowUploadForm(!showUploadForm)}
                              className="glass-button-primary inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold"
                            >
                              {showUploadForm ? "Close Upload" : "Upload Document"}
                            </button>
                          )}

          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-[28px] p-0">
        <div className="bg-slate-100 px-6 py-6 text-slate-900 sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Documents</p>
              <h2 className="heading-lg heading-project mt-2">Project Documents</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                DPR uploads, resource files, and project documents organized in a clean enterprise view.
              </p>
              <p className="mt-2 text-xs font-medium text-slate-500">
                Students can upload documents here. Mentors/Admin review and approve.
              </p>
            </div>

            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="glass-button-primary inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold"
            >
              {showUploadForm ? "Close Upload" : isStudent ? "Upload Document" : "Manage Uploads"}
            </button>
          </div>
        </div>

        <div className="grid gap-3 border-t border-white/35 bg-white/28 px-6 py-5 sm:grid-cols-3 sm:px-8 backdrop-blur-md">
          {[
            { label: "Total Documents", value: documents.length },
            { label: "Pending Review", value: documents.filter((doc) => doc.status === "PENDING").length },
            { label: "Approved", value: documents.filter((doc) => doc.status === "APPROVED").length },
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

      {/* Upload Form */}
      {showUploadForm && isStudent && (
        <Card className="rounded-[24px] p-6">
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
                  className="glass-input w-full rounded-2xl px-4 py-3 text-sm"
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
                  className="glass-input w-full rounded-2xl px-4 py-3 text-sm"
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
                className="glass-input w-full rounded-2xl px-4 py-3 text-sm"
              />
            </div>

            <div className="glass-card rounded-[22px] border-dashed p-8 text-center">
              <label className="glass-button-secondary inline-flex cursor-pointer items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold">
                📎 Choose File From Computer
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setSelectedFile(file);
                    if (file && !uploadData.fileName.trim()) {
                      setUploadData((prev) => ({ ...prev, fileName: file.name }));
                    }
                  }}
                />
              </label>
              <p className="mt-3 text-sm text-slate-700">
                {selectedFile ? `Selected: ${selectedFile.name}` : "No file selected"}
              </p>
              <p className="mt-1 text-xs text-slate-500">PDF, docs, images, or any supported file from your computer.</p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="glass-button-primary rounded-2xl px-5 py-3 text-sm font-semibold"
              >
                Upload
              </button>
              <button
                type="button"
                onClick={() => setShowUploadForm(false)}
                className="glass-button-secondary rounded-2xl px-5 py-3 text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Documents sections */}
      {loading ? (
        <Card className="rounded-[24px] p-8 text-center text-slate-500">
          Loading documents...
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(DOCUMENT_TYPES).map(([type, { label, icon }]) => (
            <div key={type}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
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

                <button
                  type="button"
                  onClick={() => openUploadForCategory(type)}
                  className="glass-button-primary rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  Upload {label}
                </button>
              </div>

              {groupedDocuments[type].length === 0 ? (
                <Card className="rounded-[20px] border-dashed p-5 text-center text-sm text-slate-500">
                  No {label.toLowerCase()} uploaded
                </Card>
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
