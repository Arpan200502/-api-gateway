const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");

module.exports = defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/auth": "https://api-gateway-p3le.onrender.com",
      "/dev": "https://api-gateway-p3le.onrender.com",
      "/logs": "https://api-gateway-p3le.onrender.com",
      "/gateway": "https://api-gateway-p3le.onrender.com",
    },
  },
});
