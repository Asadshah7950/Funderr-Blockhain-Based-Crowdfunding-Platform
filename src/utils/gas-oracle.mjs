/**
 * EIP-1559 Gas Estimator and Priority Fee Oracle.
 * Provides multi-tier fee estimates (slow, standard, fast) based on baseFee and priority fee percentiles.
 */

export const FEE_PROFILES = Object.freeze({
  SLOW: { baseFeeMultiplier: 1.10, priorityFeeGwei: 1.0 },
  STANDARD: { baseFeeMultiplier: 1.25, priorityFeeGwei: 2.0 },
  FAST: { baseFeeMultiplier: 1.50, priorityFeeGwei: 3.5 },
});

export function gweiToWei(gwei) {
  return BigInt(Math.round(gwei * 1e9));
}

export function calculateEip1559Fees(baseFeeWei, tier = 'STANDARD') {
  const profile = FEE_PROFILES[tier.toUpperCase()];
  if (!profile) throw new TypeError(`Unknown gas fee tier: ${tier}`);

  const baseFee = BigInt(baseFeeWei);
  const maxPriorityFeePerGas = gweiToWei(profile.priorityFeeGwei);
  const multipliedBaseFee = (baseFee * BigInt(Math.round(profile.baseFeeMultiplier * 100))) / 100n;
  const maxFeePerGas = multipliedBaseFee + maxPriorityFeePerGas;

  return {
    tier: tier.toUpperCase(),
    baseFee: baseFee.toString(),
    maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
    maxFeePerGas: maxFeePerGas.toString(),
    estimatedCostForGas(gasLimit) {
      return (maxFeePerGas * BigInt(gasLimit)).toString();
    }
  };
}

export function suggestTiers(baseFeeWei) {
  return {
    slow: calculateEip1559Fees(baseFeeWei, 'SLOW'),
    standard: calculateEip1559Fees(baseFeeWei, 'STANDARD'),
    fast: calculateEip1559Fees(baseFeeWei, 'FAST'),
  };
}
