import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    // [중요] 사장님 구조에는 src가 없으므로 아래와 같이 적어야 합니다.
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;