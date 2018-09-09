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

var __decorate = undefined && undefined.__decorate || function (decorators, target, key, desc) {
    var c = arguments.length,
        r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc,
        d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
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
let JSONAPISource = class JSONAPISource extends _data.Source {
    constructor(settings = {}) {
        (0, _utils.assert)('JSONAPISource\'s `schema` must be specified in `settings.schema` constructor argument', !!settings.schema);
        (0, _utils.assert)('JSONAPISource requires Orbit.Promise be defined', _data2.default.Promise);
        settings.name = settings.name || 'jsonapi';
        super(settings);
        this.namespace = settings.namespace;
        this.host = settings.host;
        this.initDefaultFetchSettings(settings);
        this.maxRequestsPerTransform = settings.maxRequestsPerTransform;
        const SerializerClass = settings.SerializerClass || _jsonapiSerializer2.default;
        this.serializer = new SerializerClass({ schema: settings.schema, keyMap: settings.keyMap });
    }
    get defaultFetchHeaders() {
        (0, _utils.deprecate)('JSONAPISource: Access `defaultFetchSettings.headers` instead of `defaultFetchHeaders`');
        return this.defaultFetchSettings.headers;
    }
    set defaultFetchHeaders(headers) {
        (0, _utils.deprecate)('JSONAPISource: Access `defaultFetchSettings.headers` instead of `defaultFetchHeaders`');
        this.defaultFetchSettings.headers = headers;
    }
    get defaultFetchTimeout() {
        (0, _utils.deprecate)('JSONAPISource: Access `defaultFetchSettings.timeout` instead of `defaultFetchTimeout`');
        return this.defaultFetchSettings.timeout;
    }
    set defaultFetchTimeout(timeout) {
        (0, _utils.deprecate)('JSONAPISource: Access `defaultFetchSettings.timeout` instead of `defaultFetchTimeout`');
        this.defaultFetchSettings.timeout = timeout;
    }
    /////////////////////////////////////////////////////////////////////////////
    // Pushable interface implementation
    /////////////////////////////////////////////////////////////////////////////
    _push(transform) {
        const requests = (0, _transformRequests.getTransformRequests)(this, transform);
        if (this.maxRequestsPerTransform && requests.length > this.maxRequestsPerTransform) {
            return _data2.default.Promise.resolve().then(() => {
                throw new _data.TransformNotAllowed(`This transform requires ${requests.length} requests, which exceeds the specified limit of ${this.maxRequestsPerTransform} requests per transform.`, transform);
            });
        }
        return this._processRequests(requests, _transformRequests.TransformRequestProcessors).then(transforms => {
            transforms.unshift(transform);
            return transforms;
        });
    }
    /////////////////////////////////////////////////////////////////////////////
    // Pullable interface implementation
    /////////////////////////////////////////////////////////////////////////////
    _pull(query) {
        const operator = _pullOperators.PullOperators[query.expression.op];
        if (!operator) {
            throw new Error('JSONAPISource does not support the `${query.expression.op}` operator for queries.');
        }
        return operator(this, query);
    }
    /////////////////////////////////////////////////////////////////////////////
    // Pullable interface implementation
    /////////////////////////////////////////////////////////////////////////////
    _query(query) {
        const operator = _queryOperators.QueryOperators[query.expression.op];
        if (!operator) {
            throw new Error('JSONAPISource does not support the `${query.expression.op}` operator for queries.');
        }
        return operator(this, query).then(response => {
            return this._transformed(response.transforms).then(() => response.primaryData);
        });
    }
    /////////////////////////////////////////////////////////////////////////////
    // Publicly accessible methods particular to JSONAPISource
    /////////////////////////////////////////////////////////////////////////////
    fetch(url, customSettings) {
        let settings = this.initFetchSettings(customSettings);
        let fullUrl = url;
        if (settings.params) {
            fullUrl = (0, _queryParams.appendQueryParams)(fullUrl, settings.params);
            delete settings.params;
        }
        // console.log('fetch', fullUrl, mergedSettings, 'polyfill', fetch.polyfill);
        let fetchFn = _data2.default.fetch || fetch;
        if (settings.timeout) {
            let timeout = settings.timeout;
            delete settings.timeout;
            return new _data2.default.Promise((resolve, reject) => {
                let timedOut;
                let timer = _data2.default.globals.setTimeout(() => {
                    timedOut = true;
                    reject(new _data.NetworkError(`No fetch response within ${timeout}ms.`));
                }, timeout);
                fetchFn(fullUrl, settings).catch(e => {
                    _data2.default.globals.clearTimeout(timer);
                    if (!timedOut) {
                        return this.handleFetchError(e);
                    }
                }).then(response => {
                    _data2.default.globals.clearTimeout(timer);
                    if (!timedOut) {
                        return this.handleFetchResponse(response);
                    }
                }).then(resolve, reject);
            });
        } else {
            return fetchFn(fullUrl, settings).catch(e => this.handleFetchError(e)).then(response => this.handleFetchResponse(response));
        }
    }
    initFetchSettings(customSettings = {}) {
        let settings = (0, _utils.deepMerge)({}, this.defaultFetchSettings, customSettings);
        if (settings.json) {
            (0, _utils.assert)('`json` and `body` can\'t both be set for fetch requests.', !settings.body);
            settings.body = JSON.stringify(settings.json);
            delete settings.json;
        }
        if (settings.headers && !settings.body) {
            delete settings.headers['Content-Type'];
        }
        return settings;
    }
    handleFetchResponse(response) {
        if (response.status === 201) {
            if (this.responseHasContent(response)) {
                return response.json();
            } else {
                throw new _exceptions.InvalidServerResponse(`Server responses with a ${response.status} status should return content with a Content-Type that includes 'application/vnd.api+json'.`);
            }
        } else if (response.status >= 200 && response.status < 300) {
            if (this.responseHasContent(response)) {
                return response.json();
            }
        } else {
            if (this.responseHasContent(response)) {
                return response.json().then(data => this.handleFetchResponseError(response, data));
            } else {
                return this.handleFetchResponseError(response);
            }
        }
        return _data2.default.Promise.resolve();
    }
    handleFetchResponseError(response, data) {
        let error;
        if (response.status >= 400 && response.status < 500) {
            error = new _data.ClientError(response.statusText);
        } else {
            error = new _data.ServerError(response.statusText);
        }
        error.response = response;
        error.data = data;
        return _data2.default.Promise.reject(error);
    }
    handleFetchError(e) {
        let error = new _data.NetworkError(e);
        return _data2.default.Promise.reject(error);
    }
    responseHasContent(response) {
        let contentType = response.headers.get('Content-Type');
        return contentType && contentType.indexOf('application/vnd.api+json') > -1;
    }
    resourceNamespace(type) {
        return this.namespace;
    }
    resourceHost(type) {
        return this.host;
    }
    resourcePath(type, id) {
        let path = [this.serializer.resourceType(type)];
        if (id) {
            let resourceId = this.serializer.resourceId(type, id);
            if (resourceId) {
                path.push(resourceId);
            }
        }
        return path.join('/');
    }
    resourceURL(type, id) {
        let host = this.resourceHost(type);
        let namespace = this.resourceNamespace(type);
        let url = [];
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
    }
    resourceRelationshipURL(type, id, relationship) {
        return this.resourceURL(type, id) + '/relationships/' + this.serializer.resourceRelationship(type, relationship);
    }
    relatedResourceURL(type, id, relationship) {
        return this.resourceURL(type, id) + '/' + this.serializer.resourceRelationship(type, relationship);
    }
    /////////////////////////////////////////////////////////////////////////////
    // Private methods
    /////////////////////////////////////////////////////////////////////////////
    initDefaultFetchSettings(settings) {
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
    }
    _processRequests(requests, processors) {
        let transforms = [];
        let result = _data2.default.Promise.resolve();
        requests.forEach(request => {
            let processor = processors[request.op];
            result = result.then(() => {
                return processor(this, request).then(additionalTransforms => {
                    if (additionalTransforms) {
                        Array.prototype.push.apply(transforms, additionalTransforms);
                    }
                });
            });
        });
        return result.then(() => transforms);
    }
};
JSONAPISource = __decorate([_data.pullable, _data.pushable, _data.queryable], JSONAPISource);
exports.default = JSONAPISource;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpzb25hcGktc291cmNlLmpzIl0sIm5hbWVzIjpbIl9fZGVjb3JhdGUiLCJkZWNvcmF0b3JzIiwidGFyZ2V0Iiwia2V5IiwiZGVzYyIsImMiLCJhcmd1bWVudHMiLCJsZW5ndGgiLCJyIiwiT2JqZWN0IiwiZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yIiwiZCIsIlJlZmxlY3QiLCJkZWNvcmF0ZSIsImkiLCJkZWZpbmVQcm9wZXJ0eSIsIkpTT05BUElTb3VyY2UiLCJTb3VyY2UiLCJjb25zdHJ1Y3RvciIsInNldHRpbmdzIiwic2NoZW1hIiwiT3JiaXQiLCJQcm9taXNlIiwibmFtZSIsIm5hbWVzcGFjZSIsImhvc3QiLCJpbml0RGVmYXVsdEZldGNoU2V0dGluZ3MiLCJtYXhSZXF1ZXN0c1BlclRyYW5zZm9ybSIsIlNlcmlhbGl6ZXJDbGFzcyIsIkpTT05BUElTZXJpYWxpemVyIiwic2VyaWFsaXplciIsImtleU1hcCIsImRlZmF1bHRGZXRjaEhlYWRlcnMiLCJkZWZhdWx0RmV0Y2hTZXR0aW5ncyIsImhlYWRlcnMiLCJkZWZhdWx0RmV0Y2hUaW1lb3V0IiwidGltZW91dCIsIl9wdXNoIiwidHJhbnNmb3JtIiwicmVxdWVzdHMiLCJyZXNvbHZlIiwidGhlbiIsIlRyYW5zZm9ybU5vdEFsbG93ZWQiLCJfcHJvY2Vzc1JlcXVlc3RzIiwiVHJhbnNmb3JtUmVxdWVzdFByb2Nlc3NvcnMiLCJ0cmFuc2Zvcm1zIiwidW5zaGlmdCIsIl9wdWxsIiwicXVlcnkiLCJvcGVyYXRvciIsIlB1bGxPcGVyYXRvcnMiLCJleHByZXNzaW9uIiwib3AiLCJFcnJvciIsIl9xdWVyeSIsIlF1ZXJ5T3BlcmF0b3JzIiwicmVzcG9uc2UiLCJfdHJhbnNmb3JtZWQiLCJwcmltYXJ5RGF0YSIsImZldGNoIiwidXJsIiwiY3VzdG9tU2V0dGluZ3MiLCJpbml0RmV0Y2hTZXR0aW5ncyIsImZ1bGxVcmwiLCJwYXJhbXMiLCJmZXRjaEZuIiwicmVqZWN0IiwidGltZWRPdXQiLCJ0aW1lciIsImdsb2JhbHMiLCJzZXRUaW1lb3V0IiwiTmV0d29ya0Vycm9yIiwiY2F0Y2giLCJlIiwiY2xlYXJUaW1lb3V0IiwiaGFuZGxlRmV0Y2hFcnJvciIsImhhbmRsZUZldGNoUmVzcG9uc2UiLCJqc29uIiwiYm9keSIsIkpTT04iLCJzdHJpbmdpZnkiLCJzdGF0dXMiLCJyZXNwb25zZUhhc0NvbnRlbnQiLCJJbnZhbGlkU2VydmVyUmVzcG9uc2UiLCJkYXRhIiwiaGFuZGxlRmV0Y2hSZXNwb25zZUVycm9yIiwiZXJyb3IiLCJDbGllbnRFcnJvciIsInN0YXR1c1RleHQiLCJTZXJ2ZXJFcnJvciIsImNvbnRlbnRUeXBlIiwiZ2V0IiwiaW5kZXhPZiIsInJlc291cmNlTmFtZXNwYWNlIiwidHlwZSIsInJlc291cmNlSG9zdCIsInJlc291cmNlUGF0aCIsImlkIiwicGF0aCIsInJlc291cmNlVHlwZSIsInJlc291cmNlSWQiLCJwdXNoIiwiam9pbiIsInJlc291cmNlVVJMIiwicmVzb3VyY2VSZWxhdGlvbnNoaXBVUkwiLCJyZWxhdGlvbnNoaXAiLCJyZXNvdXJjZVJlbGF0aW9uc2hpcCIsInJlbGF0ZWRSZXNvdXJjZVVSTCIsIkFjY2VwdCIsInVuZGVmaW5lZCIsInByb2Nlc3NvcnMiLCJyZXN1bHQiLCJmb3JFYWNoIiwicmVxdWVzdCIsInByb2Nlc3NvciIsImFkZGl0aW9uYWxUcmFuc2Zvcm1zIiwiQXJyYXkiLCJwcm90b3R5cGUiLCJhcHBseSIsInB1bGxhYmxlIiwicHVzaGFibGUiLCJxdWVyeWFibGUiXSwibWFwcGluZ3MiOiI7Ozs7OztBQVFBOzs7O0FBQ0E7O0FBQ0E7Ozs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7OztBQWZBLElBQUlBLGFBQWEsYUFBUSxVQUFLQSxVQUFiLElBQTJCLFVBQVVDLFVBQVYsRUFBc0JDLE1BQXRCLEVBQThCQyxHQUE5QixFQUFtQ0MsSUFBbkMsRUFBeUM7QUFDakYsUUFBSUMsSUFBSUMsVUFBVUMsTUFBbEI7QUFBQSxRQUNJQyxJQUFJSCxJQUFJLENBQUos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O0FBQ25DLFlBQUlqRSxhQUFhLEVBQWpCO0FBQ0EsWUFBSWtFLFNBQVMxRixlQUFNQyxPQUFOLENBQWNrQixPQUFkLEVBQWI7QUFDQUQsaUJBQVN5RSxPQUFULENBQWlCQyxXQUFXO0FBQ3hCLGdCQUFJQyxZQUFZSixXQUFXRyxRQUFRN0QsRUFBbkIsQ0FBaEI7QUFDQTJELHFCQUFTQSxPQUFPdEUsSUFBUCxDQUFZLE1BQU07QUFDdkIsdUJBQU95RSxVQUFVLElBQVYsRUFBZ0JELE9BQWhCLEVBQXlCeEUsSUFBekIsQ0FBOEIwRSx3QkFBd0I7QUFDekQsd0JBQUlBLG9CQUFKLEVBQTBCO0FBQ3RCQyw4QkFBTUMsU0FBTixDQUFnQmhCLElBQWhCLENBQXFCaUIsS0FBckIsQ0FBMkJ6RSxVQUEzQixFQUF1Q3NFLG9CQUF2QztBQUNIO0FBQ0osaUJBSk0sQ0FBUDtBQUtILGFBTlEsQ0FBVDtBQU9ILFNBVEQ7QUFVQSxlQUFPSixPQUFPdEUsSUFBUCxDQUFZLE1BQU1JLFVBQWxCLENBQVA7QUFDSDtBQXJPa0QsQ0FBdkQ7QUF1T0E3QixnQkFBZ0JoQixXQUFXLENBQUN1SCxjQUFELEVBQVdDLGNBQVgsRUFBcUJDLGVBQXJCLENBQVgsRUFBNEN6RyxhQUE1QyxDQUFoQjtrQkFDZUEsYSIsImZpbGUiOiJqc29uYXBpLXNvdXJjZS5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBfX2RlY29yYXRlID0gdGhpcyAmJiB0aGlzLl9fZGVjb3JhdGUgfHwgZnVuY3Rpb24gKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLFxuICAgICAgICByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYyxcbiAgICAgICAgZDtcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QuZGVjb3JhdGUgPT09IFwiZnVuY3Rpb25cIikgciA9IFJlZmxlY3QuZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpO2Vsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcbn07XG4vKiBlc2xpbnQtZGlzYWJsZSB2YWxpZC1qc2RvYyAqL1xuaW1wb3J0IE9yYml0LCB7IFNvdXJjZSwgcHVsbGFibGUsIHB1c2hhYmxlLCBUcmFuc2Zvcm1Ob3RBbGxvd2VkLCBDbGllbnRFcnJvciwgU2VydmVyRXJyb3IsIE5ldHdvcmtFcnJvciwgcXVlcnlhYmxlIH0gZnJvbSAnQG9yYml0L2RhdGEnO1xuaW1wb3J0IHsgYXNzZXJ0LCBkZWVwTWVyZ2UsIGRlcHJlY2F0ZSB9IGZyb20gJ0BvcmJpdC91dGlscyc7XG5pbXBvcnQgSlNPTkFQSVNlcmlhbGl6ZXIgZnJvbSAnLi9qc29uYXBpLXNlcmlhbGl6ZXInO1xuaW1wb3J0IHsgYXBwZW5kUXVlcnlQYXJhbXMgfSBmcm9tICcuL2xpYi9xdWVyeS1wYXJhbXMnO1xuaW1wb3J0IHsgUHVsbE9wZXJhdG9ycyB9IGZyb20gJy4vbGliL3B1bGwtb3BlcmF0b3JzJztcbmltcG9ydCB7IGdldFRyYW5zZm9ybVJlcXVlc3RzLCBUcmFuc2Zvcm1SZXF1ZXN0UHJvY2Vzc29ycyB9IGZyb20gJy4vbGliL3RyYW5zZm9ybS1yZXF1ZXN0cyc7XG5pbXBvcnQgeyBJbnZhbGlkU2VydmVyUmVzcG9uc2UgfSBmcm9tICcuL2xpYi9leGNlcHRpb25zJztcbmltcG9ydCB7IFF1ZXJ5T3BlcmF0b3JzIH0gZnJvbSBcIi4vbGliL3F1ZXJ5LW9wZXJhdG9yc1wiO1xuLyoqXG4gU291cmNlIGZvciBhY2Nlc3NpbmcgYSBKU09OIEFQSSBjb21wbGlhbnQgUkVTVGZ1bCBBUEkgd2l0aCBhIG5ldHdvcmsgZmV0Y2hcbiByZXF1ZXN0LlxuXG4gSWYgYSBzaW5nbGUgdHJhbnNmb3JtIG9yIHF1ZXJ5IHJlcXVpcmVzIG1vcmUgdGhhbiBvbmUgZmV0Y2ggcmVxdWVzdCxcbiByZXF1ZXN0cyB3aWxsIGJlIHBlcmZvcm1lZCBzZXF1ZW50aWFsbHkgYW5kIHJlc29sdmVkIHRvZ2V0aGVyLiBGcm9tIHRoZVxuIHBlcnNwZWN0aXZlIG9mIE9yYml0LCB0aGVzZSBvcGVyYXRpb25zIHdpbGwgYWxsIHN1Y2NlZWQgb3IgZmFpbCB0b2dldGhlci4gVGhlXG4gYG1heFJlcXVlc3RzUGVyVHJhbnNmb3JtYCBhbmQgYG1heFJlcXVlc3RzUGVyUXVlcnlgIHNldHRpbmdzIGFsbG93IGxpbWl0cyB0byBiZVxuIHNldCBvbiB0aGlzIGJlaGF2aW9yLiBUaGVzZSBzZXR0aW5ncyBzaG91bGQgYmUgc2V0IHRvIGAxYCBpZiB5b3VyIGNsaWVudC9zZXJ2ZXJcbiBjb25maWd1cmF0aW9uIGlzIHVuYWJsZSB0byByZXNvbHZlIHBhcnRpYWxseSBzdWNjZXNzZnVsIHRyYW5zZm9ybXMgLyBxdWVyaWVzLlxuXG4gQGNsYXNzIEpTT05BUElTb3VyY2VcbiBAZXh0ZW5kcyBTb3VyY2VcbiAqL1xubGV0IEpTT05BUElTb3VyY2UgPSBjbGFzcyBKU09OQVBJU291cmNlIGV4dGVuZHMgU291cmNlIHtcbiAgICBjb25zdHJ1Y3RvcihzZXR0aW5ncyA9IHt9KSB7XG4gICAgICAgIGFzc2VydCgnSlNPTkFQSVNvdXJjZVxcJ3MgYHNjaGVtYWAgbXVzdCBiZSBzcGVjaWZpZWQgaW4gYHNldHRpbmdzLnNjaGVtYWAgY29uc3RydWN0b3IgYXJndW1lbnQnLCAhIXNldHRpbmdzLnNjaGVtYSk7XG4gICAgICAgIGFzc2VydCgnSlNPTkFQSVNvdXJjZSByZXF1aXJlcyBPcmJpdC5Qcm9taXNlIGJlIGRlZmluZWQnLCBPcmJpdC5Qcm9taXNlKTtcbiAgICAgICAgc2V0dGluZ3MubmFtZSA9IHNldHRpbmdzLm5hbWUgfHwgJ2pzb25hcGknO1xuICAgICAgICBzdXBlcihzZXR0aW5ncyk7XG4gICAgICAgIHRoaXMubmFtZXNwYWNlID0gc2V0dGluZ3MubmFtZXNwYWNlO1xuICAgICAgICB0aGlzLmhvc3QgPSBzZXR0aW5ncy5ob3N0O1xuICAgICAgICB0aGlzLmluaXREZWZhdWx0RmV0Y2hTZXR0aW5ncyhzZXR0aW5ncyk7XG4gICAgICAgIHRoaXMubWF4UmVxdWVzdHNQZXJUcmFuc2Zvcm0gPSBzZXR0aW5ncy5tYXhSZXF1ZXN0c1BlclRyYW5zZm9ybTtcbiAgICAgICAgY29uc3QgU2VyaWFsaXplckNsYXNzID0gc2V0dGluZ3MuU2VyaWFsaXplckNsYXNzIHx8IEpTT05BUElTZXJpYWxpemVyO1xuICAgICAgICB0aGlzLnNlcmlhbGl6ZXIgPSBuZXcgU2VyaWFsaXplckNsYXNzKHsgc2NoZW1hOiBzZXR0aW5ncy5zY2hlbWEsIGtleU1hcDogc2V0dGluZ3Mua2V5TWFwIH0pO1xuICAgIH1cbiAgICBnZXQgZGVmYXVsdEZldGNoSGVhZGVycygpIHtcbiAgICAgICAgZGVwcmVjYXRlKCdKU09OQVBJU291cmNlOiBBY2Nlc3MgYGRlZmF1bHRGZXRjaFNldHRpbmdzLmhlYWRlcnNgIGluc3RlYWQgb2YgYGRlZmF1bHRGZXRjaEhlYWRlcnNgJyk7XG4gICAgICAgIHJldHVybiB0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzLmhlYWRlcnM7XG4gICAgfVxuICAgIHNldCBkZWZhdWx0RmV0Y2hIZWFkZXJzKGhlYWRlcnMpIHtcbiAgICAgICAgZGVwcmVjYXRlKCdKU09OQVBJU291cmNlOiBBY2Nlc3MgYGRlZmF1bHRGZXRjaFNldHRpbmdzLmhlYWRlcnNgIGluc3RlYWQgb2YgYGRlZmF1bHRGZXRjaEhlYWRlcnNgJyk7XG4gICAgICAgIHRoaXMuZGVmYXVsdEZldGNoU2V0dGluZ3MuaGVhZGVycyA9IGhlYWRlcnM7XG4gICAgfVxuICAgIGdldCBkZWZhdWx0RmV0Y2hUaW1lb3V0KCkge1xuICAgICAgICBkZXByZWNhdGUoJ0pTT05BUElTb3VyY2U6IEFjY2VzcyBgZGVmYXVsdEZldGNoU2V0dGluZ3MudGltZW91dGAgaW5zdGVhZCBvZiBgZGVmYXVsdEZldGNoVGltZW91dGAnKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGVmYXVsdEZldGNoU2V0dGluZ3MudGltZW91dDtcbiAgICB9XG4gICAgc2V0IGRlZmF1bHRGZXRjaFRpbWVvdXQodGltZW91dCkge1xuICAgICAgICBkZXByZWNhdGUoJ0pTT05BUElTb3VyY2U6IEFjY2VzcyBgZGVmYXVsdEZldGNoU2V0dGluZ3MudGltZW91dGAgaW5zdGVhZCBvZiBgZGVmYXVsdEZldGNoVGltZW91dGAnKTtcbiAgICAgICAgdGhpcy5kZWZhdWx0RmV0Y2hTZXR0aW5ncy50aW1lb3V0ID0gdGltZW91dDtcbiAgICB9XG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBQdXNoYWJsZSBpbnRlcmZhY2UgaW1wbGVtZW50YXRpb25cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIF9wdXNoKHRyYW5zZm9ybSkge1xuICAgICAgICBjb25zdCByZXF1ZXN0cyA9IGdldFRyYW5zZm9ybVJlcXVlc3RzKHRoaXMsIHRyYW5zZm9ybSk7XG4gICAgICAgIGlmICh0aGlzLm1heFJlcXVlc3RzUGVyVHJhbnNmb3JtICYmIHJlcXVlc3RzLmxlbmd0aCA+IHRoaXMubWF4UmVxdWVzdHNQZXJUcmFuc2Zvcm0pIHtcbiAgICAgICAgICAgIHJldHVybiBPcmJpdC5Qcm9taXNlLnJlc29sdmUoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHJhbnNmb3JtTm90QWxsb3dlZChgVGhpcyB0cmFuc2Zvcm0gcmVxdWlyZXMgJHtyZXF1ZXN0cy5sZW5ndGh9IHJlcXVlc3RzLCB3aGljaCBleGNlZWRzIHRoZSBzcGVjaWZpZWQgbGltaXQgb2YgJHt0aGlzLm1heFJlcXVlc3RzUGVyVHJhbnNmb3JtfSByZXF1ZXN0cyBwZXIgdHJhbnNmb3JtLmAsIHRyYW5zZm9ybSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fcHJvY2Vzc1JlcXVlc3RzKHJlcXVlc3RzLCBUcmFuc2Zvcm1SZXF1ZXN0UHJvY2Vzc29ycykudGhlbih0cmFuc2Zvcm1zID0+IHtcbiAgICAgICAgICAgIHRyYW5zZm9ybXMudW5zaGlmdCh0cmFuc2Zvcm0pO1xuICAgICAgICAgICAgcmV0dXJuIHRyYW5zZm9ybXM7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIC8vIFB1bGxhYmxlIGludGVyZmFjZSBpbXBsZW1lbnRhdGlvblxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgX3B1bGwocXVlcnkpIHtcbiAgICAgICAgY29uc3Qgb3BlcmF0b3IgPSBQdWxsT3BlcmF0b3JzW3F1ZXJ5LmV4cHJlc3Npb24ub3BdO1xuICAgICAgICBpZiAoIW9wZXJhdG9yKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0pTT05BUElTb3VyY2UgZG9lcyBub3Qgc3VwcG9ydCB0aGUgYCR7cXVlcnkuZXhwcmVzc2lvbi5vcH1gIG9wZXJhdG9yIGZvciBxdWVyaWVzLicpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvcGVyYXRvcih0aGlzLCBxdWVyeSk7XG4gICAgfVxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgLy8gUHVsbGFibGUgaW50ZXJmYWNlIGltcGxlbWVudGF0aW9uXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICBfcXVlcnkocXVlcnkpIHtcbiAgICAgICAgY29uc3Qgb3BlcmF0b3IgPSBRdWVyeU9wZXJhdG9yc1txdWVyeS5leHByZXNzaW9uLm9wXTtcbiAgICAgICAgaWYgKCFvcGVyYXRvcikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdKU09OQVBJU291cmNlIGRvZXMgbm90IHN1cHBvcnQgdGhlIGAke3F1ZXJ5LmV4cHJlc3Npb24ub3B9YCBvcGVyYXRvciBmb3IgcXVlcmllcy4nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3BlcmF0b3IodGhpcywgcXVlcnkpLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3RyYW5zZm9ybWVkKHJlc3BvbnNlLnRyYW5zZm9ybXMpLnRoZW4oKCkgPT4gcmVzcG9uc2UucHJpbWFyeURhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBQdWJsaWNseSBhY2Nlc3NpYmxlIG1ldGhvZHMgcGFydGljdWxhciB0byBKU09OQVBJU291cmNlXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICBmZXRjaCh1cmwsIGN1c3RvbVNldHRpbmdzKSB7XG4gICAgICAgIGxldCBzZXR0aW5ncyA9IHRoaXMuaW5pdEZldGNoU2V0dGluZ3MoY3VzdG9tU2V0dGluZ3MpO1xuICAgICAgICBsZXQgZnVsbFVybCA9IHVybDtcbiAgICAgICAgaWYgKHNldHRpbmdzLnBhcmFtcykge1xuICAgICAgICAgICAgZnVsbFVybCA9IGFwcGVuZFF1ZXJ5UGFyYW1zKGZ1bGxVcmwsIHNldHRpbmdzLnBhcmFtcyk7XG4gICAgICAgICAgICBkZWxldGUgc2V0dGluZ3MucGFyYW1zO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdmZXRjaCcsIGZ1bGxVcmwsIG1lcmdlZFNldHRpbmdzLCAncG9seWZpbGwnLCBmZXRjaC5wb2x5ZmlsbCk7XG4gICAgICAgIGxldCBmZXRjaEZuID0gT3JiaXQuZmV0Y2ggfHwgZmV0Y2g7XG4gICAgICAgIGlmIChzZXR0aW5ncy50aW1lb3V0KSB7XG4gICAgICAgICAgICBsZXQgdGltZW91dCA9IHNldHRpbmdzLnRpbWVvdXQ7XG4gICAgICAgICAgICBkZWxldGUgc2V0dGluZ3MudGltZW91dDtcbiAgICAgICAgICAgIHJldHVybiBuZXcgT3JiaXQuUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHRpbWVkT3V0O1xuICAgICAgICAgICAgICAgIGxldCB0aW1lciA9IE9yYml0Lmdsb2JhbHMuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRpbWVkT3V0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBOZXR3b3JrRXJyb3IoYE5vIGZldGNoIHJlc3BvbnNlIHdpdGhpbiAke3RpbWVvdXR9bXMuYCkpO1xuICAgICAgICAgICAgICAgIH0sIHRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIGZldGNoRm4oZnVsbFVybCwgc2V0dGluZ3MpLmNhdGNoKGUgPT4ge1xuICAgICAgICAgICAgICAgICAgICBPcmJpdC5nbG9iYWxzLmNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGltZWRPdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZUZldGNoRXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KS50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgT3JiaXQuZ2xvYmFscy5jbGVhclRpbWVvdXQodGltZXIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXRpbWVkT3V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVGZXRjaFJlc3BvbnNlKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZldGNoRm4oZnVsbFVybCwgc2V0dGluZ3MpLmNhdGNoKGUgPT4gdGhpcy5oYW5kbGVGZXRjaEVycm9yKGUpKS50aGVuKHJlc3BvbnNlID0+IHRoaXMuaGFuZGxlRmV0Y2hSZXNwb25zZShyZXNwb25zZSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGluaXRGZXRjaFNldHRpbmdzKGN1c3RvbVNldHRpbmdzID0ge30pIHtcbiAgICAgICAgbGV0IHNldHRpbmdzID0gZGVlcE1lcmdlKHt9LCB0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzLCBjdXN0b21TZXR0aW5ncyk7XG4gICAgICAgIGlmIChzZXR0aW5ncy5qc29uKSB7XG4gICAgICAgICAgICBhc3NlcnQoJ2Bqc29uYCBhbmQgYGJvZHlgIGNhblxcJ3QgYm90aCBiZSBzZXQgZm9yIGZldGNoIHJlcXVlc3RzLicsICFzZXR0aW5ncy5ib2R5KTtcbiAgICAgICAgICAgIHNldHRpbmdzLmJvZHkgPSBKU09OLnN0cmluZ2lmeShzZXR0aW5ncy5qc29uKTtcbiAgICAgICAgICAgIGRlbGV0ZSBzZXR0aW5ncy5qc29uO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzZXR0aW5ncy5oZWFkZXJzICYmICFzZXR0aW5ncy5ib2R5KSB7XG4gICAgICAgICAgICBkZWxldGUgc2V0dGluZ3MuaGVhZGVyc1snQ29udGVudC1UeXBlJ107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNldHRpbmdzO1xuICAgIH1cbiAgICBoYW5kbGVGZXRjaFJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDIwMSkge1xuICAgICAgICAgICAgaWYgKHRoaXMucmVzcG9uc2VIYXNDb250ZW50KHJlc3BvbnNlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBJbnZhbGlkU2VydmVyUmVzcG9uc2UoYFNlcnZlciByZXNwb25zZXMgd2l0aCBhICR7cmVzcG9uc2Uuc3RhdHVzfSBzdGF0dXMgc2hvdWxkIHJldHVybiBjb250ZW50IHdpdGggYSBDb250ZW50LVR5cGUgdGhhdCBpbmNsdWRlcyAnYXBwbGljYXRpb24vdm5kLmFwaStqc29uJy5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5zdGF0dXMgPj0gMjAwICYmIHJlc3BvbnNlLnN0YXR1cyA8IDMwMCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucmVzcG9uc2VIYXNDb250ZW50KHJlc3BvbnNlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodGhpcy5yZXNwb25zZUhhc0NvbnRlbnQocmVzcG9uc2UpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKS50aGVuKGRhdGEgPT4gdGhpcy5oYW5kbGVGZXRjaFJlc3BvbnNlRXJyb3IocmVzcG9uc2UsIGRhdGEpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlRmV0Y2hSZXNwb25zZUVycm9yKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gT3JiaXQuUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuICAgIGhhbmRsZUZldGNoUmVzcG9uc2VFcnJvcihyZXNwb25zZSwgZGF0YSkge1xuICAgICAgICBsZXQgZXJyb3I7XG4gICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPj0gNDAwICYmIHJlc3BvbnNlLnN0YXR1cyA8IDUwMCkge1xuICAgICAgICAgICAgZXJyb3IgPSBuZXcgQ2xpZW50RXJyb3IocmVzcG9uc2Uuc3RhdHVzVGV4dCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlcnJvciA9IG5ldyBTZXJ2ZXJFcnJvcihyZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBlcnJvci5yZXNwb25zZSA9IHJlc3BvbnNlO1xuICAgICAgICBlcnJvci5kYXRhID0gZGF0YTtcbiAgICAgICAgcmV0dXJuIE9yYml0LlByb21pc2UucmVqZWN0KGVycm9yKTtcbiAgICB9XG4gICAgaGFuZGxlRmV0Y2hFcnJvcihlKSB7XG4gICAgICAgIGxldCBlcnJvciA9IG5ldyBOZXR3b3JrRXJyb3IoZSk7XG4gICAgICAgIHJldHVybiBPcmJpdC5Qcm9taXNlLnJlamVjdChlcnJvcik7XG4gICAgfVxuICAgIHJlc3BvbnNlSGFzQ29udGVudChyZXNwb25zZSkge1xuICAgICAgICBsZXQgY29udGVudFR5cGUgPSByZXNwb25zZS5oZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJyk7XG4gICAgICAgIHJldHVybiBjb250ZW50VHlwZSAmJiBjb250ZW50VHlwZS5pbmRleE9mKCdhcHBsaWNhdGlvbi92bmQuYXBpK2pzb24nKSA+IC0xO1xuICAgIH1cbiAgICByZXNvdXJjZU5hbWVzcGFjZSh0eXBlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm5hbWVzcGFjZTtcbiAgICB9XG4gICAgcmVzb3VyY2VIb3N0KHR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaG9zdDtcbiAgICB9XG4gICAgcmVzb3VyY2VQYXRoKHR5cGUsIGlkKSB7XG4gICAgICAgIGxldCBwYXRoID0gW3RoaXMuc2VyaWFsaXplci5yZXNvdXJjZVR5cGUodHlwZSldO1xuICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgIGxldCByZXNvdXJjZUlkID0gdGhpcy5zZXJpYWxpemVyLnJlc291cmNlSWQodHlwZSwgaWQpO1xuICAgICAgICAgICAgaWYgKHJlc291cmNlSWQpIHtcbiAgICAgICAgICAgICAgICBwYXRoLnB1c2gocmVzb3VyY2VJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhdGguam9pbignLycpO1xuICAgIH1cbiAgICByZXNvdXJjZVVSTCh0eXBlLCBpZCkge1xuICAgICAgICBsZXQgaG9zdCA9IHRoaXMucmVzb3VyY2VIb3N0KHR5cGUpO1xuICAgICAgICBsZXQgbmFtZXNwYWNlID0gdGhpcy5yZXNvdXJjZU5hbWVzcGFjZSh0eXBlKTtcbiAgICAgICAgbGV0IHVybCA9IFtdO1xuICAgICAgICBpZiAoaG9zdCkge1xuICAgICAgICAgICAgdXJsLnB1c2goaG9zdCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5hbWVzcGFjZSkge1xuICAgICAgICAgICAgdXJsLnB1c2gobmFtZXNwYWNlKTtcbiAgICAgICAgfVxuICAgICAgICB1cmwucHVzaCh0aGlzLnJlc291cmNlUGF0aCh0eXBlLCBpZCkpO1xuICAgICAgICBpZiAoIWhvc3QpIHtcbiAgICAgICAgICAgIHVybC51bnNoaWZ0KCcnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXJsLmpvaW4oJy8nKTtcbiAgICB9XG4gICAgcmVzb3VyY2VSZWxhdGlvbnNoaXBVUkwodHlwZSwgaWQsIHJlbGF0aW9uc2hpcCkge1xuICAgICAgICByZXR1cm4gdGhpcy5yZXNvdXJjZVVSTCh0eXBlLCBpZCkgKyAnL3JlbGF0aW9uc2hpcHMvJyArIHRoaXMuc2VyaWFsaXplci5yZXNvdXJjZVJlbGF0aW9uc2hpcCh0eXBlLCByZWxhdGlvbnNoaXApO1xuICAgIH1cbiAgICByZWxhdGVkUmVzb3VyY2VVUkwodHlwZSwgaWQsIHJlbGF0aW9uc2hpcCkge1xuICAgICAgICByZXR1cm4gdGhpcy5yZXNvdXJjZVVSTCh0eXBlLCBpZCkgKyAnLycgKyB0aGlzLnNlcmlhbGl6ZXIucmVzb3VyY2VSZWxhdGlvbnNoaXAodHlwZSwgcmVsYXRpb25zaGlwKTtcbiAgICB9XG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBQcml2YXRlIG1ldGhvZHNcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIGluaXREZWZhdWx0RmV0Y2hTZXR0aW5ncyhzZXR0aW5ncykge1xuICAgICAgICB0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzID0ge1xuICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgIEFjY2VwdDogJ2FwcGxpY2F0aW9uL3ZuZC5hcGkranNvbicsXG4gICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi92bmQuYXBpK2pzb24nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGltZW91dDogNTAwMFxuICAgICAgICB9O1xuICAgICAgICBpZiAoc2V0dGluZ3MuZGVmYXVsdEZldGNoSGVhZGVycyB8fCBzZXR0aW5ncy5kZWZhdWx0RmV0Y2hUaW1lb3V0KSB7XG4gICAgICAgICAgICBkZXByZWNhdGUoJ0pTT05BUElTb3VyY2U6IFBhc3MgYGRlZmF1bHRGZXRjaFNldHRpbmdzYCB3aXRoIGBoZWFkZXJzYCBpbnN0ZWFkIG9mIGBkZWZhdWx0RmV0Y2hIZWFkZXJzYCB0byBpbml0aWFsaXplIHNvdXJjZScsIHNldHRpbmdzLmRlZmF1bHRGZXRjaEhlYWRlcnMgPT09IHVuZGVmaW5lZCk7XG4gICAgICAgICAgICBkZXByZWNhdGUoJ0pTT05BUElTb3VyY2U6IFBhc3MgYGRlZmF1bHRGZXRjaFNldHRpbmdzYCB3aXRoIGB0aW1lb3V0YCBpbnN0ZWFkIG9mIGBkZWZhdWx0RmV0Y2hUaW1lb3V0YCB0byBpbml0aWFsaXplIHNvdXJjZScsIHNldHRpbmdzLmRlZmF1bHRGZXRjaFRpbWVvdXQgPT09IHVuZGVmaW5lZCk7XG4gICAgICAgICAgICBkZWVwTWVyZ2UodGhpcy5kZWZhdWx0RmV0Y2hTZXR0aW5ncywge1xuICAgICAgICAgICAgICAgIGhlYWRlcnM6IHNldHRpbmdzLmRlZmF1bHRGZXRjaEhlYWRlcnMsXG4gICAgICAgICAgICAgICAgdGltZW91dDogc2V0dGluZ3MuZGVmYXVsdEZldGNoVGltZW91dFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNldHRpbmdzLmRlZmF1bHRGZXRjaFNldHRpbmdzKSB7XG4gICAgICAgICAgICBkZWVwTWVyZ2UodGhpcy5kZWZhdWx0RmV0Y2hTZXR0aW5ncywgc2V0dGluZ3MuZGVmYXVsdEZldGNoU2V0dGluZ3MpO1xuICAgICAgICB9XG4gICAgfVxuICAgIF9wcm9jZXNzUmVxdWVzdHMocmVxdWVzdHMsIHByb2Nlc3NvcnMpIHtcbiAgICAgICAgbGV0IHRyYW5zZm9ybXMgPSBbXTtcbiAgICAgICAgbGV0IHJlc3VsdCA9IE9yYml0LlByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICByZXF1ZXN0cy5mb3JFYWNoKHJlcXVlc3QgPT4ge1xuICAgICAgICAgICAgbGV0IHByb2Nlc3NvciA9IHByb2Nlc3NvcnNbcmVxdWVzdC5vcF07XG4gICAgICAgICAgICByZXN1bHQgPSByZXN1bHQudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb2Nlc3Nvcih0aGlzLCByZXF1ZXN0KS50aGVuKGFkZGl0aW9uYWxUcmFuc2Zvcm1zID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFkZGl0aW9uYWxUcmFuc2Zvcm1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseSh0cmFuc2Zvcm1zLCBhZGRpdGlvbmFsVHJhbnNmb3Jtcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdC50aGVuKCgpID0+IHRyYW5zZm9ybXMpO1xuICAgIH1cbn07XG5KU09OQVBJU291cmNlID0gX19kZWNvcmF0ZShbcHVsbGFibGUsIHB1c2hhYmxlLCBxdWVyeWFibGVdLCBKU09OQVBJU291cmNlKTtcbmV4cG9ydCBkZWZhdWx0IEpTT05BUElTb3VyY2U7Il19