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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpzb25hcGktc291cmNlLmpzIl0sIm5hbWVzIjpbIl9fZGVjb3JhdGUiLCJkZWNvcmF0b3JzIiwidGFyZ2V0Iiwia2V5IiwiZGVzYyIsImMiLCJhcmd1bWVudHMiLCJsZW5ndGgiLCJyIiwiT2JqZWN0IiwiZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yIiwiZCIsIlJlZmxlY3QiLCJkZWNvcmF0ZSIsImkiLCJkZWZpbmVQcm9wZXJ0eSIsIkpTT05BUElTb3VyY2UiLCJTb3VyY2UiLCJjb25zdHJ1Y3RvciIsInNldHRpbmdzIiwic2NoZW1hIiwiT3JiaXQiLCJQcm9taXNlIiwibmFtZSIsIm5hbWVzcGFjZSIsImhvc3QiLCJpbml0RGVmYXVsdEZldGNoU2V0dGluZ3MiLCJtYXhSZXF1ZXN0c1BlclRyYW5zZm9ybSIsIlNlcmlhbGl6ZXJDbGFzcyIsIkpTT05BUElTZXJpYWxpemVyIiwic2VyaWFsaXplciIsImtleU1hcCIsImRlZmF1bHRGZXRjaEhlYWRlcnMiLCJkZWZhdWx0RmV0Y2hTZXR0aW5ncyIsImhlYWRlcnMiLCJkZWZhdWx0RmV0Y2hUaW1lb3V0IiwidGltZW91dCIsIl9wdXNoIiwidHJhbnNmb3JtIiwicmVxdWVzdHMiLCJyZXNvbHZlIiwidGhlbiIsIlRyYW5zZm9ybU5vdEFsbG93ZWQiLCJfcHJvY2Vzc1JlcXVlc3RzIiwiVHJhbnNmb3JtUmVxdWVzdFByb2Nlc3NvcnMiLCJ0cmFuc2Zvcm1zIiwidW5zaGlmdCIsIl9wdWxsIiwicXVlcnkiLCJvcGVyYXRvciIsIlB1bGxPcGVyYXRvcnMiLCJleHByZXNzaW9uIiwib3AiLCJFcnJvciIsIl9xdWVyeSIsIlF1ZXJ5T3BlcmF0b3JzIiwiZmV0Y2giLCJ1cmwiLCJjdXN0b21TZXR0aW5ncyIsImluaXRGZXRjaFNldHRpbmdzIiwiZnVsbFVybCIsInBhcmFtcyIsImZldGNoRm4iLCJyZWplY3QiLCJ0aW1lZE91dCIsInRpbWVyIiwiZ2xvYmFscyIsInNldFRpbWVvdXQiLCJOZXR3b3JrRXJyb3IiLCJjYXRjaCIsImUiLCJjbGVhclRpbWVvdXQiLCJoYW5kbGVGZXRjaEVycm9yIiwicmVzcG9uc2UiLCJoYW5kbGVGZXRjaFJlc3BvbnNlIiwianNvbiIsImJvZHkiLCJKU09OIiwic3RyaW5naWZ5Iiwic3RhdHVzIiwicmVzcG9uc2VIYXNDb250ZW50IiwiSW52YWxpZFNlcnZlclJlc3BvbnNlIiwiZGF0YSIsImhhbmRsZUZldGNoUmVzcG9uc2VFcnJvciIsImVycm9yIiwiQ2xpZW50RXJyb3IiLCJzdGF0dXNUZXh0IiwiU2VydmVyRXJyb3IiLCJjb250ZW50VHlwZSIsImdldCIsImluZGV4T2YiLCJyZXNvdXJjZU5hbWVzcGFjZSIsInR5cGUiLCJyZXNvdXJjZUhvc3QiLCJyZXNvdXJjZVBhdGgiLCJpZCIsInBhdGgiLCJyZXNvdXJjZVR5cGUiLCJyZXNvdXJjZUlkIiwicHVzaCIsImpvaW4iLCJyZXNvdXJjZVVSTCIsInJlc291cmNlUmVsYXRpb25zaGlwVVJMIiwicmVsYXRpb25zaGlwIiwicmVzb3VyY2VSZWxhdGlvbnNoaXAiLCJyZWxhdGVkUmVzb3VyY2VVUkwiLCJBY2NlcHQiLCJ1bmRlZmluZWQiLCJwcm9jZXNzb3JzIiwicmVzdWx0IiwiZm9yRWFjaCIsInJlcXVlc3QiLCJwcm9jZXNzb3IiLCJhZGRpdGlvbmFsVHJhbnNmb3JtcyIsIkFycmF5IiwicHJvdG90eXBlIiwiYXBwbHkiLCJwdWxsYWJsZSIsInB1c2hhYmxlIiwicXVlcnlhYmxlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFRQTs7OztBQUNBOztBQUNBOzs7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7Ozs7QUFmQSxJQUFJQSxhQUFhLGFBQVEsVUFBS0EsVUFBYixJQUEyQixVQUFVQyxVQUFWLEVBQXNCQyxNQUF0QixFQUE4QkMsR0FBOUIsRUFBbUNDLElBQW5DLEVBQXlDO0FBQ2pGLFFBQUlDLElBQUlDLFVBQVVDLE1BQWxCO0FBQUEsUUFDSUMsSUFBSUgsSUFBSSxDQUFKLEdBQVFILE1BQVIsR0FBaUJFLFNBQVMsSUFBVCxH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QUFNO0FBQ3ZCLHVCQUFPdUUsVUFBVSxJQUFWLEVBQWdCRCxPQUFoQixFQUF5QnRFLElBQXpCLENBQThCd0Usd0JBQXdCO0FBQ3pELHdCQUFJQSxvQkFBSixFQUEwQjtBQUN0QkMsOEJBQU1DLFNBQU4sQ0FBZ0JoQixJQUFoQixDQUFxQmlCLEtBQXJCLENBQTJCdkUsVUFBM0IsRUFBdUNvRSxvQkFBdkM7QUFDSDtBQUNKLGlCQUpNLENBQVA7QUFLSCxhQU5RLENBQVQ7QUFPSCxTQVREO0FBVUEsZUFBT0osT0FBT3BFLElBQVAsQ0FBWSxNQUFNSSxVQUFsQixDQUFQO0FBQ0g7QUFuT2tELENBQXZEO0FBcU9BN0IsZ0JBQWdCaEIsV0FBVyxDQUFDcUgsY0FBRCxFQUFXQyxjQUFYLEVBQXFCQyxlQUFyQixDQUFYLEVBQTRDdkcsYUFBNUMsQ0FBaEI7a0JBQ2VBLGEiLCJmaWxlIjoianNvbmFwaS1zb3VyY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgX19kZWNvcmF0ZSA9IHRoaXMgJiYgdGhpcy5fX2RlY29yYXRlIHx8IGZ1bmN0aW9uIChkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xuICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aCxcbiAgICAgICAgciA9IGMgPCAzID8gdGFyZ2V0IDogZGVzYyA9PT0gbnVsbCA/IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KSA6IGRlc2MsXG4gICAgICAgIGQ7XG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xuICAgIHJldHVybiBjID4gMyAmJiByICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgciksIHI7XG59O1xuLyogZXNsaW50LWRpc2FibGUgdmFsaWQtanNkb2MgKi9cbmltcG9ydCBPcmJpdCwgeyBTb3VyY2UsIHB1bGxhYmxlLCBwdXNoYWJsZSwgVHJhbnNmb3JtTm90QWxsb3dlZCwgQ2xpZW50RXJyb3IsIFNlcnZlckVycm9yLCBOZXR3b3JrRXJyb3IsIHF1ZXJ5YWJsZSB9IGZyb20gJ0BvcmJpdC9kYXRhJztcbmltcG9ydCB7IGFzc2VydCwgZGVlcE1lcmdlLCBkZXByZWNhdGUgfSBmcm9tICdAb3JiaXQvdXRpbHMnO1xuaW1wb3J0IEpTT05BUElTZXJpYWxpemVyIGZyb20gJy4vanNvbmFwaS1zZXJpYWxpemVyJztcbmltcG9ydCB7IGFwcGVuZFF1ZXJ5UGFyYW1zIH0gZnJvbSAnLi9saWIvcXVlcnktcGFyYW1zJztcbmltcG9ydCB7IFB1bGxPcGVyYXRvcnMgfSBmcm9tICcuL2xpYi9wdWxsLW9wZXJhdG9ycyc7XG5pbXBvcnQgeyBnZXRUcmFuc2Zvcm1SZXF1ZXN0cywgVHJhbnNmb3JtUmVxdWVzdFByb2Nlc3NvcnMgfSBmcm9tICcuL2xpYi90cmFuc2Zvcm0tcmVxdWVzdHMnO1xuaW1wb3J0IHsgSW52YWxpZFNlcnZlclJlc3BvbnNlIH0gZnJvbSAnLi9saWIvZXhjZXB0aW9ucyc7XG5pbXBvcnQgeyBRdWVyeU9wZXJhdG9ycyB9IGZyb20gXCIuL2xpYi9xdWVyeS1vcGVyYXRvcnNcIjtcbi8qKlxuIFNvdXJjZSBmb3IgYWNjZXNzaW5nIGEgSlNPTiBBUEkgY29tcGxpYW50IFJFU1RmdWwgQVBJIHdpdGggYSBuZXR3b3JrIGZldGNoXG4gcmVxdWVzdC5cblxuIElmIGEgc2luZ2xlIHRyYW5zZm9ybSBvciBxdWVyeSByZXF1aXJlcyBtb3JlIHRoYW4gb25lIGZldGNoIHJlcXVlc3QsXG4gcmVxdWVzdHMgd2lsbCBiZSBwZXJmb3JtZWQgc2VxdWVudGlhbGx5IGFuZCByZXNvbHZlZCB0b2dldGhlci4gRnJvbSB0aGVcbiBwZXJzcGVjdGl2ZSBvZiBPcmJpdCwgdGhlc2Ugb3BlcmF0aW9ucyB3aWxsIGFsbCBzdWNjZWVkIG9yIGZhaWwgdG9nZXRoZXIuIFRoZVxuIGBtYXhSZXF1ZXN0c1BlclRyYW5zZm9ybWAgYW5kIGBtYXhSZXF1ZXN0c1BlclF1ZXJ5YCBzZXR0aW5ncyBhbGxvdyBsaW1pdHMgdG8gYmVcbiBzZXQgb24gdGhpcyBiZWhhdmlvci4gVGhlc2Ugc2V0dGluZ3Mgc2hvdWxkIGJlIHNldCB0byBgMWAgaWYgeW91ciBjbGllbnQvc2VydmVyXG4gY29uZmlndXJhdGlvbiBpcyB1bmFibGUgdG8gcmVzb2x2ZSBwYXJ0aWFsbHkgc3VjY2Vzc2Z1bCB0cmFuc2Zvcm1zIC8gcXVlcmllcy5cblxuIEBjbGFzcyBKU09OQVBJU291cmNlXG4gQGV4dGVuZHMgU291cmNlXG4gKi9cbmxldCBKU09OQVBJU291cmNlID0gY2xhc3MgSlNPTkFQSVNvdXJjZSBleHRlbmRzIFNvdXJjZSB7XG4gICAgY29uc3RydWN0b3Ioc2V0dGluZ3MgPSB7fSkge1xuICAgICAgICBhc3NlcnQoJ0pTT05BUElTb3VyY2VcXCdzIGBzY2hlbWFgIG11c3QgYmUgc3BlY2lmaWVkIGluIGBzZXR0aW5ncy5zY2hlbWFgIGNvbnN0cnVjdG9yIGFyZ3VtZW50JywgISFzZXR0aW5ncy5zY2hlbWEpO1xuICAgICAgICBhc3NlcnQoJ0pTT05BUElTb3VyY2UgcmVxdWlyZXMgT3JiaXQuUHJvbWlzZSBiZSBkZWZpbmVkJywgT3JiaXQuUHJvbWlzZSk7XG4gICAgICAgIHNldHRpbmdzLm5hbWUgPSBzZXR0aW5ncy5uYW1lIHx8ICdqc29uYXBpJztcbiAgICAgICAgc3VwZXIoc2V0dGluZ3MpO1xuICAgICAgICB0aGlzLm5hbWVzcGFjZSA9IHNldHRpbmdzLm5hbWVzcGFjZTtcbiAgICAgICAgdGhpcy5ob3N0ID0gc2V0dGluZ3MuaG9zdDtcbiAgICAgICAgdGhpcy5pbml0RGVmYXVsdEZldGNoU2V0dGluZ3Moc2V0dGluZ3MpO1xuICAgICAgICB0aGlzLm1heFJlcXVlc3RzUGVyVHJhbnNmb3JtID0gc2V0dGluZ3MubWF4UmVxdWVzdHNQZXJUcmFuc2Zvcm07XG4gICAgICAgIGNvbnN0IFNlcmlhbGl6ZXJDbGFzcyA9IHNldHRpbmdzLlNlcmlhbGl6ZXJDbGFzcyB8fCBKU09OQVBJU2VyaWFsaXplcjtcbiAgICAgICAgdGhpcy5zZXJpYWxpemVyID0gbmV3IFNlcmlhbGl6ZXJDbGFzcyh7IHNjaGVtYTogc2V0dGluZ3Muc2NoZW1hLCBrZXlNYXA6IHNldHRpbmdzLmtleU1hcCB9KTtcbiAgICB9XG4gICAgZ2V0IGRlZmF1bHRGZXRjaEhlYWRlcnMoKSB7XG4gICAgICAgIGRlcHJlY2F0ZSgnSlNPTkFQSVNvdXJjZTogQWNjZXNzIGBkZWZhdWx0RmV0Y2hTZXR0aW5ncy5oZWFkZXJzYCBpbnN0ZWFkIG9mIGBkZWZhdWx0RmV0Y2hIZWFkZXJzYCcpO1xuICAgICAgICByZXR1cm4gdGhpcy5kZWZhdWx0RmV0Y2hTZXR0aW5ncy5oZWFkZXJzO1xuICAgIH1cbiAgICBzZXQgZGVmYXVsdEZldGNoSGVhZGVycyhoZWFkZXJzKSB7XG4gICAgICAgIGRlcHJlY2F0ZSgnSlNPTkFQSVNvdXJjZTogQWNjZXNzIGBkZWZhdWx0RmV0Y2hTZXR0aW5ncy5oZWFkZXJzYCBpbnN0ZWFkIG9mIGBkZWZhdWx0RmV0Y2hIZWFkZXJzYCcpO1xuICAgICAgICB0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzLmhlYWRlcnMgPSBoZWFkZXJzO1xuICAgIH1cbiAgICBnZXQgZGVmYXVsdEZldGNoVGltZW91dCgpIHtcbiAgICAgICAgZGVwcmVjYXRlKCdKU09OQVBJU291cmNlOiBBY2Nlc3MgYGRlZmF1bHRGZXRjaFNldHRpbmdzLnRpbWVvdXRgIGluc3RlYWQgb2YgYGRlZmF1bHRGZXRjaFRpbWVvdXRgJyk7XG4gICAgICAgIHJldHVybiB0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzLnRpbWVvdXQ7XG4gICAgfVxuICAgIHNldCBkZWZhdWx0RmV0Y2hUaW1lb3V0KHRpbWVvdXQpIHtcbiAgICAgICAgZGVwcmVjYXRlKCdKU09OQVBJU291cmNlOiBBY2Nlc3MgYGRlZmF1bHRGZXRjaFNldHRpbmdzLnRpbWVvdXRgIGluc3RlYWQgb2YgYGRlZmF1bHRGZXRjaFRpbWVvdXRgJyk7XG4gICAgICAgIHRoaXMuZGVmYXVsdEZldGNoU2V0dGluZ3MudGltZW91dCA9IHRpbWVvdXQ7XG4gICAgfVxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgLy8gUHVzaGFibGUgaW50ZXJmYWNlIGltcGxlbWVudGF0aW9uXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICBfcHVzaCh0cmFuc2Zvcm0pIHtcbiAgICAgICAgY29uc3QgcmVxdWVzdHMgPSBnZXRUcmFuc2Zvcm1SZXF1ZXN0cyh0aGlzLCB0cmFuc2Zvcm0pO1xuICAgICAgICBpZiAodGhpcy5tYXhSZXF1ZXN0c1BlclRyYW5zZm9ybSAmJiByZXF1ZXN0cy5sZW5ndGggPiB0aGlzLm1heFJlcXVlc3RzUGVyVHJhbnNmb3JtKSB7XG4gICAgICAgICAgICByZXR1cm4gT3JiaXQuUHJvbWlzZS5yZXNvbHZlKCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFRyYW5zZm9ybU5vdEFsbG93ZWQoYFRoaXMgdHJhbnNmb3JtIHJlcXVpcmVzICR7cmVxdWVzdHMubGVuZ3RofSByZXF1ZXN0cywgd2hpY2ggZXhjZWVkcyB0aGUgc3BlY2lmaWVkIGxpbWl0IG9mICR7dGhpcy5tYXhSZXF1ZXN0c1BlclRyYW5zZm9ybX0gcmVxdWVzdHMgcGVyIHRyYW5zZm9ybS5gLCB0cmFuc2Zvcm0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3Byb2Nlc3NSZXF1ZXN0cyhyZXF1ZXN0cywgVHJhbnNmb3JtUmVxdWVzdFByb2Nlc3NvcnMpLnRoZW4odHJhbnNmb3JtcyA9PiB7XG4gICAgICAgICAgICB0cmFuc2Zvcm1zLnVuc2hpZnQodHJhbnNmb3JtKTtcbiAgICAgICAgICAgIHJldHVybiB0cmFuc2Zvcm1zO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBQdWxsYWJsZSBpbnRlcmZhY2UgaW1wbGVtZW50YXRpb25cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIF9wdWxsKHF1ZXJ5KSB7XG4gICAgICAgIGNvbnN0IG9wZXJhdG9yID0gUHVsbE9wZXJhdG9yc1txdWVyeS5leHByZXNzaW9uLm9wXTtcbiAgICAgICAgaWYgKCFvcGVyYXRvcikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdKU09OQVBJU291cmNlIGRvZXMgbm90IHN1cHBvcnQgdGhlIGAke3F1ZXJ5LmV4cHJlc3Npb24ub3B9YCBvcGVyYXRvciBmb3IgcXVlcmllcy4nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3BlcmF0b3IodGhpcywgcXVlcnkpO1xuICAgIH1cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIC8vIFB1bGxhYmxlIGludGVyZmFjZSBpbXBsZW1lbnRhdGlvblxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgX3F1ZXJ5KHF1ZXJ5KSB7XG4gICAgICAgIGNvbnN0IG9wZXJhdG9yID0gUXVlcnlPcGVyYXRvcnNbcXVlcnkuZXhwcmVzc2lvbi5vcF07XG4gICAgICAgIGlmICghb3BlcmF0b3IpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSlNPTkFQSVNvdXJjZSBkb2VzIG5vdCBzdXBwb3J0IHRoZSBgJHtxdWVyeS5leHByZXNzaW9uLm9wfWAgb3BlcmF0b3IgZm9yIHF1ZXJpZXMuJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9wZXJhdG9yKHRoaXMsIHF1ZXJ5KTtcbiAgICB9XG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBQdWJsaWNseSBhY2Nlc3NpYmxlIG1ldGhvZHMgcGFydGljdWxhciB0byBKU09OQVBJU291cmNlXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICBmZXRjaCh1cmwsIGN1c3RvbVNldHRpbmdzKSB7XG4gICAgICAgIGxldCBzZXR0aW5ncyA9IHRoaXMuaW5pdEZldGNoU2V0dGluZ3MoY3VzdG9tU2V0dGluZ3MpO1xuICAgICAgICBsZXQgZnVsbFVybCA9IHVybDtcbiAgICAgICAgaWYgKHNldHRpbmdzLnBhcmFtcykge1xuICAgICAgICAgICAgZnVsbFVybCA9IGFwcGVuZFF1ZXJ5UGFyYW1zKGZ1bGxVcmwsIHNldHRpbmdzLnBhcmFtcyk7XG4gICAgICAgICAgICBkZWxldGUgc2V0dGluZ3MucGFyYW1zO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdmZXRjaCcsIGZ1bGxVcmwsIG1lcmdlZFNldHRpbmdzLCAncG9seWZpbGwnLCBmZXRjaC5wb2x5ZmlsbCk7XG4gICAgICAgIGxldCBmZXRjaEZuID0gT3JiaXQuZmV0Y2ggfHwgZmV0Y2g7XG4gICAgICAgIGlmIChzZXR0aW5ncy50aW1lb3V0KSB7XG4gICAgICAgICAgICBsZXQgdGltZW91dCA9IHNldHRpbmdzLnRpbWVvdXQ7XG4gICAgICAgICAgICBkZWxldGUgc2V0dGluZ3MudGltZW91dDtcbiAgICAgICAgICAgIHJldHVybiBuZXcgT3JiaXQuUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHRpbWVkT3V0O1xuICAgICAgICAgICAgICAgIGxldCB0aW1lciA9IE9yYml0Lmdsb2JhbHMuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRpbWVkT3V0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBOZXR3b3JrRXJyb3IoYE5vIGZldGNoIHJlc3BvbnNlIHdpdGhpbiAke3RpbWVvdXR9bXMuYCkpO1xuICAgICAgICAgICAgICAgIH0sIHRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIGZldGNoRm4oZnVsbFVybCwgc2V0dGluZ3MpLmNhdGNoKGUgPT4ge1xuICAgICAgICAgICAgICAgICAgICBPcmJpdC5nbG9iYWxzLmNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGltZWRPdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhhbmRsZUZldGNoRXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KS50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgT3JiaXQuZ2xvYmFscy5jbGVhclRpbWVvdXQodGltZXIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXRpbWVkT3V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVGZXRjaFJlc3BvbnNlKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZldGNoRm4oZnVsbFVybCwgc2V0dGluZ3MpLmNhdGNoKGUgPT4gdGhpcy5oYW5kbGVGZXRjaEVycm9yKGUpKS50aGVuKHJlc3BvbnNlID0+IHRoaXMuaGFuZGxlRmV0Y2hSZXNwb25zZShyZXNwb25zZSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGluaXRGZXRjaFNldHRpbmdzKGN1c3RvbVNldHRpbmdzID0ge30pIHtcbiAgICAgICAgbGV0IHNldHRpbmdzID0gZGVlcE1lcmdlKHt9LCB0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzLCBjdXN0b21TZXR0aW5ncyk7XG4gICAgICAgIGlmIChzZXR0aW5ncy5qc29uKSB7XG4gICAgICAgICAgICBhc3NlcnQoJ2Bqc29uYCBhbmQgYGJvZHlgIGNhblxcJ3QgYm90aCBiZSBzZXQgZm9yIGZldGNoIHJlcXVlc3RzLicsICFzZXR0aW5ncy5ib2R5KTtcbiAgICAgICAgICAgIHNldHRpbmdzLmJvZHkgPSBKU09OLnN0cmluZ2lmeShzZXR0aW5ncy5qc29uKTtcbiAgICAgICAgICAgIGRlbGV0ZSBzZXR0aW5ncy5qc29uO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzZXR0aW5ncy5oZWFkZXJzICYmICFzZXR0aW5ncy5ib2R5KSB7XG4gICAgICAgICAgICBkZWxldGUgc2V0dGluZ3MuaGVhZGVyc1snQ29udGVudC1UeXBlJ107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNldHRpbmdzO1xuICAgIH1cbiAgICBoYW5kbGVGZXRjaFJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDIwMSkge1xuICAgICAgICAgICAgaWYgKHRoaXMucmVzcG9uc2VIYXNDb250ZW50KHJlc3BvbnNlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBJbnZhbGlkU2VydmVyUmVzcG9uc2UoYFNlcnZlciByZXNwb25zZXMgd2l0aCBhICR7cmVzcG9uc2Uuc3RhdHVzfSBzdGF0dXMgc2hvdWxkIHJldHVybiBjb250ZW50IHdpdGggYSBDb250ZW50LVR5cGUgdGhhdCBpbmNsdWRlcyAnYXBwbGljYXRpb24vdm5kLmFwaStqc29uJy5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5zdGF0dXMgPj0gMjAwICYmIHJlc3BvbnNlLnN0YXR1cyA8IDMwMCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucmVzcG9uc2VIYXNDb250ZW50KHJlc3BvbnNlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodGhpcy5yZXNwb25zZUhhc0NvbnRlbnQocmVzcG9uc2UpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKS50aGVuKGRhdGEgPT4gdGhpcy5oYW5kbGVGZXRjaFJlc3BvbnNlRXJyb3IocmVzcG9uc2UsIGRhdGEpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlRmV0Y2hSZXNwb25zZUVycm9yKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gT3JiaXQuUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuICAgIGhhbmRsZUZldGNoUmVzcG9uc2VFcnJvcihyZXNwb25zZSwgZGF0YSkge1xuICAgICAgICBsZXQgZXJyb3I7XG4gICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPj0gNDAwICYmIHJlc3BvbnNlLnN0YXR1cyA8IDUwMCkge1xuICAgICAgICAgICAgZXJyb3IgPSBuZXcgQ2xpZW50RXJyb3IocmVzcG9uc2Uuc3RhdHVzVGV4dCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlcnJvciA9IG5ldyBTZXJ2ZXJFcnJvcihyZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBlcnJvci5yZXNwb25zZSA9IHJlc3BvbnNlO1xuICAgICAgICBlcnJvci5kYXRhID0gZGF0YTtcbiAgICAgICAgcmV0dXJuIE9yYml0LlByb21pc2UucmVqZWN0KGVycm9yKTtcbiAgICB9XG4gICAgaGFuZGxlRmV0Y2hFcnJvcihlKSB7XG4gICAgICAgIGxldCBlcnJvciA9IG5ldyBOZXR3b3JrRXJyb3IoZSk7XG4gICAgICAgIHJldHVybiBPcmJpdC5Qcm9taXNlLnJlamVjdChlcnJvcik7XG4gICAgfVxuICAgIHJlc3BvbnNlSGFzQ29udGVudChyZXNwb25zZSkge1xuICAgICAgICBsZXQgY29udGVudFR5cGUgPSByZXNwb25zZS5oZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJyk7XG4gICAgICAgIHJldHVybiBjb250ZW50VHlwZSAmJiBjb250ZW50VHlwZS5pbmRleE9mKCdhcHBsaWNhdGlvbi92bmQuYXBpK2pzb24nKSA+IC0xO1xuICAgIH1cbiAgICByZXNvdXJjZU5hbWVzcGFjZSh0eXBlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm5hbWVzcGFjZTtcbiAgICB9XG4gICAgcmVzb3VyY2VIb3N0KHR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaG9zdDtcbiAgICB9XG4gICAgcmVzb3VyY2VQYXRoKHR5cGUsIGlkKSB7XG4gICAgICAgIGxldCBwYXRoID0gW3RoaXMuc2VyaWFsaXplci5yZXNvdXJjZVR5cGUodHlwZSldO1xuICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgIGxldCByZXNvdXJjZUlkID0gdGhpcy5zZXJpYWxpemVyLnJlc291cmNlSWQodHlwZSwgaWQpO1xuICAgICAgICAgICAgaWYgKHJlc291cmNlSWQpIHtcbiAgICAgICAgICAgICAgICBwYXRoLnB1c2gocmVzb3VyY2VJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhdGguam9pbignLycpO1xuICAgIH1cbiAgICByZXNvdXJjZVVSTCh0eXBlLCBpZCkge1xuICAgICAgICBsZXQgaG9zdCA9IHRoaXMucmVzb3VyY2VIb3N0KHR5cGUpO1xuICAgICAgICBsZXQgbmFtZXNwYWNlID0gdGhpcy5yZXNvdXJjZU5hbWVzcGFjZSh0eXBlKTtcbiAgICAgICAgbGV0IHVybCA9IFtdO1xuICAgICAgICBpZiAoaG9zdCkge1xuICAgICAgICAgICAgdXJsLnB1c2goaG9zdCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5hbWVzcGFjZSkge1xuICAgICAgICAgICAgdXJsLnB1c2gobmFtZXNwYWNlKTtcbiAgICAgICAgfVxuICAgICAgICB1cmwucHVzaCh0aGlzLnJlc291cmNlUGF0aCh0eXBlLCBpZCkpO1xuICAgICAgICBpZiAoIWhvc3QpIHtcbiAgICAgICAgICAgIHVybC51bnNoaWZ0KCcnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXJsLmpvaW4oJy8nKTtcbiAgICB9XG4gICAgcmVzb3VyY2VSZWxhdGlvbnNoaXBVUkwodHlwZSwgaWQsIHJlbGF0aW9uc2hpcCkge1xuICAgICAgICByZXR1cm4gdGhpcy5yZXNvdXJjZVVSTCh0eXBlLCBpZCkgKyAnL3JlbGF0aW9uc2hpcHMvJyArIHRoaXMuc2VyaWFsaXplci5yZXNvdXJjZVJlbGF0aW9uc2hpcCh0eXBlLCByZWxhdGlvbnNoaXApO1xuICAgIH1cbiAgICByZWxhdGVkUmVzb3VyY2VVUkwodHlwZSwgaWQsIHJlbGF0aW9uc2hpcCkge1xuICAgICAgICByZXR1cm4gdGhpcy5yZXNvdXJjZVVSTCh0eXBlLCBpZCkgKyAnLycgKyB0aGlzLnNlcmlhbGl6ZXIucmVzb3VyY2VSZWxhdGlvbnNoaXAodHlwZSwgcmVsYXRpb25zaGlwKTtcbiAgICB9XG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBQcml2YXRlIG1ldGhvZHNcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIGluaXREZWZhdWx0RmV0Y2hTZXR0aW5ncyhzZXR0aW5ncykge1xuICAgICAgICB0aGlzLmRlZmF1bHRGZXRjaFNldHRpbmdzID0ge1xuICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgIEFjY2VwdDogJ2FwcGxpY2F0aW9uL3ZuZC5hcGkranNvbicsXG4gICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi92bmQuYXBpK2pzb24nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGltZW91dDogNTAwMFxuICAgICAgICB9O1xuICAgICAgICBpZiAoc2V0dGluZ3MuZGVmYXVsdEZldGNoSGVhZGVycyB8fCBzZXR0aW5ncy5kZWZhdWx0RmV0Y2hUaW1lb3V0KSB7XG4gICAgICAgICAgICBkZXByZWNhdGUoJ0pTT05BUElTb3VyY2U6IFBhc3MgYGRlZmF1bHRGZXRjaFNldHRpbmdzYCB3aXRoIGBoZWFkZXJzYCBpbnN0ZWFkIG9mIGBkZWZhdWx0RmV0Y2hIZWFkZXJzYCB0byBpbml0aWFsaXplIHNvdXJjZScsIHNldHRpbmdzLmRlZmF1bHRGZXRjaEhlYWRlcnMgPT09IHVuZGVmaW5lZCk7XG4gICAgICAgICAgICBkZXByZWNhdGUoJ0pTT05BUElTb3VyY2U6IFBhc3MgYGRlZmF1bHRGZXRjaFNldHRpbmdzYCB3aXRoIGB0aW1lb3V0YCBpbnN0ZWFkIG9mIGBkZWZhdWx0RmV0Y2hUaW1lb3V0YCB0byBpbml0aWFsaXplIHNvdXJjZScsIHNldHRpbmdzLmRlZmF1bHRGZXRjaFRpbWVvdXQgPT09IHVuZGVmaW5lZCk7XG4gICAgICAgICAgICBkZWVwTWVyZ2UodGhpcy5kZWZhdWx0RmV0Y2hTZXR0aW5ncywge1xuICAgICAgICAgICAgICAgIGhlYWRlcnM6IHNldHRpbmdzLmRlZmF1bHRGZXRjaEhlYWRlcnMsXG4gICAgICAgICAgICAgICAgdGltZW91dDogc2V0dGluZ3MuZGVmYXVsdEZldGNoVGltZW91dFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNldHRpbmdzLmRlZmF1bHRGZXRjaFNldHRpbmdzKSB7XG4gICAgICAgICAgICBkZWVwTWVyZ2UodGhpcy5kZWZhdWx0RmV0Y2hTZXR0aW5ncywgc2V0dGluZ3MuZGVmYXVsdEZldGNoU2V0dGluZ3MpO1xuICAgICAgICB9XG4gICAgfVxuICAgIF9wcm9jZXNzUmVxdWVzdHMocmVxdWVzdHMsIHByb2Nlc3NvcnMpIHtcbiAgICAgICAgbGV0IHRyYW5zZm9ybXMgPSBbXTtcbiAgICAgICAgbGV0IHJlc3VsdCA9IE9yYml0LlByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICByZXF1ZXN0cy5mb3JFYWNoKHJlcXVlc3QgPT4ge1xuICAgICAgICAgICAgbGV0IHByb2Nlc3NvciA9IHByb2Nlc3NvcnNbcmVxdWVzdC5vcF07XG4gICAgICAgICAgICByZXN1bHQgPSByZXN1bHQudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb2Nlc3Nvcih0aGlzLCByZXF1ZXN0KS50aGVuKGFkZGl0aW9uYWxUcmFuc2Zvcm1zID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFkZGl0aW9uYWxUcmFuc2Zvcm1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseSh0cmFuc2Zvcm1zLCBhZGRpdGlvbmFsVHJhbnNmb3Jtcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdC50aGVuKCgpID0+IHRyYW5zZm9ybXMpO1xuICAgIH1cbn07XG5KU09OQVBJU291cmNlID0gX19kZWNvcmF0ZShbcHVsbGFibGUsIHB1c2hhYmxlLCBxdWVyeWFibGVdLCBKU09OQVBJU291cmNlKTtcbmV4cG9ydCBkZWZhdWx0IEpTT05BUElTb3VyY2U7Il19