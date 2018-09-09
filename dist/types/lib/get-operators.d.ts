import { Query } from '@orbit/data';
import JSONAPISource from '../jsonapi-source';
import { JSONAPIDocument } from '../jsonapi-document';
export declare const GetOperators: {
    findRecord(source: JSONAPISource, query: Query): Promise<JSONAPIDocument>;
    findRecords(source: JSONAPISource, query: Query): Promise<JSONAPIDocument>;
    findRelatedRecord(source: JSONAPISource, query: Query): Promise<JSONAPIDocument>;
    findRelatedRecords(source: JSONAPISource, query: Query): Promise<JSONAPIDocument>;
};
