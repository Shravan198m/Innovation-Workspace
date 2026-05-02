export default function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`rounded-[22px] border border-slate-200/95 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.09)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_46px_rgba(15,23,42,0.14)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
