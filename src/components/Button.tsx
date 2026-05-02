import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: 'primary' | 'icon'
}

function Button({ children, className = '', variant = 'primary', ...props }: ButtonProps) {
  let baseStyles = ''
  if (variant === 'primary') {
    baseStyles = 'w-full cursor-pointer mt-1 min-h-11.5 rounded-xl bg-[#513C3C] px-4 text-[15px] font-semibold text-white transition hover:opacity-95'
  } else if (variant === 'icon') {
    baseStyles = 'cursor-pointer flex items-center justify-center bg-transparent border-none p-0 transition-colors'
  }

  return (
    <button
      {...props}
      className={`${baseStyles} ${className}`.trim()}
    >
      {children}
    </button>
  )
}

export default Button
