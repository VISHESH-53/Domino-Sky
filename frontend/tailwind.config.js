/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        aviation: {
          darkest: '#050811',
          bg: '#0a0f1d',
          card: '#0f172a',
          cardBorder: '#1e293b',
          cardHover: '#172554',
          cyan: '#00f0ff',
          cyanDim: '#0284c7',
          amber: '#f59e0b',
          amberDim: '#b45309',
          red: '#ef4444',
          redDim: '#991b1b',
          green: '#10b981',
          greenDim: '#047857',
          textMuted: '#94a3b8',
          textBright: '#f8fafc',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['"Inter"', 'sans-serif'],
        display: ['"Rajdhani"', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'radar-sweep': 'sweep 4s linear infinite',
      },
      keyframes: {
        sweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        }
      }
    },
  },
  plugins: [],
}
