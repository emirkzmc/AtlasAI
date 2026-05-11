import AIButton from "./AIButton";
import ProfileDropdown from "./ProfileDropdown";

export default function Header({ element }: { element: string }) {
  return (
    <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-[24px] font-medium   text-[#535353] mb-1">{element}</h1>
          </div>
          <div className="flex items-center gap-4">
            <AIButton />
            <ProfileDropdown />
          </div>
    </div>
  )
}
