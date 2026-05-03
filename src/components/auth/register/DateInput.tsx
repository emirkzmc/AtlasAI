import { useState, useRef, useEffect } from 'react'
import type { Dayjs } from 'dayjs'
import { AnimatePresence, motion } from 'framer-motion'
import DateCalendarPicker from '../../DateCalendar'
import Label from '../../Label'

type DateInputProps = {
  name: string
  label: string
  placeholder?: string
}

function DateInput({ name, label, placeholder }: DateInputProps) {
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
    setDate(newDate)
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input type="hidden" name={name} value={date ? date.format('YYYY-MM-DD') : ''} />

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
