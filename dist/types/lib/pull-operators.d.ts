import { Dict } from '@orbit/utils';
import { Query } from '@orbit/data';
import JSONAPISource from '../jsonapi-source';
export interface PullOperator {
    (source: JSONAPISource, query: Query): any;
}
export declare const PullOperators: Dict<PullOperator>;
