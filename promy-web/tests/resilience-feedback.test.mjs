import assert from "node:assert/strict";
import test from "node:test";
import {
  ApiError,
  getRefreshFailureAction,
  getUserFacingErrorMessage,
  NETWORK_UNAVAILABLE_MESSAGE,
  REQUEST_TIMEOUT_MESSAGE,
  shouldAttemptSessionRestore,
} from "../src/lib/httpErrors.ts";
import { getApprovalBlockingFields, getReadinessSummary } from "../src/features/admin/commerceReadiness.ts";

test("network, timeout, credentials and server errors have distinct safe feedback", () => {
  assert.equal(getUserFacingErrorMessage(new ApiError("Failed to fetch", 0, "network"), "login"), NETWORK_UNAVAILABLE_MESSAGE);
  assert.equal(getUserFacingErrorMessage(new ApiError("AbortError", 0, "timeout"), "load"), REQUEST_TIMEOUT_MESSAGE);
  assert.equal(getUserFacingErrorMessage(new ApiError("Unauthorized", 401), "login"), "El email o la contraseña no son correctos.");
  assert.match(getUserFacingErrorMessage(new ApiError("ECONNRESET internal", 500), "load"), /no está disponible/i);
  assert.doesNotMatch(getUserFacingErrorMessage(new TypeError("Failed to fetch"), "load"), /failed|typeerror|econn/i);
});

test("only a real invalid refresh expires the session", () => {
  assert.equal(getRefreshFailureAction(new ApiError("Unauthorized", 401)), "expire");
  assert.equal(getRefreshFailureAction(new ApiError("Invalid refresh", 400)), "expire");
  assert.equal(getRefreshFailureAction(new ApiError("Offline", 0, "network")), "preserve");
  assert.equal(getRefreshFailureAction(new ApiError("Timeout", 0, "timeout")), "preserve");
  assert.equal(getRefreshFailureAction(new ApiError("Server", 500)), "preserve");
});

test("voluntary logout does not trigger restoration or an expiration notice on back/reload", () => {
  assert.equal(shouldAttemptSessionRestore("/admin", false), false);
  assert.equal(shouldAttemptSessionRestore("/commerce", false), false);
  assert.equal(shouldAttemptSessionRestore("/admin", true), true);
});

function commerce(status, missingFields = [], blockingFields = []) {
  return {
    status,
    readiness: {
      isApproved: status === "APPROVED",
      isMapReady: status === "APPROVED" && blockingFields.length === 0,
      isProfileComplete: missingFields.length === 0,
      missingFields,
      blockingFields,
    },
  };
}

test("admin readiness separates profile requirements from administrative status", () => {
  assert.equal(getReadinessSummary(commerce("PENDING", ["address", "coordinates"], ["address", "coordinates", "status"])).label, "2 requisitos pendientes");
  assert.equal(getReadinessSummary(commerce("PENDING", ["address"], ["address", "status"])).label, "1 requisito pendiente");
  assert.equal(getReadinessSummary(commerce("PENDING", [], ["status"])).label, "Listo para revisión");
  assert.equal(getReadinessSummary(commerce("APPROVED")).label, "Aprobado");
  assert.equal(getReadinessSummary(commerce("REJECTED", [], ["status"])).label, "Rechazado");
  assert.equal(getReadinessSummary(commerce("INACTIVE", [], ["status"])).label, "Inactivo");
  assert.deepEqual(getApprovalBlockingFields(commerce("PENDING", [], ["status"])), []);
});
