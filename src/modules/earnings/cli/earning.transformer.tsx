/**
 * It transforms the items object from sqlite into a custom format
 * @param {Array<>} items list of addresses object from the sqlite
 * @returns List of custom formatted pod data
 */
export const transformEarningData = (items) => {
  const earnings = [];
  try {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      earnings.push({
        fee: { text: `${(item.gasPrice*item.gasUsed).toFixed(18)} ETH` },
        earned: { text: `${item.earned} SSV`},
        liquidatedAtBlock: { text: item.earnedAtBlock },
        txHash: { text: item.hash },
      });
    }
  } catch (e) {
    console.log(e);
  }
  return earnings;
};