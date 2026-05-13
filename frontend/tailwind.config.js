/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        forest: { 50:'#f0fdf4',100:'#dcfce7',200:'#bbf7d0',300:'#86efac',400:'#4ade80',500:'#22c55e',600:'#16a34a',700:'#15803d',800:'#166534',900:'#14532d' },
        earth:  { 50:'#fdf8f0',100:'#faefd8',200:'#f4ddb0',300:'#ecc47a',400:'#e4a645',500:'#d4851a',600:'#b86e10',700:'#92540d',800:'#6b3e0f',900:'#4a2c17' },
        jade:   { 400:'#34d399',500:'#10b981',600:'#059669',700:'#047857' },
      },
      backgroundImage: {
        'gradient-farm':    'linear-gradient(135deg, #0f2b0a 0%, #1a4a14 35%, #0d3b2e 70%, #052220 100%)',
        'gradient-sunrise': 'linear-gradient(135deg, #1a0a00 0%, #4a2c17 40%, #8b5e3c 70%, #d4851a 100%)',
        'gradient-sky':     'linear-gradient(180deg, #0c1a3e 0%, #1e3a6e 50%, #3d6b9e 100%)',
        'gradient-card':    'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
      },
    },
  },
  plugins: [],
}
