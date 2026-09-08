import assert from "node:assert/strict";
import { createRefreshCoordinator } from "../src/lib/refreshCoordinator.ts";

let resolveRefresh;
let requests = 0;
const coordinator = createRefreshCoordinator(() => {
  requests += 1;
  return new Promise((resolve) => { resolveRefresh = resolve; });
});

const strictMode = coordinator.request();
const secondConsumer = coordinator.request();
const thirdProtectedRequest = coordinator.request();
assert.equal(requests, 1, "StrictMode and concurrent consumers share one network refresh");
assert.equal(strictMode.promise, secondConsumer.promise);
assert.equal(strictMode.promise, thirdProtectedRequest.promise);
resolveRefresh({ accessToken: "rotated" });
assert.deepEqual(await strictMode.promise, { accessToken: "rotated" });

const afterSuccess = coordinator.request();
assert.equal(requests, 2, "a later session refresh can start normally");
coordinator.invalidate();
resolveRefresh({ accessToken: "stale" });
await afterSuccess.promise;
assert.equal(coordinator.isCurrent(afterSuccess.generation), false, "logout rejects stale application");

let failedRequests = 0;
const failing = createRefreshCoordinator(async () => {
  failedRequests += 1;
  throw new Error("401");
});
const failures = [failing.request(), failing.request(), failing.request()];
await Promise.all(failures.map(({ promise }) => assert.rejects(() => promise)));
assert.equal(failedRequests, 1, "a failed shared refresh does not create a request storm");

console.log("web refresh coordinator concurrency cases: PASS (3 consumers -> 1 request)");
