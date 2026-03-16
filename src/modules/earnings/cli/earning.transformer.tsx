const WEI_PER_ETH = 10n ** 18n;

const formatWeiToEth = value => {
  if (value === null || value === undefined) {
    return '0';
  }

  const wei = BigInt(value.toString());
  const integer = wei / WEI_PER_ETH;
  const fraction = (wei % WEI_PER_ETH).toString().padStart(18, '0');
  const trimmedFraction = fraction.replace(/0+$/, '');

  return trimmedFraction ? `${integer}.${trimmedFraction}` : `${integer}`;
};

/**
 * It transforms the items object from sqlite into a custom format
 * @param {Array<>} items list of clusters object from the sqlite
 * @returns List of custom formatted pod data
 */
export const transformEarningData = items => {
  const earnings = [];
  try {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const gasPrice = item.gasPrice ? BigInt(item.gasPrice.toString()) : 0n;
      const gasUsed = item.gasUsed ? BigInt(item.gasUsed.toString()) : 0n;
      const feeWei = gasPrice * gasUsed;

      earnings.push({
        fee: { text: `${formatWeiToEth(feeWei.toString())} ETH` },
        earned: { text: `${formatWeiToEth(item.earned)} ETH` },
        liquidatedAtBlock: { text: item.earnedAtBlock },
        txHash: { text: item.hash },
      });
    }
  } catch (e) {
    console.log(e);
  }
  return earnings;
};
