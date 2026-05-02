import { useState } from 'react'
import RegisterImage from '../components/register/RegisterImage'
import RegisterForm from '../components/register/RegisterForm'

type Role = 'student' | 'teacher'

const studentFields = [
  { name: 'fullName', label: 'Ad Soyad', type: 'text' },
  { name: 'birthDate', label: 'Doğum Tarihi', type: 'date' },
  { name: 'phone', label: 'Telefon numarası', type: 'tel' },
  { name: 'email', label: 'E-posta', type: 'email' },
  { name: 'password', label: 'Şifre', type: 'password' },
]

const teacherFields = [
  { name: 'fullName', label: 'Ad Soyad', type: 'text' },
  { name: 'department', label: 'Bölüm', type: 'text' },
  { name: 'phone', label: 'Telefon numarası', type: 'tel' },
  { name: 'email', label: 'E-posta', type: 'email' },
  { name: 'password', label: 'Şifre', type: 'password' },
]

function RegisterPage() {
  const [role, setRole] = useState<Role>('student')

  const isStudent = role === 'student'
  const fields = isStudent ? studentFields : teacherFields
  const direction = isStudent ? 1 : -1

  return (
    <main className="h-screen w-screen overflow-hidden">
      <section className="flex h-full w-full">
        {isStudent ? (
          <>
            <RegisterImage role={role} direction={direction} />
            <RegisterForm role={role} fields={fields} direction={direction} onRoleChange={setRole} />
          </>
        ) : (
          <>
            <RegisterForm role={role} fields={fields} direction={direction} onRoleChange={setRole} />
            <RegisterImage role={role} direction={direction} />
          </>
        )}
      </section>
    </main>
  )
}

export default RegisterPage
