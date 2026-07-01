import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getTagColors(tag: string): string {
  const colors = [
    { bg: 'bg-red-50 dark:bg-red-950/25 text-red-700 dark:text-red-400 border-red-200/60 dark:border-red-900/40' },
    { bg: 'bg-orange-50 dark:bg-orange-950/25 text-orange-700 dark:text-orange-400 border-orange-200/60 dark:border-orange-900/40' },
    { bg: 'bg-amber-50 dark:bg-amber-950/25 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/40' },
    { bg: 'bg-green-50 dark:bg-green-950/25 text-green-700 dark:text-green-400 border-green-200/60 dark:border-green-900/40' },
    { bg: 'bg-emerald-50 dark:bg-emerald-950/25 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/40' },
    { bg: 'bg-cyan-50 dark:bg-cyan-950/25 text-cyan-700 dark:text-cyan-400 border-cyan-200/60 dark:border-cyan-900/40' },
    { bg: 'bg-sky-50 dark:bg-sky-950/25 text-sky-700 dark:text-sky-400 border-sky-200/60 dark:border-sky-900/40' },
    { bg: 'bg-blue-50 dark:bg-blue-950/25 text-blue-700 dark:text-blue-400 border-blue-200/60 dark:border-blue-900/40' },
    { bg: 'bg-indigo-50 dark:bg-indigo-950/25 text-indigo-700 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-900/40' },
    { bg: 'bg-violet-50 dark:bg-violet-950/25 text-violet-700 dark:text-violet-400 border-violet-200/60 dark:border-violet-900/40' },
    { bg: 'bg-purple-50 dark:bg-purple-950/25 text-purple-700 dark:text-purple-400 border-purple-200/60 dark:border-purple-900/40' },
    { bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/25 text-fuchsia-700 dark:text-fuchsia-400 border-fuchsia-200/60 dark:border-fuchsia-900/40' },
    { bg: 'bg-pink-50 dark:bg-pink-950/25 text-pink-700 dark:text-pink-400 border-pink-200/60 dark:border-pink-900/40' },
    { bg: 'bg-rose-50 dark:bg-rose-950/25 text-rose-700 dark:text-rose-400 border-rose-200/60 dark:border-rose-900/40' },
  ];
  
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index].bg;
}
