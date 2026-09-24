require("dotenv/config");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  BILLING_GRACE_DAYS,
  addBillingMonthPreservingAnchor,
  resolveBillingCoverage,
} = require("../dist/modules/billing/billing.service.js");

const approved = { status: "APPROVED", approvedAt: new Date("2026-01-10T12:00:00.000Z") };
const on = { mode: "ON", billingStartsAt: new Date("2026-02-01T12:00:00.000Z") };
const empty = { payments: [], grants: [], subscription: null };

test("billing coverage keeps beta free while OFF or scheduled before its date", () => {
  for (const settings of [
    { mode: "OFF", billingStartsAt: null },
    { mode: "SCHEDULED", billingStartsAt: new Date("2026-03-01T12:00:00.000Z") },
  ]) {
    const coverage = resolveBillingCoverage({ settings, commerce: approved, ...empty }, new Date("2026-02-15T12:00:00.000Z"));
    assert.equal(coverage.hasCoverage, true);
    assert.equal(coverage.source, "BETA_FREE");
  }
});

test("legacy approved commerce receives exactly five beta migration days", () => {
  const transition = resolveBillingCoverage({ settings: on, commerce: approved, ...empty }, new Date("2026-02-05T11:59:59.000Z"));
  const expired = resolveBillingCoverage({ settings: on, commerce: approved, ...empty }, new Date("2026-02-06T12:00:00.000Z"));
  assert.equal(BILLING_GRACE_DAYS, 5);
  assert.equal(transition.source, "BETA_FREE");
  assert.equal(expired.hasCoverage, false);
  assert.equal(expired.status, "PENDING_PAYMENT");
});

test("new commerce approved after billing starts does not receive migration coverage", () => {
  const coverage = resolveBillingCoverage({ settings: on, commerce: { status: "APPROVED", approvedAt: new Date("2026-02-02T12:00:00.000Z") }, ...empty }, new Date("2026-02-03T12:00:00.000Z"));
  assert.equal(coverage.hasCoverage, false);
  assert.equal(coverage.reason, "payment_required");
});

test("complimentary and manual coverage take deterministic precedence", () => {
  const now = new Date("2026-04-10T12:00:00.000Z");
  const manual = { source: "MANUAL", status: "APPROVED", periodStart: new Date("2026-04-01T12:00:00.000Z"), periodEnd: new Date("2026-05-01T12:00:00.000Z") };
  const grant = { source: "COMPLIMENTARY", startsAt: new Date("2026-04-05T12:00:00.000Z"), endsAt: null, revokedAt: null };
  assert.equal(resolveBillingCoverage({ settings: on, commerce: approved, payments: [manual], grants: [] }, now).source, "MANUAL");
  assert.equal(resolveBillingCoverage({ settings: on, commerce: approved, payments: [manual], grants: [grant] }, now).source, "COMPLIMENTARY");
});

test("grace and cancel-at-period-end preserve coverage only until their boundaries", () => {
  const grace = { status: "PAST_DUE", currentPeriodStart: null, currentPeriodEnd: null, paymentFailedAt: new Date("2026-04-01T12:00:00.000Z"), graceEndsAt: new Date("2026-04-06T12:00:00.000Z"), cancelAtPeriodEnd: false };
  assert.equal(resolveBillingCoverage({ settings: on, commerce: approved, subscription: grace, payments: [], grants: [] }, new Date("2026-04-05T12:00:00.000Z")).hasCoverage, true);
  assert.equal(resolveBillingCoverage({ settings: on, commerce: approved, subscription: grace, payments: [], grants: [] }, new Date("2026-04-06T12:00:00.000Z")).hasCoverage, false);
  const cancelled = { status: "ACTIVE", currentPeriodStart: new Date("2026-04-01T12:00:00.000Z"), currentPeriodEnd: new Date("2026-05-01T12:00:00.000Z"), paymentFailedAt: null, graceEndsAt: null, cancelAtPeriodEnd: true };
  assert.equal(resolveBillingCoverage({ settings: on, commerce: approved, subscription: cancelled, payments: [], grants: [] }, new Date("2026-04-30T12:00:00.000Z")).hasCoverage, true);
  assert.equal(resolveBillingCoverage({ settings: on, commerce: approved, subscription: cancelled, payments: [], grants: [] }, new Date("2026-05-01T12:00:00.000Z")).hasCoverage, false);
});

test("billing month helper preserves the original anchor through short months", () => {
  const iso = (value) => value.toISOString().slice(0, 10);
  assert.equal(iso(addBillingMonthPreservingAnchor(new Date("2026-01-31T12:00:00.000Z"), 1, 31)), "2026-02-28");
  assert.equal(iso(addBillingMonthPreservingAnchor(new Date("2026-02-28T12:00:00.000Z"), 1, 31)), "2026-03-31");
  assert.equal(iso(addBillingMonthPreservingAnchor(new Date("2028-01-31T12:00:00.000Z"), 1, 31)), "2028-02-29");
  assert.equal(iso(addBillingMonthPreservingAnchor(new Date("2026-03-31T12:00:00.000Z"), 1, 31)), "2026-04-30");
  assert.equal(iso(addBillingMonthPreservingAnchor(new Date("2026-12-31T12:00:00.000Z"), 1, 31)), "2027-01-31");
  assert.equal(iso(addBillingMonthPreservingAnchor(new Date("2026-01-31T12:00:00.000Z"), 3, 31)), "2026-04-30");
});
