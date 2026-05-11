import { motion } from "framer-motion";
import Logo from "./Logo";
import type { JSX } from "react";

export function Loader(): JSX.Element {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#FDFDFD] gap-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
      >
        <Logo txtColor="black" />
      </motion.div>
      <div className="w-32 h-1 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-brand"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}

export default Loader;
