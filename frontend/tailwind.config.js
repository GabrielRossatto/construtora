/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        hubBlue: '#1570be',
        hubBlueDark: '#0f4d86',
        hubBlueDeep: '#07366a',
        pageGray: '#eff1f4'
      },
      fontFamily: {
        hub: ['Helvetica Neue', 'Arial', 'sans-serif']
      },
      boxShadow: {
        glass: '0 0 30px rgba(120, 190, 245, 0.35)',
        soft: '0 8px 28px rgba(11, 72, 130, 0.18)'
      }
    }
  },
  plugins: []
}
