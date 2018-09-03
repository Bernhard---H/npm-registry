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
        assert('JSONAPISource requires Orbit.fetch be defined', Orbit.fetch || fetch);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpzb25hcGktc291cmNlLmpzIl0sIm5hbWVzIjpbIl9fZGVjb3JhdGUiLCJkZWNvcmF0b3JzIiwidGFyZ2V0Iiwia2V5IiwiZGVzYyIsImMiLCJhcmd1bWVudHMiLCJsZW5ndGgiLCJyIiwiT2JqZWN0IiwiZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yIiwiZCIsIlJlZmxlY3QiLCJkZWNvcmF0ZSIsImkiLCJkZWZpbmVQcm9wZXJ0eSIsIk9yYml0IiwiU291cmNlIiwicHVsbGFibGUiLCJwdXNoYWJsZSIsIlRyYW5zZm9ybU5vdEFsbG93ZWQiLCJDbGllbnRFcnJvciIsIlNlcnZlckVycm9yIiwiTmV0d29ya0Vycm9yIiwicXVlcnlhYmxlIiwiYXNzZXJ0IiwiZGVlcE1lcmdlIiwiZGVwcmVjYXRlIiwiSlNPTkFQSVNlcmlhbGl6ZXIiLCJhcHBlbmRRdWVyeVBhcmFtcyIsIlB1bGxPcGVyYXRvcnMiLCJnZXRUcmFuc2Zvcm1SZXF1ZXN0cyIsIlRyYW5zZm9ybVJlcXVlc3RQcm9jZXNzb3JzIiwiSW52YWxpZFNlcnZlclJlc3BvbnNlIiwiUXVlcnlPcGVyYXRvcnMiLCJKU09OQVBJU291cmNlIiwic2V0dGluZ3MiLCJzY2hlbWEiLCJQcm9taXNlIiwiZmV0Y2giLCJuYW1lIiwibmFtZXNwYWNlIiwiaG9zdCIsImluaXREZWZhdWx0RmV0Y2hTZXR0aW5ncyIsIm1heFJlcXVlc3RzUGVyVHJhbnNmb3JtIiwiU2VyaWFsaXplckNsYXNzIiwic2VyaWFsaXplciIsImtleU1hcCIsIl9wdXNoIiwidHJhbnNmb3JtIiwicmVxdWVzdHMiLCJyZXNvbHZlIiwidGhlbiIsIl9wcm9jZXNzUmVxdWVzdHMiLCJ0cmFuc2Zvcm1zIiwidW5zaGlmdCIsIl9wdWxsIiwicXVlcnkiLCJvcGVyYXRvciIsImV4cHJlc3Npb24iLCJvcCIsIkVycm9yIiwiX3F1ZXJ5IiwidXJsIiwiY3VzdG9tU2V0dGluZ3MiLCJpbml0RmV0Y2hTZXR0aW5ncyIsImZ1bGxVcmwiLCJwYXJhbXMiLCJmZXRjaEZuIiwidGltZW91dCIsInJlamVjdCIsInRpbWVkT3V0IiwidGltZXIiLCJnbG9iYWxzIiwic2V0VGltZW91dCIsImNhdGNoIiwiY2xlYXJUaW1lb3V0IiwiaGFuZGxlRmV0Y2hFcnJvciIsImUiLCJoYW5kbGVGZXRjaFJlc3BvbnNlIiwicmVzcG9uc2UiLCJkZWZhdWx0RmV0Y2hTZXR0aW5ncyIsImpzb24iLCJib2R5IiwiSlNPTiIsInN0cmluZ2lmeSIsImhlYWRlcnMiLCJzdGF0dXMiLCJyZXNwb25zZUhhc0NvbnRlbnQiLCJoYW5kbGVGZXRjaFJlc3BvbnNlRXJyb3IiLCJkYXRhIiwiZXJyb3IiLCJzdGF0dXNUZXh0IiwiY29udGVudFR5cGUiLCJnZXQiLCJpbmRleE9mIiwicmVzb3VyY2VOYW1lc3BhY2UiLCJ0eXBlIiwicmVzb3VyY2VIb3N0IiwicmVzb3VyY2VQYXRoIiwiaWQiLCJwYXRoIiwicmVzb3VyY2VUeXBlIiwicmVzb3VyY2VJZCIsInB1c2giLCJqb2luIiwicmVzb3VyY2VVUkwiLCJyZXNvdXJjZVJlbGF0aW9uc2hpcFVSTCIsInJlbGF0aW9uc2hpcCIsInJlc291cmNlUmVsYXRpb25zaGlwIiwicmVsYXRlZFJlc291cmNlVVJMIiwiQWNjZXB0IiwiZGVmYXVsdEZldGNoSGVhZGVycyIsImRlZmF1bHRGZXRjaFRpbWVvdXQiLCJ1bmRlZmluZWQiLCJwcm9jZXNzb3JzIiwicmVzdWx0IiwiZm9yRWFjaCIsInByb2Nlc3NvciIsInJlcXVlc3QiLCJhZGRpdGlvbmFsVHJhbnNmb3JtcyIsIkFycmF5IiwicHJvdG90eXBlIiwiYXBwbHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxhQUFhLFFBQVEsS0FBS0EsVUFBYixJQUEyQixVQUFVQyxVQUFWLEVBQXNCQyxNQUF0QixFQUE4QkMsR0FBOUIsRUFBbUNDLElBQW5DLEVBQXlDO0FBQ2pGLFFBQUlDLElBQUlDLFVBQVVDLE1BQWxCO0FBQUEsUUFDSUMsSUFBSUgsSUFBSSxDQUFKLEdBQVFILE1BQVIsR0FBaUJF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TUUsVUFBTjtBQUFBLFNBQVosQ0FBUDtBQUNILEtBcE9EOztBQUFBO0FBQUE7QUFBQSx5QkFjMEI7QUFDdEIzQixzQkFBVSx1RkFBVjtBQUNBLG1CQUFPLEtBQUtzRCxvQkFBTCxDQUEwQkssT0FBakM7QUFDSCxTQWpCRDtBQUFBLHVCQWtCd0JBLE9BbEJ4QixFQWtCaUM7QUFDN0IzRCxzQkFBVSx1RkFBVjtBQUNBLGlCQUFLc0Qsb0JBQUwsQ0FBMEJLLE9BQTFCLEdBQW9DQSxPQUFwQztBQUNIO0FBckJEO0FBQUE7QUFBQSx5QkFzQjBCO0FBQ3RCM0Qsc0JBQVUsdUZBQVY7QUFDQSxtQkFBTyxLQUFLc0Qsb0JBQUwsQ0FBMEJaLE9BQWpDO0FBQ0gsU0F6QkQ7QUFBQSx1QkEwQndCQSxPQTFCeEIsRUEwQmlDO0FBQzdCMUMsc0JBQVUsdUZBQVY7QUFDQSxpQkFBS3NELG9CQUFMLENBQTBCWixPQUExQixHQUFvQ0EsT0FBcEM7QUFDSDtBQTdCRDs7QUFBQTtBQUFBLEVBQTRDcEQsTUFBNUMsQ0FBSjtBQXNPQWtCLGdCQUFnQm5DLFdBQVcsQ0FBQ2tCLFFBQUQsRUFBV0MsUUFBWCxFQUFxQkssU0FBckIsQ0FBWCxFQUE0Q1csYUFBNUMsQ0FBaEI7QUFDQSxlQUFlQSxhQUFmIiwiZmlsZSI6Impzb25hcGktc291cmNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIF9fZGVjb3JhdGUgPSB0aGlzICYmIHRoaXMuX19kZWNvcmF0ZSB8fCBmdW5jdGlvbiAoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpIHtcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsXG4gICAgICAgIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLFxuICAgICAgICBkO1xuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7ZWxzZSBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgaWYgKGQgPSBkZWNvcmF0b3JzW2ldKSByID0gKGMgPCAzID8gZChyKSA6IGMgPiAzID8gZCh0YXJnZXQsIGtleSwgcikgOiBkKHRhcmdldCwga2V5KSkgfHwgcjtcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xufTtcbi8qIGVzbGludC1kaXNhYmxlIHZhbGlkLWpzZG9jICovXG5pbXBvcnQgT3JiaXQsIHsgU291cmNlLCBwdWxsYWJsZSwgcHVzaGFibGUsIFRyYW5zZm9ybU5vdEFsbG93ZWQsIENsaWVudEVycm9yLCBTZXJ2ZXJFcnJvciwgTmV0d29ya0Vycm9yLCBxdWVyeWFibGUgfSBmcm9tICdAb3JiaXQvZGF0YSc7XG5pbXBvcnQgeyBhc3NlcnQsIGRlZXBNZXJnZSwgZGVwcmVjYXRlIH0gZnJvbSAnQG9yYml0L3V0aWxzJztcbmltcG9ydCBKU09OQVBJU2VyaWFsaXplciBmcm9tICcuL2pzb25hcGktc2VyaWFsaXplcic7XG5pbXBvcnQgeyBhcHBlbmRRdWVyeVBhcmFtcyB9IGZyb20gJy4vbGliL3F1ZXJ5LXBhcmFtcyc7XG5pbXBvcnQgeyBQdWxsT3BlcmF0b3JzIH0gZnJvbSAnLi9saWIvcHVsbC1vcGVyYXRvcnMnO1xuaW1wb3J0IHsgZ2V0VHJhbnNmb3JtUmVxdWVzdHMsIFRyYW5zZm9ybVJlcXVlc3RQcm9jZXNzb3JzIH0gZnJvbSAnLi9saWIvdHJhbnNmb3JtLXJlcXVlc3RzJztcbmltcG9ydCB7IEludmFsaWRTZXJ2ZXJSZXNwb25zZSB9IGZyb20gJy4vbGliL2V4Y2VwdGlvbnMnO1xuaW1wb3J0IHsgUXVlcnlPcGVyYXRvcnMgfSBmcm9tIFwiLi9saWIvcXVlcnktb3BlcmF0b3JzXCI7XG4vKipcbiBTb3VyY2UgZm9yIGFjY2Vzc2luZyBhIEpTT04gQVBJIGNvbXBsaWFudCBSRVNUZnVsIEFQSSB3aXRoIGEgbmV0d29yayBmZXRjaFxuIHJlcXVlc3QuXG5cbiBJZiBhIHNpbmdsZSB0cmFuc2Zvcm0gb3IgcXVlcnkgcmVxdWlyZXMgbW9yZSB0aGFuIG9uZSBmZXRjaCByZXF1ZXN0LFxuIHJlcXVlc3RzIHdpbGwgYmUgcGVyZm9ybWVkIHNlcXVlbnRpYWxseSBhbmQgcmVzb2x2ZWQgdG9nZXRoZXIuIEZyb20gdGhlXG4gcGVyc3BlY3RpdmUgb2YgT3JiaXQsIHRoZXNlIG9wZXJhdGlvbnMgd2lsbCBhbGwgc3VjY2VlZCBvciBmYWlsIHRvZ2V0aGVyLiBUaGVcbiBgbWF4UmVxdWVzdHNQZXJUcmFuc2Zvcm1gIGFuZCBgbWF4UmVxdWVzdHNQZXJRdWVyeWAgc2V0dGluZ3MgYWxsb3cgbGltaXRzIHRvIGJlXG4gc2V0IG9uIHRoaXMgYmVoYXZpb3IuIFRoZXNlIHNldHRpbmdzIHNob3VsZCBiZSBzZXQgdG8gYDFgIGlmIHlvdXIgY2xpZW50L3NlcnZlclxuIGNvbmZpZ3VyYXRpb24gaXMgdW5hYmxlIHRvIHJlc29sdmUgcGFydGlhbGx5IHN1Y2Nlc3NmdWwgdHJhbnNmb3JtcyAvIHF1ZXJpZXMuXG5cbiBAY2xhc3MgSlNPTkFQSVNvdXJjZVxuIEBleHRlbmRzIFNvdXJjZVxuICovXG5sZXQgSlNPTkFQSVNvdXJjZSA9IGNsYXNzIEpTT05BUElTb3VyY2UgZXh0ZW5kcyBTb3VyY2Uge1xuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzID0ge30pIHtcbiAgICAgICAgYXNzZXJ0KCdKU09OQVBJU291cmNlXFwncyBgc2NoZW1hYCBtdXN0IGJlIHNwZWNpZmllZCBpbiBgc2V0dGluZ3Muc2NoZW1hYCBjb25zdHJ1Y3RvciBhcmd1bWVudCcsICEhc2V0dGluZ3Muc2NoZW1hKTtcbiAgICAgICAgYXNzZXJ0KCdKU09OQVBJU291cmNlIHJlcXVpcmVzIE9yYml0LlByb21pc2UgYmUgZGVmaW5lZCcsIE9yYml0LlByb21pc2UpO1xuICAgICAgICBhc3NlcnQoJ0pTT05BUElTb3VyY2UgcmVxdWlyZXMgT3JiaXQuZmV0Y2ggYmUgZGVmaW5lZCcsIE9yYml0LmZldGNoIHx8IGZldGNoKTtcbiAgICAgICAgc2V0dGluZ3MubmFtZSA9IHNldHRpbmdzLm5hbWUgfHwgJ2pzb25hcGknO1xuICAgICAgICBzdXBlcihzZXR0aW5ncyk7XG4gICAgICAgIHRoaXMubmFtZXNwYWNlID0gc2V0dGluZ3MubmFtZXNwYWNlO1xuICAgICAgICB0aGlzLmhvc3QgPSBzZXR0aW5ncy5ob3N0O1xuICAgICAgICB0aGlzLmluaXREZWZhdWx0RmV0Y2hTZXR0aW5ncyhzZXR0aW5ncyk7XG4gICAgICAgIHRoaXMubWF4UmVxdWVzdHNQZXJUcmFuc2Zvcm0gPSBzZXR0aW5ncy5tYXhSZXF1ZXN0c1BlclRyYW5zZm9ybTtcbiAgICAgICAgY29uc3QgU2VyaWFsaXplckNsYXNzID0gc2V0dGluZ3MuU2VyaWFsaXplckNsYXNzIHx8IEpTT05BUElTZXJpYWxpemVyO1xuICAgICAgICB0aGlzLnNlcmlhbGl6ZXIgPSBuZXcgU2VyaWFsaXplckNsYXNzKHsgc2NoZW1hOiBzZXR0aW5ncy5zY2hlbWEsIGtleU1hcDogc2V0dGluZ3Mua2V5TWFwIH0pO1xuICAgIH1cbiAgICBnZXQgZGVmYXVsdEZldGNoSGVhZGVycygpIHtcbiAgICAgICAgZGVwcmVjYXRlKCdKU09OQVBJU291cmNlOiBBY2Nlc3MgYGRlZmF1bHRGZXRjaFNldHRpbmdzLmhlYWRlcnNgIGluc3RlYWQgb2YgYGRlZmF1bHRGZXRjaEhlYWRlcnNgJyk7XG4gICAgICAgIHJldHVybiB0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzLmhlYWRlcnM7XG4gICAgfVxuICAgIHNldCBkZWZhdWx0RmV0Y2hIZWFkZXJzKGhlYWRlcnMpIHtcbiAgICAgICAgZGVwcmVjYXRlKCdKU09OQVBJU291cmNlOiBBY2Nlc3MgYGRlZmF1bHRGZXRjaFNldHRpbmdzLmhlYWRlcnNgIGluc3RlYWQgb2YgYGRlZmF1bHRGZXRjaEhlYWRlcnNgJyk7XG4gICAgICAgIHRoaXMuZGVmYXVsdEZldGNoU2V0dGluZ3MuaGVhZGVycyA9IGhlYWRlcnM7XG4gICAgfVxuICAgIGdldCBkZWZhdWx0RmV0Y2hUaW1lb3V0KCkge1xuICAgICAgICBkZXByZWNhdGUoJ0pTT05BUElTb3VyY2U6IEFjY2VzcyBgZGVmYXVsdEZldGNoU2V0dGluZ3MudGltZW91dGAgaW5zdGVhZCBvZiBgZGVmYXVsdEZldGNoVGltZW91dGAnKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGVmYXVsdEZldGNoU2V0dGluZ3MudGltZW91dDtcbiAgICB9XG4gICAgc2V0IGRlZmF1bHRGZXRjaFRpbWVvdXQodGltZW91dCkge1xuICAgICAgICBkZXByZWNhdGUoJ0pTT05BUElTb3VyY2U6IEFjY2VzcyBgZGVmYXVsdEZldGNoU2V0dGluZ3MudGltZW91dGAgaW5zdGVhZCBvZiBgZGVmYXVsdEZldGNoVGltZW91dGAnKTtcbiAgICAgICAgdGhpcy5kZWZhdWx0RmV0Y2hTZXR0aW5ncy50aW1lb3V0ID0gdGltZW91dDtcbiAgICB9XG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBQdXNoYWJsZSBpbnRlcmZhY2UgaW1wbGVtZW50YXRpb25cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIF9wdXNoKHRyYW5zZm9ybSkge1xuICAgICAgICBjb25zdCByZXF1ZXN0cyA9IGdldFRyYW5zZm9ybVJlcXVlc3RzKHRoaXMsIHRyYW5zZm9ybSk7XG4gICAgICAgIGlmICh0aGlzLm1heFJlcXVlc3RzUGVyVHJhbnNmb3JtICYmIHJlcXVlc3RzLmxlbmd0aCA+IHRoaXMubWF4UmVxdWVzdHNQZXJUcmFuc2Zvcm0pIHtcbiAgICAgICAgICAgIHJldHVybiBPcmJpdC5Qcm9taXNlLnJlc29sdmUoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHJhbnNmb3JtTm90QWxsb3dlZChgVGhpcyB0cmFuc2Zvcm0gcmVxdWlyZXMgJHtyZXF1ZXN0cy5sZW5ndGh9IHJlcXVlc3RzLCB3aGljaCBleGNlZWRzIHRoZSBzcGVjaWZpZWQgbGltaXQgb2YgJHt0aGlzLm1heFJlcXVlc3RzUGVyVHJhbnNmb3JtfSByZXF1ZXN0cyBwZXIgdHJhbnNmb3JtLmAsIHRyYW5zZm9ybSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fcHJvY2Vzc1JlcXVlc3RzKHJlcXVlc3RzLCBUcmFuc2Zvcm1SZXF1ZXN0UHJvY2Vzc29ycykudGhlbih0cmFuc2Zvcm1zID0+IHtcbiAgICAgICAgICAgIHRyYW5zZm9ybXMudW5zaGlmdCh0cmFuc2Zvcm0pO1xuICAgICAgICAgICAgcmV0dXJuIHRyYW5zZm9ybXM7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIC8vIFB1bGxhYmxlIGludGVyZmFjZSBpbXBsZW1lbnRhdGlvblxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgX3B1bGwocXVlcnkpIHtcbiAgICAgICAgY29uc3Qgb3BlcmF0b3IgPSBQdWxsT3BlcmF0b3JzW3F1ZXJ5LmV4cHJlc3Npb24ub3BdO1xuICAgICAgICBpZiAoIW9wZXJhdG9yKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0pTT05BUElTb3VyY2UgZG9lcyBub3Qgc3VwcG9ydCB0aGUgYCR7cXVlcnkuZXhwcmVzc2lvbi5vcH1gIG9wZXJhdG9yIGZvciBxdWVyaWVzLicpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvcGVyYXRvcih0aGlzLCBxdWVyeSk7XG4gICAgfVxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgLy8gUHVsbGFibGUgaW50ZXJmYWNlIGltcGxlbWVudGF0aW9uXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICBfcXVlcnkocXVlcnkpIHtcbiAgICAgICAgY29uc3Qgb3BlcmF0b3IgPSBRdWVyeU9wZXJhdG9yc1txdWVyeS5leHByZXNzaW9uLm9wXTtcbiAgICAgICAgaWYgKCFvcGVyYXRvcikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdKU09OQVBJU291cmNlIGRvZXMgbm90IHN1cHBvcnQgdGhlIGAke3F1ZXJ5LmV4cHJlc3Npb24ub3B9YCBvcGVyYXRvciBmb3IgcXVlcmllcy4nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3BlcmF0b3IodGhpcywgcXVlcnkpO1xuICAgIH1cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIC8vIFB1YmxpY2x5IGFjY2Vzc2libGUgbWV0aG9kcyBwYXJ0aWN1bGFyIHRvIEpTT05BUElTb3VyY2VcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIGZldGNoKHVybCwgY3VzdG9tU2V0dGluZ3MpIHtcbiAgICAgICAgbGV0IHNldHRpbmdzID0gdGhpcy5pbml0RmV0Y2hTZXR0aW5ncyhjdXN0b21TZXR0aW5ncyk7XG4gICAgICAgIGxldCBmdWxsVXJsID0gdXJsO1xuICAgICAgICBpZiAoc2V0dGluZ3MucGFyYW1zKSB7XG4gICAgICAgICAgICBmdWxsVXJsID0gYXBwZW5kUXVlcnlQYXJhbXMoZnVsbFVybCwgc2V0dGluZ3MucGFyYW1zKTtcbiAgICAgICAgICAgIGRlbGV0ZSBzZXR0aW5ncy5wYXJhbXM7XG4gICAgICAgIH1cbiAgICAgICAgLy8gY29uc29sZS5sb2coJ2ZldGNoJywgZnVsbFVybCwgbWVyZ2VkU2V0dGluZ3MsICdwb2x5ZmlsbCcsIGZldGNoLnBvbHlmaWxsKTtcbiAgICAgICAgbGV0IGZldGNoRm4gPSBPcmJpdC5mZXRjaCB8fCBmZXRjaDtcbiAgICAgICAgaWYgKHNldHRpbmdzLnRpbWVvdXQpIHtcbiAgICAgICAgICAgIGxldCB0aW1lb3V0ID0gc2V0dGluZ3MudGltZW91dDtcbiAgICAgICAgICAgIGRlbGV0ZSBzZXR0aW5ncy50aW1lb3V0O1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBPcmJpdC5Qcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgdGltZWRPdXQ7XG4gICAgICAgICAgICAgICAgbGV0IHRpbWVyID0gT3JiaXQuZ2xvYmFscy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGltZWRPdXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IE5ldHdvcmtFcnJvcihgTm8gZmV0Y2ggcmVzcG9uc2Ugd2l0aGluICR7dGltZW91dH1tcy5gKSk7XG4gICAgICAgICAgICAgICAgfSwgdGltZW91dCk7XG4gICAgICAgICAgICAgICAgZmV0Y2hGbihmdWxsVXJsLCBzZXR0aW5ncykuY2F0Y2goZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIE9yYml0Lmdsb2JhbHMuY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aW1lZE91dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlRmV0Y2hFcnJvcihlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgICAgICAgICBPcmJpdC5nbG9iYWxzLmNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGltZWRPdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZUZldGNoUmVzcG9uc2UocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmV0Y2hGbihmdWxsVXJsLCBzZXR0aW5ncykuY2F0Y2goZSA9PiB0aGlzLmhhbmRsZUZldGNoRXJyb3IoZSkpLnRoZW4ocmVzcG9uc2UgPT4gdGhpcy5oYW5kbGVGZXRjaFJlc3BvbnNlKHJlc3BvbnNlKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaW5pdEZldGNoU2V0dGluZ3MoY3VzdG9tU2V0dGluZ3MgPSB7fSkge1xuICAgICAgICBsZXQgc2V0dGluZ3MgPSBkZWVwTWVyZ2Uoe30sIHRoaXMuZGVmYXVsdEZldGNoU2V0dGluZ3MsIGN1c3RvbVNldHRpbmdzKTtcbiAgICAgICAgaWYgKHNldHRpbmdzLmpzb24pIHtcbiAgICAgICAgICAgIGFzc2VydCgnYGpzb25gIGFuZCBgYm9keWAgY2FuXFwndCBib3RoIGJlIHNldCBmb3IgZmV0Y2ggcmVxdWVzdHMuJywgIXNldHRpbmdzLmJvZHkpO1xuICAgICAgICAgICAgc2V0dGluZ3MuYm9keSA9IEpTT04uc3RyaW5naWZ5KHNldHRpbmdzLmpzb24pO1xuICAgICAgICAgICAgZGVsZXRlIHNldHRpbmdzLmpzb247XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNldHRpbmdzLmhlYWRlcnMgJiYgIXNldHRpbmdzLmJvZHkpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzZXR0aW5ncy5oZWFkZXJzWydDb250ZW50LVR5cGUnXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2V0dGluZ3M7XG4gICAgfVxuICAgIGhhbmRsZUZldGNoUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gMjAxKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5yZXNwb25zZUhhc0NvbnRlbnQocmVzcG9uc2UpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEludmFsaWRTZXJ2ZXJSZXNwb25zZShgU2VydmVyIHJlc3BvbnNlcyB3aXRoIGEgJHtyZXNwb25zZS5zdGF0dXN9IHN0YXR1cyBzaG91bGQgcmV0dXJuIGNvbnRlbnQgd2l0aCBhIENvbnRlbnQtVHlwZSB0aGF0IGluY2x1ZGVzICdhcHBsaWNhdGlvbi92bmQuYXBpK2pzb24nLmApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLnN0YXR1cyA+PSAyMDAgJiYgcmVzcG9uc2Uuc3RhdHVzIDwgMzAwKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5yZXNwb25zZUhhc0NvbnRlbnQocmVzcG9uc2UpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlc3BvbnNlSGFzQ29udGVudChyZXNwb25zZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpLnRoZW4oZGF0YSA9PiB0aGlzLmhhbmRsZUZldGNoUmVzcG9uc2VFcnJvcihyZXNwb25zZSwgZGF0YSkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVGZXRjaFJlc3BvbnNlRXJyb3IocmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBPcmJpdC5Qcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG4gICAgaGFuZGxlRmV0Y2hSZXNwb25zZUVycm9yKHJlc3BvbnNlLCBkYXRhKSB7XG4gICAgICAgIGxldCBlcnJvcjtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA+PSA0MDAgJiYgcmVzcG9uc2Uuc3RhdHVzIDwgNTAwKSB7XG4gICAgICAgICAgICBlcnJvciA9IG5ldyBDbGllbnRFcnJvcihyZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVycm9yID0gbmV3IFNlcnZlckVycm9yKHJlc3BvbnNlLnN0YXR1c1RleHQpO1xuICAgICAgICB9XG4gICAgICAgIGVycm9yLnJlc3BvbnNlID0gcmVzcG9uc2U7XG4gICAgICAgIGVycm9yLmRhdGEgPSBkYXRhO1xuICAgICAgICByZXR1cm4gT3JiaXQuUHJvbWlzZS5yZWplY3QoZXJyb3IpO1xuICAgIH1cbiAgICBoYW5kbGVGZXRjaEVycm9yKGUpIHtcbiAgICAgICAgbGV0IGVycm9yID0gbmV3IE5ldHdvcmtFcnJvcihlKTtcbiAgICAgICAgcmV0dXJuIE9yYml0LlByb21pc2UucmVqZWN0KGVycm9yKTtcbiAgICB9XG4gICAgcmVzcG9uc2VIYXNDb250ZW50KHJlc3BvbnNlKSB7XG4gICAgICAgIGxldCBjb250ZW50VHlwZSA9IHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdDb250ZW50LVR5cGUnKTtcbiAgICAgICAgcmV0dXJuIGNvbnRlbnRUeXBlICYmIGNvbnRlbnRUeXBlLmluZGV4T2YoJ2FwcGxpY2F0aW9uL3ZuZC5hcGkranNvbicpID4gLTE7XG4gICAgfVxuICAgIHJlc291cmNlTmFtZXNwYWNlKHR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubmFtZXNwYWNlO1xuICAgIH1cbiAgICByZXNvdXJjZUhvc3QodHlwZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5ob3N0O1xuICAgIH1cbiAgICByZXNvdXJjZVBhdGgodHlwZSwgaWQpIHtcbiAgICAgICAgbGV0IHBhdGggPSBbdGhpcy5zZXJpYWxpemVyLnJlc291cmNlVHlwZSh0eXBlKV07XG4gICAgICAgIGlmIChpZCkge1xuICAgICAgICAgICAgbGV0IHJlc291cmNlSWQgPSB0aGlzLnNlcmlhbGl6ZXIucmVzb3VyY2VJZCh0eXBlLCBpZCk7XG4gICAgICAgICAgICBpZiAocmVzb3VyY2VJZCkge1xuICAgICAgICAgICAgICAgIHBhdGgucHVzaChyZXNvdXJjZUlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGF0aC5qb2luKCcvJyk7XG4gICAgfVxuICAgIHJlc291cmNlVVJMKHR5cGUsIGlkKSB7XG4gICAgICAgIGxldCBob3N0ID0gdGhpcy5yZXNvdXJjZUhvc3QodHlwZSk7XG4gICAgICAgIGxldCBuYW1lc3BhY2UgPSB0aGlzLnJlc291cmNlTmFtZXNwYWNlKHR5cGUpO1xuICAgICAgICBsZXQgdXJsID0gW107XG4gICAgICAgIGlmIChob3N0KSB7XG4gICAgICAgICAgICB1cmwucHVzaChob3N0KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobmFtZXNwYWNlKSB7XG4gICAgICAgICAgICB1cmwucHVzaChuYW1lc3BhY2UpO1xuICAgICAgICB9XG4gICAgICAgIHVybC5wdXNoKHRoaXMucmVzb3VyY2VQYXRoKHR5cGUsIGlkKSk7XG4gICAgICAgIGlmICghaG9zdCkge1xuICAgICAgICAgICAgdXJsLnVuc2hpZnQoJycpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1cmwuam9pbignLycpO1xuICAgIH1cbiAgICByZXNvdXJjZVJlbGF0aW9uc2hpcFVSTCh0eXBlLCBpZCwgcmVsYXRpb25zaGlwKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlc291cmNlVVJMKHR5cGUsIGlkKSArICcvcmVsYXRpb25zaGlwcy8nICsgdGhpcy5zZXJpYWxpemVyLnJlc291cmNlUmVsYXRpb25zaGlwKHR5cGUsIHJlbGF0aW9uc2hpcCk7XG4gICAgfVxuICAgIHJlbGF0ZWRSZXNvdXJjZVVSTCh0eXBlLCBpZCwgcmVsYXRpb25zaGlwKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlc291cmNlVVJMKHR5cGUsIGlkKSArICcvJyArIHRoaXMuc2VyaWFsaXplci5yZXNvdXJjZVJlbGF0aW9uc2hpcCh0eXBlLCByZWxhdGlvbnNoaXApO1xuICAgIH1cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIC8vIFByaXZhdGUgbWV0aG9kc1xuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgaW5pdERlZmF1bHRGZXRjaFNldHRpbmdzKHNldHRpbmdzKSB7XG4gICAgICAgIHRoaXMuZGVmYXVsdEZldGNoU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgQWNjZXB0OiAnYXBwbGljYXRpb24vdm5kLmFwaStqc29uJyxcbiAgICAgICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL3ZuZC5hcGkranNvbidcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0aW1lb3V0OiA1MDAwXG4gICAgICAgIH07XG4gICAgICAgIGlmIChzZXR0aW5ncy5kZWZhdWx0RmV0Y2hIZWFkZXJzIHx8IHNldHRpbmdzLmRlZmF1bHRGZXRjaFRpbWVvdXQpIHtcbiAgICAgICAgICAgIGRlcHJlY2F0ZSgnSlNPTkFQSVNvdXJjZTogUGFzcyBgZGVmYXVsdEZldGNoU2V0dGluZ3NgIHdpdGggYGhlYWRlcnNgIGluc3RlYWQgb2YgYGRlZmF1bHRGZXRjaEhlYWRlcnNgIHRvIGluaXRpYWxpemUgc291cmNlJywgc2V0dGluZ3MuZGVmYXVsdEZldGNoSGVhZGVycyA9PT0gdW5kZWZpbmVkKTtcbiAgICAgICAgICAgIGRlcHJlY2F0ZSgnSlNPTkFQSVNvdXJjZTogUGFzcyBgZGVmYXVsdEZldGNoU2V0dGluZ3NgIHdpdGggYHRpbWVvdXRgIGluc3RlYWQgb2YgYGRlZmF1bHRGZXRjaFRpbWVvdXRgIHRvIGluaXRpYWxpemUgc291cmNlJywgc2V0dGluZ3MuZGVmYXVsdEZldGNoVGltZW91dCA9PT0gdW5kZWZpbmVkKTtcbiAgICAgICAgICAgIGRlZXBNZXJnZSh0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzLCB7XG4gICAgICAgICAgICAgICAgaGVhZGVyczogc2V0dGluZ3MuZGVmYXVsdEZldGNoSGVhZGVycyxcbiAgICAgICAgICAgICAgICB0aW1lb3V0OiBzZXR0aW5ncy5kZWZhdWx0RmV0Y2hUaW1lb3V0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2V0dGluZ3MuZGVmYXVsdEZldGNoU2V0dGluZ3MpIHtcbiAgICAgICAgICAgIGRlZXBNZXJnZSh0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzLCBzZXR0aW5ncy5kZWZhdWx0RmV0Y2hTZXR0aW5ncyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgX3Byb2Nlc3NSZXF1ZXN0cyhyZXF1ZXN0cywgcHJvY2Vzc29ycykge1xuICAgICAgICBsZXQgdHJhbnNmb3JtcyA9IFtdO1xuICAgICAgICBsZXQgcmVzdWx0ID0gT3JiaXQuUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIHJlcXVlc3RzLmZvckVhY2gocmVxdWVzdCA9PiB7XG4gICAgICAgICAgICBsZXQgcHJvY2Vzc29yID0gcHJvY2Vzc29yc1tyZXF1ZXN0Lm9wXTtcbiAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdC50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvY2Vzc29yKHRoaXMsIHJlcXVlc3QpLnRoZW4oYWRkaXRpb25hbFRyYW5zZm9ybXMgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYWRkaXRpb25hbFRyYW5zZm9ybXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KHRyYW5zZm9ybXMsIGFkZGl0aW9uYWxUcmFuc2Zvcm1zKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcmVzdWx0LnRoZW4oKCkgPT4gdHJhbnNmb3Jtcyk7XG4gICAgfVxufTtcbkpTT05BUElTb3VyY2UgPSBfX2RlY29yYXRlKFtwdWxsYWJsZSwgcHVzaGFibGUsIHF1ZXJ5YWJsZV0sIEpTT05BUElTb3VyY2UpO1xuZXhwb3J0IGRlZmF1bHQgSlNPTkFQSVNvdXJjZTsiXX0=