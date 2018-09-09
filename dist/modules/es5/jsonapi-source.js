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
/* eslint-disable valid-jsdoc */
import Orbit, { Source, pullable, pushable, TransformNotAllowed, ClientError, ServerError, NetworkError, queryable } from '@orbit/data';
import { assert, deepMerge, deprecate } from '@orbit/utils';
import JSONAPISerializer from './jsonapi-serializer';
import { appendQueryParams } from './lib/query-params';
import { PullOperators } from './lib/pull-operators';
import { getTransformRequests, TransformRequestProcessors } from './lib/transform-requests';
import { InvalidServerResponse } from './lib/exceptions';
import { QueryOperators } from "./lib/query-operators";
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

        assert('JSONAPISource\'s `schema` must be specified in `settings.schema` constructor argument', !!settings.schema);
        assert('JSONAPISource requires Orbit.Promise be defined', Orbit.Promise);
        settings.name = settings.name || 'jsonapi';

        var _this = _possibleConstructorReturn(this, _Source.call(this, settings));

        _this.namespace = settings.namespace;
        _this.host = settings.host;
        _this.initDefaultFetchSettings(settings);
        _this.maxRequestsPerTransform = settings.maxRequestsPerTransform;
        var SerializerClass = settings.SerializerClass || JSONAPISerializer;
        _this.serializer = new SerializerClass({ schema: settings.schema, keyMap: settings.keyMap });
        return _this;
    }

    /////////////////////////////////////////////////////////////////////////////
    // Pushable interface implementation
    /////////////////////////////////////////////////////////////////////////////
    JSONAPISource.prototype._push = function _push(transform) {
        var _this2 = this;

        var requests = getTransformRequests(this, transform);
        if (this.maxRequestsPerTransform && requests.length > this.maxRequestsPerTransform) {
            return Orbit.Promise.resolve().then(function () {
                throw new TransformNotAllowed("This transform requires " + requests.length + " requests, which exceeds the specified limit of " + _this2.maxRequestsPerTransform + " requests per transform.", transform);
            });
        }
        return this._processRequests(requests, TransformRequestProcessors).then(function (transforms) {
            transforms.unshift(transform);
            return transforms;
        });
    };
    /////////////////////////////////////////////////////////////////////////////
    // Pullable interface implementation
    /////////////////////////////////////////////////////////////////////////////


    JSONAPISource.prototype._pull = function _pull(query) {
        var operator = PullOperators[query.expression.op];
        if (!operator) {
            throw new Error('JSONAPISource does not support the `${query.expression.op}` operator for queries.');
        }
        return operator(this, query);
    };
    /////////////////////////////////////////////////////////////////////////////
    // Pullable interface implementation
    /////////////////////////////////////////////////////////////////////////////


    JSONAPISource.prototype._query = function _query(query) {
        var _this3 = this;

        var operator = QueryOperators[query.expression.op];
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
            fullUrl = appendQueryParams(fullUrl, settings.params);
            delete settings.params;
        }
        // console.log('fetch', fullUrl, mergedSettings, 'polyfill', fetch.polyfill);
        var fetchFn = Orbit.fetch || fetch;
        if (settings.timeout) {
            var timeout = settings.timeout;
            delete settings.timeout;
            return new Orbit.Promise(function (resolve, reject) {
                var timedOut = void 0;
                var timer = Orbit.globals.setTimeout(function () {
                    timedOut = true;
                    reject(new NetworkError("No fetch response within " + timeout + "ms."));
                }, timeout);
                fetchFn(fullUrl, settings).catch(function (e) {
                    Orbit.globals.clearTimeout(timer);
                    if (!timedOut) {
                        return _this4.handleFetchError(e);
                    }
                }).then(function (response) {
                    Orbit.globals.clearTimeout(timer);
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

        var settings = deepMerge({}, this.defaultFetchSettings, customSettings);
        if (settings.json) {
            assert('`json` and `body` can\'t both be set for fetch requests.', !settings.body);
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
                throw new InvalidServerResponse("Server responses with a " + response.status + " status should return content with a Content-Type that includes 'application/vnd.api+json'.");
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
        return Orbit.Promise.resolve();
    };

    JSONAPISource.prototype.handleFetchResponseError = function handleFetchResponseError(response, data) {
        var error = void 0;
        if (response.status >= 400 && response.status < 500) {
            error = new ClientError(response.statusText);
        } else {
            error = new ServerError(response.statusText);
        }
        error.response = response;
        error.data = data;
        return Orbit.Promise.reject(error);
    };

    JSONAPISource.prototype.handleFetchError = function handleFetchError(e) {
        var error = new NetworkError(e);
        return Orbit.Promise.reject(error);
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
            deprecate('JSONAPISource: Pass `defaultFetchSettings` with `headers` instead of `defaultFetchHeaders` to initialize source', settings.defaultFetchHeaders === undefined);
            deprecate('JSONAPISource: Pass `defaultFetchSettings` with `timeout` instead of `defaultFetchTimeout` to initialize source', settings.defaultFetchTimeout === undefined);
            deepMerge(this.defaultFetchSettings, {
                headers: settings.defaultFetchHeaders,
                timeout: settings.defaultFetchTimeout
            });
        }
        if (settings.defaultFetchSettings) {
            deepMerge(this.defaultFetchSettings, settings.defaultFetchSettings);
        }
    };

    JSONAPISource.prototype._processRequests = function _processRequests(requests, processors) {
        var _this6 = this;

        var transforms = [];
        var result = Orbit.Promise.resolve();
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
            deprecate('JSONAPISource: Access `defaultFetchSettings.headers` instead of `defaultFetchHeaders`');
            return this.defaultFetchSettings.headers;
        },
        set: function (headers) {
            deprecate('JSONAPISource: Access `defaultFetchSettings.headers` instead of `defaultFetchHeaders`');
            this.defaultFetchSettings.headers = headers;
        }
    }, {
        key: "defaultFetchTimeout",
        get: function () {
            deprecate('JSONAPISource: Access `defaultFetchSettings.timeout` instead of `defaultFetchTimeout`');
            return this.defaultFetchSettings.timeout;
        },
        set: function (timeout) {
            deprecate('JSONAPISource: Access `defaultFetchSettings.timeout` instead of `defaultFetchTimeout`');
            this.defaultFetchSettings.timeout = timeout;
        }
    }]);

    return JSONAPISource;
}(Source);
JSONAPISource = __decorate([pullable, pushable, queryable], JSONAPISource);
export default JSONAPISource;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpzb25hcGktc291cmNlLmpzIl0sIm5hbWVzIjpbIl9fZGVjb3JhdGUiLCJkZWNvcmF0b3JzIiwidGFyZ2V0Iiwia2V5IiwiZGVzYyIsImMiLCJhcmd1bWVudHMiLCJsZW5ndGgiLCJyIiwiT2JqZWN0IiwiZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yIiwiZCIsIlJlZmxlY3QiLCJkZWNvcmF0ZSIsImkiLCJkZWZpbmVQcm9wZXJ0eSIsIk9yYml0IiwiU291cmNlIiwicHVsbGFibGUiLCJwdXNoYWJsZSIsIlRyYW5zZm9ybU5vdEFsbG93ZWQiLCJDbGllbnRFcnJvciIsIlNlcnZlckVycm9yIiwiTmV0d29ya0Vycm9yIiwicXVlcnlhYmxlIiwiYXNzZXJ0IiwiZGVlcE1lcmdlIiwiZGVwcmVjYXRlIiwiSlNPTkFQSVNlcmlhbGl6ZXIiLCJhcHBlbmRRdWVyeVBhcmFtcyIsIlB1bGxPcGVyYXRvcnMiLCJnZXRUcmFuc2Zvcm1SZXF1ZXN0cyIsIlRyYW5zZm9ybVJlcXVlc3RQcm9jZXNzb3JzIiwiSW52YWxpZFNlcnZlclJlc3BvbnNlIiwiUXVlcnlPcGVyYXRvcnMiLCJKU09OQVBJU291cmNlIiwic2V0dGluZ3MiLCJzY2hlbWEiLCJQcm9taXNlIiwibmFtZSIsIm5hbWVzcGFjZSIsImhvc3QiLCJpbml0RGVmYXVsdEZldGNoU2V0dGluZ3MiLCJtYXhSZXF1ZXN0c1BlclRyYW5zZm9ybSIsIlNlcmlhbGl6ZXJDbGFzcyIsInNlcmlhbGl6ZXIiLCJrZXlNYXAiLCJfcHVzaCIsInRyYW5zZm9ybSIsInJlcXVlc3RzIiwicmVzb2x2ZSIsInRoZW4iLCJfcHJvY2Vzc1JlcXVlc3RzIiwidHJhbnNmb3JtcyIsInVuc2hpZnQiLCJfcHVsbCIsInF1ZXJ5Iiwib3BlcmF0b3IiLCJleHByZXNzaW9uIiwib3AiLCJFcnJvciIsIl9xdWVyeSIsIl90cmFuc2Zvcm1lZCIsInJlc3BvbnNlIiwicHJpbWFyeURhdGEiLCJmZXRjaCIsInVybCIsImN1c3RvbVNldHRpbmdzIiwiaW5pdEZldGNoU2V0dGluZ3MiLCJmdWxsVXJsIiwicGFyYW1zIiwiZmV0Y2hGbiIsInRpbWVvdXQiLCJyZWplY3QiLCJ0aW1lZE91dCIsInRpbWVyIiwiZ2xvYmFscyIsInNldFRpbWVvdXQiLCJjYXRjaCIsImNsZWFyVGltZW91dCIsImhhbmRsZUZldGNoRXJyb3IiLCJlIiwiaGFuZGxlRmV0Y2hSZXNwb25zZSIsImRlZmF1bHRGZXRjaFNldHRpbmdzIiwianNvbiIsImJvZHkiLCJKU09OIiwic3RyaW5naWZ5IiwiaGVhZGVycyIsInN0YXR1cyIsInJlc3BvbnNlSGFzQ29udGVudCIsImhhbmRsZUZldGNoUmVzcG9uc2VFcnJvciIsImRhdGEiLCJlcnJvciIsInN0YXR1c1RleHQiLCJjb250ZW50VHlwZSIsImdldCIsImluZGV4T2YiLCJyZXNvdXJjZU5hbWVzcGFjZSIsInR5cGUiLCJyZXNvdXJjZUhvc3QiLCJyZXNvdXJjZVBhdGgiLCJpZCIsInBhdGgiLCJyZXNvdXJjZVR5cGUiLCJyZXNvdXJjZUlkIiwicHVzaCIsImpvaW4iLCJyZXNvdXJjZVVSTCIsInJlc291cmNlUmVsYXRpb25zaGlwVVJMIiwicmVsYXRpb25zaGlwIiwicmVzb3VyY2VSZWxhdGlvbnNoaXAiLCJyZWxhdGVkUmVzb3VyY2VVUkwiLCJBY2NlcHQiLCJkZWZhdWx0RmV0Y2hIZWFkZXJzIiwiZGVmYXVsdEZldGNoVGltZW91dCIsInVuZGVmaW5lZCIsInByb2Nlc3NvcnMiLCJyZXN1bHQiLCJmb3JFYWNoIiwicHJvY2Vzc29yIiwicmVxdWVzdCIsImFkZGl0aW9uYWxUcmFuc2Zvcm1zIiwiQXJyYXkiLCJwcm90b3R5cGUiLCJhcHBseSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLElBQUlBLGFBQWEsUUFBUSxLQUFLQSxVQUFiLElBQTJCLFVBQVVDLFVBQVYsRUFBc0JDLE1BQXRCLEVBQThCQyxHQUE5QixFQUFtQ0MsSUFBbkMsRUFBeUM7QUFDakYsUUFBSUMsSUFBSUMsVUFBVUMsTUFBbEI7QUFBQSxRQUNJQyxJQUFJ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OEJBQU1DLFNBQU4sQ0FBZ0JsQixJQUFoQixDQUFxQm1CLEtBQXJCLENBQTJCeEUsVUFBM0IsRUFBdUNxRSxvQkFBdkM7QUFDSDtBQUNKLGlCQUpNLENBQVA7QUFLSCxhQU5RLENBQVQ7QUFPSCxTQVREO0FBVUEsZUFBT0osT0FBT25FLElBQVAsQ0FBWTtBQUFBLG1CQUFNRSxVQUFOO0FBQUEsU0FBWixDQUFQO0FBQ0gsS0FyT0Q7O0FBQUE7QUFBQTtBQUFBLHlCQWEwQjtBQUN0QjFCLHNCQUFVLHVGQUFWO0FBQ0EsbUJBQU8sS0FBS3dELG9CQUFMLENBQTBCSyxPQUFqQztBQUNILFNBaEJEO0FBQUEsdUJBaUJ3QkEsT0FqQnhCLEVBaUJpQztBQUM3QjdELHNCQUFVLHVGQUFWO0FBQ0EsaUJBQUt3RCxvQkFBTCxDQUEwQkssT0FBMUIsR0FBb0NBLE9BQXBDO0FBQ0g7QUFwQkQ7QUFBQTtBQUFBLHlCQXFCMEI7QUFDdEI3RCxzQkFBVSx1RkFBVjtBQUNBLG1CQUFPLEtBQUt3RCxvQkFBTCxDQUEwQlgsT0FBakM7QUFDSCxTQXhCRDtBQUFBLHVCQXlCd0JBLE9BekJ4QixFQXlCaUM7QUFDN0I3QyxzQkFBVSx1RkFBVjtBQUNBLGlCQUFLd0Qsb0JBQUwsQ0FBMEJYLE9BQTFCLEdBQW9DQSxPQUFwQztBQUNIO0FBNUJEOztBQUFBO0FBQUEsRUFBNEN2RCxNQUE1QyxDQUFKO0FBdU9Ba0IsZ0JBQWdCbkMsV0FBVyxDQUFDa0IsUUFBRCxFQUFXQyxRQUFYLEVBQXFCSyxTQUFyQixDQUFYLEVBQTRDVyxhQUE1QyxDQUFoQjtBQUNBLGVBQWVBLGFBQWYiLCJmaWxlIjoianNvbmFwaS1zb3VyY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgX19kZWNvcmF0ZSA9IHRoaXMgJiYgdGhpcy5fX2RlY29yYXRlIHx8IGZ1bmN0aW9uIChkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xuICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aCxcbiAgICAgICAgciA9IGMgPCAzID8gdGFyZ2V0IDogZGVzYyA9PT0gbnVsbCA/IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KSA6IGRlc2MsXG4gICAgICAgIGQ7XG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xuICAgIHJldHVybiBjID4gMyAmJiByICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgciksIHI7XG59O1xuLyogZXNsaW50LWRpc2FibGUgdmFsaWQtanNkb2MgKi9cbmltcG9ydCBPcmJpdCwgeyBTb3VyY2UsIHB1bGxhYmxlLCBwdXNoYWJsZSwgVHJhbnNmb3JtTm90QWxsb3dlZCwgQ2xpZW50RXJyb3IsIFNlcnZlckVycm9yLCBOZXR3b3JrRXJyb3IsIHF1ZXJ5YWJsZSB9IGZyb20gJ0BvcmJpdC9kYXRhJztcbmltcG9ydCB7IGFzc2VydCwgZGVlcE1lcmdlLCBkZXByZWNhdGUgfSBmcm9tICdAb3JiaXQvdXRpbHMnO1xuaW1wb3J0IEpTT05BUElTZXJpYWxpemVyIGZyb20gJy4vanNvbmFwaS1zZXJpYWxpemVyJztcbmltcG9ydCB7IGFwcGVuZFF1ZXJ5UGFyYW1zIH0gZnJvbSAnLi9saWIvcXVlcnktcGFyYW1zJztcbmltcG9ydCB7IFB1bGxPcGVyYXRvcnMgfSBmcm9tICcuL2xpYi9wdWxsLW9wZXJhdG9ycyc7XG5pbXBvcnQgeyBnZXRUcmFuc2Zvcm1SZXF1ZXN0cywgVHJhbnNmb3JtUmVxdWVzdFByb2Nlc3NvcnMgfSBmcm9tICcuL2xpYi90cmFuc2Zvcm0tcmVxdWVzdHMnO1xuaW1wb3J0IHsgSW52YWxpZFNlcnZlclJlc3BvbnNlIH0gZnJvbSAnLi9saWIvZXhjZXB0aW9ucyc7XG5pbXBvcnQgeyBRdWVyeU9wZXJhdG9ycyB9IGZyb20gXCIuL2xpYi9xdWVyeS1vcGVyYXRvcnNcIjtcbi8qKlxuIFNvdXJjZSBmb3IgYWNjZXNzaW5nIGEgSlNPTiBBUEkgY29tcGxpYW50IFJFU1RmdWwgQVBJIHdpdGggYSBuZXR3b3JrIGZldGNoXG4gcmVxdWVzdC5cblxuIElmIGEgc2luZ2xlIHRyYW5zZm9ybSBvciBxdWVyeSByZXF1aXJlcyBtb3JlIHRoYW4gb25lIGZldGNoIHJlcXVlc3QsXG4gcmVxdWVzdHMgd2lsbCBiZSBwZXJmb3JtZWQgc2VxdWVudGlhbGx5IGFuZCByZXNvbHZlZCB0b2dldGhlci4gRnJvbSB0aGVcbiBwZXJzcGVjdGl2ZSBvZiBPcmJpdCwgdGhlc2Ugb3BlcmF0aW9ucyB3aWxsIGFsbCBzdWNjZWVkIG9yIGZhaWwgdG9nZXRoZXIuIFRoZVxuIGBtYXhSZXF1ZXN0c1BlclRyYW5zZm9ybWAgYW5kIGBtYXhSZXF1ZXN0c1BlclF1ZXJ5YCBzZXR0aW5ncyBhbGxvdyBsaW1pdHMgdG8gYmVcbiBzZXQgb24gdGhpcyBiZWhhdmlvci4gVGhlc2Ugc2V0dGluZ3Mgc2hvdWxkIGJlIHNldCB0byBgMWAgaWYgeW91ciBjbGllbnQvc2VydmVyXG4gY29uZmlndXJhdGlvbiBpcyB1bmFibGUgdG8gcmVzb2x2ZSBwYXJ0aWFsbHkgc3VjY2Vzc2Z1bCB0cmFuc2Zvcm1zIC8gcXVlcmllcy5cblxuIEBjbGFzcyBKU09OQVBJU291cmNlXG4gQGV4dGVuZHMgU291cmNlXG4gKi9cbmxldCBKU09OQVBJU291cmNlID0gY2xhc3MgSlNPTkFQSVNvdXJjZSBleHRlbmRzIFNvdXJjZSB7XG4gICAgY29uc3RydWN0b3Ioc2V0dGluZ3MgPSB7fSkge1xuICAgICAgICBhc3NlcnQoJ0pTT05BUElTb3VyY2VcXCdzIGBzY2hlbWFgIG11c3QgYmUgc3BlY2lmaWVkIGluIGBzZXR0aW5ncy5zY2hlbWFgIGNvbnN0cnVjdG9yIGFyZ3VtZW50JywgISFzZXR0aW5ncy5zY2hlbWEpO1xuICAgICAgICBhc3NlcnQoJ0pTT05BUElTb3VyY2UgcmVxdWlyZXMgT3JiaXQuUHJvbWlzZSBiZSBkZWZpbmVkJywgT3JiaXQuUHJvbWlzZSk7XG4gICAgICAgIHNldHRpbmdzLm5hbWUgPSBzZXR0aW5ncy5uYW1lIHx8ICdqc29uYXBpJztcbiAgICAgICAgc3VwZXIoc2V0dGluZ3MpO1xuICAgICAgICB0aGlzLm5hbWVzcGFjZSA9IHNldHRpbmdzLm5hbWVzcGFjZTtcbiAgICAgICAgdGhpcy5ob3N0ID0gc2V0dGluZ3MuaG9zdDtcbiAgICAgICAgdGhpcy5pbml0RGVmYXVsdEZldGNoU2V0dGluZ3Moc2V0dGluZ3MpO1xuICAgICAgICB0aGlzLm1heFJlcXVlc3RzUGVyVHJhbnNmb3JtID0gc2V0dGluZ3MubWF4UmVxdWVzdHNQZXJUcmFuc2Zvcm07XG4gICAgICAgIGNvbnN0IFNlcmlhbGl6ZXJDbGFzcyA9IHNldHRpbmdzLlNlcmlhbGl6ZXJDbGFzcyB8fCBKU09OQVBJU2VyaWFsaXplcjtcbiAgICAgICAgdGhpcy5zZXJpYWxpemVyID0gbmV3IFNlcmlhbGl6ZXJDbGFzcyh7IHNjaGVtYTogc2V0dGluZ3Muc2NoZW1hLCBrZXlNYXA6IHNldHRpbmdzLmtleU1hcCB9KTtcbiAgICB9XG4gICAgZ2V0IGRlZmF1bHRGZXRjaEhlYWRlcnMoKSB7XG4gICAgICAgIGRlcHJlY2F0ZSgnSlNPTkFQSVNvdXJjZTogQWNjZXNzIGBkZWZhdWx0RmV0Y2hTZXR0aW5ncy5oZWFkZXJzYCBpbnN0ZWFkIG9mIGBkZWZhdWx0RmV0Y2hIZWFkZXJzYCcpO1xuICAgICAgICByZXR1cm4gdGhpcy5kZWZhdWx0RmV0Y2hTZXR0aW5ncy5oZWFkZXJzO1xuICAgIH1cbiAgICBzZXQgZGVmYXVsdEZldGNoSGVhZGVycyhoZWFkZXJzKSB7XG4gICAgICAgIGRlcHJlY2F0ZSgnSlNPTkFQSVNvdXJjZTogQWNjZXNzIGBkZWZhdWx0RmV0Y2hTZXR0aW5ncy5oZWFkZXJzYCBpbnN0ZWFkIG9mIGBkZWZhdWx0RmV0Y2hIZWFkZXJzYCcpO1xuICAgICAgICB0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzLmhlYWRlcnMgPSBoZWFkZXJzO1xuICAgIH1cbiAgICBnZXQgZGVmYXVsdEZldGNoVGltZW91dCgpIHtcbiAgICAgICAgZGVwcmVjYXRlKCdKU09OQVBJU291cmNlOiBBY2Nlc3MgYGRlZmF1bHRGZXRjaFNldHRpbmdzLnRpbWVvdXRgIGluc3RlYWQgb2YgYGRlZmF1bHRGZXRjaFRpbWVvdXRgJyk7XG4gICAgICAgIHJldHVybiB0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzLnRpbWVvdXQ7XG4gICAgfVxuICAgIHNldCBkZWZhdWx0RmV0Y2hUaW1lb3V0KHRpbWVvdXQpIHtcbiAgICAgICAgZGVwcmVjYXRlKCdKU09OQVBJU291cmNlOiBBY2Nlc3MgYGRlZmF1bHRGZXRjaFNldHRpbmdzLnRpbWVvdXRgIGluc3RlYWQgb2YgYGRlZmF1bHRGZXRjaFRpbWVvdXRgJyk7XG4gICAgICAgIHRoaXMuZGVmYXVsdEZldGNoU2V0dGluZ3MudGltZW91dCA9IHRpbWVvdXQ7XG4gICAgfVxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgLy8gUHVzaGFibGUgaW50ZXJmYWNlIGltcGxlbWVudGF0aW9uXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICBfcHVzaCh0cmFuc2Zvcm0pIHtcbiAgICAgICAgY29uc3QgcmVxdWVzdHMgPSBnZXRUcmFuc2Zvcm1SZXF1ZXN0cyh0aGlzLCB0cmFuc2Zvcm0pO1xuICAgICAgICBpZiAodGhpcy5tYXhSZXF1ZXN0c1BlclRyYW5zZm9ybSAmJiByZXF1ZXN0cy5sZW5ndGggPiB0aGlzLm1heFJlcXVlc3RzUGVyVHJhbnNmb3JtKSB7XG4gICAgICAgICAgICByZXR1cm4gT3JiaXQuUHJvbWlzZS5yZXNvbHZlKCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFRyYW5zZm9ybU5vdEFsbG93ZWQoYFRoaXMgdHJhbnNmb3JtIHJlcXVpcmVzICR7cmVxdWVzdHMubGVuZ3RofSByZXF1ZXN0cywgd2hpY2ggZXhjZWVkcyB0aGUgc3BlY2lmaWVkIGxpbWl0IG9mICR7dGhpcy5tYXhSZXF1ZXN0c1BlclRyYW5zZm9ybX0gcmVxdWVzdHMgcGVyIHRyYW5zZm9ybS5gLCB0cmFuc2Zvcm0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3Byb2Nlc3NSZXF1ZXN0cyhyZXF1ZXN0cywgVHJhbnNmb3JtUmVxdWVzdFByb2Nlc3NvcnMpLnRoZW4odHJhbnNmb3JtcyA9PiB7XG4gICAgICAgICAgICB0cmFuc2Zvcm1zLnVuc2hpZnQodHJhbnNmb3JtKTtcbiAgICAgICAgICAgIHJldHVybiB0cmFuc2Zvcm1zO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBQdWxsYWJsZSBpbnRlcmZhY2UgaW1wbGVtZW50YXRpb25cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIF9wdWxsKHF1ZXJ5KSB7XG4gICAgICAgIGNvbnN0IG9wZXJhdG9yID0gUHVsbE9wZXJhdG9yc1txdWVyeS5leHByZXNzaW9uLm9wXTtcbiAgICAgICAgaWYgKCFvcGVyYXRvcikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdKU09OQVBJU291cmNlIGRvZXMgbm90IHN1cHBvcnQgdGhlIGAke3F1ZXJ5LmV4cHJlc3Npb24ub3B9YCBvcGVyYXRvciBmb3IgcXVlcmllcy4nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3BlcmF0b3IodGhpcywgcXVlcnkpO1xuICAgIH1cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIC8vIFB1bGxhYmxlIGludGVyZmFjZSBpbXBsZW1lbnRhdGlvblxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgX3F1ZXJ5KHF1ZXJ5KSB7XG4gICAgICAgIGNvbnN0IG9wZXJhdG9yID0gUXVlcnlPcGVyYXRvcnNbcXVlcnkuZXhwcmVzc2lvbi5vcF07XG4gICAgICAgIGlmICghb3BlcmF0b3IpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSlNPTkFQSVNvdXJjZSBkb2VzIG5vdCBzdXBwb3J0IHRoZSBgJHtxdWVyeS5leHByZXNzaW9uLm9wfWAgb3BlcmF0b3IgZm9yIHF1ZXJpZXMuJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9wZXJhdG9yKHRoaXMsIHF1ZXJ5KS50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl90cmFuc2Zvcm1lZChyZXNwb25zZS50cmFuc2Zvcm1zKS50aGVuKCgpID0+IHJlc3BvbnNlLnByaW1hcnlEYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgLy8gUHVibGljbHkgYWNjZXNzaWJsZSBtZXRob2RzIHBhcnRpY3VsYXIgdG8gSlNPTkFQSVNvdXJjZVxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgZmV0Y2godXJsLCBjdXN0b21TZXR0aW5ncykge1xuICAgICAgICBsZXQgc2V0dGluZ3MgPSB0aGlzLmluaXRGZXRjaFNldHRpbmdzKGN1c3RvbVNldHRpbmdzKTtcbiAgICAgICAgbGV0IGZ1bGxVcmwgPSB1cmw7XG4gICAgICAgIGlmIChzZXR0aW5ncy5wYXJhbXMpIHtcbiAgICAgICAgICAgIGZ1bGxVcmwgPSBhcHBlbmRRdWVyeVBhcmFtcyhmdWxsVXJsLCBzZXR0aW5ncy5wYXJhbXMpO1xuICAgICAgICAgICAgZGVsZXRlIHNldHRpbmdzLnBhcmFtcztcbiAgICAgICAgfVxuICAgICAgICAvLyBjb25zb2xlLmxvZygnZmV0Y2gnLCBmdWxsVXJsLCBtZXJnZWRTZXR0aW5ncywgJ3BvbHlmaWxsJywgZmV0Y2gucG9seWZpbGwpO1xuICAgICAgICBsZXQgZmV0Y2hGbiA9IE9yYml0LmZldGNoIHx8IGZldGNoO1xuICAgICAgICBpZiAoc2V0dGluZ3MudGltZW91dCkge1xuICAgICAgICAgICAgbGV0IHRpbWVvdXQgPSBzZXR0aW5ncy50aW1lb3V0O1xuICAgICAgICAgICAgZGVsZXRlIHNldHRpbmdzLnRpbWVvdXQ7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE9yYml0LlByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgIGxldCB0aW1lZE91dDtcbiAgICAgICAgICAgICAgICBsZXQgdGltZXIgPSBPcmJpdC5nbG9iYWxzLnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aW1lZE91dCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChuZXcgTmV0d29ya0Vycm9yKGBObyBmZXRjaCByZXNwb25zZSB3aXRoaW4gJHt0aW1lb3V0fW1zLmApKTtcbiAgICAgICAgICAgICAgICB9LCB0aW1lb3V0KTtcbiAgICAgICAgICAgICAgICBmZXRjaEZuKGZ1bGxVcmwsIHNldHRpbmdzKS5jYXRjaChlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgT3JiaXQuZ2xvYmFscy5jbGVhclRpbWVvdXQodGltZXIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXRpbWVkT3V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVGZXRjaEVycm9yKGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkudGhlbihyZXNwb25zZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIE9yYml0Lmdsb2JhbHMuY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aW1lZE91dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlRmV0Y2hSZXNwb25zZShyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBmZXRjaEZuKGZ1bGxVcmwsIHNldHRpbmdzKS5jYXRjaChlID0+IHRoaXMuaGFuZGxlRmV0Y2hFcnJvcihlKSkudGhlbihyZXNwb25zZSA9PiB0aGlzLmhhbmRsZUZldGNoUmVzcG9uc2UocmVzcG9uc2UpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpbml0RmV0Y2hTZXR0aW5ncyhjdXN0b21TZXR0aW5ncyA9IHt9KSB7XG4gICAgICAgIGxldCBzZXR0aW5ncyA9IGRlZXBNZXJnZSh7fSwgdGhpcy5kZWZhdWx0RmV0Y2hTZXR0aW5ncywgY3VzdG9tU2V0dGluZ3MpO1xuICAgICAgICBpZiAoc2V0dGluZ3MuanNvbikge1xuICAgICAgICAgICAgYXNzZXJ0KCdganNvbmAgYW5kIGBib2R5YCBjYW5cXCd0IGJvdGggYmUgc2V0IGZvciBmZXRjaCByZXF1ZXN0cy4nLCAhc2V0dGluZ3MuYm9keSk7XG4gICAgICAgICAgICBzZXR0aW5ncy5ib2R5ID0gSlNPTi5zdHJpbmdpZnkoc2V0dGluZ3MuanNvbik7XG4gICAgICAgICAgICBkZWxldGUgc2V0dGluZ3MuanNvbjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2V0dGluZ3MuaGVhZGVycyAmJiAhc2V0dGluZ3MuYm9keSkge1xuICAgICAgICAgICAgZGVsZXRlIHNldHRpbmdzLmhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzZXR0aW5ncztcbiAgICB9XG4gICAgaGFuZGxlRmV0Y2hSZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSAyMDEpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlc3BvbnNlSGFzQ29udGVudChyZXNwb25zZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgSW52YWxpZFNlcnZlclJlc3BvbnNlKGBTZXJ2ZXIgcmVzcG9uc2VzIHdpdGggYSAke3Jlc3BvbnNlLnN0YXR1c30gc3RhdHVzIHNob3VsZCByZXR1cm4gY29udGVudCB3aXRoIGEgQ29udGVudC1UeXBlIHRoYXQgaW5jbHVkZXMgJ2FwcGxpY2F0aW9uL3ZuZC5hcGkranNvbicuYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2Uuc3RhdHVzID49IDIwMCAmJiByZXNwb25zZS5zdGF0dXMgPCAzMDApIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlc3BvbnNlSGFzQ29udGVudChyZXNwb25zZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHRoaXMucmVzcG9uc2VIYXNDb250ZW50KHJlc3BvbnNlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkudGhlbihkYXRhID0+IHRoaXMuaGFuZGxlRmV0Y2hSZXNwb25zZUVycm9yKHJlc3BvbnNlLCBkYXRhKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZUZldGNoUmVzcG9uc2VFcnJvcihyZXNwb25zZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE9yYml0LlByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cbiAgICBoYW5kbGVGZXRjaFJlc3BvbnNlRXJyb3IocmVzcG9uc2UsIGRhdGEpIHtcbiAgICAgICAgbGV0IGVycm9yO1xuICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID49IDQwMCAmJiByZXNwb25zZS5zdGF0dXMgPCA1MDApIHtcbiAgICAgICAgICAgIGVycm9yID0gbmV3IENsaWVudEVycm9yKHJlc3BvbnNlLnN0YXR1c1RleHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXJyb3IgPSBuZXcgU2VydmVyRXJyb3IocmVzcG9uc2Uuc3RhdHVzVGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgZXJyb3IucmVzcG9uc2UgPSByZXNwb25zZTtcbiAgICAgICAgZXJyb3IuZGF0YSA9IGRhdGE7XG4gICAgICAgIHJldHVybiBPcmJpdC5Qcm9taXNlLnJlamVjdChlcnJvcik7XG4gICAgfVxuICAgIGhhbmRsZUZldGNoRXJyb3IoZSkge1xuICAgICAgICBsZXQgZXJyb3IgPSBuZXcgTmV0d29ya0Vycm9yKGUpO1xuICAgICAgICByZXR1cm4gT3JiaXQuUHJvbWlzZS5yZWplY3QoZXJyb3IpO1xuICAgIH1cbiAgICByZXNwb25zZUhhc0NvbnRlbnQocmVzcG9uc2UpIHtcbiAgICAgICAgbGV0IGNvbnRlbnRUeXBlID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ0NvbnRlbnQtVHlwZScpO1xuICAgICAgICByZXR1cm4gY29udGVudFR5cGUgJiYgY29udGVudFR5cGUuaW5kZXhPZignYXBwbGljYXRpb24vdm5kLmFwaStqc29uJykgPiAtMTtcbiAgICB9XG4gICAgcmVzb3VyY2VOYW1lc3BhY2UodHlwZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5uYW1lc3BhY2U7XG4gICAgfVxuICAgIHJlc291cmNlSG9zdCh0eXBlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmhvc3Q7XG4gICAgfVxuICAgIHJlc291cmNlUGF0aCh0eXBlLCBpZCkge1xuICAgICAgICBsZXQgcGF0aCA9IFt0aGlzLnNlcmlhbGl6ZXIucmVzb3VyY2VUeXBlKHR5cGUpXTtcbiAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgICBsZXQgcmVzb3VyY2VJZCA9IHRoaXMuc2VyaWFsaXplci5yZXNvdXJjZUlkKHR5cGUsIGlkKTtcbiAgICAgICAgICAgIGlmIChyZXNvdXJjZUlkKSB7XG4gICAgICAgICAgICAgICAgcGF0aC5wdXNoKHJlc291cmNlSWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXRoLmpvaW4oJy8nKTtcbiAgICB9XG4gICAgcmVzb3VyY2VVUkwodHlwZSwgaWQpIHtcbiAgICAgICAgbGV0IGhvc3QgPSB0aGlzLnJlc291cmNlSG9zdCh0eXBlKTtcbiAgICAgICAgbGV0IG5hbWVzcGFjZSA9IHRoaXMucmVzb3VyY2VOYW1lc3BhY2UodHlwZSk7XG4gICAgICAgIGxldCB1cmwgPSBbXTtcbiAgICAgICAgaWYgKGhvc3QpIHtcbiAgICAgICAgICAgIHVybC5wdXNoKGhvc3QpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChuYW1lc3BhY2UpIHtcbiAgICAgICAgICAgIHVybC5wdXNoKG5hbWVzcGFjZSk7XG4gICAgICAgIH1cbiAgICAgICAgdXJsLnB1c2godGhpcy5yZXNvdXJjZVBhdGgodHlwZSwgaWQpKTtcbiAgICAgICAgaWYgKCFob3N0KSB7XG4gICAgICAgICAgICB1cmwudW5zaGlmdCgnJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVybC5qb2luKCcvJyk7XG4gICAgfVxuICAgIHJlc291cmNlUmVsYXRpb25zaGlwVVJMKHR5cGUsIGlkLCByZWxhdGlvbnNoaXApIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVzb3VyY2VVUkwodHlwZSwgaWQpICsgJy9yZWxhdGlvbnNoaXBzLycgKyB0aGlzLnNlcmlhbGl6ZXIucmVzb3VyY2VSZWxhdGlvbnNoaXAodHlwZSwgcmVsYXRpb25zaGlwKTtcbiAgICB9XG4gICAgcmVsYXRlZFJlc291cmNlVVJMKHR5cGUsIGlkLCByZWxhdGlvbnNoaXApIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVzb3VyY2VVUkwodHlwZSwgaWQpICsgJy8nICsgdGhpcy5zZXJpYWxpemVyLnJlc291cmNlUmVsYXRpb25zaGlwKHR5cGUsIHJlbGF0aW9uc2hpcCk7XG4gICAgfVxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgLy8gUHJpdmF0ZSBtZXRob2RzXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICBpbml0RGVmYXVsdEZldGNoU2V0dGluZ3Moc2V0dGluZ3MpIHtcbiAgICAgICAgdGhpcy5kZWZhdWx0RmV0Y2hTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgICBBY2NlcHQ6ICdhcHBsaWNhdGlvbi92bmQuYXBpK2pzb24nLFxuICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vdm5kLmFwaStqc29uJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRpbWVvdXQ6IDUwMDBcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHNldHRpbmdzLmRlZmF1bHRGZXRjaEhlYWRlcnMgfHwgc2V0dGluZ3MuZGVmYXVsdEZldGNoVGltZW91dCkge1xuICAgICAgICAgICAgZGVwcmVjYXRlKCdKU09OQVBJU291cmNlOiBQYXNzIGBkZWZhdWx0RmV0Y2hTZXR0aW5nc2Agd2l0aCBgaGVhZGVyc2AgaW5zdGVhZCBvZiBgZGVmYXVsdEZldGNoSGVhZGVyc2AgdG8gaW5pdGlhbGl6ZSBzb3VyY2UnLCBzZXR0aW5ncy5kZWZhdWx0RmV0Y2hIZWFkZXJzID09PSB1bmRlZmluZWQpO1xuICAgICAgICAgICAgZGVwcmVjYXRlKCdKU09OQVBJU291cmNlOiBQYXNzIGBkZWZhdWx0RmV0Y2hTZXR0aW5nc2Agd2l0aCBgdGltZW91dGAgaW5zdGVhZCBvZiBgZGVmYXVsdEZldGNoVGltZW91dGAgdG8gaW5pdGlhbGl6ZSBzb3VyY2UnLCBzZXR0aW5ncy5kZWZhdWx0RmV0Y2hUaW1lb3V0ID09PSB1bmRlZmluZWQpO1xuICAgICAgICAgICAgZGVlcE1lcmdlKHRoaXMuZGVmYXVsdEZldGNoU2V0dGluZ3MsIHtcbiAgICAgICAgICAgICAgICBoZWFkZXJzOiBzZXR0aW5ncy5kZWZhdWx0RmV0Y2hIZWFkZXJzLFxuICAgICAgICAgICAgICAgIHRpbWVvdXQ6IHNldHRpbmdzLmRlZmF1bHRGZXRjaFRpbWVvdXRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzZXR0aW5ncy5kZWZhdWx0RmV0Y2hTZXR0aW5ncykge1xuICAgICAgICAgICAgZGVlcE1lcmdlKHRoaXMuZGVmYXVsdEZldGNoU2V0dGluZ3MsIHNldHRpbmdzLmRlZmF1bHRGZXRjaFNldHRpbmdzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBfcHJvY2Vzc1JlcXVlc3RzKHJlcXVlc3RzLCBwcm9jZXNzb3JzKSB7XG4gICAgICAgIGxldCB0cmFuc2Zvcm1zID0gW107XG4gICAgICAgIGxldCByZXN1bHQgPSBPcmJpdC5Qcm9taXNlLnJlc29sdmUoKTtcbiAgICAgICAgcmVxdWVzdHMuZm9yRWFjaChyZXF1ZXN0ID0+IHtcbiAgICAgICAgICAgIGxldCBwcm9jZXNzb3IgPSBwcm9jZXNzb3JzW3JlcXVlc3Qub3BdO1xuICAgICAgICAgICAgcmVzdWx0ID0gcmVzdWx0LnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBwcm9jZXNzb3IodGhpcywgcmVxdWVzdCkudGhlbihhZGRpdGlvbmFsVHJhbnNmb3JtcyA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhZGRpdGlvbmFsVHJhbnNmb3Jtcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkodHJhbnNmb3JtcywgYWRkaXRpb25hbFRyYW5zZm9ybXMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByZXN1bHQudGhlbigoKSA9PiB0cmFuc2Zvcm1zKTtcbiAgICB9XG59O1xuSlNPTkFQSVNvdXJjZSA9IF9fZGVjb3JhdGUoW3B1bGxhYmxlLCBwdXNoYWJsZSwgcXVlcnlhYmxlXSwgSlNPTkFQSVNvdXJjZSk7XG5leHBvcnQgZGVmYXVsdCBKU09OQVBJU291cmNlOyJdfQ==