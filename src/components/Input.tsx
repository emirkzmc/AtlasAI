import type { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement>

function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      {...props}
      className={`w-full rounded-[10px] border border-[#D1D1D1] bg-white px-3.5 pb-2 pt-5 text-sm text-[#3F3131] outline-none transition-colors focus:border-brand ${className}`.trim()}
    />
  )
}

export default Input
