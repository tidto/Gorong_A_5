/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#ffefdc',
          100: '#ffd9a8',
          200: '#ffc273',
          300: '#ffab3f',
          400: '#ff940a',
          500: '#ff8c42',
          600: '#ff7a0f',
          700: '#e67c0a',
          800: '#cc7008',
          900: '#b36005',
        },
        secondary: {
          50: '#e3f2fd',
          100: '#bbdefb',
          200: '#90caf9',
          300: '#64b5f6',
          400: '#42a5f5',
          500: '#3e7cb1',
          600: '#3b709e',
          700: '#33628b',
          800: '#2c5579',
          900: '#1e3a5f',
        },
        success: '#4CAF50',
        warning: '#FFC107',
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
        'bounce-gentle': 'bounce-gentle 2s ease-in-out infinite',
        wiggle: 'wiggle 0.45s ease-in-out',
        'pop-in': 'pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        squish: 'squish 0.5s ease-out',
        'slot-pulse': 'slot-pulse 1.5s ease-in-out infinite',
        sparkle: 'sparkle 2s ease-in-out infinite',
        twinkle: 'twinkle 3s ease-in-out infinite',
        'cloud-drift': 'cloud-drift 18s ease-in-out infinite',
        'petal-sway': 'petal-sway 4s ease-in-out infinite',
        'gentle-glow': 'gentle-glow 4s ease-in-out infinite',
        'cat-jump': 'cat-jump 0.55s cubic-bezier(0.34, 1.4, 0.64, 1)',
        'tail-wag': 'tail-wag 0.5s ease-in-out',
        'preview-flash': 'preview-flash 0.45s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'bounce-gentle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-4deg)' },
          '50%': { transform: 'rotate(4deg)' },
        },
        'pop-in': {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        squish: {
          '0%, 100%': { transform: 'scale(1, 1)' },
          '30%': { transform: 'scale(1.08, 0.92)' },
          '60%': { transform: 'scale(0.95, 1.05)' },
        },
        'slot-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 140, 66, 0.35)' },
          '50%': { boxShadow: '0 0 0 6px rgba(255, 140, 66, 0)' },
        },
        sparkle: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.15)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.25', transform: 'scale(0.85)' },
          '50%': { opacity: '1', transform: 'scale(1.1)' },
        },
        'cloud-drift': {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(12px)' },
        },
        'petal-sway': {
          '0%, 100%': { transform: 'translateY(0) rotate(-6deg)' },
          '50%': { transform: 'translateY(-8px) rotate(6deg)' },
        },
        'gentle-glow': {
          '0%, 100%': { opacity: '0.45' },
          '50%': { opacity: '0.85' },
        },
        'cat-jump': {
          '0%': { transform: 'translateY(0) scale(1)' },
          '35%': { transform: 'translateY(-14px) scale(1.06)' },
          '55%': { transform: 'translateY(-4px) scale(0.98)' },
          '100%': { transform: 'translateY(0) scale(1)' },
        },
        'tail-wag': {
          '0%, 100%': { transform: 'rotate(-18deg)' },
          '50%': { transform: 'rotate(22deg)' },
        },
        'preview-flash': {
          '0%': { opacity: '0.55', transform: 'scale(0.97)' },
          '50%': { opacity: '1', transform: 'scale(1.03)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      fontFamily: {
        sans: ['Noto Sans', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
