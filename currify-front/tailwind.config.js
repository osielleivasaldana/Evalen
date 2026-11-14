/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        /* Login page palette (ev- prefix to avoid conflicts) */
        ev: {
          paper: '#F6F1E6',
          paper2: '#EFE7D6',
          card: '#FCFAF3',
          ink: '#15261E',
          ink2: '#4C5B51',
          ink3: '#828E84',
          green: '#1C5B44',
          greendeep: '#0F3A2C',
          greentint: '#E4ECE4',
          onmark: '#F6F1E6',
          yellow: '#F3E94E',
          yellow2: '#FBF6AE',
          cta: '#D64518',
          ctah: '#B5370F',
          ctatext: '#FFF7EC',
          line: 'rgba(21,38,30,.13)',
          line2: 'rgba(21,38,30,.24)',
          good: '#1C5B44',
          mid: '#A9760F',
          low: '#B23B2E',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        jakarta: ['"Plus Jakarta Sans"', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'Times New Roman', 'serif'],
        sans: ['Instrument Sans', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #2F8E6B, #3D7A5E)',
        'gradient-stat-1': 'linear-gradient(135deg, #2F8E6B, #3D7A5E)',
        'gradient-stat-2': 'linear-gradient(135deg, #5BAE88, #2F8E6B)',
        'gradient-stat-3': 'linear-gradient(135deg, #3D7A5E, #5BAE88)',
        'gradient-stat-4': 'linear-gradient(135deg, #2F8E6B, #5BAE88)',
        'gradient-header': 'linear-gradient(90deg, #2F8E6B, #3D7A5E)',
        'gradient-modal-warning': 'linear-gradient(90deg, #B23B2E, #8C2A1F)',
        'gradient-talent-bg': 'linear-gradient(90deg, #EDF5F0, #E8F2EC, #F0F5F2)',
        'gradient-logo': 'linear-gradient(90deg, #2F8E6B, #5BAE88)',
        'gradient-logo-light': 'linear-gradient(90deg, #5BAE88, #7DC4A3)',
        grain: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        'card-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'card': '0 22px 48px -28px rgba(15,40,30,.5)',
        'card-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'card-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'card-xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        'glow-indigo': '0 0 20px rgb(47 142 107 / 0.3)',
        'glow-purple': '0 0 20px rgb(91 174 136 / 0.3)',
        'stat': '0 4px 14px 0 rgb(47 142 107 / 0.25)',
        'talent': '0 10px 40px -10px rgb(47 142 107 / 0.15)',
        'modal': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'inner-glow': 'inset 0 1px 0 0 rgb(255 255 255 / 0.1)',
        /* Login shadows */
        'card-lg-evalen': '0 22px 48px -28px rgba(15,40,30,.55)',
        'soft-evalen': '0 10px 26px -18px rgba(15,40,30,.45)',
        'cta-evalen': '0 12px 22px -12px rgba(214,69,24,.6)',
        'card-evalen': '0 22px 48px -28px rgba(15,40,30,.5)',
        'cta': '0 12px 22px -12px rgba(214,69,24,.6)',
        'gold': '0 10px 24px -12px rgba(243,233,78,.45)',
        /* Mockup Evalen shadows */
        'soft': '0 10px 26px -18px rgba(15,40,30,.45)',
        'pop': '0 18px 40px -22px rgba(15,40,30,.55)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        /* Login keyframes */
        pulsering: {
          '0%': { boxShadow: '0 0 0 0 rgba(98,183,143,.55)' },
          '70%': { boxShadow: '0 0 0 7px rgba(98,183,143,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(98,183,143,0)' },
        },
        floaty: {
          '0%, 100%': { transform: 'translateY(0) rotate(-1.6deg)' },
          '50%': { transform: 'translateY(-6px) rotate(-1.6deg)' },
        },
        popin: {
          '0%': { opacity: '0', transform: 'scale(.85)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-in-up': 'fade-in-up 0.4s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse-slow 2s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        /* Login animations */
        pulsering: 'pulsering 2.2s infinite',
        floaty: 'floaty 6.5s ease-in-out infinite',
        popin: 'popin .4s cubic-bezier(.2,.8,.2,1) both',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  plugins: [],
}
