import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getCommerceRedemptionUserLabel } from "../src/screens/commerce/redemptionPresentation.ts";
import { MOBILE_PROMOTION_STATUS_MODES } from "../src/screens/commerce/promotionLifecycle.ts";

const contract = JSON.parse(
  readFileSync(new URL("../../contracts/promy-commerce-v1.json", import.meta.url), "utf8"),
);

assert.equal(contract.version, 1);
assert.equal(contract.commerceRedemption.user.nullable, true);
assert.deepEqual(contract.commerceRedemption.user.fields, ["id", "fullName"]);
assert.deepEqual(contract.commerceRedemption.user.forbiddenFields, ["email", "phone"]);
assert.equal(contract.cursorPagination.hasMore, "boolean");
assert.equal(contract.cursorPagination.nextCursor, "number|null");
assert.deepEqual(contract.promotionAnalytics.eventTypes, ["IMPRESSION", "OPEN"]);
assert.equal(contract.promotionAnalytics.impression.itemVisiblePercentThreshold, 50);
assert.equal(contract.promotionAnalytics.impression.minimumViewTimeMs, 750);
assert.equal(contract.promotionAnalytics.impression.waitForInteraction, false);
assert.equal(contract.promotionAnalytics.session.memoryOnly, true);
assert.equal(contract.promotionAnalytics.session.ttlHours, 24);
assert.equal(contract.promotionAnalytics.receipt.retentionHours, 48);
assert.equal(contract.promotionAnalytics.receipt.storesRawSessionId, false);
assert.equal(contract.promotionAnalytics.receipt.storesUserId, false);
assert.deepEqual(
  MOBILE_PROMOTION_STATUS_MODES,
  contract.promotionLifecycle.commerceEditing.mobileStatusModes,
);

assert.equal(getCommerceRedemptionUserLabel(null), "Cuenta eliminada");
assert.equal(
  getCommerceRedemptionUserLabel({ id: 1, fullName: "Cliente de prueba" }),
  "Cliente de prueba",
);

console.log("mobile commerce contract cases: PASS");
