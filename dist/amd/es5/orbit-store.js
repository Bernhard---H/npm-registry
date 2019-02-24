define('@orbit/store', ['exports', '@orbit/data', '@orbit/utils', '@orbit/record-cache', '@orbit/immutable'], function (exports, Orbit, _orbit_utils, _orbit_recordCache, _orbit_immutable) { 'use strict';

var Orbit__default = 'default' in Orbit ? Orbit['default'] : Orbit;

function _defaults$1(obj, defaults) { var keys = Object.getOwnPropertyNames(defaults); for (var i = 0; i < keys.length; i++) { var key = keys[i]; var value = Object.getOwnPropertyDescriptor(defaults, key); if (value && value.configurable && obj[key] === undefined) { Object.defineProperty(obj, key, value); } } return obj; }

function _classCallCheck$1(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn$1(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits$1(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : _defaults$1(subClass, superClass); }

/* eslint-disable valid-jsdoc */
/**
 * A cache used to access records in memory.
 *
 * Because data is stored in immutable maps, this type of cache can be forked
 * efficiently.
 */

var Cache = function (_SyncRecordCache) {
    _inherits$1(Cache, _SyncRecordCache);

    function Cache(settings) {
        _classCallCheck$1(this, Cache);

        var _this = _possibleConstructorReturn$1(this, _SyncRecordCache.call(this, settings));

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
            rels = rels ? _orbit_utils.clone(rels) : [];
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
                    return !(Orbit.equalRecordIdentities(rel.record, r.record) && rel.relationship === r.relationship);
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
            _this4._records[type] = new _orbit_immutable.ImmutableMap(baseRecords);
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
                _this5._records[type] = new _orbit_immutable.ImmutableMap();
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
            inverseRelationships[type] = new _orbit_immutable.ImmutableMap(baseRelationships);
        });
        this._inverseRelationships = inverseRelationships;
    };

    return Cache;
}(_orbit_recordCache.SyncRecordCache);

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _defaults(obj, defaults) { var keys = Object.getOwnPropertyNames(defaults); for (var i = 0; i < keys.length; i++) { var key = keys[i]; var value = Object.getOwnPropertyDescriptor(defaults, key); if (value && value.configurable && obj[key] === undefined) { Object.defineProperty(obj, key, value); } } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : _defaults(subClass, superClass); }

var __decorate = undefined && undefined.__decorate || function (decorators, target, key, desc) {
    var c = arguments.length,
        r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc,
        d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);else for (var i = decorators.length - 1; i >= 0; i--) {
        if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    }return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var Store_1;
var assert = Orbit__default.assert;

var Store = Store_1 = function (_Source) {
    _inherits(Store, _Source);

    function Store() {
        var settings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        _classCallCheck(this, Store);

        assert('Store\'s `schema` must be specified in `settings.schema` constructor argument', !!settings.schema);
        var keyMap = settings.keyMap;
        var schema = settings.schema;
        settings.name = settings.name || 'store';

        var _this = _possibleConstructorReturn(this, _Source.call(this, settings));

        _this._transforms = {};
        _this._transformInverses = {};
        _this.transformLog.on('clear', _this._logCleared.bind(_this));
        _this.transformLog.on('truncate', _this._logTruncated.bind(_this));
        _this.transformLog.on('rollback', _this._logRolledback.bind(_this));
        var cacheSettings = settings.cacheSettings || {};
        cacheSettings.schema = schema;
        cacheSettings.keyMap = keyMap;
        cacheSettings.queryBuilder = cacheSettings.queryBuilder || _this.queryBuilder;
        cacheSettings.transformBuilder = cacheSettings.transformBuilder || _this.transformBuilder;
        if (settings.base) {
            _this._base = settings.base;
            _this._forkPoint = _this._base.transformLog.head;
            cacheSettings.base = _this._base.cache;
        }
        _this._cache = new Cache(cacheSettings);
        return _this;
    }

    Store.prototype.upgrade = function upgrade() {
        this._cache.upgrade();
        return Promise.resolve();
    };
    /////////////////////////////////////////////////////////////////////////////
    // Syncable interface implementation
    /////////////////////////////////////////////////////////////////////////////


    Store.prototype._sync = async function _sync(transform) {
        this._applyTransform(transform);
    };
    /////////////////////////////////////////////////////////////////////////////
    // Updatable interface implementation
    /////////////////////////////////////////////////////////////////////////////


    Store.prototype._update = async function _update(transform) {
        var results = this._applyTransform(transform);
        return results.length === 1 ? results[0] : results;
    };
    /////////////////////////////////////////////////////////////////////////////
    // Queryable interface implementation
    /////////////////////////////////////////////////////////////////////////////


    Store.prototype._query = async function _query(query, hints) {
        if (hints && hints.data) {
            if (Array.isArray(hints.data)) {
                return this._cache.query(function (q) {
                    return q.findRecords(hints.data);
                });
            } else if (hints.data) {
                return this._cache.query(function (q) {
                    return q.findRecord(hints.data);
                });
            }
        }
        return this._cache.query(query);
    };
    /////////////////////////////////////////////////////////////////////////////
    // Public methods
    /////////////////////////////////////////////////////////////////////////////
    /**
     Create a clone, or "fork", from a "base" store.
        The forked store will have the same `schema` and `keyMap` as its base store.
     The forked store's cache will start with the same immutable document as
     the base store. Its contents and log will evolve independently.
        @method fork
     @returns {Store} The forked store.
    */


    Store.prototype.fork = function fork() {
        var settings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        settings.schema = this._schema;
        settings.cacheSettings = settings.cacheSettings || {};
        settings.keyMap = this._keyMap;
        settings.queryBuilder = this.queryBuilder;
        settings.transformBuilder = this.transformBuilder;
        settings.base = this;
        return new Store_1(settings);
    };
    /**
     Merge transforms from a forked store back into a base store.
        By default, all of the operations from all of the transforms in the forked
     store's history will be reduced into a single transform. A subset of
     operations can be selected by specifying the `sinceTransformId` option.
        The `coalesce` option controls whether operations are coalesced into a
     minimal equivalent set before being reduced into a transform.
        @method merge
     @param {Store} forkedStore - The store to merge.
     @param {Object}  [options] settings
     @param {Boolean} [options.coalesce = true] Should operations be coalesced into a minimal equivalent set?
     @param {String}  [options.sinceTransformId = null] Select only transforms since the specified ID.
     @returns {Promise} The result of calling `update()` with the forked transforms.
    */


    Store.prototype.merge = function merge(forkedStore) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        var transforms = void 0;
        if (options.sinceTransformId) {
            transforms = forkedStore.transformsSince(options.sinceTransformId);
        } else {
            transforms = forkedStore.allTransforms();
        }
        var reducedTransform = void 0;
        var ops = [];
        transforms.forEach(function (t) {
            Array.prototype.push.apply(ops, t.operations);
        });
        if (options.coalesce !== false) {
            ops = Orbit.coalesceRecordOperations(ops);
        }
        reducedTransform = Orbit.buildTransform(ops, options.transformOptions);
        return this.update(reducedTransform);
    };
    /**
     * This rebase method works similarly to a git rebase:
     *
     * After a store is forked, there is a parent- and a child-store.
     * Both may be updated with transforms.
     * If after some updates on both stores `childStore.rebase()` is called,
     * the result on the child store will look like,
     * as if all updates to the parent store were added first,
     * followed by those made in the child store.
     * This means that updates in the child store have a tendency of winning.
     */


    Store.prototype.rebase = function rebase() {
        var _this2 = this;

        var base = this._base;
        var forkPoint = this._forkPoint;
        assert('A `base` store must be defined for `rebase` to work', !!base);
        //assert('A `forkPoint` must be defined for `rebase` to work', !!forkPoint);
        var baseTransforms = void 0;
        if (forkPoint === undefined) {
            // store was empty at fork point
            baseTransforms = base.allTransforms();
        } else {
            baseTransforms = base.transformsSince(forkPoint);
        }
        if (baseTransforms.length > 0) {
            var localTransforms = this.allTransforms();
            localTransforms.reverse().forEach(function (transform) {
                var inverseOperations = _this2._transformInverses[transform.id];
                if (inverseOperations) {
                    _this2.cache.patch(inverseOperations);
                }
                _this2._clearTransformFromHistory(transform.id);
            });
            baseTransforms.forEach(function (transform) {
                return _this2._applyTransform(transform);
            });
            localTransforms.forEach(function (transform) {
                return _this2._applyTransform(transform);
            });
            this._forkPoint = base.transformLog.head;
        }
    };
    /**
     Rolls back the Store to a particular transformId
        @method rollback
     @param {string} transformId - The ID of the transform to roll back to
     @param {number} relativePosition - A positive or negative integer to specify a position relative to `transformId`
     @returns {undefined}
    */


    Store.prototype.rollback = function rollback(transformId) {
        var relativePosition = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

        return this.transformLog.rollback(transformId, relativePosition);
    };
    /**
     Returns all transforms since a particular `transformId`.
        @method transformsSince
     @param {string} transformId - The ID of the transform to start with.
     @returns {Array} Array of transforms.
    */


    Store.prototype.transformsSince = function transformsSince(transformId) {
        var _this3 = this;

        return this.transformLog.after(transformId).map(function (id) {
            return _this3._transforms[id];
        });
    };
    /**
     Returns all tracked transforms.
        @method allTransforms
     @returns {Array} Array of transforms.
    */


    Store.prototype.allTransforms = function allTransforms() {
        var _this4 = this;

        return this.transformLog.entries.map(function (id) {
            return _this4._transforms[id];
        });
    };

    Store.prototype.getTransform = function getTransform(transformId) {
        return this._transforms[transformId];
    };

    Store.prototype.getInverseOperations = function getInverseOperations(transformId) {
        return this._transformInverses[transformId];
    };
    /////////////////////////////////////////////////////////////////////////////
    // Protected methods
    /////////////////////////////////////////////////////////////////////////////


    Store.prototype._applyTransform = function _applyTransform(transform) {
        var result = this.cache.patch(transform.operations);
        this._transforms[transform.id] = transform;
        this._transformInverses[transform.id] = result.inverse;
        return result.data;
    };

    Store.prototype._clearTransformFromHistory = function _clearTransformFromHistory(transformId) {
        delete this._transforms[transformId];
        delete this._transformInverses[transformId];
    };

    Store.prototype._logCleared = function _logCleared() {
        this._transforms = {};
        this._transformInverses = {};
    };

    Store.prototype._logTruncated = function _logTruncated(transformId, relativePosition, removed) {
        var _this5 = this;

        removed.forEach(function (id) {
            return _this5._clearTransformFromHistory(id);
        });
    };

    Store.prototype._logRolledback = function _logRolledback(transformId, relativePosition, removed) {
        var _this6 = this;

        removed.reverse().forEach(function (id) {
            var inverseOperations = _this6._transformInverses[id];
            if (inverseOperations) {
                _this6.cache.patch(inverseOperations);
            }
            _this6._clearTransformFromHistory(id);
        });
    };

    _createClass(Store, [{
        key: "cache",
        get: function () {
            return this._cache;
        }
    }, {
        key: "base",
        get: function () {
            return this._base;
        }
    }, {
        key: "forkPoint",
        get: function () {
            return this._forkPoint;
        }
    }]);

    return Store;
}(Orbit.Source);
Store = Store_1 = __decorate([Orbit.syncable, Orbit.queryable, Orbit.updatable], Store);
var Store$1 = Store;

exports['default'] = Store$1;
exports.Cache = Cache;
exports.OperationProcessor = _orbit_recordCache.SyncOperationProcessor;
exports.CacheIntegrityProcessor = _orbit_recordCache.SyncCacheIntegrityProcessor;
exports.SchemaConsistencyProcessor = _orbit_recordCache.SyncSchemaConsistencyProcessor;
exports.SchemaValidationProcessor = _orbit_recordCache.SyncSchemaValidationProcessor;

Object.defineProperty(exports, '__esModule', { value: true });

});
