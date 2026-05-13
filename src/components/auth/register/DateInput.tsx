import { useState, useRef, useEffect } from 'react'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { AnimatePresence, motion } from 'framer-motion'
import DateCalendarPicker from '../../DateCalendar'
import Label from '../../Label'

type DateInputProps = {
  name: string
  label: string
  placeholder?: string
  value?: string
  onChange?: (name: string, value: string) => void
}

function DateInput({ name, label, placeholder, value = '', onChange }: DateInputProps) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<Dayjs | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  /* Close calendar when clicking outside */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleDateChange = (newDate: Dayjs | null) => {
    if (newDate?.isAfter(dayjs(), 'day')) return

    setDate(newDate)
    onChange?.(name, newDate ? newDate.format('YYYY-MM-DD') : '')
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input type="hidden" name={name} value={value} />

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full cursor-pointer items-center rounded-[10px] border border-[#D1D1D1] bg-white px-3.5 pb-2 pt-5 text-left text-sm outline-none transition-colors focus:border-brand"
      >
        <span className={date ? 'text-[#3F3131]' : 'text-transparent'}>
          {date ? date.format('DD / MM / YYYY') : placeholder}
        </span>
      </button>

      <Label
        className={date || open ? 'top-1.5 text-xs font-medium text-[#786c6c]' : 'top-3.5 text-sm text-brand'}
      >
        {label}
      </Label>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] as const }}
            className="absolute top-full left-0 z-50 mt-1 rounded-2xl bg-white shadow-xl ring-1 ring-black/5"
          >
            <DateCalendarPicker value={date} onChange={handleDateChange} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DateInput
