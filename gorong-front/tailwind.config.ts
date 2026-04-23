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
        'float': 'float 3s ease-in-out infinite',
        'bounce-gentle': 'bounce-gentle 2s ease-in-out infinite',
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
      },
      fontFamily: {
        sans: ['Noto Sans', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
