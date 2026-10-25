export type Theme = "original" | "green" | "red";

export function parseTheme(value: string | null): Theme {
  return value === "original" || value === "red" ? value : "green";
}
