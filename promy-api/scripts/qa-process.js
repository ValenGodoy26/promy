const path = require("path");
const { fork, spawn } = require("child_process");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function collectOutput(stream, append) {
  stream?.on("data", (chunk) => append(chunk.toString()));
}

function startApi({ root, env, port }) {
  let stdout = "";
  let stderr = "";
  const appendStdout = (value) => {
    stdout = `${stdout}${value}`.slice(-50_000);
  };
  const appendStderr = (value) => {
    stderr = `${stderr}${value}`.slice(-50_000);
  };

  const child = fork(path.join(root, "dist/server.js"), [], {
    cwd: root,
    env: { ...env, PORT: String(port) },
    silent: true,
  });

  collectOutput(child.stdout, appendStdout);
  collectOutput(child.stderr, appendStderr);

  return {
    child,
    getOutput: () => ({ stdout, stderr }),
  };
}

async function waitForHealth({ url, child, timeoutMs = 20_000 }) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    if (child.exitCode != null) {
      throw new Error(`La API de test termino antes del healthcheck (exit ${child.exitCode}).`);
    }

    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`Healthcheck devolvio ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await sleep(250);
  }

  throw lastError || new Error(`Timeout esperando ${url}`);
}

async function stopProcessTree(child) {
  if (!child || child.exitCode != null) return;

  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        shell: false,
      });
      killer.once("error", resolve);
      killer.once("exit", resolve);
    });
  } else {
    child.kill("SIGTERM");
  }

  if (child.exitCode != null) return;

  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    sleep(5_000),
  ]);

  if (child.exitCode == null && process.platform !== "win32") {
    child.kill("SIGKILL");
  }
}

function runCommand(command, args, { root, env }) {
  return new Promise((resolve, reject) => {
    const requiresWindowsCommandShell =
      process.platform === "win32" && command.toLowerCase().endsWith(".cmd");
    const child = spawn(command, args, {
      cwd: root,
      env,
      shell: requiresWindowsCommandShell,
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} fallo con exit code ${code}`));
      }
    });
  });
}

module.exports = {
  runCommand,
  startApi,
  stopProcessTree,
  waitForHealth,
};
