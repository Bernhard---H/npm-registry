import { Schema, KeyMap, Record, RecordIdentity } from '@orbit/data';
import { Resource, ResourceIdentity, ResourceRelationship, JSONAPIDocument } from './jsonapi-document';
export interface DeserializedDocument {
    data: Record | Record[];
    included?: Record[];
}
export interface JSONAPISerializerSettings {
    schema: Schema;
    keyMap?: KeyMap;
}
export default class JSONAPISerializer {
    protected _schema: Schema;
    protected _keyMap: KeyMap;
    constructor(settings: JSONAPISerializerSettings);
    readonly schema: Schema;
    readonly keyMap: KeyMap;
    resourceKey(type: string): string;
    resourceType(type: string): string;
    resourceRelationship(type: string, relationship: string): string;
    resourceAttribute(type: string, attr: string): string;
    resourceIdentity(identity: RecordIdentity): ResourceIdentity;
    resourceIds(type: string, ids: string[]): string[];
    resourceId(type: string, id: string): string;
    recordId(type: string, resourceId: string): string;
    recordType(resourceType: string): string;
    recordIdentity(resourceIdentity: ResourceIdentity): RecordIdentity;
    recordAttribute(type: string, resourceAttribute: string): string;
    recordRelationship(type: string, resourceRelationship: string): string;
    serializeDocument(data: Record | Record[]): JSONAPIDocument;
    serializeRecords(records: Record[]): Resource[];
    serializeRecord(record: Record): Resource;
    serializeId(resource: Resource, record: RecordIdentity): void;
    serializeAttributes(resource: Resource, record: Record): void;
    serializeAttribute(resource: Resource, record: Record, attr: string): void;
    serializeRelationships(resource: Resource, record: Record): void;
    serializeRelationship(resource: Resource, record: Record, relationship: string): void;
    deserializeDocument(document: JSONAPIDocument, primaryRecordData?: Record | Record[]): DeserializedDocument;
    deserializeResource(resource: Resource, primaryRecord?: Record): Record;
    deserializeAttributes(record: Record, resource: Resource): void;
    deserializeAttribute(record: Record, attr: string, value: any): void;
    deserializeRelationships(record: Record, resource: Resource): void;
    deserializeRelationship(record: Record, relationship: string, value: ResourceRelationship): void;
    protected _generateNewId(type: string, keyName: string, keyValue: string): string;
}
