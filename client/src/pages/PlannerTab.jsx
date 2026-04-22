import { useEffect, useMemo, useState } from "react";
import { Calendar, Views, momentLocalizer } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Card from "../components/ui/Card";
import { getApiErrorMessage } from "../services/apiError";
import { normalizeRole } from "../utils/roles";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "../styles/planner.css";

moment.updateLocale("en", {
  week: {
    dow: 1,
  },
});

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

function parseDateTime(value) {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

function buildFallbackWindow(task) {
  const dueDate = parseDateTime(task?.dueDate) || new Date();
  const start = new Date(dueDate);
  start.setHours(9, 0, 0, 0);

  if (String(task?.taskType || "").toLowerCase() === "weekly") {
    start.setHours(11, 0, 0, 0);
  }

  const end = new Date(start);
  end.setHours(start.getHours() + 1);
  return { start, end };
}

function buildEvent(task) {
  const explicitStart = parseDateTime(task.startTime);
  const explicitEnd = parseDateTime(task.endTime);

  let start = explicitStart;
  let end = explicitEnd;

  if (!start || !end) {
    const fallback = buildFallbackWindow(task);
    start = start || fallback.start;
    end = end || fallback.end;
  }

  if (end <= start) {
    end = new Date(start);
    end.setHours(start.getHours() + 1);
  }

  return {
    id: String(task.id),
    title: task.title,
    start,
    end,
    resource: task,
  };
}

export default function PlannerTab({ projectId, currentUserRole, currentUserName = "", currentUserEmail = "" }) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState("create");
  const [editor, setEditor] = useState({
    title: "",
    description: "",
    assignee: "",
    taskType: "daily",
    dueDate: "",
    startTime: "",
    endTime: "",
  });
  const normalizedRole = normalizeRole(currentUserRole);
  const canManagePlanner = normalizedRole === "admin" || normalizedRole === "team_lead";

  const toInputDateTime = (value) => {
    const parsed = parseDateTime(value);
    if (!parsed) {
      return "";
    }

    const pad = (item) => String(item).padStart(2, "0");
    const year = parsed.getFullYear();
    const month = pad(parsed.getMonth() + 1);
    const day = pad(parsed.getDate());
    const hour = pad(parsed.getHours());
    const minute = pad(parsed.getMinutes());
    return `${year}-${month}-${day}T${hour}:${minute}`;
  };

  const refreshTasks = async () => {
    try {
      const response = await api.get(`/tasks/${projectId}`);
      const allTasks = Array.isArray(response.data) ? response.data : [];

      const visibleTasks = normalizedRole === "student"
        ? allTasks.filter((task) => {
            const assignee = String(task.assignee || "").trim().toLowerCase();
            return assignee && (
              assignee === String(currentUserName || "").trim().toLowerCase() ||
              assignee === String(currentUserEmail || "").trim().toLowerCase()
            );
          })
        : allTasks;

      setTasks(visibleTasks);
      setMessage("");
    } catch (error) {
      setTasks([]);
      setMessage(getApiErrorMessage(error, "Failed to load planner tasks."));
    }
  };

  useEffect(() => {
    let mounted = true;

    const fetchTasks = async () => {
      await refreshTasks();
      if (mounted) {
        setLoading(false);
      }
    };

    fetchTasks();

    return () => {
      mounted = false;
    };
  }, [projectId, normalizedRole, currentUserName, currentUserEmail]);

  const events = useMemo(() => tasks.map(buildEvent), [tasks]);

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setEditorMode("edit");
    setEditorOpen(true);
    const task = event.resource;
    setEditor({
      title: task.title || "",
      description: task.description || "",
      assignee: task.assignee || "",
      taskType: String(task.taskType || "daily").toLowerCase() === "weekly" ? "weekly" : "daily",
      dueDate: task.dueDate ? String(task.dueDate).slice(0, 10) : "",
      startTime: toInputDateTime(event.start),
      endTime: toInputDateTime(event.end),
    });
  };

  const saveTaskSchedule = async (taskId, start, end) => {
    if (!canManagePlanner) {
      setMessage("Only manager or team lead can reschedule tasks.");
      return;
    }

    setSaving(true);
    try {
      await api.put(`/tasks/${taskId}`, {
        startTime: new Date(start).toISOString(),
        endTime: new Date(end).toISOString(),
      });
      await refreshTasks();
      setMessage("Task schedule updated.");
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Failed to update task schedule."));
    } finally {
      setSaving(false);
    }
  };

  const handleEventDrop = async ({ event, start, end }) => {
    await saveTaskSchedule(event.resource.id, start, end);
  };

  const handleEventResize = async ({ event, start, end }) => {
    await saveTaskSchedule(event.resource.id, start, end);
  };

  const handleSelectSlot = ({ start, end }) => {
    if (!canManagePlanner) {
      return;
    }

    setSelectedEvent(null);
    setEditorMode("create");
    setEditorOpen(true);
    setEditor((prev) => ({
      ...prev,
      title: "",
      description: "",
      assignee: "",
      startTime: toInputDateTime(start),
      endTime: toInputDateTime(end),
      dueDate: toInputDateTime(end).slice(0, 10),
      taskType: "daily",
    }));
  };

  const handleCreateTaskFromPlanner = async () => {
    if (!canManagePlanner) {
      return;
    }

    if (!editor.title.trim()) {
      setMessage("Task title is required.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/tasks", {
        title: editor.title.trim(),
        description: editor.description.trim(),
        assignee: editor.assignee.trim(),
        taskType: editor.taskType,
        dueDate: editor.dueDate || null,
        startTime: editor.startTime ? new Date(editor.startTime).toISOString() : null,
        endTime: editor.endTime ? new Date(editor.endTime).toISOString() : null,
        status: "todo",
        projectId,
      });

      await refreshTasks();
      setMessage("Task created from planner.");
      setEditorOpen(false);
      setEditor((prev) => ({
        ...prev,
        title: "",
        description: "",
        assignee: "",
      }));
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Failed to create planner task."));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSelectedDetails = async () => {
    if (!canManagePlanner || !selectedEvent?.resource?.id) {
      return;
    }

    if (!editor.title.trim()) {
      setMessage("Task title is required.");
      return;
    }

    setSaving(true);
    try {
      await api.put(`/tasks/${selectedEvent.resource.id}`, {
        title: editor.title.trim(),
        description: editor.description.trim(),
        assignee: editor.assignee.trim(),
        taskType: editor.taskType,
        dueDate: editor.dueDate || null,
        startTime: editor.startTime ? new Date(editor.startTime).toISOString() : null,
        endTime: editor.endTime ? new Date(editor.endTime).toISOString() : null,
      });

      await refreshTasks();
      setMessage("Planner details saved.");
      setEditorOpen(false);
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Failed to save planner details."));
    } finally {
      setSaving(false);
    }
  };

  const eventPropGetter = (event) => {
    const status = String(event?.resource?.status || "todo").toLowerCase();
    const now = new Date();
    const overdue = status !== "completed" && event.end < now;

    let background = "linear-gradient(135deg, #2563eb, #14b8a6)";

    if (status === "completed") {
      background = "linear-gradient(135deg, #16a34a, #22c55e)";
    } else if (status === "rejected") {
      background = "linear-gradient(135deg, #dc2626, #fb7185)";
    } else if (status === "submitted") {
      background = "linear-gradient(135deg, #d97706, #f59e0b)";
    }

    return {
      style: {
        background,
        borderRadius: "10px",
        border: overdue ? "2px solid #ef4444" : "none",
        color: "#fff",
        padding: "2px 6px",
      },
    };
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-[24px] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Planner</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Weekly Task Calendar</h2>
            <p className="mt-1 text-sm text-slate-600">Mon to Sun, 9 AM to 5 PM, click events to open task context.</p>
          </div>

          <div className="flex gap-2 text-xs">
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-semibold text-blue-700">To Do</span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-semibold text-amber-700">Submitted</span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">Completed</span>
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-semibold text-rose-700">Rejected</span>
          </div>
        </div>
      </Card>

      {message && <Card className="rounded-[16px] px-4 py-3 text-sm text-slate-700">{message}</Card>}

      <Card className="planner-shell rounded-[24px] p-4">
        {loading ? (
          <div className="flex h-[72vh] items-center justify-center text-slate-500">Loading planner...</div>
        ) : (
          <div className="h-[72vh]">
            <DnDCalendar
              localizer={localizer}
              events={events}
              defaultView={Views.WEEK}
              views={[Views.WEEK, Views.DAY]}
              startAccessor="start"
              endAccessor="end"
              step={60}
              timeslots={1}
              min={new Date(1970, 1, 1, 9, 0, 0)}
              max={new Date(1970, 1, 1, 17, 0, 0)}
              eventPropGetter={eventPropGetter}
              selectable={canManagePlanner}
              resizable={canManagePlanner}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              popup
            />
          </div>
        )}
      </Card>

      {canManagePlanner && editorOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
          <Card className="w-full max-w-xl rounded-[22px] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Planner Action</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">
                  {editorMode === "edit" ? "Edit Task" : "Create Task"}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {editorMode === "edit"
                    ? "Update only the necessary details for this slot."
                    : "Add quick task details for the selected day/time."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="glass-button-secondary rounded-lg px-3 py-1.5 text-sm font-semibold"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-2.5 md:grid-cols-2">
              <input
                value={editor.title}
                onChange={(event) => setEditor((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Task title"
                className="glass-input rounded-xl px-3 py-2 text-sm"
              />
              <input
                value={editor.assignee}
                onChange={(event) => setEditor((prev) => ({ ...prev, assignee: event.target.value }))}
                placeholder="Assignee"
                className="glass-input rounded-xl px-3 py-2 text-sm"
              />
              <input
                type="datetime-local"
                value={editor.startTime}
                onChange={(event) => setEditor((prev) => ({ ...prev, startTime: event.target.value }))}
                className="glass-input rounded-xl px-3 py-2 text-sm"
              />
              <input
                type="datetime-local"
                value={editor.endTime}
                onChange={(event) => setEditor((prev) => ({ ...prev, endTime: event.target.value }))}
                className="glass-input rounded-xl px-3 py-2 text-sm"
              />
              <textarea
                value={editor.description}
                onChange={(event) => setEditor((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Task details"
                className="glass-input min-h-[80px] rounded-xl px-3 py-2 text-sm md:col-span-2"
              />
            </div>

            <div className="mt-4 flex gap-2">
              {editorMode === "edit" ? (
                <button
                  type="button"
                  onClick={handleSaveSelectedDetails}
                  disabled={saving}
                  className="glass-button-primary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateTaskFromPlanner}
                  disabled={saving}
                  className="glass-button-primary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  {saving ? "Creating..." : "Create"}
                </button>
              )}
            </div>
          </Card>
        </div>
      )}

      {selectedEvent && (
        <Card className="rounded-[24px] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Selected Event</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">{selectedEvent.resource.title}</h3>
              <p className="mt-1 text-sm text-slate-600">
                {moment(selectedEvent.start).format("ddd, MMM D • h:mm A")} - {moment(selectedEvent.end).format("h:mm A")}
              </p>
              <p className="mt-1 text-sm text-slate-600">Status: {selectedEvent.resource.status}</p>
              <p className="mt-1 text-sm text-slate-600">Assignee: {selectedEvent.resource.assignee || "Unassigned"}</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate(`/projects/${projectId}/board`)}
                className="glass-button-primary rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Open Task Board
              </button>
              <button
                type="button"
                onClick={() => navigate(`/projects/${projectId}/reports`)}
                className="glass-button-secondary rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Open Reports
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
