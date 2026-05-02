import { useEffect, useMemo, useState } from "react";
import { DndContext, closestCenter, useDroppable } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { AnimatePresence } from "framer-motion";
import api from "../services/api";
import socket from "../socket";
import TaskCard from "./TaskCard";
import TaskModal from "./TaskModal";
import FilterBar from "./FilterBar";
import SkeletonCard from "./SkeletonCard";
import InfoTip from "./InfoTip";
import { getApiErrorMessage } from "../services/apiError";
import {
  canReviewWork,
  canManageTasks as canManageTaskRole,
  canCreateDailyTask,
  canCreateWeeklyTask,
  canApproveDailyReports,
  canApproveWeeklyReports,
  isManagerRole,
  isMemberRole,
  getRoleLabel,
  normalizeRole,
} from "../utils/roles";

const columns = ["todo", "submitted", "completed", "rejected"];
const columnLabels = {
  todo: "To Do",
  submitted: "Submitted",
  completed: "Completed",
  rejected: "Rejected",
};
const statusMeta = {
  todo: {
    dot: "bg-slate-500",
    bar: "bg-slate-500",
    chip: "bg-slate-50 text-slate-700 border-slate-200",
    panel: "border-slate-200 bg-slate-50/75",
  },
  submitted: {
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    panel: "border-slate-200 bg-slate-50/75",
  },
  completed: {
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    panel: "border-slate-200 bg-slate-50/75",
  },
  rejected: {
    dot: "bg-rose-500",
    bar: "bg-rose-500",
    chip: "bg-rose-50 text-rose-700 border-rose-200",
    panel: "border-slate-200 bg-slate-50/75",
  },
};
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
const defaultTaskFields = {
  description: "",
  dueDate: "",
  taskType: "weekly",
  createdBy: "",
  assignee: "",
  comments: [],
  approvalStatus: "not-requested",
  rejectionReason: "",
  mentorNote: "",
  updatedAt: "",
};

function normalizeTaskType(taskType) {
  return String(taskType || "weekly").trim().toLowerCase() === "daily" ? "daily" : "weekly";
}

function getAutoDueDate(taskType) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  if (normalizeTaskType(taskType) === "weekly") {
    date.setDate(date.getDate() + 7);
  }
  return date.toISOString().slice(0, 10);
}

function normalizeTaskStatus(status) {
  const normalizedStatus = String(status || "todo").trim().toLowerCase();
  if (normalizedStatus === "approved") {
    return "completed";
  }

  return columns.includes(normalizedStatus) ? normalizedStatus : "todo";
}

function formatDisplayName(value, fallback = "") {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return fallback;
  }

  const source = normalized.includes("@") ? normalized.split("@")[0] : normalized;
  return source
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function toComparableLabel(value) {
  return formatDisplayName(value).trim().toLowerCase();
}

function normalizeTask(task) {
  return {
    ...defaultTaskFields,
    ...task,
    description: task.description || "",
    dueDate: task.dueDate || "",
    taskType: normalizeTaskType(task.taskType),
    createdBy: task.createdBy || "",
    assignee: task.assignee || "",
    comments: Array.isArray(task.comments) ? task.comments : [],
    status: normalizeTaskStatus(task.status),
    mentorNote: task.mentorNote || "",
    rejectionReason: task.rejectionReason || "",
    approvalStatus: task.approvalStatus || "not-requested",
    updatedAt: task.updatedAt || "",
  };
}

function flattenBoardPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.all)) {
    return payload.all;
  }

  const grouped = payload.grouped || payload;
  const buckets = [grouped.tasks, grouped.dailyReports, grouped.weeklyReports, grouped.weeklyTasks];
  return buckets.flatMap((items) => (Array.isArray(items) ? items : []));
}

function BoardColumn({
  column,
  columnTasks,
  totalTasks,
  canCreateTask,
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
  const progress = totalTasks > 0 ? Math.min(100, Math.round((columnTasks.length / totalTasks) * 100)) : 0;
  const meta = statusMeta[column] || statusMeta.todo;

  return (
    <article
      ref={setNodeRef}
      className={`flex min-h-[420px] flex-col rounded-2xl border p-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-all duration-150 ${meta.panel} ${
        isOver ? "ring-2 ring-cyan-200 shadow-[0_18px_40px_rgba(8,145,178,0.14)]" : "shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
      }`}
    >
      <div className={`mb-3 rounded-xl border px-3 py-2 text-slate-700 ${meta.panel}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{columnLabels[column] || column}</h3>
          </div>
          <span className="glass-pill rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm">{columnTasks.length}</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-slate-200/90">
          <div className={`h-1.5 rounded-full transition-all duration-300 ${meta.bar}`} style={{ width: `${progress}%` }} />
        </div>
      </div>

      <SortableContext items={columnTasks.map((task) => String(task.id))} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-3">
          {columnTasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={() => onOpenTask(task)} />
          ))}
        </div>
      </SortableContext>

      {inputVisible[column] && canCreateTask ? (
        <>
          <input
            value={inputText[column] || ""}
            onChange={(event) => onChange(column, event.target.value)}
            onKeyDown={(event) => onKeyDown(event, column)}
            placeholder="Enter task title..."
            className="glass-input mt-3 w-full rounded-xl px-3 py-2 text-sm"
          />

          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAddTask(column)}
              className="glass-button-primary rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              disabled={!canCreateTask || !(inputText[column] || "").trim()}
            >
              + Add Task
            </button>

            <button
              type="button"
              onClick={() => onToggleInput(column)}
              className="glass-button-secondary rounded-lg px-2 py-1 text-sm"
            >
              Cancel
            </button>
          </div>
        </>
      ) : canCreateTask ? (
        <button
          type="button"
          onClick={() => onToggleInput(column)}
          disabled={!canCreateTask}
          className="mt-3 w-full rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-3 py-2 text-center text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          + Add Task
        </button>
      ) : null}
    </article>
  );
}

export default function Board({
  currentUserRole = "student",
  currentUserName = "",
  currentUserEmail = "",
  projectId = null,
  projectAccent = "from-cyan-700 to-teal-500",
}) {
  const normalizedRole = normalizeRole(currentUserRole);
  const isStudent = isMemberRole(normalizedRole);
  const isManager = isManagerRole(currentUserRole);
  const canReviewTasks = canReviewWork(currentUserRole);
  const canReviewDailyTasks = canApproveDailyReports(currentUserRole);
  const canReviewWeeklyTasks = canApproveWeeklyReports(currentUserRole);
  const canManageTaskBoard = canManageTaskRole(currentUserRole) || isManager;
  const canCreateDailyTasks = canCreateDailyTask(currentUserRole);
  const canCreateWeeklyTasks = canCreateWeeklyTask(currentUserRole);
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
  const [taskActionBusy, setTaskActionBusy] = useState(false);
  const [todoTaskType, setTodoTaskType] = useState("weekly");
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
    const hasServerSearch = search && Boolean(projectId) && serverSearchIds instanceof Set;

    return tasks
      .filter((task) => {
        if (!search) {
          return true;
        }

        if (hasServerSearch) {
          return serverSearchIds.has(String(task.id));
        }

        return [task.title, task.description, formatDisplayName(task.assignee)]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      })
      .filter((task) => (statusFilter ? task.status === statusFilter : true))
      .filter((task) => {
        if (!member) {
          return true;
        }

        return toComparableLabel(task.assignee).includes(member);
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
        .map((task) => formatDisplayName(task.assignee))
        .filter(Boolean)
    );

    return [...names].sort((a, b) => a.localeCompare(b));
  }, [tasks]);

  const boardTheme = BOARD_THEMES[projectAccent] || BOARD_THEMES["from-cyan-700 to-teal-500"];
  const totalBoardTasks = filteredTasks.length;

  const isOwnTask = (task) => {
    const assignee = toComparableLabel(task?.assignee);
    const userName = toComparableLabel(currentUserName);
    const userEmail = String(currentUserEmail || "").trim().toLowerCase();
    return Boolean(assignee) && (assignee === userName || assignee === userEmail);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const query = debouncedSearchQuery.trim();

    if (!query || !projectId) {
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

      if (!projectId) {
        setTasks([]);
        setRestrictionMessage("No project selected.");
        setLoadingTasks(false);
        return;
      }

      try {
        const response = await api.get(`/projects/${projectId}/board`);
        if (!isMounted) {
          return;
        }

        const items = flattenBoardPayload(response.data);
        setTasks(items.map(normalizeTask));
      } catch (error) {
        try {
          const fallbackResponse = await api.get(`/tasks/${projectId}`);
          if (!isMounted) {
            return;
          }

          const fallbackItems = Array.isArray(fallbackResponse.data) ? fallbackResponse.data : [];
          setTasks(fallbackItems.map(normalizeTask));
        } catch (fallbackError) {
          if (isMounted) {
            setTasks([]);
            setRestrictionMessage(getApiErrorMessage(fallbackError, "Failed to load tasks from backend."));
          }
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
    if (!projectId) {
      return undefined;
    }

    const refreshBoard = async (payload) => {
      if (String(payload?.projectId) !== String(projectId)) {
        return;
      }

      try {
        const response = await api.get(`/projects/${projectId}/board`);
        const items = flattenBoardPayload(response.data);
        setTasks(items.map(normalizeTask));
      } catch {
        try {
          const fallbackResponse = await api.get(`/tasks/${projectId}`);
          if (Array.isArray(fallbackResponse.data)) {
            setTasks(fallbackResponse.data.map(normalizeTask));
          }
        } catch {
          // Keep local state if sync fetch fails.
        }
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

  const openTodoInputForType = (taskType) => {
    setTodoTaskType(normalizeTaskType(taskType));
    setInputVisible((prev) => ({ ...prev, todo: true }));
  };

  const handleChange = (column, value) => {
    setInputText((prev) => ({ ...prev, [column]: value }));
  };

  const addTask = async (column, taskTypeOverride = null) => {
    const normalizedTaskType = column === "todo"
      ? normalizeTaskType(taskTypeOverride || todoTaskType)
      : "weekly";

    if (normalizedTaskType === "daily" && !canCreateDailyTasks) {
      setRestrictionMessage("Only team lead can create daily tasks.");
      return;
    }

    if (normalizedTaskType === "weekly" && !canCreateWeeklyTasks) {
      setRestrictionMessage("Only manager can create weekly tasks.");
      return;
    }

    if (column !== "todo") {
      setRestrictionMessage("Tasks can be created only in To Do.");
      return;
    }

    const title = (inputText[column] || "").trim();
    if (!title || taskActionBusy) {
      return;
    }

    const autoDueDate = getAutoDueDate(normalizedTaskType);

    setTaskActionBusy(true);
    try {
      const response = await api.post("/tasks", {
        title,
        status: column,
        description: "",
        dueDate: autoDueDate,
        taskType: normalizedTaskType,
        assignee: "",
        comments: [],
        approvalStatus: column === "submitted" ? "requested" : "not-requested",
        mentorNote: "",
        order: tasksByColumn[column].length,
        projectId,
      });

      setTasks((prev) => [...prev, normalizeTask(response.data)]);
      setInputText((prev) => ({ ...prev, [column]: "" }));
      setInputVisible((prev) => ({ ...prev, [column]: false }));
      setRestrictionMessage("");
    } catch (error) {
      setRestrictionMessage(getApiErrorMessage(error, "Could not create task. Check backend connection."));
    } finally {
      setTaskActionBusy(false);
    }
  };

  const handleKeyDown = (event, column) => {
    if (event.key === "Enter") {
      addTask(column, column === "todo" ? todoTaskType : "weekly");
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
    } catch (error) {
      setTaskComments(fallbackTask?.comments || []);
      setTaskAttachments([]);
      setRestrictionMessage(getApiErrorMessage(error, "Could not load task details."));
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
      status: task.status || "todo",
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
    setTaskDraft({ title: "", description: "", dueDate: "", assignee: "", mentorNote: "", status: "todo" });
  };

  const startEditingTask = () => {
    if (!selectedTask) {
      return;
    }

    if (!canManageTaskBoard) {
      setRestrictionMessage("Only manager or team lead can edit tasks.");
      return;
    }

    setEditingTaskId(selectedTask.id);
    setTaskDraft({
      title: selectedTask.title,
      description: selectedTask.description || "",
      dueDate: selectedTask.dueDate || "",
      assignee: selectedTask.assignee || "",
      mentorNote: selectedTask.mentorNote || "",
      status: selectedTask.status || "todo",
    });
  };

  const saveTaskChanges = async () => {
    if (!editingTask || taskActionBusy) {
      return;
    }

    const nextTitle = taskDraft.title.trim();
    if (!nextTitle) {
      setRestrictionMessage("Task title cannot be empty.");
      return;
    }

    setTaskActionBusy(true);
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
        status: response.data.status || "todo",
      });
      setRestrictionMessage("");
      setEditingTaskId(null);
      await refreshTaskDetails(response.data.id, response.data);
    } catch (error) {
      setRestrictionMessage(getApiErrorMessage(error, "Could not save task changes."));
    } finally {
      setTaskActionBusy(false);
    }
  };

  const requestDeleteTask = (taskId) => {
    if (!isManager) {
      setRestrictionMessage("Only manager can delete tasks.");
      return;
    }

    setDeleteConfirmTaskId(taskId);
  };

  const deleteTask = async (taskId) => {
    if (taskActionBusy) {
      return;
    }

    setTaskActionBusy(true);
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks((prev) => prev.filter((task) => String(task.id) !== String(taskId)));
      if (selectedTaskId === taskId) {
        closeTaskModal();
      }
      setDeleteConfirmTaskId(null);
    } catch (error) {
      setRestrictionMessage(getApiErrorMessage(error, "Could not delete task."));
    } finally {
      setTaskActionBusy(false);
    }
  };

  const addComment = async (taskId) => {
    if (!taskId || taskActionBusy) {
      return;
    }

    const comment = typeof taskId === "string" ? taskId.trim() : "";
    if (!comment) {
      return;
    }

    setTaskActionBusy(true);
    try {
      await api.post(`/tasks/${selectedTask?.id}/comments`, {
        comment,
      });

      await refreshTaskDetails(selectedTask?.id);
      setRestrictionMessage("");
    } catch (error) {
      setRestrictionMessage(getApiErrorMessage(error, "Could not add comment."));
    } finally {
      setTaskActionBusy(false);
    }
  };

  const uploadAttachment = async (file) => {
    if (!selectedTask || !file || taskActionBusy) {
      return;
    }

    setTaskActionBusy(true);
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
    } catch (error) {
      setRestrictionMessage(getApiErrorMessage(error, "Could not upload attachment."));
    } finally {
      setTaskActionBusy(false);
    }
  };

  const submitTask = async (taskId) => {
    const task = tasks.find((entry) => String(entry.id) === String(taskId));
    if (!task) {
      return;
    }

    if (!(isStudent && isOwnTask(task))) {
      setRestrictionMessage("Members can submit only their own tasks.");
      return;
    }

    if (taskActionBusy) {
      return;
    }

    setTaskActionBusy(true);
    try {
      const response = await api.put(`/tasks/${taskId}`, {
        status: "submitted",
        approvalStatus: "requested",
      });

      setTasks((prev) =>
        prev.map((task) =>
          String(task.id) === String(taskId)
            ? normalizeTask(response.data)
            : task
        )
      );
      setRestrictionMessage("Task submitted for review.");
      if (selectedTaskId && String(selectedTaskId) === String(taskId)) {
        await refreshTaskDetails(taskId, response.data);
      }
    } catch (error) {
      setRestrictionMessage(getApiErrorMessage(error, "Could not submit task for review."));
    } finally {
      setTaskActionBusy(false);
    }
  };

  const approveTask = async (taskId) => {
    const task = tasks.find((entry) => String(entry.id) === String(taskId));
    if (!task) {
      return;
    }

    const taskType = String(task.taskType || task.type || "weekly").toLowerCase();
    const taskStatus = String(task.status || "").toLowerCase();
    const canApproveDaily = taskType === "daily" && canReviewDailyTasks && taskStatus === "submitted";
    const canApproveWeekly = taskType === "weekly" && canReviewWeeklyTasks && taskStatus === "submitted";

    if (!canApproveDaily && !canApproveWeekly) {
      setRestrictionMessage(taskType === "daily" ? "Only team lead can approve daily tasks." : "Only mentor or manager can approve weekly tasks.");
      return;
    }

    if (taskActionBusy) {
      return;
    }

    setTaskActionBusy(true);
    try {
      const response = await api.put(`/tasks/${taskId}`, {
        status: "completed",
      });

      setTasks((prev) =>
        prev.map((task) =>
          String(task.id) === String(taskId)
            ? normalizeTask(response.data)
            : task
        )
      );
      setRestrictionMessage("Task approved.");
      if (selectedTaskId && String(selectedTaskId) === String(taskId)) {
        await refreshTaskDetails(taskId, response.data);
      }
    } catch (error) {
      setRestrictionMessage(getApiErrorMessage(error, "Could not approve task."));
    } finally {
      setTaskActionBusy(false);
    }
  };

  const rejectTask = async (taskId) => {
    const task = tasks.find((entry) => String(entry.id) === String(taskId));
    if (!task) {
      return;
    }

    const taskType = String(task.taskType || task.type || "weekly").toLowerCase();
    const taskStatus = String(task.status || "").toLowerCase();
    const canRejectDaily = taskType === "daily" && canReviewDailyTasks && taskStatus === "submitted";
    const canRejectWeekly = taskType === "weekly" && canReviewWeeklyTasks && taskStatus === "submitted";

    if (!canRejectDaily && !canRejectWeekly) {
      setRestrictionMessage(taskType === "daily" ? "Only team lead can reject daily tasks." : "Only mentor or manager can reject weekly tasks.");
      return;
    }

    if (taskActionBusy) {
      return;
    }

    const reason = window.prompt("Enter rejection reason") || "";
    if (!reason.trim()) {
      setRestrictionMessage("Rejection reason is required.");
      return;
    }

    setTaskActionBusy(true);
    try {
      const response = await api.put(`/tasks/${taskId}`, {
        status: "rejected",
        rejectionReason: reason.trim(),
      });

      setTasks((prev) =>
        prev.map((task) =>
          String(task.id) === String(taskId)
            ? normalizeTask(response.data)
            : task
        )
      );
      setRestrictionMessage("Task rejected.");
      if (selectedTaskId && String(selectedTaskId) === String(taskId)) {
        await refreshTaskDetails(taskId, response.data);
      }
    } catch (error) {
      setRestrictionMessage(getApiErrorMessage(error, "Could not reject task."));
    } finally {
      setTaskActionBusy(false);
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

    if (!canManageTaskBoard) {
      setRestrictionMessage("Only manager or team lead can move tasks.");
      return null;
    }

    if (normalizedRole === "mentor") {
      const mentorAllowedMove = sourceColumn === "submitted" && ["submitted", "completed", "rejected"].includes(destinationColumn);
      if (!mentorAllowedMove) {
        setRestrictionMessage("Mentor can only review submitted tasks (approve/reject).");
        return null;
      }
    }

    if (normalizedRole === "team_lead" && (destinationColumn === "rejected" || destinationColumn === "completed")) {
      setRestrictionMessage("Team lead cannot move tasks to rejected or completed.");
      return null;
    }

    if ((destinationColumn === "rejected" || destinationColumn === "completed") && !isManager) {
      setRestrictionMessage("Only manager can move tasks to rejected or completed.");
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
        destinationColumn === "submitted"
          ? "requested"
          : destinationColumn === "rejected" || destinationColumn === "completed"
            ? canReviewTasks
              ? (destinationColumn === "completed" ? "approved" : "rejected")
              : activeTask.approvalStatus
            : activeTask.approvalStatus,
      rejectionReason: destinationColumn === "rejected" ? (activeTask.rejectionReason || "Rejected by reviewer") : "",
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
      .catch((error) => {
        setRestrictionMessage(getApiErrorMessage(error, "Task moved locally, but failed to sync order to backend."));
      });
  };

  const renderTaskBadge = (task) => {
    if (task.status === "submitted" && task.approvalStatus !== "approved") {
      const taskType = String(task.taskType || task.type || "weekly").toLowerCase();
      return (
        <span className="rounded-full bg-orange/15 px-2 py-1 text-[10px] uppercase tracking-wide text-orange-700">
          {taskType === "daily" ? "Team lead review pending" : "Weekly review pending"}
        </span>
      );
    }

    if (task.status === "approved") {
      return (
        <span className="rounded-full bg-green-100 px-2 py-1 text-[10px] uppercase tracking-wide text-green-700">
          Approved
        </span>
      );
    }

    if (task.status === "completed") {
      return (
        <span className="rounded-full bg-cyan-100 px-2 py-1 text-[10px] uppercase tracking-wide text-cyan-700">
          Completed
        </span>
      );
    }

    if (task.status === "rejected") {
      return (
        <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] uppercase tracking-wide text-rose-700">
          Rejected
        </span>
      );
    }

    return (
      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">
        In flow
      </span>
    );
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <section className="app-section relative h-full overflow-hidden rounded-[24px] p-4 sm:p-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[24px]">
          <div className="absolute -left-12 -top-12 h-44 w-44 rounded-full bg-blue-200/35 blur-2xl" />
          <div className="absolute -right-10 bottom-0 h-52 w-52 rounded-full bg-teal-200/30 blur-2xl" />
        </div>
        <div className="relative space-y-4">
          <div className="glass-card flex flex-col gap-3 rounded-2xl px-4 py-4 shadow-sm backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="label-caps">Project board</p>
              <p className="mt-1 text-sm text-slate-600">
                Execution board where managers create weekly work, team leads create daily work, and members track progress.
              </p>
              <p className="mt-2 inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                Tip: Drag flow is To Do {">"} Submitted {">"} Completed or Rejected.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold ${boardTheme.roleBadge}`}>
                Role: {getRoleLabel(currentUserRole)}
                <span className="ml-1.5">
                  <InfoTip text="Members submit assigned work, team leads approve daily tasks, and weekly tasks move through mentor then manager approval." />
                </span>
              </span>
              {canCreateDailyTasks && (
                <button
                  type="button"
                  onClick={() => openTodoInputForType("daily")}
                  className="glass-button-primary rounded-full px-3 py-1 text-xs font-semibold text-white"
                >
                  + Daily Task
                </button>
              )}
              {canCreateWeeklyTasks && (
                <button
                  type="button"
                  onClick={() => openTodoInputForType("weekly")}
                  className="glass-button-primary rounded-full px-3 py-1 text-xs font-semibold text-white"
                >
                  + Weekly Task
                </button>
              )}
              <InfoTip text="Members submit their assigned work; team leads handle daily reviews, and mentors/managers handle weekly reviews." />
            </div>
          </div>

          {restrictionMessage && (
            <div className="glass-card rounded-2xl px-4 py-3 text-sm text-orange-800 shadow-sm">
              {restrictionMessage}
            </div>
          )}

          {loadingTasks && (
            <div className="glass-card rounded-2xl px-4 py-3 text-sm text-slate-600 shadow-sm">
              Loading tasks...
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
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

          <div className="glass-panel relative overflow-hidden rounded-[26px] p-4 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-md">
            <div className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full border border-white/30 bg-white/10" />
            <div className="pointer-events-none absolute -bottom-28 right-20 h-80 w-80 rounded-full border border-white/20" />

            <div className="relative grid gap-4 pb-2 sm:grid-cols-2 xl:grid-cols-4">
              {columns.map((col) => (
                <BoardColumn
                  key={col}
                  column={col}
                  columnTasks={tasksByColumn[col]}
                  totalTasks={totalBoardTasks}
                  canCreateTask={(canCreateDailyTasks || canCreateWeeklyTasks) && col === "todo"}
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
              <div className="relative mt-4 rounded-2xl border border-dashed border-white/45 bg-white/72 px-4 py-6 text-center text-sm text-slate-500 backdrop-blur-sm">
                <p className="text-base font-semibold text-slate-700">No tasks yet</p>
                <p className="mt-2 text-sm text-slate-500">Start by adding your first task.</p>
              </div>
            )}
          </div>
        </div>

        {canCreateWeeklyTasks && (
          <button
            type="button"
            onClick={() => openTodoInputForType("weekly")}
            className="glass-button-primary fixed bottom-6 right-6 z-40 rounded-full px-5 py-3 text-sm font-semibold"
          >
            + Add Task
          </button>
        )}

        <AnimatePresence mode="wait">
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
              onSubmitTask={submitTask}
              onApprove={approveTask}
              onReject={rejectTask}
              onAddComment={addComment}
              onUploadAttachment={uploadAttachment}
              actionBusy={taskActionBusy}
              canEditTask={canManageTaskBoard}
            />
          )}
        </AnimatePresence>

        {deleteConfirmTask && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
            <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl">
              <h3 className="text-lg font-semibold text-slate-900">Delete task?</h3>
              <p className="mt-2 text-sm text-slate-600">
                This will permanently remove “{deleteConfirmTask.title}” from the board.
              </p>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTaskId(null)}
                  className="glass-button-secondary rounded-md px-4 py-2 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deleteTask(deleteConfirmTask.id)}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
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
