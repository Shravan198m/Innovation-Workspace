function getInitials(value) {
  const source = String(value || "").trim();
  if (!source) {
    return "--";
  }

  const words = source.replace(/[@._-]+/g, " ").split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return source.slice(0, 2).toUpperCase();
  }

  return words.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("");
}

function getMemberLabel(member, index) {
  const rawValue = String(member?.name || member?.usn || member?.email || `Member ${index + 1}`).trim();
  if (rawValue.includes("@")) {
    return rawValue.split("@")[0].replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
  }
  return rawValue;
}

export default function AvatarGroup({ members = [] }) {
  const visibleMembers = Array.isArray(members) ? members.slice(0, 3) : [];
  const remainingCount = Math.max(0, (Array.isArray(members) ? members.length : 0) - visibleMembers.length);

  if (!visibleMembers.length) {
    return null;
  }

  return (
    <div className="mt-4 flex items-center gap-2">
      {visibleMembers.map((member, index) => {
        const label = getMemberLabel(member, index);
        const initials = getInitials(label);

        return (
          <span
            key={`${label}-${index}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-[10px] font-semibold text-white shadow-sm"
            aria-label={`Team member ${index + 1}`}
          >
            {initials}
          </span>
        );
      })}
      {remainingCount > 0 && (
        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 px-2 text-[10px] font-semibold text-slate-600 shadow-sm">
          +{remainingCount}
        </span>
      )}
    </div>
  );
}
