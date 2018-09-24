"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _utils = require("@orbit/utils");

var _createClass = function () {
    function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
        }
    }return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
    };
}();

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}

var JSONAPISerializer = function () {
    function JSONAPISerializer(settings) {
        _classCallCheck(this, JSONAPISerializer);

        this._schema = settings.schema;
        this._keyMap = settings.keyMap;
    }

    JSONAPISerializer.prototype.resourceKey = function resourceKey(type) {
        return 'id';
    };

    JSONAPISerializer.prototype.resourceType = function resourceType(type) {
        return (0, _utils.dasherize)(this.schema.pluralize(type));
    };

    JSONAPISerializer.prototype.resourceRelationship = function resourceRelationship(type, relationship) {
        return (0, _utils.dasherize)(relationship);
    };

    JSONAPISerializer.prototype.resourceAttribute = function resourceAttribute(type, attr) {
        return (0, _utils.dasherize)(attr);
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
        return (0, _utils.camelize)(this.schema.singularize(resourceType));
    };

    JSONAPISerializer.prototype.recordIdentity = function recordIdentity(resourceIdentity) {
        var type = this.recordType(resourceIdentity.type);
        var id = this.recordId(type, resourceIdentity.id);
        return { type: type, id: id };
    };

    JSONAPISerializer.prototype.recordAttribute = function recordAttribute(type, resourceAttribute) {
        return (0, _utils.camelize)(resourceAttribute);
    };

    JSONAPISerializer.prototype.recordRelationship = function recordRelationship(type, resourceRelationship) {
        return (0, _utils.camelize)(resourceRelationship);
    };

    JSONAPISerializer.prototype.serializeDocument = function serializeDocument(data) {
        return {
            data: (0, _utils.isArray)(data) ? this.serializeRecords(data) : this.serializeRecord(data)
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
            (0, _utils.deepSet)(resource, ['attributes', this.resourceAttribute(record.type, attr)], value);
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
            if ((0, _utils.isArray)(value)) {
                data = value.map(function (id) {
                    return _this5.resourceIdentity(id);
                });
            } else if (value !== null) {
                data = this.resourceIdentity(value);
            } else {
                data = null;
            }
            var resourceRelationship = this.resourceRelationship(record.type, relationship);
            (0, _utils.deepSet)(resource, ['relationships', resourceRelationship, 'data'], data);
        }
    };

    JSONAPISerializer.prototype.deserializeDocument = function deserializeDocument(document, primaryRecordData) {
        var _this6 = this;

        var result = void 0;
        var data = void 0;
        if ((0, _utils.isArray)(document.data)) {
            if (primaryRecordData !== undefined) {
                data = document.data.map(function (entry, i) {
                    return _this6.deserializeResource(entry, primaryRecordData[i]);
                });
            } else {
                data = document.data.map(function (entry, i) {
                    return _this6.deserializeResource(entry);
                });
            }
        } else if (document.data !== null) {
            if (primaryRecordData !== undefined) {
                data = this.deserializeResource(document.data, primaryRecordData);
            } else {
                data = this.deserializeResource(document.data);
            }
        } else {
            data = null;
        }
        result = { data: data };
        if (document.included) {
            result.included = document.included.map(function (e) {
                return _this6.deserializeResource(e);
            });
        }
        return result;
    };

    JSONAPISerializer.prototype.deserializeResource = function deserializeResource(resource, primaryRecord) {
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
                id = primaryRecord && primaryRecord.id || this.keyMap.idFromKeys(type, keys) || this.schema.generateId(type);
            } else {
                id = primaryRecord && primaryRecord.id || this.schema.generateId(type);
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
        var _this7 = this;

        if (resource.attributes) {
            Object.keys(resource.attributes).forEach(function (resourceAttribute) {
                var attribute = _this7.recordAttribute(record.type, resourceAttribute);
                if (_this7.schema.hasAttribute(record.type, attribute)) {
                    var value = resource.attributes[resourceAttribute];
                    _this7.deserializeAttribute(record, attribute, value);
                }
            });
        }
    };

    JSONAPISerializer.prototype.deserializeAttribute = function deserializeAttribute(record, attr, value) {
        record.attributes = record.attributes || {};
        record.attributes[attr] = value;
    };

    JSONAPISerializer.prototype.deserializeRelationships = function deserializeRelationships(record, resource) {
        var _this8 = this;

        if (resource.relationships) {
            Object.keys(resource.relationships).forEach(function (resourceRel) {
                var relationship = _this8.recordRelationship(record.type, resourceRel);
                if (_this8.schema.hasRelationship(record.type, relationship)) {
                    var value = resource.relationships[resourceRel];
                    _this8.deserializeRelationship(record, relationship, value);
                }
            });
        }
    };

    JSONAPISerializer.prototype.deserializeRelationship = function deserializeRelationship(record, relationship, value) {
        var _this9 = this;

        var resourceData = value.data;
        if (resourceData !== undefined) {
            var data = void 0;
            if (resourceData === null) {
                data = null;
            } else if ((0, _utils.isArray)(resourceData)) {
                data = resourceData.map(function (resourceIdentity) {
                    return _this9.recordIdentity(resourceIdentity);
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

    _createClass(JSONAPISerializer, [{
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

exports.default = JSONAPISerializer;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpzb25hcGktc2VyaWFsaXplci5qcyJdLCJuYW1lcyI6WyJKU09OQVBJU2VyaWFsaXplciIsInNldHRpbmdzIiwicmVzb3VyY2VLZXkiLCJ0eXBlIiwicmVzb3VyY2VUeXBlIiwiZGFzaGVyaXplIiwicmVzb3VyY2VSZWxhdGlvbnNoaXAiLCJyZWxhdGlvbnNoaXAiLCJyZXNvdXJjZUF0dHJpYnV0ZSIsImF0dHIiLCJyZXNvdXJjZUlkZW50aXR5IiwiaWRlbnRpdHkiLCJpZCIsInJlc291cmNlSWRzIiwiaWRzIiwicmVzb3VyY2VJZCIsInJlY29yZElkIiwiZXhpc3RpbmdJZCIsInJlY29yZFR5cGUiLCJjYW1lbGl6ZSIsInJlY29yZElkZW50aXR5IiwicmVjb3JkQXR0cmlidXRlIiwicmVjb3JkUmVsYXRpb25zaGlwIiwic2VyaWFsaXplRG9jdW1lbnQiLCJkYXRhIiwiaXNBcnJheSIsInNlcmlhbGl6ZVJlY29yZHMiLCJyZWNvcmRzIiwic2VyaWFsaXplUmVjb3JkIiwicmVjb3JkIiwicmVzb3VyY2UiLCJzZXJpYWxpemVJZCIsInZhbHVlIiwic2VyaWFsaXplQXR0cmlidXRlcyIsIk9iamVjdCIsInNlcmlhbGl6ZUF0dHJpYnV0ZSIsImRlZXBTZXQiLCJzZXJpYWxpemVSZWxhdGlvbnNoaXBzIiwic2VyaWFsaXplUmVsYXRpb25zaGlwIiwiZGVzZXJpYWxpemVEb2N1bWVudCIsImRvY3VtZW50IiwicHJpbWFyeVJlY29yZERhdGEiLCJyZXN1bHQiLCJkZXNlcmlhbGl6ZVJlc291cmNlIiwicHJpbWFyeVJlY29yZCIsImtleXMiLCJkZXNlcmlhbGl6ZUF0dHJpYnV0ZXMiLCJhdHRyaWJ1dGUiLCJkZXNlcmlhbGl6ZUF0dHJpYnV0ZSIsImRlc2VyaWFsaXplUmVsYXRpb25zaGlwcyIsImRlc2VyaWFsaXplUmVsYXRpb25zaGlwIiwicmVzb3VyY2VEYXRhIiwiX2dlbmVyYXRlTmV3SWQiLCJrZXlOYW1lIiwia2V5VmFsdWUiXSwibWFwcGluZ3MiOiI7Ozs7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QUEsRUFBQTs7Ozs7eUJBL05TO0FBQ1QsbUJBQU8sS0FBUCxPQUFBO0FBQ0g7Ozt5QkFDWTtBQUNULG1CQUFPLEtBQVAsT0FBQTtBQUNIOzs7Ozs7a0JBVmdCN0MsaUIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBpc0FycmF5LCBkYXNoZXJpemUsIGNhbWVsaXplLCBkZWVwU2V0IH0gZnJvbSAnQG9yYml0L3V0aWxzJztcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEpTT05BUElTZXJpYWxpemVyIHtcbiAgICBjb25zdHJ1Y3RvcihzZXR0aW5ncykge1xuICAgICAgICB0aGlzLl9zY2hlbWEgPSBzZXR0aW5ncy5zY2hlbWE7XG4gICAgICAgIHRoaXMuX2tleU1hcCA9IHNldHRpbmdzLmtleU1hcDtcbiAgICB9XG4gICAgZ2V0IHNjaGVtYSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NjaGVtYTtcbiAgICB9XG4gICAgZ2V0IGtleU1hcCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2tleU1hcDtcbiAgICB9XG4gICAgcmVzb3VyY2VLZXkodHlwZSkge1xuICAgICAgICByZXR1cm4gJ2lkJztcbiAgICB9XG4gICAgcmVzb3VyY2VUeXBlKHR5cGUpIHtcbiAgICAgICAgcmV0dXJuIGRhc2hlcml6ZSh0aGlzLnNjaGVtYS5wbHVyYWxpemUodHlwZSkpO1xuICAgIH1cbiAgICByZXNvdXJjZVJlbGF0aW9uc2hpcCh0eXBlLCByZWxhdGlvbnNoaXApIHtcbiAgICAgICAgcmV0dXJuIGRhc2hlcml6ZShyZWxhdGlvbnNoaXApO1xuICAgIH1cbiAgICByZXNvdXJjZUF0dHJpYnV0ZSh0eXBlLCBhdHRyKSB7XG4gICAgICAgIHJldHVybiBkYXNoZXJpemUoYXR0cik7XG4gICAgfVxuICAgIHJlc291cmNlSWRlbnRpdHkoaWRlbnRpdHkpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IHRoaXMucmVzb3VyY2VUeXBlKGlkZW50aXR5LnR5cGUpLFxuICAgICAgICAgICAgaWQ6IHRoaXMucmVzb3VyY2VJZChpZGVudGl0eS50eXBlLCBpZGVudGl0eS5pZClcbiAgICAgICAgfTtcbiAgICB9XG4gICAgcmVzb3VyY2VJZHModHlwZSwgaWRzKSB7XG4gICAgICAgIHJldHVybiBpZHMubWFwKGlkID0+IHRoaXMucmVzb3VyY2VJZCh0eXBlLCBpZCkpO1xuICAgIH1cbiAgICByZXNvdXJjZUlkKHR5cGUsIGlkKSB7XG4gICAgICAgIGxldCByZXNvdXJjZUtleSA9IHRoaXMucmVzb3VyY2VLZXkodHlwZSk7XG4gICAgICAgIGlmIChyZXNvdXJjZUtleSA9PT0gJ2lkJykge1xuICAgICAgICAgICAgcmV0dXJuIGlkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMua2V5TWFwLmlkVG9LZXkodHlwZSwgcmVzb3VyY2VLZXksIGlkKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZWNvcmRJZCh0eXBlLCByZXNvdXJjZUlkKSB7XG4gICAgICAgIGxldCByZXNvdXJjZUtleSA9IHRoaXMucmVzb3VyY2VLZXkodHlwZSk7XG4gICAgICAgIGlmIChyZXNvdXJjZUtleSA9PT0gJ2lkJykge1xuICAgICAgICAgICAgcmV0dXJuIHJlc291cmNlSWQ7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGV4aXN0aW5nSWQgPSB0aGlzLmtleU1hcC5rZXlUb0lkKHR5cGUsIHJlc291cmNlS2V5LCByZXNvdXJjZUlkKTtcbiAgICAgICAgaWYgKGV4aXN0aW5nSWQpIHtcbiAgICAgICAgICAgIHJldHVybiBleGlzdGluZ0lkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9nZW5lcmF0ZU5ld0lkKHR5cGUsIHJlc291cmNlS2V5LCByZXNvdXJjZUlkKTtcbiAgICB9XG4gICAgcmVjb3JkVHlwZShyZXNvdXJjZVR5cGUpIHtcbiAgICAgICAgcmV0dXJuIGNhbWVsaXplKHRoaXMuc2NoZW1hLnNpbmd1bGFyaXplKHJlc291cmNlVHlwZSkpO1xuICAgIH1cbiAgICByZWNvcmRJZGVudGl0eShyZXNvdXJjZUlkZW50aXR5KSB7XG4gICAgICAgIGxldCB0eXBlID0gdGhpcy5yZWNvcmRUeXBlKHJlc291cmNlSWRlbnRpdHkudHlwZSk7XG4gICAgICAgIGxldCBpZCA9IHRoaXMucmVjb3JkSWQodHlwZSwgcmVzb3VyY2VJZGVudGl0eS5pZCk7XG4gICAgICAgIHJldHVybiB7IHR5cGUsIGlkIH07XG4gICAgfVxuICAgIHJlY29yZEF0dHJpYnV0ZSh0eXBlLCByZXNvdXJjZUF0dHJpYnV0ZSkge1xuICAgICAgICByZXR1cm4gY2FtZWxpemUocmVzb3VyY2VBdHRyaWJ1dGUpO1xuICAgIH1cbiAgICByZWNvcmRSZWxhdGlvbnNoaXAodHlwZSwgcmVzb3VyY2VSZWxhdGlvbnNoaXApIHtcbiAgICAgICAgcmV0dXJuIGNhbWVsaXplKHJlc291cmNlUmVsYXRpb25zaGlwKTtcbiAgICB9XG4gICAgc2VyaWFsaXplRG9jdW1lbnQoZGF0YSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGF0YTogaXNBcnJheShkYXRhKSA/IHRoaXMuc2VyaWFsaXplUmVjb3JkcyhkYXRhKSA6IHRoaXMuc2VyaWFsaXplUmVjb3JkKGRhdGEpXG4gICAgICAgIH07XG4gICAgfVxuICAgIHNlcmlhbGl6ZVJlY29yZHMocmVjb3Jkcykge1xuICAgICAgICByZXR1cm4gcmVjb3Jkcy5tYXAocmVjb3JkID0+IHRoaXMuc2VyaWFsaXplUmVjb3JkKHJlY29yZCkpO1xuICAgIH1cbiAgICBzZXJpYWxpemVSZWNvcmQocmVjb3JkKSB7XG4gICAgICAgIGxldCByZXNvdXJjZSA9IHtcbiAgICAgICAgICAgIHR5cGU6IHRoaXMucmVzb3VyY2VUeXBlKHJlY29yZC50eXBlKVxuICAgICAgICB9O1xuICAgICAgICB0aGlzLnNlcmlhbGl6ZUlkKHJlc291cmNlLCByZWNvcmQpO1xuICAgICAgICB0aGlzLnNlcmlhbGl6ZUF0dHJpYnV0ZXMocmVzb3VyY2UsIHJlY29yZCk7XG4gICAgICAgIHRoaXMuc2VyaWFsaXplUmVsYXRpb25zaGlwcyhyZXNvdXJjZSwgcmVjb3JkKTtcbiAgICAgICAgcmV0dXJuIHJlc291cmNlO1xuICAgIH1cbiAgICBzZXJpYWxpemVJZChyZXNvdXJjZSwgcmVjb3JkKSB7XG4gICAgICAgIGxldCB2YWx1ZSA9IHRoaXMucmVzb3VyY2VJZChyZWNvcmQudHlwZSwgcmVjb3JkLmlkKTtcbiAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJlc291cmNlLmlkID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgc2VyaWFsaXplQXR0cmlidXRlcyhyZXNvdXJjZSwgcmVjb3JkKSB7XG4gICAgICAgIGlmIChyZWNvcmQuYXR0cmlidXRlcykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMocmVjb3JkLmF0dHJpYnV0ZXMpLmZvckVhY2goYXR0ciA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXJpYWxpemVBdHRyaWJ1dGUocmVzb3VyY2UsIHJlY29yZCwgYXR0cik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBzZXJpYWxpemVBdHRyaWJ1dGUocmVzb3VyY2UsIHJlY29yZCwgYXR0cikge1xuICAgICAgICBsZXQgdmFsdWUgPSByZWNvcmQuYXR0cmlidXRlc1thdHRyXTtcbiAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGRlZXBTZXQocmVzb3VyY2UsIFsnYXR0cmlidXRlcycsIHRoaXMucmVzb3VyY2VBdHRyaWJ1dGUocmVjb3JkLnR5cGUsIGF0dHIpXSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHNlcmlhbGl6ZVJlbGF0aW9uc2hpcHMocmVzb3VyY2UsIHJlY29yZCkge1xuICAgICAgICBpZiAocmVjb3JkLnJlbGF0aW9uc2hpcHMpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKHJlY29yZC5yZWxhdGlvbnNoaXBzKS5mb3JFYWNoKHJlbGF0aW9uc2hpcCA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXJpYWxpemVSZWxhdGlvbnNoaXAocmVzb3VyY2UsIHJlY29yZCwgcmVsYXRpb25zaGlwKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHNlcmlhbGl6ZVJlbGF0aW9uc2hpcChyZXNvdXJjZSwgcmVjb3JkLCByZWxhdGlvbnNoaXApIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSByZWNvcmQucmVsYXRpb25zaGlwc1tyZWxhdGlvbnNoaXBdLmRhdGE7XG4gICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsZXQgZGF0YTtcbiAgICAgICAgICAgIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIGRhdGEgPSB2YWx1ZS5tYXAoaWQgPT4gdGhpcy5yZXNvdXJjZUlkZW50aXR5KGlkKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IHRoaXMucmVzb3VyY2VJZGVudGl0eSh2YWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRhdGEgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgcmVzb3VyY2VSZWxhdGlvbnNoaXAgPSB0aGlzLnJlc291cmNlUmVsYXRpb25zaGlwKHJlY29yZC50eXBlLCByZWxhdGlvbnNoaXApO1xuICAgICAgICAgICAgZGVlcFNldChyZXNvdXJjZSwgWydyZWxhdGlvbnNoaXBzJywgcmVzb3VyY2VSZWxhdGlvbnNoaXAsICdkYXRhJ10sIGRhdGEpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGRlc2VyaWFsaXplRG9jdW1lbnQoZG9jdW1lbnQsIHByaW1hcnlSZWNvcmREYXRhKSB7XG4gICAgICAgIGxldCByZXN1bHQ7XG4gICAgICAgIGxldCBkYXRhO1xuICAgICAgICBpZiAoaXNBcnJheShkb2N1bWVudC5kYXRhKSkge1xuICAgICAgICAgICAgaWYgKHByaW1hcnlSZWNvcmREYXRhICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBkYXRhID0gZG9jdW1lbnQuZGF0YS5tYXAoKGVudHJ5LCBpKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRlc2VyaWFsaXplUmVzb3VyY2UoZW50cnksIHByaW1hcnlSZWNvcmREYXRhW2ldKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IGRvY3VtZW50LmRhdGEubWFwKChlbnRyeSwgaSkgPT4gdGhpcy5kZXNlcmlhbGl6ZVJlc291cmNlKGVudHJ5KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQuZGF0YSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKHByaW1hcnlSZWNvcmREYXRhICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBkYXRhID0gdGhpcy5kZXNlcmlhbGl6ZVJlc291cmNlKGRvY3VtZW50LmRhdGEsIHByaW1hcnlSZWNvcmREYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IHRoaXMuZGVzZXJpYWxpemVSZXNvdXJjZShkb2N1bWVudC5kYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRhdGEgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdCA9IHsgZGF0YSB9O1xuICAgICAgICBpZiAoZG9jdW1lbnQuaW5jbHVkZWQpIHtcbiAgICAgICAgICAgIHJlc3VsdC5pbmNsdWRlZCA9IGRvY3VtZW50LmluY2x1ZGVkLm1hcChlID0+IHRoaXMuZGVzZXJpYWxpemVSZXNvdXJjZShlKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgZGVzZXJpYWxpemVSZXNvdXJjZShyZXNvdXJjZSwgcHJpbWFyeVJlY29yZCkge1xuICAgICAgICBsZXQgcmVjb3JkO1xuICAgICAgICBsZXQgdHlwZSA9IHRoaXMucmVjb3JkVHlwZShyZXNvdXJjZS50eXBlKTtcbiAgICAgICAgbGV0IHJlc291cmNlS2V5ID0gdGhpcy5yZXNvdXJjZUtleSh0eXBlKTtcbiAgICAgICAgaWYgKHJlc291cmNlS2V5ID09PSAnaWQnKSB7XG4gICAgICAgICAgICByZWNvcmQgPSB7IHR5cGUsIGlkOiByZXNvdXJjZS5pZCB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IGlkO1xuICAgICAgICAgICAgbGV0IGtleXM7XG4gICAgICAgICAgICBpZiAocmVzb3VyY2UuaWQpIHtcbiAgICAgICAgICAgICAgICBrZXlzID0ge1xuICAgICAgICAgICAgICAgICAgICBbcmVzb3VyY2VLZXldOiByZXNvdXJjZS5pZFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaWQgPSBwcmltYXJ5UmVjb3JkICYmIHByaW1hcnlSZWNvcmQuaWQgfHwgdGhpcy5rZXlNYXAuaWRGcm9tS2V5cyh0eXBlLCBrZXlzKSB8fCB0aGlzLnNjaGVtYS5nZW5lcmF0ZUlkKHR5cGUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZCA9IHByaW1hcnlSZWNvcmQgJiYgcHJpbWFyeVJlY29yZC5pZCB8fCB0aGlzLnNjaGVtYS5nZW5lcmF0ZUlkKHR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVjb3JkID0geyB0eXBlLCBpZCB9O1xuICAgICAgICAgICAgaWYgKGtleXMpIHtcbiAgICAgICAgICAgICAgICByZWNvcmQua2V5cyA9IGtleXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5kZXNlcmlhbGl6ZUF0dHJpYnV0ZXMocmVjb3JkLCByZXNvdXJjZSk7XG4gICAgICAgIHRoaXMuZGVzZXJpYWxpemVSZWxhdGlvbnNoaXBzKHJlY29yZCwgcmVzb3VyY2UpO1xuICAgICAgICBpZiAodGhpcy5rZXlNYXApIHtcbiAgICAgICAgICAgIHRoaXMua2V5TWFwLnB1c2hSZWNvcmQocmVjb3JkKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVjb3JkO1xuICAgIH1cbiAgICBkZXNlcmlhbGl6ZUF0dHJpYnV0ZXMocmVjb3JkLCByZXNvdXJjZSkge1xuICAgICAgICBpZiAocmVzb3VyY2UuYXR0cmlidXRlcykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMocmVzb3VyY2UuYXR0cmlidXRlcykuZm9yRWFjaChyZXNvdXJjZUF0dHJpYnV0ZSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IGF0dHJpYnV0ZSA9IHRoaXMucmVjb3JkQXR0cmlidXRlKHJlY29yZC50eXBlLCByZXNvdXJjZUF0dHJpYnV0ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc2NoZW1hLmhhc0F0dHJpYnV0ZShyZWNvcmQudHlwZSwgYXR0cmlidXRlKSkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgdmFsdWUgPSByZXNvdXJjZS5hdHRyaWJ1dGVzW3Jlc291cmNlQXR0cmlidXRlXTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kZXNlcmlhbGl6ZUF0dHJpYnV0ZShyZWNvcmQsIGF0dHJpYnV0ZSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGRlc2VyaWFsaXplQXR0cmlidXRlKHJlY29yZCwgYXR0ciwgdmFsdWUpIHtcbiAgICAgICAgcmVjb3JkLmF0dHJpYnV0ZXMgPSByZWNvcmQuYXR0cmlidXRlcyB8fCB7fTtcbiAgICAgICAgcmVjb3JkLmF0dHJpYnV0ZXNbYXR0cl0gPSB2YWx1ZTtcbiAgICB9XG4gICAgZGVzZXJpYWxpemVSZWxhdGlvbnNoaXBzKHJlY29yZCwgcmVzb3VyY2UpIHtcbiAgICAgICAgaWYgKHJlc291cmNlLnJlbGF0aW9uc2hpcHMpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKHJlc291cmNlLnJlbGF0aW9uc2hpcHMpLmZvckVhY2gocmVzb3VyY2VSZWwgPT4ge1xuICAgICAgICAgICAgICAgIGxldCByZWxhdGlvbnNoaXAgPSB0aGlzLnJlY29yZFJlbGF0aW9uc2hpcChyZWNvcmQudHlwZSwgcmVzb3VyY2VSZWwpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnNjaGVtYS5oYXNSZWxhdGlvbnNoaXAocmVjb3JkLnR5cGUsIHJlbGF0aW9uc2hpcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHZhbHVlID0gcmVzb3VyY2UucmVsYXRpb25zaGlwc1tyZXNvdXJjZVJlbF07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGVzZXJpYWxpemVSZWxhdGlvbnNoaXAocmVjb3JkLCByZWxhdGlvbnNoaXAsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBkZXNlcmlhbGl6ZVJlbGF0aW9uc2hpcChyZWNvcmQsIHJlbGF0aW9uc2hpcCwgdmFsdWUpIHtcbiAgICAgICAgbGV0IHJlc291cmNlRGF0YSA9IHZhbHVlLmRhdGE7XG4gICAgICAgIGlmIChyZXNvdXJjZURhdGEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGV0IGRhdGE7XG4gICAgICAgICAgICBpZiAocmVzb3VyY2VEYXRhID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IG51bGw7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzQXJyYXkocmVzb3VyY2VEYXRhKSkge1xuICAgICAgICAgICAgICAgIGRhdGEgPSByZXNvdXJjZURhdGEubWFwKHJlc291cmNlSWRlbnRpdHkgPT4gdGhpcy5yZWNvcmRJZGVudGl0eShyZXNvdXJjZUlkZW50aXR5KSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRhdGEgPSB0aGlzLnJlY29yZElkZW50aXR5KHJlc291cmNlRGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZWNvcmQucmVsYXRpb25zaGlwcyA9IHJlY29yZC5yZWxhdGlvbnNoaXBzIHx8IHt9O1xuICAgICAgICAgICAgcmVjb3JkLnJlbGF0aW9uc2hpcHNbcmVsYXRpb25zaGlwXSA9IHsgZGF0YSB9O1xuICAgICAgICB9XG4gICAgfVxuICAgIF9nZW5lcmF0ZU5ld0lkKHR5cGUsIGtleU5hbWUsIGtleVZhbHVlKSB7XG4gICAgICAgIGxldCBpZCA9IHRoaXMuc2NoZW1hLmdlbmVyYXRlSWQodHlwZSk7XG4gICAgICAgIHRoaXMua2V5TWFwLnB1c2hSZWNvcmQoe1xuICAgICAgICAgICAgdHlwZSxcbiAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAga2V5czoge1xuICAgICAgICAgICAgICAgIFtrZXlOYW1lXToga2V5VmFsdWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBpZDtcbiAgICB9XG59Il19