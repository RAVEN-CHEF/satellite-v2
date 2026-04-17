/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './context/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        sat: {
          bg:      '#07080d',
          surface: '#0f1117',
          border:  '#1c2030',
          muted:   '#2a3050',
          text:    '#c8cfe8',
          dim:     '#5a6280',
          accent:  '#00e5a0',
          accentD: '#00b87d',
          warn:    '#f59e0b',
          danger:  '#ef4444',
          info:    '#3b82f6',
        },
      },
      fontFamily: {
        display: ['"DM Mono"', 'monospace'],
        body:    ['"IBM Plex Sans"', 'sans-serif'],
      },
      animation: {
        'fade-in':    'fadeIn 0.25s ease-in-out',
        'slide-up':   'slideUp 0.25s ease-out',
        'slide-in':   'slideIn 0.25s ease-out',
        'pulse-glow': 'pulseGlow 2s infinite',
      },
      keyframes: {
        fadeIn:    { '0%': { opacity: 0 },                                  '100%': { opacity: 1 } },
        slideUp:   { '0%': { transform: 'translateY(10px)', opacity: 0 },   '100%': { transform: 'translateY(0)', opacity: 1 } },
        slideIn:   { '0%': { transform: 'translateX(-100%)' },              '100%': { transform: 'translateX(0)' } },
        pulseGlow: { '0%, 100%': { boxShadow: '0 0 0px #00e5a040' },        '50%': { boxShadow: '0 0 20px #00e5a060' } },
      },
    },
  },
  plugins: [],
}
