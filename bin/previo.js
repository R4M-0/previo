#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const stateFile = path.join(repoRoot, ".previo-runtime.json");

function run(cmd, args, options = {}) {
  return spawnSync(cmd, args, {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
    ...options,
  });
}

function detectCompose() {
  const dockerCompose = spawnSync("docker", ["compose", "version"], {
    stdio: "ignore",
  });
  if (dockerCompose.status === 0) {
    return { cmd: "docker", baseArgs: ["compose"] };
  }
  const composeStandalone = spawnSync("docker-compose", ["--version"], {
    stdio: "ignore",
  });
  if (composeStandalone.status === 0) {
    return { cmd: "docker-compose", baseArgs: [] };
  }
  console.error("Docker Compose was not found. Install Docker Desktop or docker-compose.");
  process.exit(1);
}

function parsePort(raw) {
  if (!raw) return 3000;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`Invalid port "${raw}". Expected an integer between 1 and 65535.`);
    process.exit(1);
  }
  return port;
}

function saveState(state) {
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

function clearState() {
  if (fs.existsSync(stateFile)) {
    fs.rmSync(stateFile);
  }
}

function usage() {
  console.log("Usage:");
  console.log("  previo start <port>");
  console.log("  previo stop");
}

function start(portArg) {
  const port = parsePort(portArg);
  const compose = detectCompose();
  const result = run(
    compose.cmd,
    [...compose.baseArgs, "up", "-d", "--build"],
    {
      env: {
        ...process.env,
        PREVIO_PORT: String(port),
      },
    }
  );
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
  saveState({ port, startedAt: new Date().toISOString() });
  console.log(`Previo started on http://localhost:${port}`);
}

function stop() {
  const compose = detectCompose();
  const result = run(compose.cmd, [...compose.baseArgs, "down", "--remove-orphans"]);
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
  clearState();
  console.log("Previo stopped.");
}

const [, , command, arg] = process.argv;

if (!command) {
  usage();
  process.exit(1);
}

if (command === "start") {
  start(arg);
} else if (command === "stop") {
  stop();
} else {
  usage();
  process.exit(1);
}
