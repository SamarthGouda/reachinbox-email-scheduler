/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#E8F7ED',
          100: '#D1EFE0',
          200: '#A3DFC1',
          500: '#00A859',
          600: '#00964D',
          700: '#007A3E',
        },
        scheduledBadge: {
          bg: '#FFF3E0',
          text: '#D97706',
          border: '#FDE68A',
        },
        sentBadge: {
          bg: '#F3F4F6',
          text: '#4B5563',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
