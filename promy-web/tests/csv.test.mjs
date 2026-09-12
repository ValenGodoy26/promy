import assert from "node:assert/strict";
import test from "node:test";
import { escapeCSVCell, neutralizeSpreadsheetFormula } from "../src/features/commerce/csv.ts";

test("neutralizes spreadsheet formulas including leading whitespace and control characters", () => {
  for (const value of ["=1+1", "+SUM(A1:A2)", "-1+2", "@something", "\t=cmd", "\r\n@SUM(A1:A2)", "\u00a0+1", "\ufeff-1"]) {
    assert.equal(neutralizeSpreadsheetFormula(value), `'${value}`);
    assert.equal(escapeCSVCell(value), `"'${value.replace(/"/g, '""')}"`);
  }
});

test("preserves safe strings, numeric values and valid CSV quoting", () => {
  assert.equal(escapeCSVCell("Promo normal"), '"Promo normal"');
  assert.equal(escapeCSVCell('Promo "doble"'), '"Promo ""doble"""');
  assert.equal(escapeCSVCell(-12), '"-12"');
  assert.equal(escapeCSVCell(null), '""');
});
