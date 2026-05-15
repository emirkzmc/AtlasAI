import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import RegisterImage from '../../components/auth/register/RegisterImage'
import RegisterForm from '../../components/auth/register/RegisterForm'
import { features } from '../../config/features'
import { STUDENT_REGISTER_FIELDS, TEACHER_REGISTER_FIELDS } from '../../constants/auth.constants'
import { authPanelTransition } from '../../constants/auth.animations'
import type { UserRole } from '../../types/auth.types'

function RegisterPage() {
  const [role, setRole] = useState<UserRole>('student')

  const isStudent = role === 'student'
  const fields = isStudent ? STUDENT_REGISTER_FIELDS : TEACHER_REGISTER_FIELDS
  const direction = isStudent ? 1 : -1

  return (
    <main className="h-screen w-screen overflow-hidden" data-theme={role}>
      <section className="relative h-full w-full bg-[#f4f4f4]">
        <div className="absolute top-0 bottom-0 left-0 w-1/2 overflow-hidden">
          <AnimatePresence>
            {isStudent && (
              <motion.div
                key="student-img"
                className="h-full w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <RegisterImage role="student" direction={direction} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="absolute top-0 bottom-0 right-0 w-1/2 overflow-hidden">
          <AnimatePresence>
            {!isStudent && features.enableTeacherFeatures && (
              <motion.div
                key="teacher-img"
                className="h-full w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <RegisterImage role="teacher" direction={direction} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div
          className="absolute top-0 bottom-0 w-1/2 z-10 shadow-2xl"
          initial={false}
          animate={{ left: isStudent || !features.enableTeacherFeatures ? '50%' : '0%' }}
          transition={authPanelTransition}
        >
          <RegisterForm role={role} fields={fields} onRoleChange={setRole} />
        </motion.div>
      </section>
    </main>
  )
}

export default RegisterPage
