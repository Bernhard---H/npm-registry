function _defaults(obj, defaults) { var keys = Object.getOwnPropertyNames(defaults); for (var i = 0; i < keys.length; i++) { var key = keys[i]; var value = Object.getOwnPropertyDescriptor(defaults, key); if (value && value.configurable && obj[key] === undefined) { Object.defineProperty(obj, key, value); } } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : _defaults(subClass, superClass); }

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

var Cache = function (_SyncRecordCache) {
    _inherits(Cache, _SyncRecordCache);

    function Cache(settings) {
        _classCallCheck(this, Cache);

        var _this = _possibleConstructorReturn(this, _SyncRecordCache.call(this, settings));

        _this.reset(settings.base);
        return _this;
    }

    Cache.prototype.getRecordSync = function getRecordSync(identity) {
        return this._records[identity.type].get(identity.id) || null;
    };

    Cache.prototype.getRecordsSync = function getRecordsSync(typeOrIdentities) {
        if (Array.isArray(typeOrIdentities)) {
            var records = [];
            var identities = typeOrIdentities;
            for (var identity of identities) {
                var record = this.getRecordSync(identity);
                if (record) {
                    records.push(record);
                }
            }
            return records;
        } else {
            var type = typeOrIdentities;
            return Array.from(this._records[type].values());
        }
    };

    Cache.prototype.setRecordSync = function setRecordSync(record) {
        this._records[record.type].set(record.id, record);
    };

    Cache.prototype.setRecordsSync = function setRecordsSync(records) {
        var typedMap = {};
        for (var record of records) {
            typedMap[record.type] = typedMap[record.type] || [];
            typedMap[record.type].push([record.id, record]);
        }
        for (var type in typedMap) {
            this._records[type].setMany(typedMap[type]);
        }
    };

    Cache.prototype.removeRecordSync = function removeRecordSync(recordIdentity) {
        var recordMap = this._records[recordIdentity.type];
        var record = recordMap.get(recordIdentity.id);
        if (record) {
            recordMap.remove(recordIdentity.id);
            return record;
        } else {
            return null;
        }
    };

    Cache.prototype.removeRecordsSync = function removeRecordsSync(recordIdentities) {
        var records = [];
        var typedIds = {};
        for (var recordIdentity of recordIdentities) {
            var record = this.getRecordSync(recordIdentity);
            if (record) {
                records.push(record);
                typedIds[record.type] = typedIds[record.type] || [];
                typedIds[record.type].push(recordIdentity.id);
            }
        }
        for (var type in typedIds) {
            this._records[type].removeMany(typedIds[type]);
        }
        return records;
    };

    Cache.prototype.getInverseRelationshipsSync = function getInverseRelationshipsSync(recordIdentity) {
        return this._inverseRelationships[recordIdentity.type].get(recordIdentity.id) || [];
    };

    Cache.prototype.addInverseRelationshipsSync = function addInverseRelationshipsSync(relationships) {
        var _this2 = this;

        relationships.forEach(function (r) {
            var rels = _this2._inverseRelationships[r.relatedRecord.type].get(r.relatedRecord.id);
            rels = rels ? clone(rels) : [];
            rels.push(r);
            _this2._inverseRelationships[r.relatedRecord.type].set(r.relatedRecord.id, rels);
        });
    };

    Cache.prototype.removeInverseRelationshipsSync = function removeInverseRelationshipsSync(relationships) {
        var _this3 = this;

        relationships.forEach(function (r) {
            var rels = _this3._inverseRelationships[r.relatedRecord.type].get(r.relatedRecord.id);
            if (rels) {
                var newRels = rels.filter(function (rel) {
                    return !(equalRecordIdentities(rel.record, r.record) && rel.relationship === r.relationship);
                });
                _this3._inverseRelationships[r.relatedRecord.type].set(r.relatedRecord.id, newRels);
            }
        });
    };
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


    Cache.prototype.reset = function reset(base) {
        var _this4 = this;

        this._records = {};
        Object.keys(this._schema.models).forEach(function (type) {
            var baseRecords = base && base._records[type];
            _this4._records[type] = new ImmutableMap(baseRecords);
        });
        this._resetInverseRelationships(base);
        this._processors.forEach(function (processor) {
            return processor.reset(base);
        });
        this.emit('reset');
    };
    /**
     * Upgrade the cache based on the current state of the schema.
     */


    Cache.prototype.upgrade = function upgrade() {
        var _this5 = this;

        Object.keys(this._schema.models).forEach(function (type) {
            if (!_this5._records[type]) {
                _this5._records[type] = new ImmutableMap();
            }
        });
        this._resetInverseRelationships();
        this._processors.forEach(function (processor) {
            return processor.upgrade();
        });
    };
    /////////////////////////////////////////////////////////////////////////////
    // Protected methods
    /////////////////////////////////////////////////////////////////////////////


    Cache.prototype._resetInverseRelationships = function _resetInverseRelationships(base) {
        var inverseRelationships = {};
        Object.keys(this._schema.models).forEach(function (type) {
            var baseRelationships = base && base._inverseRelationships[type];
            inverseRelationships[type] = new ImmutableMap(baseRelationships);
        });
        this._inverseRelationships = inverseRelationships;
    };

    return Cache;
}(SyncRecordCache);

export default Cache;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNhY2hlLmpzIl0sIm5hbWVzIjpbImNsb25lIiwiZXF1YWxSZWNvcmRJZGVudGl0aWVzIiwiU3luY1JlY29yZENhY2hlIiwiSW1tdXRhYmxlTWFwIiwiQ2FjaGUiLCJzZXR0aW5ncyIsInJlc2V0IiwiYmFzZSIsImdldFJlY29yZFN5bmMiLCJpZGVudGl0eSIsIl9yZWNvcmRzIiwidHlwZSIsImdldCIsImlkIiwiZ2V0UmVjb3Jkc1N5bmMiLCJ0eXBlT3JJZGVudGl0aWVzIiwiQXJyYXkiLCJpc0FycmF5IiwicmVjb3JkcyIsImlkZW50aXRpZXMiLCJyZWNvcmQiLCJwdXNoIiwiZnJvbSIsInZhbHVlcyIsInNldFJlY29yZFN5bmMiLCJzZXQiLCJzZXRSZWNvcmRzU3luYyIsInR5cGVkTWFwIiwic2V0TWFueSIsInJlbW92ZVJlY29yZFN5bmMiLCJyZWNvcmRJZGVudGl0eSIsInJlY29yZE1hcCIsInJlbW92ZSIsInJlbW92ZVJlY29yZHNTeW5jIiwicmVjb3JkSWRlbnRpdGllcyIsInR5cGVkSWRzIiwicmVtb3ZlTWFueSIsImdldEludmVyc2VSZWxhdGlvbnNoaXBzU3luYyIsIl9pbnZlcnNlUmVsYXRpb25zaGlwcyIsImFkZEludmVyc2VSZWxhdGlvbnNoaXBzU3luYyIsInJlbGF0aW9uc2hpcHMiLCJmb3JFYWNoIiwicmVscyIsInIiLCJyZWxhdGVkUmVjb3JkIiwicmVtb3ZlSW52ZXJzZVJlbGF0aW9uc2hpcHNTeW5jIiwibmV3UmVscyIsImZpbHRlciIsInJlbCIsInJlbGF0aW9uc2hpcCIsIk9iamVjdCIsImtleXMiLCJfc2NoZW1hIiwibW9kZWxzIiwiYmFzZVJlY29yZHMiLCJfcmVzZXRJbnZlcnNlUmVsYXRpb25zaGlwcyIsIl9wcm9jZXNzb3JzIiwicHJvY2Vzc29yIiwiZW1pdCIsInVwZ3JhZGUiLCJpbnZlcnNlUmVsYXRpb25zaGlwcyIsImJhc2VSZWxhdGlvbnNoaXBzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBO0FBQ0EsU0FBU0Es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SixTQUpEO0FBS0EsYUFBS29ELDBCQUFMO0FBQ0EsYUFBS0MsV0FBTCxDQUFpQmYsT0FBakIsQ0FBeUI7QUFBQSxtQkFBYWdCLFVBQVVFLE9BQVYsRUFBYjtBQUFBLFNBQXpCO0FBQ0gsSztBQUNEO0FBQ0E7QUFDQTs7O29CQUNBSiwwQix1Q0FBMkJoRCxJLEVBQU07QUFDN0IsWUFBTXFELHVCQUF1QixFQUE3QjtBQUNBVixlQUFPQyxJQUFQLENBQVksS0FBS0MsT0FBTCxDQUFhQyxNQUF6QixFQUFpQ1osT0FBakMsQ0FBeUMsZ0JBQVE7QUFDN0MsZ0JBQUlvQixvQkFBb0J0RCxRQUFRQSxLQUFLK0IscUJBQUwsQ0FBMkIzQixJQUEzQixDQUFoQztBQUNBaUQsaUNBQXFCakQsSUFBckIsSUFBNkIsSUFBSVIsWUFBSixDQUFpQjBELGlCQUFqQixDQUE3QjtBQUNILFNBSEQ7QUFJQSxhQUFLdkIscUJBQUwsR0FBNkJzQixvQkFBN0I7QUFDSCxLOzs7RUE3SDhCMUQsZTs7ZUFBZEUsSyIsImZpbGUiOiJjYWNoZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIHZhbGlkLWpzZG9jICovXG5pbXBvcnQgeyBjbG9uZSB9IGZyb20gJ0BvcmJpdC91dGlscyc7XG5pbXBvcnQgeyBlcXVhbFJlY29yZElkZW50aXRpZXMgfSBmcm9tICdAb3JiaXQvZGF0YSc7XG5pbXBvcnQgeyBTeW5jUmVjb3JkQ2FjaGUgfSBmcm9tICdAb3JiaXQvcmVjb3JkLWNhY2hlJztcbmltcG9ydCB7IEltbXV0YWJsZU1hcCB9IGZyb20gJ0BvcmJpdC9pbW11dGFibGUnO1xuLyoqXG4gKiBBIGNhY2hlIHVzZWQgdG8gYWNjZXNzIHJlY29yZHMgaW4gbWVtb3J5LlxuICpcbiAqIEJlY2F1c2UgZGF0YSBpcyBzdG9yZWQgaW4gaW1tdXRhYmxlIG1hcHMsIHRoaXMgdHlwZSBvZiBjYWNoZSBjYW4gYmUgZm9ya2VkXG4gKiBlZmZpY2llbnRseS5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ2FjaGUgZXh0ZW5kcyBTeW5jUmVjb3JkQ2FjaGUge1xuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzKSB7XG4gICAgICAgIHN1cGVyKHNldHRpbmdzKTtcbiAgICAgICAgdGhpcy5yZXNldChzZXR0aW5ncy5iYXNlKTtcbiAgICB9XG4gICAgZ2V0UmVjb3JkU3luYyhpZGVudGl0eSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcmVjb3Jkc1tpZGVudGl0eS50eXBlXS5nZXQoaWRlbnRpdHkuaWQpIHx8IG51bGw7XG4gICAgfVxuICAgIGdldFJlY29yZHNTeW5jKHR5cGVPcklkZW50aXRpZXMpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodHlwZU9ySWRlbnRpdGllcykpIHtcbiAgICAgICAgICAgIGNvbnN0IHJlY29yZHMgPSBbXTtcbiAgICAgICAgICAgIGNvbnN0IGlkZW50aXRpZXMgPSB0eXBlT3JJZGVudGl0aWVzO1xuICAgICAgICAgICAgZm9yIChsZXQgaWRlbnRpdHkgb2YgaWRlbnRpdGllcykge1xuICAgICAgICAgICAgICAgIGxldCByZWNvcmQgPSB0aGlzLmdldFJlY29yZFN5bmMoaWRlbnRpdHkpO1xuICAgICAgICAgICAgICAgIGlmIChyZWNvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVjb3Jkcy5wdXNoKHJlY29yZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlY29yZHM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCB0eXBlID0gdHlwZU9ySWRlbnRpdGllcztcbiAgICAgICAgICAgIHJldHVybiBBcnJheS5mcm9tKHRoaXMuX3JlY29yZHNbdHlwZV0udmFsdWVzKCkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHNldFJlY29yZFN5bmMocmVjb3JkKSB7XG4gICAgICAgIHRoaXMuX3JlY29yZHNbcmVjb3JkLnR5cGVdLnNldChyZWNvcmQuaWQsIHJlY29yZCk7XG4gICAgfVxuICAgIHNldFJlY29yZHNTeW5jKHJlY29yZHMpIHtcbiAgICAgICAgbGV0IHR5cGVkTWFwID0ge307XG4gICAgICAgIGZvciAobGV0IHJlY29yZCBvZiByZWNvcmRzKSB7XG4gICAgICAgICAgICB0eXBlZE1hcFtyZWNvcmQudHlwZV0gPSB0eXBlZE1hcFtyZWNvcmQudHlwZV0gfHwgW107XG4gICAgICAgICAgICB0eXBlZE1hcFtyZWNvcmQudHlwZV0ucHVzaChbcmVjb3JkLmlkLCByZWNvcmRdKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCB0eXBlIGluIHR5cGVkTWFwKSB7XG4gICAgICAgICAgICB0aGlzLl9yZWNvcmRzW3R5cGVdLnNldE1hbnkodHlwZWRNYXBbdHlwZV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJlbW92ZVJlY29yZFN5bmMocmVjb3JkSWRlbnRpdHkpIHtcbiAgICAgICAgY29uc3QgcmVjb3JkTWFwID0gdGhpcy5fcmVjb3Jkc1tyZWNvcmRJZGVudGl0eS50eXBlXTtcbiAgICAgICAgY29uc3QgcmVjb3JkID0gcmVjb3JkTWFwLmdldChyZWNvcmRJZGVudGl0eS5pZCk7XG4gICAgICAgIGlmIChyZWNvcmQpIHtcbiAgICAgICAgICAgIHJlY29yZE1hcC5yZW1vdmUocmVjb3JkSWRlbnRpdHkuaWQpO1xuICAgICAgICAgICAgcmV0dXJuIHJlY29yZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJlbW92ZVJlY29yZHNTeW5jKHJlY29yZElkZW50aXRpZXMpIHtcbiAgICAgICAgY29uc3QgcmVjb3JkcyA9IFtdO1xuICAgICAgICBjb25zdCB0eXBlZElkcyA9IHt9O1xuICAgICAgICBmb3IgKGxldCByZWNvcmRJZGVudGl0eSBvZiByZWNvcmRJZGVudGl0aWVzKSB7XG4gICAgICAgICAgICBsZXQgcmVjb3JkID0gdGhpcy5nZXRSZWNvcmRTeW5jKHJlY29yZElkZW50aXR5KTtcbiAgICAgICAgICAgIGlmIChyZWNvcmQpIHtcbiAgICAgICAgICAgICAgICByZWNvcmRzLnB1c2gocmVjb3JkKTtcbiAgICAgICAgICAgICAgICB0eXBlZElkc1tyZWNvcmQudHlwZV0gPSB0eXBlZElkc1tyZWNvcmQudHlwZV0gfHwgW107XG4gICAgICAgICAgICAgICAgdHlwZWRJZHNbcmVjb3JkLnR5cGVdLnB1c2gocmVjb3JkSWRlbnRpdHkuaWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IHR5cGUgaW4gdHlwZWRJZHMpIHtcbiAgICAgICAgICAgIHRoaXMuX3JlY29yZHNbdHlwZV0ucmVtb3ZlTWFueSh0eXBlZElkc1t0eXBlXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlY29yZHM7XG4gICAgfVxuICAgIGdldEludmVyc2VSZWxhdGlvbnNoaXBzU3luYyhyZWNvcmRJZGVudGl0eSkge1xuICAgICAgICByZXR1cm4gdGhpcy5faW52ZXJzZVJlbGF0aW9uc2hpcHNbcmVjb3JkSWRlbnRpdHkudHlwZV0uZ2V0KHJlY29yZElkZW50aXR5LmlkKSB8fCBbXTtcbiAgICB9XG4gICAgYWRkSW52ZXJzZVJlbGF0aW9uc2hpcHNTeW5jKHJlbGF0aW9uc2hpcHMpIHtcbiAgICAgICAgcmVsYXRpb25zaGlwcy5mb3JFYWNoKHIgPT4ge1xuICAgICAgICAgICAgbGV0IHJlbHMgPSB0aGlzLl9pbnZlcnNlUmVsYXRpb25zaGlwc1tyLnJlbGF0ZWRSZWNvcmQudHlwZV0uZ2V0KHIucmVsYXRlZFJlY29yZC5pZCk7XG4gICAgICAgICAgICByZWxzID0gcmVscyA/IGNsb25lKHJlbHMpIDogW107XG4gICAgICAgICAgICByZWxzLnB1c2gocik7XG4gICAgICAgICAgICB0aGlzLl9pbnZlcnNlUmVsYXRpb25zaGlwc1tyLnJlbGF0ZWRSZWNvcmQudHlwZV0uc2V0KHIucmVsYXRlZFJlY29yZC5pZCwgcmVscyk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZW1vdmVJbnZlcnNlUmVsYXRpb25zaGlwc1N5bmMocmVsYXRpb25zaGlwcykge1xuICAgICAgICByZWxhdGlvbnNoaXBzLmZvckVhY2gociA9PiB7XG4gICAgICAgICAgICBsZXQgcmVscyA9IHRoaXMuX2ludmVyc2VSZWxhdGlvbnNoaXBzW3IucmVsYXRlZFJlY29yZC50eXBlXS5nZXQoci5yZWxhdGVkUmVjb3JkLmlkKTtcbiAgICAgICAgICAgIGlmIChyZWxzKSB7XG4gICAgICAgICAgICAgICAgbGV0IG5ld1JlbHMgPSByZWxzLmZpbHRlcihyZWwgPT4gIShlcXVhbFJlY29yZElkZW50aXRpZXMocmVsLnJlY29yZCwgci5yZWNvcmQpICYmIHJlbC5yZWxhdGlvbnNoaXAgPT09IHIucmVsYXRpb25zaGlwKSk7XG4gICAgICAgICAgICAgICAgdGhpcy5faW52ZXJzZVJlbGF0aW9uc2hpcHNbci5yZWxhdGVkUmVjb3JkLnR5cGVdLnNldChyLnJlbGF0ZWRSZWNvcmQuaWQsIG5ld1JlbHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmVzZXRzIHRoZSBjYWNoZSdzIHN0YXRlIHRvIGJlIGVpdGhlciBlbXB0eSBvciB0byBtYXRjaCB0aGUgc3RhdGUgb2ZcbiAgICAgKiBhbm90aGVyIGNhY2hlLlxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGAgamF2YXNjcmlwdFxuICAgICAqIGNhY2hlLnJlc2V0KCk7IC8vIGVtcHRpZXMgY2FjaGVcbiAgICAgKiBjYWNoZS5yZXNldChjYWNoZTIpOyAvLyBjbG9uZXMgdGhlIHN0YXRlIG9mIGNhY2hlMlxuICAgICAqIGBgYFxuICAgICAqL1xuICAgIHJlc2V0KGJhc2UpIHtcbiAgICAgICAgdGhpcy5fcmVjb3JkcyA9IHt9O1xuICAgICAgICBPYmplY3Qua2V5cyh0aGlzLl9zY2hlbWEubW9kZWxzKS5mb3JFYWNoKHR5cGUgPT4ge1xuICAgICAgICAgICAgbGV0IGJhc2VSZWNvcmRzID0gYmFzZSAmJiBiYXNlLl9yZWNvcmRzW3R5cGVdO1xuICAgICAgICAgICAgdGhpcy5fcmVjb3Jkc1t0eXBlXSA9IG5ldyBJbW11dGFibGVNYXAoYmFzZVJlY29yZHMpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5fcmVzZXRJbnZlcnNlUmVsYXRpb25zaGlwcyhiYXNlKTtcbiAgICAgICAgdGhpcy5fcHJvY2Vzc29ycy5mb3JFYWNoKHByb2Nlc3NvciA9PiBwcm9jZXNzb3IucmVzZXQoYmFzZSkpO1xuICAgICAgICB0aGlzLmVtaXQoJ3Jlc2V0Jyk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFVwZ3JhZGUgdGhlIGNhY2hlIGJhc2VkIG9uIHRoZSBjdXJyZW50IHN0YXRlIG9mIHRoZSBzY2hlbWEuXG4gICAgICovXG4gICAgdXBncmFkZSgpIHtcbiAgICAgICAgT2JqZWN0LmtleXModGhpcy5fc2NoZW1hLm1vZGVscykuZm9yRWFjaCh0eXBlID0+IHtcbiAgICAgICAgICAgIGlmICghdGhpcy5fcmVjb3Jkc1t0eXBlXSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlY29yZHNbdHlwZV0gPSBuZXcgSW1tdXRhYmxlTWFwKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLl9yZXNldEludmVyc2VSZWxhdGlvbnNoaXBzKCk7XG4gICAgICAgIHRoaXMuX3Byb2Nlc3NvcnMuZm9yRWFjaChwcm9jZXNzb3IgPT4gcHJvY2Vzc29yLnVwZ3JhZGUoKSk7XG4gICAgfVxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgLy8gUHJvdGVjdGVkIG1ldGhvZHNcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIF9yZXNldEludmVyc2VSZWxhdGlvbnNoaXBzKGJhc2UpIHtcbiAgICAgICAgY29uc3QgaW52ZXJzZVJlbGF0aW9uc2hpcHMgPSB7fTtcbiAgICAgICAgT2JqZWN0LmtleXModGhpcy5fc2NoZW1hLm1vZGVscykuZm9yRWFjaCh0eXBlID0+IHtcbiAgICAgICAgICAgIGxldCBiYXNlUmVsYXRpb25zaGlwcyA9IGJhc2UgJiYgYmFzZS5faW52ZXJzZVJlbGF0aW9uc2hpcHNbdHlwZV07XG4gICAgICAgICAgICBpbnZlcnNlUmVsYXRpb25zaGlwc1t0eXBlXSA9IG5ldyBJbW11dGFibGVNYXAoYmFzZVJlbGF0aW9uc2hpcHMpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5faW52ZXJzZVJlbGF0aW9uc2hpcHMgPSBpbnZlcnNlUmVsYXRpb25zaGlwcztcbiAgICB9XG59Il19