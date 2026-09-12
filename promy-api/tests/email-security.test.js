const assert = require("node:assert/strict");
const test = require("node:test");
const { escapeHtmlAttribute, escapeHtmlText } = require("../dist/shared/security/html");

test("HTML text escaping neutralizes markup and special characters", () => {
  assert.equal(escapeHtmlText("<b>ATTACK</b>"), "&lt;b&gt;ATTACK&lt;/b&gt;");
  assert.equal(
    escapeHtmlText('<a href="https://evil.example">click</a>'),
    "&lt;a href=&quot;https://evil.example&quot;&gt;click&lt;/a&gt;",
  );
  assert.equal(escapeHtmlText(`" ' & < >`), "&quot; &#39; &amp; &lt; &gt;");
});

test("HTML attribute escaping preserves legitimate URLs semantically", () => {
  assert.equal(
    escapeHtmlAttribute("https://promy.test/reset?token=a&next=/home"),
    "https://promy.test/reset?token=a&amp;next=/home",
  );
});
