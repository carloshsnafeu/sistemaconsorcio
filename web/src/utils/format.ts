import { AxiosError } from "axios";

export function formatMoney(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
}

export function formatDate(value?: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function getErrorMessage(error: unknown) {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError.response?.data?.message ?? "Não foi possível concluir a ação.";
}
