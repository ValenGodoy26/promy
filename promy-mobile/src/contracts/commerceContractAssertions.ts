import type {
  CommerceDashboardRedemption,
  CommerceManagedRedemption,
} from "../types/api";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2)
    ? true
    : false;
type Expect<Value extends true> = Value;
type CommerceRedemptionUser = { id: number; fullName: string } | null;

type ManagedRedemptionUserMatchesContract = Expect<
  Equal<CommerceManagedRedemption["user"], CommerceRedemptionUser>
>;
type DashboardRedemptionUserMatchesContract = Expect<
  Equal<CommerceDashboardRedemption["user"], CommerceRedemptionUser>
>;

export type CommerceContractAssertions =
  | ManagedRedemptionUserMatchesContract
  | DashboardRedemptionUserMatchesContract;
