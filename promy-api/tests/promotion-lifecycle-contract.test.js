require("dotenv/config");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ADMIN_PROMOTION_ALLOWED_TRANSITIONS,
  canTransitionPromotionStatus,
} = require("../dist/shared/domain/promotionLifecycle.js");
const { commerceRedemptionSelect } = require("../dist/modules/redemptions/redemptions.service.js");

const contract = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../../contracts/promy-commerce-v1.json"), "utf8"),
);
const { statuses, allowedTransitions } = contract.promotionLifecycle.admin;

test("API promotion lifecycle matches the versioned commerce contract", () => {
  assert.equal(contract.version, 1);
  assert.deepEqual(Object.keys(ADMIN_PROMOTION_ALLOWED_TRANSITIONS).sort(), [...statuses].sort());

  for (const status of statuses) {
    assert.deepEqual(
      [...ADMIN_PROMOTION_ALLOWED_TRANSITIONS[status]].sort(),
      [...allowedTransitions[status]].sort(),
      `${status} transition set`,
    );
    assert.equal(canTransitionPromotionStatus(status, status), true, `${status} self transition`);

    for (const candidate of statuses) {
      if (candidate === status) continue;
      assert.equal(
        canTransitionPromotionStatus(status, candidate),
        allowedTransitions[status].includes(candidate),
        `${status} -> ${candidate}`,
      );
    }
  }
});

test("API commerce redemption projection matches the versioned privacy contract", () => {
  const redemptionContract = contract.commerceRedemption;
  const selectedFields = Object.keys(commerceRedemptionSelect);
  const selectedUserFields = Object.keys(commerceRedemptionSelect.user.select);

  for (const field of redemptionContract.fields) {
    assert.equal(selectedFields.includes(field), true, `missing redemption field ${field}`);
  }
  assert.equal(redemptionContract.user.nullable, true);
  assert.deepEqual(selectedUserFields.sort(), [...redemptionContract.user.fields].sort());
  for (const forbiddenField of redemptionContract.user.forbiddenFields) {
    assert.equal(selectedUserFields.includes(forbiddenField), false, `forbidden user field ${forbiddenField}`);
  }
});

test("API promotion analytics semantics match the versioned commerce contract", () => {
  const analytics = contract.promotionAnalytics;
  assert.deepEqual(analytics.eventTypes, ["IMPRESSION", "OPEN"]);
  assert.equal(analytics.impression.itemVisiblePercentThreshold, 50);
  assert.equal(analytics.impression.minimumViewTimeMs, 750);
  assert.equal(analytics.impression.waitForInteraction, false);
  assert.equal(analytics.session.memoryOnly, true);
  assert.equal(analytics.receipt.storesRawSessionId, false);
  assert.equal(analytics.receipt.storesUserId, false);
});

test("API billing semantics expose only the internal coverage contract", () => {
  const billing = contract.billing;
  assert.deepEqual(billing.modes, ["OFF", "SCHEDULED", "ON"]);
  assert.equal(billing.currency, "ARS");
  assert.equal(billing.rules.graceDays, 5);
  assert.equal(billing.rules.legacyBetaTransitionDays, 5);
  assert.equal(billing.rules.browserReturnCannotActivateCoverage, true);
  assert.equal(billing.admin.privilegedWriteRole, "SUPER_ADMIN");
  assert.equal(billing.commerceSummary.includes("canCreatePromotion"), true);
  assert.equal(billing.commerceSummary.includes("needsPayment"), true);
});
