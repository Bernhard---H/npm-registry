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
        var operator = QueryOperators[query.expression.op];
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
                        return _this3.handleFetchError(e);
                    }
                }).then(function (response) {
                    Orbit.globals.clearTimeout(timer);
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
        var _this4 = this;

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
                    return _this4.handleFetchResponseError(response, data);
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
        var _this5 = this;

        var transforms = [];
        var result = Orbit.Promise.resolve();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpzb25hcGktc291cmNlLmpzIl0sIm5hbWVzIjpbIl9fZGVjb3JhdGUiLCJkZWNvcmF0b3JzIiwidGFyZ2V0Iiwia2V5IiwiZGVzYyIsImMiLCJhcmd1bWVudHMiLCJsZW5ndGgiLCJyIiwiT2JqZWN0IiwiZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yIiwiZCIsIlJlZmxlY3QiLCJkZWNvcmF0ZSIsImkiLCJkZWZpbmVQcm9wZXJ0eSIsIk9yYml0IiwiU291cmNlIiwicHVsbGFibGUiLCJwdXNoYWJsZSIsIlRyYW5zZm9ybU5vdEFsbG93ZWQiLCJDbGllbnRFcnJvciIsIlNlcnZlckVycm9yIiwiTmV0d29ya0Vycm9yIiwicXVlcnlhYmxlIiwiYXNzZXJ0IiwiZGVlcE1lcmdlIiwiZGVwcmVjYXRlIiwiSlNPTkFQSVNlcmlhbGl6ZXIiLCJhcHBlbmRRdWVyeVBhcmFtcyIsIlB1bGxPcGVyYXRvcnMiLCJnZXRUcmFuc2Zvcm1SZXF1ZXN0cyIsIlRyYW5zZm9ybVJlcXVlc3RQcm9jZXNzb3JzIiwiSW52YWxpZFNlcnZlclJlc3BvbnNlIiwiUXVlcnlPcGVyYXRvcnMiLCJKU09OQVBJU291cmNlIiwic2V0dGluZ3MiLCJzY2hlbWEiLCJQcm9taXNlIiwibmFtZSIsIm5hbWVzcGFjZSIsImhvc3QiLCJpbml0RGVmYXVsdEZldGNoU2V0dGluZ3MiLCJtYXhSZXF1ZXN0c1BlclRyYW5zZm9ybSIsIlNlcmlhbGl6ZXJDbGFzcyIsInNlcmlhbGl6ZXIiLCJrZXlNYXAiLCJfcHVzaCIsInRyYW5zZm9ybSIsInJlcXVlc3RzIiwicmVzb2x2ZSIsInRoZW4iLCJfcHJvY2Vzc1JlcXVlc3RzIiwidHJhbnNmb3JtcyIsInVuc2hpZnQiLCJfcHVsbCIsInF1ZXJ5Iiwib3BlcmF0b3IiLCJleHByZXNzaW9uIiwib3AiLCJFcnJvciIsIl9xdWVyeSIsImZldGNoIiwidXJsIiwiY3VzdG9tU2V0dGluZ3MiLCJpbml0RmV0Y2hTZXR0aW5ncyIsImZ1bGxVcmwiLCJwYXJhbXMiLCJmZXRjaEZuIiwidGltZW91dCIsInJlamVjdCIsInRpbWVkT3V0IiwidGltZXIiLCJnbG9iYWxzIiwic2V0VGltZW91dCIsImNhdGNoIiwiY2xlYXJUaW1lb3V0IiwiaGFuZGxlRmV0Y2hFcnJvciIsImUiLCJoYW5kbGVGZXRjaFJlc3BvbnNlIiwicmVzcG9uc2UiLCJkZWZhdWx0RmV0Y2hTZXR0aW5ncyIsImpzb24iLCJib2R5IiwiSlNPTiIsInN0cmluZ2lmeSIsImhlYWRlcnMiLCJzdGF0dXMiLCJyZXNwb25zZUhhc0NvbnRlbnQiLCJoYW5kbGVGZXRjaFJlc3BvbnNlRXJyb3IiLCJkYXRhIiwiZXJyb3IiLCJzdGF0dXNUZXh0IiwiY29udGVudFR5cGUiLCJnZXQiLCJpbmRleE9mIiwicmVzb3VyY2VOYW1lc3BhY2UiLCJ0eXBlIiwicmVzb3VyY2VIb3N0IiwicmVzb3VyY2VQYXRoIiwiaWQiLCJwYXRoIiwicmVzb3VyY2VUeXBlIiwicmVzb3VyY2VJZCIsInB1c2giLCJqb2luIiwicmVzb3VyY2VVUkwiLCJyZXNvdXJjZVJlbGF0aW9uc2hpcFVSTCIsInJlbGF0aW9uc2hpcCIsInJlc291cmNlUmVsYXRpb25zaGlwIiwicmVsYXRlZFJlc291cmNlVVJMIiwiQWNjZXB0IiwiZGVmYXVsdEZldGNoSGVhZGVycyIsImRlZmF1bHRGZXRjaFRpbWVvdXQiLCJ1bmRlZmluZWQiLCJwcm9jZXNzb3JzIiwicmVzdWx0IiwiZm9yRWFjaCIsInByb2Nlc3NvciIsInJlcXVlc3QiLCJhZGRpdGlvbmFsVHJhbnNmb3JtcyIsIkFycmF5IiwicHJvdG90eXBlIiwiYXBwbHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxhQUFhLFFBQVEsS0FBS0EsVUFBYixJQUEyQixVQUFVQyxVQUFWLEVBQXNCQyxNQUF0QixFQUE4QkMsR0FBOUIsRUFBbUNDLElBQW5DLEVBQXlDO0FBQ2pGLFFBQUlDLElBQUlDLFVBQVVDLE1BQWxCO0FBQUEsUUFDSUMsSUFBSUgsSUFBSSxDQUFKLEdBQVFILE1BQVIsR0FBaUJF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LHlCQWEwQjtBQUN0QjFCLHNCQUFVLHVGQUFWO0FBQ0EsbUJBQU8sS0FBS3NELG9CQUFMLENBQTBCSyxPQUFqQztBQUNILFNBaEJEO0FBQUEsdUJBaUJ3QkEsT0FqQnhCLEVBaUJpQztBQUM3QjNELHNCQUFVLHVGQUFWO0FBQ0EsaUJBQUtzRCxvQkFBTCxDQUEwQkssT0FBMUIsR0FBb0NBLE9BQXBDO0FBQ0g7QUFwQkQ7QUFBQTtBQUFBLHlCQXFCMEI7QUFDdEIzRCxzQkFBVSx1RkFBVjtBQUNBLG1CQUFPLEtBQUtzRCxvQkFBTCxDQUEwQlosT0FBakM7QUFDSCxTQXhCRDtBQUFBLHVCQXlCd0JBLE9BekJ4QixFQXlCaUM7QUFDN0IxQyxzQkFBVSx1RkFBVjtBQUNBLGlCQUFLc0Qsb0JBQUwsQ0FBMEJaLE9BQTFCLEdBQW9DQSxPQUFwQztBQUNIO0FBNUJEOztBQUFBO0FBQUEsRUFBNENwRCxNQUE1QyxDQUFKO0FBcU9Ba0IsZ0JBQWdCbkMsV0FBVyxDQUFDa0IsUUFBRCxFQUFXQyxRQUFYLEVBQXFCSyxTQUFyQixDQUFYLEVBQTRDVyxhQUE1QyxDQUFoQjtBQUNBLGVBQWVBLGFBQWYiLCJmaWxlIjoianNvbmFwaS1zb3VyY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgX19kZWNvcmF0ZSA9IHRoaXMgJiYgdGhpcy5fX2RlY29yYXRlIHx8IGZ1bmN0aW9uIChkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xuICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aCxcbiAgICAgICAgciA9IGMgPCAzID8gdGFyZ2V0IDogZGVzYyA9PT0gbnVsbCA/IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KSA6IGRlc2MsXG4gICAgICAgIGQ7XG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xuICAgIHJldHVybiBjID4gMyAmJiByICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgciksIHI7XG59O1xuLyogZXNsaW50LWRpc2FibGUgdmFsaWQtanNkb2MgKi9cbmltcG9ydCBPcmJpdCwgeyBTb3VyY2UsIHB1bGxhYmxlLCBwdXNoYWJsZSwgVHJhbnNmb3JtTm90QWxsb3dlZCwgQ2xpZW50RXJyb3IsIFNlcnZlckVycm9yLCBOZXR3b3JrRXJyb3IsIHF1ZXJ5YWJsZSB9IGZyb20gJ0BvcmJpdC9kYXRhJztcbmltcG9ydCB7IGFzc2VydCwgZGVlcE1lcmdlLCBkZXByZWNhdGUgfSBmcm9tICdAb3JiaXQvdXRpbHMnO1xuaW1wb3J0IEpTT05BUElTZXJpYWxpemVyIGZyb20gJy4vanNvbmFwaS1zZXJpYWxpemVyJztcbmltcG9ydCB7IGFwcGVuZFF1ZXJ5UGFyYW1zIH0gZnJvbSAnLi9saWIvcXVlcnktcGFyYW1zJztcbmltcG9ydCB7IFB1bGxPcGVyYXRvcnMgfSBmcm9tICcuL2xpYi9wdWxsLW9wZXJhdG9ycyc7XG5pbXBvcnQgeyBnZXRUcmFuc2Zvcm1SZXF1ZXN0cywgVHJhbnNmb3JtUmVxdWVzdFByb2Nlc3NvcnMgfSBmcm9tICcuL2xpYi90cmFuc2Zvcm0tcmVxdWVzdHMnO1xuaW1wb3J0IHsgSW52YWxpZFNlcnZlclJlc3BvbnNlIH0gZnJvbSAnLi9saWIvZXhjZXB0aW9ucyc7XG5pbXBvcnQgeyBRdWVyeU9wZXJhdG9ycyB9IGZyb20gXCIuL2xpYi9xdWVyeS1vcGVyYXRvcnNcIjtcbi8qKlxuIFNvdXJjZSBmb3IgYWNjZXNzaW5nIGEgSlNPTiBBUEkgY29tcGxpYW50IFJFU1RmdWwgQVBJIHdpdGggYSBuZXR3b3JrIGZldGNoXG4gcmVxdWVzdC5cblxuIElmIGEgc2luZ2xlIHRyYW5zZm9ybSBvciBxdWVyeSByZXF1aXJlcyBtb3JlIHRoYW4gb25lIGZldGNoIHJlcXVlc3QsXG4gcmVxdWVzdHMgd2lsbCBiZSBwZXJmb3JtZWQgc2VxdWVudGlhbGx5IGFuZCByZXNvbHZlZCB0b2dldGhlci4gRnJvbSB0aGVcbiBwZXJzcGVjdGl2ZSBvZiBPcmJpdCwgdGhlc2Ugb3BlcmF0aW9ucyB3aWxsIGFsbCBzdWNjZWVkIG9yIGZhaWwgdG9nZXRoZXIuIFRoZVxuIGBtYXhSZXF1ZXN0c1BlclRyYW5zZm9ybWAgYW5kIGBtYXhSZXF1ZXN0c1BlclF1ZXJ5YCBzZXR0aW5ncyBhbGxvdyBsaW1pdHMgdG8gYmVcbiBzZXQgb24gdGhpcyBiZWhhdmlvci4gVGhlc2Ugc2V0dGluZ3Mgc2hvdWxkIGJlIHNldCB0byBgMWAgaWYgeW91ciBjbGllbnQvc2VydmVyXG4gY29uZmlndXJhdGlvbiBpcyB1bmFibGUgdG8gcmVzb2x2ZSBwYXJ0aWFsbHkgc3VjY2Vzc2Z1bCB0cmFuc2Zvcm1zIC8gcXVlcmllcy5cblxuIEBjbGFzcyBKU09OQVBJU291cmNlXG4gQGV4dGVuZHMgU291cmNlXG4gKi9cbmxldCBKU09OQVBJU291cmNlID0gY2xhc3MgSlNPTkFQSVNvdXJjZSBleHRlbmRzIFNvdXJjZSB7XG4gICAgY29uc3RydWN0b3Ioc2V0dGluZ3MgPSB7fSkge1xuICAgICAgICBhc3NlcnQoJ0pTT05BUElTb3VyY2VcXCdzIGBzY2hlbWFgIG11c3QgYmUgc3BlY2lmaWVkIGluIGBzZXR0aW5ncy5zY2hlbWFgIGNvbnN0cnVjdG9yIGFyZ3VtZW50JywgISFzZXR0aW5ncy5zY2hlbWEpO1xuICAgICAgICBhc3NlcnQoJ0pTT05BUElTb3VyY2UgcmVxdWlyZXMgT3JiaXQuUHJvbWlzZSBiZSBkZWZpbmVkJywgT3JiaXQuUHJvbWlzZSk7XG4gICAgICAgIHNldHRpbmdzLm5hbWUgPSBzZXR0aW5ncy5uYW1lIHx8ICdqc29uYXBpJztcbiAgICAgICAgc3VwZXIoc2V0dGluZ3MpO1xuICAgICAgICB0aGlzLm5hbWVzcGFjZSA9IHNldHRpbmdzLm5hbWVzcGFjZTtcbiAgICAgICAgdGhpcy5ob3N0ID0gc2V0dGluZ3MuaG9zdDtcbiAgICAgICAgdGhpcy5pbml0RGVmYXVsdEZldGNoU2V0dGluZ3Moc2V0dGluZ3MpO1xuICAgICAgICB0aGlzLm1heFJlcXVlc3RzUGVyVHJhbnNmb3JtID0gc2V0dGluZ3MubWF4UmVxdWVzdHNQZXJUcmFuc2Zvcm07XG4gICAgICAgIGNvbnN0IFNlcmlhbGl6ZXJDbGFzcyA9IHNldHRpbmdzLlNlcmlhbGl6ZXJDbGFzcyB8fCBKU09OQVBJU2VyaWFsaXplcjtcbiAgICAgICAgdGhpcy5zZXJpYWxpemVyID0gbmV3IFNlcmlhbGl6ZXJDbGFzcyh7IHNjaGVtYTogc2V0dGluZ3Muc2NoZW1hLCBrZXlNYXA6IHNldHRpbmdzLmtleU1hcCB9KTtcbiAgICB9XG4gICAgZ2V0IGRlZmF1bHRGZXRjaEhlYWRlcnMoKSB7XG4gICAgICAgIGRlcHJlY2F0ZSgnSlNPTkFQSVNvdXJjZTogQWNjZXNzIGBkZWZhdWx0RmV0Y2hTZXR0aW5ncy5oZWFkZXJzYCBpbnN0ZWFkIG9mIGBkZWZhdWx0RmV0Y2hIZWFkZXJzYCcpO1xuICAgICAgICByZXR1cm4gdGhpcy5kZWZhdWx0RmV0Y2hTZXR0aW5ncy5oZWFkZXJzO1xuICAgIH1cbiAgICBzZXQgZGVmYXVsdEZldGNoSGVhZGVycyhoZWFkZXJzKSB7XG4gICAgICAgIGRlcHJlY2F0ZSgnSlNPTkFQSVNvdXJjZTogQWNjZXNzIGBkZWZhdWx0RmV0Y2hTZXR0aW5ncy5oZWFkZXJzYCBpbnN0ZWFkIG9mIGBkZWZhdWx0RmV0Y2hIZWFkZXJzYCcpO1xuICAgICAgICB0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzLmhlYWRlcnMgPSBoZWFkZXJzO1xuICAgIH1cbiAgICBnZXQgZGVmYXVsdEZldGNoVGltZW91dCgpIHtcbiAgICAgICAgZGVwcmVjYXRlKCdKU09OQVBJU291cmNlOiBBY2Nlc3MgYGRlZmF1bHRGZXRjaFNldHRpbmdzLnRpbWVvdXRgIGluc3RlYWQgb2YgYGRlZmF1bHRGZXRjaFRpbWVvdXRgJyk7XG4gICAgICAgIHJldHVybiB0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzLnRpbWVvdXQ7XG4gICAgfVxuICAgIHNldCBkZWZhdWx0RmV0Y2hUaW1lb3V0KHRpbWVvdXQpIHtcbiAgICAgICAgZGVwcmVjYXRlKCdKU09OQVBJU291cmNlOiBBY2Nlc3MgYGRlZmF1bHRGZXRjaFNldHRpbmdzLnRpbWVvdXRgIGluc3RlYWQgb2YgYGRlZmF1bHRGZXRjaFRpbWVvdXRgJyk7XG4gICAgICAgIHRoaXMuZGVmYXVsdEZldGNoU2V0dGluZ3MudGltZW91dCA9IHRpbWVvdXQ7XG4gICAgfVxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgLy8gUHVzaGFibGUgaW50ZXJmYWNlIGltcGxlbWVudGF0aW9uXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICBfcHVzaCh0cmFuc2Zvcm0pIHtcbiAgICAgICAgY29uc3QgcmVxdWVzdHMgPSBnZXRUcmFuc2Zvcm1SZXF1ZXN0cyh0aGlzLCB0cmFuc2Zvcm0pO1xuICAgICAgICBpZiAodGhpcy5tYXhSZXF1ZXN0c1BlclRyYW5zZm9ybSAmJiByZXF1ZXN0cy5sZW5ndGggPiB0aGlzLm1heFJlcXVlc3RzUGVyVHJhbnNmb3JtKSB7XG4gICAgICAgICAgICByZXR1cm4gT3JiaXQuUHJvbWlzZS5yZXNvbHZlKCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFRyYW5zZm9ybU5vdEFsbG93ZWQoYFRoaXMgdHJhbnNmb3JtIHJlcXVpcmVzICR7cmVxdWVzdHMubGVuZ3RofSByZXF1ZXN0cywgd2hpY2ggZXhjZWVkcyB0aGUgc3BlY2lmaWVkIGxpbWl0IG9mICR7dGhpcy5tYXhSZXF1ZXN0c1BlclRyYW5zZm9ybX0gcmVxdWVzdHMgcGVyIHRyYW5zZm9ybS5gLCB0cmFuc2Zvcm0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3Byb2Nlc3NSZXF1ZXN0cyhyZXF1ZXN0cywgVHJhbnNmb3JtUmVxdWVzdFByb2Nlc3NvcnMpLnRoZW4odHJhbnNmb3JtcyA9PiB7XG4gICAgICAgICAgICB0cmFuc2Zvcm1zLnVuc2hpZnQodHJhbnNmb3JtKTtcbiAgICAgICAgICAgIHJldHVybiB0cmFuc2Zvcm1zO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBQdWxsYWJsZSBpbnRlcmZhY2UgaW1wbGVtZW50YXRpb25cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIF9wdWxsKHF1ZXJ5KSB7XG4gICAgICAgIGNvbnN0IG9wZXJhdG9yID0gUHVsbE9wZXJhdG9yc1txdWVyeS5leHByZXNzaW9uLm9wXTtcbiAgICAgICAgaWYgKCFvcGVyYXRvcikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdKU09OQVBJU291cmNlIGRvZXMgbm90IHN1cHBvcnQgdGhlIGAke3F1ZXJ5LmV4cHJlc3Npb24ub3B9YCBvcGVyYXRvciBmb3IgcXVlcmllcy4nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3BlcmF0b3IodGhpcywgcXVlcnkpO1xuICAgIH1cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIC8vIFB1bGxhYmxlIGludGVyZmFjZSBpbXBsZW1lbnRhdGlvblxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgX3F1ZXJ5KHF1ZXJ5KSB7XG4gICAgICAgIGNvbnN0IG9wZXJhdG9yID0gUXVlcnlPcGVyYXRvcnNbcXVlcnkuZXhwcmVzc2lvbi5vcF07XG4gICAgICAgIGlmICghb3BlcmF0b3IpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSlNPTkFQSVNvdXJjZSBkb2VzIG5vdCBzdXBwb3J0IHRoZSBgJHtxdWVyeS5leHByZXNzaW9uLm9wfWAgb3BlcmF0b3IgZm9yIHF1ZXJpZXMuJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9wZXJhdG9yKHRoaXMsIHF1ZXJ5KTtcbiAgICB9XG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBQdWJsaWNseSBhY2Nlc3NpYmxlIG1ldGhvZHMgcGFydGljdWxhciB0byBKU09OQVBJU291cmNlXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICBmZXRjaCh1cmwsIGN1c3RvbVNldHRpbmdzKSB7XG4gICAgICAgIGxldCBzZXR0aW5ncyA9IHRoaXMuaW5pdEZldGNoU2V0dGluZ3MoY3VzdG9tU2V0dGluZ3MpO1xuICAgICAgICBsZXQgZnVsbFVybCA9IHVybDtcbiAgICAgICAgaWYgKHNldHRpbmdzLnBhcmFtcykge1xuICAgICAgICAgICAgZnVsbFVybCA9IGFwcGVuZFF1ZXJ5UGFyYW1zKGZ1bGxVcmwsIHNldHRpbmdzLnBhcmFtcyk7XG4gICAgICAgICAgICBkZWxldGUgc2V0dGluZ3MucGFyYW1zO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdmZXRjaCcsIGZ1bGxVcmwsIG1lcmdlZFNldHRpbmdzLCAncG9seWZpbGwnLCBmZXRjaC5wb2x5ZmlsbCk7XG4gICAgICAgIGxldCBmZXRjaEZuID0gT3JiaXQuZmV0Y2ggfHwgZmV0Y2g7XG4gICAgICAgIGlmIChzZXR0aW5ncy50aW1lb3V0KSB7XG4gICAgICAgICAgICBsZXQgdGltZW91dCA9IHNldHRpbmdzLnRpbWVvdXQ7XG4gICAgICAgICAgICBkZWxldGUgc2V0dGluZ3MudGltZW91dDtcbiAgICAgICAgICAgIHJldHVybiBuZXcgT3JiaXQuUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHRpbWVkT3V0O1xuICAgICAgICAgICAgICAgIGxldCB0aW1lciA9IE9yYml0Lmdsb2JhbHMuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRpbWVkT3V0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBOZXR3b3JrRXJyb3IoYE5vIGZldGNoIHJlc3BvbnNlIHdpdGhpbiAke3RpbWVvdXR9bXMuYCkpO1xuICAgICAgICAgICAgICAgIH0sIHRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIGZldGNoRm4oZnVsbFVybCwgc2V0dGluZ3MpLmNhdGNoKGUgPT4ge1xuICAgICAgICAgICAgICAgICAgICBPcmJpdC5nbG9iYWxzLmNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGltZWRPdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZUZldGNoRXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KS50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgT3JiaXQuZ2xvYmFscy5jbGVhclRpbWVvdXQodGltZXIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXRpbWVkT3V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVGZXRjaFJlc3BvbnNlKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZldGNoRm4oZnVsbFVybCwgc2V0dGluZ3MpLmNhdGNoKGUgPT4gdGhpcy5oYW5kbGVGZXRjaEVycm9yKGUpKS50aGVuKHJlc3BvbnNlID0+IHRoaXMuaGFuZGxlRmV0Y2hSZXNwb25zZShyZXNwb25zZSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGluaXRGZXRjaFNldHRpbmdzKGN1c3RvbVNldHRpbmdzID0ge30pIHtcbiAgICAgICAgbGV0IHNldHRpbmdzID0gZGVlcE1lcmdlKHt9LCB0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzLCBjdXN0b21TZXR0aW5ncyk7XG4gICAgICAgIGlmIChzZXR0aW5ncy5qc29uKSB7XG4gICAgICAgICAgICBhc3NlcnQoJ2Bqc29uYCBhbmQgYGJvZHlgIGNhblxcJ3QgYm90aCBiZSBzZXQgZm9yIGZldGNoIHJlcXVlc3RzLicsICFzZXR0aW5ncy5ib2R5KTtcbiAgICAgICAgICAgIHNldHRpbmdzLmJvZHkgPSBKU09OLnN0cmluZ2lmeShzZXR0aW5ncy5qc29uKTtcbiAgICAgICAgICAgIGRlbGV0ZSBzZXR0aW5ncy5qc29uO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzZXR0aW5ncy5oZWFkZXJzICYmICFzZXR0aW5ncy5ib2R5KSB7XG4gICAgICAgICAgICBkZWxldGUgc2V0dGluZ3MuaGVhZGVyc1snQ29udGVudC1UeXBlJ107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNldHRpbmdzO1xuICAgIH1cbiAgICBoYW5kbGVGZXRjaFJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDIwMSkge1xuICAgICAgICAgICAgaWYgKHRoaXMucmVzcG9uc2VIYXNDb250ZW50KHJlc3BvbnNlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBJbnZhbGlkU2VydmVyUmVzcG9uc2UoYFNlcnZlciByZXNwb25zZXMgd2l0aCBhICR7cmVzcG9uc2Uuc3RhdHVzfSBzdGF0dXMgc2hvdWxkIHJldHVybiBjb250ZW50IHdpdGggYSBDb250ZW50LVR5cGUgdGhhdCBpbmNsdWRlcyAnYXBwbGljYXRpb24vdm5kLmFwaStqc29uJy5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5zdGF0dXMgPj0gMjAwICYmIHJlc3BvbnNlLnN0YXR1cyA8IDMwMCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucmVzcG9uc2VIYXNDb250ZW50KHJlc3BvbnNlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodGhpcy5yZXNwb25zZUhhc0NvbnRlbnQocmVzcG9uc2UpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKS50aGVuKGRhdGEgPT4gdGhpcy5oYW5kbGVGZXRjaFJlc3BvbnNlRXJyb3IocmVzcG9uc2UsIGRhdGEpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlRmV0Y2hSZXNwb25zZUVycm9yKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gT3JiaXQuUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuICAgIGhhbmRsZUZldGNoUmVzcG9uc2VFcnJvcihyZXNwb25zZSwgZGF0YSkge1xuICAgICAgICBsZXQgZXJyb3I7XG4gICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPj0gNDAwICYmIHJlc3BvbnNlLnN0YXR1cyA8IDUwMCkge1xuICAgICAgICAgICAgZXJyb3IgPSBuZXcgQ2xpZW50RXJyb3IocmVzcG9uc2Uuc3RhdHVzVGV4dCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlcnJvciA9IG5ldyBTZXJ2ZXJFcnJvcihyZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBlcnJvci5yZXNwb25zZSA9IHJlc3BvbnNlO1xuICAgICAgICBlcnJvci5kYXRhID0gZGF0YTtcbiAgICAgICAgcmV0dXJuIE9yYml0LlByb21pc2UucmVqZWN0KGVycm9yKTtcbiAgICB9XG4gICAgaGFuZGxlRmV0Y2hFcnJvcihlKSB7XG4gICAgICAgIGxldCBlcnJvciA9IG5ldyBOZXR3b3JrRXJyb3IoZSk7XG4gICAgICAgIHJldHVybiBPcmJpdC5Qcm9taXNlLnJlamVjdChlcnJvcik7XG4gICAgfVxuICAgIHJlc3BvbnNlSGFzQ29udGVudChyZXNwb25zZSkge1xuICAgICAgICBsZXQgY29udGVudFR5cGUgPSByZXNwb25zZS5oZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJyk7XG4gICAgICAgIHJldHVybiBjb250ZW50VHlwZSAmJiBjb250ZW50VHlwZS5pbmRleE9mKCdhcHBsaWNhdGlvbi92bmQuYXBpK2pzb24nKSA+IC0xO1xuICAgIH1cbiAgICByZXNvdXJjZU5hbWVzcGFjZSh0eXBlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm5hbWVzcGFjZTtcbiAgICB9XG4gICAgcmVzb3VyY2VIb3N0KHR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaG9zdDtcbiAgICB9XG4gICAgcmVzb3VyY2VQYXRoKHR5cGUsIGlkKSB7XG4gICAgICAgIGxldCBwYXRoID0gW3RoaXMuc2VyaWFsaXplci5yZXNvdXJjZVR5cGUodHlwZSldO1xuICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgIGxldCByZXNvdXJjZUlkID0gdGhpcy5zZXJpYWxpemVyLnJlc291cmNlSWQodHlwZSwgaWQpO1xuICAgICAgICAgICAgaWYgKHJlc291cmNlSWQpIHtcbiAgICAgICAgICAgICAgICBwYXRoLnB1c2gocmVzb3VyY2VJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhdGguam9pbignLycpO1xuICAgIH1cbiAgICByZXNvdXJjZVVSTCh0eXBlLCBpZCkge1xuICAgICAgICBsZXQgaG9zdCA9IHRoaXMucmVzb3VyY2VIb3N0KHR5cGUpO1xuICAgICAgICBsZXQgbmFtZXNwYWNlID0gdGhpcy5yZXNvdXJjZU5hbWVzcGFjZSh0eXBlKTtcbiAgICAgICAgbGV0IHVybCA9IFtdO1xuICAgICAgICBpZiAoaG9zdCkge1xuICAgICAgICAgICAgdXJsLnB1c2goaG9zdCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5hbWVzcGFjZSkge1xuICAgICAgICAgICAgdXJsLnB1c2gobmFtZXNwYWNlKTtcbiAgICAgICAgfVxuICAgICAgICB1cmwucHVzaCh0aGlzLnJlc291cmNlUGF0aCh0eXBlLCBpZCkpO1xuICAgICAgICBpZiAoIWhvc3QpIHtcbiAgICAgICAgICAgIHVybC51bnNoaWZ0KCcnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXJsLmpvaW4oJy8nKTtcbiAgICB9XG4gICAgcmVzb3VyY2VSZWxhdGlvbnNoaXBVUkwodHlwZSwgaWQsIHJlbGF0aW9uc2hpcCkge1xuICAgICAgICByZXR1cm4gdGhpcy5yZXNvdXJjZVVSTCh0eXBlLCBpZCkgKyAnL3JlbGF0aW9uc2hpcHMvJyArIHRoaXMuc2VyaWFsaXplci5yZXNvdXJjZVJlbGF0aW9uc2hpcCh0eXBlLCByZWxhdGlvbnNoaXApO1xuICAgIH1cbiAgICByZWxhdGVkUmVzb3VyY2VVUkwodHlwZSwgaWQsIHJlbGF0aW9uc2hpcCkge1xuICAgICAgICByZXR1cm4gdGhpcy5yZXNvdXJjZVVSTCh0eXBlLCBpZCkgKyAnLycgKyB0aGlzLnNlcmlhbGl6ZXIucmVzb3VyY2VSZWxhdGlvbnNoaXAodHlwZSwgcmVsYXRpb25zaGlwKTtcbiAgICB9XG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBQcml2YXRlIG1ldGhvZHNcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIGluaXREZWZhdWx0RmV0Y2hTZXR0aW5ncyhzZXR0aW5ncykge1xuICAgICAgICB0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzID0ge1xuICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgIEFjY2VwdDogJ2FwcGxpY2F0aW9uL3ZuZC5hcGkranNvbicsXG4gICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi92bmQuYXBpK2pzb24nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGltZW91dDogNTAwMFxuICAgICAgICB9O1xuICAgICAgICBpZiAoc2V0dGluZ3MuZGVmYXVsdEZldGNoSGVhZGVycyB8fCBzZXR0aW5ncy5kZWZhdWx0RmV0Y2hUaW1lb3V0KSB7XG4gICAgICAgICAgICBkZXByZWNhdGUoJ0pTT05BUElTb3VyY2U6IFBhc3MgYGRlZmF1bHRGZXRjaFNldHRpbmdzYCB3aXRoIGBoZWFkZXJzYCBpbnN0ZWFkIG9mIGBkZWZhdWx0RmV0Y2hIZWFkZXJzYCB0byBpbml0aWFsaXplIHNvdXJjZScsIHNldHRpbmdzLmRlZmF1bHRGZXRjaEhlYWRlcnMgPT09IHVuZGVmaW5lZCk7XG4gICAgICAgICAgICBkZXByZWNhdGUoJ0pTT05BUElTb3VyY2U6IFBhc3MgYGRlZmF1bHRGZXRjaFNldHRpbmdzYCB3aXRoIGB0aW1lb3V0YCBpbnN0ZWFkIG9mIGBkZWZhdWx0RmV0Y2hUaW1lb3V0YCB0byBpbml0aWFsaXplIHNvdXJjZScsIHNldHRpbmdzLmRlZmF1bHRGZXRjaFRpbWVvdXQgPT09IHVuZGVmaW5lZCk7XG4gICAgICAgICAgICBkZWVwTWVyZ2UodGhpcy5kZWZhdWx0RmV0Y2hTZXR0aW5ncywge1xuICAgICAgICAgICAgICAgIGhlYWRlcnM6IHNldHRpbmdzLmRlZmF1bHRGZXRjaEhlYWRlcnMsXG4gICAgICAgICAgICAgICAgdGltZW91dDogc2V0dGluZ3MuZGVmYXVsdEZldGNoVGltZW91dFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNldHRpbmdzLmRlZmF1bHRGZXRjaFNldHRpbmdzKSB7XG4gICAgICAgICAgICBkZWVwTWVyZ2UodGhpcy5kZWZhdWx0RmV0Y2hTZXR0aW5ncywgc2V0dGluZ3MuZGVmYXVsdEZldGNoU2V0dGluZ3MpO1xuICAgICAgICB9XG4gICAgfVxuICAgIF9wcm9jZXNzUmVxdWVzdHMocmVxdWVzdHMsIHByb2Nlc3NvcnMpIHtcbiAgICAgICAgbGV0IHRyYW5zZm9ybXMgPSBbXTtcbiAgICAgICAgbGV0IHJlc3VsdCA9IE9yYml0LlByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICByZXF1ZXN0cy5mb3JFYWNoKHJlcXVlc3QgPT4ge1xuICAgICAgICAgICAgbGV0IHByb2Nlc3NvciA9IHByb2Nlc3NvcnNbcmVxdWVzdC5vcF07XG4gICAgICAgICAgICByZXN1bHQgPSByZXN1bHQudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb2Nlc3Nvcih0aGlzLCByZXF1ZXN0KS50aGVuKGFkZGl0aW9uYWxUcmFuc2Zvcm1zID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFkZGl0aW9uYWxUcmFuc2Zvcm1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseSh0cmFuc2Zvcm1zLCBhZGRpdGlvbmFsVHJhbnNmb3Jtcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdC50aGVuKCgpID0+IHRyYW5zZm9ybXMpO1xuICAgIH1cbn07XG5KU09OQVBJU291cmNlID0gX19kZWNvcmF0ZShbcHVsbGFibGUsIHB1c2hhYmxlLCBxdWVyeWFibGVdLCBKU09OQVBJU291cmNlKTtcbmV4cG9ydCBkZWZhdWx0IEpTT05BUElTb3VyY2U7Il19