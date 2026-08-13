const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const STATE_DIR = path.join(ROOT, ".qa");
const PID_FILE = path.join(STATE_DIR, "server-4013.pid");
const LOG_FILE = path.join(STATE_DIR, "server-4013.log");
const ERR_FILE = path.join(STATE_DIR, "server-4013.err.log");
const PORT = "4013";

function ensureStateDir() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
}

function readPid() {
  if (!fs.existsSync(PID_FILE)) {
    return null;
  }

  const raw = fs.readFileSync(PID_FILE, "utf8").trim();
  const pid = Number(raw);
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

function writePid(pid) {
  ensureStateDir();
  fs.writeFileSync(PID_FILE, String(pid));
}

function removePid() {
  if (!fs.existsSync(PID_FILE)) {
    return true;
  }

  try {
    fs.unlinkSync(PID_FILE);
    return true;
  } catch (error) {
    console.warn(`No se pudo borrar el PID file ${PID_FILE}: ${error.message}`);
    return false;
  }
}

function isRunning(pid) {
  if (!pid) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function stopProcess(pid) {
  try {
    process.kill(pid, "SIGTERM");
    return true;
  } catch {
    return false;
  }
}

function startServer() {
  const existingPid = readPid();

  if (existingPid && isRunning(existingPid)) {
    console.log(`QA server ya esta corriendo en puerto ${PORT} (PID ${existingPid}).`);
    console.log(`Logs: ${LOG_FILE}`);
    return;
  }

  ensureStateDir();

  const out = fs.openSync(LOG_FILE, "a");
  const err = fs.openSync(ERR_FILE, "a");

  const child = spawn(process.execPath, ["dist/server.js"], {
    cwd: ROOT,
    detached: true,
    stdio: ["ignore", out, err],
    env: {
      ...process.env,
      PORT,
    },
  });

  child.unref();
  writePid(child.pid);

  console.log(`QA server levantado en puerto ${PORT} (PID ${child.pid}).`);
  console.log(`Logs: ${LOG_FILE}`);
}

function stopServer() {
  const pid = readPid();

  if (!pid) {
    console.log("No hay PID guardado para el QA server.");
    return;
  }

  const stopped = stopProcess(pid);
  const pidRemoved = removePid();

  if (stopped) {
    console.log(
      pidRemoved
        ? `QA server detenido (PID ${pid}).`
        : `QA server detenido (PID ${pid}), pero el PID file quedo bloqueado.`,
    );
  } else {
    console.log(
      pidRemoved
        ? `No se pudo confirmar el stop del PID ${pid}; se limpio el PID file.`
        : `No se pudo confirmar el stop del PID ${pid} y el PID file sigue bloqueado.`,
    );
  }
}

function statusServer() {
  const pid = readPid();

  if (!pid) {
    console.log(`QA server detenido. Puerto esperado: ${PORT}.`);
    return;
  }

  if (isRunning(pid)) {
    console.log(`QA server corriendo en puerto ${PORT} (PID ${pid}).`);
    console.log(`Logs: ${LOG_FILE}`);
    return;
  }

  console.log(`QA server no esta corriendo, pero habia PID stale (${pid}).`);
  removePid();
}

const command = process.argv[2] || "status";

if (command === "start") {
  startServer();
} else if (command === "stop") {
  stopServer();
} else if (command === "status") {
  statusServer();
} else {
  console.error("Uso: node scripts/qa-server.js <start|stop|status>");
  process.exit(1);
}
