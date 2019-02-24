"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _data = require("@orbit/data");

var _data2 = _interopRequireDefault(_data);

var _cache = require("./cache");

var _cache2 = _interopRequireDefault(_cache);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var __decorate = undefined && undefined.__decorate || function (decorators, target, key, desc) {
    var c = arguments.length,
        r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc,
        d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var Store_1;

const { assert } = _data2.default;
let Store = Store_1 = class Store extends _data.Source {
    constructor(settings = {}) {
        assert('Store\'s `schema` must be specified in `settings.schema` constructor argument', !!settings.schema);
        let keyMap = settings.keyMap;
        let schema = settings.schema;
        settings.name = settings.name || 'store';
        super(settings);
        this._transforms = {};
        this._transformInverses = {};
        this.transformLog.on('clear', this._logCleared.bind(this));
        this.transformLog.on('truncate', this._logTruncated.bind(this));
        this.transformLog.on('rollback', this._logRolledback.bind(this));
        let cacheSettings = settings.cacheSettings || {};
        cacheSettings.schema = schema;
        cacheSettings.keyMap = keyMap;
        cacheSettings.queryBuilder = cacheSettings.queryBuilder || this.queryBuilder;
        cacheSettings.transformBuilder = cacheSettings.transformBuilder || this.transformBuilder;
        if (settings.base) {
            this._base = settings.base;
            this._forkPoint = this._base.transformLog.head;
            cacheSettings.base = this._base.cache;
        }
        this._cache = new _cache2.default(cacheSettings);
    }
    get cache() {
        return this._cache;
    }
    get base() {
        return this._base;
    }
    get forkPoint() {
        return this._forkPoint;
    }
    upgrade() {
        this._cache.upgrade();
        return Promise.resolve();
    }
    /////////////////////////////////////////////////////////////////////////////
    // Syncable interface implementation
    /////////////////////////////////////////////////////////////////////////////
    async _sync(transform) {
        this._applyTransform(transform);
    }
    /////////////////////////////////////////////////////////////////////////////
    // Updatable interface implementation
    /////////////////////////////////////////////////////////////////////////////
    async _update(transform) {
        let results = this._applyTransform(transform);
        return results.length === 1 ? results[0] : results;
    }
    /////////////////////////////////////////////////////////////////////////////
    // Queryable interface implementation
    /////////////////////////////////////////////////////////////////////////////
    async _query(query, hints) {
        if (hints && hints.data) {
            if (Array.isArray(hints.data)) {
                return this._cache.query(q => q.findRecords(hints.data));
            } else if (hints.data) {
                return this._cache.query(q => q.findRecord(hints.data));
            }
        }
        return this._cache.query(query);
    }
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
    fork(settings = {}) {
        settings.schema = this._schema;
        settings.cacheSettings = settings.cacheSettings || {};
        settings.keyMap = this._keyMap;
        settings.queryBuilder = this.queryBuilder;
        settings.transformBuilder = this.transformBuilder;
        settings.base = this;
        return new Store_1(settings);
    }
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
    merge(forkedStore, options = {}) {
        let transforms;
        if (options.sinceTransformId) {
            transforms = forkedStore.transformsSince(options.sinceTransformId);
        } else {
            transforms = forkedStore.allTransforms();
        }
        let reducedTransform;
        let ops = [];
        transforms.forEach(t => {
            Array.prototype.push.apply(ops, t.operations);
        });
        if (options.coalesce !== false) {
            ops = (0, _data.coalesceRecordOperations)(ops);
        }
        reducedTransform = (0, _data.buildTransform)(ops, options.transformOptions);
        return this.update(reducedTransform);
    }
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
    rebase() {
        let base = this._base;
        let forkPoint = this._forkPoint;
        assert('A `base` store must be defined for `rebase` to work', !!base);
        //assert('A `forkPoint` must be defined for `rebase` to work', !!forkPoint);
        let baseTransforms;
        if (forkPoint === undefined) {
            // store was empty at fork point
            baseTransforms = base.allTransforms();
        } else {
            baseTransforms = base.transformsSince(forkPoint);
        }
        if (baseTransforms.length > 0) {
            let localTransforms = this.allTransforms();
            localTransforms.reverse().forEach(transform => {
                const inverseOperations = this._transformInverses[transform.id];
                if (inverseOperations) {
                    this.cache.patch(inverseOperations);
                }
                this._clearTransformFromHistory(transform.id);
            });
            baseTransforms.forEach(transform => this._applyTransform(transform));
            localTransforms.forEach(transform => this._applyTransform(transform));
            this._forkPoint = base.transformLog.head;
        }
    }
    /**
     Rolls back the Store to a particular transformId
        @method rollback
     @param {string} transformId - The ID of the transform to roll back to
     @param {number} relativePosition - A positive or negative integer to specify a position relative to `transformId`
     @returns {undefined}
    */
    rollback(transformId, relativePosition = 0) {
        return this.transformLog.rollback(transformId, relativePosition);
    }
    /**
     Returns all transforms since a particular `transformId`.
        @method transformsSince
     @param {string} transformId - The ID of the transform to start with.
     @returns {Array} Array of transforms.
    */
    transformsSince(transformId) {
        return this.transformLog.after(transformId).map(id => this._transforms[id]);
    }
    /**
     Returns all tracked transforms.
        @method allTransforms
     @returns {Array} Array of transforms.
    */
    allTransforms() {
        return this.transformLog.entries.map(id => this._transforms[id]);
    }
    getTransform(transformId) {
        return this._transforms[transformId];
    }
    getInverseOperations(transformId) {
        return this._transformInverses[transformId];
    }
    /////////////////////////////////////////////////////////////////////////////
    // Protected methods
    /////////////////////////////////////////////////////////////////////////////
    _applyTransform(transform) {
        const result = this.cache.patch(transform.operations);
        this._transforms[transform.id] = transform;
        this._transformInverses[transform.id] = result.inverse;
        return result.data;
    }
    _clearTransformFromHistory(transformId) {
        delete this._transforms[transformId];
        delete this._transformInverses[transformId];
    }
    _logCleared() {
        this._transforms = {};
        this._transformInverses = {};
    }
    _logTruncated(transformId, relativePosition, removed) {
        removed.forEach(id => this._clearTransformFromHistory(id));
    }
    _logRolledback(transformId, relativePosition, removed) {
        removed.reverse().forEach(id => {
            const inverseOperations = this._transformInverses[id];
            if (inverseOperations) {
                this.cache.patch(inverseOperations);
            }
            this._clearTransformFromHistory(id);
        });
    }
};
Store = Store_1 = __decorate([_data.syncable, _data.queryable, _data.updatable], Store);
exports.default = Store;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInN0b3JlLmpzIl0sIm5hbWVzIjpbIl9fZGVjb3JhdGUiLCJkZWNvcmF0b3JzIiwidGFyZ2V0Iiwia2V5IiwiZGVzYyIsImMiLCJhcmd1bWVudHMiLCJsZW5ndGgiLCJyIiwiT2JqZWN0IiwiZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yIiwiZCIsIlJlZmxlY3QiLCJkZWNvcmF0ZSIsImkiLCJkZWZpbmVQcm9wZXJ0eSIsIlN0b3JlXzEiLCJhc3NlcnQiLCJPcmJpdCIsIlN0b3JlIiwiU291cmNlIiwiY29uc3RydWN0b3IiLCJzZXR0aW5ncyIsInNjaGVtYSIsImtleU1hcCIsIm5hbWUiLCJfdHJhbnNmb3JtcyIsIl90cmFuc2Zvcm1JbnZlcnNlcyIsInRyYW5zZm9ybUxvZyIsIm9uIiwiX2xvZ0NsZWFyZWQiLCJiaW5kIiwiX2xvZ1RydW5jYXRlZCIsIl9sb2dSb2xsZWRiYWNrIiwiY2FjaGVTZXR0aW5ncyIsInF1ZXJ5QnVpbGRlciIsInRyYW5zZm9ybUJ1aWxkZXIiLCJiYXNlIiwiX2Jhc2UiLCJfZm9ya1BvaW50IiwiaGVhZCIsImNhY2hlIiwiX2NhY2hlIiwiQ2FjaGUiLCJmb3JrUG9pbnQiLCJ1cGdyYWRlIiwiUHJvbWlzZSIsInJlc29sdmUiLCJfc3luYyIsInRyYW5zZm9ybSIsIl9hcHBseVRyYW5zZm9ybSIsIl91cGRhdGUiLCJyZXN1bHRzIiwiX3F1ZXJ5IiwicXVlcnkiLCJoaW50cyIsImRhdGEiLCJBcnJheSIsImlzQXJyYXkiLCJxIiwiZmluZFJlY29yZHMiLCJmaW5kUmVjb3JkIiwiZm9yayIsIl9zY2hlbWEiLCJfa2V5TWFwIiwibWVyZ2UiLCJmb3JrZWRTdG9yZSIsIm9wdGlvbnMiLCJ0cmFuc2Zvcm1zIiwic2luY2VUcmFuc2Zvcm1JZCIsInRyYW5zZm9ybXNTaW5jZSIsImFsbFRyYW5zZm9ybXMiLCJyZWR1Y2VkVHJhbnNmb3JtIiwib3BzIiwiZm9yRWFjaCIsInQiLCJwcm90b3R5cGUiLCJwdXNoIiwiYXBwbHkiLCJvcGVyYXRpb25zIiwiY29hbGVzY2UiLCJ0cmFuc2Zvcm1PcHRpb25zIiwidXBkYXRlIiwicmViYXNlIiwiYmFzZVRyYW5zZm9ybXMiLCJ1bmRlZmluZWQiLCJsb2NhbFRyYW5zZm9ybXMiLCJyZXZlcnNlIiwiaW52ZXJzZU9wZXJhdGlvbnMiLCJpZCIsInBhdGNoIiwiX2NsZWFyVHJhbnNmb3JtRnJvbUhpc3RvcnkiLCJyb2xsYmFjayIsInRyYW5zZm9ybUlkIiwicmVsYXRpdmVQb3NpdGlvbiIsImFmdGVyIiwibWFwIiwiZW50cmllcyIsImdldFRyYW5zZm9ybSIsImdldEludmVyc2VPcGVyYXRpb25zIiwicmVzdWx0IiwiaW52ZXJzZSIsInJlbW92ZWQiLCJzeW5jYWJsZSIsInF1ZXJ5YWJsZSIsInVwZGF0YWJsZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBUUE7Ozs7QUFDQTs7Ozs7O0FBVEEsSUFBSUEsYUFBYSxhQUFRLFVBQUtBLFVBQWIsSUFBMkIsVUFBVUMsVUFBVixFQUFzQkMsTUFBdEIsRUFBOEJDLEdBQTlCLEVBQW1DQyxJQUFuQyxFQUF5QztBQUNqRixRQUFJQyxJQUFJQyxVQUFVQyxNQUFsQjtBQUFBLFFBQ0lDLElBQUlILElBQUksQ0FBSixHQUFRSCxNQUFSLEdBQWlCRSxTQUFTLElBQVQsR0FBZ0JBLE9BQU9LLE9BQU9DLHdCQUFQLENBQWdDUixNQUFoQyxFQUF3Q0MsR0FBeEMsQ0FBdkIsR0FBc0VDLElBRC9GO0FBQUEsUUFFSU8sQ0FGSjtBQUdBLFFBQUksT0FBT0MsT0FBUCxLQUFtQixRQUFuQixJQUErQixPQUFPQSxRQUFRQyxRQUFmLEtBQTRCLFVBQS9ELEVBQTJFTCxJQUFJSSxRQUFRQyxRQUFSLENBQWlCWixVQUFqQixFQUE2QkMsTUFBN0IsRUFBcUNDLEdBQXJDLEVBQTBDQyxJQUExQyxDQUFKLENBQTNFLEtBQW9JLEtBQUssSUFBSVUsSUFBSWIsV0FBV00sTUFBWCxHQUFvQixDQUFqQyxFQUFvQ08sS0FBSyxDQUF6QyxFQUE0Q0EsR0FBNUMsRUFBaUQsSUFBSUgsSUFBSVYsV0FBV2EsQ0FB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ZXNDb250ZW50IjpbInZhciBfX2RlY29yYXRlID0gdGhpcyAmJiB0aGlzLl9fZGVjb3JhdGUgfHwgZnVuY3Rpb24gKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLFxuICAgICAgICByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYyxcbiAgICAgICAgZDtcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QuZGVjb3JhdGUgPT09IFwiZnVuY3Rpb25cIikgciA9IFJlZmxlY3QuZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpO2Vsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcbn07XG52YXIgU3RvcmVfMTtcbmltcG9ydCBPcmJpdCwgeyBTb3VyY2UsIHN5bmNhYmxlLCBxdWVyeWFibGUsIHVwZGF0YWJsZSwgY29hbGVzY2VSZWNvcmRPcGVyYXRpb25zLCBidWlsZFRyYW5zZm9ybSB9IGZyb20gJ0BvcmJpdC9kYXRhJztcbmltcG9ydCBDYWNoZSBmcm9tICcuL2NhY2hlJztcbmNvbnN0IHsgYXNzZXJ0IH0gPSBPcmJpdDtcbmxldCBTdG9yZSA9IFN0b3JlXzEgPSBjbGFzcyBTdG9yZSBleHRlbmRzIFNvdXJjZSB7XG4gICAgY29uc3RydWN0b3Ioc2V0dGluZ3MgPSB7fSkge1xuICAgICAgICBhc3NlcnQoJ1N0b3JlXFwncyBgc2NoZW1hYCBtdXN0IGJlIHNwZWNpZmllZCBpbiBgc2V0dGluZ3Muc2NoZW1hYCBjb25zdHJ1Y3RvciBhcmd1bWVudCcsICEhc2V0dGluZ3Muc2NoZW1hKTtcbiAgICAgICAgbGV0IGtleU1hcCA9IHNldHRpbmdzLmtleU1hcDtcbiAgICAgICAgbGV0IHNjaGVtYSA9IHNldHRpbmdzLnNjaGVtYTtcbiAgICAgICAgc2V0dGluZ3MubmFtZSA9IHNldHRpbmdzLm5hbWUgfHwgJ3N0b3JlJztcbiAgICAgICAgc3VwZXIoc2V0dGluZ3MpO1xuICAgICAgICB0aGlzLl90cmFuc2Zvcm1zID0ge307XG4gICAgICAgIHRoaXMuX3RyYW5zZm9ybUludmVyc2VzID0ge307XG4gICAgICAgIHRoaXMudHJhbnNmb3JtTG9nLm9uKCdjbGVhcicsIHRoaXMuX2xvZ0NsZWFyZWQuYmluZCh0aGlzKSk7XG4gICAgICAgIHRoaXMudHJhbnNmb3JtTG9nLm9uKCd0cnVuY2F0ZScsIHRoaXMuX2xvZ1RydW5jYXRlZC5iaW5kKHRoaXMpKTtcbiAgICAgICAgdGhpcy50cmFuc2Zvcm1Mb2cub24oJ3JvbGxiYWNrJywgdGhpcy5fbG9nUm9sbGVkYmFjay5iaW5kKHRoaXMpKTtcbiAgICAgICAgbGV0IGNhY2hlU2V0dGluZ3MgPSBzZXR0aW5ncy5jYWNoZVNldHRpbmdzIHx8IHt9O1xuICAgICAgICBjYWNoZVNldHRpbmdzLnNjaGVtYSA9IHNjaGVtYTtcbiAgICAgICAgY2FjaGVTZXR0aW5ncy5rZXlNYXAgPSBrZXlNYXA7XG4gICAgICAgIGNhY2hlU2V0dGluZ3MucXVlcnlCdWlsZGVyID0gY2FjaGVTZXR0aW5ncy5xdWVyeUJ1aWxkZXIgfHwgdGhpcy5xdWVyeUJ1aWxkZXI7XG4gICAgICAgIGNhY2hlU2V0dGluZ3MudHJhbnNmb3JtQnVpbGRlciA9IGNhY2hlU2V0dGluZ3MudHJhbnNmb3JtQnVpbGRlciB8fCB0aGlzLnRyYW5zZm9ybUJ1aWxkZXI7XG4gICAgICAgIGlmIChzZXR0aW5ncy5iYXNlKSB7XG4gICAgICAgICAgICB0aGlzLl9iYXNlID0gc2V0dGluZ3MuYmFzZTtcbiAgICAgICAgICAgIHRoaXMuX2ZvcmtQb2ludCA9IHRoaXMuX2Jhc2UudHJhbnNmb3JtTG9nLmhlYWQ7XG4gICAgICAgICAgICBjYWNoZVNldHRpbmdzLmJhc2UgPSB0aGlzLl9iYXNlLmNhY2hlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2NhY2hlID0gbmV3IENhY2hlKGNhY2hlU2V0dGluZ3MpO1xuICAgIH1cbiAgICBnZXQgY2FjaGUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jYWNoZTtcbiAgICB9XG4gICAgZ2V0IGJhc2UoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9iYXNlO1xuICAgIH1cbiAgICBnZXQgZm9ya1BvaW50KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZm9ya1BvaW50O1xuICAgIH1cbiAgICB1cGdyYWRlKCkge1xuICAgICAgICB0aGlzLl9jYWNoZS51cGdyYWRlKCk7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBTeW5jYWJsZSBpbnRlcmZhY2UgaW1wbGVtZW50YXRpb25cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIGFzeW5jIF9zeW5jKHRyYW5zZm9ybSkge1xuICAgICAgICB0aGlzLl9hcHBseVRyYW5zZm9ybSh0cmFuc2Zvcm0pO1xuICAgIH1cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIC8vIFVwZGF0YWJsZSBpbnRlcmZhY2UgaW1wbGVtZW50YXRpb25cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIGFzeW5jIF91cGRhdGUodHJhbnNmb3JtKSB7XG4gICAgICAgIGxldCByZXN1bHRzID0gdGhpcy5fYXBwbHlUcmFuc2Zvcm0odHJhbnNmb3JtKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdHMubGVuZ3RoID09PSAxID8gcmVzdWx0c1swXSA6IHJlc3VsdHM7XG4gICAgfVxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgLy8gUXVlcnlhYmxlIGludGVyZmFjZSBpbXBsZW1lbnRhdGlvblxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgYXN5bmMgX3F1ZXJ5KHF1ZXJ5LCBoaW50cykge1xuICAgICAgICBpZiAoaGludHMgJiYgaGludHMuZGF0YSkge1xuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoaGludHMuZGF0YSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fY2FjaGUucXVlcnkocSA9PiBxLmZpbmRSZWNvcmRzKGhpbnRzLmRhdGEpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaGludHMuZGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9jYWNoZS5xdWVyeShxID0+IHEuZmluZFJlY29yZChoaW50cy5kYXRhKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2NhY2hlLnF1ZXJ5KHF1ZXJ5KTtcbiAgICB9XG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBQdWJsaWMgbWV0aG9kc1xuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgLyoqXG4gICAgIENyZWF0ZSBhIGNsb25lLCBvciBcImZvcmtcIiwgZnJvbSBhIFwiYmFzZVwiIHN0b3JlLlxuICAgICAgICBUaGUgZm9ya2VkIHN0b3JlIHdpbGwgaGF2ZSB0aGUgc2FtZSBgc2NoZW1hYCBhbmQgYGtleU1hcGAgYXMgaXRzIGJhc2Ugc3RvcmUuXG4gICAgIFRoZSBmb3JrZWQgc3RvcmUncyBjYWNoZSB3aWxsIHN0YXJ0IHdpdGggdGhlIHNhbWUgaW1tdXRhYmxlIGRvY3VtZW50IGFzXG4gICAgIHRoZSBiYXNlIHN0b3JlLiBJdHMgY29udGVudHMgYW5kIGxvZyB3aWxsIGV2b2x2ZSBpbmRlcGVuZGVudGx5LlxuICAgICAgICBAbWV0aG9kIGZvcmtcbiAgICAgQHJldHVybnMge1N0b3JlfSBUaGUgZm9ya2VkIHN0b3JlLlxuICAgICovXG4gICAgZm9yayhzZXR0aW5ncyA9IHt9KSB7XG4gICAgICAgIHNldHRpbmdzLnNjaGVtYSA9IHRoaXMuX3NjaGVtYTtcbiAgICAgICAgc2V0dGluZ3MuY2FjaGVTZXR0aW5ncyA9IHNldHRpbmdzLmNhY2hlU2V0dGluZ3MgfHwge307XG4gICAgICAgIHNldHRpbmdzLmtleU1hcCA9IHRoaXMuX2tleU1hcDtcbiAgICAgICAgc2V0dGluZ3MucXVlcnlCdWlsZGVyID0gdGhpcy5xdWVyeUJ1aWxkZXI7XG4gICAgICAgIHNldHRpbmdzLnRyYW5zZm9ybUJ1aWxkZXIgPSB0aGlzLnRyYW5zZm9ybUJ1aWxkZXI7XG4gICAgICAgIHNldHRpbmdzLmJhc2UgPSB0aGlzO1xuICAgICAgICByZXR1cm4gbmV3IFN0b3JlXzEoc2V0dGluZ3MpO1xuICAgIH1cbiAgICAvKipcbiAgICAgTWVyZ2UgdHJhbnNmb3JtcyBmcm9tIGEgZm9ya2VkIHN0b3JlIGJhY2sgaW50byBhIGJhc2Ugc3RvcmUuXG4gICAgICAgIEJ5IGRlZmF1bHQsIGFsbCBvZiB0aGUgb3BlcmF0aW9ucyBmcm9tIGFsbCBvZiB0aGUgdHJhbnNmb3JtcyBpbiB0aGUgZm9ya2VkXG4gICAgIHN0b3JlJ3MgaGlzdG9yeSB3aWxsIGJlIHJlZHVjZWQgaW50byBhIHNpbmdsZSB0cmFuc2Zvcm0uIEEgc3Vic2V0IG9mXG4gICAgIG9wZXJhdGlvbnMgY2FuIGJlIHNlbGVjdGVkIGJ5IHNwZWNpZnlpbmcgdGhlIGBzaW5jZVRyYW5zZm9ybUlkYCBvcHRpb24uXG4gICAgICAgIFRoZSBgY29hbGVzY2VgIG9wdGlvbiBjb250cm9scyB3aGV0aGVyIG9wZXJhdGlvbnMgYXJlIGNvYWxlc2NlZCBpbnRvIGFcbiAgICAgbWluaW1hbCBlcXVpdmFsZW50IHNldCBiZWZvcmUgYmVpbmcgcmVkdWNlZCBpbnRvIGEgdHJhbnNmb3JtLlxuICAgICAgICBAbWV0aG9kIG1lcmdlXG4gICAgIEBwYXJhbSB7U3RvcmV9IGZvcmtlZFN0b3JlIC0gVGhlIHN0b3JlIHRvIG1lcmdlLlxuICAgICBAcGFyYW0ge09iamVjdH0gIFtvcHRpb25zXSBzZXR0aW5nc1xuICAgICBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmNvYWxlc2NlID0gdHJ1ZV0gU2hvdWxkIG9wZXJhdGlvbnMgYmUgY29hbGVzY2VkIGludG8gYSBtaW5pbWFsIGVxdWl2YWxlbnQgc2V0P1xuICAgICBAcGFyYW0ge1N0cmluZ30gIFtvcHRpb25zLnNpbmNlVHJhbnNmb3JtSWQgPSBudWxsXSBTZWxlY3Qgb25seSB0cmFuc2Zvcm1zIHNpbmNlIHRoZSBzcGVjaWZpZWQgSUQuXG4gICAgIEByZXR1cm5zIHtQcm9taXNlfSBUaGUgcmVzdWx0IG9mIGNhbGxpbmcgYHVwZGF0ZSgpYCB3aXRoIHRoZSBmb3JrZWQgdHJhbnNmb3Jtcy5cbiAgICAqL1xuICAgIG1lcmdlKGZvcmtlZFN0b3JlLCBvcHRpb25zID0ge30pIHtcbiAgICAgICAgbGV0IHRyYW5zZm9ybXM7XG4gICAgICAgIGlmIChvcHRpb25zLnNpbmNlVHJhbnNmb3JtSWQpIHtcbiAgICAgICAgICAgIHRyYW5zZm9ybXMgPSBmb3JrZWRTdG9yZS50cmFuc2Zvcm1zU2luY2Uob3B0aW9ucy5zaW5jZVRyYW5zZm9ybUlkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRyYW5zZm9ybXMgPSBmb3JrZWRTdG9yZS5hbGxUcmFuc2Zvcm1zKCk7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHJlZHVjZWRUcmFuc2Zvcm07XG4gICAgICAgIGxldCBvcHMgPSBbXTtcbiAgICAgICAgdHJhbnNmb3Jtcy5mb3JFYWNoKHQgPT4ge1xuICAgICAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkob3BzLCB0Lm9wZXJhdGlvbnMpO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKG9wdGlvbnMuY29hbGVzY2UgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICBvcHMgPSBjb2FsZXNjZVJlY29yZE9wZXJhdGlvbnMob3BzKTtcbiAgICAgICAgfVxuICAgICAgICByZWR1Y2VkVHJhbnNmb3JtID0gYnVpbGRUcmFuc2Zvcm0ob3BzLCBvcHRpb25zLnRyYW5zZm9ybU9wdGlvbnMpO1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGUocmVkdWNlZFRyYW5zZm9ybSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoaXMgcmViYXNlIG1ldGhvZCB3b3JrcyBzaW1pbGFybHkgdG8gYSBnaXQgcmViYXNlOlxuICAgICAqXG4gICAgICogQWZ0ZXIgYSBzdG9yZSBpcyBmb3JrZWQsIHRoZXJlIGlzIGEgcGFyZW50LSBhbmQgYSBjaGlsZC1zdG9yZS5cbiAgICAgKiBCb3RoIG1heSBiZSB1cGRhdGVkIHdpdGggdHJhbnNmb3Jtcy5cbiAgICAgKiBJZiBhZnRlciBzb21lIHVwZGF0ZXMgb24gYm90aCBzdG9yZXMgYGNoaWxkU3RvcmUucmViYXNlKClgIGlzIGNhbGxlZCxcbiAgICAgKiB0aGUgcmVzdWx0IG9uIHRoZSBjaGlsZCBzdG9yZSB3aWxsIGxvb2sgbGlrZSxcbiAgICAgKiBhcyBpZiBhbGwgdXBkYXRlcyB0byB0aGUgcGFyZW50IHN0b3JlIHdlcmUgYWRkZWQgZmlyc3QsXG4gICAgICogZm9sbG93ZWQgYnkgdGhvc2UgbWFkZSBpbiB0aGUgY2hpbGQgc3RvcmUuXG4gICAgICogVGhpcyBtZWFucyB0aGF0IHVwZGF0ZXMgaW4gdGhlIGNoaWxkIHN0b3JlIGhhdmUgYSB0ZW5kZW5jeSBvZiB3aW5uaW5nLlxuICAgICAqL1xuICAgIHJlYmFzZSgpIHtcbiAgICAgICAgbGV0IGJhc2UgPSB0aGlzLl9iYXNlO1xuICAgICAgICBsZXQgZm9ya1BvaW50ID0gdGhpcy5fZm9ya1BvaW50O1xuICAgICAgICBhc3NlcnQoJ0EgYGJhc2VgIHN0b3JlIG11c3QgYmUgZGVmaW5lZCBmb3IgYHJlYmFzZWAgdG8gd29yaycsICEhYmFzZSk7XG4gICAgICAgIC8vYXNzZXJ0KCdBIGBmb3JrUG9pbnRgIG11c3QgYmUgZGVmaW5lZCBmb3IgYHJlYmFzZWAgdG8gd29yaycsICEhZm9ya1BvaW50KTtcbiAgICAgICAgbGV0IGJhc2VUcmFuc2Zvcm1zO1xuICAgICAgICBpZiAoZm9ya1BvaW50ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIHN0b3JlIHdhcyBlbXB0eSBhdCBmb3JrIHBvaW50XG4gICAgICAgICAgICBiYXNlVHJhbnNmb3JtcyA9IGJhc2UuYWxsVHJhbnNmb3JtcygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYmFzZVRyYW5zZm9ybXMgPSBiYXNlLnRyYW5zZm9ybXNTaW5jZShmb3JrUG9pbnQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChiYXNlVHJhbnNmb3Jtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBsZXQgbG9jYWxUcmFuc2Zvcm1zID0gdGhpcy5hbGxUcmFuc2Zvcm1zKCk7XG4gICAgICAgICAgICBsb2NhbFRyYW5zZm9ybXMucmV2ZXJzZSgpLmZvckVhY2godHJhbnNmb3JtID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBpbnZlcnNlT3BlcmF0aW9ucyA9IHRoaXMuX3RyYW5zZm9ybUludmVyc2VzW3RyYW5zZm9ybS5pZF07XG4gICAgICAgICAgICAgICAgaWYgKGludmVyc2VPcGVyYXRpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2FjaGUucGF0Y2goaW52ZXJzZU9wZXJhdGlvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLl9jbGVhclRyYW5zZm9ybUZyb21IaXN0b3J5KHRyYW5zZm9ybS5pZCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGJhc2VUcmFuc2Zvcm1zLmZvckVhY2godHJhbnNmb3JtID0+IHRoaXMuX2FwcGx5VHJhbnNmb3JtKHRyYW5zZm9ybSkpO1xuICAgICAgICAgICAgbG9jYWxUcmFuc2Zvcm1zLmZvckVhY2godHJhbnNmb3JtID0+IHRoaXMuX2FwcGx5VHJhbnNmb3JtKHRyYW5zZm9ybSkpO1xuICAgICAgICAgICAgdGhpcy5fZm9ya1BvaW50ID0gYmFzZS50cmFuc2Zvcm1Mb2cuaGVhZDtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgUm9sbHMgYmFjayB0aGUgU3RvcmUgdG8gYSBwYXJ0aWN1bGFyIHRyYW5zZm9ybUlkXG4gICAgICAgIEBtZXRob2Qgcm9sbGJhY2tcbiAgICAgQHBhcmFtIHtzdHJpbmd9IHRyYW5zZm9ybUlkIC0gVGhlIElEIG9mIHRoZSB0cmFuc2Zvcm0gdG8gcm9sbCBiYWNrIHRvXG4gICAgIEBwYXJhbSB7bnVtYmVyfSByZWxhdGl2ZVBvc2l0aW9uIC0gQSBwb3NpdGl2ZSBvciBuZWdhdGl2ZSBpbnRlZ2VyIHRvIHNwZWNpZnkgYSBwb3NpdGlvbiByZWxhdGl2ZSB0byBgdHJhbnNmb3JtSWRgXG4gICAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAgKi9cbiAgICByb2xsYmFjayh0cmFuc2Zvcm1JZCwgcmVsYXRpdmVQb3NpdGlvbiA9IDApIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudHJhbnNmb3JtTG9nLnJvbGxiYWNrKHRyYW5zZm9ybUlkLCByZWxhdGl2ZVBvc2l0aW9uKTtcbiAgICB9XG4gICAgLyoqXG4gICAgIFJldHVybnMgYWxsIHRyYW5zZm9ybXMgc2luY2UgYSBwYXJ0aWN1bGFyIGB0cmFuc2Zvcm1JZGAuXG4gICAgICAgIEBtZXRob2QgdHJhbnNmb3Jtc1NpbmNlXG4gICAgIEBwYXJhbSB7c3RyaW5nfSB0cmFuc2Zvcm1JZCAtIFRoZSBJRCBvZiB0aGUgdHJhbnNmb3JtIHRvIHN0YXJ0IHdpdGguXG4gICAgIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2YgdHJhbnNmb3Jtcy5cbiAgICAqL1xuICAgIHRyYW5zZm9ybXNTaW5jZSh0cmFuc2Zvcm1JZCkge1xuICAgICAgICByZXR1cm4gdGhpcy50cmFuc2Zvcm1Mb2cuYWZ0ZXIodHJhbnNmb3JtSWQpLm1hcChpZCA9PiB0aGlzLl90cmFuc2Zvcm1zW2lkXSk7XG4gICAgfVxuICAgIC8qKlxuICAgICBSZXR1cm5zIGFsbCB0cmFja2VkIHRyYW5zZm9ybXMuXG4gICAgICAgIEBtZXRob2QgYWxsVHJhbnNmb3Jtc1xuICAgICBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIHRyYW5zZm9ybXMuXG4gICAgKi9cbiAgICBhbGxUcmFuc2Zvcm1zKCkge1xuICAgICAgICByZXR1cm4gdGhpcy50cmFuc2Zvcm1Mb2cuZW50cmllcy5tYXAoaWQgPT4gdGhpcy5fdHJhbnNmb3Jtc1tpZF0pO1xuICAgIH1cbiAgICBnZXRUcmFuc2Zvcm0odHJhbnNmb3JtSWQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RyYW5zZm9ybXNbdHJhbnNmb3JtSWRdO1xuICAgIH1cbiAgICBnZXRJbnZlcnNlT3BlcmF0aW9ucyh0cmFuc2Zvcm1JZCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdHJhbnNmb3JtSW52ZXJzZXNbdHJhbnNmb3JtSWRdO1xuICAgIH1cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIC8vIFByb3RlY3RlZCBtZXRob2RzXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICBfYXBwbHlUcmFuc2Zvcm0odHJhbnNmb3JtKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuY2FjaGUucGF0Y2godHJhbnNmb3JtLm9wZXJhdGlvbnMpO1xuICAgICAgICB0aGlzLl90cmFuc2Zvcm1zW3RyYW5zZm9ybS5pZF0gPSB0cmFuc2Zvcm07XG4gICAgICAgIHRoaXMuX3RyYW5zZm9ybUludmVyc2VzW3RyYW5zZm9ybS5pZF0gPSByZXN1bHQuaW52ZXJzZTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdC5kYXRhO1xuICAgIH1cbiAgICBfY2xlYXJUcmFuc2Zvcm1Gcm9tSGlzdG9yeSh0cmFuc2Zvcm1JZCkge1xuICAgICAgICBkZWxldGUgdGhpcy5fdHJhbnNmb3Jtc1t0cmFuc2Zvcm1JZF07XG4gICAgICAgIGRlbGV0ZSB0aGlzLl90cmFuc2Zvcm1JbnZlcnNlc1t0cmFuc2Zvcm1JZF07XG4gICAgfVxuICAgIF9sb2dDbGVhcmVkKCkge1xuICAgICAgICB0aGlzLl90cmFuc2Zvcm1zID0ge307XG4gICAgICAgIHRoaXMuX3RyYW5zZm9ybUludmVyc2VzID0ge307XG4gICAgfVxuICAgIF9sb2dUcnVuY2F0ZWQodHJhbnNmb3JtSWQsIHJlbGF0aXZlUG9zaXRpb24sIHJlbW92ZWQpIHtcbiAgICAgICAgcmVtb3ZlZC5mb3JFYWNoKGlkID0+IHRoaXMuX2NsZWFyVHJhbnNmb3JtRnJvbUhpc3RvcnkoaWQpKTtcbiAgICB9XG4gICAgX2xvZ1JvbGxlZGJhY2sodHJhbnNmb3JtSWQsIHJlbGF0aXZlUG9zaXRpb24sIHJlbW92ZWQpIHtcbiAgICAgICAgcmVtb3ZlZC5yZXZlcnNlKCkuZm9yRWFjaChpZCA9PiB7XG4gICAgICAgICAgICBjb25zdCBpbnZlcnNlT3BlcmF0aW9ucyA9IHRoaXMuX3RyYW5zZm9ybUludmVyc2VzW2lkXTtcbiAgICAgICAgICAgIGlmIChpbnZlcnNlT3BlcmF0aW9ucykge1xuICAgICAgICAgICAgICAgIHRoaXMuY2FjaGUucGF0Y2goaW52ZXJzZU9wZXJhdGlvbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fY2xlYXJUcmFuc2Zvcm1Gcm9tSGlzdG9yeShpZCk7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5TdG9yZSA9IFN0b3JlXzEgPSBfX2RlY29yYXRlKFtzeW5jYWJsZSwgcXVlcnlhYmxlLCB1cGRhdGFibGVdLCBTdG9yZSk7XG5leHBvcnQgZGVmYXVsdCBTdG9yZTsiXX0=