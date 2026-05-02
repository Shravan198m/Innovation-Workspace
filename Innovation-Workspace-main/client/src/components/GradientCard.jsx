import Card from "./ui/Card";

export default function GradientCard({ children, className = "", ...props }) {
  return (
    <Card
      className={`border-0 bg-[#1e3a8a] text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] ${className}`}
      {...props}
    >
      {children}
    </Card>
  );
}