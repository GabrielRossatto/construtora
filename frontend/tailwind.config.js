/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        hubBlue: '#8f8f8f',
        hubBlueDark: '#4f4f4f',
        hubBlueDeep: '#1a1a1a',
        pageGray: '#040404',
        pageSurface: '#121212'
      },
      fontFamily: {
        hub: ['Helvetica Neue', 'Arial', 'sans-serif']
      },
      boxShadow: {
        glass: '0 0 34px rgba(255, 255, 255, 0.12)',
        soft: '0 12px 34px rgba(0, 0, 0, 0.34)'
      }
    }
  },
  plugins: []
}
