"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuthRole } from "@/lib/auth.config";
import {
  canTransitionOrder,
  rolePermissions,
} from "@/lib/permissions";
import { Button } from "@/components/ui/button";

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED";

type StaffOrder = {
  id: string;
  code: string;
  status: OrderStatus;
  type: "TAKEAWAY" | "DELIVERY";
  createdAt: string;
  statusUpdatedAt: string;
  note?: string | null;
  customerName?: string;
  customerPhone?: string;
  address?: string | null;
  subtotal?: number;
  discount?: number;
  deliveryFee?: number;
  total?: number;
  payment?: {
    method: string;
    status: string;
    amount: number;
    amountTendered?: number | null;
    changeDue?: number | null;
    refundedAmount?: number;
  } | null;
  assignedCashier?: { id: string; name: string } | null;
  assignedBarista?: { id: string; name: string } | null;
  items: {
    name: string;
    quantity: number;
    note?: string | null;
    unitPrice?: number;
    options: unknown;
  }[];
};

type StaffOption = { id: string; name: string; role: AuthRole };
type StatusHistoryEntry = {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedByRole: string | null;
  note: string | null;
  createdAt: string;
};

const statusNames: Record<OrderStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PREPARING: "Đang pha chế",
  READY: "Đã pha xong",
  SERVED: "Đã phục vụ",
  OUT_FOR_DELIVERY: "Đang giao",
  DELIVERED: "Đã giao",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  REFUNDED: "Đã hoàn tiền",
};

function nextStatuses(
  role: AuthRole,
  status: OrderStatus,
  type: StaffOrder["type"],
): OrderStatus[] {
  return (
    [
      "PENDING",
      "CONFIRMED",
      "PREPARING",
      "READY",
      "SERVED",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "COMPLETED",
      "CANCELLED",
      "REFUNDED",
    ] satisfies OrderStatus[]
  ).filter((nextStatus) => canTransitionOrder(role, status, nextStatus, type));
}

export function OrderOperations({ role }: { role: AuthRole }) {
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [cashiers, setCashiers] = useState<StaffOption[]>([]);
  const [baristas, setBaristas] = useState<StaffOption[]>([]);
  const [assignments, setAssignments] = useState<
    Record<string, { cashierId: string; baristaId: string }>
  >({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [historyByCode, setHistoryByCode] = useState<
    Record<string, StatusHistoryEntry[]>
  >({});

  const loadOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (query.trim()) params.set("q", query.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("type", typeFilter);
      if (employeeFilter) params.set("employeeId", employeeFilter);
      if (fromFilter) params.set("from", fromFilter);
      if (toFilter) params.set("to", toFilter);
      const endpoint =
        role === "CASHIER"
          ? "/api/cashier/orders"
          : role === "BARISTA"
            ? "/api/barista/queue"
            : "/api/admin/orders";
      const response = await fetch(`${endpoint}?${params}`);
      const result = (await response.json()) as {
        orders?: StaffOrder[];
        total?: number;
        error?: string;
      };
      if (!response.ok || !result.orders) {
        setError(result.error ?? "Không thể tải đơn hàng");
        return;
      }
      setError("");
      setOrders(result.orders);
      setTotalOrders(result.total ?? result.orders.length);
      setAssignments(
        Object.fromEntries(
          result.orders.map((order) => [
            order.id,
            {
              cashierId: order.assignedCashier?.id ?? "",
              baristaId: order.assignedBarista?.id ?? "",
            },
          ]),
        ),
      );
    } catch {
      setError("Không thể kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  }, [
    employeeFilter,
    fromFilter,
    page,
    query,
    role,
    statusFilter,
    toFilter,
    typeFilter,
  ]);

  useEffect(() => {
    void Promise.resolve().then(loadOrders);
  }, [loadOrders]);

  useEffect(() => {
    if (role !== "ADMIN" && role !== "MANAGER") return;
    void Promise.all([
      fetch("/api/admin/users?role=CASHIER&active=true"),
      fetch("/api/admin/users?role=BARISTA&active=true"),
    ])
      .then(async ([cashierResponse, baristaResponse]) => {
        const [cashierResult, baristaResult] = (await Promise.all([
          cashierResponse.json(),
          baristaResponse.json(),
        ])) as [
          { users?: StaffOption[] },
          { users?: StaffOption[] },
        ];
        setCashiers(cashierResult.users ?? []);
        setBaristas(baristaResult.users ?? []);
      })
      .catch(() => setError("Không thể tải danh sách nhân viên"));
  }, [role]);

  async function sendAction(code: string, action: Record<string, unknown>) {
    setError("");
    try {
      const actionName = action.action;
      const endpoint =
        actionName === "ASSIGN"
          ? `/api/admin/orders/${encodeURIComponent(code)}`
          : actionName === "CONFIRM_PAYMENT"
            ? `/api/orders/${encodeURIComponent(code)}/payment`
            : actionName === "REFUND"
              ? `/api/orders/${encodeURIComponent(code)}/refund`
              : `/api/orders/${encodeURIComponent(code)}/status`;
      const body =
        actionName === "ASSIGN"
          ? action
          : actionName === "CONFIRM_PAYMENT"
            ? { amountTendered: action.amountTendered }
            : actionName === "REFUND"
              ? { amount: action.amount, note: action.note }
              : { status: action.status, note: action.note };
      const response = await fetch(
        endpoint,
        {
          method: actionName === "REFUND" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Không thể cập nhật đơn hàng");
        return;
      }
      await loadOrders();
    } catch {
      setError("Không thể kết nối máy chủ");
    }
  }

  async function toggleHistory(code: string) {
    if (historyByCode[code]) {
      setHistoryByCode((current) => {
        const next = { ...current };
        delete next[code];
        return next;
      });
      return;
    }
    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(code)}/history`,
        { cache: "no-store" },
      );
      const result = (await response.json()) as {
        history?: StatusHistoryEntry[];
        error?: string;
      };
      if (!response.ok || !result.history) {
        setError(result.error ?? "Không thể tải lịch sử đơn hàng");
        return;
      }
      setHistoryByCode((current) => ({ ...current, [code]: result.history! }));
    } catch {
      setError("Không thể kết nối máy chủ");
    }
  }

  function confirmPayment(order: StaffOrder) {
    if (order.payment?.method !== "CASH") {
      void sendAction(order.code, { action: "CONFIRM_PAYMENT" });
      return;
    }
    const entered = window.prompt(
      `Tổng thanh toán ${order.payment.amount.toLocaleString("vi-VN")}đ. Nhập số tiền khách đưa:`,
    );
    if (entered === null) {
      return;
    }
    const amountTendered = Number(entered);
    if (!Number.isSafeInteger(amountTendered) || amountTendered < order.payment.amount) {
      setError("Số tiền khách đưa không hợp lệ hoặc thấp hơn tổng thanh toán.");
      return;
    }
    void sendAction(order.code, { action: "CONFIRM_PAYMENT", amountTendered });
  }

  function refundPayment(order: StaffOrder) {
    if (!order.payment) return;
    const remaining = order.payment.amount - (order.payment.refundedAmount ?? 0);
    const entered = window.prompt(
      `Còn có thể hoàn ${remaining.toLocaleString("vi-VN")}đ. Nhập số tiền hoàn, để trống để hoàn toàn bộ:`,
    );
    if (entered === null) return;
    if (!entered.trim()) {
      void sendAction(order.code, { action: "REFUND" });
      return;
    }
    const amount = Number(entered);
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > remaining) {
      setError("Số tiền hoàn không hợp lệ hoặc vượt quá số tiền còn lại.");
      return;
    }
    void sendAction(order.code, { action: "REFUND", amount });
  }

  function printReceipt(order: StaffOrder) {
    const printWindow = window.open("", "_blank", "width=420,height=720");
    if (!printWindow) {
      setError("Trình duyệt đang chặn cửa sổ in hóa đơn.");
      return;
    }

    const document = printWindow.document;
    document.title = `Hóa đơn ${order.code}`;
    const style = document.createElement("style");
    style.textContent =
      "body{font:14px Arial,sans-serif;max-width:380px;margin:24px auto;color:#111}h1{text-align:center;font-size:20px}.row{display:flex;justify-content:space-between;gap:12px;margin:8px 0}.items{border-top:1px dashed #888;border-bottom:1px dashed #888;padding:8px 0}.muted{color:#555;font-size:12px}";
    document.head.append(style);

    const receipt = document.createElement("main");
    const title = document.createElement("h1");
    title.textContent = "TRẠM XANH";
    receipt.append(title);
    const addRow = (label: string, value: string, className = "row") => {
      const row = document.createElement("p");
      row.className = className;
      const left = document.createElement("span");
      left.textContent = label;
      const right = document.createElement("span");
      right.textContent = value;
      row.append(left, right);
      receipt.append(row);
    };
    addRow("Mã đơn", order.code);
    addRow("Thời gian", new Date(order.createdAt).toLocaleString("vi-VN"));
    if (order.customerName) addRow("Khách hàng", order.customerName);
    if (order.customerPhone) addRow("Điện thoại", order.customerPhone);

    const items = document.createElement("section");
    items.className = "items";
    for (const item of order.items) {
      const row = document.createElement("p");
      row.className = "row";
      const name = document.createElement("span");
      name.textContent = `${item.quantity} × ${item.name}`;
      const price = document.createElement("span");
      price.textContent =
        item.unitPrice === undefined
          ? ""
          : `${(item.unitPrice * item.quantity).toLocaleString("vi-VN")}đ`;
      row.append(name, price);
      items.append(row);
      if (Array.isArray(item.options)) {
        const optionNames = item.options.flatMap((option) =>
          typeof option === "object" &&
          option !== null &&
          "name" in option &&
          typeof option.name === "string"
            ? [option.name]
            : [],
        );
        if (optionNames.length > 0) {
          const choices = document.createElement("p");
          choices.className = "muted";
          choices.textContent = optionNames.join(", ");
          items.append(choices);
        }
      }
    }
    receipt.append(items);
    if (order.subtotal !== undefined) {
      addRow("Tạm tính", `${order.subtotal.toLocaleString("vi-VN")}đ`);
    }
    if (order.discount) {
      addRow("Giảm giá", `-${order.discount.toLocaleString("vi-VN")}đ`);
    }
    if (order.deliveryFee) {
      addRow("Phí giao hàng", `${order.deliveryFee.toLocaleString("vi-VN")}đ`);
    }
    addRow(
      "Tổng thanh toán",
      `${(order.total ?? order.payment?.amount ?? 0).toLocaleString("vi-VN")}đ`,
    );
    if (order.payment?.method) addRow("Phương thức", order.payment.method);
    if (order.payment?.amountTendered != null) {
      addRow("Khách đưa", `${order.payment.amountTendered.toLocaleString("vi-VN")}đ`);
    }
    if (order.payment?.changeDue != null) {
      addRow("Tiền thối", `${order.payment.changeDue.toLocaleString("vi-VN")}đ`);
    }
    const thanks = document.createElement("p");
    thanks.className = "muted";
    thanks.textContent = "Cảm ơn quý khách và hẹn gặp lại!";
    receipt.append(thanks);
    document.body.replaceChildren(receipt);
    printWindow.focus();
    printWindow.print();
  }

  async function reportShortage() {
    const message = window.prompt("Mô tả nguyên liệu đang thiếu");
    if (!message?.trim()) return;
    try {
      const response = await fetch("/api/barista/inventory-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) setError(result.error ?? "Không thể gửi cảnh báo");
      else setError("Đã gửi cảnh báo thiếu nguyên liệu");
    } catch {
      setError("Không thể kết nối máy chủ");
    }
  }

  return (
    <main className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Đơn hàng</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Danh sách đã được giới hạn theo vai trò và phân công của bạn.
            </p>
          </div>
          {rolePermissions.inventoryAlertReporting.some(
            (allowedRole) => allowedRole === role,
          ) ? (
            <Button type="button" variant="outline" onClick={reportShortage}>
              Báo thiếu nguyên liệu
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-52 flex-1 rounded-lg border border-border bg-background px-3 py-2"
            placeholder="Tìm mã đơn"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
          <select
            className="rounded-lg border border-border bg-background px-3 py-2"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Mọi trạng thái</option>
            {Object.entries(statusNames).map(([status, label]) => (
              <option key={status} value={status}>
                {label}
              </option>
            ))}
          </select>
          {role === "ADMIN" || role === "MANAGER" ? (
            <>
              <select
                className="rounded-lg border border-border bg-background px-3 py-2"
                value={typeFilter}
                onChange={(event) => {
                  setTypeFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Mọi hình thức nhận</option>
                <option value="TAKEAWAY">Nhận tại quán</option>
                <option value="DELIVERY">Giao hàng</option>
              </select>
              <select
                className="rounded-lg border border-border bg-background px-3 py-2"
                value={employeeFilter}
                onChange={(event) => {
                  setEmployeeFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Mọi nhân viên</option>
                {[...cashiers, ...baristas].map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} ({employee.role})
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Từ
                <input
                  className="rounded-lg border border-border bg-background px-2 py-2"
                  type="date"
                  value={fromFilter}
                  onChange={(event) => {
                    setFromFilter(event.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Đến
                <input
                  className="rounded-lg border border-border bg-background px-2 py-2"
                  type="date"
                  value={toFilter}
                  onChange={(event) => {
                    setToFilter(event.target.value);
                    setPage(1);
                  }}
                />
              </label>
            </>
          ) : null}
        </div>
        {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
        {loading ? <p role="status">Đang tải đơn hàng...</p> : null}
        <div className="grid gap-4">
          {orders.map((order) => {
            const transitions = nextStatuses(role, order.status, order.type);
            const assignment = assignments[order.id] ?? {
              cashierId: "",
              baristaId: "",
            };
            const canAssign = rolePermissions.orderAssignment.some(
              (allowedRole) => allowedRole === role,
            );
            return (
              <article
                key={order.id}
                className="grid gap-4 rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-foreground">{order.code}</h2>
                    <p className="text-sm text-muted-foreground">
                      {statusNames[order.status]} ·{" "}
                      {order.type === "DELIVERY" ? "Giao hàng" : "Đến lấy"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Cập nhật{" "}
                      {new Date(order.statusUpdatedAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={loading || page <= 1}
                      onClick={() => setPage((current) => current - 1)}
                    >
                      Trang trước
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Trang {page} · {totalOrders} đơn trong kết quả
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={loading || page * 30 >= totalOrders}
                      onClick={() => setPage((current) => current + 1)}
                    >
                      Trang sau
                    </Button>
                  </div>
                  {order.total !== undefined ? (
                    <p className="font-semibold">
                      {order.total.toLocaleString("vi-VN")}đ
                    </p>
                  ) : null}
                </div>
                {order.customerName ? (
                  <p className="text-sm">
                    {order.customerName}
                    {order.customerPhone ? ` · ${order.customerPhone}` : ""}
                    {order.address ? ` · ${order.address}` : ""}
                  </p>
                ) : null}
                <ul className="grid gap-2 text-sm">
                  {order.items.map((item, index) => (
                    <li key={`${item.name}-${index}`}>
                      <span className="font-medium">
                        {item.quantity} × {item.name}
                      </span>
                      {item.options ? (
                        <span className="text-muted-foreground">
                          {" "}· {JSON.stringify(item.options)}
                        </span>
                      ) : null}
                      {item.note ? (
                        <span className="block text-muted-foreground">
                          Ghi chú món: {item.note}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {order.note ? (
                  <p className="text-sm text-muted-foreground">
                    Ghi chú: {order.note}
                  </p>
                ) : null}
                {order.payment ? (
                  <p className="text-sm text-muted-foreground">
                    Thanh toán: {order.payment.method} · {order.payment.status}
                    {order.payment.amountTendered !== undefined &&
                    order.payment.amountTendered !== null
                      ? ` · Khách đưa ${order.payment.amountTendered.toLocaleString("vi-VN")}đ`
                      : ""}
                    {order.payment.changeDue !== undefined &&
                    order.payment.changeDue !== null
                      ? ` · Tiền thối ${order.payment.changeDue.toLocaleString("vi-VN")}đ`
                      : ""}
                  </p>
                ) : null}
                {order.payment?.status === "PAID" && role !== "BARISTA" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => printReceipt(order)}
                  >
                    In hóa đơn
                  </Button>
                ) : null}
                {canAssign ? (
                  <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                    <select
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={assignment.cashierId}
                      onChange={(event) =>
                        setAssignments((current) => ({
                          ...current,
                          [order.id]: {
                            ...assignment,
                            cashierId: event.target.value,
                          },
                        }))
                      }
                    >
                      <option value="">Chưa phân công thu ngân</option>
                      {cashiers.map((cashier) => (
                        <option key={cashier.id} value={cashier.id}>
                          {cashier.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={assignment.baristaId}
                      onChange={(event) =>
                        setAssignments((current) => ({
                          ...current,
                          [order.id]: {
                            ...assignment,
                            baristaId: event.target.value,
                          },
                        }))
                      }
                    >
                      <option value="">Chưa phân công pha chế</option>
                      {baristas.map((barista) => (
                        <option key={barista.id} value={barista.id}>
                          {barista.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        void sendAction(order.code, {
                          action: "ASSIGN",
                          assignedCashierId: assignment.cashierId || null,
                          assignedBaristaId: assignment.baristaId || null,
                        })
                      }
                    >
                      Lưu phân công
                    </Button>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  {(order.payment?.status === "UNPAID" ||
                    order.payment?.status === "FAILED") &&
                  (                                    rolePermissions.paymentOperations.some(
                    (allowedRole) => allowedRole === role,
                  )) ? (
                    <Button
                      type="button"
                      onClick={() => confirmPayment(order)}
                    >
                      Xác nhận đã nhận tiền
                    </Button>
                  ) : null}
                  {transitions.map((status) => (
                    <Button
                      key={status}
                      type="button"
                      variant="outline"
                      onClick={() =>
                        status === "REFUNDED"
                          ? refundPayment(order)
                          : void sendAction(order.code, {
                              action: "STATUS",
                              status,
                            })
                      }
                    >
                      {status === "REFUNDED"
                        ? "Ghi nhận hoàn tiền"
                        : statusNames[status]}
                    </Button>
                  ))}
                </div>
                {role === "ADMIN" || role === "MANAGER" ? (
                  <div className="border-t border-border pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void toggleHistory(order.code)}
                    >
                      {historyByCode[order.code]
                        ? "Ẩn lịch sử trạng thái"
                        : "Xem lịch sử trạng thái"}
                    </Button>
                    {historyByCode[order.code] ? (
                      <ol className="mt-3 grid gap-2">
                        {historyByCode[order.code].map((entry, index) => (
                          <li
                            key={`${entry.createdAt}-${index}`}
                            className="rounded-lg bg-background px-3 py-2 text-sm"
                          >
                            {entry.fromStatus
                              ? `${statusNames[entry.fromStatus]} → `
                              : ""}
                            <span className="font-medium">
                              {statusNames[entry.toStatus]}
                            </span>
                            {entry.changedByRole
                              ? ` · ${entry.changedByRole}`
                              : ""}
                            {entry.note ? ` · ${entry.note}` : ""}
                            <span className="block text-xs text-muted-foreground">
                              {new Date(entry.createdAt).toLocaleString("vi-VN")}
                            </span>
                          </li>
                        ))}
                      </ol>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
          {!loading && orders.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
              Không có đơn hàng trong phạm vi công việc của bạn.
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
