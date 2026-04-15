import { useEffect, useMemo, useState } from "react";
import { Paperclip, Send, Upload, X } from "lucide-react";

const STATUS_OPTIONS = ["TASK", "IN PROGRESS", "REVIEW", "COMPLETED"];

export default function TaskModal({
  task,
  loading = false,
  currentUserRole,
  isEditing,
  taskDraft,
  setTaskDraft,
  comments = [],
  attachments = [],
  onClose,
  onStartEdit,
  onSave,
  onDelete,
  onRequestReview,
  onApprove,
  onAddComment,
  onUploadAttachment,
}) {
  const [commentText, setCommentText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    setCommentText("");
    setSelectedFile(null);
  }, [task?.id]);

  const canMentorApprove = currentUserRole === "MENTOR" || currentUserRole === "ADMIN";
  const canEditMentorNote = currentUserRole === "MENTOR" || currentUserRole === "ADMIN";
  const isReviewing = task?.status === "REVIEW";

  const attachmentCountLabel = useMemo(() => `${attachments.length} file${attachments.length === 1 ? "" : "s"}`, [attachments.length]);

  if (!task) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Task details</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{task.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{task.projectId ? `Project #${task.projectId}` : "Task overview"}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
            aria-label="Close task modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid flex-1 gap-0 overflow-hidden xl:grid-cols-[minmax(0,1.3fr)_360px]">
          <div className="overflow-y-auto px-6 py-5 sm:px-7">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                Loading task details...
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Title</label>
                    {isEditing ? (
                      <input
                        value={taskDraft.title}
                        onChange={(event) => setTaskDraft((prev) => ({ ...prev, title: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                      />
                    ) : (
                      <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{task.title}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</label>
                    {isEditing ? (
                      <select
                        value={taskDraft.status || task.status}
                        onChange={(event) => setTaskDraft((prev) => ({ ...prev, status: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        {task.status}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Description</label>
                  {isEditing ? (
                    <textarea
                      value={taskDraft.description}
                      onChange={(event) => setTaskDraft((prev) => ({ ...prev, description: event.target.value }))}
                      className="min-h-36 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                      placeholder="Add task details, context, or acceptance notes"
                    />
                  ) : (
                    <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 whitespace-pre-wrap">
                      {task.description || "No description added yet."}
                    </p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Due Date</label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={taskDraft.dueDate || ""}
                        onChange={(event) => setTaskDraft((prev) => ({ ...prev, dueDate: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                      />
                    ) : (
                      <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Assignee</label>
                    {isEditing ? (
                      <input
                        value={taskDraft.assignee}
                        onChange={(event) => setTaskDraft((prev) => ({ ...prev, assignee: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                        placeholder="Assign a team member"
                      />
                    ) : (
                      <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        {task.assignee || "Unassigned"}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Mentor Note</label>
                  {isEditing && canEditMentorNote ? (
                    <textarea
                      value={taskDraft.mentorNote}
                      onChange={(event) => setTaskDraft((prev) => ({ ...prev, mentorNote: event.target.value }))}
                      className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                      placeholder="Leave mentor guidance here"
                    />
                  ) : (
                    <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 whitespace-pre-wrap">
                      {task.mentorNote || "No mentor note yet."}
                    </p>
                  )}
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Comments</h3>
                      <p className="mt-1 text-sm text-slate-500">Discussion thread for this task</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{comments.length}</span>
                  </div>

                  <div className="space-y-3">
                    {comments.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500">No comments yet.</p>
                    ) : (
                      comments.map((comment) => (
                        <article key={comment.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{comment.author}</p>
                              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{comment.authorRole}</p>
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : "Just now"}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-700 whitespace-pre-wrap">{comment.text}</p>
                        </article>
                      ))
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <input
                      value={commentText}
                      onChange={(event) => setCommentText(event.target.value)}
                      placeholder="Add comment..."
                      className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (commentText.trim()) {
                          onAddComment(commentText);
                          setCommentText("");
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      <Send className="h-4 w-4" />
                      Send
                    </button>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Attachments</h3>
                      <p className="mt-1 text-sm text-slate-500">{attachmentCountLabel}</p>
                    </div>
                    <Paperclip className="h-4 w-4 text-slate-400" />
                  </div>

                  <div className="space-y-2">
                    {attachments.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500">No attachments uploaded.</p>
                    ) : (
                      attachments.map((attachment) => (
                        <a
                          key={attachment.id}
                          href={attachment.filePath}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition hover:border-slate-300 hover:bg-white"
                        >
                          <div>
                            <p className="font-medium text-slate-800">{attachment.filename}</p>
                            <p className="text-[11px] text-slate-500">Uploaded by {attachment.uploadedBy}</p>
                          </div>
                          <span className="text-xs text-slate-400">Open</span>
                        </a>
                      ))
                    )}
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      type="file"
                      onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedFile) {
                          onUploadAttachment(selectedFile);
                          setSelectedFile(null);
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <Upload className="h-4 w-4" />
                      Upload
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <aside className="border-t border-slate-200 bg-slate-50 px-6 py-5 xl:border-l xl:border-t-0 xl:px-5">
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Status</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-800">{task.status}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Approval</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium capitalize text-slate-800">
                    {String(task.approvalStatus || "not-requested").replace(/-/g, " ")}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Role</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-800">{currentUserRole}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Updated</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-800">
                    {task.updatedAt ? new Date(task.updatedAt).toLocaleString() : "Just now"}
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={onSave}
                      className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      Save changes
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Close edit
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={onStartEdit}
                      className="w-full rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
                    >
                      Edit task
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(task.id)}
                      className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      Delete task
                    </button>

                    {task.status !== "REVIEW" && (
                      <button
                        type="button"
                        onClick={() => onRequestReview(task.id)}
                        className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                      >
                        Request mentor review
                      </button>
                    )}

                    {isReviewing && canMentorApprove && (
                      <button
                        type="button"
                        onClick={() => onApprove(task.id)}
                        className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                      >
                        Approve and complete
                      </button>
                    )}
                  </>
                )}
              </div>

              {task.mentorNote && (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 whitespace-pre-wrap">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Mentor note</p>
                  {task.mentorNote}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
