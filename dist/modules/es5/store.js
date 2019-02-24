var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _defaults(obj, defaults) { var keys = Object.getOwnPropertyNames(defaults); for (var i = 0; i < keys.length; i++) { var key = keys[i]; var value = Object.getOwnPropertyDescriptor(defaults, key); if (value && value.configurable && obj[key] === undefined) { Object.defineProperty(obj, key, value); } } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : _defaults(subClass, superClass); }

var __decorate = this && this.__decorate || function (decorators, target, key, desc) {
    var c = arguments.length,
        r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc,
        d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);else for (var i = decorators.length - 1; i >= 0; i--) {
        if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    }return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var Store_1;
import Orbit, { Source, syncable, queryable, updatable, coalesceRecordOperations, buildTransform } from '@orbit/data';
import Cache from './cache';
var assert = Orbit.assert;

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
            ops = coalesceRecordOperations(ops);
        }
        reducedTransform = buildTransform(ops, options.transformOptions);
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
}(Source);
Store = Store_1 = __decorate([syncable, queryable, updatable], Store);
export default Store;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInN0b3JlLmpzIl0sIm5hbWVzIjpbIl9fZGVjb3JhdGUiLCJkZWNvcmF0b3JzIiwidGFyZ2V0Iiwia2V5IiwiZGVzYyIsImMiLCJhcmd1bWVudHMiLCJsZW5ndGgiLCJyIiwiT2JqZWN0IiwiZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yIiwiZCIsIlJlZmxlY3QiLCJkZWNvcmF0ZSIsImkiLCJkZWZpbmVQcm9wZXJ0eSIsIlN0b3JlXzEiLCJPcmJpdCIsIlNvdXJjZSIsInN5bmNhYmxlIiwicXVlcnlhYmxlIiwidXBkYXRhYmxlIiwiY29hbGVzY2VSZWNvcmRPcGVyYXRpb25zIiwiYnVpbGRUcmFuc2Zvcm0iLCJDYWNoZSIsImFzc2VydCIsIlN0b3JlIiwic2V0dGluZ3MiLCJzY2hlbWEiLCJrZXlNYXAiLCJuYW1lIiwiX3RyYW5zZm9ybXMiLCJfdHJhbnNmb3JtSW52ZXJzZXMiLCJ0cmFuc2Zvcm1Mb2ciLCJvbiIsIl9sb2dDbGVhcmVkIiwiYmluZCIsIl9sb2dUcnVuY2F0ZWQiLCJfbG9nUm9sbGVkYmFjayIsImNhY2hlU2V0dGluZ3MiLCJxdWVyeUJ1aWxkZXIiLCJ0cmFuc2Zvcm1CdWlsZGVyIiwiYmFzZSIsIl9iYXNlIiwiX2ZvcmtQb2ludCIsImhlYWQiLCJjYWNoZSIsIl9jYWNoZSIsInVwZ3JhZGUiLCJQcm9taXNlIiwicmVzb2x2ZSIsIl9zeW5jIiwidHJhbnNmb3JtIiwiX2FwcGx5VHJhbnNmb3JtIiwiX3VwZGF0ZSIsInJlc3VsdHMiLCJfcXVlcnkiLCJxdWVyeSIsImhpbnRzIiwiZGF0YSIsIkFycmF5IiwiaXNBcnJheSIsInEiLCJmaW5kUmVjb3JkcyIsImZpbmRSZWNvcmQiLCJmb3JrIiwiX3NjaGVtYSIsIl9rZXlNYXAiLCJtZXJnZSIsImZvcmtlZFN0b3JlIiwib3B0aW9ucyIsInRyYW5zZm9ybXMiLCJzaW5jZVRyYW5zZm9ybUlkIiwidHJhbnNmb3Jtc1NpbmNlIiwiYWxsVHJhbnNmb3JtcyIsInJlZHVjZWRUcmFuc2Zvcm0iLCJvcHMiLCJmb3JFYWNoIiwicHJvdG90eXBlIiwicHVzaCIsImFwcGx5IiwidCIsIm9wZXJhdGlvbnMiLCJjb2FsZXNjZSIsInRyYW5zZm9ybU9wdGlvbnMiLCJ1cGRhdGUiLCJyZWJhc2UiLCJmb3JrUG9pbnQiLCJiYXNlVHJhbnNmb3JtcyIsInVuZGVmaW5lZCIsImxvY2FsVHJhbnNmb3JtcyIsInJldmVyc2UiLCJpbnZlcnNlT3BlcmF0aW9ucyIsImlkIiwicGF0Y2giLCJfY2xlYXJUcmFuc2Zvcm1Gcm9tSGlzdG9yeSIsInJvbGxiYWNrIiwidHJhbnNmb3JtSWQiLCJyZWxhdGl2ZVBvc2l0aW9uIiwiYWZ0ZXIiLCJtYXAiLCJlbnRyaWVzIiwiZ2V0VHJhbnNmb3JtIiwiZ2V0SW52ZXJzZU9wZXJhdGlvbnMiLCJyZXN1bHQiLCJpbnZlcnNlIiwicmVtb3ZlZCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLElBQUlBLGFBQWEsUUFBUSxLQUFLQSxVQUFiLElBQTJCLFVBQVVDLFVBQVYsRUFBc0JDLE1BQXRCLEVBQThCQyxHQUE5QixFQUFtQ0MsSUFBbkMsRUFBeUM7QUFDakYsUUFBSUMsSUFBSUMsVUFBVUMsTUFBbEI7QUFBQSxRQUNJQyxJQUFJSCxJQUFJLENBQUosR0FBUUgsTUFBUixHQUFpQkUsU0FBUyxJQUFULEdBQWdCQSxPQUFPSyxPQUFPQyx3QkFBUCxDQUFnQ1IsTUFBaEMsRUFBd0NDLEdBQXhDLENBQXZCLEdBQXNFQyxJQUQvRjtBQUFBLFFBRUlPLENBRko7QUFHQSxRQUFJLE9BQU9DLE9BQVAsS0FBbUIsUUFBbkIsSUFBK0IsT0FBT0EsUUFBUUMsUUFBZixLQUE0QixVQUEvRCxFQUEyRUwsSUFBSUksUUFBUUMsUUFBUixDQUFpQlosVUFBakIsRUFBNkJDLE1BQTdCLEVBQXFDQyxHQUFyQyxFQUEwQ0MsSUFBMUMsQ0FBSixDQUEzRSxLQUFvSSxLQUFLLElBQUlVLElBQUliLFdBQVdNLE1BQVgsR0FBb0IsQ0FBakMsRUFBb0NPLEtBQUssQ0FBekMsRUFBNENBLEdBQTVDO0FBQWlELFlBQUlI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USxPQTFNckMsRUEwTThDO0FBQUE7O0FBQ2xEQSxnQkFBUTdCLE9BQVIsQ0FBZ0I7QUFBQSxtQkFBTSxPQUFLa0IsMEJBQUwsQ0FBZ0NGLEVBQWhDLENBQU47QUFBQSxTQUFoQjtBQUNILEtBNU1POztBQUFBLG9CQTZNUnZELGNBN01RLDJCQTZNTzJELFdBN01QLEVBNk1vQkMsZ0JBN01wQixFQTZNc0NRLE9BN010QyxFQTZNK0M7QUFBQTs7QUFDbkRBLGdCQUFRZixPQUFSLEdBQWtCZCxPQUFsQixDQUEwQixjQUFNO0FBQzVCLGdCQUFNZSxvQkFBb0IsT0FBSzVELGtCQUFMLENBQXdCNkQsRUFBeEIsQ0FBMUI7QUFDQSxnQkFBSUQsaUJBQUosRUFBdUI7QUFDbkIsdUJBQUs5QyxLQUFMLENBQVdnRCxLQUFYLENBQWlCRixpQkFBakI7QUFDSDtBQUNELG1CQUFLRywwQkFBTCxDQUFnQ0YsRUFBaEM7QUFDSCxTQU5EO0FBT0gsS0FyTk87O0FBQUE7QUFBQTtBQUFBLHlCQXdCSTtBQUNSLG1CQUFPLEtBQUs5QyxNQUFaO0FBQ0g7QUExQk87QUFBQTtBQUFBLHlCQTJCRztBQUNQLG1CQUFPLEtBQUtKLEtBQVo7QUFDSDtBQTdCTztBQUFBO0FBQUEseUJBOEJRO0FBQ1osbUJBQU8sS0FBS0MsVUFBWjtBQUNIO0FBaENPOztBQUFBO0FBQUEsRUFBOEIxQixNQUE5QixDQUFaO0FBdU5BUSxRQUFRVixVQUFVaEIsV0FBVyxDQUFDbUIsUUFBRCxFQUFXQyxTQUFYLEVBQXNCQyxTQUF0QixDQUFYLEVBQTZDSyxLQUE3QyxDQUFsQjtBQUNBLGVBQWVBLEtBQWYiLCJmaWxlIjoic3RvcmUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgX19kZWNvcmF0ZSA9IHRoaXMgJiYgdGhpcy5fX2RlY29yYXRlIHx8IGZ1bmN0aW9uIChkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xuICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aCxcbiAgICAgICAgciA9IGMgPCAzID8gdGFyZ2V0IDogZGVzYyA9PT0gbnVsbCA/IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KSA6IGRlc2MsXG4gICAgICAgIGQ7XG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xuICAgIHJldHVybiBjID4gMyAmJiByICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgciksIHI7XG59O1xudmFyIFN0b3JlXzE7XG5pbXBvcnQgT3JiaXQsIHsgU291cmNlLCBzeW5jYWJsZSwgcXVlcnlhYmxlLCB1cGRhdGFibGUsIGNvYWxlc2NlUmVjb3JkT3BlcmF0aW9ucywgYnVpbGRUcmFuc2Zvcm0gfSBmcm9tICdAb3JiaXQvZGF0YSc7XG5pbXBvcnQgQ2FjaGUgZnJvbSAnLi9jYWNoZSc7XG5jb25zdCB7IGFzc2VydCB9ID0gT3JiaXQ7XG5sZXQgU3RvcmUgPSBTdG9yZV8xID0gY2xhc3MgU3RvcmUgZXh0ZW5kcyBTb3VyY2Uge1xuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzID0ge30pIHtcbiAgICAgICAgYXNzZXJ0KCdTdG9yZVxcJ3MgYHNjaGVtYWAgbXVzdCBiZSBzcGVjaWZpZWQgaW4gYHNldHRpbmdzLnNjaGVtYWAgY29uc3RydWN0b3IgYXJndW1lbnQnLCAhIXNldHRpbmdzLnNjaGVtYSk7XG4gICAgICAgIGxldCBrZXlNYXAgPSBzZXR0aW5ncy5rZXlNYXA7XG4gICAgICAgIGxldCBzY2hlbWEgPSBzZXR0aW5ncy5zY2hlbWE7XG4gICAgICAgIHNldHRpbmdzLm5hbWUgPSBzZXR0aW5ncy5uYW1lIHx8ICdzdG9yZSc7XG4gICAgICAgIHN1cGVyKHNldHRpbmdzKTtcbiAgICAgICAgdGhpcy5fdHJhbnNmb3JtcyA9IHt9O1xuICAgICAgICB0aGlzLl90cmFuc2Zvcm1JbnZlcnNlcyA9IHt9O1xuICAgICAgICB0aGlzLnRyYW5zZm9ybUxvZy5vbignY2xlYXInLCB0aGlzLl9sb2dDbGVhcmVkLmJpbmQodGhpcykpO1xuICAgICAgICB0aGlzLnRyYW5zZm9ybUxvZy5vbigndHJ1bmNhdGUnLCB0aGlzLl9sb2dUcnVuY2F0ZWQuYmluZCh0aGlzKSk7XG4gICAgICAgIHRoaXMudHJhbnNmb3JtTG9nLm9uKCdyb2xsYmFjaycsIHRoaXMuX2xvZ1JvbGxlZGJhY2suYmluZCh0aGlzKSk7XG4gICAgICAgIGxldCBjYWNoZVNldHRpbmdzID0gc2V0dGluZ3MuY2FjaGVTZXR0aW5ncyB8fCB7fTtcbiAgICAgICAgY2FjaGVTZXR0aW5ncy5zY2hlbWEgPSBzY2hlbWE7XG4gICAgICAgIGNhY2hlU2V0dGluZ3Mua2V5TWFwID0ga2V5TWFwO1xuICAgICAgICBjYWNoZVNldHRpbmdzLnF1ZXJ5QnVpbGRlciA9IGNhY2hlU2V0dGluZ3MucXVlcnlCdWlsZGVyIHx8IHRoaXMucXVlcnlCdWlsZGVyO1xuICAgICAgICBjYWNoZVNldHRpbmdzLnRyYW5zZm9ybUJ1aWxkZXIgPSBjYWNoZVNldHRpbmdzLnRyYW5zZm9ybUJ1aWxkZXIgfHwgdGhpcy50cmFuc2Zvcm1CdWlsZGVyO1xuICAgICAgICBpZiAoc2V0dGluZ3MuYmFzZSkge1xuICAgICAgICAgICAgdGhpcy5fYmFzZSA9IHNldHRpbmdzLmJhc2U7XG4gICAgICAgICAgICB0aGlzLl9mb3JrUG9pbnQgPSB0aGlzLl9iYXNlLnRyYW5zZm9ybUxvZy5oZWFkO1xuICAgICAgICAgICAgY2FjaGVTZXR0aW5ncy5iYXNlID0gdGhpcy5fYmFzZS5jYWNoZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9jYWNoZSA9IG5ldyBDYWNoZShjYWNoZVNldHRpbmdzKTtcbiAgICB9XG4gICAgZ2V0IGNhY2hlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2FjaGU7XG4gICAgfVxuICAgIGdldCBiYXNlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYmFzZTtcbiAgICB9XG4gICAgZ2V0IGZvcmtQb2ludCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2ZvcmtQb2ludDtcbiAgICB9XG4gICAgdXBncmFkZSgpIHtcbiAgICAgICAgdGhpcy5fY2FjaGUudXBncmFkZSgpO1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgLy8gU3luY2FibGUgaW50ZXJmYWNlIGltcGxlbWVudGF0aW9uXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICBhc3luYyBfc3luYyh0cmFuc2Zvcm0pIHtcbiAgICAgICAgdGhpcy5fYXBwbHlUcmFuc2Zvcm0odHJhbnNmb3JtKTtcbiAgICB9XG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBVcGRhdGFibGUgaW50ZXJmYWNlIGltcGxlbWVudGF0aW9uXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICBhc3luYyBfdXBkYXRlKHRyYW5zZm9ybSkge1xuICAgICAgICBsZXQgcmVzdWx0cyA9IHRoaXMuX2FwcGx5VHJhbnNmb3JtKHRyYW5zZm9ybSk7XG4gICAgICAgIHJldHVybiByZXN1bHRzLmxlbmd0aCA9PT0gMSA/IHJlc3VsdHNbMF0gOiByZXN1bHRzO1xuICAgIH1cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIC8vIFF1ZXJ5YWJsZSBpbnRlcmZhY2UgaW1wbGVtZW50YXRpb25cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIGFzeW5jIF9xdWVyeShxdWVyeSwgaGludHMpIHtcbiAgICAgICAgaWYgKGhpbnRzICYmIGhpbnRzLmRhdGEpIHtcbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGhpbnRzLmRhdGEpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NhY2hlLnF1ZXJ5KHEgPT4gcS5maW5kUmVjb3JkcyhoaW50cy5kYXRhKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGhpbnRzLmRhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fY2FjaGUucXVlcnkocSA9PiBxLmZpbmRSZWNvcmQoaGludHMuZGF0YSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9jYWNoZS5xdWVyeShxdWVyeSk7XG4gICAgfVxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgLy8gUHVibGljIG1ldGhvZHNcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIC8qKlxuICAgICBDcmVhdGUgYSBjbG9uZSwgb3IgXCJmb3JrXCIsIGZyb20gYSBcImJhc2VcIiBzdG9yZS5cbiAgICAgICAgVGhlIGZvcmtlZCBzdG9yZSB3aWxsIGhhdmUgdGhlIHNhbWUgYHNjaGVtYWAgYW5kIGBrZXlNYXBgIGFzIGl0cyBiYXNlIHN0b3JlLlxuICAgICBUaGUgZm9ya2VkIHN0b3JlJ3MgY2FjaGUgd2lsbCBzdGFydCB3aXRoIHRoZSBzYW1lIGltbXV0YWJsZSBkb2N1bWVudCBhc1xuICAgICB0aGUgYmFzZSBzdG9yZS4gSXRzIGNvbnRlbnRzIGFuZCBsb2cgd2lsbCBldm9sdmUgaW5kZXBlbmRlbnRseS5cbiAgICAgICAgQG1ldGhvZCBmb3JrXG4gICAgIEByZXR1cm5zIHtTdG9yZX0gVGhlIGZvcmtlZCBzdG9yZS5cbiAgICAqL1xuICAgIGZvcmsoc2V0dGluZ3MgPSB7fSkge1xuICAgICAgICBzZXR0aW5ncy5zY2hlbWEgPSB0aGlzLl9zY2hlbWE7XG4gICAgICAgIHNldHRpbmdzLmNhY2hlU2V0dGluZ3MgPSBzZXR0aW5ncy5jYWNoZVNldHRpbmdzIHx8IHt9O1xuICAgICAgICBzZXR0aW5ncy5rZXlNYXAgPSB0aGlzLl9rZXlNYXA7XG4gICAgICAgIHNldHRpbmdzLnF1ZXJ5QnVpbGRlciA9IHRoaXMucXVlcnlCdWlsZGVyO1xuICAgICAgICBzZXR0aW5ncy50cmFuc2Zvcm1CdWlsZGVyID0gdGhpcy50cmFuc2Zvcm1CdWlsZGVyO1xuICAgICAgICBzZXR0aW5ncy5iYXNlID0gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyBTdG9yZV8xKHNldHRpbmdzKTtcbiAgICB9XG4gICAgLyoqXG4gICAgIE1lcmdlIHRyYW5zZm9ybXMgZnJvbSBhIGZvcmtlZCBzdG9yZSBiYWNrIGludG8gYSBiYXNlIHN0b3JlLlxuICAgICAgICBCeSBkZWZhdWx0LCBhbGwgb2YgdGhlIG9wZXJhdGlvbnMgZnJvbSBhbGwgb2YgdGhlIHRyYW5zZm9ybXMgaW4gdGhlIGZvcmtlZFxuICAgICBzdG9yZSdzIGhpc3Rvcnkgd2lsbCBiZSByZWR1Y2VkIGludG8gYSBzaW5nbGUgdHJhbnNmb3JtLiBBIHN1YnNldCBvZlxuICAgICBvcGVyYXRpb25zIGNhbiBiZSBzZWxlY3RlZCBieSBzcGVjaWZ5aW5nIHRoZSBgc2luY2VUcmFuc2Zvcm1JZGAgb3B0aW9uLlxuICAgICAgICBUaGUgYGNvYWxlc2NlYCBvcHRpb24gY29udHJvbHMgd2hldGhlciBvcGVyYXRpb25zIGFyZSBjb2FsZXNjZWQgaW50byBhXG4gICAgIG1pbmltYWwgZXF1aXZhbGVudCBzZXQgYmVmb3JlIGJlaW5nIHJlZHVjZWQgaW50byBhIHRyYW5zZm9ybS5cbiAgICAgICAgQG1ldGhvZCBtZXJnZVxuICAgICBAcGFyYW0ge1N0b3JlfSBmb3JrZWRTdG9yZSAtIFRoZSBzdG9yZSB0byBtZXJnZS5cbiAgICAgQHBhcmFtIHtPYmplY3R9ICBbb3B0aW9uc10gc2V0dGluZ3NcbiAgICAgQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5jb2FsZXNjZSA9IHRydWVdIFNob3VsZCBvcGVyYXRpb25zIGJlIGNvYWxlc2NlZCBpbnRvIGEgbWluaW1hbCBlcXVpdmFsZW50IHNldD9cbiAgICAgQHBhcmFtIHtTdHJpbmd9ICBbb3B0aW9ucy5zaW5jZVRyYW5zZm9ybUlkID0gbnVsbF0gU2VsZWN0IG9ubHkgdHJhbnNmb3JtcyBzaW5jZSB0aGUgc3BlY2lmaWVkIElELlxuICAgICBAcmV0dXJucyB7UHJvbWlzZX0gVGhlIHJlc3VsdCBvZiBjYWxsaW5nIGB1cGRhdGUoKWAgd2l0aCB0aGUgZm9ya2VkIHRyYW5zZm9ybXMuXG4gICAgKi9cbiAgICBtZXJnZShmb3JrZWRTdG9yZSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIGxldCB0cmFuc2Zvcm1zO1xuICAgICAgICBpZiAob3B0aW9ucy5zaW5jZVRyYW5zZm9ybUlkKSB7XG4gICAgICAgICAgICB0cmFuc2Zvcm1zID0gZm9ya2VkU3RvcmUudHJhbnNmb3Jtc1NpbmNlKG9wdGlvbnMuc2luY2VUcmFuc2Zvcm1JZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0cmFuc2Zvcm1zID0gZm9ya2VkU3RvcmUuYWxsVHJhbnNmb3JtcygpO1xuICAgICAgICB9XG4gICAgICAgIGxldCByZWR1Y2VkVHJhbnNmb3JtO1xuICAgICAgICBsZXQgb3BzID0gW107XG4gICAgICAgIHRyYW5zZm9ybXMuZm9yRWFjaCh0ID0+IHtcbiAgICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KG9wcywgdC5vcGVyYXRpb25zKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChvcHRpb25zLmNvYWxlc2NlICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgb3BzID0gY29hbGVzY2VSZWNvcmRPcGVyYXRpb25zKG9wcyk7XG4gICAgICAgIH1cbiAgICAgICAgcmVkdWNlZFRyYW5zZm9ybSA9IGJ1aWxkVHJhbnNmb3JtKG9wcywgb3B0aW9ucy50cmFuc2Zvcm1PcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIHRoaXMudXBkYXRlKHJlZHVjZWRUcmFuc2Zvcm0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBUaGlzIHJlYmFzZSBtZXRob2Qgd29ya3Mgc2ltaWxhcmx5IHRvIGEgZ2l0IHJlYmFzZTpcbiAgICAgKlxuICAgICAqIEFmdGVyIGEgc3RvcmUgaXMgZm9ya2VkLCB0aGVyZSBpcyBhIHBhcmVudC0gYW5kIGEgY2hpbGQtc3RvcmUuXG4gICAgICogQm90aCBtYXkgYmUgdXBkYXRlZCB3aXRoIHRyYW5zZm9ybXMuXG4gICAgICogSWYgYWZ0ZXIgc29tZSB1cGRhdGVzIG9uIGJvdGggc3RvcmVzIGBjaGlsZFN0b3JlLnJlYmFzZSgpYCBpcyBjYWxsZWQsXG4gICAgICogdGhlIHJlc3VsdCBvbiB0aGUgY2hpbGQgc3RvcmUgd2lsbCBsb29rIGxpa2UsXG4gICAgICogYXMgaWYgYWxsIHVwZGF0ZXMgdG8gdGhlIHBhcmVudCBzdG9yZSB3ZXJlIGFkZGVkIGZpcnN0LFxuICAgICAqIGZvbGxvd2VkIGJ5IHRob3NlIG1hZGUgaW4gdGhlIGNoaWxkIHN0b3JlLlxuICAgICAqIFRoaXMgbWVhbnMgdGhhdCB1cGRhdGVzIGluIHRoZSBjaGlsZCBzdG9yZSBoYXZlIGEgdGVuZGVuY3kgb2Ygd2lubmluZy5cbiAgICAgKi9cbiAgICByZWJhc2UoKSB7XG4gICAgICAgIGxldCBiYXNlID0gdGhpcy5fYmFzZTtcbiAgICAgICAgbGV0IGZvcmtQb2ludCA9IHRoaXMuX2ZvcmtQb2ludDtcbiAgICAgICAgYXNzZXJ0KCdBIGBiYXNlYCBzdG9yZSBtdXN0IGJlIGRlZmluZWQgZm9yIGByZWJhc2VgIHRvIHdvcmsnLCAhIWJhc2UpO1xuICAgICAgICAvL2Fzc2VydCgnQSBgZm9ya1BvaW50YCBtdXN0IGJlIGRlZmluZWQgZm9yIGByZWJhc2VgIHRvIHdvcmsnLCAhIWZvcmtQb2ludCk7XG4gICAgICAgIGxldCBiYXNlVHJhbnNmb3JtcztcbiAgICAgICAgaWYgKGZvcmtQb2ludCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBzdG9yZSB3YXMgZW1wdHkgYXQgZm9yayBwb2ludFxuICAgICAgICAgICAgYmFzZVRyYW5zZm9ybXMgPSBiYXNlLmFsbFRyYW5zZm9ybXMoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJhc2VUcmFuc2Zvcm1zID0gYmFzZS50cmFuc2Zvcm1zU2luY2UoZm9ya1BvaW50KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYmFzZVRyYW5zZm9ybXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgbGV0IGxvY2FsVHJhbnNmb3JtcyA9IHRoaXMuYWxsVHJhbnNmb3JtcygpO1xuICAgICAgICAgICAgbG9jYWxUcmFuc2Zvcm1zLnJldmVyc2UoKS5mb3JFYWNoKHRyYW5zZm9ybSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgaW52ZXJzZU9wZXJhdGlvbnMgPSB0aGlzLl90cmFuc2Zvcm1JbnZlcnNlc1t0cmFuc2Zvcm0uaWRdO1xuICAgICAgICAgICAgICAgIGlmIChpbnZlcnNlT3BlcmF0aW9ucykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNhY2hlLnBhdGNoKGludmVyc2VPcGVyYXRpb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5fY2xlYXJUcmFuc2Zvcm1Gcm9tSGlzdG9yeSh0cmFuc2Zvcm0uaWQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBiYXNlVHJhbnNmb3Jtcy5mb3JFYWNoKHRyYW5zZm9ybSA9PiB0aGlzLl9hcHBseVRyYW5zZm9ybSh0cmFuc2Zvcm0pKTtcbiAgICAgICAgICAgIGxvY2FsVHJhbnNmb3Jtcy5mb3JFYWNoKHRyYW5zZm9ybSA9PiB0aGlzLl9hcHBseVRyYW5zZm9ybSh0cmFuc2Zvcm0pKTtcbiAgICAgICAgICAgIHRoaXMuX2ZvcmtQb2ludCA9IGJhc2UudHJhbnNmb3JtTG9nLmhlYWQ7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgIFJvbGxzIGJhY2sgdGhlIFN0b3JlIHRvIGEgcGFydGljdWxhciB0cmFuc2Zvcm1JZFxuICAgICAgICBAbWV0aG9kIHJvbGxiYWNrXG4gICAgIEBwYXJhbSB7c3RyaW5nfSB0cmFuc2Zvcm1JZCAtIFRoZSBJRCBvZiB0aGUgdHJhbnNmb3JtIHRvIHJvbGwgYmFjayB0b1xuICAgICBAcGFyYW0ge251bWJlcn0gcmVsYXRpdmVQb3NpdGlvbiAtIEEgcG9zaXRpdmUgb3IgbmVnYXRpdmUgaW50ZWdlciB0byBzcGVjaWZ5IGEgcG9zaXRpb24gcmVsYXRpdmUgdG8gYHRyYW5zZm9ybUlkYFxuICAgICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICovXG4gICAgcm9sbGJhY2sodHJhbnNmb3JtSWQsIHJlbGF0aXZlUG9zaXRpb24gPSAwKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRyYW5zZm9ybUxvZy5yb2xsYmFjayh0cmFuc2Zvcm1JZCwgcmVsYXRpdmVQb3NpdGlvbik7XG4gICAgfVxuICAgIC8qKlxuICAgICBSZXR1cm5zIGFsbCB0cmFuc2Zvcm1zIHNpbmNlIGEgcGFydGljdWxhciBgdHJhbnNmb3JtSWRgLlxuICAgICAgICBAbWV0aG9kIHRyYW5zZm9ybXNTaW5jZVxuICAgICBAcGFyYW0ge3N0cmluZ30gdHJhbnNmb3JtSWQgLSBUaGUgSUQgb2YgdGhlIHRyYW5zZm9ybSB0byBzdGFydCB3aXRoLlxuICAgICBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIHRyYW5zZm9ybXMuXG4gICAgKi9cbiAgICB0cmFuc2Zvcm1zU2luY2UodHJhbnNmb3JtSWQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudHJhbnNmb3JtTG9nLmFmdGVyKHRyYW5zZm9ybUlkKS5tYXAoaWQgPT4gdGhpcy5fdHJhbnNmb3Jtc1tpZF0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgUmV0dXJucyBhbGwgdHJhY2tlZCB0cmFuc2Zvcm1zLlxuICAgICAgICBAbWV0aG9kIGFsbFRyYW5zZm9ybXNcbiAgICAgQHJldHVybnMge0FycmF5fSBBcnJheSBvZiB0cmFuc2Zvcm1zLlxuICAgICovXG4gICAgYWxsVHJhbnNmb3JtcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudHJhbnNmb3JtTG9nLmVudHJpZXMubWFwKGlkID0+IHRoaXMuX3RyYW5zZm9ybXNbaWRdKTtcbiAgICB9XG4gICAgZ2V0VHJhbnNmb3JtKHRyYW5zZm9ybUlkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl90cmFuc2Zvcm1zW3RyYW5zZm9ybUlkXTtcbiAgICB9XG4gICAgZ2V0SW52ZXJzZU9wZXJhdGlvbnModHJhbnNmb3JtSWQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RyYW5zZm9ybUludmVyc2VzW3RyYW5zZm9ybUlkXTtcbiAgICB9XG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBQcm90ZWN0ZWQgbWV0aG9kc1xuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgX2FwcGx5VHJhbnNmb3JtKHRyYW5zZm9ybSkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLmNhY2hlLnBhdGNoKHRyYW5zZm9ybS5vcGVyYXRpb25zKTtcbiAgICAgICAgdGhpcy5fdHJhbnNmb3Jtc1t0cmFuc2Zvcm0uaWRdID0gdHJhbnNmb3JtO1xuICAgICAgICB0aGlzLl90cmFuc2Zvcm1JbnZlcnNlc1t0cmFuc2Zvcm0uaWRdID0gcmVzdWx0LmludmVyc2U7XG4gICAgICAgIHJldHVybiByZXN1bHQuZGF0YTtcbiAgICB9XG4gICAgX2NsZWFyVHJhbnNmb3JtRnJvbUhpc3RvcnkodHJhbnNmb3JtSWQpIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuX3RyYW5zZm9ybXNbdHJhbnNmb3JtSWRdO1xuICAgICAgICBkZWxldGUgdGhpcy5fdHJhbnNmb3JtSW52ZXJzZXNbdHJhbnNmb3JtSWRdO1xuICAgIH1cbiAgICBfbG9nQ2xlYXJlZCgpIHtcbiAgICAgICAgdGhpcy5fdHJhbnNmb3JtcyA9IHt9O1xuICAgICAgICB0aGlzLl90cmFuc2Zvcm1JbnZlcnNlcyA9IHt9O1xuICAgIH1cbiAgICBfbG9nVHJ1bmNhdGVkKHRyYW5zZm9ybUlkLCByZWxhdGl2ZVBvc2l0aW9uLCByZW1vdmVkKSB7XG4gICAgICAgIHJlbW92ZWQuZm9yRWFjaChpZCA9PiB0aGlzLl9jbGVhclRyYW5zZm9ybUZyb21IaXN0b3J5KGlkKSk7XG4gICAgfVxuICAgIF9sb2dSb2xsZWRiYWNrKHRyYW5zZm9ybUlkLCByZWxhdGl2ZVBvc2l0aW9uLCByZW1vdmVkKSB7XG4gICAgICAgIHJlbW92ZWQucmV2ZXJzZSgpLmZvckVhY2goaWQgPT4ge1xuICAgICAgICAgICAgY29uc3QgaW52ZXJzZU9wZXJhdGlvbnMgPSB0aGlzLl90cmFuc2Zvcm1JbnZlcnNlc1tpZF07XG4gICAgICAgICAgICBpZiAoaW52ZXJzZU9wZXJhdGlvbnMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNhY2hlLnBhdGNoKGludmVyc2VPcGVyYXRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2NsZWFyVHJhbnNmb3JtRnJvbUhpc3RvcnkoaWQpO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuU3RvcmUgPSBTdG9yZV8xID0gX19kZWNvcmF0ZShbc3luY2FibGUsIHF1ZXJ5YWJsZSwgdXBkYXRhYmxlXSwgU3RvcmUpO1xuZXhwb3J0IGRlZmF1bHQgU3RvcmU7Il19