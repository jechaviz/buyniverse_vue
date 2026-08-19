(function (global) {
  'use strict';

  global.__unocss = {
    dark: 'class',
    theme: {
      colors: {
        brand: { DEFAULT: '#e5484d', 50: '#fff1f1', 100: '#ffe3e3', 200: '#ffc9c9', 500: '#e5484d', 600: '#c9363c', 700: '#a52b30' },
        ink: { DEFAULT: '#0f172a', soft: '#64748b' },
        surface: { DEFAULT: '#f8fafc', dark: '#0b0f19' }
      },
      fontFamily: {
        sans: '"Plus Jakarta Sans", Inter, "DM Sans", ui-sans-serif, system-ui, -apple-system, sans-serif',
        head: '"Plus Jakarta Sans", Manrope, "DM Sans", sans-serif'
      },
      boxShadow: {
        card: '0 4px 20px -4px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(15, 23, 42, 0.02)',
        soft: '0 4px 12px -2px rgba(15, 23, 42, 0.04)',
        elevated: '0 14px 30px -10px rgba(15, 23, 42, 0.12)'
      }
    },
    shortcuts: [
      ['btn', 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-150 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none'],
      ['btn-brand', 'btn bg-brand text-white hover:bg-brand-600 shadow-soft hover:shadow-elevated'],
      ['btn-muted', 'btn bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm'],
      ['panel', 'rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md shadow-card'],
      ['field', 'w-full rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/90 px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition focus:border-brand focus:ring-3 focus:ring-brand/15'],
      ['badge', 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide']
    ]
  };
})(window);
