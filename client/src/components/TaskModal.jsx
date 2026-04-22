import { useEffect, useMemo, useState } from "react";
import { Paperclip, Send, Upload, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import InfoTip from "./InfoTip";
import { isManagerRole } from "../utils/roles";

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "submitted", label: "Submitted" },
];

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
  onSubmitTask,
  onApprove,
  onReject,
  onAddComment,
  onUploadAttachment,
  actionBusy = false,
  canEditTask = false,
}) {
  const [commentText, setCommentText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    setCommentText("");
    setSelectedFile(null);
  }, [task?.id]);

  const canEditMentorNote = isManagerRole(currentUserRole);

  const attachmentCountLabel = useMemo(() => `${attachments.length} file${attachments.length === 1 ? "" : "s"}`, [attachments.length]);

  if (!task) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        key={`task-modal-${task.id}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm"
      >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 16 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className="glass-panel flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/45 bg-white/35 px-6 py-4 sm:px-7 backdrop-blur-md">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Task details</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{task.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{task.projectId ? `Project #${task.projectId}` : "Task overview"}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="glass-button-secondary rounded-full p-2 text-slate-500"
            aria-label="Close task modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid flex-1 gap-0 overflow-hidden xl:grid-cols-[minmax(0,1.3fr)_360px]">
          <div className="overflow-y-auto px-6 py-5 sm:px-7">
            {loading ? (
              <div className="glass-surface rounded-2xl border-dashed px-4 py-6 text-sm text-slate-500">
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
                        className="glass-input w-full rounded-2xl px-4 py-3 text-sm"
                      />
                    ) : (
                      <p className="glass-surface rounded-2xl px-4 py-3 text-sm text-slate-700">{task.title}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</label>
                    {isEditing ? (
                      <select
                        value={taskDraft.status || task.status}
                        onChange={(event) => setTaskDraft((prev) => ({ ...prev, status: event.target.value }))}
                        className="glass-input w-full rounded-2xl px-4 py-3 text-sm"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="glass-surface rounded-2xl px-4 py-3 text-sm text-slate-700">
                        {String(task.status || "todo").replace(/_/g, " ")}
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
                      className="glass-input min-h-36 w-full rounded-2xl px-4 py-3 text-sm"
                      placeholder="Add task details, context, or acceptance notes"
                    />
                  ) : (
                    <p className="glass-surface rounded-2xl px-4 py-3 text-sm leading-6 text-slate-700 whitespace-pre-wrap">
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
                        className="glass-input w-full rounded-2xl px-4 py-3 text-sm"
                      />
                    ) : (
                      <p className="glass-surface rounded-2xl px-4 py-3 text-sm text-slate-700">
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
                        className="glass-input w-full rounded-2xl px-4 py-3 text-sm"
                        placeholder="Assign a team member"
                      />
                    ) : (
                      <p className="glass-surface rounded-2xl px-4 py-3 text-sm text-slate-700">
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
                      className="glass-input min-h-28 w-full rounded-2xl px-4 py-3 text-sm"
                      placeholder="Leave mentor guidance here"
                    />
                  ) : (
                    <p className="glass-surface rounded-2xl px-4 py-3 text-sm leading-6 text-slate-700 whitespace-pre-wrap">
                      {task.mentorNote || "No mentor note yet."}
                    </p>
                  )}
                </div>

                <div className="glass-card rounded-[24px] p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Comments</h3>
                      <p className="mt-1 text-sm text-slate-500">Discussion thread for this task</p>
                    </div>
                    <span className="glass-pill rounded-full px-2.5 py-1 text-xs font-semibold">{comments.length}</span>
                  </div>

                  <div className="space-y-3">
                    {comments.length === 0 ? (
                      <p className="glass-surface rounded-2xl border-dashed px-4 py-4 text-sm text-slate-500">No comments yet.</p>
                    ) : (
                      comments.map((comment) => (
                        <article key={comment.id} className="glass-surface rounded-2xl px-4 py-3">
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
                      className="glass-input min-w-0 flex-1 rounded-2xl px-4 py-3 text-sm"
                      disabled={actionBusy}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (commentText.trim()) {
                          onAddComment(commentText);
                          setCommentText("");
                        }
                      }}
                      className="glass-button-primary inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold"
                      disabled={actionBusy}
                    >
                      <Send className="h-4 w-4" />
                      {actionBusy ? "Sending..." : "Send"}
                    </button>
                  </div>
                </div>

                <div className="glass-card rounded-[24px] p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Attachments</h3>
                      <p className="mt-1 text-sm text-slate-500">{attachmentCountLabel}</p>
                    </div>
                    <Paperclip className="h-4 w-4 text-slate-400" />
                  </div>

                  <div className="space-y-2">
                    {attachments.length === 0 ? (
                      <p className="glass-surface rounded-2xl border-dashed px-4 py-4 text-sm text-slate-500">No attachments uploaded.</p>
                    ) : (
                      attachments.map((attachment) => (
                        <a
                          key={attachment.id}
                          href={attachment.filePath}
                          target="_blank"
                          rel="noreferrer"
                          className="glass-surface flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm transition hover:bg-white/85"
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
                      className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-white/75 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-white"
                      disabled={actionBusy}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedFile) {
                          onUploadAttachment(selectedFile);
                          setSelectedFile(null);
                        }
                      }}
                      className="glass-button-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold"
                      disabled={actionBusy}
                    >
                      <Upload className="h-4 w-4" />
                      {actionBusy ? "Uploading..." : "Upload"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <aside className="border-t border-white/40 bg-white/28 px-6 py-5 xl:border-l xl:border-t-0 xl:px-5 backdrop-blur-md">
            <div className="glass-card rounded-[24px] p-4">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Status</span>
                  <span className="glass-pill rounded-full px-2.5 py-1 font-medium text-slate-800">
                    {String(task.status || "todo").replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    Approval
                    <InfoTip text="Approval means the submission has been reviewed by a mentor or manager." />
                  </span>
                  <span className="glass-pill rounded-full px-2.5 py-1 font-medium capitalize text-slate-800">
                    {String(task.approvalStatus || "not-requested").replace(/-/g, " ")}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Role</span>
                  <span className="glass-pill rounded-full px-2.5 py-1 font-medium text-slate-800">{currentUserRole}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Updated</span>
                  <span className="glass-pill rounded-full px-2.5 py-1 font-medium text-slate-800">
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
                      className="glass-button-primary w-full rounded-2xl px-4 py-3 text-sm font-semibold"
                      disabled={actionBusy}
                    >
                      {actionBusy ? "Saving..." : "Save changes"}
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="glass-button-secondary w-full rounded-2xl px-4 py-3 text-sm font-semibold"
                      disabled={actionBusy}
                    >
                      Close edit
                    </button>
                  </>
                ) : (
                  <>
                    {canEditTask && (
                      <>
                        <button
                          type="button"
                          onClick={onStartEdit}
                          className="glass-button-primary w-full rounded-2xl px-4 py-3 text-sm font-semibold"
                          disabled={actionBusy}
                        >
                          Edit task
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(task.id)}
                          className="w-full rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm font-semibold text-rose-700 backdrop-blur-sm transition hover:bg-rose-100"
                          disabled={actionBusy}
                        >
                          {actionBusy ? "Working..." : "Delete task"}
                        </button>
                      </>
                    )}

                  </>
                )}
              </div>

              {task.mentorNote && (
                <div className="mt-5 rounded-2xl border border-white/45 bg-white/70 p-4 text-sm leading-6 text-slate-700 whitespace-pre-wrap backdrop-blur-sm">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Mentor note</p>
                  {task.mentorNote}
                </div>
              )}

              {task.rejectionReason && String(task.status || "").toLowerCase() === "rejected" && (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em]">Rejection reason</p>
                  <p>{task.rejectionReason}</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
