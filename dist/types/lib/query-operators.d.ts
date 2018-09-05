import { Dict } from '@orbit/utils';
import { Query } from '@orbit/data';
import JSONAPISource from '../jsonapi-source';
import { DeserializedDocument } from "../jsonapi-serializer";
export interface QueryOperator {
    (source: JSONAPISource, query: Query): Promise<DeserializedDocument>;
}
export declare const QueryOperators: Dict<QueryOperator>;
