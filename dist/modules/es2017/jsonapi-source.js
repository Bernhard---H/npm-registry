var __decorate = this && this.__decorate || function (decorators, target, key, desc) {
    var c = arguments.length,
        r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc,
        d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
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
let JSONAPISource = class JSONAPISource extends Source {
    constructor(settings = {}) {
        assert('JSONAPISource\'s `schema` must be specified in `settings.schema` constructor argument', !!settings.schema);
        assert('JSONAPISource requires Orbit.Promise be defined', Orbit.Promise);
        settings.name = settings.name || 'jsonapi';
        super(settings);
        this.namespace = settings.namespace;
        this.host = settings.host;
        this.initDefaultFetchSettings(settings);
        this.maxRequestsPerTransform = settings.maxRequestsPerTransform;
        const SerializerClass = settings.SerializerClass || JSONAPISerializer;
        this.serializer = new SerializerClass({ schema: settings.schema, keyMap: settings.keyMap });
    }
    get defaultFetchHeaders() {
        deprecate('JSONAPISource: Access `defaultFetchSettings.headers` instead of `defaultFetchHeaders`');
        return this.defaultFetchSettings.headers;
    }
    set defaultFetchHeaders(headers) {
        deprecate('JSONAPISource: Access `defaultFetchSettings.headers` instead of `defaultFetchHeaders`');
        this.defaultFetchSettings.headers = headers;
    }
    get defaultFetchTimeout() {
        deprecate('JSONAPISource: Access `defaultFetchSettings.timeout` instead of `defaultFetchTimeout`');
        return this.defaultFetchSettings.timeout;
    }
    set defaultFetchTimeout(timeout) {
        deprecate('JSONAPISource: Access `defaultFetchSettings.timeout` instead of `defaultFetchTimeout`');
        this.defaultFetchSettings.timeout = timeout;
    }
    /////////////////////////////////////////////////////////////////////////////
    // Pushable interface implementation
    /////////////////////////////////////////////////////////////////////////////
    _push(transform) {
        const requests = getTransformRequests(this, transform);
        if (this.maxRequestsPerTransform && requests.length > this.maxRequestsPerTransform) {
            return Orbit.Promise.resolve().then(() => {
                throw new TransformNotAllowed(`This transform requires ${requests.length} requests, which exceeds the specified limit of ${this.maxRequestsPerTransform} requests per transform.`, transform);
            });
        }
        return this._processRequests(requests, TransformRequestProcessors).then(transforms => {
            transforms.unshift(transform);
            return transforms;
        });
    }
    /////////////////////////////////////////////////////////////////////////////
    // Pullable interface implementation
    /////////////////////////////////////////////////////////////////////////////
    _pull(query) {
        const operator = PullOperators[query.expression.op];
        if (!operator) {
            throw new Error('JSONAPISource does not support the `${query.expression.op}` operator for queries.');
        }
        return operator(this, query);
    }
    /////////////////////////////////////////////////////////////////////////////
    // Queryable interface implementation
    /////////////////////////////////////////////////////////////////////////////
    _query(query) {
        const operator = QueryOperators[query.expression.op];
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
            fullUrl = appendQueryParams(fullUrl, settings.params);
            delete settings.params;
        }
        // console.log('fetch', fullUrl, mergedSettings, 'polyfill', fetch.polyfill);
        let fetchFn = Orbit.fetch || fetch;
        if (settings.timeout) {
            let timeout = settings.timeout;
            delete settings.timeout;
            return new Orbit.Promise((resolve, reject) => {
                let timedOut;
                let timer = Orbit.globals.setTimeout(() => {
                    timedOut = true;
                    reject(new NetworkError(`No fetch response within ${timeout}ms.`));
                }, timeout);
                fetchFn(fullUrl, settings).catch(e => {
                    Orbit.globals.clearTimeout(timer);
                    if (!timedOut) {
                        return this.handleFetchError(e);
                    }
                }).then(response => {
                    Orbit.globals.clearTimeout(timer);
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
        let settings = deepMerge({}, this.defaultFetchSettings, customSettings);
        if (settings.json) {
            assert('`json` and `body` can\'t both be set for fetch requests.', !settings.body);
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
                throw new InvalidServerResponse(`Server responses with a ${response.status} status should return content with a Content-Type that includes 'application/vnd.api+json'.`);
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
        return Orbit.Promise.resolve();
    }
    handleFetchResponseError(response, data) {
        let error;
        if (response.status >= 400 && response.status < 500) {
            error = new ClientError(response.statusText);
        } else {
            error = new ServerError(response.statusText);
        }
        error.response = response;
        error.data = data;
        return Orbit.Promise.reject(error);
    }
    handleFetchError(e) {
        let error = new NetworkError(e);
        return Orbit.Promise.reject(error);
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
    }
    _processRequests(requests, processors) {
        let transforms = [];
        let result = Orbit.Promise.resolve();
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
JSONAPISource = __decorate([pullable, pushable, queryable], JSONAPISource);
export default JSONAPISource;