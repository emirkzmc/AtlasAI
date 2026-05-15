import { useRef, useState, type ChangeEvent, type CSSProperties } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { uploadProfilePhoto } from "../../../services/profile.service";
import { getUserDisplayName, getUserPhotoSrc, getUserInitials } from "../../../utils/userDisplay";

const ACCEPT = "image/jpeg,image/jpg,image/png";

type ProfileAvatarProps = {
  size?: number;
  editable?: boolean;
  onError?: (message: string) => void;
};

export default function ProfileAvatar({
  size = 120,
  editable = false,
  onError,
}: ProfileAvatarProps) {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const displayName = getUserDisplayName(user);
  const photoSrc = getUserPhotoSrc(user);
  const initials = getUserInitials(displayName);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user?.uid) return;

    onError?.("");
    setUploading(true);
    try {
      await uploadProfilePhoto(user.uid, file);
      await refreshUser();
    } catch (err: unknown) {
      console.error("[ProfileAvatar] upload error:", err);
      const msg =
        err instanceof Error ? err.message : "Profil fotoğrafı yüklenemedi.";
      onError?.(msg);
    } finally {
      setUploading(false);
    }
  }

  const frameStyle: CSSProperties = { width: size, height: size };
  const frameClass =
    "rounded-full overflow-hidden shrink-0 border-[3px] border-[#E8E8E8] shadow-sm flex items-center justify-center bg-[#5B4F4B]";

  const content = photoSrc ? (
    <img src={photoSrc} alt={displayName} className="w-full h-full object-cover" />
  ) : (
    <span
      className="text-white font-semibold select-none"
      style={{ fontSize: Math.round(size * 0.35) }}
    >
      {initials.charAt(0)}
    </span>
  );

  if (!editable) {
    return (
      <div className={frameClass} style={frameStyle}>
        {content}
      </div>
    );
  }

  return (
    <div className={frameClass} style={frameStyle}>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="group relative w-full h-full cursor-pointer border-0 p-0 disabled:cursor-wait"
        aria-label="Profil fotoğrafını değiştir"
      >
        {content}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/35 transition-colors">
          {uploading ? (
            <svg className="animate-spin w-7 h-7 text-white" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <svg
              className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          )}
        </span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
