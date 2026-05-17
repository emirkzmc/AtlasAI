function Logo({ className, txtColor = "white" }: { className?: string, txtColor?: string }) {
    return (
        <div className="flex items-center space-x-2">
            <span className={`text-4xl text-${txtColor} ${className}`}>AtlasAI</span>
        </div>
    )
}

export default Logo
