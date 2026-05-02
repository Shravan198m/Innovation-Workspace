import { useLayoutEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";

export default function PageWrapper({ children }) {
  const location = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    const scrollContainers = document.querySelectorAll(".app-page, main");
    scrollContainers.forEach((element) => {
      if (element instanceof HTMLElement) {
        element.scrollTop = 0;
        element.scrollLeft = 0;
      }
    });
  }, [location.pathname]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}
