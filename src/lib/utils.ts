import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Fuso horário de Brasília (UTC-3)
export const TIMEZONE_BRASILIA = "America/Sao_Paulo";

/**
 * Retorna a data/hora atual no fuso horário de Brasília
 */
export function agora(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: TIMEZONE_BRASILIA })
  );
}

/**
 * Converte uma data para o fuso horário de Brasília
 */
export function paraBrasilia(data: Date | string): Date {
  const d = typeof data === "string" ? new Date(data) : data;
  return new Date(
    d.toLocaleString("en-US", { timeZone: TIMEZONE_BRASILIA })
  );
}

/**
 * Formata uma data no padrão brasileiro (DD/MM/YYYY)
 */
export function formatarDataBR(data: Date | string): string {
  const d = paraBrasilia(data);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TIMEZONE_BRASILIA,
  });
}

/**
 * Formata uma data com hora no padrão brasileiro (DD/MM/YYYY HH:mm)
 */
export function formatarDataHoraBR(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE_BRASILIA,
  });
}

/**
 * Retorna o mês e ano atual no fuso horário de Brasília
 */
export function getMesAnoAtualBrasilia(): { mes: number; ano: number } {
  const agr = agora();
  return {
    mes: agr.getMonth() + 1, // 1-indexed
    ano: agr.getFullYear(),
  };
}

/**
 * Cria uma data no fuso horário de Brasília a partir de ano, mês e dia
 * @param ano Ano (ex: 2025)
 * @param mes Mês 1-indexed (janeiro = 1)
 * @param dia Dia do mês
 */
export function criarDataBrasilia(ano: number, mes: number, dia: number = 1): Date {
  // Criar a data no horário local e ajustar para Brasília
  const dataStr = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}T12:00:00`;
  return new Date(dataStr);
}
