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
        (0, _utils.assert)('JSONAPISource requires Orbit.fetch be defined', _data2.default.fetch || fetch);
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
        return operator(this, query);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpzb25hcGktc291cmNlLmpzIl0sIm5hbWVzIjpbIl9fZGVjb3JhdGUiLCJkZWNvcmF0b3JzIiwidGFyZ2V0Iiwia2V5IiwiZGVzYyIsImMiLCJhcmd1bWVudHMiLCJsZW5ndGgiLCJyIiwiT2JqZWN0IiwiZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yIiwiZCIsIlJlZmxlY3QiLCJkZWNvcmF0ZSIsImkiLCJkZWZpbmVQcm9wZXJ0eSIsIkpTT05BUElTb3VyY2UiLCJTb3VyY2UiLCJjb25zdHJ1Y3RvciIsInNldHRpbmdzIiwic2NoZW1hIiwiT3JiaXQiLCJQcm9taXNlIiwiZmV0Y2giLCJuYW1lIiwibmFtZXNwYWNlIiwiaG9zdCIsImluaXREZWZhdWx0RmV0Y2hTZXR0aW5ncyIsIm1heFJlcXVlc3RzUGVyVHJhbnNmb3JtIiwiU2VyaWFsaXplckNsYXNzIiwiSlNPTkFQSVNlcmlhbGl6ZXIiLCJzZXJpYWxpemVyIiwia2V5TWFwIiwiZGVmYXVsdEZldGNoSGVhZGVycyIsImRlZmF1bHRGZXRjaFNldHRpbmdzIiwiaGVhZGVycyIsImRlZmF1bHRGZXRjaFRpbWVvdXQiLCJ0aW1lb3V0IiwiX3B1c2giLCJ0cmFuc2Zvcm0iLCJyZXF1ZXN0cyIsInJlc29sdmUiLCJ0aGVuIiwiVHJhbnNmb3JtTm90QWxsb3dlZCIsIl9wcm9jZXNzUmVxdWVzdHMiLCJUcmFuc2Zvcm1SZXF1ZXN0UHJvY2Vzc29ycyIsInRyYW5zZm9ybXMiLCJ1bnNoaWZ0IiwiX3B1bGwiLCJxdWVyeSIsIm9wZXJhdG9yIiwiUHVsbE9wZXJhdG9ycyIsImV4cHJlc3Npb24iLCJvcCIsIkVycm9yIiwiX3F1ZXJ5IiwiUXVlcnlPcGVyYXRvcnMiLCJ1cmwiLCJjdXN0b21TZXR0aW5ncyIsImluaXRGZXRjaFNldHRpbmdzIiwiZnVsbFVybCIsInBhcmFtcyIsImZldGNoRm4iLCJyZWplY3QiLCJ0aW1lZE91dCIsInRpbWVyIiwiZ2xvYmFscyIsInNldFRpbWVvdXQiLCJOZXR3b3JrRXJyb3IiLCJjYXRjaCIsImUiLCJjbGVhclRpbWVvdXQiLCJoYW5kbGVGZXRjaEVycm9yIiwicmVzcG9uc2UiLCJoYW5kbGVGZXRjaFJlc3BvbnNlIiwianNvbiIsImJvZHkiLCJKU09OIiwic3RyaW5naWZ5Iiwic3RhdHVzIiwicmVzcG9uc2VIYXNDb250ZW50IiwiSW52YWxpZFNlcnZlclJlc3BvbnNlIiwiZGF0YSIsImhhbmRsZUZldGNoUmVzcG9uc2VFcnJvciIsImVycm9yIiwiQ2xpZW50RXJyb3IiLCJzdGF0dXNUZXh0IiwiU2VydmVyRXJyb3IiLCJjb250ZW50VHlwZSIsImdldCIsImluZGV4T2YiLCJyZXNvdXJjZU5hbWVzcGFjZSIsInR5cGUiLCJyZXNvdXJjZUhvc3QiLCJyZXNvdXJjZVBhdGgiLCJpZCIsInBhdGgiLCJyZXNvdXJjZVR5cGUiLCJyZXNvdXJjZUlkIiwicHVzaCIsImpvaW4iLCJyZXNvdXJjZVVSTCIsInJlc291cmNlUmVsYXRpb25zaGlwVVJMIiwicmVsYXRpb25zaGlwIiwicmVzb3VyY2VSZWxhdGlvbnNoaXAiLCJyZWxhdGVkUmVzb3VyY2VVUkwiLCJBY2NlcHQiLCJ1bmRlZmluZWQiLCJwcm9jZXNzb3JzIiwicmVzdWx0IiwiZm9yRWFjaCIsInJlcXVlc3QiLCJwcm9jZXNzb3IiLCJhZGRpdGlvbmFsVHJhbnNmb3JtcyIsIkFycmF5IiwicHJvdG90eXBlIiwiYXBwbHkiLCJwdWxsYWJsZSIsInB1c2hhYmxlIiwicXVlcnlhYmxlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFRQTs7OztBQUNBOztBQUNBOzs7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7Ozs7QUFmQSxJQUFJQSxhQUFhLGFBQVEsVUFBS0EsVUFBYixJQUEyQixVQUFVQyxVQUFWLEVBQXNCQyxNQUF0QixFQUE4QkMsR0FBOUIsRUFBbUNDLElBQW5DLEVBQXlDO0FBQ2pGLFFBQUlDLElBQUlDLFVBQVVDLE1BQWxCO0FBQUEsUUFDSUMsSUFBSUgsSUFBSSxDQUFKLEdBQVFILE1BQVIsR0FBaUJFLFNBQVMsSUFBVCxH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RyxRQUFRMUQsRUFBbkIsQ0FBaEI7QUFDQXdELHFCQUFTQSxPQUFPbkUsSUFBUCxDQUFZLE1BQU07QUFDdkIsdUJBQU9zRSxVQUFVLElBQVYsRUFBZ0JELE9BQWhCLEVBQXlCckUsSUFBekIsQ0FBOEJ1RSx3QkFBd0I7QUFDekQsd0JBQUlBLG9CQUFKLEVBQTBCO0FBQ3RCQyw4QkFBTUMsU0FBTixDQUFnQmhCLElBQWhCLENBQXFCaUIsS0FBckIsQ0FBMkJ0RSxVQUEzQixFQUF1Q21FLG9CQUF2QztBQUNIO0FBQ0osaUJBSk0sQ0FBUDtBQUtILGFBTlEsQ0FBVDtBQU9ILFNBVEQ7QUFVQSxlQUFPSixPQUFPbkUsSUFBUCxDQUFZLE1BQU1JLFVBQWxCLENBQVA7QUFDSDtBQXBPa0QsQ0FBdkQ7QUFzT0E5QixnQkFBZ0JoQixXQUFXLENBQUNxSCxjQUFELEVBQVdDLGNBQVgsRUFBcUJDLGVBQXJCLENBQVgsRUFBNEN2RyxhQUE1QyxDQUFoQjtrQkFDZUEsYSIsImZpbGUiOiJqc29uYXBpLXNvdXJjZS5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBfX2RlY29yYXRlID0gdGhpcyAmJiB0aGlzLl9fZGVjb3JhdGUgfHwgZnVuY3Rpb24gKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLFxuICAgICAgICByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYyxcbiAgICAgICAgZDtcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QuZGVjb3JhdGUgPT09IFwiZnVuY3Rpb25cIikgciA9IFJlZmxlY3QuZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpO2Vsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcbn07XG4vKiBlc2xpbnQtZGlzYWJsZSB2YWxpZC1qc2RvYyAqL1xuaW1wb3J0IE9yYml0LCB7IFNvdXJjZSwgcHVsbGFibGUsIHB1c2hhYmxlLCBUcmFuc2Zvcm1Ob3RBbGxvd2VkLCBDbGllbnRFcnJvciwgU2VydmVyRXJyb3IsIE5ldHdvcmtFcnJvciwgcXVlcnlhYmxlIH0gZnJvbSAnQG9yYml0L2RhdGEnO1xuaW1wb3J0IHsgYXNzZXJ0LCBkZWVwTWVyZ2UsIGRlcHJlY2F0ZSB9IGZyb20gJ0BvcmJpdC91dGlscyc7XG5pbXBvcnQgSlNPTkFQSVNlcmlhbGl6ZXIgZnJvbSAnLi9qc29uYXBpLXNlcmlhbGl6ZXInO1xuaW1wb3J0IHsgYXBwZW5kUXVlcnlQYXJhbXMgfSBmcm9tICcuL2xpYi9xdWVyeS1wYXJhbXMnO1xuaW1wb3J0IHsgUHVsbE9wZXJhdG9ycyB9IGZyb20gJy4vbGliL3B1bGwtb3BlcmF0b3JzJztcbmltcG9ydCB7IGdldFRyYW5zZm9ybVJlcXVlc3RzLCBUcmFuc2Zvcm1SZXF1ZXN0UHJvY2Vzc29ycyB9IGZyb20gJy4vbGliL3RyYW5zZm9ybS1yZXF1ZXN0cyc7XG5pbXBvcnQgeyBJbnZhbGlkU2VydmVyUmVzcG9uc2UgfSBmcm9tICcuL2xpYi9leGNlcHRpb25zJztcbmltcG9ydCB7IFF1ZXJ5T3BlcmF0b3JzIH0gZnJvbSBcIi4vbGliL3F1ZXJ5LW9wZXJhdG9yc1wiO1xuLyoqXG4gU291cmNlIGZvciBhY2Nlc3NpbmcgYSBKU09OIEFQSSBjb21wbGlhbnQgUkVTVGZ1bCBBUEkgd2l0aCBhIG5ldHdvcmsgZmV0Y2hcbiByZXF1ZXN0LlxuXG4gSWYgYSBzaW5nbGUgdHJhbnNmb3JtIG9yIHF1ZXJ5IHJlcXVpcmVzIG1vcmUgdGhhbiBvbmUgZmV0Y2ggcmVxdWVzdCxcbiByZXF1ZXN0cyB3aWxsIGJlIHBlcmZvcm1lZCBzZXF1ZW50aWFsbHkgYW5kIHJlc29sdmVkIHRvZ2V0aGVyLiBGcm9tIHRoZVxuIHBlcnNwZWN0aXZlIG9mIE9yYml0LCB0aGVzZSBvcGVyYXRpb25zIHdpbGwgYWxsIHN1Y2NlZWQgb3IgZmFpbCB0b2dldGhlci4gVGhlXG4gYG1heFJlcXVlc3RzUGVyVHJhbnNmb3JtYCBhbmQgYG1heFJlcXVlc3RzUGVyUXVlcnlgIHNldHRpbmdzIGFsbG93IGxpbWl0cyB0byBiZVxuIHNldCBvbiB0aGlzIGJlaGF2aW9yLiBUaGVzZSBzZXR0aW5ncyBzaG91bGQgYmUgc2V0IHRvIGAxYCBpZiB5b3VyIGNsaWVudC9zZXJ2ZXJcbiBjb25maWd1cmF0aW9uIGlzIHVuYWJsZSB0byByZXNvbHZlIHBhcnRpYWxseSBzdWNjZXNzZnVsIHRyYW5zZm9ybXMgLyBxdWVyaWVzLlxuXG4gQGNsYXNzIEpTT05BUElTb3VyY2VcbiBAZXh0ZW5kcyBTb3VyY2VcbiAqL1xubGV0IEpTT05BUElTb3VyY2UgPSBjbGFzcyBKU09OQVBJU291cmNlIGV4dGVuZHMgU291cmNlIHtcbiAgICBjb25zdHJ1Y3RvcihzZXR0aW5ncyA9IHt9KSB7XG4gICAgICAgIGFzc2VydCgnSlNPTkFQSVNvdXJjZVxcJ3MgYHNjaGVtYWAgbXVzdCBiZSBzcGVjaWZpZWQgaW4gYHNldHRpbmdzLnNjaGVtYWAgY29uc3RydWN0b3IgYXJndW1lbnQnLCAhIXNldHRpbmdzLnNjaGVtYSk7XG4gICAgICAgIGFzc2VydCgnSlNPTkFQSVNvdXJjZSByZXF1aXJlcyBPcmJpdC5Qcm9taXNlIGJlIGRlZmluZWQnLCBPcmJpdC5Qcm9taXNlKTtcbiAgICAgICAgYXNzZXJ0KCdKU09OQVBJU291cmNlIHJlcXVpcmVzIE9yYml0LmZldGNoIGJlIGRlZmluZWQnLCBPcmJpdC5mZXRjaCB8fCBmZXRjaCk7XG4gICAgICAgIHNldHRpbmdzLm5hbWUgPSBzZXR0aW5ncy5uYW1lIHx8ICdqc29uYXBpJztcbiAgICAgICAgc3VwZXIoc2V0dGluZ3MpO1xuICAgICAgICB0aGlzLm5hbWVzcGFjZSA9IHNldHRpbmdzLm5hbWVzcGFjZTtcbiAgICAgICAgdGhpcy5ob3N0ID0gc2V0dGluZ3MuaG9zdDtcbiAgICAgICAgdGhpcy5pbml0RGVmYXVsdEZldGNoU2V0dGluZ3Moc2V0dGluZ3MpO1xuICAgICAgICB0aGlzLm1heFJlcXVlc3RzUGVyVHJhbnNmb3JtID0gc2V0dGluZ3MubWF4UmVxdWVzdHNQZXJUcmFuc2Zvcm07XG4gICAgICAgIGNvbnN0IFNlcmlhbGl6ZXJDbGFzcyA9IHNldHRpbmdzLlNlcmlhbGl6ZXJDbGFzcyB8fCBKU09OQVBJU2VyaWFsaXplcjtcbiAgICAgICAgdGhpcy5zZXJpYWxpemVyID0gbmV3IFNlcmlhbGl6ZXJDbGFzcyh7IHNjaGVtYTogc2V0dGluZ3Muc2NoZW1hLCBrZXlNYXA6IHNldHRpbmdzLmtleU1hcCB9KTtcbiAgICB9XG4gICAgZ2V0IGRlZmF1bHRGZXRjaEhlYWRlcnMoKSB7XG4gICAgICAgIGRlcHJlY2F0ZSgnSlNPTkFQSVNvdXJjZTogQWNjZXNzIGBkZWZhdWx0RmV0Y2hTZXR0aW5ncy5oZWFkZXJzYCBpbnN0ZWFkIG9mIGBkZWZhdWx0RmV0Y2hIZWFkZXJzYCcpO1xuICAgICAgICByZXR1cm4gdGhpcy5kZWZhdWx0RmV0Y2hTZXR0aW5ncy5oZWFkZXJzO1xuICAgIH1cbiAgICBzZXQgZGVmYXVsdEZldGNoSGVhZGVycyhoZWFkZXJzKSB7XG4gICAgICAgIGRlcHJlY2F0ZSgnSlNPTkFQSVNvdXJjZTogQWNjZXNzIGBkZWZhdWx0RmV0Y2hTZXR0aW5ncy5oZWFkZXJzYCBpbnN0ZWFkIG9mIGBkZWZhdWx0RmV0Y2hIZWFkZXJzYCcpO1xuICAgICAgICB0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzLmhlYWRlcnMgPSBoZWFkZXJzO1xuICAgIH1cbiAgICBnZXQgZGVmYXVsdEZldGNoVGltZW91dCgpIHtcbiAgICAgICAgZGVwcmVjYXRlKCdKU09OQVBJU291cmNlOiBBY2Nlc3MgYGRlZmF1bHRGZXRjaFNldHRpbmdzLnRpbWVvdXRgIGluc3RlYWQgb2YgYGRlZmF1bHRGZXRjaFRpbWVvdXRgJyk7XG4gICAgICAgIHJldHVybiB0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzLnRpbWVvdXQ7XG4gICAgfVxuICAgIHNldCBkZWZhdWx0RmV0Y2hUaW1lb3V0KHRpbWVvdXQpIHtcbiAgICAgICAgZGVwcmVjYXRlKCdKU09OQVBJU291cmNlOiBBY2Nlc3MgYGRlZmF1bHRGZXRjaFNldHRpbmdzLnRpbWVvdXRgIGluc3RlYWQgb2YgYGRlZmF1bHRGZXRjaFRpbWVvdXRgJyk7XG4gICAgICAgIHRoaXMuZGVmYXVsdEZldGNoU2V0dGluZ3MudGltZW91dCA9IHRpbWVvdXQ7XG4gICAgfVxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgLy8gUHVzaGFibGUgaW50ZXJmYWNlIGltcGxlbWVudGF0aW9uXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICBfcHVzaCh0cmFuc2Zvcm0pIHtcbiAgICAgICAgY29uc3QgcmVxdWVzdHMgPSBnZXRUcmFuc2Zvcm1SZXF1ZXN0cyh0aGlzLCB0cmFuc2Zvcm0pO1xuICAgICAgICBpZiAodGhpcy5tYXhSZXF1ZXN0c1BlclRyYW5zZm9ybSAmJiByZXF1ZXN0cy5sZW5ndGggPiB0aGlzLm1heFJlcXVlc3RzUGVyVHJhbnNmb3JtKSB7XG4gICAgICAgICAgICByZXR1cm4gT3JiaXQuUHJvbWlzZS5yZXNvbHZlKCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFRyYW5zZm9ybU5vdEFsbG93ZWQoYFRoaXMgdHJhbnNmb3JtIHJlcXVpcmVzICR7cmVxdWVzdHMubGVuZ3RofSByZXF1ZXN0cywgd2hpY2ggZXhjZWVkcyB0aGUgc3BlY2lmaWVkIGxpbWl0IG9mICR7dGhpcy5tYXhSZXF1ZXN0c1BlclRyYW5zZm9ybX0gcmVxdWVzdHMgcGVyIHRyYW5zZm9ybS5gLCB0cmFuc2Zvcm0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3Byb2Nlc3NSZXF1ZXN0cyhyZXF1ZXN0cywgVHJhbnNmb3JtUmVxdWVzdFByb2Nlc3NvcnMpLnRoZW4odHJhbnNmb3JtcyA9PiB7XG4gICAgICAgICAgICB0cmFuc2Zvcm1zLnVuc2hpZnQodHJhbnNmb3JtKTtcbiAgICAgICAgICAgIHJldHVybiB0cmFuc2Zvcm1zO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBQdWxsYWJsZSBpbnRlcmZhY2UgaW1wbGVtZW50YXRpb25cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIF9wdWxsKHF1ZXJ5KSB7XG4gICAgICAgIGNvbnN0IG9wZXJhdG9yID0gUHVsbE9wZXJhdG9yc1txdWVyeS5leHByZXNzaW9uLm9wXTtcbiAgICAgICAgaWYgKCFvcGVyYXRvcikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdKU09OQVBJU291cmNlIGRvZXMgbm90IHN1cHBvcnQgdGhlIGAke3F1ZXJ5LmV4cHJlc3Npb24ub3B9YCBvcGVyYXRvciBmb3IgcXVlcmllcy4nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3BlcmF0b3IodGhpcywgcXVlcnkpO1xuICAgIH1cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIC8vIFB1bGxhYmxlIGludGVyZmFjZSBpbXBsZW1lbnRhdGlvblxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgX3F1ZXJ5KHF1ZXJ5KSB7XG4gICAgICAgIGNvbnN0IG9wZXJhdG9yID0gUXVlcnlPcGVyYXRvcnNbcXVlcnkuZXhwcmVzc2lvbi5vcF07XG4gICAgICAgIGlmICghb3BlcmF0b3IpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSlNPTkFQSVNvdXJjZSBkb2VzIG5vdCBzdXBwb3J0IHRoZSBgJHtxdWVyeS5leHByZXNzaW9uLm9wfWAgb3BlcmF0b3IgZm9yIHF1ZXJpZXMuJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9wZXJhdG9yKHRoaXMsIHF1ZXJ5KTtcbiAgICB9XG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBQdWJsaWNseSBhY2Nlc3NpYmxlIG1ldGhvZHMgcGFydGljdWxhciB0byBKU09OQVBJU291cmNlXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICBmZXRjaCh1cmwsIGN1c3RvbVNldHRpbmdzKSB7XG4gICAgICAgIGxldCBzZXR0aW5ncyA9IHRoaXMuaW5pdEZldGNoU2V0dGluZ3MoY3VzdG9tU2V0dGluZ3MpO1xuICAgICAgICBsZXQgZnVsbFVybCA9IHVybDtcbiAgICAgICAgaWYgKHNldHRpbmdzLnBhcmFtcykge1xuICAgICAgICAgICAgZnVsbFVybCA9IGFwcGVuZFF1ZXJ5UGFyYW1zKGZ1bGxVcmwsIHNldHRpbmdzLnBhcmFtcyk7XG4gICAgICAgICAgICBkZWxldGUgc2V0dGluZ3MucGFyYW1zO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdmZXRjaCcsIGZ1bGxVcmwsIG1lcmdlZFNldHRpbmdzLCAncG9seWZpbGwnLCBmZXRjaC5wb2x5ZmlsbCk7XG4gICAgICAgIGxldCBmZXRjaEZuID0gT3JiaXQuZmV0Y2ggfHwgZmV0Y2g7XG4gICAgICAgIGlmIChzZXR0aW5ncy50aW1lb3V0KSB7XG4gICAgICAgICAgICBsZXQgdGltZW91dCA9IHNldHRpbmdzLnRpbWVvdXQ7XG4gICAgICAgICAgICBkZWxldGUgc2V0dGluZ3MudGltZW91dDtcbiAgICAgICAgICAgIHJldHVybiBuZXcgT3JiaXQuUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHRpbWVkT3V0O1xuICAgICAgICAgICAgICAgIGxldCB0aW1lciA9IE9yYml0Lmdsb2JhbHMuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRpbWVkT3V0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBOZXR3b3JrRXJyb3IoYE5vIGZldGNoIHJlc3BvbnNlIHdpdGhpbiAke3RpbWVvdXR9bXMuYCkpO1xuICAgICAgICAgICAgICAgIH0sIHRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIGZldGNoRm4oZnVsbFVybCwgc2V0dGluZ3MpLmNhdGNoKGUgPT4ge1xuICAgICAgICAgICAgICAgICAgICBPcmJpdC5nbG9iYWxzLmNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGltZWRPdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZUZldGNoRXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KS50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgT3JiaXQuZ2xvYmFscy5jbGVhclRpbWVvdXQodGltZXIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXRpbWVkT3V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVGZXRjaFJlc3BvbnNlKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZldGNoRm4oZnVsbFVybCwgc2V0dGluZ3MpLmNhdGNoKGUgPT4gdGhpcy5oYW5kbGVGZXRjaEVycm9yKGUpKS50aGVuKHJlc3BvbnNlID0+IHRoaXMuaGFuZGxlRmV0Y2hSZXNwb25zZShyZXNwb25zZSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGluaXRGZXRjaFNldHRpbmdzKGN1c3RvbVNldHRpbmdzID0ge30pIHtcbiAgICAgICAgbGV0IHNldHRpbmdzID0gZGVlcE1lcmdlKHt9LCB0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzLCBjdXN0b21TZXR0aW5ncyk7XG4gICAgICAgIGlmIChzZXR0aW5ncy5qc29uKSB7XG4gICAgICAgICAgICBhc3NlcnQoJ2Bqc29uYCBhbmQgYGJvZHlgIGNhblxcJ3QgYm90aCBiZSBzZXQgZm9yIGZldGNoIHJlcXVlc3RzLicsICFzZXR0aW5ncy5ib2R5KTtcbiAgICAgICAgICAgIHNldHRpbmdzLmJvZHkgPSBKU09OLnN0cmluZ2lmeShzZXR0aW5ncy5qc29uKTtcbiAgICAgICAgICAgIGRlbGV0ZSBzZXR0aW5ncy5qc29uO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzZXR0aW5ncy5oZWFkZXJzICYmICFzZXR0aW5ncy5ib2R5KSB7XG4gICAgICAgICAgICBkZWxldGUgc2V0dGluZ3MuaGVhZGVyc1snQ29udGVudC1UeXBlJ107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNldHRpbmdzO1xuICAgIH1cbiAgICBoYW5kbGVGZXRjaFJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDIwMSkge1xuICAgICAgICAgICAgaWYgKHRoaXMucmVzcG9uc2VIYXNDb250ZW50KHJlc3BvbnNlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBJbnZhbGlkU2VydmVyUmVzcG9uc2UoYFNlcnZlciByZXNwb25zZXMgd2l0aCBhICR7cmVzcG9uc2Uuc3RhdHVzfSBzdGF0dXMgc2hvdWxkIHJldHVybiBjb250ZW50IHdpdGggYSBDb250ZW50LVR5cGUgdGhhdCBpbmNsdWRlcyAnYXBwbGljYXRpb24vdm5kLmFwaStqc29uJy5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5zdGF0dXMgPj0gMjAwICYmIHJlc3BvbnNlLnN0YXR1cyA8IDMwMCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucmVzcG9uc2VIYXNDb250ZW50KHJlc3BvbnNlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodGhpcy5yZXNwb25zZUhhc0NvbnRlbnQocmVzcG9uc2UpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKS50aGVuKGRhdGEgPT4gdGhpcy5oYW5kbGVGZXRjaFJlc3BvbnNlRXJyb3IocmVzcG9uc2UsIGRhdGEpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlRmV0Y2hSZXNwb25zZUVycm9yKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gT3JiaXQuUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuICAgIGhhbmRsZUZldGNoUmVzcG9uc2VFcnJvcihyZXNwb25zZSwgZGF0YSkge1xuICAgICAgICBsZXQgZXJyb3I7XG4gICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPj0gNDAwICYmIHJlc3BvbnNlLnN0YXR1cyA8IDUwMCkge1xuICAgICAgICAgICAgZXJyb3IgPSBuZXcgQ2xpZW50RXJyb3IocmVzcG9uc2Uuc3RhdHVzVGV4dCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlcnJvciA9IG5ldyBTZXJ2ZXJFcnJvcihyZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBlcnJvci5yZXNwb25zZSA9IHJlc3BvbnNlO1xuICAgICAgICBlcnJvci5kYXRhID0gZGF0YTtcbiAgICAgICAgcmV0dXJuIE9yYml0LlByb21pc2UucmVqZWN0KGVycm9yKTtcbiAgICB9XG4gICAgaGFuZGxlRmV0Y2hFcnJvcihlKSB7XG4gICAgICAgIGxldCBlcnJvciA9IG5ldyBOZXR3b3JrRXJyb3IoZSk7XG4gICAgICAgIHJldHVybiBPcmJpdC5Qcm9taXNlLnJlamVjdChlcnJvcik7XG4gICAgfVxuICAgIHJlc3BvbnNlSGFzQ29udGVudChyZXNwb25zZSkge1xuICAgICAgICBsZXQgY29udGVudFR5cGUgPSByZXNwb25zZS5oZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJyk7XG4gICAgICAgIHJldHVybiBjb250ZW50VHlwZSAmJiBjb250ZW50VHlwZS5pbmRleE9mKCdhcHBsaWNhdGlvbi92bmQuYXBpK2pzb24nKSA+IC0xO1xuICAgIH1cbiAgICByZXNvdXJjZU5hbWVzcGFjZSh0eXBlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm5hbWVzcGFjZTtcbiAgICB9XG4gICAgcmVzb3VyY2VIb3N0KHR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaG9zdDtcbiAgICB9XG4gICAgcmVzb3VyY2VQYXRoKHR5cGUsIGlkKSB7XG4gICAgICAgIGxldCBwYXRoID0gW3RoaXMuc2VyaWFsaXplci5yZXNvdXJjZVR5cGUodHlwZSldO1xuICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgIGxldCByZXNvdXJjZUlkID0gdGhpcy5zZXJpYWxpemVyLnJlc291cmNlSWQodHlwZSwgaWQpO1xuICAgICAgICAgICAgaWYgKHJlc291cmNlSWQpIHtcbiAgICAgICAgICAgICAgICBwYXRoLnB1c2gocmVzb3VyY2VJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhdGguam9pbignLycpO1xuICAgIH1cbiAgICByZXNvdXJjZVVSTCh0eXBlLCBpZCkge1xuICAgICAgICBsZXQgaG9zdCA9IHRoaXMucmVzb3VyY2VIb3N0KHR5cGUpO1xuICAgICAgICBsZXQgbmFtZXNwYWNlID0gdGhpcy5yZXNvdXJjZU5hbWVzcGFjZSh0eXBlKTtcbiAgICAgICAgbGV0IHVybCA9IFtdO1xuICAgICAgICBpZiAoaG9zdCkge1xuICAgICAgICAgICAgdXJsLnB1c2goaG9zdCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5hbWVzcGFjZSkge1xuICAgICAgICAgICAgdXJsLnB1c2gobmFtZXNwYWNlKTtcbiAgICAgICAgfVxuICAgICAgICB1cmwucHVzaCh0aGlzLnJlc291cmNlUGF0aCh0eXBlLCBpZCkpO1xuICAgICAgICBpZiAoIWhvc3QpIHtcbiAgICAgICAgICAgIHVybC51bnNoaWZ0KCcnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXJsLmpvaW4oJy8nKTtcbiAgICB9XG4gICAgcmVzb3VyY2VSZWxhdGlvbnNoaXBVUkwodHlwZSwgaWQsIHJlbGF0aW9uc2hpcCkge1xuICAgICAgICByZXR1cm4gdGhpcy5yZXNvdXJjZVVSTCh0eXBlLCBpZCkgKyAnL3JlbGF0aW9uc2hpcHMvJyArIHRoaXMuc2VyaWFsaXplci5yZXNvdXJjZVJlbGF0aW9uc2hpcCh0eXBlLCByZWxhdGlvbnNoaXApO1xuICAgIH1cbiAgICByZWxhdGVkUmVzb3VyY2VVUkwodHlwZSwgaWQsIHJlbGF0aW9uc2hpcCkge1xuICAgICAgICByZXR1cm4gdGhpcy5yZXNvdXJjZVVSTCh0eXBlLCBpZCkgKyAnLycgKyB0aGlzLnNlcmlhbGl6ZXIucmVzb3VyY2VSZWxhdGlvbnNoaXAodHlwZSwgcmVsYXRpb25zaGlwKTtcbiAgICB9XG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBQcml2YXRlIG1ldGhvZHNcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIGluaXREZWZhdWx0RmV0Y2hTZXR0aW5ncyhzZXR0aW5ncykge1xuICAgICAgICB0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzID0ge1xuICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgIEFjY2VwdDogJ2FwcGxpY2F0aW9uL3ZuZC5hcGkranNvbicsXG4gICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi92bmQuYXBpK2pzb24nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGltZW91dDogNTAwMFxuICAgICAgICB9O1xuICAgICAgICBpZiAoc2V0dGluZ3MuZGVmYXVsdEZldGNoSGVhZGVycyB8fCBzZXR0aW5ncy5kZWZhdWx0RmV0Y2hUaW1lb3V0KSB7XG4gICAgICAgICAgICBkZXByZWNhdGUoJ0pTT05BUElTb3VyY2U6IFBhc3MgYGRlZmF1bHRGZXRjaFNldHRpbmdzYCB3aXRoIGBoZWFkZXJzYCBpbnN0ZWFkIG9mIGBkZWZhdWx0RmV0Y2hIZWFkZXJzYCB0byBpbml0aWFsaXplIHNvdXJjZScsIHNldHRpbmdzLmRlZmF1bHRGZXRjaEhlYWRlcnMgPT09IHVuZGVmaW5lZCk7XG4gICAgICAgICAgICBkZXByZWNhdGUoJ0pTT05BUElTb3VyY2U6IFBhc3MgYGRlZmF1bHRGZXRjaFNldHRpbmdzYCB3aXRoIGB0aW1lb3V0YCBpbnN0ZWFkIG9mIGBkZWZhdWx0RmV0Y2hUaW1lb3V0YCB0byBpbml0aWFsaXplIHNvdXJjZScsIHNldHRpbmdzLmRlZmF1bHRGZXRjaFRpbWVvdXQgPT09IHVuZGVmaW5lZCk7XG4gICAgICAgICAgICBkZWVwTWVyZ2UodGhpcy5kZWZhdWx0RmV0Y2hTZXR0aW5ncywge1xuICAgICAgICAgICAgICAgIGhlYWRlcnM6IHNldHRpbmdzLmRlZmF1bHRGZXRjaEhlYWRlcnMsXG4gICAgICAgICAgICAgICAgdGltZW91dDogc2V0dGluZ3MuZGVmYXVsdEZldGNoVGltZW91dFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNldHRpbmdzLmRlZmF1bHRGZXRjaFNldHRpbmdzKSB7XG4gICAgICAgICAgICBkZWVwTWVyZ2UodGhpcy5kZWZhdWx0RmV0Y2hTZXR0aW5ncywgc2V0dGluZ3MuZGVmYXVsdEZldGNoU2V0dGluZ3MpO1xuICAgICAgICB9XG4gICAgfVxuICAgIF9wcm9jZXNzUmVxdWVzdHMocmVxdWVzdHMsIHByb2Nlc3NvcnMpIHtcbiAgICAgICAgbGV0IHRyYW5zZm9ybXMgPSBbXTtcbiAgICAgICAgbGV0IHJlc3VsdCA9IE9yYml0LlByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICByZXF1ZXN0cy5mb3JFYWNoKHJlcXVlc3QgPT4ge1xuICAgICAgICAgICAgbGV0IHByb2Nlc3NvciA9IHByb2Nlc3NvcnNbcmVxdWVzdC5vcF07XG4gICAgICAgICAgICByZXN1bHQgPSByZXN1bHQudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb2Nlc3Nvcih0aGlzLCByZXF1ZXN0KS50aGVuKGFkZGl0aW9uYWxUcmFuc2Zvcm1zID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFkZGl0aW9uYWxUcmFuc2Zvcm1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseSh0cmFuc2Zvcm1zLCBhZGRpdGlvbmFsVHJhbnNmb3Jtcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdC50aGVuKCgpID0+IHRyYW5zZm9ybXMpO1xuICAgIH1cbn07XG5KU09OQVBJU291cmNlID0gX19kZWNvcmF0ZShbcHVsbGFibGUsIHB1c2hhYmxlLCBxdWVyeWFibGVdLCBKU09OQVBJU291cmNlKTtcbmV4cG9ydCBkZWZhdWx0IEpTT05BUElTb3VyY2U7Il19