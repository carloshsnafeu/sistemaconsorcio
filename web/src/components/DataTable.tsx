import { ReactNode } from "react";

interface Column<T> {
  header: string;
  render: (item: T) => ReactNode;
}

export function DataTable<T>({ data, columns, empty = "Nenhum registro encontrado." }: { data: T[]; columns: Column<T>[]; empty?: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-white">
      <table className="min-w-full divide-y divide-line text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column.header} className="px-4 py-3">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {data.length === 0 ? (
            <tr>
              <td className="px-4 py-5 text-center text-slate-500" colSpan={columns.length}>
                {empty}
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr key={index} className="hover:bg-slate-50">
                {columns.map((column) => (
                  <td key={column.header} className="px-4 py-3 align-middle">
                    {column.render(item)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
