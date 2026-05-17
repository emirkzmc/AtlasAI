import { useState, type FormEvent, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Logo from '../../components/Logo'
import { resetPassword } from '../../services/auth.service'
import { authFieldVariants, authStaggerVariants } from '../../constants/auth.animations'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formError, setFormError] = useState('')

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value)
    if (formError) setFormError('')
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError('')

    if (!email.trim()) {
      setFormError('Lütfen bir e-posta adresi giriniz.')
      return
    }
    if (!isValidEmail(email.trim())) {
      setFormError('Geçerli bir e-posta adresi giriniz.')
      return
    }

    setSubmitting(true)
    try {
      await resetPassword(email.trim())
      setSuccess(true)
    } catch (err: unknown) {
      console.error('[ForgotPasswordPage] resetPassword error:', err)
      if (err instanceof Error) {
        setFormError(err.message)
      } else {
        setFormError('Şifre sıfırlama bağlantısı gönderilirken bir hata oluştu.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen w-screen flex items-center justify-center bg-[#f9f9f9]">
      <div className="w-full max-w-[440px] px-6 py-10">
        {/* Logo */}
        <motion.div
          className="flex justify-center mb-10"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Logo txtColor="black" />
        </motion.div>

        <motion.div
          className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.07)] p-8 flex flex-col gap-6"
          initial="hidden"
          animate="visible"
          variants={authStaggerVariants}
        >
          {/* Icon */}
          <motion.div variants={authFieldVariants} className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-[#F3F0EF] flex items-center justify-center">
              <svg className="w-8 h-8 text-[#5B4F4B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
          </motion.div>

          {success ? (
            /* ── Success state ── */
            <motion.div
              className="flex flex-col gap-4 text-center"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-14 h-14 rounded-full bg-[#EBF5EA] flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-[#3B8535]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-[22px] font-bold text-gray-900">Bağlantı Gönderildi</h1>
              <p className="text-[14px] text-[#7F6B67] leading-relaxed">
                Şifre sıfırlama bağlantısı{' '}
                <span className="font-semibold text-[#5B4F4B]">{email}</span>{' '}
                adresine gönderildi. Gelen kutunuzu kontrol edin.
              </p>
              <Link
                to="/login"
                className="mt-2 text-[13px] font-semibold text-[#5B4F4B] hover:underline"
              >
                ← Giriş sayfasına dön
              </Link>
            </motion.div>
          ) : (
            /* ── Form state ── */
            <>
              <motion.div variants={authFieldVariants} className="text-center">
                <h1 className="text-[24px] font-bold text-gray-900 mb-2">Şifremi Unuttum</h1>
                <p className="text-[14px] text-[#7F6B67] leading-relaxed">
                  Hesabınıza bağlı e-posta adresinizi girin. Şifre sıfırlama bağlantısı gönderelim.
                </p>
              </motion.div>

              <motion.form
                className="flex flex-col gap-4"
                onSubmit={handleSubmit}
                noValidate
                variants={authStaggerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.div variants={authFieldVariants}>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    E-posta Adresi
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={handleChange}
                    placeholder="ornek@email.com"
                    className="w-full h-12 px-4 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#5B4F4B]/30 focus:border-[#5B4F4B] transition-all"
                    autoComplete="email"
                    autoFocus
                  />
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
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-12 bg-[#5B4F4B] text-white text-[15px] font-semibold rounded-xl hover:bg-[#3a2a2a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {submitting ? 'Gönderiliyor…' : 'Şifre sıfırlama bağlantısı gönder'}
                  </button>
                </motion.div>

                <motion.div variants={authFieldVariants} className="text-center">
                  <Link
                    to="/login"
                    className="text-[13px] text-[#7F6B67] hover:text-[#5B4F4B] transition-colors"
                  >
                    ← Giriş sayfasına dön
                  </Link>
                </motion.div>
              </motion.form>
            </>
          )}
        </motion.div>

        {/* Footer */}
        <motion.p
          className="mt-8 text-center text-[11px] text-[#7F6B67]/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          © 2026 AtlasAI.
        </motion.p>
      </div>
    </main>
  )
}
