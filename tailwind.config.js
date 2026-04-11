/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#e0eaff',
          200: '#c7d7fe',
          300: '#a5bbfd',
          400: '#8196fa',
          500: '#6272f5',
          600: '#4f57ea',
          700: '#4046cf',
          800: '#353aa7',
          900: '#2e3484',
          950: '#1c1f50',
        },
        surface: {
          DEFAULT: '#0d0e1a',
          1: '#12142a',
          2: '#181b33',
          3: '#1e2240',
        },
        danger: '#ef4444',
        warn:   '#f59e0b',
        ok:     '#22c55e',
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body:    ['var(--font-body)', 'sans-serif'],
        mono:    ['var(--font-mono)', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(98,114,245,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(98,114,245,0.05) 1px, transparent 1px)",
      },
      backgroundSize: {
        'grid': '32px 32px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'scan': 'scan 2s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(98,114,245,0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(98,114,245,0.7), 0 0 40px rgba(98,114,245,0.3)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [],
}
