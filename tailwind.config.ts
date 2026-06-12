import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        rcg: {
          maroon:    '#8B0A3D',
          maroonDark:'#6B0830',
          maroonLight:'#C41E5A',
          charcoal:  '#1A0A10',
          muted:     '#9B8A92',
          border:    '#EDE0E6',
          surface:   '#F8F4F6',
          positive:  '#16A34A',
          negative:  '#DC2626',
          nifty:     '#2563EB',
          footer:    '#0F0208',
        },
        brand: {
          primary: "#8B0A3D",
          secondary: "#6B0830",
          accent: "#C41E5A",
          surface: "#F8F4F6",
          border: "#EDE0E6",
          text: {
            primary: "#1A0A10",
            secondary: "#6B4A58",
          }
        },
        pnl: {
          positive: "#16A34A",
          negative: "#DC2626",
          neutral: "#92400E",
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
      },
    },
  },
  plugins: [],
};
export default config;
