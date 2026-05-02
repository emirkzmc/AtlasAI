import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import type { Dayjs } from 'dayjs'
import 'dayjs/locale/tr'

type DateCalendarPickerProps = {
  value: Dayjs | null
  onChange: (date: Dayjs | null) => void
}

export default function DateCalendarPicker({ value, onChange }: DateCalendarPickerProps) {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="tr">
      <DateCalendar value={value} onChange={onChange} />
    </LocalizationProvider>
  )
}
