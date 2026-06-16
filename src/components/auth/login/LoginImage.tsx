import { motion, AnimatePresence } from 'framer-motion'
import Logo from '../../Logo'
import { authImageFade, authImageScale } from '../../../constants/auth.animations'

const direction = 1

const imageVariants = {
  initial: (dir: number) => ({ x: dir * 60, opacity: 0 }),
  animate: { x: 0, opacity: 1, transition: authImageFade },
  exit: (dir: number) => ({
    x: dir * -60,
    opacity: 0,
    transition: { duration: 0.35, ease: 'easeIn' as const },
  }),
}

/** RegisterImage ile aynı animasyon (kaydırma, fade, scale). */
function LoginImage() {
  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key="login-img"
        className="relative h-full w-full overflow-hidden pointer-events-none"
        custom={direction}
        variants={imageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <motion.img
          src="/img/login-img3.webp"
          alt="Giriş görseli"
          className="h-full w-full object-cover"
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={authImageScale}
        />
        <div className="absolute bottom-10 left-10 z-10">
          <Logo />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default LoginImage
