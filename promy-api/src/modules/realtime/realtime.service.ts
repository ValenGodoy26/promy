import type { Response } from "express";
import { UserRole } from "@prisma/client";

export type RealtimeEventType =
  | "commerce.updated"
  | "commerce.status.changed"
  | "promotion.created"
  | "promotion.updated"
  | "promotion.deleted"
  | "promotion.status.changed"
  | "redemption.created"
  | "redemption.validated";

export type RealtimeEvent = {
  id: string;
  type: RealtimeEventType;
  createdAt: string;
  payload: Record<string, unknown>;
  targetRoles?: UserRole[];
  commerceOwnerUserId?: number | null;
};

type RealtimeClient = {
  id: string;
  userId: number;
  role: UserRole;
  response: Response;
};

const clients = new Map<string, RealtimeClient>();

function makeEventId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function canReceiveEvent(client: RealtimeClient, event: RealtimeEvent) {
  if (event.targetRoles?.length && !event.targetRoles.includes(client.role)) {
    return false;
  }

  if (client.role === UserRole.ADMIN) {
    return true;
  }

  if (client.role === UserRole.COMMERCE) {
    return event.commerceOwnerUserId === client.userId;
  }

  return false;
}

function writeSse(response: Response, data: unknown) {
  response.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function registerRealtimeClient(input: {
  userId: number;
  role: UserRole;
  response: Response;
}) {
  const clientId = makeEventId();
  const client: RealtimeClient = {
    id: clientId,
    userId: input.userId,
    role: input.role,
    response: input.response,
  };

  clients.set(clientId, client);

  writeSse(input.response, {
    id: makeEventId(),
    type: "connected",
    createdAt: new Date().toISOString(),
  });

  return clientId;
}

export function unregisterRealtimeClient(clientId: string) {
  clients.delete(clientId);
}

export function closeAllRealtimeClients() {
  for (const client of clients.values()) {
    try {
      const socket = client.response.socket;
      client.response.end();
      socket?.end();
    } catch {
      // The transport is already gone; removing it is enough.
    }
  }
  clients.clear();
}

export function getRealtimeClientCount() {
  return clients.size;
}

export function publishRealtimeEvent(input: Omit<RealtimeEvent, "id" | "createdAt">) {
  const event: RealtimeEvent = {
    id: makeEventId(),
    createdAt: new Date().toISOString(),
    ...input,
  };

  for (const client of clients.values()) {
    if (!canReceiveEvent(client, event)) {
      continue;
    }

    try {
      writeSse(client.response, event);
    } catch {
      clients.delete(client.id);
    }
  }
}

export function startRealtimeHeartbeat(response: Response) {
  return setInterval(() => {
    response.write(`: ping ${Date.now()}\n\n`);
  }, 20000);
}
