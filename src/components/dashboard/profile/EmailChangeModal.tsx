import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useScrollLock } from "../../../hooks/useScrollLock";

interface EmailChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newEmail: string, currentPassword: string) => Promise<boolean>;
  sending: boolean;
  error: string;
  success: boolean;
  currentEmail: string;
}

const OVERLAY_VARIANTS = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const MODAL_VARIANTS = {
  hidden: { opacity: 0, scale: 0.92, y: 24 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.92, y: 24 },
};

const TRANSITION = { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const };

/**
 * E-posta değiştirme modal bileşeni.
 *
 * Akış:
 * 1. Kullanıcı mevcut şifresini ve yeni e-posta adresini girer
 * 2. Gönder'e basınca yeniden doğrulama + doğrulama e-postası gönderilir
 * 3. Başarılı → "Önce e-postanızı doğrulayın" mesajı gösterilir
 * 4. Kullanıcı yeni adresindeki bağlantıya tıklayınca e-posta otomatik güncellenir
 */
export default function EmailChangeModal({
  isOpen,
  onClose,
  onSubmit,
  sending,
  error,
  success,
  currentEmail,
}: EmailChangeModalProps) {
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const passwordRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useScrollLock(isOpen);

  // Modal açılınca şifre inputuna odaklan
  useEffect(() => {
    if (isOpen && !success) {
      const timer = setTimeout(() => passwordRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, success]);

  // Modal kapanma durumunda state'i sıfırlamak için useEffect yerine render-phase state update (React önerisi)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setNewEmail("");
      setCurrentPassword("");
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "Enter") {
      e.preventDefault();
      // Şifre alanındaysa e-posta alanına geç
      if (e.currentTarget === passwordRef.current && newEmail.trim()) {
        handleSubmit();
      } else if (e.currentTarget === passwordRef.current) {
        emailRef.current?.focus();
      } else {
        handleSubmit();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  function handleSubmit(): void {
    if (!newEmail.trim() || !currentPassword || sending) return;
    onSubmit(newEmail.trim(), currentPassword);
  }

  const isFormValid = newEmail.trim().length > 0 && currentPassword.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-100 flex items-center justify-center p-4"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={OVERLAY_VARIANTS}
          transition={TRANSITION}
        >
          {/* Overlay */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-[440px] bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] overflow-hidden"
            variants={MODAL_VARIANTS}
            transition={TRANSITION}
            role="dialog"
            aria-modal="true"
            aria-label="E-posta değiştir"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h3 className="text-[18px] font-semibold text-[#1a1a1a] m-0">
                E-posta Değiştir
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f0f0f0] transition-colors cursor-pointer"
                aria-label="Kapat"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 pb-6 pt-2">
              {success ? (
                /* Doğrulama gönderildi — başarı mesajı */
                <div className="flex flex-col items-center gap-4 py-4">
                  {/* Mail icon */}
                  <div className="w-16 h-16 rounded-full bg-[#E8F5E9] flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#43A047" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-[15px] font-semibold text-[#1a1a1a] mb-1">
                      Doğrulama e-postası gönderildi!
                    </p>
                    <p className="text-[13px] text-[#737373] leading-relaxed">
                      <strong>{newEmail || "yeni adresinize"}</strong> bir doğrulama bağlantısı gönderdik.
                      Önce e-postanızı doğrulayın — bağlantıya tıkladığınızda e-posta adresiniz otomatik güncellenecektir.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-2 px-6 py-2.5 bg-[#5B4F4B] text-white text-[14px] font-medium rounded-xl hover:bg-[#4A3F3B] transition-colors cursor-pointer"
                  >
                    Tamam
                  </button>
                </div>
              ) : (
                /* Form */
                <>
                  <p className="text-[13px] text-[#737373] mb-1">
                    Mevcut e-posta: <strong>{currentEmail}</strong>
                  </p>
                  <p className="text-[13px] text-[#999] mb-4">
                    Güvenlik doğrulaması için mevcut şifrenizi girin, ardından yeni e-posta adresinize bir doğrulama bağlantısı gönderilecektir.
                  </p>

                  {/* Mevcut Şifre */}
                  <label
                    htmlFor="current-password-input"
                    className="block text-[12px] font-semibold text-[#737373] uppercase tracking-wide mb-1.5"
                  >
                    Mevcut Şifre
                  </label>
                  <input
                    ref={passwordRef}
                    id="current-password-input"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sending}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-[#e0e0e0] rounded-xl text-[15px] text-[#1a1a1a] outline-none transition-all focus:border-[#5B4F4B] focus:ring-2 focus:ring-[#5B4F4B]/15 disabled:opacity-60 placeholder:text-[#bbb] mb-4"
                    autoComplete="current-password"
                  />

                  {/* Yeni E-posta */}
                  <label
                    htmlFor="new-email-input"
                    className="block text-[12px] font-semibold text-[#737373] uppercase tracking-wide mb-1.5"
                  >
                    Yeni E-posta Adresi
                  </label>
                  <input
                    ref={emailRef}
                    id="new-email-input"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sending}
                    placeholder="yeni@eposta.com"
                    className="w-full px-4 py-3 border border-[#e0e0e0] rounded-xl text-[15px] text-[#1a1a1a] outline-none transition-all focus:border-[#5B4F4B] focus:ring-2 focus:ring-[#5B4F4B]/15 disabled:opacity-60 placeholder:text-[#bbb]"
                    autoComplete="email"
                  />

                  {error && (
                    <p className="text-[12px] text-red-500 mt-2 m-0">{error}</p>
                  )}

                  <div className="flex items-center justify-end gap-3 mt-5">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={sending}
                      className="px-5 py-2.5 text-[14px] font-medium text-[#737373] rounded-xl hover:bg-[#f5f5f5] transition-colors cursor-pointer disabled:opacity-60"
                    >
                      İptal
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={sending || !isFormValid}
                      className="px-5 py-2.5 bg-[#5B4F4B] text-white text-[14px] font-medium rounded-xl hover:bg-[#4A3F3B] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {sending && (
                        <svg
                          className="animate-spin w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                      )}
                      Doğrulama Gönder
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
