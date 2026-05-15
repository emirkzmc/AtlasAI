import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AIChatModal from "../ai-chat/AIChatModal";

export default function AIButton() {
  const [isHovered, setIsHovered] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setModalOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex items-center bg-[#EDEEEB] overflow-hidden cursor-pointer border border-[#CECECE] p-0"
        style={{ height: "42px", borderRadius: "21px" }}
        aria-label="Yapay zeka sohbetini aç"
      >
        <span
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
            <rect width="16" height="16" x="4" y="4" rx="2" />
            <rect width="6" height="6" x="9" y="9" rx="1" />
            <path d="M15 2v2" />
            <path d="M15 20v2" />
            <path d="M2 15h2" />
            <path d="M2 9h2" />
            <path d="M20 15h2" />
            <path d="M20 9h2" />
            <path d="M9 2v2" />
            <path d="M9 20v2" />
          </svg>
        </span>
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden whitespace-nowrap"
            >
              <span className="text-black font-medium text-sm pr-4">Yapay Zeka</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <AIChatModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
