import Link from "next/link";

export function AppNav() {
  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-3xl gap-4 px-4 py-3 text-sm font-medium">
        <Link
          href="/"
          className="text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
        >
          Search
        </Link>
        <Link
          href="/saved"
          className="text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
        >
          Saved Jobs
        </Link>
        <Link
          href="/applications"
          className="text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
        >
          Applications
        </Link>
        <Link
          href="/profile"
          className="text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
        >
          Profile
        </Link>
        <Link
          href="/resumes"
          className="text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
        >
          Resumes
        </Link>
      </div>
    </nav>
  );
}
