import { Injectable, Logger } from '@nestjs/common';
import SolidityErrors from '@cli/providers/solidity-errors.provider';

@Injectable()
export class RetryService {
  private readonly _logger = new Logger(RetryService.name);

  static get RETRY_DELAY() {
    return 1000;
  }

  async getWithRetry(
    contractMethod: any,
    params: Array<any> = null,
    maxRetries = 3,
    maxTimeout = RetryService.RETRY_DELAY * 2,
  ) {
    let retries = 0;
    let retryDelay = RetryService.RETRY_DELAY;
    while (retries < maxRetries) {
      try {
        const timeoutPromise = new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(
              new Error(
                `⏰ RetryService::getWithRetry: Timeout expired: ${maxTimeout}ms`,
              ),
            );
          }, maxTimeout);
        });
        return await Promise.race([
          timeoutPromise,
          contractMethod(...(params || [])),
        ])
          .then(result => result)
          .catch(error => {
            throw error;
          });
      } catch (error) {
        const methodSignature = `${contractMethod.toString()}(${(params || [])
          .map(p => JSON.stringify(p))
          .join(', ')})`;
        if (error.data && String(error.data).startsWith('0x')) {
          return SolidityErrors.getErrorByHash(error.data);
        } else if (retries + 1 >= maxRetries) {
          this._logger.error(
            `Reached maximum number of retries (${maxRetries}). Method: ${methodSignature}`,
            error,
          );
          throw new Error(error);
        }
        this._logger.warn(
          `[RETRY] Retrying ${
            retries + 1
          } out of ${maxRetries} with delay ${retryDelay}. Method: ${methodSignature}`,
        );
        await RetryService.sleep(retryDelay);
        retries++;
        retryDelay += RetryService.RETRY_DELAY;
      }
    }
  }

  /**
   * Sleep specific amount of ms
   * @param ms
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
