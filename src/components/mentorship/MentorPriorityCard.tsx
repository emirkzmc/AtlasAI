import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MentorCard } from "../../types/mentorship.types";
import { PRIORITY_COLORS } from "../../constants/mentorship.constants";

interface MentorPriorityCardProps {
  card: MentorCard;
  index: number;
}

export default function MentorPriorityCard({ card, index }: MentorPriorityCardProps) {
  const [expanded, setExpanded] = useState(false);
  const colors = PRIORITY_COLORS[card.priority];

  return (
    <motion.article 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className={`min-h-19 rounded-lg bg-white px-5 py-4 shadow-sm ring-1 ring-black/5 hover:shadow-md transition-shadow cursor-pointer ${expanded ? 'ring-2 ring-blue-100' : ''}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex gap-4">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${colors.text.replace('text', 'bg')}`} />
        
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <h3 className="text-sm font-semibold text-gray-900">{card.title}</h3>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${colors.bg} ${colors.text} ${colors.border}`}>
                {card.priority}
              </span>
              <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                %{card.successRate} Başarı
              </span>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 leading-relaxed">
            {card.summary}
          </p>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-md bg-blue-50/50 p-3 border border-blue-100/50">
                   <div className="flex gap-2">
                     <span className="text-blue-500 text-sm">💡</span>
                     <p className="text-sm text-blue-900 italic leading-relaxed">
                       {card.recommendation}
                     </p>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-2 text-center">
             <span className="text-[10px] text-gray-400 font-medium">
               {expanded ? "Tavsiyeyi Gizle ▲" : "Tavsiyeyi Gör ▼"}
             </span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
