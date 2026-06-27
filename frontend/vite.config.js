const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");

module.exports = defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/auth": "http://localhost:3000",
      "/dev": "http://localhost:3000",
      "/logs": "http://localhost:3000",
      "/gateway": "http://localhost:3000",
    },
  },
});
