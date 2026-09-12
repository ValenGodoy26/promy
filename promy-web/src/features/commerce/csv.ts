const SPREADSHEET_FORMULA_PREFIX = /^[\u0000-\u0020\u007f\u00a0\ufeff]*[=+\-@]/u;

export function neutralizeSpreadsheetFormula(value: string) {
  return SPREADSHEET_FORMULA_PREFIX.test(value) ? `'${value}` : value;
}

export function escapeCSVCell(value: string | number | null | undefined) {
  const normalized =
    typeof value === "string" ? neutralizeSpreadsheetFormula(value) : value == null ? "" : String(value);

  return `"${normalized.replace(/"/g, '""')}"`;
}
