import { useState, type ChangeEvent } from 'react'
import Input from './Input'
import Button from './Button'
import Label from './Label'

type FloatingLabelProps = {
  label: string
  name: string
  type?: string
  value?: string
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
}

export default function FloatingLabel({ label, name, type = 'text', value: controlledValue, onChange: controlledOnChange }: FloatingLabelProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [internalValue, setInternalValue] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : internalValue

  const active = isFocused || value.length > 0
  const isPasswordType = type === 'password'
  const inputType = isPasswordType ? (showPassword ? 'text' : 'password') : type

  function handleChange(e: ChangeEvent<HTMLInputElement>): void {
    if (controlledOnChange) {
      controlledOnChange(e)
    }
    if (!isControlled) {
      setInternalValue(e.target.value)
    }
  }

  return (
    <div className="relative w-full">
      <Input
        id={name}
        name={name}
        type={inputType}
        value={value}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={isPasswordType ? 'pr-10' : ''}
      />
      <Label
        htmlFor={name}
        className={active ? 'top-1.5 text-xs font-medium text-[#786c6c]' : 'top-3.5 text-sm text-brand'}
      >
        {label}
      </Label>

      {isPasswordType && (
        <Button
          type="button"
          variant="icon"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7F6B67] hover:text-brand"
          aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
        >
          {showPassword ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          )}
        </Button>
      )}
    </div>
  )
}
