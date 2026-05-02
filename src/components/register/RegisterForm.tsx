import { motion, AnimatePresence } from 'framer-motion'
import Button from '../Button'
import FloatingLabel from '../FloatingLabel'
import DateInput from './DateInput'
import RegisterTab from './RegisterTab'

type Role = 'student' | 'teacher'

type FieldDef = {
  name: string
  label: string
  type: string
}

type RegisterFormProps = {
  role: Role
  fields: FieldDef[]
  direction: number
  onRoleChange: (role: Role) => void
}

const formVariants = {
  initial: (dir: number) => ({ x: dir * -60, opacity: 0 }),
  animate: { x: 0, opacity: 1, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
  exit: (dir: number) => ({ x: dir * 60, opacity: 0, transition: { duration: 0.35, ease: 'easeIn' as const } }),
}

const fieldVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

const staggerVariants = {
  visible: { transition: { staggerChildren: 0.045, delayChildren: 0.12 } },
  hidden: {},
}

function RegisterForm({ role, fields, direction, onRoleChange }: RegisterFormProps) {
  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={role + '-form'}
        className="flex w-1/2 h-screen flex-col justify-center gap-5 bg-white px-20 xl:px-32 2xl:px-40 py-8"
        custom={direction}
        variants={formVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {/* ── Title + Tab ── */}
        <div className="flex justify-between gap-4">
          <motion.h1
            className="m-0 text-[32px] font-bold text-[#513C3C]"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            Kayıt Ol
          </motion.h1>

          <RegisterTab role={role} onChange={onRoleChange} />
        </div>

        {/* ── Fields (staggered) ── */}
        <form className="flex flex-col gap-3.5">
          <AnimatePresence mode="wait">
            <motion.div
              key={role + '-fields'}
              className="flex flex-col gap-3.5"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={staggerVariants}
            >
              {fields.map((field) => (
                <motion.div key={field.name} variants={fieldVariants}>
                  {field.type === 'date' ? (
                    <DateInput
                      name={field.name}
                      label={field.label}
                      placeholder={field.label}
                    />
                  ) : (
                    <FloatingLabel
                      name={field.name}
                      label={field.label}
                      type={field.type}
                    />
                  )}
                </motion.div>
              ))}

              <motion.div variants={fieldVariants}>
                <Button type="submit">Hesap Oluşturun</Button>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </form>

        {/* ── Footer link ── */}
        <motion.p
          className="m-0 text-sm text-[#7F6B67]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Zaten hesabın var mı?{' '}
          <span className="cursor-pointer font-semibold text-[#5B4F4B] hover:underline">
            Giriş yap
          </span>
        </motion.p>
      </motion.div>
    </AnimatePresence>
  )
}

export default RegisterForm
