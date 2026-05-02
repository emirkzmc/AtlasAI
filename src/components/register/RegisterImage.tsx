import { motion, AnimatePresence } from 'framer-motion'
import Logo from '../Logo'

type RegisterImageProps = {
  role: 'student' | 'teacher'
  direction: number
}

const imageVariants = {
  initial: (dir: number) => ({ x: dir * 60, opacity: 0 }),
  animate: { x: 0, opacity: 1, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
  exit: (dir: number) => ({ x: dir * -60, opacity: 0, transition: { duration: 0.35, ease: 'easeIn' as const } }),
}

function RegisterImage({ role, direction }: RegisterImageProps) {
  const isStudent = role === 'student'

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={role + '-img'}
        className="relative h-full w-1/2 overflow-hidden"
        custom={direction}
        variants={imageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <motion.img
          src={isStudent ? '/img/login-img.webp' : '/img/login-img2.webp'}
          alt="Kayıt görseli"
          className="h-full w-full object-cover"
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }}
        />
        <div className={`absolute bottom-10 z-10 ${isStudent ? 'left-10' : 'right-10'}`}>
          <Logo />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default RegisterImage
