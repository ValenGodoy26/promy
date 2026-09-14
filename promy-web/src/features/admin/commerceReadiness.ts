import type { AdminCommerceItem } from "../../types/api";

type ReadinessInput = Pick<AdminCommerceItem, "status" | "readiness">;

export function getApprovalBlockingFields(input: ReadinessInput) {
  return input.readiness.blockingFields.filter((field) => field !== "status");
}

export function getReadinessSummary(input: ReadinessInput) {
  const missingCount = input.readiness.missingFields.length;
  const approvalBlockingCount = getApprovalBlockingFields(input).length;

  if (missingCount > 0) {
    return {
      label: `${missingCount} ${missingCount === 1 ? "requisito pendiente" : "requisitos pendientes"}`,
      tone: "warning" as const,
    };
  }

  if (approvalBlockingCount > 0) {
    return {
      label: `${approvalBlockingCount} ${approvalBlockingCount === 1 ? "bloqueo de aprobación" : "bloqueos de aprobación"}`,
      tone: "warning" as const,
    };
  }

  if (input.status === "PENDING") {
    return { label: "Listo para revisión", tone: "success" as const };
  }
  if (input.status === "APPROVED") {
    return { label: "Aprobado", tone: "success" as const };
  }
  if (input.status === "REJECTED") {
    return { label: "Rechazado", tone: "neutral" as const };
  }
  return { label: "Inactivo", tone: "neutral" as const };
}
