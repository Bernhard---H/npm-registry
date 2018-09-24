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
    // Queryable interface implementation
    /////////////////////////////////////////////////////////////////////////////


    JSONAPISource.prototype._query = function _query(query) {
        var _this3 = this;

        var operator = _queryOperators.QueryOperators[query.expression.op];
        if (!operator) {
            throw new Error('JSONAPISource does not support the `${query.expression.op}` operator for queries.');
        }
        return operator(this, query).then(function (response) {
            return _this3._transformed(response.transforms).then(function () {
                return response.primaryData;
            });
        });
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
        var _this4 = this;

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
                        return _this4.handleFetchError(e);
                    }
                }).then(function (response) {
                    _data2.default.globals.clearTimeout(timer);
                    if (!timedOut) {
                        return _this4.handleFetchResponse(response);
                    }
                }).then(resolve, reject);
            });
        } else {
            return fetchFn(fullUrl, settings).catch(function (e) {
                return _this4.handleFetchError(e);
            }).then(function (response) {
                return _this4.handleFetchResponse(response);
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
        var _this5 = this;

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
                    return _this5.handleFetchResponseError(response, data);
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
        var _this6 = this;

        var transforms = [];
        var result = _data2.default.Promise.resolve();
        requests.forEach(function (request) {
            var processor = processors[request.op];
            result = result.then(function () {
                return processor(_this6, request).then(function (additionalTransforms) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpzb25hcGktc291cmNlLmpzIl0sIm5hbWVzIjpbIl9fZGVjb3JhdGUiLCJjIiwiYXJndW1lbnRzIiwiciIsImRlc2MiLCJPYmplY3QiLCJSZWZsZWN0IiwiaSIsImRlY29yYXRvcnMiLCJkIiwic2V0dGluZ3MiLCJhc3NlcnQiLCJPcmJpdCIsIlNlcmlhbGl6ZXJDbGFzcyIsInNjaGVtYSIsImtleU1hcCIsImRlcHJlY2F0ZSIsInJlcXVlc3RzIiwiZ2V0VHJhbnNmb3JtUmVxdWVzdHMiLCJ0cmFuc2Zvcm1zIiwib3BlcmF0b3IiLCJQdWxsT3BlcmF0b3JzIiwicXVlcnkiLCJRdWVyeU9wZXJhdG9ycyIsInJlc3BvbnNlIiwiZnVsbFVybCIsImFwcGVuZFF1ZXJ5UGFyYW1zIiwiZmV0Y2hGbiIsInRpbWVvdXQiLCJ0aW1lZE91dCIsInRpbWVyIiwicmVqZWN0IiwiY3VzdG9tU2V0dGluZ3MiLCJkZWVwTWVyZ2UiLCJKU09OIiwiZXJyb3IiLCJjb250ZW50VHlwZSIsInBhdGgiLCJyZXNvdXJjZUlkIiwiaG9zdCIsIm5hbWVzcGFjZSIsInVybCIsImhlYWRlcnMiLCJBY2NlcHQiLCJkZWZhdWx0RmV0Y2hUaW1lb3V0IiwicmVzdWx0IiwicHJvY2Vzc29yIiwicHJvY2Vzc29ycyIsInJlcXVlc3QiLCJBcnJheSIsIkpTT05BUElTb3VyY2UiXSwibWFwcGluZ3MiOiI7Ozs7OztBQVFBOzs7O0FBQ0E7O0FBQ0E7Ozs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWZBLElBQUlBLGFBQWEsYUFBUSxVQUFSLFVBQUEsSUFBMkIsVUFBQSxVQUFBLEVBQUEsTUFBQSxFQUFBLEdBQUEsRUFBQSxJQUFBLEVBQXlDO0FBQ2pGLFFBQUlDLElBQUlDLFVBQVIsTUFBQTtBQUFBLFFBQ0lDLElBQUlGLElBQUFBLENBQUFBLEdBQUFBLE1BQUFBLEdBQWlCRyxTQUFBQSxJQUFBQSxHQUFnQkEsT0FB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QmxELENBQWhCa0Q7a0JBQ0EsYSIsInNvdXJjZXNDb250ZW50IjpbInZhciBfX2RlY29yYXRlID0gdGhpcyAmJiB0aGlzLl9fZGVjb3JhdGUgfHwgZnVuY3Rpb24gKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLFxuICAgICAgICByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYyxcbiAgICAgICAgZDtcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QuZGVjb3JhdGUgPT09IFwiZnVuY3Rpb25cIikgciA9IFJlZmxlY3QuZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpO2Vsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcbn07XG4vKiBlc2xpbnQtZGlzYWJsZSB2YWxpZC1qc2RvYyAqL1xuaW1wb3J0IE9yYml0LCB7IFNvdXJjZSwgcHVsbGFibGUsIHB1c2hhYmxlLCBUcmFuc2Zvcm1Ob3RBbGxvd2VkLCBDbGllbnRFcnJvciwgU2VydmVyRXJyb3IsIE5ldHdvcmtFcnJvciwgcXVlcnlhYmxlIH0gZnJvbSAnQG9yYml0L2RhdGEnO1xuaW1wb3J0IHsgYXNzZXJ0LCBkZWVwTWVyZ2UsIGRlcHJlY2F0ZSB9IGZyb20gJ0BvcmJpdC91dGlscyc7XG5pbXBvcnQgSlNPTkFQSVNlcmlhbGl6ZXIgZnJvbSAnLi9qc29uYXBpLXNlcmlhbGl6ZXInO1xuaW1wb3J0IHsgYXBwZW5kUXVlcnlQYXJhbXMgfSBmcm9tICcuL2xpYi9xdWVyeS1wYXJhbXMnO1xuaW1wb3J0IHsgUHVsbE9wZXJhdG9ycyB9IGZyb20gJy4vbGliL3B1bGwtb3BlcmF0b3JzJztcbmltcG9ydCB7IGdldFRyYW5zZm9ybVJlcXVlc3RzLCBUcmFuc2Zvcm1SZXF1ZXN0UHJvY2Vzc29ycyB9IGZyb20gJy4vbGliL3RyYW5zZm9ybS1yZXF1ZXN0cyc7XG5pbXBvcnQgeyBJbnZhbGlkU2VydmVyUmVzcG9uc2UgfSBmcm9tICcuL2xpYi9leGNlcHRpb25zJztcbmltcG9ydCB7IFF1ZXJ5T3BlcmF0b3JzIH0gZnJvbSBcIi4vbGliL3F1ZXJ5LW9wZXJhdG9yc1wiO1xuLyoqXG4gU291cmNlIGZvciBhY2Nlc3NpbmcgYSBKU09OIEFQSSBjb21wbGlhbnQgUkVTVGZ1bCBBUEkgd2l0aCBhIG5ldHdvcmsgZmV0Y2hcbiByZXF1ZXN0LlxuXG4gSWYgYSBzaW5nbGUgdHJhbnNmb3JtIG9yIHF1ZXJ5IHJlcXVpcmVzIG1vcmUgdGhhbiBvbmUgZmV0Y2ggcmVxdWVzdCxcbiByZXF1ZXN0cyB3aWxsIGJlIHBlcmZvcm1lZCBzZXF1ZW50aWFsbHkgYW5kIHJlc29sdmVkIHRvZ2V0aGVyLiBGcm9tIHRoZVxuIHBlcnNwZWN0aXZlIG9mIE9yYml0LCB0aGVzZSBvcGVyYXRpb25zIHdpbGwgYWxsIHN1Y2NlZWQgb3IgZmFpbCB0b2dldGhlci4gVGhlXG4gYG1heFJlcXVlc3RzUGVyVHJhbnNmb3JtYCBhbmQgYG1heFJlcXVlc3RzUGVyUXVlcnlgIHNldHRpbmdzIGFsbG93IGxpbWl0cyB0byBiZVxuIHNldCBvbiB0aGlzIGJlaGF2aW9yLiBUaGVzZSBzZXR0aW5ncyBzaG91bGQgYmUgc2V0IHRvIGAxYCBpZiB5b3VyIGNsaWVudC9zZXJ2ZXJcbiBjb25maWd1cmF0aW9uIGlzIHVuYWJsZSB0byByZXNvbHZlIHBhcnRpYWxseSBzdWNjZXNzZnVsIHRyYW5zZm9ybXMgLyBxdWVyaWVzLlxuXG4gQGNsYXNzIEpTT05BUElTb3VyY2VcbiBAZXh0ZW5kcyBTb3VyY2VcbiAqL1xubGV0IEpTT05BUElTb3VyY2UgPSBjbGFzcyBKU09OQVBJU291cmNlIGV4dGVuZHMgU291cmNlIHtcbiAgICBjb25zdHJ1Y3RvcihzZXR0aW5ncyA9IHt9KSB7XG4gICAgICAgIGFzc2VydCgnSlNPTkFQSVNvdXJjZVxcJ3MgYHNjaGVtYWAgbXVzdCBiZSBzcGVjaWZpZWQgaW4gYHNldHRpbmdzLnNjaGVtYWAgY29uc3RydWN0b3IgYXJndW1lbnQnLCAhIXNldHRpbmdzLnNjaGVtYSk7XG4gICAgICAgIGFzc2VydCgnSlNPTkFQSVNvdXJjZSByZXF1aXJlcyBPcmJpdC5Qcm9taXNlIGJlIGRlZmluZWQnLCBPcmJpdC5Qcm9taXNlKTtcbiAgICAgICAgc2V0dGluZ3MubmFtZSA9IHNldHRpbmdzLm5hbWUgfHwgJ2pzb25hcGknO1xuICAgICAgICBzdXBlcihzZXR0aW5ncyk7XG4gICAgICAgIHRoaXMubmFtZXNwYWNlID0gc2V0dGluZ3MubmFtZXNwYWNlO1xuICAgICAgICB0aGlzLmhvc3QgPSBzZXR0aW5ncy5ob3N0O1xuICAgICAgICB0aGlzLmluaXREZWZhdWx0RmV0Y2hTZXR0aW5ncyhzZXR0aW5ncyk7XG4gICAgICAgIHRoaXMubWF4UmVxdWVzdHNQZXJUcmFuc2Zvcm0gPSBzZXR0aW5ncy5tYXhSZXF1ZXN0c1BlclRyYW5zZm9ybTtcbiAgICAgICAgY29uc3QgU2VyaWFsaXplckNsYXNzID0gc2V0dGluZ3MuU2VyaWFsaXplckNsYXNzIHx8IEpTT05BUElTZXJpYWxpemVyO1xuICAgICAgICB0aGlzLnNlcmlhbGl6ZXIgPSBuZXcgU2VyaWFsaXplckNsYXNzKHsgc2NoZW1hOiBzZXR0aW5ncy5zY2hlbWEsIGtleU1hcDogc2V0dGluZ3Mua2V5TWFwIH0pO1xuICAgIH1cbiAgICBnZXQgZGVmYXVsdEZldGNoSGVhZGVycygpIHtcbiAgICAgICAgZGVwcmVjYXRlKCdKU09OQVBJU291cmNlOiBBY2Nlc3MgYGRlZmF1bHRGZXRjaFNldHRpbmdzLmhlYWRlcnNgIGluc3RlYWQgb2YgYGRlZmF1bHRGZXRjaEhlYWRlcnNgJyk7XG4gICAgICAgIHJldHVybiB0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzLmhlYWRlcnM7XG4gICAgfVxuICAgIHNldCBkZWZhdWx0RmV0Y2hIZWFkZXJzKGhlYWRlcnMpIHtcbiAgICAgICAgZGVwcmVjYXRlKCdKU09OQVBJU291cmNlOiBBY2Nlc3MgYGRlZmF1bHRGZXRjaFNldHRpbmdzLmhlYWRlcnNgIGluc3RlYWQgb2YgYGRlZmF1bHRGZXRjaEhlYWRlcnNgJyk7XG4gICAgICAgIHRoaXMuZGVmYXVsdEZldGNoU2V0dGluZ3MuaGVhZGVycyA9IGhlYWRlcnM7XG4gICAgfVxuICAgIGdldCBkZWZhdWx0RmV0Y2hUaW1lb3V0KCkge1xuICAgICAgICBkZXByZWNhdGUoJ0pTT05BUElTb3VyY2U6IEFjY2VzcyBgZGVmYXVsdEZldGNoU2V0dGluZ3MudGltZW91dGAgaW5zdGVhZCBvZiBgZGVmYXVsdEZldGNoVGltZW91dGAnKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGVmYXVsdEZldGNoU2V0dGluZ3MudGltZW91dDtcbiAgICB9XG4gICAgc2V0IGRlZmF1bHRGZXRjaFRpbWVvdXQodGltZW91dCkge1xuICAgICAgICBkZXByZWNhdGUoJ0pTT05BUElTb3VyY2U6IEFjY2VzcyBgZGVmYXVsdEZldGNoU2V0dGluZ3MudGltZW91dGAgaW5zdGVhZCBvZiBgZGVmYXVsdEZldGNoVGltZW91dGAnKTtcbiAgICAgICAgdGhpcy5kZWZhdWx0RmV0Y2hTZXR0aW5ncy50aW1lb3V0ID0gdGltZW91dDtcbiAgICB9XG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBQdXNoYWJsZSBpbnRlcmZhY2UgaW1wbGVtZW50YXRpb25cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIF9wdXNoKHRyYW5zZm9ybSkge1xuICAgICAgICBjb25zdCByZXF1ZXN0cyA9IGdldFRyYW5zZm9ybVJlcXVlc3RzKHRoaXMsIHRyYW5zZm9ybSk7XG4gICAgICAgIGlmICh0aGlzLm1heFJlcXVlc3RzUGVyVHJhbnNmb3JtICYmIHJlcXVlc3RzLmxlbmd0aCA+IHRoaXMubWF4UmVxdWVzdHNQZXJUcmFuc2Zvcm0pIHtcbiAgICAgICAgICAgIHJldHVybiBPcmJpdC5Qcm9taXNlLnJlc29sdmUoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHJhbnNmb3JtTm90QWxsb3dlZChgVGhpcyB0cmFuc2Zvcm0gcmVxdWlyZXMgJHtyZXF1ZXN0cy5sZW5ndGh9IHJlcXVlc3RzLCB3aGljaCBleGNlZWRzIHRoZSBzcGVjaWZpZWQgbGltaXQgb2YgJHt0aGlzLm1heFJlcXVlc3RzUGVyVHJhbnNmb3JtfSByZXF1ZXN0cyBwZXIgdHJhbnNmb3JtLmAsIHRyYW5zZm9ybSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fcHJvY2Vzc1JlcXVlc3RzKHJlcXVlc3RzLCBUcmFuc2Zvcm1SZXF1ZXN0UHJvY2Vzc29ycykudGhlbih0cmFuc2Zvcm1zID0+IHtcbiAgICAgICAgICAgIHRyYW5zZm9ybXMudW5zaGlmdCh0cmFuc2Zvcm0pO1xuICAgICAgICAgICAgcmV0dXJuIHRyYW5zZm9ybXM7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIC8vIFB1bGxhYmxlIGludGVyZmFjZSBpbXBsZW1lbnRhdGlvblxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgX3B1bGwocXVlcnkpIHtcbiAgICAgICAgY29uc3Qgb3BlcmF0b3IgPSBQdWxsT3BlcmF0b3JzW3F1ZXJ5LmV4cHJlc3Npb24ub3BdO1xuICAgICAgICBpZiAoIW9wZXJhdG9yKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0pTT05BUElTb3VyY2UgZG9lcyBub3Qgc3VwcG9ydCB0aGUgYCR7cXVlcnkuZXhwcmVzc2lvbi5vcH1gIG9wZXJhdG9yIGZvciBxdWVyaWVzLicpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvcGVyYXRvcih0aGlzLCBxdWVyeSk7XG4gICAgfVxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgLy8gUXVlcnlhYmxlIGludGVyZmFjZSBpbXBsZW1lbnRhdGlvblxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgX3F1ZXJ5KHF1ZXJ5KSB7XG4gICAgICAgIGNvbnN0IG9wZXJhdG9yID0gUXVlcnlPcGVyYXRvcnNbcXVlcnkuZXhwcmVzc2lvbi5vcF07XG4gICAgICAgIGlmICghb3BlcmF0b3IpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSlNPTkFQSVNvdXJjZSBkb2VzIG5vdCBzdXBwb3J0IHRoZSBgJHtxdWVyeS5leHByZXNzaW9uLm9wfWAgb3BlcmF0b3IgZm9yIHF1ZXJpZXMuJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9wZXJhdG9yKHRoaXMsIHF1ZXJ5KS50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl90cmFuc2Zvcm1lZChyZXNwb25zZS50cmFuc2Zvcm1zKS50aGVuKCgpID0+IHJlc3BvbnNlLnByaW1hcnlEYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgLy8gUHVibGljbHkgYWNjZXNzaWJsZSBtZXRob2RzIHBhcnRpY3VsYXIgdG8gSlNPTkFQSVNvdXJjZVxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgZmV0Y2godXJsLCBjdXN0b21TZXR0aW5ncykge1xuICAgICAgICBsZXQgc2V0dGluZ3MgPSB0aGlzLmluaXRGZXRjaFNldHRpbmdzKGN1c3RvbVNldHRpbmdzKTtcbiAgICAgICAgbGV0IGZ1bGxVcmwgPSB1cmw7XG4gICAgICAgIGlmIChzZXR0aW5ncy5wYXJhbXMpIHtcbiAgICAgICAgICAgIGZ1bGxVcmwgPSBhcHBlbmRRdWVyeVBhcmFtcyhmdWxsVXJsLCBzZXR0aW5ncy5wYXJhbXMpO1xuICAgICAgICAgICAgZGVsZXRlIHNldHRpbmdzLnBhcmFtcztcbiAgICAgICAgfVxuICAgICAgICAvLyBjb25zb2xlLmxvZygnZmV0Y2gnLCBmdWxsVXJsLCBtZXJnZWRTZXR0aW5ncywgJ3BvbHlmaWxsJywgZmV0Y2gucG9seWZpbGwpO1xuICAgICAgICBsZXQgZmV0Y2hGbiA9IE9yYml0LmZldGNoIHx8IGZldGNoO1xuICAgICAgICBpZiAoc2V0dGluZ3MudGltZW91dCkge1xuICAgICAgICAgICAgbGV0IHRpbWVvdXQgPSBzZXR0aW5ncy50aW1lb3V0O1xuICAgICAgICAgICAgZGVsZXRlIHNldHRpbmdzLnRpbWVvdXQ7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE9yYml0LlByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgIGxldCB0aW1lZE91dDtcbiAgICAgICAgICAgICAgICBsZXQgdGltZXIgPSBPcmJpdC5nbG9iYWxzLnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aW1lZE91dCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChuZXcgTmV0d29ya0Vycm9yKGBObyBmZXRjaCByZXNwb25zZSB3aXRoaW4gJHt0aW1lb3V0fW1zLmApKTtcbiAgICAgICAgICAgICAgICB9LCB0aW1lb3V0KTtcbiAgICAgICAgICAgICAgICBmZXRjaEZuKGZ1bGxVcmwsIHNldHRpbmdzKS5jYXRjaChlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgT3JiaXQuZ2xvYmFscy5jbGVhclRpbWVvdXQodGltZXIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXRpbWVkT3V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVGZXRjaEVycm9yKGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkudGhlbihyZXNwb25zZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIE9yYml0Lmdsb2JhbHMuY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aW1lZE91dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlRmV0Y2hSZXNwb25zZShyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBmZXRjaEZuKGZ1bGxVcmwsIHNldHRpbmdzKS5jYXRjaChlID0+IHRoaXMuaGFuZGxlRmV0Y2hFcnJvcihlKSkudGhlbihyZXNwb25zZSA9PiB0aGlzLmhhbmRsZUZldGNoUmVzcG9uc2UocmVzcG9uc2UpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpbml0RmV0Y2hTZXR0aW5ncyhjdXN0b21TZXR0aW5ncyA9IHt9KSB7XG4gICAgICAgIGxldCBzZXR0aW5ncyA9IGRlZXBNZXJnZSh7fSwgdGhpcy5kZWZhdWx0RmV0Y2hTZXR0aW5ncywgY3VzdG9tU2V0dGluZ3MpO1xuICAgICAgICBpZiAoc2V0dGluZ3MuanNvbikge1xuICAgICAgICAgICAgYXNzZXJ0KCdganNvbmAgYW5kIGBib2R5YCBjYW5cXCd0IGJvdGggYmUgc2V0IGZvciBmZXRjaCByZXF1ZXN0cy4nLCAhc2V0dGluZ3MuYm9keSk7XG4gICAgICAgICAgICBzZXR0aW5ncy5ib2R5ID0gSlNPTi5zdHJpbmdpZnkoc2V0dGluZ3MuanNvbik7XG4gICAgICAgICAgICBkZWxldGUgc2V0dGluZ3MuanNvbjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2V0dGluZ3MuaGVhZGVycyAmJiAhc2V0dGluZ3MuYm9keSkge1xuICAgICAgICAgICAgZGVsZXRlIHNldHRpbmdzLmhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzZXR0aW5ncztcbiAgICB9XG4gICAgaGFuZGxlRmV0Y2hSZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSAyMDEpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlc3BvbnNlSGFzQ29udGVudChyZXNwb25zZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgSW52YWxpZFNlcnZlclJlc3BvbnNlKGBTZXJ2ZXIgcmVzcG9uc2VzIHdpdGggYSAke3Jlc3BvbnNlLnN0YXR1c30gc3RhdHVzIHNob3VsZCByZXR1cm4gY29udGVudCB3aXRoIGEgQ29udGVudC1UeXBlIHRoYXQgaW5jbHVkZXMgJ2FwcGxpY2F0aW9uL3ZuZC5hcGkranNvbicuYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2Uuc3RhdHVzID49IDIwMCAmJiByZXNwb25zZS5zdGF0dXMgPCAzMDApIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlc3BvbnNlSGFzQ29udGVudChyZXNwb25zZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHRoaXMucmVzcG9uc2VIYXNDb250ZW50KHJlc3BvbnNlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkudGhlbihkYXRhID0+IHRoaXMuaGFuZGxlRmV0Y2hSZXNwb25zZUVycm9yKHJlc3BvbnNlLCBkYXRhKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZUZldGNoUmVzcG9uc2VFcnJvcihyZXNwb25zZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE9yYml0LlByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cbiAgICBoYW5kbGVGZXRjaFJlc3BvbnNlRXJyb3IocmVzcG9uc2UsIGRhdGEpIHtcbiAgICAgICAgbGV0IGVycm9yO1xuICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID49IDQwMCAmJiByZXNwb25zZS5zdGF0dXMgPCA1MDApIHtcbiAgICAgICAgICAgIGVycm9yID0gbmV3IENsaWVudEVycm9yKHJlc3BvbnNlLnN0YXR1c1RleHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXJyb3IgPSBuZXcgU2VydmVyRXJyb3IocmVzcG9uc2Uuc3RhdHVzVGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgZXJyb3IucmVzcG9uc2UgPSByZXNwb25zZTtcbiAgICAgICAgZXJyb3IuZGF0YSA9IGRhdGE7XG4gICAgICAgIHJldHVybiBPcmJpdC5Qcm9taXNlLnJlamVjdChlcnJvcik7XG4gICAgfVxuICAgIGhhbmRsZUZldGNoRXJyb3IoZSkge1xuICAgICAgICBsZXQgZXJyb3IgPSBuZXcgTmV0d29ya0Vycm9yKGUpO1xuICAgICAgICByZXR1cm4gT3JiaXQuUHJvbWlzZS5yZWplY3QoZXJyb3IpO1xuICAgIH1cbiAgICByZXNwb25zZUhhc0NvbnRlbnQocmVzcG9uc2UpIHtcbiAgICAgICAgbGV0IGNvbnRlbnRUeXBlID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ0NvbnRlbnQtVHlwZScpO1xuICAgICAgICByZXR1cm4gY29udGVudFR5cGUgJiYgY29udGVudFR5cGUuaW5kZXhPZignYXBwbGljYXRpb24vdm5kLmFwaStqc29uJykgPiAtMTtcbiAgICB9XG4gICAgcmVzb3VyY2VOYW1lc3BhY2UodHlwZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5uYW1lc3BhY2U7XG4gICAgfVxuICAgIHJlc291cmNlSG9zdCh0eXBlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmhvc3Q7XG4gICAgfVxuICAgIHJlc291cmNlUGF0aCh0eXBlLCBpZCkge1xuICAgICAgICBsZXQgcGF0aCA9IFt0aGlzLnNlcmlhbGl6ZXIucmVzb3VyY2VUeXBlKHR5cGUpXTtcbiAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgICBsZXQgcmVzb3VyY2VJZCA9IHRoaXMuc2VyaWFsaXplci5yZXNvdXJjZUlkKHR5cGUsIGlkKTtcbiAgICAgICAgICAgIGlmIChyZXNvdXJjZUlkKSB7XG4gICAgICAgICAgICAgICAgcGF0aC5wdXNoKHJlc291cmNlSWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXRoLmpvaW4oJy8nKTtcbiAgICB9XG4gICAgcmVzb3VyY2VVUkwodHlwZSwgaWQpIHtcbiAgICAgICAgbGV0IGhvc3QgPSB0aGlzLnJlc291cmNlSG9zdCh0eXBlKTtcbiAgICAgICAgbGV0IG5hbWVzcGFjZSA9IHRoaXMucmVzb3VyY2VOYW1lc3BhY2UodHlwZSk7XG4gICAgICAgIGxldCB1cmwgPSBbXTtcbiAgICAgICAgaWYgKGhvc3QpIHtcbiAgICAgICAgICAgIHVybC5wdXNoKGhvc3QpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChuYW1lc3BhY2UpIHtcbiAgICAgICAgICAgIHVybC5wdXNoKG5hbWVzcGFjZSk7XG4gICAgICAgIH1cbiAgICAgICAgdXJsLnB1c2godGhpcy5yZXNvdXJjZVBhdGgodHlwZSwgaWQpKTtcbiAgICAgICAgaWYgKCFob3N0KSB7XG4gICAgICAgICAgICB1cmwudW5zaGlmdCgnJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVybC5qb2luKCcvJyk7XG4gICAgfVxuICAgIHJlc291cmNlUmVsYXRpb25zaGlwVVJMKHR5cGUsIGlkLCByZWxhdGlvbnNoaXApIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVzb3VyY2VVUkwodHlwZSwgaWQpICsgJy9yZWxhdGlvbnNoaXBzLycgKyB0aGlzLnNlcmlhbGl6ZXIucmVzb3VyY2VSZWxhdGlvbnNoaXAodHlwZSwgcmVsYXRpb25zaGlwKTtcbiAgICB9XG4gICAgcmVsYXRlZFJlc291cmNlVVJMKHR5cGUsIGlkLCByZWxhdGlvbnNoaXApIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVzb3VyY2VVUkwodHlwZSwgaWQpICsgJy8nICsgdGhpcy5zZXJpYWxpemVyLnJlc291cmNlUmVsYXRpb25zaGlwKHR5cGUsIHJlbGF0aW9uc2hpcCk7XG4gICAgfVxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgLy8gUHJpdmF0ZSBtZXRob2RzXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICBpbml0RGVmYXVsdEZldGNoU2V0dGluZ3Moc2V0dGluZ3MpIHtcbiAgICAgICAgdGhpcy5kZWZhdWx0RmV0Y2hTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgICBBY2NlcHQ6ICdhcHBsaWNhdGlvbi92bmQuYXBpK2pzb24nLFxuICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vdm5kLmFwaStqc29uJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRpbWVvdXQ6IDUwMDBcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHNldHRpbmdzLmRlZmF1bHRGZXRjaEhlYWRlcnMgfHwgc2V0dGluZ3MuZGVmYXVsdEZldGNoVGltZW91dCkge1xuICAgICAgICAgICAgZGVwcmVjYXRlKCdKU09OQVBJU291cmNlOiBQYXNzIGBkZWZhdWx0RmV0Y2hTZXR0aW5nc2Agd2l0aCBgaGVhZGVyc2AgaW5zdGVhZCBvZiBgZGVmYXVsdEZldGNoSGVhZGVyc2AgdG8gaW5pdGlhbGl6ZSBzb3VyY2UnLCBzZXR0aW5ncy5kZWZhdWx0RmV0Y2hIZWFkZXJzID09PSB1bmRlZmluZWQpO1xuICAgICAgICAgICAgZGVwcmVjYXRlKCdKU09OQVBJU291cmNlOiBQYXNzIGBkZWZhdWx0RmV0Y2hTZXR0aW5nc2Agd2l0aCBgdGltZW91dGAgaW5zdGVhZCBvZiBgZGVmYXVsdEZldGNoVGltZW91dGAgdG8gaW5pdGlhbGl6ZSBzb3VyY2UnLCBzZXR0aW5ncy5kZWZhdWx0RmV0Y2hUaW1lb3V0ID09PSB1bmRlZmluZWQpO1xuICAgICAgICAgICAgZGVlcE1lcmdlKHRoaXMuZGVmYXVsdEZldGNoU2V0dGluZ3MsIHtcbiAgICAgICAgICAgICAgICBoZWFkZXJzOiBzZXR0aW5ncy5kZWZhdWx0RmV0Y2hIZWFkZXJzLFxuICAgICAgICAgICAgICAgIHRpbWVvdXQ6IHNldHRpbmdzLmRlZmF1bHRGZXRjaFRpbWVvdXRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzZXR0aW5ncy5kZWZhdWx0RmV0Y2hTZXR0aW5ncykge1xuICAgICAgICAgICAgZGVlcE1lcmdlKHRoaXMuZGVmYXVsdEZldGNoU2V0dGluZ3MsIHNldHRpbmdzLmRlZmF1bHRGZXRjaFNldHRpbmdzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBfcHJvY2Vzc1JlcXVlc3RzKHJlcXVlc3RzLCBwcm9jZXNzb3JzKSB7XG4gICAgICAgIGxldCB0cmFuc2Zvcm1zID0gW107XG4gICAgICAgIGxldCByZXN1bHQgPSBPcmJpdC5Qcm9taXNlLnJlc29sdmUoKTtcbiAgICAgICAgcmVxdWVzdHMuZm9yRWFjaChyZXF1ZXN0ID0+IHtcbiAgICAgICAgICAgIGxldCBwcm9jZXNzb3IgPSBwcm9jZXNzb3JzW3JlcXVlc3Qub3BdO1xuICAgICAgICAgICAgcmVzdWx0ID0gcmVzdWx0LnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBwcm9jZXNzb3IodGhpcywgcmVxdWVzdCkudGhlbihhZGRpdGlvbmFsVHJhbnNmb3JtcyA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhZGRpdGlvbmFsVHJhbnNmb3Jtcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkodHJhbnNmb3JtcywgYWRkaXRpb25hbFRyYW5zZm9ybXMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByZXN1bHQudGhlbigoKSA9PiB0cmFuc2Zvcm1zKTtcbiAgICB9XG59O1xuSlNPTkFQSVNvdXJjZSA9IF9fZGVjb3JhdGUoW3B1bGxhYmxlLCBwdXNoYWJsZSwgcXVlcnlhYmxlXSwgSlNPTkFQSVNvdXJjZSk7XG5leHBvcnQgZGVmYXVsdCBKU09OQVBJU291cmNlOyJdfQ==