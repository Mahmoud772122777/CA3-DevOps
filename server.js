const express = require("express");
const client = require("prom-client");

const app = express();
const PORT = 3000;

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request latency in seconds",
  labelNames: ["method", "route", "status_code"],
  registers: [register]
});

const httpErrors = new client.Counter({
  name: "http_request_errors_total",
  help: "Total HTTP errors",
  registers: [register]
});

app.use((req, res, next) => {
  const end = httpDuration.startTimer();

  res.on("finish", () => {
    end({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    });

    if (res.statusCode >= 400) {
      httpErrors.inc();
    }
  });

  next();
});

app.get("/", (req, res) => {
  res.send("Hello from CA3 DevOps!");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});