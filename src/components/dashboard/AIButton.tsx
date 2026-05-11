import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../../components/Button";

export default function AIButton() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="flex items-center bg-[#EDEEEB] overflow-hidden cursor-pointer border border-[#CECECE]"
      style={{ height: "42px", borderRadius: "21px" }}
    >
      <Button 
        variant="icon" 
        onClick={() => {}} 
        className="shrink-0 flex items-center justify-center text-black"
        style={{ width: "42px", height: "42px" }}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <rect width="16" height="16" x="4" y="4" rx="2"/>
          <rect width="6" height="6" x="9" y="9" rx="1"/>
          <path d="M15 2v2"/>
          <path d="M15 20v2"/>
          <path d="M2 15h2"/>
          <path d="M2 9h2"/>
          <path d="M20 15h2"/>
          <path d="M20 9h2"/>
          <path d="M9 2v2"/>
          <path d="M9 20v2"/>
        </svg>
      </Button>
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "auto", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden whitespace-nowrap"
          >
            <span className="text-black font-medium text-sm pr-4">
              Yapay Zeka
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
