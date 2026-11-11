"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

type Ingredient = {
  id: string;
  name: string;
  unit: string;
  quantityOnHand: string;
  lowStockAt: string;
  lowStock: boolean;
  isActive: boolean;
};

type InventoryAlert = {
  id: string;
  message: string;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  createdAt: string;
  ingredient: { name: string; unit: string } | null;
  reportedBy: { name: string };
};

type InventoryMovement = {
  id: string;
  type: "RECEIPT" | "ADJUSTMENT" | "WASTE";
  quantity: string;
  note: string | null;
  createdAt: string;
  ingredient: { name: string; unit: string };
  actor: { name: string; role: string } | null;
};

export function InventoryManager() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [inventoryResponse, alertsResponse, movementResponse] = await Promise.all([
        fetch("/api/admin/inventory"),
        fetch("/api/admin/inventory/alerts"),
        fetch("/api/admin/inventory/movements"),
      ]);
      const [inventoryResult, alertsResult, movementResult] = (await Promise.all([
        inventoryResponse.json(),
        alertsResponse.json(),
        movementResponse.json(),
      ])) as [
        { ingredients?: Ingredient[]; error?: string },
        { alerts?: InventoryAlert[]; error?: string },
        { movements?: InventoryMovement[]; error?: string },
      ];
      if (!inventoryResponse.ok || !inventoryResult.ingredients) {
        setError(inventoryResult.error ?? "Không thể tải tồn kho");
        return;
      }
      if (!alertsResponse.ok || !alertsResult.alerts) {
        setError(alertsResult.error ?? "Không thể tải cảnh báo");
        return;
      }
      if (!movementResponse.ok || !movementResult.movements) {
        setError(movementResult.error ?? "Không thể tải lịch sử kho");
        return;
      }
      setError("");
      setIngredients(inventoryResult.ingredients);
      setAlerts(alertsResult.alerts);
      setMovements(movementResult.movements);
    } catch {
      setError("Không thể kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  async function submit(
    event: FormEvent<HTMLFormElement>,
    url: string,
    method: "POST" | "PATCH",
    makeBody: (data: FormData) => unknown,
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError("");
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(makeBody(data)),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Không thể cập nhật tồn kho");
        return;
      }
      form.reset();
      await loadData();
    } catch {
      setError("Không thể kết nối máy chủ");
    }
  }

  async function resolveAlert(alert: InventoryAlert, status: "RESOLVED" | "DISMISSED") {
    try {
      const response = await fetch(`/api/admin/inventory/alerts/${alert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) setError(result.error ?? "Không thể cập nhật cảnh báo");
      else await loadData();
    } catch {
      setError("Không thể kết nối máy chủ");
    }
  }

  async function updateThreshold(
    event: FormEvent<HTMLFormElement>,
    ingredient: Ingredient,
  ) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/admin/inventory/${ingredient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lowStockAt: Number(data.get("lowStockAt")) }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Không thể cập nhật ngưỡng tồn kho");
        return;
      }
      await loadData();
    } catch {
      setError("Không thể kết nối máy chủ");
    }
  }

  return (
    <main className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Kho nguyên liệu</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Số lượng được quản lý thủ công; mọi lần nhập, hao hụt và điều chỉnh đều có nhật ký.
          </p>
        </div>
        {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
        <div className="grid gap-5 lg:grid-cols-2">
          <form
            className="grid gap-3 rounded-2xl border border-border bg-card p-5"
            onSubmit={(event) =>
              void submit(event, "/api/admin/inventory", "POST", (data) => ({
                name: data.get("name"),
                unit: data.get("unit"),
                initialQuantity: Number(data.get("initialQuantity") || 0),
                lowStockAt: Number(data.get("lowStockAt") || 0),
              }))
            }
          >
            <h2 className="font-semibold">Thêm nguyên liệu</h2>
            <label className="grid gap-1 text-sm">
              Tên
              <input className="rounded-lg border border-border bg-background px-3 py-2" name="name" required maxLength={120} />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1 text-sm">
                Đơn vị
                <input className="rounded-lg border border-border bg-background px-3 py-2" name="unit" placeholder="kg, lít, cái" required maxLength={32} />
              </label>
              <label className="grid gap-1 text-sm">
                Số lượng ban đầu
                <input className="rounded-lg border border-border bg-background px-3 py-2" name="initialQuantity" type="number" step="0.001" min={0} defaultValue={0} required />
              </label>
              <label className="grid gap-1 text-sm">
                Cảnh báo dưới
                <input className="rounded-lg border border-border bg-background px-3 py-2" name="lowStockAt" type="number" step="0.001" min={0} defaultValue={0} required />
              </label>
            </div>
            <Button type="submit">Thêm nguyên liệu</Button>
          </form>

          <form
            className="grid gap-3 rounded-2xl border border-border bg-card p-5"
            onSubmit={(event) =>
              void submit(
                event,
                "/api/admin/inventory/movements",
                "POST",
                (data) => ({
                  ingredientId: data.get("ingredientId"),
                  type: data.get("type"),
                  quantity: Number(data.get("quantity")),
                  note: data.get("note") || undefined,
                }),
              )
            }
          >
            <h2 className="font-semibold">Nhập kho / điều chỉnh</h2>
            <label className="grid gap-1 text-sm">
              Nguyên liệu
              <select className="rounded-lg border border-border bg-background px-3 py-2" name="ingredientId" required>
                {ingredients.map((ingredient) => (
                  <option key={ingredient.id} value={ingredient.id}>
                    {ingredient.name} ({ingredient.unit})
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                Loại
                <select className="rounded-lg border border-border bg-background px-3 py-2" name="type">
                  <option value="RECEIPT">Nhập kho</option>
                  <option value="ADJUSTMENT">Điều chỉnh (+/-)</option>
                  <option value="WASTE">Hao hụt / hủy</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Số lượng (điều chỉnh có thể âm)
                <input className="rounded-lg border border-border bg-background px-3 py-2" name="quantity" type="number" step="0.001" required />
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              Ghi chú
              <input className="rounded-lg border border-border bg-background px-3 py-2" name="note" maxLength={500} />
            </label>
            <Button type="submit" disabled={ingredients.length === 0}>Ghi nhận biến động</Button>
          </form>
        </div>

        <section className="grid gap-3">
          <h2 className="text-xl font-semibold">Tồn hiện tại</h2>
          {loading ? <p>Đang tải...</p> : null}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {ingredients.map((ingredient) => (
              <article
                className={`rounded-xl border p-4 ${
                  ingredient.lowStock
                    ? "border-red-300 bg-red-50"
                    : "border-border bg-card"
                }`}
                key={ingredient.id}
              >
                <h3 className="font-semibold">{ingredient.name}</h3>
                <p className="mt-1 text-sm">
                  {ingredient.quantityOnHand} {ingredient.unit}
                </p>
                <p className="text-xs text-muted-foreground">
                  Ngưỡng cảnh báo: {ingredient.lowStockAt} {ingredient.unit}
                </p>
                <form
                  className="mt-3 flex items-center gap-2"
                  onSubmit={(event) => void updateThreshold(event, ingredient)}
                >
                  <label className="sr-only" htmlFor={`threshold-${ingredient.id}`}>
                    Ngưỡng cảnh báo {ingredient.name}
                  </label>
                  <input
                    className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm"
                    id={`threshold-${ingredient.id}`}
                    name="lowStockAt"
                    type="number"
                    min={0}
                    step="0.001"
                    defaultValue={ingredient.lowStockAt}
                    required
                  />
                  <Button type="submit" size="sm" variant="outline">
                    Cập nhật ngưỡng
                  </Button>
                </form>
                {ingredient.lowStock ? (
                  <p className="mt-2 text-sm font-medium text-red-800">Tồn thấp</p>
                ) : null}
              </article>
            ))}
            {!loading && ingredients.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có nguyên liệu.</p>
            ) : null}
          </div>
        </section>

        <section className="grid gap-3">
          <h2 className="text-xl font-semibold">Lịch sử biến động gần đây</h2>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Nguyên liệu</th>
                  <th className="px-4 py-3">Loại</th>
                  <th className="px-4 py-3">Số lượng</th>
                  <th className="px-4 py-3">Người thực hiện</th>
                  <th className="px-4 py-3">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {movements.map((movement) => (
                  <tr key={movement.id}>
                    <td className="px-4 py-3">
                      {new Date(movement.createdAt).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-4 py-3">
                      {movement.ingredient.name} ({movement.ingredient.unit})
                    </td>
                    <td className="px-4 py-3">{movement.type}</td>
                    <td className="px-4 py-3">{movement.quantity}</td>
                    <td className="px-4 py-3">
                      {movement.actor?.name ?? "Tài khoản đã xóa"}
                    </td>
                    <td className="px-4 py-3">{movement.note ?? "—"}</td>
                  </tr>
                ))}
                {movements.length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-center text-muted-foreground" colSpan={6}>
                      Chưa có biến động kho.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-3">
          <h2 className="text-xl font-semibold">Cảnh báo từ pha chế</h2>
          {alerts.map((alert) => (
            <article
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
              key={alert.id}
            >
              <div>
                <p className="font-medium">{alert.message}</p>
                <p className="text-sm text-muted-foreground">
                  {alert.ingredient?.name ?? "Chưa chọn nguyên liệu"} · {alert.reportedBy.name}
                  {" · "}{alert.status}
                </p>
              </div>
              {alert.status === "OPEN" ? (
                <div className="flex gap-2">
                  <Button type="button" onClick={() => void resolveAlert(alert, "RESOLVED")}>
                    Đã xử lý
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void resolveAlert(alert, "DISMISSED")}>
                    Bỏ qua
                  </Button>
                </div>
              ) : null}
            </article>
          ))}
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có cảnh báo.</p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
