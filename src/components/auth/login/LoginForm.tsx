import { useState, type FormEvent, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import FloatingLabel from '../../FloatingLabel'
import Button from '../../Button'
import { useAuth } from '../../../hooks/useAuth'
import { resendVerificationEmail } from '../../../services/auth.service'
import type { LoginCredentials } from '../../../types/auth.types'
import { authFieldVariants, authStaggerVariants } from '../../../constants/auth.animations'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function LoginForm() {
  const { login } = useAuth()

  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
  })
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [showResend, setShowResend] = useState<boolean>(false)
  const [resending, setResending] = useState<boolean>(false)
  const [formError, setFormError] = useState<string>('')

  function handleChange(e: ChangeEvent<HTMLInputElement>): void {
    const { name, value } = e.target
    setCredentials((prev) => ({ ...prev, [name]: value }))
    if (formError) setFormError('')
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setShowResend(false)
    setFormError('')

    if (!credentials.email.trim()) {
      setFormError('E-posta adresi zorunludur.')
      return
    }
    if (!isValidEmail(credentials.email.trim())) {
      setFormError('Geçerli bir e-posta adresi giriniz.')
      return
    }
    if (!credentials.password) {
      setFormError('Şifre zorunludur.')
      return
    }

    setSubmitting(true)
    try {
      await login({ email: credentials.email.trim(), password: credentials.password })
      toast.success('Hoş geldiniz!')
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('[LoginForm] Login failed:', err)
        if (err.message === 'Lütfen önce e-posta adresinizi doğrulayın.') {
          setFormError('E-posta adresinizi doğrulamadınız. Lütfen gelen kutunuzu kontrol edin.')
          setShowResend(true)
        } else {
          setFormError(err.message)
        }
        toast.error(err.message)
      } else {
        const msg = 'Giriş sırasında beklenmeyen bir hata oluştu.'
        setFormError(msg)
        toast.error(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend(): Promise<void> {
    setResending(true)
    setFormError('')
    try {
      await resendVerificationEmail(credentials.email, credentials.password)
      toast.success('Doğrulama maili tekrar gönderildi.')
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('[LoginForm] resend verification error:', err)
        setFormError(err.message)
        toast.error(err.message)
      } else {
        const msg = 'Doğrulama maili gönderilemedi.'
        setFormError(msg)
        toast.error(msg)
      }
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex w-full h-full flex-col py-35 gap-5 bg-white px-20 xl:px-32 2xl:px-40">
      <motion.h1
        className="m-0 text-[32px] font-bold text-brand"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        Hoş Geldiniz
      </motion.h1>

      <form className="flex flex-col gap-3.5" onSubmit={handleSubmit} noValidate>
        <motion.div
          className="flex flex-col gap-3.5"
          initial="hidden"
          animate="visible"
          variants={authStaggerVariants}
        >
          <motion.div variants={authFieldVariants}>
            <FloatingLabel
              name="email"
              label="E-posta"
              type="email"
              value={credentials.email}
              onChange={handleChange}
            />
          </motion.div>

          <motion.div className="flex flex-col gap-1.5" variants={authFieldVariants}>
            <FloatingLabel
              name="password"
              label="Şifre"
              type="password"
              value={credentials.password}
              onChange={handleChange}
            />
            <div className="text-right">
              <Link
                to="/sifremi-unuttum"
                className="text-[13px] font-semibold text-[#5B4F4B] hover:underline transition-colors"
              >
                Şifremi unuttum
              </Link>
            </div>
          </motion.div>

          {formError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-600 font-medium"
            >
              {formError}
            </motion.div>
          )}

          <motion.div variants={authFieldVariants}>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Giriş yapılıyor…' : 'Giriş'}
            </Button>
          </motion.div>

          {showResend && (
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-[13px] font-semibold text-brand hover:underline cursor-pointer bg-transparent border-none"
                style={{ fontFamily: 'inherit' }}
              >
                {resending ? 'Gönderiliyor…' : 'Doğrulama Maili Tekrar Gönder'}
              </button>
            </motion.div>
          )}

          <motion.div variants={authFieldVariants} className="w-full flex justify-center mt-1">
            <p className="m-0 text-sm text-[#7F6B67]">
              Hesabınız yok mu?{' '}
              <Link to="/register" className="font-semibold text-[#5B4F4B] hover:underline">
                Hesap oluştur
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </form>
    </div>
  )
}

export default LoginForm
