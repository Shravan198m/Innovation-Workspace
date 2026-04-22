import { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import { getApiErrorMessage } from "../services/apiError";
import socket from "../socket";

function getCurrentUserId() {
  try {
    const raw = localStorage.getItem("innovationHubAuth");
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed?.user?.id ? Number(parsed.user.id) : null;
  } catch {
    return null;
  }
}

export default function ChatPanel({ projectId, className = "", compact = false }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const scrollRef = useRef(null);
  const currentUserId = useMemo(() => getCurrentUserId(), []);

  const getDisplayName = (entry) => {
    if (!entry) {
      return "Unknown";
    }

    if (currentUserId && Number(entry.userId) === Number(currentUserId)) {
      return `You${entry.userName ? ` • ${entry.userName}` : ""}`;
    }

    return entry.userName || "Unknown";
  };

  useEffect(() => {
    let mounted = true;

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/chat/${projectId}`);
        if (mounted) {
          setMessages(Array.isArray(response.data) ? response.data : []);
          setError("");
        }
      } catch (fetchError) {
        if (mounted) {
          setMessages([]);
          setError(getApiErrorMessage(fetchError, "Failed to load chat messages."));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const handleMessageAdded = (payload) => {
      if (String(payload?.projectId) !== String(projectId)) {
        return;
      }
      setMessages((prev) => [...prev, payload]);
    };

    socket.on("chatMessageAdded", handleMessageAdded);
    fetchMessages();

    return () => {
      mounted = false;
      socket.off("chatMessageAdded", handleMessageAdded);
    };
  }, [projectId]);

  useEffect(() => {
    if (!scrollRef.current) {
      return;
    }
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  const sendMessage = async () => {
    const content = text.trim();
    if (!content || sending) {
      return;
    }

    setSending(true);
    try {
      await api.post(`/chat/${projectId}`, { message: content });
      setText("");
      setError("");
    } catch (sendError) {
      setError(getApiErrorMessage(sendError, "Failed to send message."));
    } finally {
      setSending(false);
    }
  };

  return (
    <aside className={`glass-card flex h-full min-h-0 flex-col rounded-[22px] p-4 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className={`font-semibold uppercase text-slate-500 ${compact ? "text-xs tracking-[0.14em]" : "text-sm tracking-[0.2em]"}`}>
            Team Chat
          </h3>
          <p className="text-[11px] text-slate-500">Group conversation</p>
        </div>
        <span className="glass-pill rounded-full px-2.5 py-1 text-xs font-semibold">{messages.length}</span>
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-auto rounded-xl bg-[linear-gradient(180deg,rgba(241,245,249,0.75)_0%,rgba(226,232,240,0.45)_100%)] p-2">
        {loading ? (
          <p className="glass-surface rounded-xl border-dashed px-3 py-3 text-sm text-slate-500">Loading chat...</p>
        ) : messages.length === 0 ? (
          <div className="glass-surface rounded-xl border-dashed px-4 py-5 text-center text-sm text-slate-500">
            <p className="text-base font-semibold text-slate-700">No messages yet</p>
            <p className="mt-1">Start the conversation with your team.</p>
          </div>
        ) : (
          messages.map((entry) => {
            const isOwn = currentUserId && Number(entry.userId) === Number(currentUserId);
            return (
              <article
                key={entry.id}
                className={`rounded-2xl px-3 py-2.5 ${
                  isOwn
                    ? "ml-10 border border-emerald-200 bg-emerald-100/95 text-emerald-950 shadow-[0_8px_20px_rgba(16,185,129,0.15)]"
                    : "mr-10 border border-white/60 bg-white/90 text-slate-800 shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`truncate text-xs font-semibold uppercase tracking-[0.08em] ${isOwn ? "text-emerald-700" : "text-slate-500"}`}>
                      {getDisplayName(entry)}
                    </p>
                    {entry.userRole && (
                      <p className={`text-[11px] ${isOwn ? "text-emerald-700/80" : "text-slate-400"}`}>
                        {entry.userRole}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${isOwn ? "bg-emerald-200 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
                    {isOwn ? "You" : "Member"}
                  </span>
                </div>

                <p className="text-sm leading-5">{entry.message}</p>
                <p className={`mt-2 text-right text-[11px] ${isOwn ? "text-emerald-700" : "text-slate-500"}`}>
                  {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "Just now"}
                </p>
              </article>
            );
          })
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Type a message..."
          className="glass-input min-w-0 flex-1 rounded-xl px-3 py-2 text-sm"
          disabled={sending}
        />
        <button
          type="button"
          onClick={sendMessage}
          className="glass-button-primary rounded-xl px-3 py-2 text-sm font-semibold"
          disabled={sending || !text.trim()}
        >
          {sending ? "..." : "Send"}
        </button>
      </div>
    </aside>
  );
}
