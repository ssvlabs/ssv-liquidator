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
        owner: { text: item.ownerAddress },
        gasPrice: { text: `${item.gasPrice} ETH` },
        gasUsed: { text: `${item.gasUsed}`},
        earned: { text: `${item.earned} SSV`},
        liquidateAtBlock: { text: item.earnedAtBlock }
      });
    }
  } catch (e) {
    console.log(e);
  }
  return earnings;
};