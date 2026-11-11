"use client";

import { useEffect, useState } from "react";

type Report = {
  period: "day" | "week" | "month";
  truncated: boolean;
  summary: {
    totalOrders: number;
    paidOrders: number;
    cancelledOrders: number;
    revenue: number;
    statusCounts: Record<string, number>;
  };
  topProducts: { name: string; quantity: number; revenue: number }[];
  revenueByCategory: { category: string; revenue: number }[];
  revenueByEmployee: {
    userId: string;
    name: string;
    orders: number;
    revenue: number;
  }[];
};

export function SalesReport() {
  const [period, setPeriod] = useState<Report["period"]>("day");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/admin/reports?period=${period}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const result = (await response.json()) as Report & { error?: string };
        if (!response.ok || !result.summary) {
          throw new Error(result.error ?? "Không thể tải báo cáo");
        }
        setError("");
        setReport(result);
      })
      .catch((cause: unknown) => {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) {
          setError(cause instanceof Error ? cause.message : "Không thể tải báo cáo");
        }
      });
    return () => controller.abort();
  }, [period]);

  return (
    <main className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Báo cáo bán hàng</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Doanh thu tính theo các khoản thanh toán đã xác nhận.
            </p>
          </div>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2"
            value={period}
            onChange={(event) => {
              if (["day", "week", "month"].includes(event.target.value)) {
                setPeriod(event.target.value as Report["period"]);
              }
            }}
          >
            <option value="day">Hôm nay</option>
            <option value="week">7 ngày</option>
            <option value="month">30 ngày</option>
          </select>
        </div>
        {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
        {report ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Tổng đơn", report.summary.totalOrders],
                ["Đơn đã thanh toán", report.summary.paidOrders],
                ["Đơn đã hủy", report.summary.cancelledOrders],
                ["Doanh thu", `${report.summary.revenue.toLocaleString("vi-VN")}đ`],
              ].map(([label, value]) => (
                <article className="rounded-xl border border-border bg-card p-4" key={label}>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-1 text-xl font-bold">{value}</p>
                </article>
              ))}
            </div>
            {report.truncated ? (
              <p className="text-sm text-amber-800" role="status">
                Báo cáo giới hạn 10.000 đơn mới nhất trong kỳ.
              </p>
            ) : null}
            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-xl border border-border bg-card p-5">
                <h2 className="font-semibold">Món bán chạy</h2>
                <ul className="mt-3 grid gap-2 text-sm">
                  {report.topProducts.map((item) => (
                    <li className="flex justify-between gap-3" key={item.name}>
                      <span>{item.name} × {item.quantity}</span>
                      <span>{item.revenue.toLocaleString("vi-VN")}đ</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="rounded-xl border border-border bg-card p-5">
                <h2 className="font-semibold">Doanh thu theo danh mục</h2>
                <ul className="mt-3 grid gap-2 text-sm">
                  {report.revenueByCategory.map((item) => (
                    <li className="flex justify-between gap-3" key={item.category}>
                      <span>{item.category}</span>
                      <span>{item.revenue.toLocaleString("vi-VN")}đ</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-semibold">Doanh thu theo nhân viên tạo đơn</h2>
              <ul className="mt-3 grid gap-2 text-sm">
                {report.revenueByEmployee.map((employee) => (
                  <li className="flex justify-between gap-3" key={employee.userId}>
                    <span>{employee.name} · {employee.orders} đơn</span>
                    <span>{employee.revenue.toLocaleString("vi-VN")}đ</span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
