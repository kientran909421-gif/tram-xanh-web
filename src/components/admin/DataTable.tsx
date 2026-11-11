"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type DataTableColumn<Row> = {
  key: string;
  header: string;
  className?: string;
  render: (row: Row) => React.ReactNode;
};

export function DataTable<Row>({
  rows,
  columns,
  rowKey,
  searchPlaceholder = "Tìm kiếm...",
  searchableText,
  loading = false,
  emptyMessage = "Chưa có dữ liệu",
  pageSize = 10,
  searchValue,
  onSearchChange,
  pagination,
}: {
  rows: Row[];
  columns: DataTableColumn<Row>[];
  rowKey: (row: Row) => string;
  searchPlaceholder?: string;
  searchableText: (row: Row) => string;
  loading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const activeQuery = searchValue ?? query;
  const filteredRows = useMemo(() => {
    const normalizedQuery = activeQuery.trim().toLocaleLowerCase("vi");
    if (!normalizedQuery) {
      return rows;
    }
    return rows.filter((row) =>
      searchableText(row).toLocaleLowerCase("vi").includes(normalizedQuery),
    );
  }, [activeQuery, rows, searchableText]);
  const pageCount = pagination?.totalPages ??
    Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = pagination?.page ?? Math.min(page, pageCount);
  const pageRows = pagination
    ? rows
    : filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <Input
          aria-label="Tìm trong bảng"
          className="max-w-sm bg-card"
          onChange={(event) => {
            if (onSearchChange) {
              onSearchChange(event.target.value);
            } else {
              setQuery(event.target.value);
              setPage(1);
            }
          }}
          placeholder={searchPlaceholder}
          value={activeQuery}
        />
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {loading ? "Đang tải dữ liệu..." : `${filteredRows.length} kết quả`}
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[38rem] text-left text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th
                  className={`px-4 py-3 font-semibold ${column.className ?? ""}`}
                  key={column.key}
                  scope="col"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 }, (_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`}>
                  {columns.map((column) => (
                    <td className="px-4 py-4" key={column.key}>
                      <div className="h-4 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : pageRows.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-12 text-center text-muted-foreground"
                  colSpan={columns.length}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr className="text-foreground" key={rowKey(row)}>
                  {columns.map((column) => (
                    <td className="px-4 py-3.5" key={column.key}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Trang {currentPage} / {pageCount}
        </p>
        <div className="flex gap-2">
          <Button
            disabled={currentPage <= 1 || loading}
            onClick={() =>
              pagination
                ? pagination.onPageChange(currentPage - 1)
                : setPage(currentPage - 1)
            }
            type="button"
            variant="outline"
          >
            Trước
          </Button>
          <Button
            disabled={currentPage >= pageCount || loading}
            onClick={() =>
              pagination
                ? pagination.onPageChange(currentPage + 1)
                : setPage(currentPage + 1)
            }
            type="button"
            variant="outline"
          >
            Sau
          </Button>
        </div>
      </div>
    </div>
  );
}
