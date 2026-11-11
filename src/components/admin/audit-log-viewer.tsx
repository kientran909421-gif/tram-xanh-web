"use client";

import { useEffect, useState } from "react";

type AuditEvent = {
  id: string;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: unknown;
  createdAt: string;
};

export function AuditLogViewer() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/audit")
      .then(async (response) => {
        const result = (await response.json()) as {
          events?: AuditEvent[];
          error?: string;
        };
        if (!response.ok || !result.events) {
          throw new Error(result.error ?? "Không thể tải nhật ký");
        }
        if (active) setEvents(result.events);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Không thể tải nhật ký");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-5">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Nhật ký hệ thống</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            50 sự kiện gần nhất; chỉ ADMIN được xem.
          </p>
        </div>
        {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
        <div className="grid gap-3">
          {events.map((event) => (
            <article
              className="grid gap-2 rounded-xl border border-border bg-card p-4 sm:grid-cols-[1fr_auto]"
              key={event.id}
            >
              <div>
                <p className="font-semibold">{event.action}</p>
                <p className="text-sm text-muted-foreground">
                  {event.actorEmail ?? "Khách"} · {event.actorRole ?? "ANONYMOUS"}
                  {" · "}{event.entityType}
                  {event.entityId ? ` #${event.entityId}` : ""}
                </p>
                {event.details ? (
                  <pre className="mt-2 overflow-auto text-xs text-muted-foreground">
                    {JSON.stringify(event.details, null, 2)}
                  </pre>
                ) : null}
              </div>
              <time className="text-xs text-muted-foreground">
                {new Date(event.createdAt).toLocaleString("vi-VN")}
              </time>
            </article>
          ))}
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có sự kiện.</p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
