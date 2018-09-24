import { Dict } from '@orbit/utils';
import { Query, Transform, Record } from '@orbit/data';
import JSONAPISource from '../jsonapi-source';
export interface QueryOperatorResponse {
    transforms: Transform[];
    primaryData: Record | Record[];
}
export interface QueryOperator {
    (source: JSONAPISource, query: Query): Promise<QueryOperatorResponse>;
}
export declare const QueryOperators: Dict<QueryOperator>;
