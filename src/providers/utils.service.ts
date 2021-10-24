import bcrypt from 'bcrypt';
import _ from 'lodash';

export class UtilsService {
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
}
