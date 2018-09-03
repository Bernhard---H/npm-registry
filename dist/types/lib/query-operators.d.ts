import { Dict } from '@orbit/utils';
import { Query, Record } from '@orbit/data';
import JSONAPISource from '../jsonapi-source';
export interface PullOperator {
    (source: JSONAPISource, query: Query): Promise<Record[]>;
}
export declare const QueryOperators: Dict<PullOperator>;
