import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import { CustomLogger } from '@cli/shared/services/logger.service';

TimeAgo.addLocale(en);
const timeAgo = new TimeAgo('en-US');

const LABEL_CLUSTER_STATUS_LIQUIDATED = 'Liquidated';
const LABEL_CLUSTER_STATUS_TO_LIQUIDATE = 'To liquidate';
const LABEL_CLUSTER_STATUS_RUNNING = 'Running';

/**
 * It provides how to colorize the status text based on the status string
 * @param {string} status pod phase status string obtained from the kube api
 * @returns object containing information on what should be the font color and background color
 */
export const colorCodeStatus = status => {
  switch (status) {
    case LABEL_CLUSTER_STATUS_LIQUIDATED:
      return { bgColor: 'red', color: 'white' };
    case LABEL_CLUSTER_STATUS_TO_LIQUIDATE:
      return { bgColor: 'yellow', color: 'black' };
    case LABEL_CLUSTER_STATUS_RUNNING:
      return { bgColor: 'green', color: 'white' };
    default:
      return {};
  }
};

const textStatus = (item, extra: any) => {
  const { currentBlockNumber } = extra;
  switch (true) {
    case item.isLiquidated:
      return LABEL_CLUSTER_STATUS_LIQUIDATED;
    case item.liquidationBlockNumber !== null &&
      item.liquidationBlockNumber <= currentBlockNumber:
      return LABEL_CLUSTER_STATUS_TO_LIQUIDATE;
    default:
      return LABEL_CLUSTER_STATUS_RUNNING;
  }
};

/**
 * It transforms the items object from sqlite into a custom format
 * @param {Array<>} items list of clusters object from the sqlite
 * @returns List of custom formatted pod data
 */
export const transformClusterData = (items, extra: any) => {
  const logger = new CustomLogger('ClusterDataTransformer');
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
        liquidationBlockNumber: { text: item.liquidationBlockNumber },
        updated: {
          text: timeAgo.format(item.updatedAt, 'round-minute'),
        },
      });
    }

    // Properly sort all entries in a table
    clusters.sort((a: any, b: any): number => {
      const order: string[] = [
        LABEL_CLUSTER_STATUS_TO_LIQUIDATE,
        LABEL_CLUSTER_STATUS_LIQUIDATED,
        LABEL_CLUSTER_STATUS_RUNNING,
      ];
      return order.indexOf(a.status.text) - order.indexOf(b.status.text);
    });
  } catch (e) {
    logger.error(`Failed to transform cluster data. ${e}`);
  }
  return clusters;
};
