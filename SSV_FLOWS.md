# SSV Liquidation Flow (src_ssv/)

This document explains the SSV liquidator pipeline implemented under `src_ssv/`. Use it as a reference when changing liquidation logic.

## Entry Points
- Worker bootstrap: `src_ssv/services/worker/worker.tsx`
- Crons:
  - `FetchCron` (`src_ssv/services/worker/cron/fetch.cron.ts`): every second
  - `BurnRateCron` (`src_ssv/services/worker/cron/burn-rates.cron.ts`): every 10 seconds
  - `LiquidationCron` (`src_ssv/services/worker/cron/liquidation.cron.ts`): every 10 seconds

## 1) Event Sync (FetchTask)
File: `src_ssv/services/worker/tasks/fetch.task.ts`

1. Validate contract connectivity by calling `getLiquidationThresholdPeriodSSV()`.
2. Compare `GENERAL_LAST_BLOCK_NUMBER` with the latest chain block.
3. Fetch events in adaptive block ranges using `contractCore.getPastEvents('allEvents')`.
4. Process events with `WorkerService.processEvents()`.
5. Persist the new last synced block.

## 2) Event Processing (WorkerService)
File: `src_ssv/services/worker/worker.service.ts`

The logic mirrors ETH flow, but feeds SSV cluster state. Key updates:
- `ClusterLiquidated`: mark cluster as liquidated and update earnings.
- `ClusterDeposited`, `ClusterWithdrawn`, `ValidatorRemoved`, `OperatorFeeExecuted`: mark cluster for burn‑rate recalculation.
- `ValidatorAdded`, `ClusterMigratedToETH`, `ClusterBalanceUpdated`: create or update cluster entries (subject to migration cutoff if configured).
- `MinimumLiquidationCollateralUpdated` and `LiquidationThresholdPeriodUpdated`: refresh system settings and mark all clusters for recalculation.

## 3) Burn Rate & Liquidation Block (BurnRatesTask)
File: `src_ssv/services/worker/tasks/burn-rates.task.ts`

For clusters with `burnRate == null` and `isLiquidated == false`:
1. Fetch `burnRate`, `balance`, `isLiquidated`, and `currentBlockNumber` from the contract.
2. Handle errors or `ClusterIsLiquidated` results by marking the DB entry as liquidated.
3. Compute the earliest liquidation block:
   - Threshold rule: `currentBlock + balance/burnRate - minimumBlocksBeforeLiquidation`
   - Collateral rule: `currentBlock + (balance - minimumCollateral)/burnRate`
   - Save the **minimum** of the two as `liquidationBlockNumber`.

Common inputs come from:
- `getMinimumLiquidationCollateralSSV()`
- `getLiquidationThresholdPeriodSSV()`

## 4) Liquidation Execution (LiquidationTask)
File: `src_ssv/services/worker/tasks/liquidation.task.ts`

1. Ensure events are fully synced (block lag within `BLOCK_RANGE`).
2. Load clusters where `liquidationBlockNumber <= currentBlock`.
3. For each cluster:
   - Confirm `isLiquidatableSSV()` against the contract.
   - If not liquidatable, check `isLiquidated()` and update DB if needed.
4. Randomize the final list and send transactions:
   - Build `liquidateSSV(owner, operatorIds, cluster)` tx data.
   - Estimate gas if no preset gas usage exists.
   - Sign with `ACCOUNT_PRIVATE_KEY` and broadcast.

## SSV vs ETH Differences
SSV flow uses SSV‑specific views and core methods:
- `getLiquidationThresholdPeriodSSV()`
- `getMinimumLiquidationCollateralSSV()`
- `isLiquidatableSSV()`
- `liquidateSSV()`

## Metrics & Health Signals
Metrics are published in `src_ssv/modules/webapp/metrics/`:
- `fetchStatus`, `burnRatesStatus`, `liquidationStatus`
- counts of liquidatable clusters and liquidator ETH balance

## Key Rules
- Never liquidate if event sync is behind.
- Always verify on‑chain liquidatability just before sending a tx.
- Mark clusters liquidated in DB when the contract reports liquidation.

## References
- `SPEC.md` and `FLOWS.md` define the on‑chain liquidation rules and invariants.
