import { Dict } from '@orbit/utils';
import { Record, RecordIdentity } from '@orbit/data';
import { RecordRelationshipIdentity, SyncRecordCache, SyncRecordCacheSettings } from '@orbit/record-cache';
import { ImmutableMap } from '@orbit/immutable';
export interface CacheSettings extends SyncRecordCacheSettings {
    base?: Cache;
}
/**
 * A cache used to access records in memory.
 *
 * Because data is stored in immutable maps, this type of cache can be forked
 * efficiently.
 */
export default class Cache extends SyncRecordCache {
    protected _records: Dict<ImmutableMap<string, Record>>;
    protected _inverseRelationships: Dict<ImmutableMap<string, RecordRelationshipIdentity[]>>;
    constructor(settings: CacheSettings);
    getRecordSync(identity: RecordIdentity): Record;
    getRecordsSync(typeOrIdentities?: string | RecordIdentity[]): Record[];
    setRecordSync(record: Record): void;
    setRecordsSync(records: Record[]): void;
    removeRecordSync(recordIdentity: RecordIdentity): Record;
    removeRecordsSync(recordIdentities: RecordIdentity[]): Record[];
    getInverseRelationshipsSync(recordIdentity: RecordIdentity): RecordRelationshipIdentity[];
    addInverseRelationshipsSync(relationships: RecordRelationshipIdentity[]): void;
    removeInverseRelationshipsSync(relationships: RecordRelationshipIdentity[]): void;
    /**
     * Resets the cache's state to be either empty or to match the state of
     * another cache.
     *
     * @example
     * ``` javascript
     * cache.reset(); // empties cache
     * cache.reset(cache2); // clones the state of cache2
     * ```
     */
    reset(base?: Cache): void;
    /**
     * Upgrade the cache based on the current state of the schema.
     */
    upgrade(): void;
    protected _resetInverseRelationships(base?: Cache): void;
}
