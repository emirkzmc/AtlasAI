export type UserRole = "student" | "teacher";

export type FormFieldDef = {
  name: string;
  label: string;
  type: string;
};

export interface AuthUser {
  uid: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  fullName?: string;
  photoURL?: string;
  activityLog?: string[];
  birthDate?: string;
  age?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  role: UserRole;
  fullName?: string;
  birthDate?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
}
