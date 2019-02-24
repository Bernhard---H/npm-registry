"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _data = require("@orbit/data");

var _data2 = _interopRequireDefault(_data);

var _cache = require("./cache");

var _cache2 = _interopRequireDefault(_cache);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _createClass = function () {
    function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
        }
    }return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
    };
}();

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

var __decorate = undefined && undefined.__decorate || function (decorators, target, key, desc) {
    var c = arguments.length,
        r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc,
        d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);else for (var i = decorators.length - 1; i >= 0; i--) {
        if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    }return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var Store_1;

var assert = _data2.default.assert;

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
        _this._cache = new _cache2.default(cacheSettings);
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
            ops = (0, _data.coalesceRecordOperations)(ops);
        }
        reducedTransform = (0, _data.buildTransform)(ops, options.transformOptions);
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
}(_data.Source);
Store = Store_1 = __decorate([_data.syncable, _data.queryable, _data.updatable], Store);
exports.default = Store;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInN0b3JlLmpzIl0sIm5hbWVzIjpbIl9fZGVjb3JhdGUiLCJjIiwiYXJndW1lbnRzIiwiciIsImRlc2MiLCJPYmplY3QiLCJSZWZsZWN0IiwiaSIsImRlY29yYXRvcnMiLCJkIiwiYXNzZXJ0IiwiT3JiaXQiLCJTdG9yZSIsInNldHRpbmdzIiwia2V5TWFwIiwic2NoZW1hIiwiY2FjaGVTZXR0aW5ncyIsIlByb21pc2UiLCJyZXN1bHRzIiwiaGludHMiLCJBcnJheSIsInEiLCJvcHRpb25zIiwidHJhbnNmb3JtcyIsImZvcmtlZFN0b3JlIiwicmVkdWNlZFRyYW5zZm9ybSIsIm9wcyIsInQiLCJjb2FsZXNjZVJlY29yZE9wZXJhdGlvbnMiLCJidWlsZFRyYW5zZm9ybSIsImJhc2UiLCJmb3JrUG9pbnQiLCJiYXNlVHJhbnNmb3JtcyIsImxvY2FsVHJhbnNmb3JtcyIsImludmVyc2VPcGVyYXRpb25zIiwidHJhbnNmb3JtIiwicmVsYXRpdmVQb3NpdGlvbiIsInJlc3VsdCIsInJlbW92ZWQiLCJTdG9yZV8xIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFRQTs7OztBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFUQSxJQUFJQSxhQUFhLGFBQVEsVUFBUixVQUFBLElBQTJCLFVBQUEsVUFBQSxFQUFBLE1BQUEsRUFBQSxHQUFBLEVBQUEsSUFBQSxFQUF5QztBQUNqRixRQUFJQyxJQUFJQyxVQUFSLE1BQUE7QUFBQSxRQUNJQyxJQUFJRixJQUFBQSxDQUFBQSxHQUFBQSxNQUFBQSxHQUFpQkcsU0FBQUEsSUFBQUEsR0FBZ0JBLE9BQU9DLE9BQUFBLHdCQUFBQSxDQUFBQSxNQUFBQSxFQUF2QkQsR0FBdUJDLENBQXZCRCxHQUR6QixJQUFBO0FBQUEsUUFBQSxDQUFBO0FBR0EsUUFBSSxPQUFBLE9BQUEsS0FBQSxRQUFBLElBQStCLE9BQU9FLFFBQVAsUUFBQSxLQUFuQyxVQUFBLEVBQTJFSCxJQUFJRyxRQUFBQSxRQUFBQSxDQUFB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QTZNK0M7QUFBQSxZQUFBLFNBQUEsSUFBQTs7QUFDbkRBLGdCQUFBQSxPQUFBQSxHQUFBQSxPQUFBQSxDQUEwQixVQUFBLEVBQUEsRUFBTTtBQUM1QixnQkFBTUosb0JBQW9CLE9BQUEsa0JBQUEsQ0FBMUIsRUFBMEIsQ0FBMUI7QUFDQSxnQkFBQSxpQkFBQSxFQUF1QjtBQUNuQix1QkFBQSxLQUFBLENBQUEsS0FBQSxDQUFBLGlCQUFBO0FBQ0g7QUFDRCxtQkFBQSwwQkFBQSxDQUFBLEVBQUE7QUFMSkksU0FBQUE7QUE5TUksS0FBQTs7QUFBQSxpQkFBQSxLQUFBLEVBQUEsQ0FBQTtBQUFBLGFBQUEsT0FBQTtBQUFBLGFBQUEsWUF3Qkk7QUFDUixtQkFBTyxLQUFQLE1BQUE7QUFDSDtBQTFCTyxLQUFBLEVBQUE7QUFBQSxhQUFBLE1BQUE7QUFBQSxhQUFBLFlBMkJHO0FBQ1AsbUJBQU8sS0FBUCxLQUFBO0FBQ0g7QUE3Qk8sS0FBQSxFQUFBO0FBQUEsYUFBQSxXQUFBO0FBQUEsYUFBQSxZQThCUTtBQUNaLG1CQUFPLEtBQVAsVUFBQTtBQUNIO0FBaENPLEtBQUEsQ0FBQTs7QUFBQSxXQUFBLEtBQUE7QUFBQSxDQUFBLENBQVosWUFBWSxDQUFaO0FBdU5BMUIsUUFBUTJCLFVBQVV2QyxXQUFXLENBQUEsY0FBQSxFQUFBLGVBQUEsRUFBWEEsZUFBVyxDQUFYQSxFQUFsQlksS0FBa0JaLENBQWxCWTtrQkFDQSxLIiwic291cmNlc0NvbnRlbnQiOlsidmFyIF9fZGVjb3JhdGUgPSB0aGlzICYmIHRoaXMuX19kZWNvcmF0ZSB8fCBmdW5jdGlvbiAoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpIHtcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsXG4gICAgICAgIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLFxuICAgICAgICBkO1xuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7ZWxzZSBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgaWYgKGQgPSBkZWNvcmF0b3JzW2ldKSByID0gKGMgPCAzID8gZChyKSA6IGMgPiAzID8gZCh0YXJnZXQsIGtleSwgcikgOiBkKHRhcmdldCwga2V5KSkgfHwgcjtcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xufTtcbnZhciBTdG9yZV8xO1xuaW1wb3J0IE9yYml0LCB7IFNvdXJjZSwgc3luY2FibGUsIHF1ZXJ5YWJsZSwgdXBkYXRhYmxlLCBjb2FsZXNjZVJlY29yZE9wZXJhdGlvbnMsIGJ1aWxkVHJhbnNmb3JtIH0gZnJvbSAnQG9yYml0L2RhdGEnO1xuaW1wb3J0IENhY2hlIGZyb20gJy4vY2FjaGUnO1xuY29uc3QgeyBhc3NlcnQgfSA9IE9yYml0O1xubGV0IFN0b3JlID0gU3RvcmVfMSA9IGNsYXNzIFN0b3JlIGV4dGVuZHMgU291cmNlIHtcbiAgICBjb25zdHJ1Y3RvcihzZXR0aW5ncyA9IHt9KSB7XG4gICAgICAgIGFzc2VydCgnU3RvcmVcXCdzIGBzY2hlbWFgIG11c3QgYmUgc3BlY2lmaWVkIGluIGBzZXR0aW5ncy5zY2hlbWFgIGNvbnN0cnVjdG9yIGFyZ3VtZW50JywgISFzZXR0aW5ncy5zY2hlbWEpO1xuICAgICAgICBsZXQga2V5TWFwID0gc2V0dGluZ3Mua2V5TWFwO1xuICAgICAgICBsZXQgc2NoZW1hID0gc2V0dGluZ3Muc2NoZW1hO1xuICAgICAgICBzZXR0aW5ncy5uYW1lID0gc2V0dGluZ3MubmFtZSB8fCAnc3RvcmUnO1xuICAgICAgICBzdXBlcihzZXR0aW5ncyk7XG4gICAgICAgIHRoaXMuX3RyYW5zZm9ybXMgPSB7fTtcbiAgICAgICAgdGhpcy5fdHJhbnNmb3JtSW52ZXJzZXMgPSB7fTtcbiAgICAgICAgdGhpcy50cmFuc2Zvcm1Mb2cub24oJ2NsZWFyJywgdGhpcy5fbG9nQ2xlYXJlZC5iaW5kKHRoaXMpKTtcbiAgICAgICAgdGhpcy50cmFuc2Zvcm1Mb2cub24oJ3RydW5jYXRlJywgdGhpcy5fbG9nVHJ1bmNhdGVkLmJpbmQodGhpcykpO1xuICAgICAgICB0aGlzLnRyYW5zZm9ybUxvZy5vbigncm9sbGJhY2snLCB0aGlzLl9sb2dSb2xsZWRiYWNrLmJpbmQodGhpcykpO1xuICAgICAgICBsZXQgY2FjaGVTZXR0aW5ncyA9IHNldHRpbmdzLmNhY2hlU2V0dGluZ3MgfHwge307XG4gICAgICAgIGNhY2hlU2V0dGluZ3Muc2NoZW1hID0gc2NoZW1hO1xuICAgICAgICBjYWNoZVNldHRpbmdzLmtleU1hcCA9IGtleU1hcDtcbiAgICAgICAgY2FjaGVTZXR0aW5ncy5xdWVyeUJ1aWxkZXIgPSBjYWNoZVNldHRpbmdzLnF1ZXJ5QnVpbGRlciB8fCB0aGlzLnF1ZXJ5QnVpbGRlcjtcbiAgICAgICAgY2FjaGVTZXR0aW5ncy50cmFuc2Zvcm1CdWlsZGVyID0gY2FjaGVTZXR0aW5ncy50cmFuc2Zvcm1CdWlsZGVyIHx8IHRoaXMudHJhbnNmb3JtQnVpbGRlcjtcbiAgICAgICAgaWYgKHNldHRpbmdzLmJhc2UpIHtcbiAgICAgICAgICAgIHRoaXMuX2Jhc2UgPSBzZXR0aW5ncy5iYXNlO1xuICAgICAgICAgICAgdGhpcy5fZm9ya1BvaW50ID0gdGhpcy5fYmFzZS50cmFuc2Zvcm1Mb2cuaGVhZDtcbiAgICAgICAgICAgIGNhY2hlU2V0dGluZ3MuYmFzZSA9IHRoaXMuX2Jhc2UuY2FjaGU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fY2FjaGUgPSBuZXcgQ2FjaGUoY2FjaGVTZXR0aW5ncyk7XG4gICAgfVxuICAgIGdldCBjYWNoZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NhY2hlO1xuICAgIH1cbiAgICBnZXQgYmFzZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2Jhc2U7XG4gICAgfVxuICAgIGdldCBmb3JrUG9pbnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9mb3JrUG9pbnQ7XG4gICAgfVxuICAgIHVwZ3JhZGUoKSB7XG4gICAgICAgIHRoaXMuX2NhY2hlLnVwZ3JhZGUoKTtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIC8vIFN5bmNhYmxlIGludGVyZmFjZSBpbXBsZW1lbnRhdGlvblxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgYXN5bmMgX3N5bmModHJhbnNmb3JtKSB7XG4gICAgICAgIHRoaXMuX2FwcGx5VHJhbnNmb3JtKHRyYW5zZm9ybSk7XG4gICAgfVxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgLy8gVXBkYXRhYmxlIGludGVyZmFjZSBpbXBsZW1lbnRhdGlvblxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgYXN5bmMgX3VwZGF0ZSh0cmFuc2Zvcm0pIHtcbiAgICAgICAgbGV0IHJlc3VsdHMgPSB0aGlzLl9hcHBseVRyYW5zZm9ybSh0cmFuc2Zvcm0pO1xuICAgICAgICByZXR1cm4gcmVzdWx0cy5sZW5ndGggPT09IDEgPyByZXN1bHRzWzBdIDogcmVzdWx0cztcbiAgICB9XG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBRdWVyeWFibGUgaW50ZXJmYWNlIGltcGxlbWVudGF0aW9uXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICBhc3luYyBfcXVlcnkocXVlcnksIGhpbnRzKSB7XG4gICAgICAgIGlmIChoaW50cyAmJiBoaW50cy5kYXRhKSB7XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShoaW50cy5kYXRhKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9jYWNoZS5xdWVyeShxID0+IHEuZmluZFJlY29yZHMoaGludHMuZGF0YSkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChoaW50cy5kYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NhY2hlLnF1ZXJ5KHEgPT4gcS5maW5kUmVjb3JkKGhpbnRzLmRhdGEpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fY2FjaGUucXVlcnkocXVlcnkpO1xuICAgIH1cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIC8vIFB1YmxpYyBtZXRob2RzXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvKipcbiAgICAgQ3JlYXRlIGEgY2xvbmUsIG9yIFwiZm9ya1wiLCBmcm9tIGEgXCJiYXNlXCIgc3RvcmUuXG4gICAgICAgIFRoZSBmb3JrZWQgc3RvcmUgd2lsbCBoYXZlIHRoZSBzYW1lIGBzY2hlbWFgIGFuZCBga2V5TWFwYCBhcyBpdHMgYmFzZSBzdG9yZS5cbiAgICAgVGhlIGZvcmtlZCBzdG9yZSdzIGNhY2hlIHdpbGwgc3RhcnQgd2l0aCB0aGUgc2FtZSBpbW11dGFibGUgZG9jdW1lbnQgYXNcbiAgICAgdGhlIGJhc2Ugc3RvcmUuIEl0cyBjb250ZW50cyBhbmQgbG9nIHdpbGwgZXZvbHZlIGluZGVwZW5kZW50bHkuXG4gICAgICAgIEBtZXRob2QgZm9ya1xuICAgICBAcmV0dXJucyB7U3RvcmV9IFRoZSBmb3JrZWQgc3RvcmUuXG4gICAgKi9cbiAgICBmb3JrKHNldHRpbmdzID0ge30pIHtcbiAgICAgICAgc2V0dGluZ3Muc2NoZW1hID0gdGhpcy5fc2NoZW1hO1xuICAgICAgICBzZXR0aW5ncy5jYWNoZVNldHRpbmdzID0gc2V0dGluZ3MuY2FjaGVTZXR0aW5ncyB8fCB7fTtcbiAgICAgICAgc2V0dGluZ3Mua2V5TWFwID0gdGhpcy5fa2V5TWFwO1xuICAgICAgICBzZXR0aW5ncy5xdWVyeUJ1aWxkZXIgPSB0aGlzLnF1ZXJ5QnVpbGRlcjtcbiAgICAgICAgc2V0dGluZ3MudHJhbnNmb3JtQnVpbGRlciA9IHRoaXMudHJhbnNmb3JtQnVpbGRlcjtcbiAgICAgICAgc2V0dGluZ3MuYmFzZSA9IHRoaXM7XG4gICAgICAgIHJldHVybiBuZXcgU3RvcmVfMShzZXR0aW5ncyk7XG4gICAgfVxuICAgIC8qKlxuICAgICBNZXJnZSB0cmFuc2Zvcm1zIGZyb20gYSBmb3JrZWQgc3RvcmUgYmFjayBpbnRvIGEgYmFzZSBzdG9yZS5cbiAgICAgICAgQnkgZGVmYXVsdCwgYWxsIG9mIHRoZSBvcGVyYXRpb25zIGZyb20gYWxsIG9mIHRoZSB0cmFuc2Zvcm1zIGluIHRoZSBmb3JrZWRcbiAgICAgc3RvcmUncyBoaXN0b3J5IHdpbGwgYmUgcmVkdWNlZCBpbnRvIGEgc2luZ2xlIHRyYW5zZm9ybS4gQSBzdWJzZXQgb2ZcbiAgICAgb3BlcmF0aW9ucyBjYW4gYmUgc2VsZWN0ZWQgYnkgc3BlY2lmeWluZyB0aGUgYHNpbmNlVHJhbnNmb3JtSWRgIG9wdGlvbi5cbiAgICAgICAgVGhlIGBjb2FsZXNjZWAgb3B0aW9uIGNvbnRyb2xzIHdoZXRoZXIgb3BlcmF0aW9ucyBhcmUgY29hbGVzY2VkIGludG8gYVxuICAgICBtaW5pbWFsIGVxdWl2YWxlbnQgc2V0IGJlZm9yZSBiZWluZyByZWR1Y2VkIGludG8gYSB0cmFuc2Zvcm0uXG4gICAgICAgIEBtZXRob2QgbWVyZ2VcbiAgICAgQHBhcmFtIHtTdG9yZX0gZm9ya2VkU3RvcmUgLSBUaGUgc3RvcmUgdG8gbWVyZ2UuXG4gICAgIEBwYXJhbSB7T2JqZWN0fSAgW29wdGlvbnNdIHNldHRpbmdzXG4gICAgIEBwYXJhbSB7Qm9vbGVhbn0gW29wdGlvbnMuY29hbGVzY2UgPSB0cnVlXSBTaG91bGQgb3BlcmF0aW9ucyBiZSBjb2FsZXNjZWQgaW50byBhIG1pbmltYWwgZXF1aXZhbGVudCBzZXQ/XG4gICAgIEBwYXJhbSB7U3RyaW5nfSAgW29wdGlvbnMuc2luY2VUcmFuc2Zvcm1JZCA9IG51bGxdIFNlbGVjdCBvbmx5IHRyYW5zZm9ybXMgc2luY2UgdGhlIHNwZWNpZmllZCBJRC5cbiAgICAgQHJldHVybnMge1Byb21pc2V9IFRoZSByZXN1bHQgb2YgY2FsbGluZyBgdXBkYXRlKClgIHdpdGggdGhlIGZvcmtlZCB0cmFuc2Zvcm1zLlxuICAgICovXG4gICAgbWVyZ2UoZm9ya2VkU3RvcmUsIG9wdGlvbnMgPSB7fSkge1xuICAgICAgICBsZXQgdHJhbnNmb3JtcztcbiAgICAgICAgaWYgKG9wdGlvbnMuc2luY2VUcmFuc2Zvcm1JZCkge1xuICAgICAgICAgICAgdHJhbnNmb3JtcyA9IGZvcmtlZFN0b3JlLnRyYW5zZm9ybXNTaW5jZShvcHRpb25zLnNpbmNlVHJhbnNmb3JtSWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdHJhbnNmb3JtcyA9IGZvcmtlZFN0b3JlLmFsbFRyYW5zZm9ybXMoKTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgcmVkdWNlZFRyYW5zZm9ybTtcbiAgICAgICAgbGV0IG9wcyA9IFtdO1xuICAgICAgICB0cmFuc2Zvcm1zLmZvckVhY2godCA9PiB7XG4gICAgICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShvcHMsIHQub3BlcmF0aW9ucyk7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAob3B0aW9ucy5jb2FsZXNjZSAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIG9wcyA9IGNvYWxlc2NlUmVjb3JkT3BlcmF0aW9ucyhvcHMpO1xuICAgICAgICB9XG4gICAgICAgIHJlZHVjZWRUcmFuc2Zvcm0gPSBidWlsZFRyYW5zZm9ybShvcHMsIG9wdGlvbnMudHJhbnNmb3JtT3B0aW9ucyk7XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZShyZWR1Y2VkVHJhbnNmb3JtKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogVGhpcyByZWJhc2UgbWV0aG9kIHdvcmtzIHNpbWlsYXJseSB0byBhIGdpdCByZWJhc2U6XG4gICAgICpcbiAgICAgKiBBZnRlciBhIHN0b3JlIGlzIGZvcmtlZCwgdGhlcmUgaXMgYSBwYXJlbnQtIGFuZCBhIGNoaWxkLXN0b3JlLlxuICAgICAqIEJvdGggbWF5IGJlIHVwZGF0ZWQgd2l0aCB0cmFuc2Zvcm1zLlxuICAgICAqIElmIGFmdGVyIHNvbWUgdXBkYXRlcyBvbiBib3RoIHN0b3JlcyBgY2hpbGRTdG9yZS5yZWJhc2UoKWAgaXMgY2FsbGVkLFxuICAgICAqIHRoZSByZXN1bHQgb24gdGhlIGNoaWxkIHN0b3JlIHdpbGwgbG9vayBsaWtlLFxuICAgICAqIGFzIGlmIGFsbCB1cGRhdGVzIHRvIHRoZSBwYXJlbnQgc3RvcmUgd2VyZSBhZGRlZCBmaXJzdCxcbiAgICAgKiBmb2xsb3dlZCBieSB0aG9zZSBtYWRlIGluIHRoZSBjaGlsZCBzdG9yZS5cbiAgICAgKiBUaGlzIG1lYW5zIHRoYXQgdXBkYXRlcyBpbiB0aGUgY2hpbGQgc3RvcmUgaGF2ZSBhIHRlbmRlbmN5IG9mIHdpbm5pbmcuXG4gICAgICovXG4gICAgcmViYXNlKCkge1xuICAgICAgICBsZXQgYmFzZSA9IHRoaXMuX2Jhc2U7XG4gICAgICAgIGxldCBmb3JrUG9pbnQgPSB0aGlzLl9mb3JrUG9pbnQ7XG4gICAgICAgIGFzc2VydCgnQSBgYmFzZWAgc3RvcmUgbXVzdCBiZSBkZWZpbmVkIGZvciBgcmViYXNlYCB0byB3b3JrJywgISFiYXNlKTtcbiAgICAgICAgLy9hc3NlcnQoJ0EgYGZvcmtQb2ludGAgbXVzdCBiZSBkZWZpbmVkIGZvciBgcmViYXNlYCB0byB3b3JrJywgISFmb3JrUG9pbnQpO1xuICAgICAgICBsZXQgYmFzZVRyYW5zZm9ybXM7XG4gICAgICAgIGlmIChmb3JrUG9pbnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gc3RvcmUgd2FzIGVtcHR5IGF0IGZvcmsgcG9pbnRcbiAgICAgICAgICAgIGJhc2VUcmFuc2Zvcm1zID0gYmFzZS5hbGxUcmFuc2Zvcm1zKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBiYXNlVHJhbnNmb3JtcyA9IGJhc2UudHJhbnNmb3Jtc1NpbmNlKGZvcmtQb2ludCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGJhc2VUcmFuc2Zvcm1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGxldCBsb2NhbFRyYW5zZm9ybXMgPSB0aGlzLmFsbFRyYW5zZm9ybXMoKTtcbiAgICAgICAgICAgIGxvY2FsVHJhbnNmb3Jtcy5yZXZlcnNlKCkuZm9yRWFjaCh0cmFuc2Zvcm0gPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGludmVyc2VPcGVyYXRpb25zID0gdGhpcy5fdHJhbnNmb3JtSW52ZXJzZXNbdHJhbnNmb3JtLmlkXTtcbiAgICAgICAgICAgICAgICBpZiAoaW52ZXJzZU9wZXJhdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jYWNoZS5wYXRjaChpbnZlcnNlT3BlcmF0aW9ucyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuX2NsZWFyVHJhbnNmb3JtRnJvbUhpc3RvcnkodHJhbnNmb3JtLmlkKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYmFzZVRyYW5zZm9ybXMuZm9yRWFjaCh0cmFuc2Zvcm0gPT4gdGhpcy5fYXBwbHlUcmFuc2Zvcm0odHJhbnNmb3JtKSk7XG4gICAgICAgICAgICBsb2NhbFRyYW5zZm9ybXMuZm9yRWFjaCh0cmFuc2Zvcm0gPT4gdGhpcy5fYXBwbHlUcmFuc2Zvcm0odHJhbnNmb3JtKSk7XG4gICAgICAgICAgICB0aGlzLl9mb3JrUG9pbnQgPSBiYXNlLnRyYW5zZm9ybUxvZy5oZWFkO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICBSb2xscyBiYWNrIHRoZSBTdG9yZSB0byBhIHBhcnRpY3VsYXIgdHJhbnNmb3JtSWRcbiAgICAgICAgQG1ldGhvZCByb2xsYmFja1xuICAgICBAcGFyYW0ge3N0cmluZ30gdHJhbnNmb3JtSWQgLSBUaGUgSUQgb2YgdGhlIHRyYW5zZm9ybSB0byByb2xsIGJhY2sgdG9cbiAgICAgQHBhcmFtIHtudW1iZXJ9IHJlbGF0aXZlUG9zaXRpb24gLSBBIHBvc2l0aXZlIG9yIG5lZ2F0aXZlIGludGVnZXIgdG8gc3BlY2lmeSBhIHBvc2l0aW9uIHJlbGF0aXZlIHRvIGB0cmFuc2Zvcm1JZGBcbiAgICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICAqL1xuICAgIHJvbGxiYWNrKHRyYW5zZm9ybUlkLCByZWxhdGl2ZVBvc2l0aW9uID0gMCkge1xuICAgICAgICByZXR1cm4gdGhpcy50cmFuc2Zvcm1Mb2cucm9sbGJhY2sodHJhbnNmb3JtSWQsIHJlbGF0aXZlUG9zaXRpb24pO1xuICAgIH1cbiAgICAvKipcbiAgICAgUmV0dXJucyBhbGwgdHJhbnNmb3JtcyBzaW5jZSBhIHBhcnRpY3VsYXIgYHRyYW5zZm9ybUlkYC5cbiAgICAgICAgQG1ldGhvZCB0cmFuc2Zvcm1zU2luY2VcbiAgICAgQHBhcmFtIHtzdHJpbmd9IHRyYW5zZm9ybUlkIC0gVGhlIElEIG9mIHRoZSB0cmFuc2Zvcm0gdG8gc3RhcnQgd2l0aC5cbiAgICAgQHJldHVybnMge0FycmF5fSBBcnJheSBvZiB0cmFuc2Zvcm1zLlxuICAgICovXG4gICAgdHJhbnNmb3Jtc1NpbmNlKHRyYW5zZm9ybUlkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRyYW5zZm9ybUxvZy5hZnRlcih0cmFuc2Zvcm1JZCkubWFwKGlkID0+IHRoaXMuX3RyYW5zZm9ybXNbaWRdKTtcbiAgICB9XG4gICAgLyoqXG4gICAgIFJldHVybnMgYWxsIHRyYWNrZWQgdHJhbnNmb3Jtcy5cbiAgICAgICAgQG1ldGhvZCBhbGxUcmFuc2Zvcm1zXG4gICAgIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2YgdHJhbnNmb3Jtcy5cbiAgICAqL1xuICAgIGFsbFRyYW5zZm9ybXMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRyYW5zZm9ybUxvZy5lbnRyaWVzLm1hcChpZCA9PiB0aGlzLl90cmFuc2Zvcm1zW2lkXSk7XG4gICAgfVxuICAgIGdldFRyYW5zZm9ybSh0cmFuc2Zvcm1JZCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdHJhbnNmb3Jtc1t0cmFuc2Zvcm1JZF07XG4gICAgfVxuICAgIGdldEludmVyc2VPcGVyYXRpb25zKHRyYW5zZm9ybUlkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl90cmFuc2Zvcm1JbnZlcnNlc1t0cmFuc2Zvcm1JZF07XG4gICAgfVxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgLy8gUHJvdGVjdGVkIG1ldGhvZHNcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIF9hcHBseVRyYW5zZm9ybSh0cmFuc2Zvcm0pIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5jYWNoZS5wYXRjaCh0cmFuc2Zvcm0ub3BlcmF0aW9ucyk7XG4gICAgICAgIHRoaXMuX3RyYW5zZm9ybXNbdHJhbnNmb3JtLmlkXSA9IHRyYW5zZm9ybTtcbiAgICAgICAgdGhpcy5fdHJhbnNmb3JtSW52ZXJzZXNbdHJhbnNmb3JtLmlkXSA9IHJlc3VsdC5pbnZlcnNlO1xuICAgICAgICByZXR1cm4gcmVzdWx0LmRhdGE7XG4gICAgfVxuICAgIF9jbGVhclRyYW5zZm9ybUZyb21IaXN0b3J5KHRyYW5zZm9ybUlkKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLl90cmFuc2Zvcm1zW3RyYW5zZm9ybUlkXTtcbiAgICAgICAgZGVsZXRlIHRoaXMuX3RyYW5zZm9ybUludmVyc2VzW3RyYW5zZm9ybUlkXTtcbiAgICB9XG4gICAgX2xvZ0NsZWFyZWQoKSB7XG4gICAgICAgIHRoaXMuX3RyYW5zZm9ybXMgPSB7fTtcbiAgICAgICAgdGhpcy5fdHJhbnNmb3JtSW52ZXJzZXMgPSB7fTtcbiAgICB9XG4gICAgX2xvZ1RydW5jYXRlZCh0cmFuc2Zvcm1JZCwgcmVsYXRpdmVQb3NpdGlvbiwgcmVtb3ZlZCkge1xuICAgICAgICByZW1vdmVkLmZvckVhY2goaWQgPT4gdGhpcy5fY2xlYXJUcmFuc2Zvcm1Gcm9tSGlzdG9yeShpZCkpO1xuICAgIH1cbiAgICBfbG9nUm9sbGVkYmFjayh0cmFuc2Zvcm1JZCwgcmVsYXRpdmVQb3NpdGlvbiwgcmVtb3ZlZCkge1xuICAgICAgICByZW1vdmVkLnJldmVyc2UoKS5mb3JFYWNoKGlkID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGludmVyc2VPcGVyYXRpb25zID0gdGhpcy5fdHJhbnNmb3JtSW52ZXJzZXNbaWRdO1xuICAgICAgICAgICAgaWYgKGludmVyc2VPcGVyYXRpb25zKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jYWNoZS5wYXRjaChpbnZlcnNlT3BlcmF0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9jbGVhclRyYW5zZm9ybUZyb21IaXN0b3J5KGlkKTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcblN0b3JlID0gU3RvcmVfMSA9IF9fZGVjb3JhdGUoW3N5bmNhYmxlLCBxdWVyeWFibGUsIHVwZGF0YWJsZV0sIFN0b3JlKTtcbmV4cG9ydCBkZWZhdWx0IFN0b3JlOyJdfQ==