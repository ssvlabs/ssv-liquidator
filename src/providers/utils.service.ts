import crypto from 'crypto';
import _ from 'lodash';
const Web3 = require('web3');
export default class UtilsService {
  /**
   * convert entity to dto class instance
   * @param {{new(entity: E, options: any): T}} model
   * @param {E[] | E} entity
   * @param options
   * @returns {T[] | T}
   */
  public static toDto<T, E>(model: new (entity: E, options?: any) => T, entity: E, options?: any): T;
  public static toDto<T, E>(model: new (entity: E, options?: any) => T, entity: E[], options?: any): T[];
  public static toDto<T, E>(model: new (entity: E, options?: any) => T, entity: E | E[], options?: any): T | T[] {
    if (_.isArray(entity)) {
      return entity.map(u => new model(u, options));
    }

    return new model(entity, options);
  }

  /**
    * convert array to chunks by request size
    */
  static toChunks(items, size) {
    return Array.from(
      new Array(Math.ceil(items.length / size)),
      (_, i) => items.slice(i * size, i * size + size)
    );
  }

  /**
    * convert raw public key to hashed value
    */
  static convertPublickey(rawValue) {
    try {
      const decoded = (new Web3()).eth.abi.decodeParameter('string', rawValue.replace('0x', ''));
      return crypto.createHash('sha256').update(decoded).digest('hex');
    } catch (e) {
      console.warn('PUBKEY WAS NOT CONVERTED DUE TO ', e);
      return rawValue;
    }
  }
}
