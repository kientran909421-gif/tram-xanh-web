"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type CancellationRequest = {
  id: string;
  reason: string | null;
  createdAt: string;
  order: {
    code: string;
    status: string;
    type: "TAKEAWAY" | "DELIVERY";
    customerName: string;
    customerPhone: string;
    total: number;
    address: string | null;
  };
};

export function CancellationRequests() {
  const [requests, setRequests] = useState<CancellationRequest[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/orders/cancellation-requests", {
        cache: "no-store",
      });
      const result = (await response.json()) as {
        requests?: CancellationRequest[];
        error?: string;
      };
      if (!response.ok || !result.requests) {
        setError(result.error ?? "Không thể tải yêu cầu hủy đơn");
        return;
      }
      setRequests(result.requests);
      setError("");
    } catch {
      setError("Không thể kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadRequests);
  }, [loadRequests]);

  async function reviewRequest(
    requestId: string,
    decision: "APPROVE" | "REJECT",
  ) {
    setBusyId(requestId);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/orders/cancellation-requests/${encodeURIComponent(requestId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision,
            note: notes[requestId]?.trim() || undefined,
          }),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Không thể xử lý yêu cầu hủy");
        return;
      }
      await loadRequests();
    } catch {
      setError("Không thể kết nối máy chủ");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Yêu cầu hủy đơn
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Duyệt hoặc từ chối yêu cầu từ khách hàng.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void loadRequests()}>
          Tải lại
        </Button>
      </div>
      {error ? <p className="mt-4 text-sm text-red-700" role="alert">{error}</p> : null}
      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Đang tải yêu cầu...</p>
      ) : requests.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Hiện không có yêu cầu nào chờ duyệt.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {requests.map((item) => (
            <li
              key={item.id}
              className="grid gap-3 rounded-xl border border-border bg-background p-4"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-semibold text-primary">{item.order.code}</p>
                  <p className="text-sm text-foreground">
                    {item.order.customerName} · {item.order.customerPhone}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
              <p className="text-sm">
                {item.order.type === "DELIVERY" ? "Giao hàng" : "Nhận tại quán"} ·{" "}
                {item.order.total.toLocaleString("vi-VN")}đ
                {item.order.address ? ` · ${item.order.address}` : ""}
              </p>
              <p className="text-sm text-muted-foreground">
                Lý do: {item.reason || "Khách không ghi lý do"}
              </p>
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                maxLength={500}
                placeholder="Ghi chú xử lý (không bắt buộc)"
                value={notes[item.id] ?? ""}
                onChange={(event) =>
                  setNotes((current) => ({
                    ...current,
                    [item.id]: event.target.value,
                  }))
                }
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => void reviewRequest(item.id, "APPROVE")}
                >
                  Duyệt hủy đơn
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busyId === item.id}
                  onClick={() => void reviewRequest(item.id, "REJECT")}
                >
                  Từ chối
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
