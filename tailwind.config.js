/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: '#08080e',
        glass: 'rgba(255,255,255,0.05)',
        'glass-border': 'rgba(255,255,255,0.10)',
        'glass-border-active': 'rgba(255,255,255,0.20)',
        accent: {
          indigo: '#818cf8',
          violet: '#a78bfa',
          pink: '#f472b6',
        },
        status: {
          online: '#34d399',
          busy: '#a78bfa',
          offline: '#6b7280',
          error: '#f87171',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 8px 2px rgba(167, 139, 250, 0.6)' },
          '50%': { opacity: '0.7', boxShadow: '0 0 16px 4px rgba(167, 139, 250, 0.9)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backdropBlur: {
        xl: '20px',
      },
    },
  },
  plugins: [],
}
