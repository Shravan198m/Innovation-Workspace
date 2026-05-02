import Card from "./ui/Card";

export default function StatsCard({ label, value, helper = "", accentClass = "text-slate-900", className = "" }) {
  return (
    <Card className={`p-4 ${className}`}>
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className={`mt-1 text-[2rem] leading-none font-semibold ${accentClass}`}>{value}</p>
      {helper ? <p className="mt-1 text-sm text-slate-500">{helper}</p> : null}
    </Card>
  );
}