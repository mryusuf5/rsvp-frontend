/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        shade: {
          white: 'rgb(var(--c-shade-white) / <alpha-value>)',
          dark: 'rgb(var(--c-shade-dark) / <alpha-value>)',
        },
        neutral: {
          1: 'rgb(var(--c-neutral-1) / <alpha-value>)',
          2: 'rgb(var(--c-neutral-2) / <alpha-value>)',
          3: 'rgb(var(--c-neutral-3) / <alpha-value>)',
          4: 'rgb(var(--c-neutral-4) / <alpha-value>)',
          5: 'rgb(var(--c-neutral-5) / <alpha-value>)',
          6: 'rgb(var(--c-neutral-6) / <alpha-value>)',
          7: 'rgb(var(--c-neutral-7) / <alpha-value>)',
          8: 'rgb(var(--c-neutral-8) / <alpha-value>)',
        },
        primary: {
          1: 'rgb(var(--c-primary-1) / <alpha-value>)',
          2: 'rgb(var(--c-primary-2) / <alpha-value>)',
        },
        error: {
          1: 'rgb(var(--c-error-1) / <alpha-value>)',
          2: 'rgb(var(--c-error-2) / <alpha-value>)',
        },
        accent: {
          1: 'rgb(var(--c-accent-1) / <alpha-value>)',
          2: 'rgb(var(--c-accent-2) / <alpha-value>)',
        },
        link: 'rgb(var(--c-link) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
