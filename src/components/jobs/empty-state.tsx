interface EmptyStateProps {
  title: string;
  description: string;
}

/** Generic empty-state message — callers own the copy so this is reusable across screens. */
export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-1 py-16 text-center text-zinc-500 dark:text-zinc-400">
      <p className="text-base font-medium">{title}</p>
      <p className="text-sm">{description}</p>
    </div>
  );
}
