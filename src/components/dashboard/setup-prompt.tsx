import Link from "next/link";

interface SetupPromptProps {
  title: string;
  description: string;
  href: string;
  linkLabel: string;
}

/** Shown when the Dashboard can't run recommendations yet because Profile/Resume setup is incomplete. */
export function SetupPrompt({ title, description, href, linkLabel }: SetupPromptProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-zinc-200 py-16 text-center dark:border-zinc-800">
      <p className="text-base font-medium text-zinc-900 dark:text-zinc-50">{title}</p>
      <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      <Link
        href={href}
        className="rounded-md border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {linkLabel}
      </Link>
    </div>
  );
}
