import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand-red':        '#ED2643',
        'brand-black':      '#000000',
        'brand-white':      '#FFFFFF',
        'brand-light-grey': '#F2F2F2',
        'brand-mid-grey':   '#888888',
        'brand-rule-grey':  '#DDDDDD',
      },
      fontFamily: {
        sans: ['Metropolis', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
