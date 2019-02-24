"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _utils = require("@orbit/utils");

var _data = require("@orbit/data");

var _recordCache = require("@orbit/record-cache");

var _immutable = require("@orbit/immutable");

function _defaults(obj, defaults) {
    var keys = Object.getOwnPropertyNames(defaults);for (var i = 0; i < keys.length; i++) {
        var key = keys[i];var value = Object.getOwnPropertyDescriptor(defaults, key);if (value && value.configurable && obj[key] === undefined) {
            Object.defineProperty(obj, key, value);
        }
    }return obj;
}

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}

function _possibleConstructorReturn(self, call) {
    if (!self) {
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : _defaults(subClass, superClass);
}

/* eslint-disable valid-jsdoc */

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
            rels = rels ? (0, _utils.clone)(rels) : [];
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
                    return !((0, _data.equalRecordIdentities)(rel.record, r.record) && rel.relationship === r.relationship);
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
            _this4._records[type] = new _immutable.ImmutableMap(baseRecords);
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
                _this5._records[type] = new _immutable.ImmutableMap();
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
            inverseRelationships[type] = new _immutable.ImmutableMap(baseRelationships);
        });
        this._inverseRelationships = inverseRelationships;
    };

    return Cache;
}(_recordCache.SyncRecordCache);

exports.default = Cache;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNhY2hlLmpzIl0sIm5hbWVzIjpbIkNhY2hlIiwiU3luY1JlY29yZENhY2hlIiwic2V0dGluZ3MiLCJnZXRSZWNvcmRTeW5jIiwiaWRlbnRpdHkiLCJnZXRSZWNvcmRzU3luYyIsInR5cGVPcklkZW50aXRpZXMiLCJBcnJheSIsInJlY29yZHMiLCJpZGVudGl0aWVzIiwicmVjb3JkIiwidHlwZSIsInNldFJlY29yZFN5bmMiLCJzZXRSZWNvcmRzU3luYyIsInR5cGVkTWFwIiwicmVtb3ZlUmVjb3JkU3luYyIsInJlY29yZElkZW50aXR5IiwicmVjb3JkTWFwIiwicmVtb3ZlUmVjb3Jkc1N5bmMiLCJyZWNvcmRJZGVudGl0aWVzIiwidHlwZWRJZHMiLCJnZXRJbnZlcnNlUmVsYXRpb25zaGlwc1N5bmMiLCJhZGRJbnZlcnNlUmVsYXRpb25zaGlwc1N5bmMiLCJyZWxhdGlvbnNoaXBzIiwicmVscyIsInIiLCJjbG9uZSIsInJlbW92ZUludmVyc2VSZWxhdGlvbnNoaXBzU3luYyIsIm5ld1JlbHMiLCJlcXVhbFJlY29yZElkZW50aXRpZXMiLCJyZWwiLCJyZXNldCIsImJhc2UiLCJPYmplY3QiLCJiYXNlUmVjb3JkcyIsInByb2Nlc3NvciIsInVwZ3JhZGUiLCJfcmVzZXRJbnZlcnNlUmVsYXRpb25zaGlwcyIsImludmVyc2VSZWxhdGlvbnNoaXBzIiwiYmFzZVJlbGF0aW9uc2hpcHMiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUNBOztBQUNBOztBQUNBOztBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBSkE7O0FBS0E7Ozs7Ozs7SUFNcUJBLFE7OztBQUNqQixhQUFBLEtBQUEsQ0FBQSxRQUFBLEVBQXNCO0FBQUEsd0JBQUEsSUFBQSxFQUFBLEtBQUE7O0FBQUEsWUFBQSxRQUFBLDJCQUFBLElBQUEsRUFDbEIsaUJBQUEsSUFBQSxDQUFBLElBQUEsRUFEa0IsUUFDbEIsQ0FEa0IsQ0FBQTs7QUFFbEIsY0FBQSxLQUFBLENBQVdFLFNBQVgsSUFBQTtB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aEM7QUFDQU0saUNBQUFBLElBQUFBLElBQTZCLElBQUEsdUJBQUEsQ0FBN0JBLGlCQUE2QixDQUE3QkE7QUFGSkwsU0FBQUE7QUFJQSxhQUFBLHFCQUFBLEdBQUEsb0JBQUE7Ozs7RUE1SDJCaEMsNEI7O2tCQUFkRCxLIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgdmFsaWQtanNkb2MgKi9cbmltcG9ydCB7IGNsb25lIH0gZnJvbSAnQG9yYml0L3V0aWxzJztcbmltcG9ydCB7IGVxdWFsUmVjb3JkSWRlbnRpdGllcyB9IGZyb20gJ0BvcmJpdC9kYXRhJztcbmltcG9ydCB7IFN5bmNSZWNvcmRDYWNoZSB9IGZyb20gJ0BvcmJpdC9yZWNvcmQtY2FjaGUnO1xuaW1wb3J0IHsgSW1tdXRhYmxlTWFwIH0gZnJvbSAnQG9yYml0L2ltbXV0YWJsZSc7XG4vKipcbiAqIEEgY2FjaGUgdXNlZCB0byBhY2Nlc3MgcmVjb3JkcyBpbiBtZW1vcnkuXG4gKlxuICogQmVjYXVzZSBkYXRhIGlzIHN0b3JlZCBpbiBpbW11dGFibGUgbWFwcywgdGhpcyB0eXBlIG9mIGNhY2hlIGNhbiBiZSBmb3JrZWRcbiAqIGVmZmljaWVudGx5LlxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDYWNoZSBleHRlbmRzIFN5bmNSZWNvcmRDYWNoZSB7XG4gICAgY29uc3RydWN0b3Ioc2V0dGluZ3MpIHtcbiAgICAgICAgc3VwZXIoc2V0dGluZ3MpO1xuICAgICAgICB0aGlzLnJlc2V0KHNldHRpbmdzLmJhc2UpO1xuICAgIH1cbiAgICBnZXRSZWNvcmRTeW5jKGlkZW50aXR5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yZWNvcmRzW2lkZW50aXR5LnR5cGVdLmdldChpZGVudGl0eS5pZCkgfHwgbnVsbDtcbiAgICB9XG4gICAgZ2V0UmVjb3Jkc1N5bmModHlwZU9ySWRlbnRpdGllcykge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh0eXBlT3JJZGVudGl0aWVzKSkge1xuICAgICAgICAgICAgY29uc3QgcmVjb3JkcyA9IFtdO1xuICAgICAgICAgICAgY29uc3QgaWRlbnRpdGllcyA9IHR5cGVPcklkZW50aXRpZXM7XG4gICAgICAgICAgICBmb3IgKGxldCBpZGVudGl0eSBvZiBpZGVudGl0aWVzKSB7XG4gICAgICAgICAgICAgICAgbGV0IHJlY29yZCA9IHRoaXMuZ2V0UmVjb3JkU3luYyhpZGVudGl0eSk7XG4gICAgICAgICAgICAgICAgaWYgKHJlY29yZCkge1xuICAgICAgICAgICAgICAgICAgICByZWNvcmRzLnB1c2gocmVjb3JkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVjb3JkcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IHR5cGUgPSB0eXBlT3JJZGVudGl0aWVzO1xuICAgICAgICAgICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5fcmVjb3Jkc1t0eXBlXS52YWx1ZXMoKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgc2V0UmVjb3JkU3luYyhyZWNvcmQpIHtcbiAgICAgICAgdGhpcy5fcmVjb3Jkc1tyZWNvcmQudHlwZV0uc2V0KHJlY29yZC5pZCwgcmVjb3JkKTtcbiAgICB9XG4gICAgc2V0UmVjb3Jkc1N5bmMocmVjb3Jkcykge1xuICAgICAgICBsZXQgdHlwZWRNYXAgPSB7fTtcbiAgICAgICAgZm9yIChsZXQgcmVjb3JkIG9mIHJlY29yZHMpIHtcbiAgICAgICAgICAgIHR5cGVkTWFwW3JlY29yZC50eXBlXSA9IHR5cGVkTWFwW3JlY29yZC50eXBlXSB8fCBbXTtcbiAgICAgICAgICAgIHR5cGVkTWFwW3JlY29yZC50eXBlXS5wdXNoKFtyZWNvcmQuaWQsIHJlY29yZF0pO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IHR5cGUgaW4gdHlwZWRNYXApIHtcbiAgICAgICAgICAgIHRoaXMuX3JlY29yZHNbdHlwZV0uc2V0TWFueSh0eXBlZE1hcFt0eXBlXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmVtb3ZlUmVjb3JkU3luYyhyZWNvcmRJZGVudGl0eSkge1xuICAgICAgICBjb25zdCByZWNvcmRNYXAgPSB0aGlzLl9yZWNvcmRzW3JlY29yZElkZW50aXR5LnR5cGVdO1xuICAgICAgICBjb25zdCByZWNvcmQgPSByZWNvcmRNYXAuZ2V0KHJlY29yZElkZW50aXR5LmlkKTtcbiAgICAgICAgaWYgKHJlY29yZCkge1xuICAgICAgICAgICAgcmVjb3JkTWFwLnJlbW92ZShyZWNvcmRJZGVudGl0eS5pZCk7XG4gICAgICAgICAgICByZXR1cm4gcmVjb3JkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmVtb3ZlUmVjb3Jkc1N5bmMocmVjb3JkSWRlbnRpdGllcykge1xuICAgICAgICBjb25zdCByZWNvcmRzID0gW107XG4gICAgICAgIGNvbnN0IHR5cGVkSWRzID0ge307XG4gICAgICAgIGZvciAobGV0IHJlY29yZElkZW50aXR5IG9mIHJlY29yZElkZW50aXRpZXMpIHtcbiAgICAgICAgICAgIGxldCByZWNvcmQgPSB0aGlzLmdldFJlY29yZFN5bmMocmVjb3JkSWRlbnRpdHkpO1xuICAgICAgICAgICAgaWYgKHJlY29yZCkge1xuICAgICAgICAgICAgICAgIHJlY29yZHMucHVzaChyZWNvcmQpO1xuICAgICAgICAgICAgICAgIHR5cGVkSWRzW3JlY29yZC50eXBlXSA9IHR5cGVkSWRzW3JlY29yZC50eXBlXSB8fCBbXTtcbiAgICAgICAgICAgICAgICB0eXBlZElkc1tyZWNvcmQudHlwZV0ucHVzaChyZWNvcmRJZGVudGl0eS5pZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgdHlwZSBpbiB0eXBlZElkcykge1xuICAgICAgICAgICAgdGhpcy5fcmVjb3Jkc1t0eXBlXS5yZW1vdmVNYW55KHR5cGVkSWRzW3R5cGVdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVjb3JkcztcbiAgICB9XG4gICAgZ2V0SW52ZXJzZVJlbGF0aW9uc2hpcHNTeW5jKHJlY29yZElkZW50aXR5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbnZlcnNlUmVsYXRpb25zaGlwc1tyZWNvcmRJZGVudGl0eS50eXBlXS5nZXQocmVjb3JkSWRlbnRpdHkuaWQpIHx8IFtdO1xuICAgIH1cbiAgICBhZGRJbnZlcnNlUmVsYXRpb25zaGlwc1N5bmMocmVsYXRpb25zaGlwcykge1xuICAgICAgICByZWxhdGlvbnNoaXBzLmZvckVhY2gociA9PiB7XG4gICAgICAgICAgICBsZXQgcmVscyA9IHRoaXMuX2ludmVyc2VSZWxhdGlvbnNoaXBzW3IucmVsYXRlZFJlY29yZC50eXBlXS5nZXQoci5yZWxhdGVkUmVjb3JkLmlkKTtcbiAgICAgICAgICAgIHJlbHMgPSByZWxzID8gY2xvbmUocmVscykgOiBbXTtcbiAgICAgICAgICAgIHJlbHMucHVzaChyKTtcbiAgICAgICAgICAgIHRoaXMuX2ludmVyc2VSZWxhdGlvbnNoaXBzW3IucmVsYXRlZFJlY29yZC50eXBlXS5zZXQoci5yZWxhdGVkUmVjb3JkLmlkLCByZWxzKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJlbW92ZUludmVyc2VSZWxhdGlvbnNoaXBzU3luYyhyZWxhdGlvbnNoaXBzKSB7XG4gICAgICAgIHJlbGF0aW9uc2hpcHMuZm9yRWFjaChyID0+IHtcbiAgICAgICAgICAgIGxldCByZWxzID0gdGhpcy5faW52ZXJzZVJlbGF0aW9uc2hpcHNbci5yZWxhdGVkUmVjb3JkLnR5cGVdLmdldChyLnJlbGF0ZWRSZWNvcmQuaWQpO1xuICAgICAgICAgICAgaWYgKHJlbHMpIHtcbiAgICAgICAgICAgICAgICBsZXQgbmV3UmVscyA9IHJlbHMuZmlsdGVyKHJlbCA9PiAhKGVxdWFsUmVjb3JkSWRlbnRpdGllcyhyZWwucmVjb3JkLCByLnJlY29yZCkgJiYgcmVsLnJlbGF0aW9uc2hpcCA9PT0gci5yZWxhdGlvbnNoaXApKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9pbnZlcnNlUmVsYXRpb25zaGlwc1tyLnJlbGF0ZWRSZWNvcmQudHlwZV0uc2V0KHIucmVsYXRlZFJlY29yZC5pZCwgbmV3UmVscyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZXNldHMgdGhlIGNhY2hlJ3Mgc3RhdGUgdG8gYmUgZWl0aGVyIGVtcHR5IG9yIHRvIG1hdGNoIHRoZSBzdGF0ZSBvZlxuICAgICAqIGFub3RoZXIgY2FjaGUuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYCBqYXZhc2NyaXB0XG4gICAgICogY2FjaGUucmVzZXQoKTsgLy8gZW1wdGllcyBjYWNoZVxuICAgICAqIGNhY2hlLnJlc2V0KGNhY2hlMik7IC8vIGNsb25lcyB0aGUgc3RhdGUgb2YgY2FjaGUyXG4gICAgICogYGBgXG4gICAgICovXG4gICAgcmVzZXQoYmFzZSkge1xuICAgICAgICB0aGlzLl9yZWNvcmRzID0ge307XG4gICAgICAgIE9iamVjdC5rZXlzKHRoaXMuX3NjaGVtYS5tb2RlbHMpLmZvckVhY2godHlwZSA9PiB7XG4gICAgICAgICAgICBsZXQgYmFzZVJlY29yZHMgPSBiYXNlICYmIGJhc2UuX3JlY29yZHNbdHlwZV07XG4gICAgICAgICAgICB0aGlzLl9yZWNvcmRzW3R5cGVdID0gbmV3IEltbXV0YWJsZU1hcChiYXNlUmVjb3Jkcyk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLl9yZXNldEludmVyc2VSZWxhdGlvbnNoaXBzKGJhc2UpO1xuICAgICAgICB0aGlzLl9wcm9jZXNzb3JzLmZvckVhY2gocHJvY2Vzc29yID0+IHByb2Nlc3Nvci5yZXNldChiYXNlKSk7XG4gICAgICAgIHRoaXMuZW1pdCgncmVzZXQnKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogVXBncmFkZSB0aGUgY2FjaGUgYmFzZWQgb24gdGhlIGN1cnJlbnQgc3RhdGUgb2YgdGhlIHNjaGVtYS5cbiAgICAgKi9cbiAgICB1cGdyYWRlKCkge1xuICAgICAgICBPYmplY3Qua2V5cyh0aGlzLl9zY2hlbWEubW9kZWxzKS5mb3JFYWNoKHR5cGUgPT4ge1xuICAgICAgICAgICAgaWYgKCF0aGlzLl9yZWNvcmRzW3R5cGVdKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVjb3Jkc1t0eXBlXSA9IG5ldyBJbW11dGFibGVNYXAoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuX3Jlc2V0SW52ZXJzZVJlbGF0aW9uc2hpcHMoKTtcbiAgICAgICAgdGhpcy5fcHJvY2Vzc29ycy5mb3JFYWNoKHByb2Nlc3NvciA9PiBwcm9jZXNzb3IudXBncmFkZSgpKTtcbiAgICB9XG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBQcm90ZWN0ZWQgbWV0aG9kc1xuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgX3Jlc2V0SW52ZXJzZVJlbGF0aW9uc2hpcHMoYmFzZSkge1xuICAgICAgICBjb25zdCBpbnZlcnNlUmVsYXRpb25zaGlwcyA9IHt9O1xuICAgICAgICBPYmplY3Qua2V5cyh0aGlzLl9zY2hlbWEubW9kZWxzKS5mb3JFYWNoKHR5cGUgPT4ge1xuICAgICAgICAgICAgbGV0IGJhc2VSZWxhdGlvbnNoaXBzID0gYmFzZSAmJiBiYXNlLl9pbnZlcnNlUmVsYXRpb25zaGlwc1t0eXBlXTtcbiAgICAgICAgICAgIGludmVyc2VSZWxhdGlvbnNoaXBzW3R5cGVdID0gbmV3IEltbXV0YWJsZU1hcChiYXNlUmVsYXRpb25zaGlwcyk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLl9pbnZlcnNlUmVsYXRpb25zaGlwcyA9IGludmVyc2VSZWxhdGlvbnNoaXBzO1xuICAgIH1cbn0iXX0=