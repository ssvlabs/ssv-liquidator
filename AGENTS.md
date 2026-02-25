# Repository Guidelines — SSV Liquidator

This file guides contributors working on the SSV Liquidator. Read fully before making any changes.

## Project Overview (Liquidations Only)
This repository is dedicated to **liquidations**. It syncs on‑chain data, computes liquidation readiness, and submits liquidation transactions. Do not add unrelated product features (staking, dashboards, or non‑liquidation automation) unless explicitly requested.

## Dual Codebases (Critical)
There are two parallel implementations:
- `src/` — **ETH liquidator** (uses `liquidate()` and ETH views).
- `src_ssv/` — **SSV liquidator** (uses `liquidateSSV()` and SSV views).

When changing logic, update both sides unless the change is ETH‑only or SSV‑only by design.

## Build & Run Commands
```bash
yarn cli            # Run the CLI (reads .env or CLI flags)
yarn cli:dev        # Run CLI with nodemon reloads
yarn lint           # Lint TypeScript
yarn lint:fix       # Auto-fix lint issues
docker-compose up --build  # Worker + monitoring stack
```

## Architecture (High Level)
- **Worker**: `src/services/worker/worker.tsx` and `src_ssv/services/worker/worker.tsx` boot NestJS, API, crons, and the CLI UI.
- **Event Sync**: `FetchTask` pulls contract events and updates local DB state.
- **Burn Rate**: `BurnRatesTask` calculates burn rate + liquidation block targets per cluster.
- **Liquidation**: `LiquidationTask` validates liquidatability and sends signed transactions.
- **Storage**: SQLite DB in `data/` (TypeORM entities in `src/modules/*`).

## Key Data Model
`Cluster` records are stored in SQLite (`src/modules/clusters/cluster.entity.ts`), keyed by `(owner, operatorIds)`. Fields include:
- `cluster` (serialized snapshot)
- `burnRate`, `balance`, `isLiquidated`, `liquidationBlockNumber`

## Flow References (Read Before Modifying Logic)
- `ETH_FLOWS.md`: ETH liquidation pipeline and decision points.
- `SSV_FLOWS.md`: SSV liquidation pipeline and decision points.

## Configuration Notes
- `LIQUIDATOR_TYPE` selects worker: `eth` or `ssv`.
- `SSV_SYNC_ENV` and `SSV_SYNC` select ABI/network (e.g., `prod` + `v4.hoodi`).
- `package.json` requires Node.js `>=18`. `.nvmrc` is `14`; align with maintainers if issues arise.

## Commit & PR Guidelines
- Use short, imperative commit messages (e.g., “update abi”, “fix liquidation retry”).
- PRs should include a clear summary, risk notes, and any `.env` changes.
- Keep scope limited to liquidation flows.

## Protocol Reference Docs
These are required for understanding liquidation rules and invariants:
- `SPEC.md` — source of truth for protocol rules and accounting formulas.
- `FLOWS.md` — contract flow preconditions and state transitions.

---

# Protocol Context — SSV Network Smart Contracts (Reference)

This section is provided so contributors understand how the on‑chain protocol works and how liquidation rules are defined. It mirrors the protocol reference used by the smart‑contract team.

## Project Overview
SSV Network is a decentralized Ethereum staking infrastructure using Secret Shared Validators (SSV/DVT). The protocol smart contracts manage operators, validators, clusters, and protocol economics.

**Current Release Target: v2.0.0 — "SSV Staking"**

This release introduces three tightly coupled upgrades:
1. **ETH Payments** — transition from SSV‑token fees to native ETH‑denominated fees
2. **Effective Balance (EB) Accounting** — fees scale with actual validator effective balance instead of fixed 32 ETH assumption
3. **SSV Staking** — SSV holders stake tokens, receive cSSV, and earn pro‑rata ETH protocol revenue

## Architecture

### Module System (UUPS Proxy + Delegatecall)

SSVNetwork.sol is a UUPS upgradeable proxy that routes calls via `delegatecall` to specialized modules:

```
SSVNetwork (proxy, UUPS, Ownable2Step)
  ├── SSV_OPERATORS           → SSVOperators.sol
  ├── SSV_CLUSTERS            → SSVClusters.sol
  ├── SSV_DAO                 → SSVDAO.sol
  ├── SSV_VIEWS               → SSVViews.sol (also fallback)
  ├── SSV_OPERATORS_WHITELIST → SSVOperatorsWhitelist.sol
  ├── SSV_STAKING             → SSVStaking.sol
  └── SSV_VALIDATORS          → SSVValidators.sol
```

### Storage Pattern (Diamond/EIP-2535 style)

All state is stored at deterministic slots via `keccak256(slot) - 1` with inline assembly. **Never add storage variables to module contracts directly** — all state goes through storage libraries.

| Storage | Slot Key | Purpose |
|---|---|---|
| SSVStorage | `ssv.network.storage.main` | Operators, clusters, validators, module addresses, token |
| SSVStorageProtocol | `ssv.network.storage.protocol` | Fee indices, DAO balances, liquidation params (both SSV and ETH) |
| SSVStorageEB | `ssv.network.storage.eb` | Merkle roots, cluster EB snapshots, oracle voting, operator vUnits |
| SSVStorageStaking | `ssv.network.storage.staking` | Staking state, rewards accumulator, oracles, withdrawal requests |
| SSVStorageReentrancy | `ssv.network.storage.reentrancy` | Custom reentrancy guard status |

### Dual Cluster System

The protocol maintains two parallel cluster records during the transition period:
- `s.clusters[hash]` — legacy SSV‑denominated clusters (VERSION_SSV = 0)
- `s.ethClusters[hash]` — new ETH‑denominated clusters (VERSION_ETH = 1)

Each operator tracks dual snapshots: SSV (`.snapshot`, `.fee`, `.validatorCount`) and ETH (`.ethSnapshot`, `.ethFee`, `.ethValidatorCount`).

### Packed Types (Critical for Precision)

```
PackedSSV (uint64): actual_value = raw * 10_000_000   (DEDUCTED_DIGITS)
PackedETH (uint64): actual_value = raw * 100_000       (ETH_DEDUCTED_DIGITS)
```

Values not divisible by the precision factor revert with `MaxPrecisionExceeded`.

## Key Accounting Rules

### ETH Cluster Fee Calculation (vUnit Model)

```
vUnits = ceil(effectiveBalanceETH * 10_000 / 32)
operatorFee = blockDiff * ethFee * effectiveVUnits / VUNITS_PRECISION
networkFee = (networkFeeIndexDelta * effectiveVUnits) / VUNITS_PRECISION
totalFees = (operatorFeeUnits + networkFeeUnits) * ETH_DEDUCTED_DIGITS
cluster.balance -= totalFees
```

- Implicit EB (default): `vUnits = validatorCount * 10_000` (assumes 32 ETH/validator)
- Explicit EB: set after first `updateClusterBalance` oracle update

### SSV Cluster Fee Calculation (Legacy)

```
fees = (operatorIndexDelta + networkFeeIndexDelta) * validatorCount
cluster.balance -= unpack(fees)
```

### ETH Liquidation Check

```
liquidatable IF:
  balance < minimumLiquidationCollateral (0.00094 ETH)
  OR balance < minimumBlocksBeforeLiquidation * (burnRate + networkFee) * vUnits / VUNITS_PRECISION * ETH_DEDUCTED_DIGITS
```

### Staking Rewards (Accumulator Pattern)

```
accEthPerShare += (newFeesWei * 1e18) / totalCSSVSupply
pendingReward = cSSVBalance * (accEthPerShare - userIndex) / 1e18
```

Rewards settle on: stake, requestUnstake, claimEthRewards, cSSV transfer (via onCSSVTransfer hook).

## Governance Parameters (DIP-X Proposed Values)

| Parameter | Value | Update Function |
|---|---|---|
| ethNetworkFee | 0.000000003550929823 ETH/block (~0.00928 ETH/year) | `updateNetworkFee(uint256)` |
| minimumLiquidationCollateral | 0.00094 ETH | `updateMinimumLiquidationCollateral(uint256)` |
| minimumBlocksBeforeLiquidation | 50190 (~7 days) | `updateLiquidationThresholdPeriod(uint64)` |
| defaultOperatorETHFee | 0.000000001775464912 ETH/block (~0.00464 ETH/year) | Hardcoded in contract |
| cooldownDuration | 50120 blocks (~7 days) | `setUnstakeCooldownDuration(uint64)` |
| quorumBps | 7500 (75%) | `setQuorumBps(uint16)` |
| Oracle set | 4 oracles, 3‑of‑4 threshold | `replaceOracle(uint32, address)` |

## Security Rules — MUST Follow

### Reentrancy
- All functions that transfer ETH or tokens MUST use the `nonReentrant` modifier
- The custom reentrancy guard lives at a deterministic storage slot (NOT inherited state)
- Currently protected: `liquidate`, `liquidateSSV`, `withdraw`, `updateClusterBalance`, all operator withdrawals, all staking functions, `withdrawNetworkSSVEarnings`
- Intentionally NOT protected (no external calls before state writes): `reactivate`, `deposit`, `migrateClusterToETH`, validator register/remove

### Storage Safety
- NEVER add storage variables to module contracts — use the diamond storage pattern
- NEVER modify existing storage struct field order — append only
- When adding new storage fields, add them at the END of the struct
- Verify storage slot computation matches the pattern: `keccak256(abi.encode(SLOT_STRING)) - 1`

### Access Control
- Owner‑only functions are enforced at the SSVNetwork proxy level (Ownable2Step), not in modules
- Oracle‑only: `commitRoot` checks `oracleIdOf[msg.sender] != 0`
- cSSV‑only: `onCSSVTransfer` checks `msg.sender == CSSV_ADDRESS`
- Operator owner: `operator.checkOwner()` verifies `msg.sender == operator.owner`
- Cluster owner: keyed by `keccak256(owner, operatorIds)` — only owner can call cluster management functions

### Upgrade Safety
- UUPS pattern — `_authorizeUpgrade` is owner‑only
- New initializers use `reinitializer(N)` (current: N=3 for v2.0.0)
- `UPGRADE_TIMESTAMP` immutable in SSVOperators prevents pre‑migration fee declarations from being executed post‑migration

### Integer Overflow/Precision
- All fee calculations use packed types — be aware of precision loss from packing/unpacking
- vUnit conversions use ceiling division for ETH→vUnits, floor for vUnits→ETH
- Cluster balance underflow: use `max(0, balance - fees)` pattern, never allow negative

### Oracle Security
- Merkle proofs use OpenZeppelin's double‑hash convention: `keccak256(keccak256(abi.encode(clusterID, effectiveBalance)))`
- EB limits enforced: min 32 ETH/validator, max 2048 ETH/validator
- Block numbers must be strictly monotonically increasing (`blockNum > latestCommittedBlock`)
- Quorum is weighted by equal cSSV splits across oracle slots

## Backward Compatibility (Critical)

Any changes to events or function signatures can break external integrations (oracle, liquidator bots, SDK, webapp). Before modifying:

1. **Events**: The SSV Oracle subscribes to `ValidatorAdded`, `ValidatorRemoved`, `ClusterLiquidated`, `ClusterReactivated`, `ClusterWithdrawn`, `ClusterDeposited`, `ClusterMigratedToETH`, `ClusterBalanceUpdated`, `RootCommitted`, `WeightedRootProposed`. Changing these signatures requires oracle client updates.

2. **Function signatures**: `registerValidator`, `bulkRegisterValidator`, `deposit`, `reactivate` have already changed (removed `amount` param, added `payable`). The `getBalance` view now returns `(uint256 balance, uint256 ebBalance)` instead of just `uint256`.

3. **Cluster struct**: `(uint32 validatorCount, uint64 networkFeeIndex, uint64 index, bool active, uint256 balance)` — changing this struct breaks ALL event decoding and function calls.

4. When in doubt, check the oracle repo for ABI dependencies.

## Key Constants

```
VUNITS_PRECISION = 10_000
MAX_EB_PER_VALIDATOR = 2048 ETH
DEFAULT_EB_PER_VALIDATOR = 32 ETH
ETH_DEDUCTED_DIGITS = 100_000
DEDUCTED_DIGITS = 10_000_000
DEFAULT_OPERATOR_ETH_FEE = 1_770_000_000 wei (1.77 gwei/vUnit/block)
MINIMAL_LIQUIDATION_THRESHOLD = 21_480 blocks
MAX_PENDING_REQUESTS = 2000
MINIMAL_STAKING_AMOUNT = 1_000_000_000
MAX_DELEGATION_SLOTS = 4
VERSION_SSV = 0
VERSION_ETH = 1
```

## Reference Documentation

- `SPEC.md` — Full DIP‑X specification with accounting formulas, storage layout, and function/event signatures.
- `FLOWS.md` — Step‑by‑step contract flows with state mutations, invariants, and sequence diagrams.

## Test Expectations (Protocol Repo)

When writing protocol tests:
- Use the existing helper patterns in `test/helpers/contract-helpers.ts`
- Follow Mocha + Chai + ethers v6 patterns
- Include happy path and revert/edge cases
- Verify event emissions with exact parameter matching
- Check balance invariants before and after operations
- For migration tests: verify both SSV balance refund and ETH deposit correctness
- For staking tests: verify `accEthPerShare` accumulator math with precision
