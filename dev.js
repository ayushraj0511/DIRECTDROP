import { spawn } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const children = [];

function run(command, args, label) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    windowsHide: false
  });
  children.push(child);
  child.on("error", (err) => {
    console.error(`[${label}] failed to start: ${err.message}`);
  });
  child.on("exit", (code, signal) => {
    if (code && code !== 0) console.error(`[${label}] exited with code ${code}`);
  });
  return child;
}

// Start the backend directly with Node.
run(process.execPath, [path.join(root, "server.js")], "server");

// Do NOT spawn `npm` here. On some Windows installations (especially Node 24),
// spawning npm.cmd from a Node child process can throw ENOENT/ENIVAL.
// Start Vite's CLI directly instead.
const viteCli = path.join(root, "node_modules", "vite", "bin", "vite.js");
run(process.execPath, [viteCli, "--host", "0.0.0.0"], "vite");

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", shutdown);
