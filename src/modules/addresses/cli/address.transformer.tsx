import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';

TimeAgo.addLocale(en);
const timeAgo = new TimeAgo('en-US');

/**
 * It provides how to colorize the status text based on the status string
 * @param {string} status pod phase status string obtained from the kube api
 * @returns object containing information on what should be the font color and background color
 */
export const colorCodeStatus = (status) => {
  switch (status) {
    case 'Liquidated':
      return { bgColor: 'red', color: 'white' };
    case 'Failed':
      return { bgColor: 'red', color: 'white' };
    case 'Pending':
      return { bgColor: 'yellow', color: 'white' };
    case 'Succeeded':
      return { bgColor: 'green', color: 'white' };
    case 'Running':
      return { bgColor: 'green', color: 'white' };
    default:
      return {};
  }
};

const textStatus = (blockDiff) => {
  switch(true) {
    case (blockDiff <= 0):
      return 'Liquidated';
    case (blockDiff <= 5040): // 1 day: 3.5 blocks per minute * 60 * 24
      return 'To liquidate';
    case (blockDiff > 5040):
      return 'Running';
    default:
      return '';
  }
}

/**
 * It transforms the items object from sqlite into a custom format
 * @param {Array<>} items list of addresses object from the sqlite
 * @returns List of custom formatted pod data
 */
export const transformAddressData = (items, extra: any) => {
  const addresses = [];
  try {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const blockDiff = item.liquidateAtBlock - extra.currentBlockNumber;
      const status = textStatus(blockDiff);
      addresses.push({
        owner: { text: item.ownerAddress },
        burnRate: { text: `${item.burnRate / 1e18} SSV` },
        status: {
          text: status,
          ...colorCodeStatus(status),
          padText: true,
          extraPadding: 1
        },
        liquidateAtBlock: { text: item.liquidateAtBlock },
        updated: {
          text: timeAgo.format(item.updatedAt, 'round-minute')
        }
      });
    }  
  } catch (e) {
    console.log(e);
  }
  return addresses;
};