const express = require("express");
const path = require("path");

const app = express();
const DIST_DIR = path.join(__dirname, "dist");

const FRONTEND_PORT = process.env.PORT || 8080;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

async function proxyRequest(req, res) {
  try {
    const targetUrl = new URL(req.originalUrl, BACKEND_URL).toString();

    const headers = { ...req.headers };
    delete headers.host;
    delete headers["content-length"];

    const options = {
      method: req.method,
      headers
    };

    if (!["GET", "HEAD"].includes(req.method)) {
      const body = req.body && Object.keys(req.body).length ? JSON.stringify(req.body) : undefined;
      if (body) {
        options.body = body;
        options.headers["content-type"] = "application/json";
      }
    }

    const upstream = await fetch(targetUrl, options);

    res.status(upstream.status);

    const contentType = upstream.headers.get("content-type");
    if (contentType) {
      res.setHeader("content-type", contentType);
    }

    const text = await upstream.text();
    res.send(text);
  } catch (error) {
    res.status(502).json({
      error: "Proxy request failed",
      message: error.message
    });
  }
}

app.all(["/auth/*", "/dev/*", "/logs", "/logs/*"], proxyRequest);

app.use(express.static(DIST_DIR));

app.get("*", (req, res) => {
  res.sendFile(path.join(DIST_DIR, "index.html"));
});

app.listen(FRONTEND_PORT, () => {
  console.log(`Frontend server running at http://localhost:${FRONTEND_PORT}`);
  console.log(`Proxying API requests to ${BACKEND_URL}`);
});
