let shuttingDown = false;

export function markServerShuttingDown() {
  shuttingDown = true;
}

export function isServerShuttingDown() {
  return shuttingDown;
}

export function resetServerRuntimeStateForTests() {
  shuttingDown = false;
}
