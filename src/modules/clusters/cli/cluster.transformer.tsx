import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';

TimeAgo.addLocale(en);
const timeAgo = new TimeAgo('en-US');

/**
 * It provides how to colorize the status text based on the status string
 * @param {string} status pod phase status string obtained from the kube api
 * @returns object containing information on what should be the font color and background color
 */
export const colorCodeStatus = status => {
  switch (status) {
    case 'Liquidated':
      return { bgColor: 'red', color: 'white' };
    case 'To liquidate':
      return { bgColor: 'yellow', color: 'black' };
    case 'Running':
      return { bgColor: 'green', color: 'white' };
    default:
      return {};
  }
};

const textStatus = (item, extra: any) => {
  const { currentBlockNumber, minimumBlocksBeforeLiquidation } = extra;
  const blockDiff = item.liquidateLastBlock
    ? item.liquidateLastBlock - currentBlockNumber
    : null;
  switch (true) {
    case item.isLiquidated:
      return 'Liquidated';
    case blockDiff !== null && blockDiff < minimumBlocksBeforeLiquidation:
      return 'To liquidate';
    default:
      return 'Running';
  }
};

/**
 * It transforms the items object from sqlite into a custom format
 * @param {Array<>} items list of clusters object from the sqlite
 * @returns List of custom formatted pod data
 */
export const transformClusterData = (items, extra: any) => {
  const clusters = [];
  try {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const status = textStatus(item, extra);
      clusters.push({
        owner: { text: item.owner },
        operatorIds: { text: item.operatorIds },
        balance: { text: item.balance },
        burnRate: {
          text: item.burnRate !== null ? `${item.burnRate / 1e18} SSV` : '',
        },
        status: {
          text: status,
          ...colorCodeStatus(status),
          padText: true,
          extraPadding: 1,
        },
        liquidateFirstBlock: { text: item.liquidateFirstBlock },
        liquidateLastBlock: { text: item.liquidateLastBlock },
        updated: {
          text: timeAgo.format(item.updatedAt, 'round-minute'),
        },
      });
    }
  } catch (e) {
    console.log(e);
  }
  return clusters;
};
