"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _data = require("@orbit/data");

var _data2 = _interopRequireDefault(_data);

var _utils = require("@orbit/utils");

var _jsonapiSerializer = require("./jsonapi-serializer");

var _jsonapiSerializer2 = _interopRequireDefault(_jsonapiSerializer);

var _queryParams = require("./lib/query-params");

var _pullOperators = require("./lib/pull-operators");

var _transformRequests = require("./lib/transform-requests");

var _exceptions = require("./lib/exceptions");

var _queryOperators = require("./lib/query-operators");

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
/* eslint-disable valid-jsdoc */

/**
 Source for accessing a JSON API compliant RESTful API with a network fetch
 request.

 If a single transform or query requires more than one fetch request,
 requests will be performed sequentially and resolved together. From the
 perspective of Orbit, these operations will all succeed or fail together. The
 `maxRequestsPerTransform` and `maxRequestsPerQuery` settings allow limits to be
 set on this behavior. These settings should be set to `1` if your client/server
 configuration is unable to resolve partially successful transforms / queries.

 @class JSONAPISource
 @extends Source
 */
var JSONAPISource = function (_Source) {
    _inherits(JSONAPISource, _Source);

    function JSONAPISource() {
        var settings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        _classCallCheck(this, JSONAPISource);

        (0, _utils.assert)('JSONAPISource\'s `schema` must be specified in `settings.schema` constructor argument', !!settings.schema);
        (0, _utils.assert)('JSONAPISource requires Orbit.Promise be defined', _data2.default.Promise);
        settings.name = settings.name || 'jsonapi';

        var _this = _possibleConstructorReturn(this, _Source.call(this, settings));

        _this.namespace = settings.namespace;
        _this.host = settings.host;
        _this.initDefaultFetchSettings(settings);
        _this.maxRequestsPerTransform = settings.maxRequestsPerTransform;
        var SerializerClass = settings.SerializerClass || _jsonapiSerializer2.default;
        _this.serializer = new SerializerClass({ schema: settings.schema, keyMap: settings.keyMap });
        return _this;
    }

    /////////////////////////////////////////////////////////////////////////////
    // Pushable interface implementation
    /////////////////////////////////////////////////////////////////////////////
    JSONAPISource.prototype._push = function _push(transform) {
        var _this2 = this;

        var requests = (0, _transformRequests.getTransformRequests)(this, transform);
        if (this.maxRequestsPerTransform && requests.length > this.maxRequestsPerTransform) {
            return _data2.default.Promise.resolve().then(function () {
                throw new _data.TransformNotAllowed("This transform requires " + requests.length + " requests, which exceeds the specified limit of " + _this2.maxRequestsPerTransform + " requests per transform.", transform);
            });
        }
        return this._processRequests(requests, _transformRequests.TransformRequestProcessors).then(function (transforms) {
            transforms.unshift(transform);
            return transforms;
        });
    };
    /////////////////////////////////////////////////////////////////////////////
    // Pullable interface implementation
    /////////////////////////////////////////////////////////////////////////////


    JSONAPISource.prototype._pull = function _pull(query) {
        var operator = _pullOperators.PullOperators[query.expression.op];
        if (!operator) {
            throw new Error('JSONAPISource does not support the `${query.expression.op}` operator for queries.');
        }
        return operator(this, query);
    };
    /////////////////////////////////////////////////////////////////////////////
    // Pullable interface implementation
    /////////////////////////////////////////////////////////////////////////////


    JSONAPISource.prototype._query = function _query(query) {
        var operator = _queryOperators.QueryOperators[query.expression.op];
        if (!operator) {
            throw new Error('JSONAPISource does not support the `${query.expression.op}` operator for queries.');
        }
        return operator(this, query);
    };
    /////////////////////////////////////////////////////////////////////////////
    // Publicly accessible methods particular to JSONAPISource
    /////////////////////////////////////////////////////////////////////////////


    JSONAPISource.prototype.fetch = function (_fetch) {
        function fetch(_x, _x2) {
            return _fetch.apply(this, arguments);
        }

        fetch.toString = function () {
            return _fetch.toString();
        };

        return fetch;
    }(function (url, customSettings) {
        var _this3 = this;

        var settings = this.initFetchSettings(customSettings);
        var fullUrl = url;
        if (settings.params) {
            fullUrl = (0, _queryParams.appendQueryParams)(fullUrl, settings.params);
            delete settings.params;
        }
        // console.log('fetch', fullUrl, mergedSettings, 'polyfill', fetch.polyfill);
        var fetchFn = _data2.default.fetch || fetch;
        if (settings.timeout) {
            var timeout = settings.timeout;
            delete settings.timeout;
            return new _data2.default.Promise(function (resolve, reject) {
                var timedOut = void 0;
                var timer = _data2.default.globals.setTimeout(function () {
                    timedOut = true;
                    reject(new _data.NetworkError("No fetch response within " + timeout + "ms."));
                }, timeout);
                fetchFn(fullUrl, settings).catch(function (e) {
                    _data2.default.globals.clearTimeout(timer);
                    if (!timedOut) {
                        return _this3.handleFetchError(e);
                    }
                }).then(function (response) {
                    _data2.default.globals.clearTimeout(timer);
                    if (!timedOut) {
                        return _this3.handleFetchResponse(response);
                    }
                }).then(resolve, reject);
            });
        } else {
            return fetchFn(fullUrl, settings).catch(function (e) {
                return _this3.handleFetchError(e);
            }).then(function (response) {
                return _this3.handleFetchResponse(response);
            });
        }
    });

    JSONAPISource.prototype.initFetchSettings = function initFetchSettings() {
        var customSettings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        var settings = (0, _utils.deepMerge)({}, this.defaultFetchSettings, customSettings);
        if (settings.json) {
            (0, _utils.assert)('`json` and `body` can\'t both be set for fetch requests.', !settings.body);
            settings.body = JSON.stringify(settings.json);
            delete settings.json;
        }
        if (settings.headers && !settings.body) {
            delete settings.headers['Content-Type'];
        }
        return settings;
    };

    JSONAPISource.prototype.handleFetchResponse = function handleFetchResponse(response) {
        var _this4 = this;

        if (response.status === 201) {
            if (this.responseHasContent(response)) {
                return response.json();
            } else {
                throw new _exceptions.InvalidServerResponse("Server responses with a " + response.status + " status should return content with a Content-Type that includes 'application/vnd.api+json'.");
            }
        } else if (response.status >= 200 && response.status < 300) {
            if (this.responseHasContent(response)) {
                return response.json();
            }
        } else {
            if (this.responseHasContent(response)) {
                return response.json().then(function (data) {
                    return _this4.handleFetchResponseError(response, data);
                });
            } else {
                return this.handleFetchResponseError(response);
            }
        }
        return _data2.default.Promise.resolve();
    };

    JSONAPISource.prototype.handleFetchResponseError = function handleFetchResponseError(response, data) {
        var error = void 0;
        if (response.status >= 400 && response.status < 500) {
            error = new _data.ClientError(response.statusText);
        } else {
            error = new _data.ServerError(response.statusText);
        }
        error.response = response;
        error.data = data;
        return _data2.default.Promise.reject(error);
    };

    JSONAPISource.prototype.handleFetchError = function handleFetchError(e) {
        var error = new _data.NetworkError(e);
        return _data2.default.Promise.reject(error);
    };

    JSONAPISource.prototype.responseHasContent = function responseHasContent(response) {
        var contentType = response.headers.get('Content-Type');
        return contentType && contentType.indexOf('application/vnd.api+json') > -1;
    };

    JSONAPISource.prototype.resourceNamespace = function resourceNamespace(type) {
        return this.namespace;
    };

    JSONAPISource.prototype.resourceHost = function resourceHost(type) {
        return this.host;
    };

    JSONAPISource.prototype.resourcePath = function resourcePath(type, id) {
        var path = [this.serializer.resourceType(type)];
        if (id) {
            var resourceId = this.serializer.resourceId(type, id);
            if (resourceId) {
                path.push(resourceId);
            }
        }
        return path.join('/');
    };

    JSONAPISource.prototype.resourceURL = function resourceURL(type, id) {
        var host = this.resourceHost(type);
        var namespace = this.resourceNamespace(type);
        var url = [];
        if (host) {
            url.push(host);
        }
        if (namespace) {
            url.push(namespace);
        }
        url.push(this.resourcePath(type, id));
        if (!host) {
            url.unshift('');
        }
        return url.join('/');
    };

    JSONAPISource.prototype.resourceRelationshipURL = function resourceRelationshipURL(type, id, relationship) {
        return this.resourceURL(type, id) + '/relationships/' + this.serializer.resourceRelationship(type, relationship);
    };

    JSONAPISource.prototype.relatedResourceURL = function relatedResourceURL(type, id, relationship) {
        return this.resourceURL(type, id) + '/' + this.serializer.resourceRelationship(type, relationship);
    };
    /////////////////////////////////////////////////////////////////////////////
    // Private methods
    /////////////////////////////////////////////////////////////////////////////


    JSONAPISource.prototype.initDefaultFetchSettings = function initDefaultFetchSettings(settings) {
        this.defaultFetchSettings = {
            headers: {
                Accept: 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json'
            },
            timeout: 5000
        };
        if (settings.defaultFetchHeaders || settings.defaultFetchTimeout) {
            (0, _utils.deprecate)('JSONAPISource: Pass `defaultFetchSettings` with `headers` instead of `defaultFetchHeaders` to initialize source', settings.defaultFetchHeaders === undefined);
            (0, _utils.deprecate)('JSONAPISource: Pass `defaultFetchSettings` with `timeout` instead of `defaultFetchTimeout` to initialize source', settings.defaultFetchTimeout === undefined);
            (0, _utils.deepMerge)(this.defaultFetchSettings, {
                headers: settings.defaultFetchHeaders,
                timeout: settings.defaultFetchTimeout
            });
        }
        if (settings.defaultFetchSettings) {
            (0, _utils.deepMerge)(this.defaultFetchSettings, settings.defaultFetchSettings);
        }
    };

    JSONAPISource.prototype._processRequests = function _processRequests(requests, processors) {
        var _this5 = this;

        var transforms = [];
        var result = _data2.default.Promise.resolve();
        requests.forEach(function (request) {
            var processor = processors[request.op];
            result = result.then(function () {
                return processor(_this5, request).then(function (additionalTransforms) {
                    if (additionalTransforms) {
                        Array.prototype.push.apply(transforms, additionalTransforms);
                    }
                });
            });
        });
        return result.then(function () {
            return transforms;
        });
    };

    _createClass(JSONAPISource, [{
        key: "defaultFetchHeaders",
        get: function () {
            (0, _utils.deprecate)('JSONAPISource: Access `defaultFetchSettings.headers` instead of `defaultFetchHeaders`');
            return this.defaultFetchSettings.headers;
        },
        set: function (headers) {
            (0, _utils.deprecate)('JSONAPISource: Access `defaultFetchSettings.headers` instead of `defaultFetchHeaders`');
            this.defaultFetchSettings.headers = headers;
        }
    }, {
        key: "defaultFetchTimeout",
        get: function () {
            (0, _utils.deprecate)('JSONAPISource: Access `defaultFetchSettings.timeout` instead of `defaultFetchTimeout`');
            return this.defaultFetchSettings.timeout;
        },
        set: function (timeout) {
            (0, _utils.deprecate)('JSONAPISource: Access `defaultFetchSettings.timeout` instead of `defaultFetchTimeout`');
            this.defaultFetchSettings.timeout = timeout;
        }
    }]);

    return JSONAPISource;
}(_data.Source);
JSONAPISource = __decorate([_data.pullable, _data.pushable, _data.queryable], JSONAPISource);
exports.default = JSONAPISource;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpzb25hcGktc291cmNlLmpzIl0sIm5hbWVzIjpbIl9fZGVjb3JhdGUiLCJjIiwiYXJndW1lbnRzIiwiciIsImRlc2MiLCJPYmplY3QiLCJSZWZsZWN0IiwiaSIsImRlY29yYXRvcnMiLCJkIiwic2V0dGluZ3MiLCJhc3NlcnQiLCJPcmJpdCIsIlNlcmlhbGl6ZXJDbGFzcyIsInNjaGVtYSIsImtleU1hcCIsImRlcHJlY2F0ZSIsInJlcXVlc3RzIiwiZ2V0VHJhbnNmb3JtUmVxdWVzdHMiLCJ0cmFuc2Zvcm1zIiwib3BlcmF0b3IiLCJQdWxsT3BlcmF0b3JzIiwicXVlcnkiLCJRdWVyeU9wZXJhdG9ycyIsImZ1bGxVcmwiLCJhcHBlbmRRdWVyeVBhcmFtcyIsImZldGNoRm4iLCJ0aW1lb3V0IiwidGltZWRPdXQiLCJ0aW1lciIsInJlamVjdCIsImN1c3RvbVNldHRpbmdzIiwiZGVlcE1lcmdlIiwiSlNPTiIsInJlc3BvbnNlIiwiZXJyb3IiLCJjb250ZW50VHlwZSIsInBhdGgiLCJyZXNvdXJjZUlkIiwiaG9zdCIsIm5hbWVzcGFjZSIsInVybCIsImhlYWRlcnMiLCJBY2NlcHQiLCJkZWZhdWx0RmV0Y2hUaW1lb3V0IiwicmVzdWx0IiwicHJvY2Vzc29yIiwicHJvY2Vzc29ycyIsInJlcXVlc3QiLCJBcnJheSIsIkpTT05BUElTb3VyY2UiXSwibWFwcGluZ3MiOiI7Ozs7OztBQVFBOzs7O0FBQ0E7O0FBQ0E7Ozs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWZBLElBQUlBLGFBQWEsYUFBUSxVQUFSLFVBQUEsSUFBMkIsVUFBQSxVQUFBLEVBQUEsTUFBQSxFQUFBLEdBQUEsRUFBQSxJQUFBLEVBQXlDO0FBQ2pGLFFBQUlDLElBQUlDLFVBQVIsTUFBQTtBQUFBLFFBQ0lDLElBQUlGLElBQUFBLENBQUFBLEdBQUFBLE1BQUFBLEdBQWlCRyxTQUFBQSxJQUFBQSxHQUFnQkEsT0FB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QUEsRUFBMEI7QUFDdEJJLDhCQUFBQSxTQUFBQSxDQUFBQSxJQUFBQSxDQUFBQSxLQUFBQSxDQUFBQSxVQUFBQSxFQUFBQSxvQkFBQUE7QUFDSDtBQUhMLGlCQUFPLENBQVA7QUFESkosYUFBUyxDQUFUQTtBQUZKNUIsU0FBQUE7QUFVQSxlQUFPLE9BQUEsSUFBQSxDQUFZLFlBQUE7QUFBQSxtQkFBQSxVQUFBO0FBQW5CLFNBQU8sQ0FBUDtBQWxPSixLQUFBOztBQUFBLGlCQUFBLGFBQUEsRUFBQSxDQUFBO0FBQUEsYUFBQSxxQkFBQTtBQUFBLGFBQUEsWUFhMEI7QUFDdEJELGtDQUFBQSx1RkFBQUE7QUFDQSxtQkFBTyxLQUFBLG9CQUFBLENBQVAsT0FBQTtBQWZKLFNBQUE7QUFBQSxhQUFBLFVBQUEsT0FBQSxFQWlCaUM7QUFDN0JBLGtDQUFBQSx1RkFBQUE7QUFDQSxpQkFBQSxvQkFBQSxDQUFBLE9BQUEsR0FBQSxPQUFBO0FBQ0g7QUFwQkQsS0FBQSxFQUFBO0FBQUEsYUFBQSxxQkFBQTtBQUFBLGFBQUEsWUFxQjBCO0FBQ3RCQSxrQ0FBQUEsdUZBQUFBO0FBQ0EsbUJBQU8sS0FBQSxvQkFBQSxDQUFQLE9BQUE7QUF2QkosU0FBQTtBQUFBLGFBQUEsVUFBQSxPQUFBLEVBeUJpQztBQUM3QkEsa0NBQUFBLHVGQUFBQTtBQUNBLGlCQUFBLG9CQUFBLENBQUEsT0FBQSxHQUFBLE9BQUE7QUFDSDtBQTVCRCxLQUFBLENBQUE7O0FBQUEsV0FBQSxhQUFBO0FBQUEsQ0FBQSxDQUFKLFlBQUksQ0FBSjtBQXFPQWtDLGdCQUFnQmxELFdBQVcsQ0FBQSxjQUFBLEVBQUEsY0FBQSxFQUFYQSxlQUFXLENBQVhBLEVBQWhCa0QsYUFBZ0JsRCxDQUFoQmtEO2tCQUNBLGEiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgX19kZWNvcmF0ZSA9IHRoaXMgJiYgdGhpcy5fX2RlY29yYXRlIHx8IGZ1bmN0aW9uIChkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xuICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aCxcbiAgICAgICAgciA9IGMgPCAzID8gdGFyZ2V0IDogZGVzYyA9PT0gbnVsbCA/IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KSA6IGRlc2MsXG4gICAgICAgIGQ7XG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xuICAgIHJldHVybiBjID4gMyAmJiByICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgciksIHI7XG59O1xuLyogZXNsaW50LWRpc2FibGUgdmFsaWQtanNkb2MgKi9cbmltcG9ydCBPcmJpdCwgeyBTb3VyY2UsIHB1bGxhYmxlLCBwdXNoYWJsZSwgVHJhbnNmb3JtTm90QWxsb3dlZCwgQ2xpZW50RXJyb3IsIFNlcnZlckVycm9yLCBOZXR3b3JrRXJyb3IsIHF1ZXJ5YWJsZSB9IGZyb20gJ0BvcmJpdC9kYXRhJztcbmltcG9ydCB7IGFzc2VydCwgZGVlcE1lcmdlLCBkZXByZWNhdGUgfSBmcm9tICdAb3JiaXQvdXRpbHMnO1xuaW1wb3J0IEpTT05BUElTZXJpYWxpemVyIGZyb20gJy4vanNvbmFwaS1zZXJpYWxpemVyJztcbmltcG9ydCB7IGFwcGVuZFF1ZXJ5UGFyYW1zIH0gZnJvbSAnLi9saWIvcXVlcnktcGFyYW1zJztcbmltcG9ydCB7IFB1bGxPcGVyYXRvcnMgfSBmcm9tICcuL2xpYi9wdWxsLW9wZXJhdG9ycyc7XG5pbXBvcnQgeyBnZXRUcmFuc2Zvcm1SZXF1ZXN0cywgVHJhbnNmb3JtUmVxdWVzdFByb2Nlc3NvcnMgfSBmcm9tICcuL2xpYi90cmFuc2Zvcm0tcmVxdWVzdHMnO1xuaW1wb3J0IHsgSW52YWxpZFNlcnZlclJlc3BvbnNlIH0gZnJvbSAnLi9saWIvZXhjZXB0aW9ucyc7XG5pbXBvcnQgeyBRdWVyeU9wZXJhdG9ycyB9IGZyb20gXCIuL2xpYi9xdWVyeS1vcGVyYXRvcnNcIjtcbi8qKlxuIFNvdXJjZSBmb3IgYWNjZXNzaW5nIGEgSlNPTiBBUEkgY29tcGxpYW50IFJFU1RmdWwgQVBJIHdpdGggYSBuZXR3b3JrIGZldGNoXG4gcmVxdWVzdC5cblxuIElmIGEgc2luZ2xlIHRyYW5zZm9ybSBvciBxdWVyeSByZXF1aXJlcyBtb3JlIHRoYW4gb25lIGZldGNoIHJlcXVlc3QsXG4gcmVxdWVzdHMgd2lsbCBiZSBwZXJmb3JtZWQgc2VxdWVudGlhbGx5IGFuZCByZXNvbHZlZCB0b2dldGhlci4gRnJvbSB0aGVcbiBwZXJzcGVjdGl2ZSBvZiBPcmJpdCwgdGhlc2Ugb3BlcmF0aW9ucyB3aWxsIGFsbCBzdWNjZWVkIG9yIGZhaWwgdG9nZXRoZXIuIFRoZVxuIGBtYXhSZXF1ZXN0c1BlclRyYW5zZm9ybWAgYW5kIGBtYXhSZXF1ZXN0c1BlclF1ZXJ5YCBzZXR0aW5ncyBhbGxvdyBsaW1pdHMgdG8gYmVcbiBzZXQgb24gdGhpcyBiZWhhdmlvci4gVGhlc2Ugc2V0dGluZ3Mgc2hvdWxkIGJlIHNldCB0byBgMWAgaWYgeW91ciBjbGllbnQvc2VydmVyXG4gY29uZmlndXJhdGlvbiBpcyB1bmFibGUgdG8gcmVzb2x2ZSBwYXJ0aWFsbHkgc3VjY2Vzc2Z1bCB0cmFuc2Zvcm1zIC8gcXVlcmllcy5cblxuIEBjbGFzcyBKU09OQVBJU291cmNlXG4gQGV4dGVuZHMgU291cmNlXG4gKi9cbmxldCBKU09OQVBJU291cmNlID0gY2xhc3MgSlNPTkFQSVNvdXJjZSBleHRlbmRzIFNvdXJjZSB7XG4gICAgY29uc3RydWN0b3Ioc2V0dGluZ3MgPSB7fSkge1xuICAgICAgICBhc3NlcnQoJ0pTT05BUElTb3VyY2VcXCdzIGBzY2hlbWFgIG11c3QgYmUgc3BlY2lmaWVkIGluIGBzZXR0aW5ncy5zY2hlbWFgIGNvbnN0cnVjdG9yIGFyZ3VtZW50JywgISFzZXR0aW5ncy5zY2hlbWEpO1xuICAgICAgICBhc3NlcnQoJ0pTT05BUElTb3VyY2UgcmVxdWlyZXMgT3JiaXQuUHJvbWlzZSBiZSBkZWZpbmVkJywgT3JiaXQuUHJvbWlzZSk7XG4gICAgICAgIHNldHRpbmdzLm5hbWUgPSBzZXR0aW5ncy5uYW1lIHx8ICdqc29uYXBpJztcbiAgICAgICAgc3VwZXIoc2V0dGluZ3MpO1xuICAgICAgICB0aGlzLm5hbWVzcGFjZSA9IHNldHRpbmdzLm5hbWVzcGFjZTtcbiAgICAgICAgdGhpcy5ob3N0ID0gc2V0dGluZ3MuaG9zdDtcbiAgICAgICAgdGhpcy5pbml0RGVmYXVsdEZldGNoU2V0dGluZ3Moc2V0dGluZ3MpO1xuICAgICAgICB0aGlzLm1heFJlcXVlc3RzUGVyVHJhbnNmb3JtID0gc2V0dGluZ3MubWF4UmVxdWVzdHNQZXJUcmFuc2Zvcm07XG4gICAgICAgIGNvbnN0IFNlcmlhbGl6ZXJDbGFzcyA9IHNldHRpbmdzLlNlcmlhbGl6ZXJDbGFzcyB8fCBKU09OQVBJU2VyaWFsaXplcjtcbiAgICAgICAgdGhpcy5zZXJpYWxpemVyID0gbmV3IFNlcmlhbGl6ZXJDbGFzcyh7IHNjaGVtYTogc2V0dGluZ3Muc2NoZW1hLCBrZXlNYXA6IHNldHRpbmdzLmtleU1hcCB9KTtcbiAgICB9XG4gICAgZ2V0IGRlZmF1bHRGZXRjaEhlYWRlcnMoKSB7XG4gICAgICAgIGRlcHJlY2F0ZSgnSlNPTkFQSVNvdXJjZTogQWNjZXNzIGBkZWZhdWx0RmV0Y2hTZXR0aW5ncy5oZWFkZXJzYCBpbnN0ZWFkIG9mIGBkZWZhdWx0RmV0Y2hIZWFkZXJzYCcpO1xuICAgICAgICByZXR1cm4gdGhpcy5kZWZhdWx0RmV0Y2hTZXR0aW5ncy5oZWFkZXJzO1xuICAgIH1cbiAgICBzZXQgZGVmYXVsdEZldGNoSGVhZGVycyhoZWFkZXJzKSB7XG4gICAgICAgIGRlcHJlY2F0ZSgnSlNPTkFQSVNvdXJjZTogQWNjZXNzIGBkZWZhdWx0RmV0Y2hTZXR0aW5ncy5oZWFkZXJzYCBpbnN0ZWFkIG9mIGBkZWZhdWx0RmV0Y2hIZWFkZXJzYCcpO1xuICAgICAgICB0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzLmhlYWRlcnMgPSBoZWFkZXJzO1xuICAgIH1cbiAgICBnZXQgZGVmYXVsdEZldGNoVGltZW91dCgpIHtcbiAgICAgICAgZGVwcmVjYXRlKCdKU09OQVBJU291cmNlOiBBY2Nlc3MgYGRlZmF1bHRGZXRjaFNldHRpbmdzLnRpbWVvdXRgIGluc3RlYWQgb2YgYGRlZmF1bHRGZXRjaFRpbWVvdXRgJyk7XG4gICAgICAgIHJldHVybiB0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzLnRpbWVvdXQ7XG4gICAgfVxuICAgIHNldCBkZWZhdWx0RmV0Y2hUaW1lb3V0KHRpbWVvdXQpIHtcbiAgICAgICAgZGVwcmVjYXRlKCdKU09OQVBJU291cmNlOiBBY2Nlc3MgYGRlZmF1bHRGZXRjaFNldHRpbmdzLnRpbWVvdXRgIGluc3RlYWQgb2YgYGRlZmF1bHRGZXRjaFRpbWVvdXRgJyk7XG4gICAgICAgIHRoaXMuZGVmYXVsdEZldGNoU2V0dGluZ3MudGltZW91dCA9IHRpbWVvdXQ7XG4gICAgfVxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgLy8gUHVzaGFibGUgaW50ZXJmYWNlIGltcGxlbWVudGF0aW9uXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICBfcHVzaCh0cmFuc2Zvcm0pIHtcbiAgICAgICAgY29uc3QgcmVxdWVzdHMgPSBnZXRUcmFuc2Zvcm1SZXF1ZXN0cyh0aGlzLCB0cmFuc2Zvcm0pO1xuICAgICAgICBpZiAodGhpcy5tYXhSZXF1ZXN0c1BlclRyYW5zZm9ybSAmJiByZXF1ZXN0cy5sZW5ndGggPiB0aGlzLm1heFJlcXVlc3RzUGVyVHJhbnNmb3JtKSB7XG4gICAgICAgICAgICByZXR1cm4gT3JiaXQuUHJvbWlzZS5yZXNvbHZlKCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFRyYW5zZm9ybU5vdEFsbG93ZWQoYFRoaXMgdHJhbnNmb3JtIHJlcXVpcmVzICR7cmVxdWVzdHMubGVuZ3RofSByZXF1ZXN0cywgd2hpY2ggZXhjZWVkcyB0aGUgc3BlY2lmaWVkIGxpbWl0IG9mICR7dGhpcy5tYXhSZXF1ZXN0c1BlclRyYW5zZm9ybX0gcmVxdWVzdHMgcGVyIHRyYW5zZm9ybS5gLCB0cmFuc2Zvcm0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3Byb2Nlc3NSZXF1ZXN0cyhyZXF1ZXN0cywgVHJhbnNmb3JtUmVxdWVzdFByb2Nlc3NvcnMpLnRoZW4odHJhbnNmb3JtcyA9PiB7XG4gICAgICAgICAgICB0cmFuc2Zvcm1zLnVuc2hpZnQodHJhbnNmb3JtKTtcbiAgICAgICAgICAgIHJldHVybiB0cmFuc2Zvcm1zO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBQdWxsYWJsZSBpbnRlcmZhY2UgaW1wbGVtZW50YXRpb25cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIF9wdWxsKHF1ZXJ5KSB7XG4gICAgICAgIGNvbnN0IG9wZXJhdG9yID0gUHVsbE9wZXJhdG9yc1txdWVyeS5leHByZXNzaW9uLm9wXTtcbiAgICAgICAgaWYgKCFvcGVyYXRvcikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdKU09OQVBJU291cmNlIGRvZXMgbm90IHN1cHBvcnQgdGhlIGAke3F1ZXJ5LmV4cHJlc3Npb24ub3B9YCBvcGVyYXRvciBmb3IgcXVlcmllcy4nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3BlcmF0b3IodGhpcywgcXVlcnkpO1xuICAgIH1cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIC8vIFB1bGxhYmxlIGludGVyZmFjZSBpbXBsZW1lbnRhdGlvblxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgX3F1ZXJ5KHF1ZXJ5KSB7XG4gICAgICAgIGNvbnN0IG9wZXJhdG9yID0gUXVlcnlPcGVyYXRvcnNbcXVlcnkuZXhwcmVzc2lvbi5vcF07XG4gICAgICAgIGlmICghb3BlcmF0b3IpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSlNPTkFQSVNvdXJjZSBkb2VzIG5vdCBzdXBwb3J0IHRoZSBgJHtxdWVyeS5leHByZXNzaW9uLm9wfWAgb3BlcmF0b3IgZm9yIHF1ZXJpZXMuJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9wZXJhdG9yKHRoaXMsIHF1ZXJ5KTtcbiAgICB9XG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBQdWJsaWNseSBhY2Nlc3NpYmxlIG1ldGhvZHMgcGFydGljdWxhciB0byBKU09OQVBJU291cmNlXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICBmZXRjaCh1cmwsIGN1c3RvbVNldHRpbmdzKSB7XG4gICAgICAgIGxldCBzZXR0aW5ncyA9IHRoaXMuaW5pdEZldGNoU2V0dGluZ3MoY3VzdG9tU2V0dGluZ3MpO1xuICAgICAgICBsZXQgZnVsbFVybCA9IHVybDtcbiAgICAgICAgaWYgKHNldHRpbmdzLnBhcmFtcykge1xuICAgICAgICAgICAgZnVsbFVybCA9IGFwcGVuZFF1ZXJ5UGFyYW1zKGZ1bGxVcmwsIHNldHRpbmdzLnBhcmFtcyk7XG4gICAgICAgICAgICBkZWxldGUgc2V0dGluZ3MucGFyYW1zO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdmZXRjaCcsIGZ1bGxVcmwsIG1lcmdlZFNldHRpbmdzLCAncG9seWZpbGwnLCBmZXRjaC5wb2x5ZmlsbCk7XG4gICAgICAgIGxldCBmZXRjaEZuID0gT3JiaXQuZmV0Y2ggfHwgZmV0Y2g7XG4gICAgICAgIGlmIChzZXR0aW5ncy50aW1lb3V0KSB7XG4gICAgICAgICAgICBsZXQgdGltZW91dCA9IHNldHRpbmdzLnRpbWVvdXQ7XG4gICAgICAgICAgICBkZWxldGUgc2V0dGluZ3MudGltZW91dDtcbiAgICAgICAgICAgIHJldHVybiBuZXcgT3JiaXQuUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHRpbWVkT3V0O1xuICAgICAgICAgICAgICAgIGxldCB0aW1lciA9IE9yYml0Lmdsb2JhbHMuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRpbWVkT3V0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBOZXR3b3JrRXJyb3IoYE5vIGZldGNoIHJlc3BvbnNlIHdpdGhpbiAke3RpbWVvdXR9bXMuYCkpO1xuICAgICAgICAgICAgICAgIH0sIHRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIGZldGNoRm4oZnVsbFVybCwgc2V0dGluZ3MpLmNhdGNoKGUgPT4ge1xuICAgICAgICAgICAgICAgICAgICBPcmJpdC5nbG9iYWxzLmNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGltZWRPdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZUZldGNoRXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KS50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgT3JiaXQuZ2xvYmFscy5jbGVhclRpbWVvdXQodGltZXIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXRpbWVkT3V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVGZXRjaFJlc3BvbnNlKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZldGNoRm4oZnVsbFVybCwgc2V0dGluZ3MpLmNhdGNoKGUgPT4gdGhpcy5oYW5kbGVGZXRjaEVycm9yKGUpKS50aGVuKHJlc3BvbnNlID0+IHRoaXMuaGFuZGxlRmV0Y2hSZXNwb25zZShyZXNwb25zZSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGluaXRGZXRjaFNldHRpbmdzKGN1c3RvbVNldHRpbmdzID0ge30pIHtcbiAgICAgICAgbGV0IHNldHRpbmdzID0gZGVlcE1lcmdlKHt9LCB0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzLCBjdXN0b21TZXR0aW5ncyk7XG4gICAgICAgIGlmIChzZXR0aW5ncy5qc29uKSB7XG4gICAgICAgICAgICBhc3NlcnQoJ2Bqc29uYCBhbmQgYGJvZHlgIGNhblxcJ3QgYm90aCBiZSBzZXQgZm9yIGZldGNoIHJlcXVlc3RzLicsICFzZXR0aW5ncy5ib2R5KTtcbiAgICAgICAgICAgIHNldHRpbmdzLmJvZHkgPSBKU09OLnN0cmluZ2lmeShzZXR0aW5ncy5qc29uKTtcbiAgICAgICAgICAgIGRlbGV0ZSBzZXR0aW5ncy5qc29uO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzZXR0aW5ncy5oZWFkZXJzICYmICFzZXR0aW5ncy5ib2R5KSB7XG4gICAgICAgICAgICBkZWxldGUgc2V0dGluZ3MuaGVhZGVyc1snQ29udGVudC1UeXBlJ107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNldHRpbmdzO1xuICAgIH1cbiAgICBoYW5kbGVGZXRjaFJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDIwMSkge1xuICAgICAgICAgICAgaWYgKHRoaXMucmVzcG9uc2VIYXNDb250ZW50KHJlc3BvbnNlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBJbnZhbGlkU2VydmVyUmVzcG9uc2UoYFNlcnZlciByZXNwb25zZXMgd2l0aCBhICR7cmVzcG9uc2Uuc3RhdHVzfSBzdGF0dXMgc2hvdWxkIHJldHVybiBjb250ZW50IHdpdGggYSBDb250ZW50LVR5cGUgdGhhdCBpbmNsdWRlcyAnYXBwbGljYXRpb24vdm5kLmFwaStqc29uJy5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5zdGF0dXMgPj0gMjAwICYmIHJlc3BvbnNlLnN0YXR1cyA8IDMwMCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucmVzcG9uc2VIYXNDb250ZW50KHJlc3BvbnNlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodGhpcy5yZXNwb25zZUhhc0NvbnRlbnQocmVzcG9uc2UpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKS50aGVuKGRhdGEgPT4gdGhpcy5oYW5kbGVGZXRjaFJlc3BvbnNlRXJyb3IocmVzcG9uc2UsIGRhdGEpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlRmV0Y2hSZXNwb25zZUVycm9yKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gT3JiaXQuUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuICAgIGhhbmRsZUZldGNoUmVzcG9uc2VFcnJvcihyZXNwb25zZSwgZGF0YSkge1xuICAgICAgICBsZXQgZXJyb3I7XG4gICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPj0gNDAwICYmIHJlc3BvbnNlLnN0YXR1cyA8IDUwMCkge1xuICAgICAgICAgICAgZXJyb3IgPSBuZXcgQ2xpZW50RXJyb3IocmVzcG9uc2Uuc3RhdHVzVGV4dCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlcnJvciA9IG5ldyBTZXJ2ZXJFcnJvcihyZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBlcnJvci5yZXNwb25zZSA9IHJlc3BvbnNlO1xuICAgICAgICBlcnJvci5kYXRhID0gZGF0YTtcbiAgICAgICAgcmV0dXJuIE9yYml0LlByb21pc2UucmVqZWN0KGVycm9yKTtcbiAgICB9XG4gICAgaGFuZGxlRmV0Y2hFcnJvcihlKSB7XG4gICAgICAgIGxldCBlcnJvciA9IG5ldyBOZXR3b3JrRXJyb3IoZSk7XG4gICAgICAgIHJldHVybiBPcmJpdC5Qcm9taXNlLnJlamVjdChlcnJvcik7XG4gICAgfVxuICAgIHJlc3BvbnNlSGFzQ29udGVudChyZXNwb25zZSkge1xuICAgICAgICBsZXQgY29udGVudFR5cGUgPSByZXNwb25zZS5oZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJyk7XG4gICAgICAgIHJldHVybiBjb250ZW50VHlwZSAmJiBjb250ZW50VHlwZS5pbmRleE9mKCdhcHBsaWNhdGlvbi92bmQuYXBpK2pzb24nKSA+IC0xO1xuICAgIH1cbiAgICByZXNvdXJjZU5hbWVzcGFjZSh0eXBlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm5hbWVzcGFjZTtcbiAgICB9XG4gICAgcmVzb3VyY2VIb3N0KHR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaG9zdDtcbiAgICB9XG4gICAgcmVzb3VyY2VQYXRoKHR5cGUsIGlkKSB7XG4gICAgICAgIGxldCBwYXRoID0gW3RoaXMuc2VyaWFsaXplci5yZXNvdXJjZVR5cGUodHlwZSldO1xuICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgIGxldCByZXNvdXJjZUlkID0gdGhpcy5zZXJpYWxpemVyLnJlc291cmNlSWQodHlwZSwgaWQpO1xuICAgICAgICAgICAgaWYgKHJlc291cmNlSWQpIHtcbiAgICAgICAgICAgICAgICBwYXRoLnB1c2gocmVzb3VyY2VJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhdGguam9pbignLycpO1xuICAgIH1cbiAgICByZXNvdXJjZVVSTCh0eXBlLCBpZCkge1xuICAgICAgICBsZXQgaG9zdCA9IHRoaXMucmVzb3VyY2VIb3N0KHR5cGUpO1xuICAgICAgICBsZXQgbmFtZXNwYWNlID0gdGhpcy5yZXNvdXJjZU5hbWVzcGFjZSh0eXBlKTtcbiAgICAgICAgbGV0IHVybCA9IFtdO1xuICAgICAgICBpZiAoaG9zdCkge1xuICAgICAgICAgICAgdXJsLnB1c2goaG9zdCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5hbWVzcGFjZSkge1xuICAgICAgICAgICAgdXJsLnB1c2gobmFtZXNwYWNlKTtcbiAgICAgICAgfVxuICAgICAgICB1cmwucHVzaCh0aGlzLnJlc291cmNlUGF0aCh0eXBlLCBpZCkpO1xuICAgICAgICBpZiAoIWhvc3QpIHtcbiAgICAgICAgICAgIHVybC51bnNoaWZ0KCcnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXJsLmpvaW4oJy8nKTtcbiAgICB9XG4gICAgcmVzb3VyY2VSZWxhdGlvbnNoaXBVUkwodHlwZSwgaWQsIHJlbGF0aW9uc2hpcCkge1xuICAgICAgICByZXR1cm4gdGhpcy5yZXNvdXJjZVVSTCh0eXBlLCBpZCkgKyAnL3JlbGF0aW9uc2hpcHMvJyArIHRoaXMuc2VyaWFsaXplci5yZXNvdXJjZVJlbGF0aW9uc2hpcCh0eXBlLCByZWxhdGlvbnNoaXApO1xuICAgIH1cbiAgICByZWxhdGVkUmVzb3VyY2VVUkwodHlwZSwgaWQsIHJlbGF0aW9uc2hpcCkge1xuICAgICAgICByZXR1cm4gdGhpcy5yZXNvdXJjZVVSTCh0eXBlLCBpZCkgKyAnLycgKyB0aGlzLnNlcmlhbGl6ZXIucmVzb3VyY2VSZWxhdGlvbnNoaXAodHlwZSwgcmVsYXRpb25zaGlwKTtcbiAgICB9XG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBQcml2YXRlIG1ldGhvZHNcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIGluaXREZWZhdWx0RmV0Y2hTZXR0aW5ncyhzZXR0aW5ncykge1xuICAgICAgICB0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzID0ge1xuICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgIEFjY2VwdDogJ2FwcGxpY2F0aW9uL3ZuZC5hcGkranNvbicsXG4gICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi92bmQuYXBpK2pzb24nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGltZW91dDogNTAwMFxuICAgICAgICB9O1xuICAgICAgICBpZiAoc2V0dGluZ3MuZGVmYXVsdEZldGNoSGVhZGVycyB8fCBzZXR0aW5ncy5kZWZhdWx0RmV0Y2hUaW1lb3V0KSB7XG4gICAgICAgICAgICBkZXByZWNhdGUoJ0pTT05BUElTb3VyY2U6IFBhc3MgYGRlZmF1bHRGZXRjaFNldHRpbmdzYCB3aXRoIGBoZWFkZXJzYCBpbnN0ZWFkIG9mIGBkZWZhdWx0RmV0Y2hIZWFkZXJzYCB0byBpbml0aWFsaXplIHNvdXJjZScsIHNldHRpbmdzLmRlZmF1bHRGZXRjaEhlYWRlcnMgPT09IHVuZGVmaW5lZCk7XG4gICAgICAgICAgICBkZXByZWNhdGUoJ0pTT05BUElTb3VyY2U6IFBhc3MgYGRlZmF1bHRGZXRjaFNldHRpbmdzYCB3aXRoIGB0aW1lb3V0YCBpbnN0ZWFkIG9mIGBkZWZhdWx0RmV0Y2hUaW1lb3V0YCB0byBpbml0aWFsaXplIHNvdXJjZScsIHNldHRpbmdzLmRlZmF1bHRGZXRjaFRpbWVvdXQgPT09IHVuZGVmaW5lZCk7XG4gICAgICAgICAgICBkZWVwTWVyZ2UodGhpcy5kZWZhdWx0RmV0Y2hTZXR0aW5ncywge1xuICAgICAgICAgICAgICAgIGhlYWRlcnM6IHNldHRpbmdzLmRlZmF1bHRGZXRjaEhlYWRlcnMsXG4gICAgICAgICAgICAgICAgdGltZW91dDogc2V0dGluZ3MuZGVmYXVsdEZldGNoVGltZW91dFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNldHRpbmdzLmRlZmF1bHRGZXRjaFNldHRpbmdzKSB7XG4gICAgICAgICAgICBkZWVwTWVyZ2UodGhpcy5kZWZhdWx0RmV0Y2hTZXR0aW5ncywgc2V0dGluZ3MuZGVmYXVsdEZldGNoU2V0dGluZ3MpO1xuICAgICAgICB9XG4gICAgfVxuICAgIF9wcm9jZXNzUmVxdWVzdHMocmVxdWVzdHMsIHByb2Nlc3NvcnMpIHtcbiAgICAgICAgbGV0IHRyYW5zZm9ybXMgPSBbXTtcbiAgICAgICAgbGV0IHJlc3VsdCA9IE9yYml0LlByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICByZXF1ZXN0cy5mb3JFYWNoKHJlcXVlc3QgPT4ge1xuICAgICAgICAgICAgbGV0IHByb2Nlc3NvciA9IHByb2Nlc3NvcnNbcmVxdWVzdC5vcF07XG4gICAgICAgICAgICByZXN1bHQgPSByZXN1bHQudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb2Nlc3Nvcih0aGlzLCByZXF1ZXN0KS50aGVuKGFkZGl0aW9uYWxUcmFuc2Zvcm1zID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFkZGl0aW9uYWxUcmFuc2Zvcm1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseSh0cmFuc2Zvcm1zLCBhZGRpdGlvbmFsVHJhbnNmb3Jtcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdC50aGVuKCgpID0+IHRyYW5zZm9ybXMpO1xuICAgIH1cbn07XG5KU09OQVBJU291cmNlID0gX19kZWNvcmF0ZShbcHVsbGFibGUsIHB1c2hhYmxlLCBxdWVyeWFibGVdLCBKU09OQVBJU291cmNlKTtcbmV4cG9ydCBkZWZhdWx0IEpTT05BUElTb3VyY2U7Il19