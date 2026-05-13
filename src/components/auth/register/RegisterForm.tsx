import { useState, type FormEvent, type ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Button from '../../Button'
import FloatingLabel from '../../FloatingLabel'
import DateInput from './DateInput'
import RegisterTab from './RegisterTab'
import { useAuth } from '../../../hooks/useAuth'
import type { UserRole, FormFieldDef } from '../../../types/auth.types'
import { features } from '../../../config/features'

type RegisterFormProps = {
  role: UserRole
  fields: FormFieldDef[]
  onRoleChange: (role: UserRole) => void
}

const fieldVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

const staggerVariants = {
  visible: { transition: { staggerChildren: 0.045, delayChildren: 0.12 } },
  hidden: {},
}

function RegisterForm({ role, fields, onRoleChange }: RegisterFormProps) {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState<boolean>(false)

  function handleChange(e: ChangeEvent<HTMLInputElement>): void {
    const { name, value } = e.target
    setFormValues((prev) => ({ ...prev, [name]: value }))
  }

  function handleDateChange(name: string, value: string): void {
    setFormValues((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setSubmitting(true)

    const email = formValues['email'] ?? ''
    const password = formValues['password'] ?? ''
    const birthDate = formValues['birthDate'] ?? ''

    if (!email || !password) {
      toast.error('E-posta ve şifre alanları zorunludur.')
      setSubmitting(false)
      return
    }

    try {
      const fullName = formValues['fullName'] ?? ''
      await register({
        email,
        password,
        role: role as UserRole,
        fullName: fullName || undefined,
        birthDate: birthDate || undefined,
      })
      toast.success('Hesabınız oluşturuldu! Doğrulama bağlantısı e-posta adresinize gönderildi.')
      navigate('/login')
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message)
      } else {
        toast.error('Kayıt sırasında bir hata oluştu.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex w-full h-full flex-col py-35 gap-5 bg-white px-20 xl:px-32 2xl:px-40">
        <div className="flex justify-between gap-4">
          <motion.h1
            className="m-0 text-[32px] font-bold text-brand"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            Kayıt Ol
          </motion.h1>

          {features.enableTeacherFeatures && (
            <RegisterTab role={role} onChange={onRoleChange} />
          )}
        </div>

        <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
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
                      value={formValues[field.name] ?? ''}
                      onChange={handleDateChange}
                    />
                  ) : (
                    <FloatingLabel
                      name={field.name}
                      label={field.label}
                      type={field.type}
                      value={formValues[field.name] ?? ''}
                      onChange={handleChange}
                    />
                  )}
                </motion.div>
              ))}

              <motion.div variants={fieldVariants}>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Kayıt yapılıyor...' : 'Hesap Oluşturun'}
                </Button>
              </motion.div>

              <motion.div variants={fieldVariants} className="w-full flex justify-center mt-1"> 
                <p className="m-0 text-sm text-[#7F6B67]">
                  Zaten hesabın var mı?{' '}
                  <Link to="/login" className="font-semibold text-[#5B4F4B] hover:underline">
                    Giriş yap
                  </Link>
                </p>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </form>
      </div>
  )
}

export default RegisterForm
