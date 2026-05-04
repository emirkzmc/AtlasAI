import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import FloatingLabel from '../../FloatingLabel'
import Button from '../../Button'
import Logo from '../../Logo'
import { useAuth } from '../../../hooks/useAuth'
import { resendVerificationEmail } from '../../../services/auth.service'
import type { LoginCredentials } from '../../../types/auth.types'

const fieldVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

const staggerVariants = {
  visible: { transition: { staggerChildren: 0.045, delayChildren: 0.12 } },
  hidden: {},
}

function LoginForm() {
  const { login, user } = useAuth()
  const navigate = useNavigate()

  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
  })
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [showResend, setShowResend] = useState<boolean>(false)
  const [resending, setResending] = useState<boolean>(false)

  useEffect(() => {
    if (user) {
      toast.success('Hoş geldiniz!')
      navigate(`/panel/${user.role}`, { replace: true })
    }
  }, [user, navigate])

  function handleChange(e: ChangeEvent<HTMLInputElement>): void {
    const { name, value } = e.target
    setCredentials((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setShowResend(false)
    setSubmitting(true)
    try {
      await login(credentials)
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === 'Lütfen önce e-posta adresinizi doğrulayın.') {
          toast.error('E-posta adresinizi doğrulamadınız. Lütfen gelen kutunuzu kontrol edin.')
          setShowResend(true)
        } else {
          toast.error(err.message)
        }
      } else {
        toast.error('Giriş sırasında bir hata oluştu.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend(): Promise<void> {
    setResending(true)
    try {
      await resendVerificationEmail(credentials.email, credentials.password)
      toast.success('Doğrulama maili tekrar gönderildi.')
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message)
      } else {
        toast.error('Doğrulama maili gönderilemedi.')
      }
    } finally {
      setResending(false)
    }
  }

  return (
    <section className="w-full lg:w-1/2 h-full flex flex-col justify-center relative px-8 sm:px-16 md:px-24 lg:px-32 xl:px-40 py-8">
      <motion.div 
        className="absolute top-12 right-12 text-[32px] font-medium text-gray-900 tracking-wide"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Logo txtColor='black' />
      </motion.div>

      <div className="w-full max-w-[400px] mx-auto">
        <motion.h1 
          className="text-[36px] font-bold text-gray-900 mb-2"
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          Hoş Geldiniz
        </motion.h1>
        <motion.p 
          className="text-[15px] text-[#7F6B67] mb-10"
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          Eğitim portalına erişmek için giriş yapın.
        </motion.p>

        <motion.form 
          className="flex flex-col gap-5" 
          onSubmit={handleSubmit}
          initial="hidden"
          animate="visible"
          variants={staggerVariants}
        >
          <motion.div variants={fieldVariants}>
            <FloatingLabel
              name="email"
              label="E-posta"
              type="email"
              value={credentials.email}
              onChange={handleChange}
            />
          </motion.div>
          
          <motion.div className="flex flex-col gap-1.5" variants={fieldVariants}>
            <FloatingLabel
              name="password"
              label="Şifre"
              type="password"
              value={credentials.password}
              onChange={handleChange}
            />
            <div className="text-right">
              <button type="button" className="text-[13px] font-semibold text-[#5B4F4B] hover:text-brand transition-colors cursor-pointer">
                Şifremi unuttum
              </button>
            </div>
          </motion.div>

          <motion.div variants={fieldVariants}>
            <Button type="submit" className="mt-2 h-12" disabled={submitting}>
              {submitting ? 'Giriş yapılıyor...' : 'Giriş'}
            </Button>
          </motion.div>
        </motion.form>

        {showResend && (
          <motion.div
            className="mt-4 text-center"
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
              {resending ? 'Gönderiliyor...' : 'Tekrar Gönder'}
            </button>
          </motion.div>
        )}

        <motion.p 
          className="mt-12 text-center text-[13px] text-[#7F6B67]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Hesabınız yok mu?{' '}
          <Link to="/register" className="font-semibold text-[#5B4F4B] hover:underline">
            Hesap oluştur
          </Link>
        </motion.p>
      </div>

      <motion.div 
        className="absolute bottom-10 right-12 text-[11px] text-[#7F6B67]/70 font-medium tracking-wide"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        © 2024 Admix Academy.
      </motion.div>
    </section>
  )
}

export default LoginForm
