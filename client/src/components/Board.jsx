import { useEffect, useMemo, useState } from "react";
import { DndContext, closestCenter, useDroppable } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import api from "../services/api";
import socket from "../socket";
import TaskCard from "./TaskCard";
import TaskModal from "./TaskModal";
import FilterBar from "./FilterBar";

const columns = ["TASK", "IN PROGRESS", "REVIEW", "COMPLETED"];
const BOARD_THEMES = {
  "from-emerald-600 to-teal-500": {
    canvas:
      "bg-[radial-gradient(circle_at_8%_12%,rgba(16,185,129,0.22),transparent_32%),radial-gradient(circle_at_92%_18%,rgba(20,184,166,0.2),transparent_36%),linear-gradient(145deg,#f0fdf9_0%,#ecfeff_100%)]",
    panel: "border-emerald-200 bg-emerald-50/70",
    roleBadge: "border-emerald-200 bg-emerald-100 text-emerald-800",
    idleColumn: "border-emerald-200 bg-emerald-50/65 shadow-[0_12px_30px_rgba(5,150,105,0.12)]",
    dragColumn: "border-emerald-300 bg-emerald-100/90 shadow-[0_16px_40px_rgba(16,185,129,0.2)]",
    header: "bg-gradient-to-r from-emerald-700 to-teal-600",
  },
  "from-blue-700 to-sky-500": {
    canvas:
      "bg-[radial-gradient(circle_at_10%_10%,rgba(59,130,246,0.24),transparent_34%),radial-gradient(circle_at_88%_20%,rgba(14,165,233,0.2),transparent_35%),linear-gradient(150deg,#eff6ff_0%,#e0f2fe_100%)]",
    panel: "border-blue-200 bg-blue-50/70",
    roleBadge: "border-blue-200 bg-blue-100 text-blue-800",
    idleColumn: "border-blue-200 bg-blue-50/65 shadow-[0_12px_30px_rgba(37,99,235,0.12)]",
    dragColumn: "border-sky-300 bg-sky-100/90 shadow-[0_16px_40px_rgba(14,165,233,0.2)]",
    header: "bg-gradient-to-r from-blue-700 to-sky-600",
  },
  "from-violet-700 to-fuchsia-500": {
    canvas:
      "bg-[radial-gradient(circle_at_12%_8%,rgba(139,92,246,0.24),transparent_34%),radial-gradient(circle_at_90%_20%,rgba(217,70,239,0.18),transparent_34%),linear-gradient(145deg,#f5f3ff_0%,#fdf4ff_100%)]",
    panel: "border-violet-200 bg-violet-50/70",
    roleBadge: "border-violet-200 bg-violet-100 text-violet-800",
    idleColumn: "border-violet-200 bg-violet-50/65 shadow-[0_12px_30px_rgba(124,58,237,0.13)]",
    dragColumn: "border-fuchsia-300 bg-fuchsia-100/90 shadow-[0_16px_40px_rgba(192,38,211,0.2)]",
    header: "bg-gradient-to-r from-violet-700 to-fuchsia-600",
  },
  "from-cyan-700 to-teal-500": {
    canvas:
      "bg-[radial-gradient(circle_at_10%_10%,rgba(6,182,212,0.22),transparent_34%),radial-gradient(circle_at_90%_18%,rgba(20,184,166,0.2),transparent_34%),linear-gradient(150deg,#ecfeff_0%,#f0fdfa_100%)]",
    panel: "border-cyan-200 bg-cyan-50/70",
    roleBadge: "border-cyan-200 bg-cyan-100 text-cyan-800",
    idleColumn: "border-cyan-200 bg-cyan-50/65 shadow-[0_12px_30px_rgba(8,145,178,0.12)]",
    dragColumn: "border-teal-300 bg-teal-100/90 shadow-[0_16px_40px_rgba(20,184,166,0.2)]",
    header: "bg-gradient-to-r from-cyan-700 to-teal-600",
  },
  "from-emerald-700 to-green-500": {
    canvas:
      "bg-[radial-gradient(circle_at_8%_10%,rgba(34,197,94,0.22),transparent_32%),radial-gradient(circle_at_88%_22%,rgba(16,185,129,0.18),transparent_34%),linear-gradient(150deg,#f0fdf4_0%,#ecfdf5_100%)]",
    panel: "border-green-200 bg-green-50/70",
    roleBadge: "border-green-200 bg-green-100 text-green-800",
    idleColumn: "border-green-200 bg-green-50/65 shadow-[0_12px_30px_rgba(22,163,74,0.12)]",
    dragColumn: "border-emerald-300 bg-emerald-100/90 shadow-[0_16px_40px_rgba(16,185,129,0.2)]",
    header: "bg-gradient-to-r from-green-700 to-emerald-600",
  },
  "from-pink-700 to-rose-500": {
    canvas:
      "bg-[radial-gradient(circle_at_8%_10%,rgba(236,72,153,0.2),transparent_32%),radial-gradient(circle_at_90%_22%,rgba(244,63,94,0.2),transparent_36%),linear-gradient(145deg,#fdf2f8_0%,#fff1f2_100%)]",
    panel: "border-pink-200 bg-pink-50/70",
    roleBadge: "border-pink-200 bg-pink-100 text-pink-800",
    idleColumn: "border-pink-200 bg-pink-50/65 shadow-[0_12px_30px_rgba(225,29,72,0.12)]",
    dragColumn: "border-rose-300 bg-rose-100/90 shadow-[0_16px_40px_rgba(244,63,94,0.2)]",
    header: "bg-gradient-to-r from-pink-700 to-rose-600",
  },
  "from-orange-600 to-amber-500": {
    canvas:
      "bg-[radial-gradient(circle_at_8%_10%,rgba(249,115,22,0.24),transparent_34%),radial-gradient(circle_at_90%_18%,rgba(245,158,11,0.22),transparent_34%),linear-gradient(150deg,#fff7ed_0%,#fffbeb_100%)]",
    panel: "border-orange-200 bg-orange-50/70",
    roleBadge: "border-orange-200 bg-orange-100 text-orange-800",
    idleColumn: "border-orange-200 bg-orange-50/65 shadow-[0_12px_30px_rgba(234,88,12,0.13)]",
    dragColumn: "border-amber-300 bg-amber-100/90 shadow-[0_16px_40px_rgba(245,158,11,0.2)]",
    header: "bg-gradient-to-r from-orange-600 to-amber-500",
  },
};
const initialTasks = [
  {
    id: "1",
    title: "Design UI",
    description: "Create the first polished interface for the project board.",
    dueDate: "2026-04-25",
    assignee: "Priya Rao",
    comments: [
      { id: "c1", author: "Mentor", text: "Focus on spacing and hierarchy first." },
    ],
    status: "TASK",
    order: 0,
    approvalStatus: "not-requested",
    mentorNote: "Good progress, keep the board clean and minimal.",
    updatedAt: "",
  },
  {
    id: "2",
    title: "Setup Backend",
    description: "Prepare APIs, authentication, and task persistence.",
    dueDate: "2026-04-28",
    assignee: "Vinay Kumar",
    comments: [],
    status: "IN PROGRESS",
    order: 0,
    approvalStatus: "not-requested",
    mentorNote: "",
    updatedAt: "",
  },
];

const defaultTaskFields = {
  description: "",
  dueDate: "",
  assignee: "",
  comments: [],
  approvalStatus: "not-requested",
  mentorNote: "",
  updatedAt: "",
};

function normalizeTask(task) {
  return {
    ...defaultTaskFields,
    ...task,
    description: task.description || "",
    dueDate: task.dueDate || "",
    assignee: task.assignee || "",
    comments: Array.isArray(task.comments) ? task.comments : [],
    mentorNote: task.mentorNote || "",
    approvalStatus: task.approvalStatus || "not-requested",
    updatedAt: task.updatedAt || "",
  };
}

function BoardColumn({
  column,
  columnTasks,
  boardTheme,
  inputVisible,
  inputText,
  onToggleInput,
  onChange,
  onKeyDown,
  onAddTask,
  onOpenTask,
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column });

  return (
    <article
      ref={setNodeRef}
      className={`w-[20rem] rounded-2xl border p-3 transition-all duration-150 ${
        isOver ? boardTheme.dragColumn : "border-white/60 bg-slate-100/95 shadow-[0_10px_26px_rgba(15,23,42,0.09)]"
      }`}
    >
      <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-200/90 px-3 py-2 text-slate-700">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-slate-500" />
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em]">{column}</h3>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
          {columnTasks.length}
        </span>
      </div>

      <SortableContext items={columnTasks.map((task) => String(task.id))} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {columnTasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={() => onOpenTask(task)} />
          ))}
        </div>
      </SortableContext>

      {inputVisible[column] ? (
        <>
          <input
            value={inputText[column] || ""}
            onChange={(event) => onChange(column, event.target.value)}
            onKeyDown={(event) => onKeyDown(event, column)}
            placeholder="Enter task..."
            className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
          />

          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAddTask(column)}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
              disabled={!(inputText[column] || "").trim()}
            >
              Add
            </button>

            <button
              type="button"
              onClick={() => onToggleInput(column)}
              className="rounded-lg px-2 py-1 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => onToggleInput(column)}
          className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition duration-150 hover:bg-slate-200/80 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          + Add a card
        </button>
      )}
    </article>
  );
}

export default function Board({
  currentUserRole = "STUDENT",
  projectId = "default",
  projectAccent = "from-cyan-700 to-teal-500",
}) {
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [restrictionMessage, setRestrictionMessage] = useState("");
  const [inputVisible, setInputVisible] = useState({});
  const [inputText, setInputText] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [deleteConfirmTaskId, setDeleteConfirmTaskId] = useState(null);
  const [taskComments, setTaskComments] = useState([]);
  const [taskAttachments, setTaskAttachments] = useState([]);
  const [taskModalLoading, setTaskModalLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [serverSearchIds, setServerSearchIds] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [taskDraft, setTaskDraft] = useState({
    title: "",
    description: "",
    dueDate: "",
    assignee: "",
    mentorNote: "",
  });

  const filteredTasks = useMemo(() => {
    const search = debouncedSearchQuery.trim().toLowerCase();
    const member = memberFilter.trim().toLowerCase();
    const hasServerSearch = search && projectId !== "default" && serverSearchIds instanceof Set;

    return tasks
      .filter((task) => {
        if (!search) {
          return true;
        }

        if (hasServerSearch) {
          return serverSearchIds.has(String(task.id));
        }

        return [task.title, task.description, task.assignee]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      })
      .filter((task) => (statusFilter ? task.status === statusFilter : true))
      .filter((task) => {
        if (!member) {
          return true;
        }

        return String(task.assignee || "").toLowerCase().includes(member);
      });
  }, [tasks, debouncedSearchQuery, statusFilter, memberFilter, projectId, serverSearchIds]);

  const tasksByColumn = useMemo(() => {
    return columns.reduce((acc, column) => {
      acc[column] = filteredTasks
        .filter((task) => task.status === column)
        .sort((a, b) => a.order - b.order);
      return acc;
    }, {});
  }, [filteredTasks]);

  const memberOptions = useMemo(() => {
    const names = new Set(
      tasks
        .map((task) => String(task.assignee || "").trim())
        .filter(Boolean)
    );

    return [...names].sort((a, b) => a.localeCompare(b));
  }, [tasks]);

  const boardTheme = BOARD_THEMES[projectAccent] || BOARD_THEMES["from-cyan-700 to-teal-500"];

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const query = debouncedSearchQuery.trim();

    if (!query || projectId === "default") {
      setServerSearchIds(null);
      setSearchLoading(false);
      return;
    }

    let isMounted = true;
    setSearchLoading(true);

    api
      .get("/tasks/search", {
        params: {
          q: query,
          projectId,
        },
      })
      .then((response) => {
        if (!isMounted) {
          return;
        }

        const ids = Array.isArray(response.data)
          ? response.data.map((task) => String(task.id))
          : [];
        setServerSearchIds(new Set(ids));
      })
      .catch(() => {
        if (isMounted) {
          // Fallback to client-side search when API search is unavailable.
          setServerSearchIds(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setSearchLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedSearchQuery, projectId]);

  useEffect(() => {
    let isMounted = true;

    const loadTasks = async () => {
      setLoadingTasks(true);
      setRestrictionMessage("");

      if (projectId === "default") {
        setTasks(initialTasks.map(normalizeTask));
        setLoadingTasks(false);
        return;
      }

      try {
        const response = await api.get(`/tasks/${projectId}`);
        if (!isMounted) {
          return;
        }

        if (Array.isArray(response.data)) {
          setTasks(response.data.map(normalizeTask));
        } else {
          setTasks([]);
        }
      } catch {
        if (isMounted) {
          setTasks(initialTasks.map(normalizeTask));
          setRestrictionMessage("Using offline task data. Start backend to sync tasks.");
        }
      } finally {
        if (isMounted) {
          setLoadingTasks(false);
        }
      }
    };

    loadTasks();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  useEffect(() => {
    if (!projectId || projectId === "default") {
      return undefined;
    }

    const refreshBoard = async (payload) => {
      if (String(payload?.projectId) !== String(projectId)) {
        return;
      }

      try {
        const response = await api.get(`/tasks/${projectId}`);
        if (Array.isArray(response.data)) {
          setTasks(response.data.map(normalizeTask));
        }
      } catch {
        // Keep local state if sync fetch fails.
      }
    };

    socket.on("taskUpdated", refreshBoard);

    return () => {
      socket.off("taskUpdated", refreshBoard);
    };
  }, [projectId]);

  useEffect(() => {
    try {
      if (!selectedTaskId) {
        return;
      }

      const exists = tasks.some((task) => String(task.id) === String(selectedTaskId));
      if (!exists) {
        closeTaskModal();
      }
    } catch {
      setSelectedTaskId(null);
    }
  }, [tasks, selectedTaskId]);

  const toggleInput = (column) => {
    setInputVisible((prev) => ({ ...prev, [column]: !prev[column] }));
  };

  const handleChange = (column, value) => {
    setInputText((prev) => ({ ...prev, [column]: value }));
  };

  const addTask = async (column) => {
    const title = (inputText[column] || "").trim();
    if (!title) {
      return;
    }

    try {
      const response = await api.post("/tasks", {
        title,
        status: column,
        description: "",
        dueDate: null,
        assignee: "",
        comments: [],
        approvalStatus: column === "REVIEW" ? "requested" : "not-requested",
        mentorNote: currentUserRole === "MENTOR" ? "Review when ready." : "",
        order: tasksByColumn[column].length,
        projectId,
      });

      setTasks((prev) => [...prev, normalizeTask(response.data)]);
      setInputText((prev) => ({ ...prev, [column]: "" }));
      setInputVisible((prev) => ({ ...prev, [column]: false }));
    } catch {
      setRestrictionMessage("Could not create task. Check backend connection.");
    }
  };

  const handleKeyDown = (event, column) => {
    if (event.key === "Enter") {
      addTask(column);
    }
  };

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) || null;
  const editingTask = tasks.find((task) => task.id === editingTaskId) || null;
  const deleteConfirmTask =
    tasks.find((task) => task.id === deleteConfirmTaskId) || null;

  const refreshTaskDetails = async (taskId, fallbackTask = null) => {
    if (!taskId || projectId === "default") {
      setTaskComments(fallbackTask?.comments || []);
      setTaskAttachments([]);
      setTaskModalLoading(false);
      return;
    }

    setTaskModalLoading(true);

    try {
      const [commentsResponse, attachmentsResponse] = await Promise.all([
        api.get(`/tasks/${taskId}/comments`),
        api.get(`/tasks/${taskId}/attachments`),
      ]);

      setTaskComments(Array.isArray(commentsResponse.data) ? commentsResponse.data : []);
      setTaskAttachments(Array.isArray(attachmentsResponse.data) ? attachmentsResponse.data : []);
    } catch {
      setTaskComments(fallbackTask?.comments || []);
      setTaskAttachments([]);
    } finally {
      setTaskModalLoading(false);
    }
  };

  const openTaskModal = async (task) => {
    setSelectedTaskId(task.id);
    setEditingTaskId(null);
    setDeleteConfirmTaskId(null);
    setTaskComments(task.comments || []);
    setTaskAttachments([]);
    setTaskModalLoading(true);
    setTaskDraft({
      title: task.title,
      description: task.description || "",
      dueDate: task.dueDate || "",
      assignee: task.assignee || "",
      mentorNote: task.mentorNote || "",
      status: task.status || "TASK",
    });

    await refreshTaskDetails(task.id, task);
  };

  const closeTaskModal = () => {
    setSelectedTaskId(null);
    setEditingTaskId(null);
    setDeleteConfirmTaskId(null);
    setTaskComments([]);
    setTaskAttachments([]);
    setTaskModalLoading(false);
    setTaskDraft({ title: "", description: "", dueDate: "", assignee: "", mentorNote: "", status: "TASK" });
  };

  const startEditingTask = () => {
    if (!selectedTask) {
      return;
    }

    setEditingTaskId(selectedTask.id);
    setTaskDraft({
      title: selectedTask.title,
      description: selectedTask.description || "",
      dueDate: selectedTask.dueDate || "",
      assignee: selectedTask.assignee || "",
      mentorNote: selectedTask.mentorNote || "",
      status: selectedTask.status || "TASK",
    });
  };

  const saveTaskChanges = async () => {
    if (!editingTask) {
      return;
    }

    const nextTitle = taskDraft.title.trim();
    if (!nextTitle) {
      setRestrictionMessage("Task title cannot be empty.");
      return;
    }

    try {
      const response = await api.put(`/tasks/${editingTask.id}`, {
        title: nextTitle,
        description: taskDraft.description.trim(),
        dueDate: taskDraft.dueDate || null,
        assignee: taskDraft.assignee.trim(),
        mentorNote: taskDraft.mentorNote.trim(),
        status: taskDraft.status,
      });

      setTasks((prev) =>
        prev.map((task) =>
          String(task.id) === String(editingTask.id)
            ? normalizeTask(response.data)
            : task
        )
      );
      setSelectedTaskId(response.data.id);
      setTaskDraft({
        title: response.data.title || "",
        description: response.data.description || "",
        dueDate: response.data.dueDate || "",
        assignee: response.data.assignee || "",
        mentorNote: response.data.mentorNote || "",
        status: response.data.status || "TASK",
      });
      setRestrictionMessage("");
      setEditingTaskId(null);
      await refreshTaskDetails(response.data.id, response.data);
    } catch {
      setRestrictionMessage("Could not save task changes.");
    }
  };

  const requestDeleteTask = (taskId) => {
    setDeleteConfirmTaskId(taskId);
  };

  const deleteTask = async (taskId) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks((prev) => prev.filter((task) => String(task.id) !== String(taskId)));
      if (selectedTaskId === taskId) {
        closeTaskModal();
      }
      setDeleteConfirmTaskId(null);
    } catch {
      setRestrictionMessage("Could not delete task.");
    }
  };

  const addComment = async (taskId) => {
    if (!taskId) {
      return;
    }

    const comment = typeof taskId === "string" ? taskId.trim() : "";
    if (!comment) {
      return;
    }

    try {
      await api.post(`/tasks/${selectedTask?.id}/comments`, {
        comment,
      });

      await refreshTaskDetails(selectedTask?.id);
      setRestrictionMessage("");
    } catch {
      setRestrictionMessage("Could not add comment.");
    }
  };

  const uploadAttachment = async (file) => {
    if (!selectedTask || !file) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      await api.post(`/tasks/${selectedTask.id}/attachments`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      await refreshTaskDetails(selectedTask.id);
      setRestrictionMessage("");
    } catch {
      setRestrictionMessage("Could not upload attachment.");
    }
  };

  const requestMentorReview = async (taskId) => {
    try {
      const response = await api.put(`/tasks/${taskId}`, {
        status: "REVIEW",
        approvalStatus: "requested",
      });

      setTasks((prev) =>
        prev.map((task) =>
          String(task.id) === String(taskId)
            ? normalizeTask(response.data)
            : task
        )
      );
      setRestrictionMessage("Task sent for mentor review.");
      if (selectedTaskId && String(selectedTaskId) === String(taskId)) {
        await refreshTaskDetails(taskId, response.data);
      }
    } catch {
      setRestrictionMessage("Could not request mentor review.");
    }
  };

  const approveTask = async (taskId) => {
    if (currentUserRole !== "MENTOR") {
      setRestrictionMessage("Only mentor can approve tasks.");
      return;
    }

    try {
      const response = await api.put(`/tasks/${taskId}`, {
        status: "COMPLETED",
        approvalStatus: "approved",
      });

      setTasks((prev) =>
        prev.map((task) =>
          String(task.id) === String(taskId)
            ? normalizeTask(response.data)
            : task
        )
      );
      setRestrictionMessage("Task approved and completed.");
      if (selectedTaskId && String(selectedTaskId) === String(taskId)) {
        await refreshTaskDetails(taskId, response.data);
      }
    } catch {
      setRestrictionMessage("Could not approve task.");
    }
  };

  const moveToReview = async (taskId) => {
    try {
      const response = await api.put(`/tasks/${taskId}`, {
        status: "REVIEW",
        approvalStatus: "requested",
      });

      setTasks((prev) =>
        prev.map((task) =>
          String(task.id) === String(taskId)
            ? normalizeTask(response.data)
            : task
        )
      );
      setRestrictionMessage("Task moved to mentor review.");
      if (selectedTaskId && String(selectedTaskId) === String(taskId)) {
        await refreshTaskDetails(taskId, response.data);
      }
    } catch {
      setRestrictionMessage("Could not move task to review.");
    }
  };

  const normalizeColumn = (columnTasks, status) => {
    return columnTasks.map((task, index) => ({
      ...task,
      status,
      order: index,
    }));
  };

  const reorderTasks = (allTasks, activeId, overId) => {
    const activeTask = allTasks.find((task) => String(task.id) === String(activeId));
    const overTask = allTasks.find((task) => String(task.id) === String(overId));

    if (!activeTask) {
      return null;
    }

    const sourceColumn = activeTask.status;
    const destinationColumn = overTask?.status || (columns.includes(String(overId)) ? String(overId) : sourceColumn);

    if (destinationColumn === "COMPLETED" && currentUserRole !== "MENTOR") {
      setRestrictionMessage("Only mentor can move tasks to Completed.");
      return null;
    }

    const now = new Date().toISOString();
    const activeIdString = String(activeTask.id);

    const sourceColumnTasks = allTasks
      .filter((task) => task.status === sourceColumn)
      .sort((a, b) => a.order - b.order);

    const destinationColumnTasks = allTasks
      .filter((task) => task.status === destinationColumn && String(task.id) !== activeIdString)
      .sort((a, b) => a.order - b.order);

    if (sourceColumn === destinationColumn) {
      const oldIndex = sourceColumnTasks.findIndex((task) => String(task.id) === activeIdString);
      const newIndex = sourceColumnTasks.findIndex((task) => String(task.id) === String(overId));

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
        return null;
      }

      const reorderedColumn = arrayMove(sourceColumnTasks, oldIndex, newIndex).map((task, index) =>
        normalizeTask({
          ...task,
          status: sourceColumn,
          order: index,
          updatedAt: now,
        })
      );

      const nextTasks = columns.flatMap((column) => {
        if (column === sourceColumn) {
          return reorderedColumn;
        }

        return allTasks
          .filter((task) => task.status === column && String(task.id) !== activeIdString)
          .sort((a, b) => a.order - b.order)
          .map((task, index) =>
            normalizeTask({
              ...task,
              status: column,
              order: index,
            })
          );
      });

      return { nextTasks };
    }

    let insertIndex = destinationColumnTasks.length;
    if (overTask && overTask.status === destinationColumn) {
      const matchedIndex = destinationColumnTasks.findIndex((task) => String(task.id) === String(overId));
      insertIndex = matchedIndex >= 0 ? matchedIndex : destinationColumnTasks.length;
    }

    const movedTask = normalizeTask({
      ...activeTask,
      status: destinationColumn,
      approvalStatus:
        destinationColumn === "REVIEW"
          ? "requested"
          : destinationColumn === "COMPLETED"
            ? currentUserRole === "MENTOR"
              ? "approved"
              : activeTask.approvalStatus
            : activeTask.approvalStatus,
      updatedAt: now,
    });

    const nextDestinationTasks = [...destinationColumnTasks];
    nextDestinationTasks.splice(insertIndex, 0, movedTask);

    const nextTasks = columns.flatMap((column) => {
      if (column === sourceColumn) {
        return allTasks
          .filter((task) => task.status === sourceColumn && String(task.id) !== activeIdString)
          .sort((a, b) => a.order - b.order)
          .map((task, index) =>
            normalizeTask({
              ...task,
              status: sourceColumn,
              order: index,
              updatedAt: now,
            })
          );
      }

      if (column === destinationColumn) {
        return nextDestinationTasks.map((task, index) =>
          normalizeTask({
            ...task,
            status: destinationColumn,
            order: index,
          })
        );
      }

      return allTasks
        .filter((task) => task.status === column)
        .sort((a, b) => a.order - b.order)
        .map((task, index) =>
          normalizeTask({
            ...task,
            status: column,
            order: index,
          })
        );
    });

    return { nextTasks };
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || String(active.id) === String(over.id)) {
      return;
    }

    const outcome = reorderTasks(tasks, active.id, over.id);
    if (!outcome) {
      return;
    }

    const { nextTasks } = outcome;
    setRestrictionMessage("");
    setTasks(nextTasks);

    api
      .put("/tasks/reorder", {
        tasks: nextTasks.map((task) => ({
          id: Number(task.id),
          status: task.status,
          order: task.order,
          approvalStatus: task.approvalStatus,
        })),
      })
      .catch(() => {
        setRestrictionMessage("Task moved locally, but failed to sync order to backend.");
      });
  };

  const renderTaskBadge = (task) => {
    if (task.status === "REVIEW" && task.approvalStatus !== "approved") {
      return (
        <span className="text-[10px] uppercase tracking-wide bg-orange/15 text-orange px-2 py-1 rounded-full">
          Mentor review pending
        </span>
      );
    }

    if (task.status === "COMPLETED") {
      return (
        <span className="text-[10px] uppercase tracking-wide bg-green/15 text-green px-2 py-1 rounded-full">
          Completed
        </span>
      );
    }

    return (
      <span className="text-[10px] uppercase tracking-wide bg-slate-100 text-slate-500 px-2 py-1 rounded-full">
        In flow
      </span>
    );
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <section className={`relative h-full overflow-x-auto rounded-[24px] p-4 sm:p-6 ${boardTheme.canvas}`}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[24px]">
          <div className="absolute -left-12 -top-12 h-44 w-44 rounded-full bg-white/25 blur-2xl" />
          <div className="absolute -right-10 bottom-0 h-52 w-52 rounded-full bg-white/20 blur-2xl" />
        </div>
        <div className="relative space-y-4">
          <div className={`flex flex-col gap-3 rounded-2xl border px-4 py-4 shadow-sm backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between ${boardTheme.panel}`}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Project board</p>
              <p className="mt-1 text-sm text-slate-600">
                Trello-style execution board with clear lanes, fast drag-drop, and clean card hierarchy.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold ${boardTheme.roleBadge}`}>
                Role: {currentUserRole}
              </span>
              <button
                type="button"
                onClick={() => toggleInput("TASK")}
                className="rounded-full border border-white/40 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-white"
              >
                + Quick Task
              </button>
            </div>
          </div>

          {restrictionMessage && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800 shadow-sm">
              {restrictionMessage}
            </div>
          )}

          {loadingTasks && (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
              Loading tasks...
            </div>
          )}

          <FilterBar
            search={searchQuery}
            setSearch={setSearchQuery}
            status={statusFilter}
            setStatus={setStatusFilter}
            member={memberFilter}
            setMember={setMemberFilter}
            memberOptions={memberOptions}
            resultCount={filteredTasks.length}
            totalCount={tasks.length}
            searchLoading={searchLoading}
            onClear={() => {
              setSearchQuery("");
              setDebouncedSearchQuery("");
              setStatusFilter("");
              setMemberFilter("");
              setServerSearchIds(null);
              setSearchLoading(false);
            }}
          />

          <div className="relative overflow-hidden rounded-[26px] border border-white/40 bg-[linear-gradient(160deg,rgba(255,255,255,0.5),rgba(255,255,255,0.14))] p-4 shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
            <div className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full border border-white/35 bg-white/10" />
            <div className="pointer-events-none absolute -bottom-28 right-20 h-80 w-80 rounded-full border border-white/25" />

            <div className="relative flex min-w-max gap-4 pb-2">
              {columns.map((col) => (
                <BoardColumn
                  key={col}
                  column={col}
                  columnTasks={tasksByColumn[col]}
                  boardTheme={boardTheme}
                  inputVisible={inputVisible}
                  inputText={inputText}
                  onToggleInput={toggleInput}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onAddTask={addTask}
                  onOpenTask={openTaskModal}
                />
              ))}
            </div>

            {!loadingTasks && filteredTasks.length === 0 && (
              <div className="relative mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/85 px-4 py-6 text-center text-sm text-slate-500">
                No tasks match these filters. Try clearing one or more filters.
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => toggleInput("TASK")}
          className="fixed bottom-6 right-6 z-40 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.28)] transition hover:-translate-y-0.5 hover:bg-slate-700"
        >
          + Add Task
        </button>

        {selectedTask && (
          <TaskModal
            task={{
              ...selectedTask,
              comments: taskComments,
              attachments: taskAttachments,
            }}
            loading={taskModalLoading}
            currentUserRole={currentUserRole}
            isEditing={Boolean(editingTask)}
            taskDraft={taskDraft}
            setTaskDraft={setTaskDraft}
            comments={taskComments}
            attachments={taskAttachments}
            onClose={closeTaskModal}
            onStartEdit={startEditingTask}
            onSave={saveTaskChanges}
            onDelete={requestDeleteTask}
            onRequestReview={requestMentorReview}
            onApprove={approveTask}
            onAddComment={addComment}
            onUploadAttachment={uploadAttachment}
          />
        )}

        {deleteConfirmTask && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Delete task?</h3>
              <p className="mt-2 text-sm text-slate-600">
                This will permanently remove “{deleteConfirmTask.title}” from the board.
              </p>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTaskId(null)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deleteTask(deleteConfirmTask.id)}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </DndContext>
  );
}
