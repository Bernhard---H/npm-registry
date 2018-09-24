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
    // Queryable interface implementation
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpzb25hcGktc291cmNlLmpzIl0sIm5hbWVzIjpbIl9fZGVjb3JhdGUiLCJkZWNvcmF0b3JzIiwidGFyZ2V0Iiwia2V5IiwiZGVzYyIsImMiLCJhcmd1bWVudHMiLCJsZW5ndGgiLCJyIiwiT2JqZWN0IiwiZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yIiwiZCIsIlJlZmxlY3QiLCJkZWNvcmF0ZSIsImkiLCJkZWZpbmVQcm9wZXJ0eSIsIk9yYml0IiwiU291cmNlIiwicHVsbGFibGUiLCJwdXNoYWJsZSIsIlRyYW5zZm9ybU5vdEFsbG93ZWQiLCJDbGllbnRFcnJvciIsIlNlcnZlckVycm9yIiwiTmV0d29ya0Vycm9yIiwicXVlcnlhYmxlIiwiYXNzZXJ0IiwiZGVlcE1lcmdlIiwiZGVwcmVjYXRlIiwiSlNPTkFQSVNlcmlhbGl6ZXIiLCJhcHBlbmRRdWVyeVBhcmFtcyIsIlB1bGxPcGVyYXRvcnMiLCJnZXRUcmFuc2Zvcm1SZXF1ZXN0cyIsIlRyYW5zZm9ybVJlcXVlc3RQcm9jZXNzb3JzIiwiSW52YWxpZFNlcnZlclJlc3BvbnNlIiwiUXVlcnlPcGVyYXRvcnMiLCJKU09OQVBJU291cmNlIiwic2V0dGluZ3MiLCJzY2hlbWEiLCJQcm9taXNlIiwibmFtZSIsIm5hbWVzcGFjZSIsImhvc3QiLCJpbml0RGVmYXVsdEZldGNoU2V0dGluZ3MiLCJtYXhSZXF1ZXN0c1BlclRyYW5zZm9ybSIsIlNlcmlhbGl6ZXJDbGFzcyIsInNlcmlhbGl6ZXIiLCJrZXlNYXAiLCJfcHVzaCIsInRyYW5zZm9ybSIsInJlcXVlc3RzIiwicmVzb2x2ZSIsInRoZW4iLCJfcHJvY2Vzc1JlcXVlc3RzIiwidHJhbnNmb3JtcyIsInVuc2hpZnQiLCJfcHVsbCIsInF1ZXJ5Iiwib3BlcmF0b3IiLCJleHByZXNzaW9uIiwib3AiLCJFcnJvciIsIl9xdWVyeSIsIl90cmFuc2Zvcm1lZCIsInJlc3BvbnNlIiwicHJpbWFyeURhdGEiLCJmZXRjaCIsInVybCIsImN1c3RvbVNldHRpbmdzIiwiaW5pdEZldGNoU2V0dGluZ3MiLCJmdWxsVXJsIiwicGFyYW1zIiwiZmV0Y2hGbiIsInRpbWVvdXQiLCJyZWplY3QiLCJ0aW1lZE91dCIsInRpbWVyIiwiZ2xvYmFscyIsInNldFRpbWVvdXQiLCJjYXRjaCIsImNsZWFyVGltZW91dCIsImhhbmRsZUZldGNoRXJyb3IiLCJlIiwiaGFuZGxlRmV0Y2hSZXNwb25zZSIsImRlZmF1bHRGZXRjaFNldHRpbmdzIiwianNvbiIsImJvZHkiLCJKU09OIiwic3RyaW5naWZ5IiwiaGVhZGVycyIsInN0YXR1cyIsInJlc3BvbnNlSGFzQ29udGVudCIsImhhbmRsZUZldGNoUmVzcG9uc2VFcnJvciIsImRhdGEiLCJlcnJvciIsInN0YXR1c1RleHQiLCJjb250ZW50VHlwZSIsImdldCIsImluZGV4T2YiLCJyZXNvdXJjZU5hbWVzcGFjZSIsInR5cGUiLCJyZXNvdXJjZUhvc3QiLCJyZXNvdXJjZVBhdGgiLCJpZCIsInBhdGgiLCJyZXNvdXJjZVR5cGUiLCJyZXNvdXJjZUlkIiwicHVzaCIsImpvaW4iLCJyZXNvdXJjZVVSTCIsInJlc291cmNlUmVsYXRpb25zaGlwVVJMIiwicmVsYXRpb25zaGlwIiwicmVzb3VyY2VSZWxhdGlvbnNoaXAiLCJyZWxhdGVkUmVzb3VyY2VVUkwiLCJBY2NlcHQiLCJkZWZhdWx0RmV0Y2hIZWFkZXJzIiwiZGVmYXVsdEZldGNoVGltZW91dCIsInVuZGVmaW5lZCIsInByb2Nlc3NvcnMiLCJyZXN1bHQiLCJmb3JFYWNoIiwicHJvY2Vzc29yIiwicmVxdWVzdCIsImFkZGl0aW9uYWxUcmFuc2Zvcm1zIiwiQXJyYXkiLCJwcm90b3R5cGUiLCJhcHBseSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLElBQUlBLGFBQWEsUUFBUSxLQUFLQSxVQUFiLElBQTJCLFVBQVVDLFVBQVYsRUFBc0JDLE1BQXRCLEVBQThCQyxHQUE5QixFQUFtQ0MsSUFBbkMsRUFBeUM7QUFDakYsUUFBSUMsSUFBSUMsVUFBVUMsTUFBbEI7QUFBQSxRQUNJQyxJQUFJSCxJQUFJLENBQUosR0FBUUgsTUFBUixHQUFpQkUsU0FBUyxJQUFULEdBQWdCQSxPQUFPSyxPQUFPQyx3QkFBUCxDQUFnQ1IsTUFBaEMsRUFBd0NDLEdBQXhDLENBQXZCLEdBQXNFQyxJQUQvRjtBQUFBLFFBRUlPLENBRko7QUFHQSxRQUFJLE9BQU9DLE9BQVAsS0FBbUIsUUFBbkIsSUFBK0IsT0FBT0EsUUFBUUMsUUFBZixLQUE0QixVQUEvRCxFQUEyRUwsSUFBSUksUUFBUUMsUUFBUixDQUFpQlosVUFBakIsRUFBNkJDLE1BQTdCLEVBQXFDQyxHQUFyQyxFQUEwQ0MsSUFBMUMsQ0FBSixDQUEzRSxLQUFvSSxLQUFLLElBQUlVLElBQUliLFdBQVdNLE1BQVgsR0FBb0IsQ0FBakMsRUFBb0NPLEtBQUssQ0FBekMsRUFBNENBLEdBQTVDO0FBQWlELFlBQUlILElBQUlWLFdBQVdhLENBQVgsQ0FBUixFQUF1Qk4sSUFBSSxDQUFDSCxJQUFJLENBQUosR0FBUU0sRUFBRUgsQ0FBRixDQUFSLEdBQWVILElBQUksQ0FBSixHQUFRTSxFQUFFVCxNQUFGLEVBQVVDLEdBQVYsRUFBZUssQ0FBZixDQUFSLEdBQTRCRyxFQUFFVCxNQUFGLEVBQVVDLEdBQVYsQ0FBNUMsS0FBK0RLLENBQW5FO0FBQXhFLEtBQ3BJLE9BQU9ILElBQUksQ0FBSixJQUFTRyxDQUFULElBQWNDLE9BQU9NLGNBQVAsQ0FBc0JiLE1BQXRCLEVBQThCQyxHQUE5QixFQUFtQ0ssQ0FBbkMsQ0FBZCxFQUFxREEsQ0FBNUQ7QUFDSCxDQU5EO0FBT0E7QUFDQSxPQUFPUSxLQUFQLElBQWdCQyxNQUFoQixFQUF3QkMsUUFBeEIsRUFBa0NDLFFBQWxDLEVBQTRDQyxtQkFBNUMsRUFBaUVDLFdBQWpFLEVBQThFQyxXQUE5RSxFQUEyRkMsWUFBM0YsRUFBeUdDLFNBQXpHLFFBQTBILGFBQTFIO0FBQ0EsU0FBU0MsTUFBVCxFQUFpQkMsU0FBakIsRUFBNEJDLFNBQTVCLFFBQTZDLGNBQTdDO0FBQ0EsT0FBT0MsaUJBQVAsTUFBOEIsc0JBQTlCO0FBQ0EsU0FBU0MsaUJBQVQsUUFBa0Msb0JBQWxDO0FBQ0EsU0FBU0MsYUFBVCxRQUE4QixzQkFBOUI7QUFDQSxTQUFTQyxvQkFBVCxFQUErQkMsMEJBQS9CLFFBQWlFLDBCQUFqRTtBQUNBLFNBQVNDLHFCQUFULFFBQXNDLGtCQUF0QztBQUNBLFNBQVNDLGNBQVQsUUFBK0IsdUJBQS9CO0FBQ0E7Ozs7Ozs7Ozs7Ozs7O0FBY0EsSUFBSUM7QUFBQTs7QUFDQSw2QkFBMkI7QUFBQSxZQUFmQyxRQUFlLHVFQUFKLEVBQUk7O0FBQUE7O0FBQ3ZCWCxlQUFPLHVGQUFQLEVBQWdHLENBQUMsQ0FBQ1csU0FBU0MsTUFBM0c7QUFDQVosZUFBTyxpREFBUCxFQUEwRFQsTUFBTXNCLE9BQWhFO0FBQ0FGLGlCQUFTRyxJQUFULEdBQWdCSCxTQUFTRyxJQUFULElBQWlCLFNBQWpDOztBQUh1QixxREFJdkIsbUJBQU1ILFFBQU4sQ0FKdUI7O0FBS3ZCLGNBQUtJLFNBQUwsR0FBaUJKLFNBQVNJLFNBQTFCO0FBQ0EsY0FBS0MsSUFBTCxHQUFZTCxTQUFTSyxJQUFyQjtBQUNBLGNBQUtDLHdCQUFMLENBQThCTixRQUE5QjtBQUNBLGNBQUtPLHVCQUFMLEdBQStCUCxTQUFTTyx1QkFBeEM7QUFDQSxZQUFNQyxrQkFBa0JSLFNBQVNRLGVBQVQsSUFBNEJoQixpQkFBcEQ7QUFDQSxjQUFLaUIsVUFBTCxHQUFrQixJQUFJRCxlQUFKLENBQW9CLEVBQUVQLFFBQVFELFNBQVNDLE1BQW5CLEVBQTJCUyxRQUFRVixTQUFTVSxNQUE1QyxFQUFwQixDQUFsQjtBQVZ1QjtBQVcxQjs7QUFpQkQ7QUFDQTtBQUNBO0FBL0JBLDRCQWdDQUMsS0FoQ0Esa0JBZ0NNQyxTQWhDTixFQWdDaUI7QUFBQTs7QUFDYixZQUFNQyxXQUFXbEIscUJBQXFCLElBQXJCLEVBQTJCaUIsU0FBM0IsQ0FBakI7QUFDQSxZQUFJLEtBQUtMLHVCQUFMLElBQWdDTSxTQUFTMUMsTUFBVCxHQUFrQixLQUFLb0MsdUJBQTNELEVBQW9GO0FBQ2hGLG1CQUFPM0IsTUFBTXNCLE9BQU4sQ0FBY1ksT0FBZCxHQUF3QkMsSUFBeEIsQ0FBNkIsWUFBTTtBQUN0QyxzQkFBTSxJQUFJL0IsbUJBQUosOEJBQW1ENkIsU0FBUzFDLE1BQTVELHdEQUFxSCxPQUFLb0MsdUJBQTFILCtCQUE2S0ssU0FBN0ssQ0FBTjtBQUNILGFBRk0sQ0FBUDtBQUdIO0FBQ0QsZUFBTyxLQUFLSSxnQkFBTCxDQUFzQkgsUUFBdEIsRUFBZ0NqQiwwQkFBaEMsRUFBNERtQixJQUE1RCxDQUFpRSxzQkFBYztBQUNsRkUsdUJBQVdDLE9BQVgsQ0FBbUJOLFNBQW5CO0FBQ0EsbUJBQU9LLFVBQVA7QUFDSCxTQUhNLENBQVA7QUFJSCxLQTNDRDtBQTRDQTtBQUNBO0FBQ0E7OztBQTlDQSw0QkErQ0FFLEtBL0NBLGtCQStDTUMsS0EvQ04sRUErQ2E7QUFDVCxZQUFNQyxXQUFXM0IsY0FBYzBCLE1BQU1FLFVBQU4sQ0FBaUJDLEVBQS9CLENBQWpCO0FBQ0EsWUFBSSxDQUFDRixRQUFMLEVBQWU7QUFDWCxrQkFBTSxJQUFJRyxLQUFKLENBQVUsbUZBQVYsQ0FBTjtBQUNIO0FBQ0QsZUFBT0gsU0FBUyxJQUFULEVBQWVELEtBQWYsQ0FBUDtBQUNILEtBckREO0FBc0RBO0FBQ0E7QUFDQTs7O0FBeERBLDRCQXlEQUssTUF6REEsbUJBeURPTCxLQXpEUCxFQXlEYztBQUFBOztBQUNWLFlBQU1DLFdBQVd2QixlQUFlc0IsTUFBTUUsVUFBTixDQUFpQkMsRUFBaEMsQ0FBakI7QUFDQSxZQUFJLENBQUNGLFFBQUwsRUFBZTtBQUNYLGtCQUFNLElBQUlHLEtBQUosQ0FBVSxtRkFBVixDQUFOO0FBQ0g7QUFDRCxlQUFPSCxTQUFTLElBQVQsRUFBZUQsS0FBZixFQUFzQkwsSUFBdEIsQ0FBMkIsb0JBQVk7QUFDMUMsbUJBQU8sT0FBS1csWUFBTCxDQUFrQkMsU0FBU1YsVUFBM0IsRUFBdUNGLElBQXZDLENBQTRDO0FBQUEsdUJBQU1ZLFNBQVNDLFdBQWY7QUFBQSxhQUE1QyxDQUFQO0FBQ0gsU0FGTSxDQUFQO0FBR0gsS0FqRUQ7QUFrRUE7QUFDQTtBQUNBOzs7QUFwRUEsNEJBcUVBQyxLQXJFQTtBQUFBO0FBQUE7QUFBQTs7QUFBQTtBQUFBO0FBQUE7O0FBQUE7QUFBQSxnQkFxRU1DLEdBckVOLEVBcUVXQyxjQXJFWCxFQXFFMkI7QUFBQTs7QUFDdkIsWUFBSS9CLFdBQVcsS0FBS2dDLGlCQUFMLENBQXVCRCxjQUF2QixDQUFmO0FBQ0EsWUFBSUUsVUFBVUgsR0FBZDtBQUNBLFlBQUk5QixTQUFTa0MsTUFBYixFQUFxQjtBQUNqQkQsc0JBQVV4QyxrQkFBa0J3QyxPQUFsQixFQUEyQmpDLFNBQVNrQyxNQUFwQyxDQUFWO0FBQ0EsbUJBQU9sQyxTQUFTa0MsTUFBaEI7QUFDSDtBQUNEO0FBQ0EsWUFBSUMsVUFBVXZELE1BQU1pRCxLQUFOLElBQWVBLEtBQTdCO0FBQ0EsWUFBSTdCLFNBQVNvQyxPQUFiLEVBQXNCO0FBQ2xCLGdCQUFJQSxVQUFVcEMsU0FBU29DLE9BQXZCO0FBQ0EsbUJBQU9wQyxTQUFTb0MsT0FBaEI7QUFDQSxtQkFBTyxJQUFJeEQsTUFBTXNCLE9BQVYsQ0FBa0IsVUFBQ1ksT0FBRCxFQUFVdUIsTUFBVixFQUFxQjtBQUMxQyxvQkFBSUMsaUJBQUo7QUFDQSxvQkFBSUMsUUFBUTNELE1BQU00RCxPQUFOLENBQWNDLFVBQWQsQ0FBeUIsWUFBTTtBQUN2Q0gsK0JBQVcsSUFBWDtBQUNBRCwyQkFBTyxJQUFJbEQsWUFBSiwrQkFBNkNpRCxPQUE3QyxTQUFQO0FBQ0gsaUJBSFcsRUFHVEEsT0FIUyxDQUFaO0FBSUFELHdCQUFRRixPQUFSLEVBQWlCakMsUUFBakIsRUFBMkIwQyxLQUEzQixDQUFpQyxhQUFLO0FBQ2xDOUQsMEJBQU00RCxPQUFOLENBQWNHLFlBQWQsQ0FBMkJKLEtBQTNCO0FBQ0Esd0JBQUksQ0FBQ0QsUUFBTCxFQUFlO0FBQ1gsK0JBQU8sT0FBS00sZ0JBQUwsQ0FBc0JDLENBQXRCLENBQVA7QUFDSDtBQUNKLGlCQUxELEVBS0c5QixJQUxILENBS1Esb0JBQVk7QUFDaEJuQywwQkFBTTRELE9BQU4sQ0FBY0csWUFBZCxDQUEyQkosS0FBM0I7QUFDQSx3QkFBSSxDQUFDRCxRQUFMLEVBQWU7QUFDWCwrQkFBTyxPQUFLUSxtQkFBTCxDQUF5Qm5CLFFBQXpCLENBQVA7QUFDSDtBQUNKLGlCQVZELEVBVUdaLElBVkgsQ0FVUUQsT0FWUixFQVVpQnVCLE1BVmpCO0FBV0gsYUFqQk0sQ0FBUDtBQWtCSCxTQXJCRCxNQXFCTztBQUNILG1CQUFPRixRQUFRRixPQUFSLEVBQWlCakMsUUFBakIsRUFBMkIwQyxLQUEzQixDQUFpQztBQUFBLHVCQUFLLE9BQUtFLGdCQUFMLENBQXNCQyxDQUF0QixDQUFMO0FBQUEsYUFBakMsRUFBZ0U5QixJQUFoRSxDQUFxRTtBQUFBLHVCQUFZLE9BQUsrQixtQkFBTCxDQUF5Qm5CLFFBQXpCLENBQVo7QUFBQSxhQUFyRSxDQUFQO0FBQ0g7QUFDSixLQXRHRDs7QUFBQSw0QkF1R0FLLGlCQXZHQSxnQ0F1R3VDO0FBQUEsWUFBckJELGNBQXFCLHVFQUFKLEVBQUk7O0FBQ25DLFlBQUkvQixXQUFXVixVQUFVLEVBQVYsRUFBYyxLQUFLeUQsb0JBQW5CLEVBQXlDaEIsY0FBekMsQ0FBZjtBQUNBLFlBQUkvQixTQUFTZ0QsSUFBYixFQUFtQjtBQUNmM0QsbUJBQU8sMERBQVAsRUFBbUUsQ0FBQ1csU0FBU2lELElBQTdFO0FBQ0FqRCxxQkFBU2lELElBQVQsR0FBZ0JDLEtBQUtDLFNBQUwsQ0FBZW5ELFNBQVNnRCxJQUF4QixDQUFoQjtBQUNBLG1CQUFPaEQsU0FBU2dELElBQWhCO0FBQ0g7QUFDRCxZQUFJaEQsU0FBU29ELE9BQVQsSUFBb0IsQ0FBQ3BELFNBQVNpRCxJQUFsQyxFQUF3QztBQUNwQyxtQkFBT2pELFNBQVNvRCxPQUFULENBQWlCLGNBQWpCLENBQVA7QUFDSDtBQUNELGVBQU9wRCxRQUFQO0FBQ0gsS0FsSEQ7O0FBQUEsNEJBbUhBOEMsbUJBbkhBLGdDQW1Ib0JuQixRQW5IcEIsRUFtSDhCO0FBQUE7O0FBQzFCLFlBQUlBLFNBQVMwQixNQUFULEtBQW9CLEdBQXhCLEVBQTZCO0FBQ3pCLGdCQUFJLEtBQUtDLGtCQUFMLENBQXdCM0IsUUFBeEIsQ0FBSixFQUF1QztBQUNuQyx1QkFBT0EsU0FBU3FCLElBQVQsRUFBUDtBQUNILGFBRkQsTUFFTztBQUNILHNCQUFNLElBQUluRCxxQkFBSiw4QkFBcUQ4QixTQUFTMEIsTUFBOUQsaUdBQU47QUFDSDtBQUNKLFNBTkQsTUFNTyxJQUFJMUIsU0FBUzBCLE1BQVQsSUFBbUIsR0FBbkIsSUFBMEIxQixTQUFTMEIsTUFBVCxHQUFrQixHQUFoRCxFQUFxRDtBQUN4RCxnQkFBSSxLQUFLQyxrQkFBTCxDQUF3QjNCLFFBQXhCLENBQUosRUFBdUM7QUFDbkMsdUJBQU9BLFNBQVNxQixJQUFULEVBQVA7QUFDSDtBQUNKLFNBSk0sTUFJQTtBQUNILGdCQUFJLEtBQUtNLGtCQUFMLENBQXdCM0IsUUFBeEIsQ0FBSixFQUF1QztBQUNuQyx1QkFBT0EsU0FBU3FCLElBQVQsR0FBZ0JqQyxJQUFoQixDQUFxQjtBQUFBLDJCQUFRLE9BQUt3Qyx3QkFBTCxDQUE4QjVCLFFBQTlCLEVBQXdDNkIsSUFBeEMsQ0FBUjtBQUFBLGlCQUFyQixDQUFQO0FBQ0gsYUFGRCxNQUVPO0FBQ0gsdUJBQU8sS0FBS0Qsd0JBQUwsQ0FBOEI1QixRQUE5QixDQUFQO0FBQ0g7QUFDSjtBQUNELGVBQU8vQyxNQUFNc0IsT0FBTixDQUFjWSxPQUFkLEVBQVA7QUFDSCxLQXRJRDs7QUFBQSw0QkF1SUF5Qyx3QkF2SUEscUNBdUl5QjVCLFFBdkl6QixFQXVJbUM2QixJQXZJbkMsRUF1SXlDO0FBQ3JDLFlBQUlDLGNBQUo7QUFDQSxZQUFJOUIsU0FBUzBCLE1BQVQsSUFBbUIsR0FBbkIsSUFBMEIxQixTQUFTMEIsTUFBVCxHQUFrQixHQUFoRCxFQUFxRDtBQUNqREksb0JBQVEsSUFBSXhFLFdBQUosQ0FBZ0IwQyxTQUFTK0IsVUFBekIsQ0FBUjtBQUNILFNBRkQsTUFFTztBQUNIRCxvQkFBUSxJQUFJdkUsV0FBSixDQUFnQnlDLFNBQVMrQixVQUF6QixDQUFSO0FBQ0g7QUFDREQsY0FBTTlCLFFBQU4sR0FBaUJBLFFBQWpCO0FBQ0E4QixjQUFNRCxJQUFOLEdBQWFBLElBQWI7QUFDQSxlQUFPNUUsTUFBTXNCLE9BQU4sQ0FBY21DLE1BQWQsQ0FBcUJvQixLQUFyQixDQUFQO0FBQ0gsS0FqSkQ7O0FBQUEsNEJBa0pBYixnQkFsSkEsNkJBa0ppQkMsQ0FsSmpCLEVBa0pvQjtBQUNoQixZQUFJWSxRQUFRLElBQUl0RSxZQUFKLENBQWlCMEQsQ0FBakIsQ0FBWjtBQUNBLGVBQU9qRSxNQUFNc0IsT0FBTixDQUFjbUMsTUFBZCxDQUFxQm9CLEtBQXJCLENBQVA7QUFDSCxLQXJKRDs7QUFBQSw0QkFzSkFILGtCQXRKQSwrQkFzSm1CM0IsUUF0Sm5CLEVBc0o2QjtBQUN6QixZQUFJZ0MsY0FBY2hDLFNBQVN5QixPQUFULENBQWlCUSxHQUFqQixDQUFxQixjQUFyQixDQUFsQjtBQUNBLGVBQU9ELGVBQWVBLFlBQVlFLE9BQVosQ0FBb0IsMEJBQXBCLElBQWtELENBQUMsQ0FBekU7QUFDSCxLQXpKRDs7QUFBQSw0QkEwSkFDLGlCQTFKQSw4QkEwSmtCQyxJQTFKbEIsRUEwSndCO0FBQ3BCLGVBQU8sS0FBSzNELFNBQVo7QUFDSCxLQTVKRDs7QUFBQSw0QkE2SkE0RCxZQTdKQSx5QkE2SmFELElBN0piLEVBNkptQjtBQUNmLGVBQU8sS0FBSzFELElBQVo7QUFDSCxLQS9KRDs7QUFBQSw0QkFnS0E0RCxZQWhLQSx5QkFnS2FGLElBaEtiLEVBZ0ttQkcsRUFoS25CLEVBZ0t1QjtBQUNuQixZQUFJQyxPQUFPLENBQUMsS0FBSzFELFVBQUwsQ0FBZ0IyRCxZQUFoQixDQUE2QkwsSUFBN0IsQ0FBRCxDQUFYO0FBQ0EsWUFBSUcsRUFBSixFQUFRO0FBQ0osZ0JBQUlHLGFBQWEsS0FBSzVELFVBQUwsQ0FBZ0I0RCxVQUFoQixDQUEyQk4sSUFBM0IsRUFBaUNHLEVBQWpDLENBQWpCO0FBQ0EsZ0JBQUlHLFVBQUosRUFBZ0I7QUFDWkYscUJBQUtHLElBQUwsQ0FBVUQsVUFBVjtBQUNIO0FBQ0o7QUFDRCxlQUFPRixLQUFLSSxJQUFMLENBQVUsR0FBVixDQUFQO0FBQ0gsS0F6S0Q7O0FBQUEsNEJBMEtBQyxXQTFLQSx3QkEwS1lULElBMUtaLEVBMEtrQkcsRUExS2xCLEVBMEtzQjtBQUNsQixZQUFJN0QsT0FBTyxLQUFLMkQsWUFBTCxDQUFrQkQsSUFBbEIsQ0FBWDtBQUNBLFlBQUkzRCxZQUFZLEtBQUswRCxpQkFBTCxDQUF1QkMsSUFBdkIsQ0FBaEI7QUFDQSxZQUFJakMsTUFBTSxFQUFWO0FBQ0EsWUFBSXpCLElBQUosRUFBVTtBQUNOeUIsZ0JBQUl3QyxJQUFKLENBQVNqRSxJQUFUO0FBQ0g7QUFDRCxZQUFJRCxTQUFKLEVBQWU7QUFDWDBCLGdCQUFJd0MsSUFBSixDQUFTbEUsU0FBVDtBQUNIO0FBQ0QwQixZQUFJd0MsSUFBSixDQUFTLEtBQUtMLFlBQUwsQ0FBa0JGLElBQWxCLEVBQXdCRyxFQUF4QixDQUFUO0FBQ0EsWUFBSSxDQUFDN0QsSUFBTCxFQUFXO0FBQ1B5QixnQkFBSVosT0FBSixDQUFZLEVBQVo7QUFDSDtBQUNELGVBQU9ZLElBQUl5QyxJQUFKLENBQVMsR0FBVCxDQUFQO0FBQ0gsS0F6TEQ7O0FBQUEsNEJBMExBRSx1QkExTEEsb0NBMEx3QlYsSUExTHhCLEVBMEw4QkcsRUExTDlCLEVBMExrQ1EsWUExTGxDLEVBMExnRDtBQUM1QyxlQUFPLEtBQUtGLFdBQUwsQ0FBaUJULElBQWpCLEVBQXVCRyxFQUF2QixJQUE2QixpQkFBN0IsR0FBaUQsS0FBS3pELFVBQUwsQ0FBZ0JrRSxvQkFBaEIsQ0FBcUNaLElBQXJDLEVBQTJDVyxZQUEzQyxDQUF4RDtBQUNILEtBNUxEOztBQUFBLDRCQTZMQUUsa0JBN0xBLCtCQTZMbUJiLElBN0xuQixFQTZMeUJHLEVBN0x6QixFQTZMNkJRLFlBN0w3QixFQTZMMkM7QUFDdkMsZUFBTyxLQUFLRixXQUFMLENBQWlCVCxJQUFqQixFQUF1QkcsRUFBdkIsSUFBNkIsR0FBN0IsR0FBbUMsS0FBS3pELFVBQUwsQ0FBZ0JrRSxvQkFBaEIsQ0FBcUNaLElBQXJDLEVBQTJDVyxZQUEzQyxDQUExQztBQUNILEtBL0xEO0FBZ01BO0FBQ0E7QUFDQTs7O0FBbE1BLDRCQW1NQXBFLHdCQW5NQSxxQ0FtTXlCTixRQW5NekIsRUFtTW1DO0FBQy9CLGFBQUsrQyxvQkFBTCxHQUE0QjtBQUN4QksscUJBQVM7QUFDTHlCLHdCQUFRLDBCQURIO0FBRUwsZ0NBQWdCO0FBRlgsYUFEZTtBQUt4QnpDLHFCQUFTO0FBTGUsU0FBNUI7QUFPQSxZQUFJcEMsU0FBUzhFLG1CQUFULElBQWdDOUUsU0FBUytFLG1CQUE3QyxFQUFrRTtBQUM5RHhGLHNCQUFVLGlIQUFWLEVBQTZIUyxTQUFTOEUsbUJBQVQsS0FBaUNFLFNBQTlKO0FBQ0F6RixzQkFBVSxpSEFBVixFQUE2SFMsU0FBUytFLG1CQUFULEtBQWlDQyxTQUE5SjtBQUNBMUYsc0JBQVUsS0FBS3lELG9CQUFmLEVBQXFDO0FBQ2pDSyx5QkFBU3BELFNBQVM4RSxtQkFEZTtBQUVqQzFDLHlCQUFTcEMsU0FBUytFO0FBRmUsYUFBckM7QUFJSDtBQUNELFlBQUkvRSxTQUFTK0Msb0JBQWIsRUFBbUM7QUFDL0J6RCxzQkFBVSxLQUFLeUQsb0JBQWYsRUFBcUMvQyxTQUFTK0Msb0JBQTlDO0FBQ0g7QUFDSixLQXRORDs7QUFBQSw0QkF1TkEvQixnQkF2TkEsNkJBdU5pQkgsUUF2TmpCLEVBdU4yQm9FLFVBdk4zQixFQXVOdUM7QUFBQTs7QUFDbkMsWUFBSWhFLGFBQWEsRUFBakI7QUFDQSxZQUFJaUUsU0FBU3RHLE1BQU1zQixPQUFOLENBQWNZLE9BQWQsRUFBYjtBQUNBRCxpQkFBU3NFLE9BQVQsQ0FBaUIsbUJBQVc7QUFDeEIsZ0JBQUlDLFlBQVlILFdBQVdJLFFBQVE5RCxFQUFuQixDQUFoQjtBQUNBMkQscUJBQVNBLE9BQU9uRSxJQUFQLENBQVksWUFBTTtBQUN2Qix1QkFBT3FFLFVBQVUsTUFBVixFQUFnQkMsT0FBaEIsRUFBeUJ0RSxJQUF6QixDQUE4QixnQ0FBd0I7QUFDekQsd0JBQUl1RSxvQkFBSixFQUEwQjtBQUN0QkMsOEJBQU1DLFNBQU4sQ0FBZ0JsQixJQUFoQixDQUFxQm1CLEtBQXJCLENBQTJCeEUsVUFBM0IsRUFBdUNxRSxvQkFBdkM7QUFDSDtBQUNKLGlCQUpNLENBQVA7QUFLSCxhQU5RLENBQVQ7QUFPSCxTQVREO0FBVUEsZUFBT0osT0FBT25FLElBQVAsQ0FBWTtBQUFBLG1CQUFNRSxVQUFOO0FBQUEsU0FBWixDQUFQO0FBQ0gsS0FyT0Q7O0FBQUE7QUFBQTtBQUFBLHlCQWEwQjtBQUN0QjFCLHNCQUFVLHVGQUFWO0FBQ0EsbUJBQU8sS0FBS3dELG9CQUFMLENBQTBCSyxPQUFqQztBQUNILFNBaEJEO0FBQUEsdUJBaUJ3QkEsT0FqQnhCLEVBaUJpQztBQUM3QjdELHNCQUFVLHVGQUFWO0FBQ0EsaUJBQUt3RCxvQkFBTCxDQUEwQkssT0FBMUIsR0FBb0NBLE9BQXBDO0FBQ0g7QUFwQkQ7QUFBQTtBQUFBLHlCQXFCMEI7QUFDdEI3RCxzQkFBVSx1RkFBVjtBQUNBLG1CQUFPLEtBQUt3RCxvQkFBTCxDQUEwQlgsT0FBakM7QUFDSCxTQXhCRDtBQUFBLHVCQXlCd0JBLE9BekJ4QixFQXlCaUM7QUFDN0I3QyxzQkFBVSx1RkFBVjtBQUNBLGlCQUFLd0Qsb0JBQUwsQ0FBMEJYLE9BQTFCLEdBQW9DQSxPQUFwQztBQUNIO0FBNUJEOztBQUFBO0FBQUEsRUFBNEN2RCxNQUE1QyxDQUFKO0FBdU9Ba0IsZ0JBQWdCbkMsV0FBVyxDQUFDa0IsUUFBRCxFQUFXQyxRQUFYLEVBQXFCSyxTQUFyQixDQUFYLEVBQTRDVyxhQUE1QyxDQUFoQjtBQUNBLGVBQWVBLGFBQWYiLCJmaWxlIjoianNvbmFwaS1zb3VyY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgX19kZWNvcmF0ZSA9IHRoaXMgJiYgdGhpcy5fX2RlY29yYXRlIHx8IGZ1bmN0aW9uIChkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xuICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aCxcbiAgICAgICAgciA9IGMgPCAzID8gdGFyZ2V0IDogZGVzYyA9PT0gbnVsbCA/IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KSA6IGRlc2MsXG4gICAgICAgIGQ7XG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xuICAgIHJldHVybiBjID4gMyAmJiByICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgciksIHI7XG59O1xuLyogZXNsaW50LWRpc2FibGUgdmFsaWQtanNkb2MgKi9cbmltcG9ydCBPcmJpdCwgeyBTb3VyY2UsIHB1bGxhYmxlLCBwdXNoYWJsZSwgVHJhbnNmb3JtTm90QWxsb3dlZCwgQ2xpZW50RXJyb3IsIFNlcnZlckVycm9yLCBOZXR3b3JrRXJyb3IsIHF1ZXJ5YWJsZSB9IGZyb20gJ0BvcmJpdC9kYXRhJztcbmltcG9ydCB7IGFzc2VydCwgZGVlcE1lcmdlLCBkZXByZWNhdGUgfSBmcm9tICdAb3JiaXQvdXRpbHMnO1xuaW1wb3J0IEpTT05BUElTZXJpYWxpemVyIGZyb20gJy4vanNvbmFwaS1zZXJpYWxpemVyJztcbmltcG9ydCB7IGFwcGVuZFF1ZXJ5UGFyYW1zIH0gZnJvbSAnLi9saWIvcXVlcnktcGFyYW1zJztcbmltcG9ydCB7IFB1bGxPcGVyYXRvcnMgfSBmcm9tICcuL2xpYi9wdWxsLW9wZXJhdG9ycyc7XG5pbXBvcnQgeyBnZXRUcmFuc2Zvcm1SZXF1ZXN0cywgVHJhbnNmb3JtUmVxdWVzdFByb2Nlc3NvcnMgfSBmcm9tICcuL2xpYi90cmFuc2Zvcm0tcmVxdWVzdHMnO1xuaW1wb3J0IHsgSW52YWxpZFNlcnZlclJlc3BvbnNlIH0gZnJvbSAnLi9saWIvZXhjZXB0aW9ucyc7XG5pbXBvcnQgeyBRdWVyeU9wZXJhdG9ycyB9IGZyb20gXCIuL2xpYi9xdWVyeS1vcGVyYXRvcnNcIjtcbi8qKlxuIFNvdXJjZSBmb3IgYWNjZXNzaW5nIGEgSlNPTiBBUEkgY29tcGxpYW50IFJFU1RmdWwgQVBJIHdpdGggYSBuZXR3b3JrIGZldGNoXG4gcmVxdWVzdC5cblxuIElmIGEgc2luZ2xlIHRyYW5zZm9ybSBvciBxdWVyeSByZXF1aXJlcyBtb3JlIHRoYW4gb25lIGZldGNoIHJlcXVlc3QsXG4gcmVxdWVzdHMgd2lsbCBiZSBwZXJmb3JtZWQgc2VxdWVudGlhbGx5IGFuZCByZXNvbHZlZCB0b2dldGhlci4gRnJvbSB0aGVcbiBwZXJzcGVjdGl2ZSBvZiBPcmJpdCwgdGhlc2Ugb3BlcmF0aW9ucyB3aWxsIGFsbCBzdWNjZWVkIG9yIGZhaWwgdG9nZXRoZXIuIFRoZVxuIGBtYXhSZXF1ZXN0c1BlclRyYW5zZm9ybWAgYW5kIGBtYXhSZXF1ZXN0c1BlclF1ZXJ5YCBzZXR0aW5ncyBhbGxvdyBsaW1pdHMgdG8gYmVcbiBzZXQgb24gdGhpcyBiZWhhdmlvci4gVGhlc2Ugc2V0dGluZ3Mgc2hvdWxkIGJlIHNldCB0byBgMWAgaWYgeW91ciBjbGllbnQvc2VydmVyXG4gY29uZmlndXJhdGlvbiBpcyB1bmFibGUgdG8gcmVzb2x2ZSBwYXJ0aWFsbHkgc3VjY2Vzc2Z1bCB0cmFuc2Zvcm1zIC8gcXVlcmllcy5cblxuIEBjbGFzcyBKU09OQVBJU291cmNlXG4gQGV4dGVuZHMgU291cmNlXG4gKi9cbmxldCBKU09OQVBJU291cmNlID0gY2xhc3MgSlNPTkFQSVNvdXJjZSBleHRlbmRzIFNvdXJjZSB7XG4gICAgY29uc3RydWN0b3Ioc2V0dGluZ3MgPSB7fSkge1xuICAgICAgICBhc3NlcnQoJ0pTT05BUElTb3VyY2VcXCdzIGBzY2hlbWFgIG11c3QgYmUgc3BlY2lmaWVkIGluIGBzZXR0aW5ncy5zY2hlbWFgIGNvbnN0cnVjdG9yIGFyZ3VtZW50JywgISFzZXR0aW5ncy5zY2hlbWEpO1xuICAgICAgICBhc3NlcnQoJ0pTT05BUElTb3VyY2UgcmVxdWlyZXMgT3JiaXQuUHJvbWlzZSBiZSBkZWZpbmVkJywgT3JiaXQuUHJvbWlzZSk7XG4gICAgICAgIHNldHRpbmdzLm5hbWUgPSBzZXR0aW5ncy5uYW1lIHx8ICdqc29uYXBpJztcbiAgICAgICAgc3VwZXIoc2V0dGluZ3MpO1xuICAgICAgICB0aGlzLm5hbWVzcGFjZSA9IHNldHRpbmdzLm5hbWVzcGFjZTtcbiAgICAgICAgdGhpcy5ob3N0ID0gc2V0dGluZ3MuaG9zdDtcbiAgICAgICAgdGhpcy5pbml0RGVmYXVsdEZldGNoU2V0dGluZ3Moc2V0dGluZ3MpO1xuICAgICAgICB0aGlzLm1heFJlcXVlc3RzUGVyVHJhbnNmb3JtID0gc2V0dGluZ3MubWF4UmVxdWVzdHNQZXJUcmFuc2Zvcm07XG4gICAgICAgIGNvbnN0IFNlcmlhbGl6ZXJDbGFzcyA9IHNldHRpbmdzLlNlcmlhbGl6ZXJDbGFzcyB8fCBKU09OQVBJU2VyaWFsaXplcjtcbiAgICAgICAgdGhpcy5zZXJpYWxpemVyID0gbmV3IFNlcmlhbGl6ZXJDbGFzcyh7IHNjaGVtYTogc2V0dGluZ3Muc2NoZW1hLCBrZXlNYXA6IHNldHRpbmdzLmtleU1hcCB9KTtcbiAgICB9XG4gICAgZ2V0IGRlZmF1bHRGZXRjaEhlYWRlcnMoKSB7XG4gICAgICAgIGRlcHJlY2F0ZSgnSlNPTkFQSVNvdXJjZTogQWNjZXNzIGBkZWZhdWx0RmV0Y2hTZXR0aW5ncy5oZWFkZXJzYCBpbnN0ZWFkIG9mIGBkZWZhdWx0RmV0Y2hIZWFkZXJzYCcpO1xuICAgICAgICByZXR1cm4gdGhpcy5kZWZhdWx0RmV0Y2hTZXR0aW5ncy5oZWFkZXJzO1xuICAgIH1cbiAgICBzZXQgZGVmYXVsdEZldGNoSGVhZGVycyhoZWFkZXJzKSB7XG4gICAgICAgIGRlcHJlY2F0ZSgnSlNPTkFQSVNvdXJjZTogQWNjZXNzIGBkZWZhdWx0RmV0Y2hTZXR0aW5ncy5oZWFkZXJzYCBpbnN0ZWFkIG9mIGBkZWZhdWx0RmV0Y2hIZWFkZXJzYCcpO1xuICAgICAgICB0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzLmhlYWRlcnMgPSBoZWFkZXJzO1xuICAgIH1cbiAgICBnZXQgZGVmYXVsdEZldGNoVGltZW91dCgpIHtcbiAgICAgICAgZGVwcmVjYXRlKCdKU09OQVBJU291cmNlOiBBY2Nlc3MgYGRlZmF1bHRGZXRjaFNldHRpbmdzLnRpbWVvdXRgIGluc3RlYWQgb2YgYGRlZmF1bHRGZXRjaFRpbWVvdXRgJyk7XG4gICAgICAgIHJldHVybiB0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzLnRpbWVvdXQ7XG4gICAgfVxuICAgIHNldCBkZWZhdWx0RmV0Y2hUaW1lb3V0KHRpbWVvdXQpIHtcbiAgICAgICAgZGVwcmVjYXRlKCdKU09OQVBJU291cmNlOiBBY2Nlc3MgYGRlZmF1bHRGZXRjaFNldHRpbmdzLnRpbWVvdXRgIGluc3RlYWQgb2YgYGRlZmF1bHRGZXRjaFRpbWVvdXRgJyk7XG4gICAgICAgIHRoaXMuZGVmYXVsdEZldGNoU2V0dGluZ3MudGltZW91dCA9IHRpbWVvdXQ7XG4gICAgfVxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgLy8gUHVzaGFibGUgaW50ZXJmYWNlIGltcGxlbWVudGF0aW9uXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICBfcHVzaCh0cmFuc2Zvcm0pIHtcbiAgICAgICAgY29uc3QgcmVxdWVzdHMgPSBnZXRUcmFuc2Zvcm1SZXF1ZXN0cyh0aGlzLCB0cmFuc2Zvcm0pO1xuICAgICAgICBpZiAodGhpcy5tYXhSZXF1ZXN0c1BlclRyYW5zZm9ybSAmJiByZXF1ZXN0cy5sZW5ndGggPiB0aGlzLm1heFJlcXVlc3RzUGVyVHJhbnNmb3JtKSB7XG4gICAgICAgICAgICByZXR1cm4gT3JiaXQuUHJvbWlzZS5yZXNvbHZlKCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFRyYW5zZm9ybU5vdEFsbG93ZWQoYFRoaXMgdHJhbnNmb3JtIHJlcXVpcmVzICR7cmVxdWVzdHMubGVuZ3RofSByZXF1ZXN0cywgd2hpY2ggZXhjZWVkcyB0aGUgc3BlY2lmaWVkIGxpbWl0IG9mICR7dGhpcy5tYXhSZXF1ZXN0c1BlclRyYW5zZm9ybX0gcmVxdWVzdHMgcGVyIHRyYW5zZm9ybS5gLCB0cmFuc2Zvcm0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3Byb2Nlc3NSZXF1ZXN0cyhyZXF1ZXN0cywgVHJhbnNmb3JtUmVxdWVzdFByb2Nlc3NvcnMpLnRoZW4odHJhbnNmb3JtcyA9PiB7XG4gICAgICAgICAgICB0cmFuc2Zvcm1zLnVuc2hpZnQodHJhbnNmb3JtKTtcbiAgICAgICAgICAgIHJldHVybiB0cmFuc2Zvcm1zO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBQdWxsYWJsZSBpbnRlcmZhY2UgaW1wbGVtZW50YXRpb25cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIF9wdWxsKHF1ZXJ5KSB7XG4gICAgICAgIGNvbnN0IG9wZXJhdG9yID0gUHVsbE9wZXJhdG9yc1txdWVyeS5leHByZXNzaW9uLm9wXTtcbiAgICAgICAgaWYgKCFvcGVyYXRvcikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdKU09OQVBJU291cmNlIGRvZXMgbm90IHN1cHBvcnQgdGhlIGAke3F1ZXJ5LmV4cHJlc3Npb24ub3B9YCBvcGVyYXRvciBmb3IgcXVlcmllcy4nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3BlcmF0b3IodGhpcywgcXVlcnkpO1xuICAgIH1cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIC8vIFF1ZXJ5YWJsZSBpbnRlcmZhY2UgaW1wbGVtZW50YXRpb25cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIF9xdWVyeShxdWVyeSkge1xuICAgICAgICBjb25zdCBvcGVyYXRvciA9IFF1ZXJ5T3BlcmF0b3JzW3F1ZXJ5LmV4cHJlc3Npb24ub3BdO1xuICAgICAgICBpZiAoIW9wZXJhdG9yKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0pTT05BUElTb3VyY2UgZG9lcyBub3Qgc3VwcG9ydCB0aGUgYCR7cXVlcnkuZXhwcmVzc2lvbi5vcH1gIG9wZXJhdG9yIGZvciBxdWVyaWVzLicpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvcGVyYXRvcih0aGlzLCBxdWVyeSkudGhlbihyZXNwb25zZSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fdHJhbnNmb3JtZWQocmVzcG9uc2UudHJhbnNmb3JtcykudGhlbigoKSA9PiByZXNwb25zZS5wcmltYXJ5RGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIC8vIFB1YmxpY2x5IGFjY2Vzc2libGUgbWV0aG9kcyBwYXJ0aWN1bGFyIHRvIEpTT05BUElTb3VyY2VcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIGZldGNoKHVybCwgY3VzdG9tU2V0dGluZ3MpIHtcbiAgICAgICAgbGV0IHNldHRpbmdzID0gdGhpcy5pbml0RmV0Y2hTZXR0aW5ncyhjdXN0b21TZXR0aW5ncyk7XG4gICAgICAgIGxldCBmdWxsVXJsID0gdXJsO1xuICAgICAgICBpZiAoc2V0dGluZ3MucGFyYW1zKSB7XG4gICAgICAgICAgICBmdWxsVXJsID0gYXBwZW5kUXVlcnlQYXJhbXMoZnVsbFVybCwgc2V0dGluZ3MucGFyYW1zKTtcbiAgICAgICAgICAgIGRlbGV0ZSBzZXR0aW5ncy5wYXJhbXM7XG4gICAgICAgIH1cbiAgICAgICAgLy8gY29uc29sZS5sb2coJ2ZldGNoJywgZnVsbFVybCwgbWVyZ2VkU2V0dGluZ3MsICdwb2x5ZmlsbCcsIGZldGNoLnBvbHlmaWxsKTtcbiAgICAgICAgbGV0IGZldGNoRm4gPSBPcmJpdC5mZXRjaCB8fCBmZXRjaDtcbiAgICAgICAgaWYgKHNldHRpbmdzLnRpbWVvdXQpIHtcbiAgICAgICAgICAgIGxldCB0aW1lb3V0ID0gc2V0dGluZ3MudGltZW91dDtcbiAgICAgICAgICAgIGRlbGV0ZSBzZXR0aW5ncy50aW1lb3V0O1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBPcmJpdC5Qcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgdGltZWRPdXQ7XG4gICAgICAgICAgICAgICAgbGV0IHRpbWVyID0gT3JiaXQuZ2xvYmFscy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGltZWRPdXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IE5ldHdvcmtFcnJvcihgTm8gZmV0Y2ggcmVzcG9uc2Ugd2l0aGluICR7dGltZW91dH1tcy5gKSk7XG4gICAgICAgICAgICAgICAgfSwgdGltZW91dCk7XG4gICAgICAgICAgICAgICAgZmV0Y2hGbihmdWxsVXJsLCBzZXR0aW5ncykuY2F0Y2goZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIE9yYml0Lmdsb2JhbHMuY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aW1lZE91dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlRmV0Y2hFcnJvcihlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgICAgICAgICBPcmJpdC5nbG9iYWxzLmNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGltZWRPdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZUZldGNoUmVzcG9uc2UocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmV0Y2hGbihmdWxsVXJsLCBzZXR0aW5ncykuY2F0Y2goZSA9PiB0aGlzLmhhbmRsZUZldGNoRXJyb3IoZSkpLnRoZW4ocmVzcG9uc2UgPT4gdGhpcy5oYW5kbGVGZXRjaFJlc3BvbnNlKHJlc3BvbnNlKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaW5pdEZldGNoU2V0dGluZ3MoY3VzdG9tU2V0dGluZ3MgPSB7fSkge1xuICAgICAgICBsZXQgc2V0dGluZ3MgPSBkZWVwTWVyZ2Uoe30sIHRoaXMuZGVmYXVsdEZldGNoU2V0dGluZ3MsIGN1c3RvbVNldHRpbmdzKTtcbiAgICAgICAgaWYgKHNldHRpbmdzLmpzb24pIHtcbiAgICAgICAgICAgIGFzc2VydCgnYGpzb25gIGFuZCBgYm9keWAgY2FuXFwndCBib3RoIGJlIHNldCBmb3IgZmV0Y2ggcmVxdWVzdHMuJywgIXNldHRpbmdzLmJvZHkpO1xuICAgICAgICAgICAgc2V0dGluZ3MuYm9keSA9IEpTT04uc3RyaW5naWZ5KHNldHRpbmdzLmpzb24pO1xuICAgICAgICAgICAgZGVsZXRlIHNldHRpbmdzLmpzb247XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNldHRpbmdzLmhlYWRlcnMgJiYgIXNldHRpbmdzLmJvZHkpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzZXR0aW5ncy5oZWFkZXJzWydDb250ZW50LVR5cGUnXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2V0dGluZ3M7XG4gICAgfVxuICAgIGhhbmRsZUZldGNoUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gMjAxKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5yZXNwb25zZUhhc0NvbnRlbnQocmVzcG9uc2UpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEludmFsaWRTZXJ2ZXJSZXNwb25zZShgU2VydmVyIHJlc3BvbnNlcyB3aXRoIGEgJHtyZXNwb25zZS5zdGF0dXN9IHN0YXR1cyBzaG91bGQgcmV0dXJuIGNvbnRlbnQgd2l0aCBhIENvbnRlbnQtVHlwZSB0aGF0IGluY2x1ZGVzICdhcHBsaWNhdGlvbi92bmQuYXBpK2pzb24nLmApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLnN0YXR1cyA+PSAyMDAgJiYgcmVzcG9uc2Uuc3RhdHVzIDwgMzAwKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5yZXNwb25zZUhhc0NvbnRlbnQocmVzcG9uc2UpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlc3BvbnNlSGFzQ29udGVudChyZXNwb25zZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpLnRoZW4oZGF0YSA9PiB0aGlzLmhhbmRsZUZldGNoUmVzcG9uc2VFcnJvcihyZXNwb25zZSwgZGF0YSkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVGZXRjaFJlc3BvbnNlRXJyb3IocmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBPcmJpdC5Qcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG4gICAgaGFuZGxlRmV0Y2hSZXNwb25zZUVycm9yKHJlc3BvbnNlLCBkYXRhKSB7XG4gICAgICAgIGxldCBlcnJvcjtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA+PSA0MDAgJiYgcmVzcG9uc2Uuc3RhdHVzIDwgNTAwKSB7XG4gICAgICAgICAgICBlcnJvciA9IG5ldyBDbGllbnRFcnJvcihyZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVycm9yID0gbmV3IFNlcnZlckVycm9yKHJlc3BvbnNlLnN0YXR1c1RleHQpO1xuICAgICAgICB9XG4gICAgICAgIGVycm9yLnJlc3BvbnNlID0gcmVzcG9uc2U7XG4gICAgICAgIGVycm9yLmRhdGEgPSBkYXRhO1xuICAgICAgICByZXR1cm4gT3JiaXQuUHJvbWlzZS5yZWplY3QoZXJyb3IpO1xuICAgIH1cbiAgICBoYW5kbGVGZXRjaEVycm9yKGUpIHtcbiAgICAgICAgbGV0IGVycm9yID0gbmV3IE5ldHdvcmtFcnJvcihlKTtcbiAgICAgICAgcmV0dXJuIE9yYml0LlByb21pc2UucmVqZWN0KGVycm9yKTtcbiAgICB9XG4gICAgcmVzcG9uc2VIYXNDb250ZW50KHJlc3BvbnNlKSB7XG4gICAgICAgIGxldCBjb250ZW50VHlwZSA9IHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdDb250ZW50LVR5cGUnKTtcbiAgICAgICAgcmV0dXJuIGNvbnRlbnRUeXBlICYmIGNvbnRlbnRUeXBlLmluZGV4T2YoJ2FwcGxpY2F0aW9uL3ZuZC5hcGkranNvbicpID4gLTE7XG4gICAgfVxuICAgIHJlc291cmNlTmFtZXNwYWNlKHR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubmFtZXNwYWNlO1xuICAgIH1cbiAgICByZXNvdXJjZUhvc3QodHlwZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5ob3N0O1xuICAgIH1cbiAgICByZXNvdXJjZVBhdGgodHlwZSwgaWQpIHtcbiAgICAgICAgbGV0IHBhdGggPSBbdGhpcy5zZXJpYWxpemVyLnJlc291cmNlVHlwZSh0eXBlKV07XG4gICAgICAgIGlmIChpZCkge1xuICAgICAgICAgICAgbGV0IHJlc291cmNlSWQgPSB0aGlzLnNlcmlhbGl6ZXIucmVzb3VyY2VJZCh0eXBlLCBpZCk7XG4gICAgICAgICAgICBpZiAocmVzb3VyY2VJZCkge1xuICAgICAgICAgICAgICAgIHBhdGgucHVzaChyZXNvdXJjZUlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGF0aC5qb2luKCcvJyk7XG4gICAgfVxuICAgIHJlc291cmNlVVJMKHR5cGUsIGlkKSB7XG4gICAgICAgIGxldCBob3N0ID0gdGhpcy5yZXNvdXJjZUhvc3QodHlwZSk7XG4gICAgICAgIGxldCBuYW1lc3BhY2UgPSB0aGlzLnJlc291cmNlTmFtZXNwYWNlKHR5cGUpO1xuICAgICAgICBsZXQgdXJsID0gW107XG4gICAgICAgIGlmIChob3N0KSB7XG4gICAgICAgICAgICB1cmwucHVzaChob3N0KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobmFtZXNwYWNlKSB7XG4gICAgICAgICAgICB1cmwucHVzaChuYW1lc3BhY2UpO1xuICAgICAgICB9XG4gICAgICAgIHVybC5wdXNoKHRoaXMucmVzb3VyY2VQYXRoKHR5cGUsIGlkKSk7XG4gICAgICAgIGlmICghaG9zdCkge1xuICAgICAgICAgICAgdXJsLnVuc2hpZnQoJycpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1cmwuam9pbignLycpO1xuICAgIH1cbiAgICByZXNvdXJjZVJlbGF0aW9uc2hpcFVSTCh0eXBlLCBpZCwgcmVsYXRpb25zaGlwKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlc291cmNlVVJMKHR5cGUsIGlkKSArICcvcmVsYXRpb25zaGlwcy8nICsgdGhpcy5zZXJpYWxpemVyLnJlc291cmNlUmVsYXRpb25zaGlwKHR5cGUsIHJlbGF0aW9uc2hpcCk7XG4gICAgfVxuICAgIHJlbGF0ZWRSZXNvdXJjZVVSTCh0eXBlLCBpZCwgcmVsYXRpb25zaGlwKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlc291cmNlVVJMKHR5cGUsIGlkKSArICcvJyArIHRoaXMuc2VyaWFsaXplci5yZXNvdXJjZVJlbGF0aW9uc2hpcCh0eXBlLCByZWxhdGlvbnNoaXApO1xuICAgIH1cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIC8vIFByaXZhdGUgbWV0aG9kc1xuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgaW5pdERlZmF1bHRGZXRjaFNldHRpbmdzKHNldHRpbmdzKSB7XG4gICAgICAgIHRoaXMuZGVmYXVsdEZldGNoU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgQWNjZXB0OiAnYXBwbGljYXRpb24vdm5kLmFwaStqc29uJyxcbiAgICAgICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL3ZuZC5hcGkranNvbidcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0aW1lb3V0OiA1MDAwXG4gICAgICAgIH07XG4gICAgICAgIGlmIChzZXR0aW5ncy5kZWZhdWx0RmV0Y2hIZWFkZXJzIHx8IHNldHRpbmdzLmRlZmF1bHRGZXRjaFRpbWVvdXQpIHtcbiAgICAgICAgICAgIGRlcHJlY2F0ZSgnSlNPTkFQSVNvdXJjZTogUGFzcyBgZGVmYXVsdEZldGNoU2V0dGluZ3NgIHdpdGggYGhlYWRlcnNgIGluc3RlYWQgb2YgYGRlZmF1bHRGZXRjaEhlYWRlcnNgIHRvIGluaXRpYWxpemUgc291cmNlJywgc2V0dGluZ3MuZGVmYXVsdEZldGNoSGVhZGVycyA9PT0gdW5kZWZpbmVkKTtcbiAgICAgICAgICAgIGRlcHJlY2F0ZSgnSlNPTkFQSVNvdXJjZTogUGFzcyBgZGVmYXVsdEZldGNoU2V0dGluZ3NgIHdpdGggYHRpbWVvdXRgIGluc3RlYWQgb2YgYGRlZmF1bHRGZXRjaFRpbWVvdXRgIHRvIGluaXRpYWxpemUgc291cmNlJywgc2V0dGluZ3MuZGVmYXVsdEZldGNoVGltZW91dCA9PT0gdW5kZWZpbmVkKTtcbiAgICAgICAgICAgIGRlZXBNZXJnZSh0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzLCB7XG4gICAgICAgICAgICAgICAgaGVhZGVyczogc2V0dGluZ3MuZGVmYXVsdEZldGNoSGVhZGVycyxcbiAgICAgICAgICAgICAgICB0aW1lb3V0OiBzZXR0aW5ncy5kZWZhdWx0RmV0Y2hUaW1lb3V0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2V0dGluZ3MuZGVmYXVsdEZldGNoU2V0dGluZ3MpIHtcbiAgICAgICAgICAgIGRlZXBNZXJnZSh0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzLCBzZXR0aW5ncy5kZWZhdWx0RmV0Y2hTZXR0aW5ncyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgX3Byb2Nlc3NSZXF1ZXN0cyhyZXF1ZXN0cywgcHJvY2Vzc29ycykge1xuICAgICAgICBsZXQgdHJhbnNmb3JtcyA9IFtdO1xuICAgICAgICBsZXQgcmVzdWx0ID0gT3JiaXQuUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIHJlcXVlc3RzLmZvckVhY2gocmVxdWVzdCA9PiB7XG4gICAgICAgICAgICBsZXQgcHJvY2Vzc29yID0gcHJvY2Vzc29yc1tyZXF1ZXN0Lm9wXTtcbiAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdC50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvY2Vzc29yKHRoaXMsIHJlcXVlc3QpLnRoZW4oYWRkaXRpb25hbFRyYW5zZm9ybXMgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYWRkaXRpb25hbFRyYW5zZm9ybXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KHRyYW5zZm9ybXMsIGFkZGl0aW9uYWxUcmFuc2Zvcm1zKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcmVzdWx0LnRoZW4oKCkgPT4gdHJhbnNmb3Jtcyk7XG4gICAgfVxufTtcbkpTT05BUElTb3VyY2UgPSBfX2RlY29yYXRlKFtwdWxsYWJsZSwgcHVzaGFibGUsIHF1ZXJ5YWJsZV0sIEpTT05BUElTb3VyY2UpO1xuZXhwb3J0IGRlZmF1bHQgSlNPTkFQSVNvdXJjZTsiXX0=