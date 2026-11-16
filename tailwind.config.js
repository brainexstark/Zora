/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        zora: {
          bg: "#000000",
          bgsoft: "#0A0A0A",
          card: "#1A1A1A",
          text: "#FFFFFF",
          accent: "#FF0033",
          success: "#00FF88"
        }
      },
      fontFamily: {
        header: ["SpaceGrotesk-Bold"],
        body: ["Inter"]
      }
    }
  },
  plugins: []
};
