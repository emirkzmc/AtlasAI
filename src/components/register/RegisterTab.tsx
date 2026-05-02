import { motion } from 'framer-motion'

type Role = 'student' | 'teacher'

type RegisterTabProps = {
  role: Role
  onChange: (role: Role) => void
}

const tabSpring = { type: 'spring' as const, stiffness: 380, damping: 32 }

function RegisterTab({ role, onChange }: RegisterTabProps) {
  const isStudent = role === 'student'

  return (
    <motion.div
      className="relative flex w-fit rounded-xl bg-[#F3EFEF] p-1"
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.22, duration: 0.4 }}
    >
      {/* Sliding indicator */}
      <motion.div
        className="absolute top-1 bottom-1 rounded-lg bg-[#513C3C] shadow-md"
        layout
        transition={tabSpring}
        style={{
          left: isStudent ? '4px' : '50%',
          right: isStudent ? '50%' : '4px',
        }}
      />

      <button
        type="button"
        onClick={() => onChange('student')}
        className={`relative z-10 cursor-pointer rounded-lg border-none px-5 py-2 text-sm font-semibold transition-colors duration-200 ${
          isStudent ? 'text-white' : 'text-[#513C3C] hover:text-[#3a2a2a]'
        }`}
        style={{ background: 'transparent' }}
      >
        Öğrenci
      </button>

      <button
        type="button"
        onClick={() => onChange('teacher')}
        className={`relative z-10 cursor-pointer rounded-lg border-none px-5 py-2 text-sm font-semibold transition-colors duration-200 ${
          !isStudent ? 'text-white' : 'text-[#513C3C] hover:text-[#3a2a2a]'
        }`}
        style={{ background: 'transparent' }}
      >
        Öğretmen
      </button>
    </motion.div>
  )
}

export default RegisterTab
