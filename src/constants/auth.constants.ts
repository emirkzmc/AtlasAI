import type { FormFieldDef } from "../types/auth.types";

export const STUDENT_REGISTER_FIELDS: FormFieldDef[] = [
  { name: 'fullName', label: 'Ad Soyad', type: 'text' },
  { name: 'birthDate', label: 'Doğum Tarihi', type: 'date' },
  { name: 'phone', label: 'Telefon numarası', type: 'tel' },
  { name: 'email', label: 'E-posta', type: 'email' },
  { name: 'password', label: 'Şifre', type: 'password' },
];

export const TEACHER_REGISTER_FIELDS: FormFieldDef[] = [
  { name: 'fullName', label: 'Ad Soyad', type: 'text' },
  { name: 'phone', label: 'Telefon numarası', type: 'tel' },
  { name: 'email', label: 'E-posta', type: 'email' },
  { name: 'password', label: 'Şifre', type: 'password' },
];
