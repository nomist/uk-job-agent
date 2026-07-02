"use client";

import { useState } from "react";
import type { FormEvent } from "react";

export interface SearchFormValues {
  q: string;
  location: string;
}

interface SearchFormProps {
  onSearch: (values: SearchFormValues) => void;
  disabled?: boolean;
}

export function SearchForm({ onSearch, disabled }: SearchFormProps) {
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSearch({ q: q.trim(), location: location.trim() });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 sm:flex-row"
      aria-label="Job search"
    >
      <div className="flex-1">
        <label htmlFor="search-keyword" className="sr-only">
          Keyword
        </label>
        <input
          id="search-keyword"
          type="text"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Job title, skill, or company"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div className="flex-1">
        <label htmlFor="search-location" className="sr-only">
          Location
        </label>
        <input
          id="search-location"
          type="text"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Location (e.g. London)"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <button
        type="submit"
        disabled={disabled}
        className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {disabled ? "Searching…" : "Search"}
      </button>
    </form>
  );
}
