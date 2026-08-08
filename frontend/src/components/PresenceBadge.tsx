interface PresenceBadgeProps {
  count: number
}

export default function PresenceBadge({ count }: PresenceBadgeProps) {
  if (count <= 1) return null

  return (
    <div
      className="fixed top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 shadow-sm backdrop-blur dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
      role="status"
      aria-label={`${count} usuários online`}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      {count} {count === 1 ? "online" : "online"}
    </div>
  )
}
