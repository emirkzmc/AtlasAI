import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import RegisterImage from '../../components/auth/register/RegisterImage'
import RegisterForm from '../../components/auth/register/RegisterForm'

type Role = 'student' | 'teacher'

const studentFields = [
  { name: 'fullName', label: 'Ad Soyad', type: 'text' },
  { name: 'birthDate', label: 'Doğum Tarihi', type: 'date' },
  { name: 'phone', label: 'Telefon numarası', type: 'tel' },
  { name: 'email', label: 'E-posta', type: 'email' },
  { name: 'password', label: 'Şifre', type: 'password' },
]

const teacherFields = [
  { name: 'fullName', label: 'Ad Soyad', type: 'text' },
  { name: 'department', label: 'Bölüm', type: 'text' },
  { name: 'phone', label: 'Telefon numarası', type: 'tel' },
  { name: 'email', label: 'E-posta', type: 'email' },
  { name: 'password', label: 'Şifre', type: 'password' },
]

function RegisterPage() {
  const [role, setRole] = useState<Role>('student')

  const isStudent = role === 'student'
  const fields = isStudent ? studentFields : teacherFields
  const direction = isStudent ? 1 : -1

  return (
    <main className="h-screen w-screen overflow-hidden" data-theme={role}>
      <section className="relative h-full w-full bg-[#f4f4f4]">
        {/* Left Side (Student Image) */}
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

        {/* Right Side (Teacher Image) */}
        <div className="absolute top-0 bottom-0 right-0 w-1/2 overflow-hidden">
          <AnimatePresence>
            {!isStudent && (
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

        {/* Form side */}
        <motion.div
          className="absolute top-0 bottom-0 w-1/2 z-10 shadow-2xl"
          initial={false}
          animate={{ left: isStudent ? '50%' : '0%' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <RegisterForm role={role} fields={fields} onRoleChange={setRole} />
        </motion.div>
      </section>
    </main>
  )
}

export default RegisterPage
