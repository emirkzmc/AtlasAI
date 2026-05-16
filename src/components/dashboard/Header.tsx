import AIButton from "./AIButton";
import ProfileDropdown from "./ProfileDropdown";

interface HeaderProps {
  element: string;
  onMenuClick?: () => void;
}

export default function Header({ element, onMenuClick }: HeaderProps) {
  return (
    <div className="flex justify-between items-start mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            {onMenuClick && (
              <button 
                onClick={onMenuClick}
                className="md:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Menüyü aç"
              >
                <img src="/icons/sidebar-icon.svg" alt="Menü" className="w-6 h-6 opacity-70" />
              </button>
            )}
            <h1 className="text-[20px] md:text-[24px] font-medium text-[#535353] mb-0 md:mb-1">{element}</h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <AIButton />
            <ProfileDropdown />
          </div>
    </div>
  )
}
