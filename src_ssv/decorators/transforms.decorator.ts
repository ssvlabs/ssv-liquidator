/* tslint:disable:naming-convention */

import { Transform } from 'class-transformer';
import _ from 'lodash';

/**
 * @description transforms to array, specially for query params
 * @example
 * @IsNumber()
 * @ToArray()
 * name: number;
 * @constructor
 */
export function ToArray(): (target: any, key: string) => void {
  return Transform(
    value => {
      if (_.isNil(value)) {
        return [];
      }
      return _.castArray(value);
    },
    { toClassOnly: true },
  );
}
