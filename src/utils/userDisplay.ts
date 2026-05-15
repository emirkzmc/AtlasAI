import type { AuthUser } from "../types/auth.types";

/** Ad soyad: firstName+lastName → fullName → displayName → email @ öncesi */
export function getUserDisplayName(user?: AuthUser | null): string {
  if (!user) return "Kullanıcı";
  const fn = user.firstName?.trim();
  const ln = user.lastName?.trim();
  if (fn || ln) return [fn, ln].filter(Boolean).join(" ");
  const full = user.fullName?.trim();
  if (full) return full;
  const display = user.displayName?.trim();
  if (display) return display;
  return user.email?.split("@")[0] ?? "Kullanıcı";
}

/** Profil görseli: photoURL (Storage) veya photoDataUrl (Firestore fallback) */
export function getUserPhotoSrc(user?: AuthUser | null): string | undefined {
  if (!user) return undefined;
  return user.photoURL ?? user.photoDataUrl;
}

/** Avatar harfleri (en fazla 2 karakter) */
export function getUserInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
