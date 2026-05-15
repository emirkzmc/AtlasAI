import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth, sendEmailVerification } from 'firebase/auth'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Logo from '../../components/Logo'
import { useAuth } from '../../hooks/useAuth'
import { app } from '../../services/firebase.config'
import { getAuthErrorMessage } from '../../services/auth.service'
import { authFieldVariants, authStaggerVariants } from '../../constants/auth.animations'

export default function EmailVerificationPage() {
  const { user, refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const auth = getAuth(app)
  const currentUser = auth.currentUser

  const emailToShow = currentUser?.email ?? user?.email ?? ''

  const [checking, setChecking] = useState(false)
  const [resending, setResending] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const [resendError, setResendError] = useState('')

  async function handleVerified() {
    setChecking(true)
    setVerifyError('')
    try {
      await refreshUser()
      await auth.currentUser?.reload()
      const fresh = auth.currentUser
      if (fresh?.emailVerified) {
        toast.success('E-posta doğrulandı! Hoş geldiniz.')
        navigate(`/panel/${user?.role ?? 'student'}`, { replace: true })
      } else {
        setVerifyError('E-posta henüz doğrulanmamış. Lütfen gelen kutunuzu kontrol edin.')
      }
    } catch (err) {
      console.error('[EmailVerificationPage] reload error:', err)
      setVerifyError('Doğrulama kontrol edilirken bir hata oluştu.')
    } finally {
      setChecking(false)
    }
  }

  async function handleResend() {
    if (!currentUser) {
      const msg = 'Oturum bulunamadı. Lütfen tekrar giriş yapın veya kayıt olun.'
      setResendError(msg)
      toast.error(msg)
      return
    }
    setResending(true)
    setResendError('')
    try {
      await sendEmailVerification(currentUser)
      toast.success('Doğrulama maili tekrar gönderildi.')
    } catch (err: unknown) {
      console.error('[EmailVerificationPage] resend error:', err)
      const msg = getAuthErrorMessage(err)
      setResendError(msg)
      toast.error(msg)
    } finally {
      setResending(false)
    }
  }

  async function handleBackToLogin() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="min-h-screen w-screen flex items-center justify-center bg-[#f9f9f9]">
      <motion.div
        className="w-full max-w-[440px] px-6 py-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
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
          <motion.div variants={authFieldVariants} className="flex justify-center">
            <motion.div
              className="w-16 h-16 rounded-full bg-[#EBF5EA] flex items-center justify-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.35 }}
            >
              <svg className="w-8 h-8 text-[#3B8535]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </motion.div>
          </motion.div>

          <motion.div variants={authFieldVariants} className="text-center">
            <h1 className="text-[24px] font-bold text-gray-900 mb-2">
              E-posta Adresinizi Doğrulayın
            </h1>
            <p className="text-[14px] text-[#7F6B67] leading-relaxed">
              Aşağıdaki adrese bir doğrulama bağlantısı gönderdik:
            </p>
            {emailToShow && (
              <p className="text-[15px] font-semibold text-[#5B4F4B] mt-1">
                {emailToShow}
              </p>
            )}
          </motion.div>

          {verifyError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-600 font-medium text-center"
            >
              {verifyError}
            </motion.div>
          )}

          {resendError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-600 font-medium text-center"
            >
              {resendError}
            </motion.div>
          )}

          <motion.div variants={authFieldVariants} className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleVerified}
              disabled={checking}
              className="w-full h-12 bg-[#5B4F4B] text-white text-[15px] font-semibold rounded-xl hover:bg-[#3a2a2a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {checking ? 'Kontrol ediliyor…' : 'Doğruladım, devam et'}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="w-full h-12 border border-[#E5E5E5] text-[#5B4F4B] text-[15px] font-semibold rounded-xl hover:bg-[#F3F0EF] transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {resending ? 'Gönderiliyor…' : 'Doğrulama mailini tekrar gönder'}
            </button>
          </motion.div>

          <motion.div variants={authFieldVariants} className="text-center">
            <button
              type="button"
              onClick={handleBackToLogin}
              className="text-[13px] text-[#7F6B67] hover:text-[#5B4F4B] transition-colors cursor-pointer"
            >
              ← Giriş sayfasına dön
            </button>
          </motion.div>
        </motion.div>

        <motion.p
          className="mt-8 text-center text-[11px] text-[#7F6B67]/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          © 2026 Admix Academy.
        </motion.p>
      </motion.div>
    </main>
  )
}
