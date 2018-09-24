import { Transform } from '@orbit/data';
import JSONAPISource from '../jsonapi-source';
export declare const TransformRequestProcessors: {
    addRecord(source: JSONAPISource, request: any): Promise<any[]>;
    removeRecord(source: JSONAPISource, request: any): Promise<any[]>;
    replaceRecord(source: JSONAPISource, request: any): Promise<any[]>;
    addToRelatedRecords(source: JSONAPISource, request: any): Promise<any[]>;
    removeFromRelatedRecords(source: JSONAPISource, request: any): Promise<any[]>;
    replaceRelatedRecord(source: JSONAPISource, request: any): Promise<any[]>;
    replaceRelatedRecords(source: JSONAPISource, request: any): Promise<any[]>;
};
export declare function getTransformRequests(source: JSONAPISource, transform: Transform): any[];
