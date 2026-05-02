import type { LabelHTMLAttributes, ReactNode } from 'react'

type LabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  children: ReactNode
}

export default function Label({ children, className = '', ...props }: LabelProps) {
  return (
    <label
      {...props}
      className={`pointer-events-none absolute left-3.5 transition-all duration-200 ${className}`.trim()}
    >
      {children}
    </label>
  )
}
