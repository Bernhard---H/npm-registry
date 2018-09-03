define('@orbit/jsonapi', ['exports', '@orbit/data', '@orbit/utils', '@orbit/core'], function (exports, Orbit, _orbit_utils, _orbit_core) { 'use strict';

var Orbit__default = 'default' in Orbit ? Orbit['default'] : Orbit;

var _createClass$1 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck$1(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var JSONAPISerializer = function () {
    function JSONAPISerializer(settings) {
        _classCallCheck$1(this, JSONAPISerializer);

        this._schema = settings.schema;
        this._keyMap = settings.keyMap;
    }

    JSONAPISerializer.prototype.resourceKey = function resourceKey(type) {
        return 'id';
    };

    JSONAPISerializer.prototype.resourceType = function resourceType(type) {
        return _orbit_utils.dasherize(this.schema.pluralize(type));
    };

    JSONAPISerializer.prototype.resourceRelationship = function resourceRelationship(type, relationship) {
        return _orbit_utils.dasherize(relationship);
    };

    JSONAPISerializer.prototype.resourceAttribute = function resourceAttribute(type, attr) {
        return _orbit_utils.dasherize(attr);
    };

    JSONAPISerializer.prototype.resourceIdentity = function resourceIdentity(identity) {
        return {
            type: this.resourceType(identity.type),
            id: this.resourceId(identity.type, identity.id)
        };
    };

    JSONAPISerializer.prototype.resourceIds = function resourceIds(type, ids) {
        var _this = this;

        return ids.map(function (id) {
            return _this.resourceId(type, id);
        });
    };

    JSONAPISerializer.prototype.resourceId = function resourceId(type, id) {
        var resourceKey = this.resourceKey(type);
        if (resourceKey === 'id') {
            return id;
        } else {
            return this.keyMap.idToKey(type, resourceKey, id);
        }
    };

    JSONAPISerializer.prototype.recordId = function recordId(type, resourceId) {
        var resourceKey = this.resourceKey(type);
        if (resourceKey === 'id') {
            return resourceId;
        }
        var existingId = this.keyMap.keyToId(type, resourceKey, resourceId);
        if (existingId) {
            return existingId;
        }
        return this._generateNewId(type, resourceKey, resourceId);
    };

    JSONAPISerializer.prototype.recordType = function recordType(resourceType) {
        return _orbit_utils.camelize(this.schema.singularize(resourceType));
    };

    JSONAPISerializer.prototype.recordIdentity = function recordIdentity(resourceIdentity) {
        var type = this.recordType(resourceIdentity.type);
        var id = this.recordId(type, resourceIdentity.id);
        return { type: type, id: id };
    };

    JSONAPISerializer.prototype.recordAttribute = function recordAttribute(type, resourceAttribute) {
        return _orbit_utils.camelize(resourceAttribute);
    };

    JSONAPISerializer.prototype.recordRelationship = function recordRelationship(type, resourceRelationship) {
        return _orbit_utils.camelize(resourceRelationship);
    };

    JSONAPISerializer.prototype.serializeDocument = function serializeDocument(data) {
        return {
            data: _orbit_utils.isArray(data) ? this.serializeRecords(data) : this.serializeRecord(data)
        };
    };

    JSONAPISerializer.prototype.serializeRecords = function serializeRecords(records) {
        var _this2 = this;

        return records.map(function (record) {
            return _this2.serializeRecord(record);
        });
    };

    JSONAPISerializer.prototype.serializeRecord = function serializeRecord(record) {
        var resource = {
            type: this.resourceType(record.type)
        };
        this.serializeId(resource, record);
        this.serializeAttributes(resource, record);
        this.serializeRelationships(resource, record);
        return resource;
    };

    JSONAPISerializer.prototype.serializeId = function serializeId(resource, record) {
        var value = this.resourceId(record.type, record.id);
        if (value !== undefined) {
            resource.id = value;
        }
    };

    JSONAPISerializer.prototype.serializeAttributes = function serializeAttributes(resource, record) {
        var _this3 = this;

        if (record.attributes) {
            Object.keys(record.attributes).forEach(function (attr) {
                _this3.serializeAttribute(resource, record, attr);
            });
        }
    };

    JSONAPISerializer.prototype.serializeAttribute = function serializeAttribute(resource, record, attr) {
        var value = record.attributes[attr];
        if (value !== undefined) {
            _orbit_utils.deepSet(resource, ['attributes', this.resourceAttribute(record.type, attr)], value);
        }
    };

    JSONAPISerializer.prototype.serializeRelationships = function serializeRelationships(resource, record) {
        var _this4 = this;

        if (record.relationships) {
            Object.keys(record.relationships).forEach(function (relationship) {
                _this4.serializeRelationship(resource, record, relationship);
            });
        }
    };

    JSONAPISerializer.prototype.serializeRelationship = function serializeRelationship(resource, record, relationship) {
        var _this5 = this;

        var value = record.relationships[relationship].data;
        if (value !== undefined) {
            var data = void 0;
            if (_orbit_utils.isArray(value)) {
                data = value.map(function (id) {
                    return _this5.resourceIdentity(id);
                });
            } else if (value !== null) {
                data = this.resourceIdentity(value);
            } else {
                data = null;
            }
            var resourceRelationship = this.resourceRelationship(record.type, relationship);
            _orbit_utils.deepSet(resource, ['relationships', resourceRelationship, 'data'], data);
        }
    };

    JSONAPISerializer.prototype.deserializeDocument = function deserializeDocument(document) {
        var result = void 0;
        var data = document.data;
        if (_orbit_utils.isArray(data)) {
            result = {
                data: data.map(this.deserializeResource, this)
            };
        } else if (data !== null) {
            result = {
                data: this.deserializeResource(data)
            };
        } else {
            result = { data: null };
        }
        if (document.included) {
            result.included = document.included.map(this.deserializeResource, this);
        }
        return result;
    };

    JSONAPISerializer.prototype.deserializeResource = function deserializeResource(resource) {
        var record = void 0;
        var type = this.recordType(resource.type);
        var resourceKey = this.resourceKey(type);
        if (resourceKey === 'id') {
            record = { type: type, id: resource.id };
        } else {
            var id = void 0;
            var keys = void 0;
            if (resource.id) {
                var _keys;

                keys = (_keys = {}, _keys[resourceKey] = resource.id, _keys);
                id = this.keyMap.idFromKeys(type, keys) || this.schema.generateId(type);
            } else {
                id = this.schema.generateId(type);
            }
            record = { type: type, id: id };
            if (keys) {
                record.keys = keys;
            }
        }
        this.deserializeAttributes(record, resource);
        this.deserializeRelationships(record, resource);
        if (this.keyMap) {
            this.keyMap.pushRecord(record);
        }
        return record;
    };

    JSONAPISerializer.prototype.deserializeAttributes = function deserializeAttributes(record, resource) {
        var _this6 = this;

        if (resource.attributes) {
            Object.keys(resource.attributes).forEach(function (resourceAttribute) {
                var attribute = _this6.recordAttribute(record.type, resourceAttribute);
                if (_this6.schema.hasAttribute(record.type, attribute)) {
                    var value = resource.attributes[resourceAttribute];
                    _this6.deserializeAttribute(record, attribute, value);
                }
            });
        }
    };

    JSONAPISerializer.prototype.deserializeAttribute = function deserializeAttribute(record, attr, value) {
        record.attributes = record.attributes || {};
        record.attributes[attr] = value;
    };

    JSONAPISerializer.prototype.deserializeRelationships = function deserializeRelationships(record, resource) {
        var _this7 = this;

        if (resource.relationships) {
            Object.keys(resource.relationships).forEach(function (resourceRel) {
                var relationship = _this7.recordRelationship(record.type, resourceRel);
                if (_this7.schema.hasRelationship(record.type, relationship)) {
                    var value = resource.relationships[resourceRel];
                    _this7.deserializeRelationship(record, relationship, value);
                }
            });
        }
    };

    JSONAPISerializer.prototype.deserializeRelationship = function deserializeRelationship(record, relationship, value) {
        var _this8 = this;

        var resourceData = value.data;
        if (resourceData !== undefined) {
            var data = void 0;
            if (resourceData === null) {
                data = null;
            } else if (_orbit_utils.isArray(resourceData)) {
                data = resourceData.map(function (resourceIdentity) {
                    return _this8.recordIdentity(resourceIdentity);
                });
            } else {
                data = this.recordIdentity(resourceData);
            }
            record.relationships = record.relationships || {};
            record.relationships[relationship] = { data: data };
        }
    };

    JSONAPISerializer.prototype._generateNewId = function _generateNewId(type, keyName, keyValue) {
        var _keys2;

        var id = this.schema.generateId(type);
        this.keyMap.pushRecord({
            type: type,
            id: id,
            keys: (_keys2 = {}, _keys2[keyName] = keyValue, _keys2)
        });
        return id;
    };

    _createClass$1(JSONAPISerializer, [{
        key: 'schema',
        get: function () {
            return this._schema;
        }
    }, {
        key: 'keyMap',
        get: function () {
            return this._keyMap;
        }
    }]);

    return JSONAPISerializer;
}();

function flattenObjectToParams(obj) {
    var path = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

    var params = [];
    Object.keys(obj).forEach(function (key) {
        if (!obj.hasOwnProperty(key)) {
            return;
        }
        var newPath = path.slice();
        newPath.push(key);
        if (obj[key] !== null && typeof obj[key] === 'object') {
            Array.prototype.push.apply(params, flattenObjectToParams(obj[key], newPath));
        } else {
            params.push({
                path: newPath,
                val: obj[key]
            });
        }
    });
    return params;
}
function encodeQueryParams(obj) {
    return flattenObjectToParams(obj).map(function (param) {
        if (param.path.length === 1) {
            param.path = param.path[0];
        } else {
            var firstSegment = param.path[0];
            var remainingSegments = param.path.slice(1);
            param.path = firstSegment + '[' + remainingSegments.join('][') + ']';
        }
        return param;
    }).map(function (param) {
        return encodeURIComponent(param.path) + '=' + encodeURIComponent(param.val);
    }).join('&');
}
function appendQueryParams(url, obj) {
    var fullUrl = url;
    var queryParams = encodeQueryParams(obj);
    if (queryParams.length > 0) {
        if (fullUrl.indexOf('?') === -1) {
            fullUrl += '?';
        } else {
            fullUrl += '&';
        }
        fullUrl += queryParams;
    }
    return fullUrl;
}

function customRequestOptions(source, queryOrTransform) {
    return _orbit_utils.deepGet(queryOrTransform, ['options', 'sources', source.name]);
}
function buildFetchSettings() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var customSettings = arguments[1];

    var settings = options.settings ? _orbit_utils.clone(options.settings) : {};
    if (customSettings) {
        _orbit_utils.deepMerge(settings, customSettings);
    }
    ['filter', 'include', 'page', 'sort'].forEach(function (param) {
        if (options[param]) {
            var value = options[param];
            if (param === 'include' && _orbit_utils.isArray(value)) {
                value = value.join(',');
            }
            _orbit_utils.deepSet(settings, ['params', param], value);
        }
    });
    if (options['timeout']) {
        _orbit_utils.deprecate("JSONAPI: Specify `timeout` option inside a `settings` object.");
        settings.timeout = options['timeout'];
    }
    return settings;
}

function deserialize(source, document) {
    var deserialized = source.serializer.deserializeDocument(document);
    var records = _orbit_utils.toArray(deserialized.data);
    if (deserialized.included) {
        Array.prototype.push.apply(records, deserialized.included);
    }
    var operations = records.map(function (record) {
        return {
            op: 'replaceRecord',
            record: record
        };
    });
    return [Orbit.buildTransform(operations)];
}
var PullOperators = {
    findRecord: function (source, query) {
        var expression = query.expression;
        var record = expression.record;

        var requestOptions = customRequestOptions(source, query);
        var settings = buildFetchSettings(requestOptions);
        return source.fetch(source.resourceURL(record.type, record.id), settings).then(function (data) {
            return deserialize(source, data);
        });
    },
    findRecords: function (source, query) {
        var expression = query.expression;
        var type = expression.type;

        var requestOptions = {};
        if (expression.filter) {
            requestOptions.filter = buildFilterParam(source, expression.filter);
        }
        if (expression.sort) {
            requestOptions.sort = buildSortParam(source, expression.sort);
        }
        if (expression.page) {
            requestOptions.page = expression.page;
        }
        var customOptions = customRequestOptions(source, query);
        if (customOptions) {
            _orbit_utils.merge(requestOptions, customOptions);
        }
        var settings = buildFetchSettings(requestOptions);
        return source.fetch(source.resourceURL(type), settings).then(function (data) {
            return deserialize(source, data);
        });
    },
    findRelatedRecord: function (source, query) {
        var expression = query.expression;
        var record = expression.record,
            relationship = expression.relationship;

        var requestOptions = customRequestOptions(source, query);
        var settings = buildFetchSettings(requestOptions);
        return source.fetch(source.relatedResourceURL(record.type, record.id, relationship), settings).then(function (data) {
            return deserialize(source, data);
        });
    },
    findRelatedRecords: function (source, query) {
        var expression = query.expression;
        var record = expression.record,
            relationship = expression.relationship;

        var requestOptions = customRequestOptions(source, query);
        var settings = buildFetchSettings(requestOptions);
        return source.fetch(source.relatedResourceURL(record.type, record.id, relationship), settings).then(function (data) {
            return deserialize(source, data);
        });
    }
};
function buildFilterParam(source, filterSpecifiers) {
    var filters = {};
    filterSpecifiers.forEach(function (filterSpecifier) {
        if (filterSpecifier.kind === 'attribute' && filterSpecifier.op === 'equal') {
            var attributeFilter = filterSpecifier;
            // Note: We don't know the `type` of the attribute here, so passing `null`
            var resourceAttribute = source.serializer.resourceAttribute(null, attributeFilter.attribute);
            filters[resourceAttribute] = attributeFilter.value;
        } else if (filterSpecifier.kind === 'relatedRecord') {
            var relatedRecordFilter = filterSpecifier;
            if (Array.isArray(relatedRecordFilter.record)) {
                filters[relatedRecordFilter.relation] = relatedRecordFilter.record.map(function (e) {
                    return e.id;
                }).join(',');
            } else {
                filters[relatedRecordFilter.relation] = relatedRecordFilter.record.id;
            }
        } else if (filterSpecifier.kind === 'relatedRecords') {
            if (filterSpecifier.op !== 'equal') {
                throw new Error('Operation "' + filterSpecifier.op + '" is not supported in JSONAPI for relatedRecords filtering');
            }
            var relatedRecordsFilter = filterSpecifier;
            filters[relatedRecordsFilter.relation] = relatedRecordsFilter.records.map(function (e) {
                return e.id;
            }).join(',');
        } else {
            throw new Orbit.QueryExpressionParseError('Filter operation ' + filterSpecifier.op + ' not recognized for JSONAPISource.', filterSpecifier);
        }
    });
    return filters;
}
function buildSortParam(source, sortSpecifiers) {
    return sortSpecifiers.map(function (sortSpecifier) {
        if (sortSpecifier.kind === 'attribute') {
            var attributeSort = sortSpecifier;
            // Note: We don't know the `type` of the attribute here, so passing `null`
            var resourceAttribute = source.serializer.resourceAttribute(null, attributeSort.attribute);
            return (sortSpecifier.order === 'descending' ? '-' : '') + resourceAttribute;
        }
        throw new Orbit.QueryExpressionParseError('Sort specifier ' + sortSpecifier.kind + ' not recognized for JSONAPISource.', sortSpecifier);
    }).join(',');
}

var TransformRequestProcessors = {
    addRecord: function (source, request) {
        var serializer = source.serializer;

        var record = request.record;
        var requestDoc = serializer.serializeDocument(record);
        var settings = buildFetchSettings(request.options, { method: 'POST', json: requestDoc });
        return source.fetch(source.resourceURL(record.type), settings).then(function (raw) {
            var responseDoc = serializer.deserializeDocument(raw);
            var updatedRecord = responseDoc.data;
            var updateOps = Orbit.recordDiffs(record, updatedRecord);
            if (updateOps.length > 0) {
                return [Orbit.buildTransform(updateOps)];
            }
        });
    },
    removeRecord: function (source, request) {
        var _request$record = request.record,
            type = _request$record.type,
            id = _request$record.id;

        var settings = buildFetchSettings(request.options, { method: 'DELETE' });
        return source.fetch(source.resourceURL(type, id), settings).then(function () {
            return [];
        });
    },
    replaceRecord: function (source, request) {
        var record = request.record;
        var type = record.type,
            id = record.id;

        var requestDoc = source.serializer.serializeDocument(record);
        var settings = buildFetchSettings(request.options, { method: 'PATCH', json: requestDoc });
        return source.fetch(source.resourceURL(type, id), settings).then(function () {
            return [];
        });
    },
    addToRelatedRecords: function (source, request) {
        var _request$record2 = request.record,
            type = _request$record2.type,
            id = _request$record2.id;
        var relationship = request.relationship;

        var json = {
            data: request.relatedRecords.map(function (r) {
                return source.serializer.resourceIdentity(r);
            })
        };
        var settings = buildFetchSettings(request.options, { method: 'POST', json: json });
        return source.fetch(source.resourceRelationshipURL(type, id, relationship), settings).then(function () {
            return [];
        });
    },
    removeFromRelatedRecords: function (source, request) {
        var _request$record3 = request.record,
            type = _request$record3.type,
            id = _request$record3.id;
        var relationship = request.relationship;

        var json = {
            data: request.relatedRecords.map(function (r) {
                return source.serializer.resourceIdentity(r);
            })
        };
        var settings = buildFetchSettings(request.options, { method: 'DELETE', json: json });
        return source.fetch(source.resourceRelationshipURL(type, id, relationship), settings).then(function () {
            return [];
        });
    },
    replaceRelatedRecord: function (source, request) {
        var _request$record4 = request.record,
            type = _request$record4.type,
            id = _request$record4.id;
        var relationship = request.relationship,
            relatedRecord = request.relatedRecord;

        var json = {
            data: relatedRecord ? source.serializer.resourceIdentity(relatedRecord) : null
        };
        var settings = buildFetchSettings(request.options, { method: 'PATCH', json: json });
        return source.fetch(source.resourceRelationshipURL(type, id, relationship), settings).then(function () {
            return [];
        });
    },
    replaceRelatedRecords: function (source, request) {
        var _request$record5 = request.record,
            type = _request$record5.type,
            id = _request$record5.id;
        var relationship = request.relationship,
            relatedRecords = request.relatedRecords;

        var json = {
            data: relatedRecords.map(function (r) {
                return source.serializer.resourceIdentity(r);
            })
        };
        var settings = buildFetchSettings(request.options, { method: 'PATCH', json: json });
        return source.fetch(source.resourceRelationshipURL(type, id, relationship), settings).then(function () {
            return [];
        });
    }
};
function getTransformRequests(source, transform) {
    var requests = [];
    var prevRequest = void 0;
    transform.operations.forEach(function (operation) {
        var request = void 0;
        var newRequestNeeded = true;
        if (prevRequest && Orbit.equalRecordIdentities(prevRequest.record, operation.record)) {
            if (operation.op === 'removeRecord') {
                newRequestNeeded = false;
                if (prevRequest.op !== 'removeRecord') {
                    prevRequest = null;
                    requests.pop();
                }
            } else if (prevRequest.op === 'addRecord' || prevRequest.op === 'replaceRecord') {
                if (operation.op === 'replaceAttribute') {
                    newRequestNeeded = false;
                    replaceRecordAttribute(prevRequest.record, operation.attribute, operation.value);
                } else if (operation.op === 'replaceRelatedRecord') {
                    newRequestNeeded = false;
                    replaceRecordHasOne(prevRequest.record, operation.relationship, operation.relatedRecord);
                } else if (operation.op === 'replaceRelatedRecords') {
                    newRequestNeeded = false;
                    replaceRecordHasMany(prevRequest.record, operation.relationship, operation.relatedRecords);
                }
            } else if (prevRequest.op === 'addToRelatedRecords' && operation.op === 'addToRelatedRecords' && prevRequest.relationship === operation.relationship) {
                newRequestNeeded = false;
                prevRequest.relatedRecords.push(Orbit.cloneRecordIdentity(operation.relatedRecord));
            }
        }
        if (newRequestNeeded) {
            request = OperationToRequestMap[operation.op](operation);
        }
        if (request) {
            var options = customRequestOptions(source, transform);
            if (options) {
                request.options = options;
            }
            requests.push(request);
            prevRequest = request;
        }
    });
    return requests;
}
var OperationToRequestMap = {
    addRecord: function (operation) {
        return {
            op: 'addRecord',
            record: _orbit_utils.clone(operation.record)
        };
    },
    removeRecord: function (operation) {
        return {
            op: 'removeRecord',
            record: Orbit.cloneRecordIdentity(operation.record)
        };
    },
    replaceAttribute: function (operation) {
        var record = Orbit.cloneRecordIdentity(operation.record);
        replaceRecordAttribute(record, operation.attribute, operation.value);
        return {
            op: 'replaceRecord',
            record: record
        };
    },
    replaceRecord: function (operation) {
        return {
            op: 'replaceRecord',
            record: _orbit_utils.clone(operation.record)
        };
    },
    addToRelatedRecords: function (operation) {
        return {
            op: 'addToRelatedRecords',
            record: Orbit.cloneRecordIdentity(operation.record),
            relationship: operation.relationship,
            relatedRecords: [Orbit.cloneRecordIdentity(operation.relatedRecord)]
        };
    },
    removeFromRelatedRecords: function (operation) {
        return {
            op: 'removeFromRelatedRecords',
            record: Orbit.cloneRecordIdentity(operation.record),
            relationship: operation.relationship,
            relatedRecords: [Orbit.cloneRecordIdentity(operation.relatedRecord)]
        };
    },
    replaceRelatedRecord: function (operation) {
        var record = {
            type: operation.record.type,
            id: operation.record.id
        };
        _orbit_utils.deepSet(record, ['relationships', operation.relationship, 'data'], operation.relatedRecord);
        return {
            op: 'replaceRecord',
            record: record
        };
    },
    replaceRelatedRecords: function (operation) {
        var record = Orbit.cloneRecordIdentity(operation.record);
        _orbit_utils.deepSet(record, ['relationships', operation.relationship, 'data'], operation.relatedRecords);
        return {
            op: 'replaceRecord',
            record: record
        };
    }
};
function replaceRecordAttribute(record, attribute, value) {
    _orbit_utils.deepSet(record, ['attributes', attribute], value);
}
function replaceRecordHasOne(record, relationship, relatedRecord) {
    _orbit_utils.deepSet(record, ['relationships', relationship, 'data'], relatedRecord ? Orbit.cloneRecordIdentity(relatedRecord) : null);
}
function replaceRecordHasMany(record, relationship, relatedRecords) {
    _orbit_utils.deepSet(record, ['relationships', relationship, 'data'], relatedRecords.map(function (r) {
        return Orbit.cloneRecordIdentity(r);
    }));
}

function _defaults$1(obj, defaults) { var keys = Object.getOwnPropertyNames(defaults); for (var i = 0; i < keys.length; i++) { var key = keys[i]; var value = Object.getOwnPropertyDescriptor(defaults, key); if (value && value.configurable && obj[key] === undefined) { Object.defineProperty(obj, key, value); } } return obj; }

function _classCallCheck$2(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn$1(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits$1(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : _defaults$1(subClass, superClass); }

var InvalidServerResponse = function (_Exception) {
    _inherits$1(InvalidServerResponse, _Exception);

    function InvalidServerResponse(response) {
        _classCallCheck$2(this, InvalidServerResponse);

        var _this = _possibleConstructorReturn$1(this, _Exception.call(this, 'Invalid server response: ' + response));

        _this.response = response;
        return _this;
    }

    return InvalidServerResponse;
}(_orbit_core.Exception);

function deserialize$1(source, document) {
    var deserialized = source.serializer.deserializeDocument(document);
    var records = _orbit_utils.toArray(deserialized.data);
    if (deserialized.included) {
        Array.prototype.push.apply(records, deserialized.included);
    }
    return records;
}
var QueryOperators = {
    findRecord: function (source, query) {
        var expression = query.expression;
        var record = expression.record;

        var requestOptions = customRequestOptions(source, query);
        var settings = buildFetchSettings(requestOptions);
        return source.fetch(source.resourceURL(record.type, record.id), settings).then(function (data) {
            return deserialize$1(source, data);
        });
    },
    findRecords: function (source, query) {
        var expression = query.expression;
        var type = expression.type;

        var requestOptions = {};
        if (expression.filter) {
            requestOptions.filter = buildFilterParam$1(source, expression.filter);
        }
        if (expression.sort) {
            requestOptions.sort = buildSortParam$1(source, expression.sort);
        }
        if (expression.page) {
            requestOptions.page = expression.page;
        }
        var customOptions = customRequestOptions(source, query);
        if (customOptions) {
            _orbit_utils.merge(requestOptions, customOptions);
        }
        var settings = buildFetchSettings(requestOptions);
        return source.fetch(source.resourceURL(type), settings).then(function (data) {
            return deserialize$1(source, data);
        });
    },
    findRelatedRecord: function (source, query) {
        var expression = query.expression;
        var record = expression.record,
            relationship = expression.relationship;

        var requestOptions = customRequestOptions(source, query);
        var settings = buildFetchSettings(requestOptions);
        return source.fetch(source.relatedResourceURL(record.type, record.id, relationship), settings).then(function (data) {
            return deserialize$1(source, data);
        });
    },
    findRelatedRecords: function (source, query) {
        var expression = query.expression;
        var record = expression.record,
            relationship = expression.relationship;

        var requestOptions = customRequestOptions(source, query);
        var settings = buildFetchSettings(requestOptions);
        return source.fetch(source.relatedResourceURL(record.type, record.id, relationship), settings).then(function (data) {
            return deserialize$1(source, data);
        });
    }
};
function buildFilterParam$1(source, filterSpecifiers) {
    var filters = {};
    filterSpecifiers.forEach(function (filterSpecifier) {
        if (filterSpecifier.kind === 'attribute' && filterSpecifier.op === 'equal') {
            var attributeFilter = filterSpecifier;
            // Note: We don't know the `type` of the attribute here, so passing `null`
            var resourceAttribute = source.serializer.resourceAttribute(null, attributeFilter.attribute);
            filters[resourceAttribute] = attributeFilter.value;
        } else if (filterSpecifier.kind === 'relatedRecord') {
            var relatedRecordFilter = filterSpecifier;
            if (Array.isArray(relatedRecordFilter.record)) {
                filters[relatedRecordFilter.relation] = relatedRecordFilter.record.map(function (e) {
                    return e.id;
                }).join(',');
            } else {
                filters[relatedRecordFilter.relation] = relatedRecordFilter.record.id;
            }
        } else if (filterSpecifier.kind === 'relatedRecords') {
            if (filterSpecifier.op !== 'equal') {
                throw new Error('Operation "' + filterSpecifier.op + '" is not supported in JSONAPI for relatedRecords filtering');
            }
            var relatedRecordsFilter = filterSpecifier;
            filters[relatedRecordsFilter.relation] = relatedRecordsFilter.records.map(function (e) {
                return e.id;
            }).join(',');
        } else {
            throw new Orbit.QueryExpressionParseError('Filter operation ' + filterSpecifier.op + ' not recognized for JSONAPISource.', filterSpecifier);
        }
    });
    return filters;
}
function buildSortParam$1(source, sortSpecifiers) {
    return sortSpecifiers.map(function (sortSpecifier) {
        if (sortSpecifier.kind === 'attribute') {
            var attributeSort = sortSpecifier;
            // Note: We don't know the `type` of the attribute here, so passing `null`
            var resourceAttribute = source.serializer.resourceAttribute(null, attributeSort.attribute);
            return (sortSpecifier.order === 'descending' ? '-' : '') + resourceAttribute;
        }
        throw new Orbit.QueryExpressionParseError('Sort specifier ' + sortSpecifier.kind + ' not recognized for JSONAPISource.', sortSpecifier);
    }).join(',');
}

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _defaults(obj, defaults) { var keys = Object.getOwnPropertyNames(defaults); for (var i = 0; i < keys.length; i++) { var key = keys[i]; var value = Object.getOwnPropertyDescriptor(defaults, key); if (value && value.configurable && obj[key] === undefined) { Object.defineProperty(obj, key, value); } } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : _defaults(subClass, superClass); }

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

        _orbit_utils.assert('JSONAPISource\'s `schema` must be specified in `settings.schema` constructor argument', !!settings.schema);
        _orbit_utils.assert('JSONAPISource requires Orbit.Promise be defined', Orbit__default.Promise);
        _orbit_utils.assert('JSONAPISource requires Orbit.fetch be defined', Orbit__default.fetch || fetch);
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
            return Orbit__default.Promise.resolve().then(function () {
                throw new Orbit.TransformNotAllowed("This transform requires " + requests.length + " requests, which exceeds the specified limit of " + _this2.maxRequestsPerTransform + " requests per transform.", transform);
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
        var fetchFn = Orbit__default.fetch || fetch;
        if (settings.timeout) {
            var timeout = settings.timeout;
            delete settings.timeout;
            return new Orbit__default.Promise(function (resolve, reject) {
                var timedOut = void 0;
                var timer = Orbit__default.globals.setTimeout(function () {
                    timedOut = true;
                    reject(new Orbit.NetworkError("No fetch response within " + timeout + "ms."));
                }, timeout);
                fetchFn(fullUrl, settings).catch(function (e) {
                    Orbit__default.globals.clearTimeout(timer);
                    if (!timedOut) {
                        return _this3.handleFetchError(e);
                    }
                }).then(function (response) {
                    Orbit__default.globals.clearTimeout(timer);
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

        var settings = _orbit_utils.deepMerge({}, this.defaultFetchSettings, customSettings);
        if (settings.json) {
            _orbit_utils.assert('`json` and `body` can\'t both be set for fetch requests.', !settings.body);
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
        return Orbit__default.Promise.resolve();
    };

    JSONAPISource.prototype.handleFetchResponseError = function handleFetchResponseError(response, data) {
        var error = void 0;
        if (response.status >= 400 && response.status < 500) {
            error = new Orbit.ClientError(response.statusText);
        } else {
            error = new Orbit.ServerError(response.statusText);
        }
        error.response = response;
        error.data = data;
        return Orbit__default.Promise.reject(error);
    };

    JSONAPISource.prototype.handleFetchError = function handleFetchError(e) {
        var error = new Orbit.NetworkError(e);
        return Orbit__default.Promise.reject(error);
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
            _orbit_utils.deprecate('JSONAPISource: Pass `defaultFetchSettings` with `headers` instead of `defaultFetchHeaders` to initialize source', settings.defaultFetchHeaders === undefined);
            _orbit_utils.deprecate('JSONAPISource: Pass `defaultFetchSettings` with `timeout` instead of `defaultFetchTimeout` to initialize source', settings.defaultFetchTimeout === undefined);
            _orbit_utils.deepMerge(this.defaultFetchSettings, {
                headers: settings.defaultFetchHeaders,
                timeout: settings.defaultFetchTimeout
            });
        }
        if (settings.defaultFetchSettings) {
            _orbit_utils.deepMerge(this.defaultFetchSettings, settings.defaultFetchSettings);
        }
    };

    JSONAPISource.prototype._processRequests = function _processRequests(requests, processors) {
        var _this5 = this;

        var transforms = [];
        var result = Orbit__default.Promise.resolve();
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
            _orbit_utils.deprecate('JSONAPISource: Access `defaultFetchSettings.headers` instead of `defaultFetchHeaders`');
            return this.defaultFetchSettings.headers;
        },
        set: function (headers) {
            _orbit_utils.deprecate('JSONAPISource: Access `defaultFetchSettings.headers` instead of `defaultFetchHeaders`');
            this.defaultFetchSettings.headers = headers;
        }
    }, {
        key: "defaultFetchTimeout",
        get: function () {
            _orbit_utils.deprecate('JSONAPISource: Access `defaultFetchSettings.timeout` instead of `defaultFetchTimeout`');
            return this.defaultFetchSettings.timeout;
        },
        set: function (timeout) {
            _orbit_utils.deprecate('JSONAPISource: Access `defaultFetchSettings.timeout` instead of `defaultFetchTimeout`');
            this.defaultFetchSettings.timeout = timeout;
        }
    }]);

    return JSONAPISource;
}(Orbit.Source);
JSONAPISource = __decorate([Orbit.pullable, Orbit.pushable, Orbit.queryable], JSONAPISource);
var JSONAPISource$1 = JSONAPISource;

exports['default'] = JSONAPISource$1;
exports.JSONAPISerializer = JSONAPISerializer;

Object.defineProperty(exports, '__esModule', { value: true });

});
