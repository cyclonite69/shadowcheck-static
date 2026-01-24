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
        // Dashboard theme colors
        'dashboard-dark': '#0a1525',
        'dashboard-mid': '#0d1c31',
        'dashboard-darker': '#0a1424',
      },
      backgroundImage: {
        'dashboard-gradient': 'linear-gradient(135deg, #0a1525 0%, #0d1c31 40%, #0a1424 100%)',
        'dashboard-gradient-subtle':
          'radial-gradient(circle at 20% 20%, rgba(52, 211, 153, 0.06), transparent 25%), radial-gradient(circle at 80% 0%, rgba(59, 130, 246, 0.06), transparent 20%), linear-gradient(135deg, #0a1525 0%, #0d1c31 40%, #0a1424 100%)',
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
