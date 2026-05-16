import { motion } from 'framer-motion'
import LoginImage from '../../components/auth/login/LoginImage'
import LoginForm from '../../components/auth/login/LoginForm'
import { authPanelTransition } from '../../constants/auth.animations'

/** RegisterPage ile aynı layout ve panel geçişi (form sağda %50). */
function LoginPage() {
  return (
    <main className="h-screen w-screen overflow-hidden">
      <section className="relative h-full w-full bg-[#f4f4f4] flex">
        <div className="hidden lg:block absolute top-0 bottom-0 left-0 w-1/2 overflow-hidden">
          <motion.div
            className="h-full w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <LoginImage />
          </motion.div>
        </div>

        <motion.div
          className="absolute top-0 bottom-0 w-full lg:w-1/2 z-10 lg:shadow-2xl left-0 lg:left-[50%]"
          initial={false}
          animate={{ x: 0 }}
          transition={authPanelTransition}
        >
          <LoginForm />
        </motion.div>
      </section>
    </main>
  )
}

export default LoginPage
