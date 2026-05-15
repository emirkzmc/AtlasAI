/** Shared Framer Motion variants for auth pages (login, register, utility). */
export const authFieldVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
};

export const authStaggerVariants = {
  visible: { transition: { staggerChildren: 0.045, delayChildren: 0.12 } },
  hidden: {},
};

export const authPanelTransition = {
  duration: 0.7,
  ease: [0.22, 1, 0.36, 1] as const,
};

export const authImageFade = {
  duration: 0.55,
  ease: [0.22, 1, 0.36, 1] as const,
};

export const authImageScale = {
  duration: 0.8,
  ease: [0.22, 1, 0.36, 1] as const,
};
