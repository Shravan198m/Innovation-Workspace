export default function SectionWrapper({ children, className = "", as: Component = "section", ...props }) {
  return (
    <Component className={`mx-auto w-full max-w-[1100px] px-4 py-12 sm:px-6 lg:px-8 ${className}`} {...props}>
      {children}
    </Component>
  );
}