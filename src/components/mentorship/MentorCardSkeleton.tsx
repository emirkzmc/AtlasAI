export default function MentorCardSkeleton() {
  return (
    <article className="min-h-19 rounded-lg bg-white px-5 py-4 shadow-sm ring-1 ring-black/5 animate-pulse">
      <div className="flex h-full gap-4">
        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
             <div className="h-4 w-1/3 bg-gray-200 rounded" />
             <div className="h-5 w-20 bg-gray-200 rounded-full" />
          </div>
          <div className="space-y-2">
             <div className="h-3 w-full bg-gray-200 rounded" />
             <div className="h-3 w-5/6 bg-gray-200 rounded" />
             <div className="h-3 w-4/6 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    </article>
  );
}
