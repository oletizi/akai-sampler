import type { Config } from 'tailwindcss'
export default {
  content: ["./src/**/*.{html,js,jsx,tsx}"],
  theme: {
    extend: {},
  },
  fontFamily: {
    sans: ['Inter', 'sans-serif']
  },
  plugins: [],
} satisfies Config

