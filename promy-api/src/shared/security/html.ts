const HTML_TEXT_REPLACEMENTS: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtmlText(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => HTML_TEXT_REPLACEMENTS[character]);
}

export function escapeHtmlAttribute(value: unknown) {
  return escapeHtmlText(value);
}
