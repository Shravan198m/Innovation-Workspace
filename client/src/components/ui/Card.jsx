export default function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`glass-card rounded-2xl border border-white/50 bg-white/78 shadow-[0_12px_32px_rgba(15,23,42,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.16)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
