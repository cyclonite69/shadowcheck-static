import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  safelist: [
    // Only for genuinely dynamic classes (e.g., data-driven gradients)
    {
      pattern:
        /^(from|to)-(red|orange|yellow|green|blue|purple|cyan|emerald|indigo|amber)-(600|700|800|900)$/,
    },
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme slate palette
        slate: {
          ...colors.slate,
          950: '#0f172a',
        },
      },
      zIndex: {
        dropdown: '100',
        modal: '1000',
      },
    },
  },
  plugins: [],
  darkMode: 'class', // Enable dark mode via class
};
