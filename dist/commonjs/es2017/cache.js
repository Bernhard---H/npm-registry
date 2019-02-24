'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _utils = require('@orbit/utils');

var _data = require('@orbit/data');

var _recordCache = require('@orbit/record-cache');

var _immutable = require('@orbit/immutable');

/**
 * A cache used to access records in memory.
 *
 * Because data is stored in immutable maps, this type of cache can be forked
 * efficiently.
 */
/* eslint-disable valid-jsdoc */
class Cache extends _recordCache.SyncRecordCache {
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
            rels = rels ? (0, _utils.clone)(rels) : [];
            rels.push(r);
            this._inverseRelationships[r.relatedRecord.type].set(r.relatedRecord.id, rels);
        });
    }
    removeInverseRelationshipsSync(relationships) {
        relationships.forEach(r => {
            let rels = this._inverseRelationships[r.relatedRecord.type].get(r.relatedRecord.id);
            if (rels) {
                let newRels = rels.filter(rel => !((0, _data.equalRecordIdentities)(rel.record, r.record) && rel.relationship === r.relationship));
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
            this._records[type] = new _immutable.ImmutableMap(baseRecords);
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
                this._records[type] = new _immutable.ImmutableMap();
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
            inverseRelationships[type] = new _immutable.ImmutableMap(baseRelationships);
        });
        this._inverseRelationships = inverseRelationships;
    }
}
exports.default = Cache;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNhY2hlLmpzIl0sIm5hbWVzIjpbIkNhY2hlIiwiU3luY1JlY29yZENhY2hlIiwiY29uc3RydWN0b3IiLCJzZXR0aW5ncyIsInJlc2V0IiwiYmFzZSIsImdldFJlY29yZFN5bmMiLCJpZGVudGl0eSIsIl9yZWNvcmRzIiwidHlwZSIsImdldCIsImlkIiwiZ2V0UmVjb3Jkc1N5bmMiLCJ0eXBlT3JJZGVudGl0aWVzIiwiQXJyYXkiLCJpc0FycmF5IiwicmVjb3JkcyIsImlkZW50aXRpZXMiLCJyZWNvcmQiLCJwdXNoIiwiZnJvbSIsInZhbHVlcyIsInNldFJlY29yZFN5bmMiLCJzZXQiLCJzZXRSZWNvcmRzU3luYyIsInR5cGVkTWFwIiwic2V0TWFueSIsInJlbW92ZVJlY29yZFN5bmMiLCJyZWNvcmRJZGVudGl0eSIsInJlY29yZE1hcCIsInJlbW92ZSIsInJlbW92ZVJlY29yZHNTeW5jIiwicmVjb3JkSWRlbnRpdGllcyIsInR5cGVkSWRzIiwicmVtb3ZlTWFueSIsImdldEludmVyc2VSZWxhdGlvbnNoaXBzU3luYyIsIl9pbnZlcnNlUmVsYXRpb25zaGlwcyIsImFkZEludmVyc2VSZWxhdGlvbnNoaXBzU3luYyIsInJlbGF0aW9uc2hpcHMiLCJmb3JFYWNoIiwiciIsInJlbHMiLCJyZWxhdGVkUmVjb3JkIiwicmVtb3ZlSW52ZXJzZVJlbGF0aW9uc2hpcHNTeW5jIiwibmV3UmVscyIsImZpbHRlciIsInJlbCIsInJlbGF0aW9uc2hpcCIsIk9iamVjdCIsImtleXMiLCJfc2NoZW1hIiwibW9kZWxzIiwiYmFzZVJlY29yZHMiLCJJbW11dGFibGVNYXAiLCJfcmVzZXRJbnZlcnNlUmVsYXRpb25zaGlwcyIsIl9wcm9jZXNzb3JzIiwicHJvY2Vzc29yIiwiZW1pdCIsInVwZ3JhZGUiLCJpbnZlcnNlUmVsYXRpb25zaGlwcyIsImJhc2VSZWxhdGlvbnNoaXBzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7Ozs7O0FB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QUF6QixFQUFpQ1osT0FBakMsQ0FBeUM5QixRQUFRO0FBQzdDLGdCQUFJbUQsb0JBQW9CdkQsUUFBUUEsS0FBSytCLHFCQUFMLENBQTJCM0IsSUFBM0IsQ0FBaEM7QUFDQWtELGlDQUFxQmxELElBQXJCLElBQTZCLElBQUk0Qyx1QkFBSixDQUFpQk8saUJBQWpCLENBQTdCO0FBQ0gsU0FIRDtBQUlBLGFBQUt4QixxQkFBTCxHQUE2QnVCLG9CQUE3QjtBQUNIO0FBN0g4QztrQkFBOUIzRCxLIiwiZmlsZSI6ImNhY2hlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgdmFsaWQtanNkb2MgKi9cbmltcG9ydCB7IGNsb25lIH0gZnJvbSAnQG9yYml0L3V0aWxzJztcbmltcG9ydCB7IGVxdWFsUmVjb3JkSWRlbnRpdGllcyB9IGZyb20gJ0BvcmJpdC9kYXRhJztcbmltcG9ydCB7IFN5bmNSZWNvcmRDYWNoZSB9IGZyb20gJ0BvcmJpdC9yZWNvcmQtY2FjaGUnO1xuaW1wb3J0IHsgSW1tdXRhYmxlTWFwIH0gZnJvbSAnQG9yYml0L2ltbXV0YWJsZSc7XG4vKipcbiAqIEEgY2FjaGUgdXNlZCB0byBhY2Nlc3MgcmVjb3JkcyBpbiBtZW1vcnkuXG4gKlxuICogQmVjYXVzZSBkYXRhIGlzIHN0b3JlZCBpbiBpbW11dGFibGUgbWFwcywgdGhpcyB0eXBlIG9mIGNhY2hlIGNhbiBiZSBmb3JrZWRcbiAqIGVmZmljaWVudGx5LlxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDYWNoZSBleHRlbmRzIFN5bmNSZWNvcmRDYWNoZSB7XG4gICAgY29uc3RydWN0b3Ioc2V0dGluZ3MpIHtcbiAgICAgICAgc3VwZXIoc2V0dGluZ3MpO1xuICAgICAgICB0aGlzLnJlc2V0KHNldHRpbmdzLmJhc2UpO1xuICAgIH1cbiAgICBnZXRSZWNvcmRTeW5jKGlkZW50aXR5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yZWNvcmRzW2lkZW50aXR5LnR5cGVdLmdldChpZGVudGl0eS5pZCkgfHwgbnVsbDtcbiAgICB9XG4gICAgZ2V0UmVjb3Jkc1N5bmModHlwZU9ySWRlbnRpdGllcykge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh0eXBlT3JJZGVudGl0aWVzKSkge1xuICAgICAgICAgICAgY29uc3QgcmVjb3JkcyA9IFtdO1xuICAgICAgICAgICAgY29uc3QgaWRlbnRpdGllcyA9IHR5cGVPcklkZW50aXRpZXM7XG4gICAgICAgICAgICBmb3IgKGxldCBpZGVudGl0eSBvZiBpZGVudGl0aWVzKSB7XG4gICAgICAgICAgICAgICAgbGV0IHJlY29yZCA9IHRoaXMuZ2V0UmVjb3JkU3luYyhpZGVudGl0eSk7XG4gICAgICAgICAgICAgICAgaWYgKHJlY29yZCkge1xuICAgICAgICAgICAgICAgICAgICByZWNvcmRzLnB1c2gocmVjb3JkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVjb3JkcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IHR5cGUgPSB0eXBlT3JJZGVudGl0aWVzO1xuICAgICAgICAgICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5fcmVjb3Jkc1t0eXBlXS52YWx1ZXMoKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgc2V0UmVjb3JkU3luYyhyZWNvcmQpIHtcbiAgICAgICAgdGhpcy5fcmVjb3Jkc1tyZWNvcmQudHlwZV0uc2V0KHJlY29yZC5pZCwgcmVjb3JkKTtcbiAgICB9XG4gICAgc2V0UmVjb3Jkc1N5bmMocmVjb3Jkcykge1xuICAgICAgICBsZXQgdHlwZWRNYXAgPSB7fTtcbiAgICAgICAgZm9yIChsZXQgcmVjb3JkIG9mIHJlY29yZHMpIHtcbiAgICAgICAgICAgIHR5cGVkTWFwW3JlY29yZC50eXBlXSA9IHR5cGVkTWFwW3JlY29yZC50eXBlXSB8fCBbXTtcbiAgICAgICAgICAgIHR5cGVkTWFwW3JlY29yZC50eXBlXS5wdXNoKFtyZWNvcmQuaWQsIHJlY29yZF0pO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IHR5cGUgaW4gdHlwZWRNYXApIHtcbiAgICAgICAgICAgIHRoaXMuX3JlY29yZHNbdHlwZV0uc2V0TWFueSh0eXBlZE1hcFt0eXBlXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmVtb3ZlUmVjb3JkU3luYyhyZWNvcmRJZGVudGl0eSkge1xuICAgICAgICBjb25zdCByZWNvcmRNYXAgPSB0aGlzLl9yZWNvcmRzW3JlY29yZElkZW50aXR5LnR5cGVdO1xuICAgICAgICBjb25zdCByZWNvcmQgPSByZWNvcmRNYXAuZ2V0KHJlY29yZElkZW50aXR5LmlkKTtcbiAgICAgICAgaWYgKHJlY29yZCkge1xuICAgICAgICAgICAgcmVjb3JkTWFwLnJlbW92ZShyZWNvcmRJZGVudGl0eS5pZCk7XG4gICAgICAgICAgICByZXR1cm4gcmVjb3JkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmVtb3ZlUmVjb3Jkc1N5bmMocmVjb3JkSWRlbnRpdGllcykge1xuICAgICAgICBjb25zdCByZWNvcmRzID0gW107XG4gICAgICAgIGNvbnN0IHR5cGVkSWRzID0ge307XG4gICAgICAgIGZvciAobGV0IHJlY29yZElkZW50aXR5IG9mIHJlY29yZElkZW50aXRpZXMpIHtcbiAgICAgICAgICAgIGxldCByZWNvcmQgPSB0aGlzLmdldFJlY29yZFN5bmMocmVjb3JkSWRlbnRpdHkpO1xuICAgICAgICAgICAgaWYgKHJlY29yZCkge1xuICAgICAgICAgICAgICAgIHJlY29yZHMucHVzaChyZWNvcmQpO1xuICAgICAgICAgICAgICAgIHR5cGVkSWRzW3JlY29yZC50eXBlXSA9IHR5cGVkSWRzW3JlY29yZC50eXBlXSB8fCBbXTtcbiAgICAgICAgICAgICAgICB0eXBlZElkc1tyZWNvcmQudHlwZV0ucHVzaChyZWNvcmRJZGVudGl0eS5pZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgdHlwZSBpbiB0eXBlZElkcykge1xuICAgICAgICAgICAgdGhpcy5fcmVjb3Jkc1t0eXBlXS5yZW1vdmVNYW55KHR5cGVkSWRzW3R5cGVdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVjb3JkcztcbiAgICB9XG4gICAgZ2V0SW52ZXJzZVJlbGF0aW9uc2hpcHNTeW5jKHJlY29yZElkZW50aXR5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbnZlcnNlUmVsYXRpb25zaGlwc1tyZWNvcmRJZGVudGl0eS50eXBlXS5nZXQocmVjb3JkSWRlbnRpdHkuaWQpIHx8IFtdO1xuICAgIH1cbiAgICBhZGRJbnZlcnNlUmVsYXRpb25zaGlwc1N5bmMocmVsYXRpb25zaGlwcykge1xuICAgICAgICByZWxhdGlvbnNoaXBzLmZvckVhY2gociA9PiB7XG4gICAgICAgICAgICBsZXQgcmVscyA9IHRoaXMuX2ludmVyc2VSZWxhdGlvbnNoaXBzW3IucmVsYXRlZFJlY29yZC50eXBlXS5nZXQoci5yZWxhdGVkUmVjb3JkLmlkKTtcbiAgICAgICAgICAgIHJlbHMgPSByZWxzID8gY2xvbmUocmVscykgOiBbXTtcbiAgICAgICAgICAgIHJlbHMucHVzaChyKTtcbiAgICAgICAgICAgIHRoaXMuX2ludmVyc2VSZWxhdGlvbnNoaXBzW3IucmVsYXRlZFJlY29yZC50eXBlXS5zZXQoci5yZWxhdGVkUmVjb3JkLmlkLCByZWxzKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJlbW92ZUludmVyc2VSZWxhdGlvbnNoaXBzU3luYyhyZWxhdGlvbnNoaXBzKSB7XG4gICAgICAgIHJlbGF0aW9uc2hpcHMuZm9yRWFjaChyID0+IHtcbiAgICAgICAgICAgIGxldCByZWxzID0gdGhpcy5faW52ZXJzZVJlbGF0aW9uc2hpcHNbci5yZWxhdGVkUmVjb3JkLnR5cGVdLmdldChyLnJlbGF0ZWRSZWNvcmQuaWQpO1xuICAgICAgICAgICAgaWYgKHJlbHMpIHtcbiAgICAgICAgICAgICAgICBsZXQgbmV3UmVscyA9IHJlbHMuZmlsdGVyKHJlbCA9PiAhKGVxdWFsUmVjb3JkSWRlbnRpdGllcyhyZWwucmVjb3JkLCByLnJlY29yZCkgJiYgcmVsLnJlbGF0aW9uc2hpcCA9PT0gci5yZWxhdGlvbnNoaXApKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9pbnZlcnNlUmVsYXRpb25zaGlwc1tyLnJlbGF0ZWRSZWNvcmQudHlwZV0uc2V0KHIucmVsYXRlZFJlY29yZC5pZCwgbmV3UmVscyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZXNldHMgdGhlIGNhY2hlJ3Mgc3RhdGUgdG8gYmUgZWl0aGVyIGVtcHR5IG9yIHRvIG1hdGNoIHRoZSBzdGF0ZSBvZlxuICAgICAqIGFub3RoZXIgY2FjaGUuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYCBqYXZhc2NyaXB0XG4gICAgICogY2FjaGUucmVzZXQoKTsgLy8gZW1wdGllcyBjYWNoZVxuICAgICAqIGNhY2hlLnJlc2V0KGNhY2hlMik7IC8vIGNsb25lcyB0aGUgc3RhdGUgb2YgY2FjaGUyXG4gICAgICogYGBgXG4gICAgICovXG4gICAgcmVzZXQoYmFzZSkge1xuICAgICAgICB0aGlzLl9yZWNvcmRzID0ge307XG4gICAgICAgIE9iamVjdC5rZXlzKHRoaXMuX3NjaGVtYS5tb2RlbHMpLmZvckVhY2godHlwZSA9PiB7XG4gICAgICAgICAgICBsZXQgYmFzZVJlY29yZHMgPSBiYXNlICYmIGJhc2UuX3JlY29yZHNbdHlwZV07XG4gICAgICAgICAgICB0aGlzLl9yZWNvcmRzW3R5cGVdID0gbmV3IEltbXV0YWJsZU1hcChiYXNlUmVjb3Jkcyk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLl9yZXNldEludmVyc2VSZWxhdGlvbnNoaXBzKGJhc2UpO1xuICAgICAgICB0aGlzLl9wcm9jZXNzb3JzLmZvckVhY2gocHJvY2Vzc29yID0+IHByb2Nlc3Nvci5yZXNldChiYXNlKSk7XG4gICAgICAgIHRoaXMuZW1pdCgncmVzZXQnKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogVXBncmFkZSB0aGUgY2FjaGUgYmFzZWQgb24gdGhlIGN1cnJlbnQgc3RhdGUgb2YgdGhlIHNjaGVtYS5cbiAgICAgKi9cbiAgICB1cGdyYWRlKCkge1xuICAgICAgICBPYmplY3Qua2V5cyh0aGlzLl9zY2hlbWEubW9kZWxzKS5mb3JFYWNoKHR5cGUgPT4ge1xuICAgICAgICAgICAgaWYgKCF0aGlzLl9yZWNvcmRzW3R5cGVdKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVjb3Jkc1t0eXBlXSA9IG5ldyBJbW11dGFibGVNYXAoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuX3Jlc2V0SW52ZXJzZVJlbGF0aW9uc2hpcHMoKTtcbiAgICAgICAgdGhpcy5fcHJvY2Vzc29ycy5mb3JFYWNoKHByb2Nlc3NvciA9PiBwcm9jZXNzb3IudXBncmFkZSgpKTtcbiAgICB9XG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBQcm90ZWN0ZWQgbWV0aG9kc1xuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgX3Jlc2V0SW52ZXJzZVJlbGF0aW9uc2hpcHMoYmFzZSkge1xuICAgICAgICBjb25zdCBpbnZlcnNlUmVsYXRpb25zaGlwcyA9IHt9O1xuICAgICAgICBPYmplY3Qua2V5cyh0aGlzLl9zY2hlbWEubW9kZWxzKS5mb3JFYWNoKHR5cGUgPT4ge1xuICAgICAgICAgICAgbGV0IGJhc2VSZWxhdGlvbnNoaXBzID0gYmFzZSAmJiBiYXNlLl9pbnZlcnNlUmVsYXRpb25zaGlwc1t0eXBlXTtcbiAgICAgICAgICAgIGludmVyc2VSZWxhdGlvbnNoaXBzW3R5cGVdID0gbmV3IEltbXV0YWJsZU1hcChiYXNlUmVsYXRpb25zaGlwcyk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLl9pbnZlcnNlUmVsYXRpb25zaGlwcyA9IGludmVyc2VSZWxhdGlvbnNoaXBzO1xuICAgIH1cbn0iXX0=