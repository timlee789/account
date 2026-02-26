/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},  // 여기가 핵심 변경 사항입니다
    autoprefixer: {},
  },
};

export default config;