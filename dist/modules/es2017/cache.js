/* eslint-disable valid-jsdoc */
import { clone } from '@orbit/utils';
import { equalRecordIdentities } from '@orbit/data';
import { SyncRecordCache } from '@orbit/record-cache';
import { ImmutableMap } from '@orbit/immutable';
/**
 * A cache used to access records in memory.
 *
 * Because data is stored in immutable maps, this type of cache can be forked
 * efficiently.
 */
export default class Cache extends SyncRecordCache {
    constructor(settings) {
        super(settings);
        this.reset(settings.base);
    }
    getRecordSync(identity) {
        return this._records[identity.type].get(identity.id) || null;
    }
    getRecordsSync(typeOrIdentities) {
        if (Array.isArray(typeOrIdentities)) {
            const records = [];
            const identities = typeOrIdentities;
            for (let identity of identities) {
                let record = this.getRecordSync(identity);
                if (record) {
                    records.push(record);
                }
            }
            return records;
        } else {
            const type = typeOrIdentities;
            return Array.from(this._records[type].values());
        }
    }
    setRecordSync(record) {
        this._records[record.type].set(record.id, record);
    }
    setRecordsSync(records) {
        let typedMap = {};
        for (let record of records) {
            typedMap[record.type] = typedMap[record.type] || [];
            typedMap[record.type].push([record.id, record]);
        }
        for (let type in typedMap) {
            this._records[type].setMany(typedMap[type]);
        }
    }
    removeRecordSync(recordIdentity) {
        const recordMap = this._records[recordIdentity.type];
        const record = recordMap.get(recordIdentity.id);
        if (record) {
            recordMap.remove(recordIdentity.id);
            return record;
        } else {
            return null;
        }
    }
    removeRecordsSync(recordIdentities) {
        const records = [];
        const typedIds = {};
        for (let recordIdentity of recordIdentities) {
            let record = this.getRecordSync(recordIdentity);
            if (record) {
                records.push(record);
                typedIds[record.type] = typedIds[record.type] || [];
                typedIds[record.type].push(recordIdentity.id);
            }
        }
        for (let type in typedIds) {
            this._records[type].removeMany(typedIds[type]);
        }
        return records;
    }
    getInverseRelationshipsSync(recordIdentity) {
        return this._inverseRelationships[recordIdentity.type].get(recordIdentity.id) || [];
    }
    addInverseRelationshipsSync(relationships) {
        relationships.forEach(r => {
            let rels = this._inverseRelationships[r.relatedRecord.type].get(r.relatedRecord.id);
            rels = rels ? clone(rels) : [];
            rels.push(r);
            this._inverseRelationships[r.relatedRecord.type].set(r.relatedRecord.id, rels);
        });
    }
    removeInverseRelationshipsSync(relationships) {
        relationships.forEach(r => {
            let rels = this._inverseRelationships[r.relatedRecord.type].get(r.relatedRecord.id);
            if (rels) {
                let newRels = rels.filter(rel => !(equalRecordIdentities(rel.record, r.record) && rel.relationship === r.relationship));
                this._inverseRelationships[r.relatedRecord.type].set(r.relatedRecord.id, newRels);
            }
        });
    }
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
    reset(base) {
        this._records = {};
        Object.keys(this._schema.models).forEach(type => {
            let baseRecords = base && base._records[type];
            this._records[type] = new ImmutableMap(baseRecords);
        });
        this._resetInverseRelationships(base);
        this._processors.forEach(processor => processor.reset(base));
        this.emit('reset');
    }
    /**
     * Upgrade the cache based on the current state of the schema.
     */
    upgrade() {
        Object.keys(this._schema.models).forEach(type => {
            if (!this._records[type]) {
                this._records[type] = new ImmutableMap();
            }
        });
        this._resetInverseRelationships();
        this._processors.forEach(processor => processor.upgrade());
    }
    /////////////////////////////////////////////////////////////////////////////
    // Protected methods
    /////////////////////////////////////////////////////////////////////////////
    _resetInverseRelationships(base) {
        const inverseRelationships = {};
        Object.keys(this._schema.models).forEach(type => {
            let baseRelationships = base && base._inverseRelationships[type];
            inverseRelationships[type] = new ImmutableMap(baseRelationships);
        });
        this._inverseRelationships = inverseRelationships;
    }
}