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

    JSONAPISerializer.prototype.deserializeDocument = function deserializeDocument(document) {
        var result = void 0;
        var data = document.data;
        if ((0, _utils.isArray)(data)) {
            result = {
                data: data.map(this.deserializeResource, this)
            };
        } else {
            result = {
                data: this.deserializeResource(data)
            };
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
            } else if ((0, _utils.isArray)(resourceData)) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpzb25hcGktc2VyaWFsaXplci5qcyJdLCJuYW1lcyI6WyJKU09OQVBJU2VyaWFsaXplciIsInNldHRpbmdzIiwicmVzb3VyY2VLZXkiLCJ0eXBlIiwicmVzb3VyY2VUeXBlIiwiZGFzaGVyaXplIiwicmVzb3VyY2VSZWxhdGlvbnNoaXAiLCJyZWxhdGlvbnNoaXAiLCJyZXNvdXJjZUF0dHJpYnV0ZSIsImF0dHIiLCJyZXNvdXJjZUlkZW50aXR5IiwiaWRlbnRpdHkiLCJpZCIsInJlc291cmNlSWRzIiwiaWRzIiwicmVzb3VyY2VJZCIsInJlY29yZElkIiwiZXhpc3RpbmdJZCIsInJlY29yZFR5cGUiLCJjYW1lbGl6ZSIsInJlY29yZElkZW50aXR5IiwicmVjb3JkQXR0cmlidXRlIiwicmVjb3JkUmVsYXRpb25zaGlwIiwic2VyaWFsaXplRG9jdW1lbnQiLCJkYXRhIiwiaXNBcnJheSIsInNlcmlhbGl6ZVJlY29yZHMiLCJyZWNvcmRzIiwic2VyaWFsaXplUmVjb3JkIiwicmVjb3JkIiwicmVzb3VyY2UiLCJzZXJpYWxpemVJZCIsInZhbHVlIiwic2VyaWFsaXplQXR0cmlidXRlcyIsIk9iamVjdCIsInNlcmlhbGl6ZUF0dHJpYnV0ZSIsImRlZXBTZXQiLCJzZXJpYWxpemVSZWxhdGlvbnNoaXBzIiwic2VyaWFsaXplUmVsYXRpb25zaGlwIiwiZGVzZXJpYWxpemVEb2N1bWVudCIsImRvY3VtZW50IiwicmVzdWx0IiwiZGVzZXJpYWxpemVSZXNvdXJjZSIsImtleXMiLCJkZXNlcmlhbGl6ZUF0dHJpYnV0ZXMiLCJhdHRyaWJ1dGUiLCJkZXNlcmlhbGl6ZUF0dHJpYnV0ZSIsImRlc2VyaWFsaXplUmVsYXRpb25zaGlwcyIsImRlc2VyaWFsaXplUmVsYXRpb25zaGlwIiwicmVzb3VyY2VEYXRhIiwiX2dlbmVyYXRlTmV3SWQiLCJrZXlOYW1lIiwia2V5VmFsdWUiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFDcUJBLG9CO0FB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LGMsMkJBQWUvQyxJLEVBQU1nRCxPLEVBQVNDLFEsRUFBVTtBQUFBLFlBQUEsTUFBQTs7QUFDcEMsWUFBSXhDLEtBQUssS0FBQSxNQUFBLENBQUEsVUFBQSxDQUFULElBQVMsQ0FBVDtBQUNBLGFBQUEsTUFBQSxDQUFBLFVBQUEsQ0FBdUI7QUFDbkJULGtCQURtQixJQUFBO0FBRW5CUyxnQkFGbUIsRUFBQTtBQUduQitCLG1CQUFBQSxTQUFBQSxFQUFBQSxFQUFBQSxPQUFBQSxPQUFBQSxJQUFBQSxRQUFBQSxFQUFBQSxNQUFBQTtBQUhtQixTQUF2QjtBQU9BLGVBQUEsRUFBQTs7Ozs7eUJBdE5TO0FBQ1QsbUJBQU8sS0FBUCxPQUFBO0FBQ0g7Ozt5QkFDWTtBQUNULG1CQUFPLEtBQVAsT0FBQTtBQUNIOzs7Ozs7a0JBVmdCM0MsaUIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBpc0FycmF5LCBkYXNoZXJpemUsIGNhbWVsaXplLCBkZWVwU2V0IH0gZnJvbSAnQG9yYml0L3V0aWxzJztcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEpTT05BUElTZXJpYWxpemVyIHtcbiAgICBjb25zdHJ1Y3RvcihzZXR0aW5ncykge1xuICAgICAgICB0aGlzLl9zY2hlbWEgPSBzZXR0aW5ncy5zY2hlbWE7XG4gICAgICAgIHRoaXMuX2tleU1hcCA9IHNldHRpbmdzLmtleU1hcDtcbiAgICB9XG4gICAgZ2V0IHNjaGVtYSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NjaGVtYTtcbiAgICB9XG4gICAgZ2V0IGtleU1hcCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2tleU1hcDtcbiAgICB9XG4gICAgcmVzb3VyY2VLZXkodHlwZSkge1xuICAgICAgICByZXR1cm4gJ2lkJztcbiAgICB9XG4gICAgcmVzb3VyY2VUeXBlKHR5cGUpIHtcbiAgICAgICAgcmV0dXJuIGRhc2hlcml6ZSh0aGlzLnNjaGVtYS5wbHVyYWxpemUodHlwZSkpO1xuICAgIH1cbiAgICByZXNvdXJjZVJlbGF0aW9uc2hpcCh0eXBlLCByZWxhdGlvbnNoaXApIHtcbiAgICAgICAgcmV0dXJuIGRhc2hlcml6ZShyZWxhdGlvbnNoaXApO1xuICAgIH1cbiAgICByZXNvdXJjZUF0dHJpYnV0ZSh0eXBlLCBhdHRyKSB7XG4gICAgICAgIHJldHVybiBkYXNoZXJpemUoYXR0cik7XG4gICAgfVxuICAgIHJlc291cmNlSWRlbnRpdHkoaWRlbnRpdHkpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IHRoaXMucmVzb3VyY2VUeXBlKGlkZW50aXR5LnR5cGUpLFxuICAgICAgICAgICAgaWQ6IHRoaXMucmVzb3VyY2VJZChpZGVudGl0eS50eXBlLCBpZGVudGl0eS5pZClcbiAgICAgICAgfTtcbiAgICB9XG4gICAgcmVzb3VyY2VJZHModHlwZSwgaWRzKSB7XG4gICAgICAgIHJldHVybiBpZHMubWFwKGlkID0+IHRoaXMucmVzb3VyY2VJZCh0eXBlLCBpZCkpO1xuICAgIH1cbiAgICByZXNvdXJjZUlkKHR5cGUsIGlkKSB7XG4gICAgICAgIGxldCByZXNvdXJjZUtleSA9IHRoaXMucmVzb3VyY2VLZXkodHlwZSk7XG4gICAgICAgIGlmIChyZXNvdXJjZUtleSA9PT0gJ2lkJykge1xuICAgICAgICAgICAgcmV0dXJuIGlkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMua2V5TWFwLmlkVG9LZXkodHlwZSwgcmVzb3VyY2VLZXksIGlkKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZWNvcmRJZCh0eXBlLCByZXNvdXJjZUlkKSB7XG4gICAgICAgIGxldCByZXNvdXJjZUtleSA9IHRoaXMucmVzb3VyY2VLZXkodHlwZSk7XG4gICAgICAgIGlmIChyZXNvdXJjZUtleSA9PT0gJ2lkJykge1xuICAgICAgICAgICAgcmV0dXJuIHJlc291cmNlSWQ7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGV4aXN0aW5nSWQgPSB0aGlzLmtleU1hcC5rZXlUb0lkKHR5cGUsIHJlc291cmNlS2V5LCByZXNvdXJjZUlkKTtcbiAgICAgICAgaWYgKGV4aXN0aW5nSWQpIHtcbiAgICAgICAgICAgIHJldHVybiBleGlzdGluZ0lkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9nZW5lcmF0ZU5ld0lkKHR5cGUsIHJlc291cmNlS2V5LCByZXNvdXJjZUlkKTtcbiAgICB9XG4gICAgcmVjb3JkVHlwZShyZXNvdXJjZVR5cGUpIHtcbiAgICAgICAgcmV0dXJuIGNhbWVsaXplKHRoaXMuc2NoZW1hLnNpbmd1bGFyaXplKHJlc291cmNlVHlwZSkpO1xuICAgIH1cbiAgICByZWNvcmRJZGVudGl0eShyZXNvdXJjZUlkZW50aXR5KSB7XG4gICAgICAgIGxldCB0eXBlID0gdGhpcy5yZWNvcmRUeXBlKHJlc291cmNlSWRlbnRpdHkudHlwZSk7XG4gICAgICAgIGxldCBpZCA9IHRoaXMucmVjb3JkSWQodHlwZSwgcmVzb3VyY2VJZGVudGl0eS5pZCk7XG4gICAgICAgIHJldHVybiB7IHR5cGUsIGlkIH07XG4gICAgfVxuICAgIHJlY29yZEF0dHJpYnV0ZSh0eXBlLCByZXNvdXJjZUF0dHJpYnV0ZSkge1xuICAgICAgICByZXR1cm4gY2FtZWxpemUocmVzb3VyY2VBdHRyaWJ1dGUpO1xuICAgIH1cbiAgICByZWNvcmRSZWxhdGlvbnNoaXAodHlwZSwgcmVzb3VyY2VSZWxhdGlvbnNoaXApIHtcbiAgICAgICAgcmV0dXJuIGNhbWVsaXplKHJlc291cmNlUmVsYXRpb25zaGlwKTtcbiAgICB9XG4gICAgc2VyaWFsaXplRG9jdW1lbnQoZGF0YSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGF0YTogaXNBcnJheShkYXRhKSA/IHRoaXMuc2VyaWFsaXplUmVjb3JkcyhkYXRhKSA6IHRoaXMuc2VyaWFsaXplUmVjb3JkKGRhdGEpXG4gICAgICAgIH07XG4gICAgfVxuICAgIHNlcmlhbGl6ZVJlY29yZHMocmVjb3Jkcykge1xuICAgICAgICByZXR1cm4gcmVjb3Jkcy5tYXAocmVjb3JkID0+IHRoaXMuc2VyaWFsaXplUmVjb3JkKHJlY29yZCkpO1xuICAgIH1cbiAgICBzZXJpYWxpemVSZWNvcmQocmVjb3JkKSB7XG4gICAgICAgIGxldCByZXNvdXJjZSA9IHtcbiAgICAgICAgICAgIHR5cGU6IHRoaXMucmVzb3VyY2VUeXBlKHJlY29yZC50eXBlKVxuICAgICAgICB9O1xuICAgICAgICB0aGlzLnNlcmlhbGl6ZUlkKHJlc291cmNlLCByZWNvcmQpO1xuICAgICAgICB0aGlzLnNlcmlhbGl6ZUF0dHJpYnV0ZXMocmVzb3VyY2UsIHJlY29yZCk7XG4gICAgICAgIHRoaXMuc2VyaWFsaXplUmVsYXRpb25zaGlwcyhyZXNvdXJjZSwgcmVjb3JkKTtcbiAgICAgICAgcmV0dXJuIHJlc291cmNlO1xuICAgIH1cbiAgICBzZXJpYWxpemVJZChyZXNvdXJjZSwgcmVjb3JkKSB7XG4gICAgICAgIGxldCB2YWx1ZSA9IHRoaXMucmVzb3VyY2VJZChyZWNvcmQudHlwZSwgcmVjb3JkLmlkKTtcbiAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJlc291cmNlLmlkID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgc2VyaWFsaXplQXR0cmlidXRlcyhyZXNvdXJjZSwgcmVjb3JkKSB7XG4gICAgICAgIGlmIChyZWNvcmQuYXR0cmlidXRlcykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMocmVjb3JkLmF0dHJpYnV0ZXMpLmZvckVhY2goYXR0ciA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXJpYWxpemVBdHRyaWJ1dGUocmVzb3VyY2UsIHJlY29yZCwgYXR0cik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBzZXJpYWxpemVBdHRyaWJ1dGUocmVzb3VyY2UsIHJlY29yZCwgYXR0cikge1xuICAgICAgICBsZXQgdmFsdWUgPSByZWNvcmQuYXR0cmlidXRlc1thdHRyXTtcbiAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGRlZXBTZXQocmVzb3VyY2UsIFsnYXR0cmlidXRlcycsIHRoaXMucmVzb3VyY2VBdHRyaWJ1dGUocmVjb3JkLnR5cGUsIGF0dHIpXSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHNlcmlhbGl6ZVJlbGF0aW9uc2hpcHMocmVzb3VyY2UsIHJlY29yZCkge1xuICAgICAgICBpZiAocmVjb3JkLnJlbGF0aW9uc2hpcHMpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKHJlY29yZC5yZWxhdGlvbnNoaXBzKS5mb3JFYWNoKHJlbGF0aW9uc2hpcCA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXJpYWxpemVSZWxhdGlvbnNoaXAocmVzb3VyY2UsIHJlY29yZCwgcmVsYXRpb25zaGlwKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHNlcmlhbGl6ZVJlbGF0aW9uc2hpcChyZXNvdXJjZSwgcmVjb3JkLCByZWxhdGlvbnNoaXApIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSByZWNvcmQucmVsYXRpb25zaGlwc1tyZWxhdGlvbnNoaXBdLmRhdGE7XG4gICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsZXQgZGF0YTtcbiAgICAgICAgICAgIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIGRhdGEgPSB2YWx1ZS5tYXAoaWQgPT4gdGhpcy5yZXNvdXJjZUlkZW50aXR5KGlkKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IHRoaXMucmVzb3VyY2VJZGVudGl0eSh2YWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRhdGEgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgcmVzb3VyY2VSZWxhdGlvbnNoaXAgPSB0aGlzLnJlc291cmNlUmVsYXRpb25zaGlwKHJlY29yZC50eXBlLCByZWxhdGlvbnNoaXApO1xuICAgICAgICAgICAgZGVlcFNldChyZXNvdXJjZSwgWydyZWxhdGlvbnNoaXBzJywgcmVzb3VyY2VSZWxhdGlvbnNoaXAsICdkYXRhJ10sIGRhdGEpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGRlc2VyaWFsaXplRG9jdW1lbnQoZG9jdW1lbnQpIHtcbiAgICAgICAgbGV0IHJlc3VsdDtcbiAgICAgICAgbGV0IGRhdGEgPSBkb2N1bWVudC5kYXRhO1xuICAgICAgICBpZiAoaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgcmVzdWx0ID0ge1xuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGEubWFwKHRoaXMuZGVzZXJpYWxpemVSZXNvdXJjZSwgdGhpcylcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQgPSB7XG4gICAgICAgICAgICAgICAgZGF0YTogdGhpcy5kZXNlcmlhbGl6ZVJlc291cmNlKGRhdGEpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGlmIChkb2N1bWVudC5pbmNsdWRlZCkge1xuICAgICAgICAgICAgcmVzdWx0LmluY2x1ZGVkID0gZG9jdW1lbnQuaW5jbHVkZWQubWFwKHRoaXMuZGVzZXJpYWxpemVSZXNvdXJjZSwgdGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgZGVzZXJpYWxpemVSZXNvdXJjZShyZXNvdXJjZSkge1xuICAgICAgICBsZXQgcmVjb3JkO1xuICAgICAgICBsZXQgdHlwZSA9IHRoaXMucmVjb3JkVHlwZShyZXNvdXJjZS50eXBlKTtcbiAgICAgICAgbGV0IHJlc291cmNlS2V5ID0gdGhpcy5yZXNvdXJjZUtleSh0eXBlKTtcbiAgICAgICAgaWYgKHJlc291cmNlS2V5ID09PSAnaWQnKSB7XG4gICAgICAgICAgICByZWNvcmQgPSB7IHR5cGUsIGlkOiByZXNvdXJjZS5pZCB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IGlkO1xuICAgICAgICAgICAgbGV0IGtleXM7XG4gICAgICAgICAgICBpZiAocmVzb3VyY2UuaWQpIHtcbiAgICAgICAgICAgICAgICBrZXlzID0ge1xuICAgICAgICAgICAgICAgICAgICBbcmVzb3VyY2VLZXldOiByZXNvdXJjZS5pZFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaWQgPSB0aGlzLmtleU1hcC5pZEZyb21LZXlzKHR5cGUsIGtleXMpIHx8IHRoaXMuc2NoZW1hLmdlbmVyYXRlSWQodHlwZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlkID0gdGhpcy5zY2hlbWEuZ2VuZXJhdGVJZCh0eXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlY29yZCA9IHsgdHlwZSwgaWQgfTtcbiAgICAgICAgICAgIGlmIChrZXlzKSB7XG4gICAgICAgICAgICAgICAgcmVjb3JkLmtleXMgPSBrZXlzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuZGVzZXJpYWxpemVBdHRyaWJ1dGVzKHJlY29yZCwgcmVzb3VyY2UpO1xuICAgICAgICB0aGlzLmRlc2VyaWFsaXplUmVsYXRpb25zaGlwcyhyZWNvcmQsIHJlc291cmNlKTtcbiAgICAgICAgaWYgKHRoaXMua2V5TWFwKSB7XG4gICAgICAgICAgICB0aGlzLmtleU1hcC5wdXNoUmVjb3JkKHJlY29yZCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlY29yZDtcbiAgICB9XG4gICAgZGVzZXJpYWxpemVBdHRyaWJ1dGVzKHJlY29yZCwgcmVzb3VyY2UpIHtcbiAgICAgICAgaWYgKHJlc291cmNlLmF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKHJlc291cmNlLmF0dHJpYnV0ZXMpLmZvckVhY2gocmVzb3VyY2VBdHRyaWJ1dGUgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBhdHRyaWJ1dGUgPSB0aGlzLnJlY29yZEF0dHJpYnV0ZShyZWNvcmQudHlwZSwgcmVzb3VyY2VBdHRyaWJ1dGUpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnNjaGVtYS5oYXNBdHRyaWJ1dGUocmVjb3JkLnR5cGUsIGF0dHJpYnV0ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHZhbHVlID0gcmVzb3VyY2UuYXR0cmlidXRlc1tyZXNvdXJjZUF0dHJpYnV0ZV07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGVzZXJpYWxpemVBdHRyaWJ1dGUocmVjb3JkLCBhdHRyaWJ1dGUsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBkZXNlcmlhbGl6ZUF0dHJpYnV0ZShyZWNvcmQsIGF0dHIsIHZhbHVlKSB7XG4gICAgICAgIHJlY29yZC5hdHRyaWJ1dGVzID0gcmVjb3JkLmF0dHJpYnV0ZXMgfHwge307XG4gICAgICAgIHJlY29yZC5hdHRyaWJ1dGVzW2F0dHJdID0gdmFsdWU7XG4gICAgfVxuICAgIGRlc2VyaWFsaXplUmVsYXRpb25zaGlwcyhyZWNvcmQsIHJlc291cmNlKSB7XG4gICAgICAgIGlmIChyZXNvdXJjZS5yZWxhdGlvbnNoaXBzKSB7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhyZXNvdXJjZS5yZWxhdGlvbnNoaXBzKS5mb3JFYWNoKHJlc291cmNlUmVsID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgcmVsYXRpb25zaGlwID0gdGhpcy5yZWNvcmRSZWxhdGlvbnNoaXAocmVjb3JkLnR5cGUsIHJlc291cmNlUmVsKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zY2hlbWEuaGFzUmVsYXRpb25zaGlwKHJlY29yZC50eXBlLCByZWxhdGlvbnNoaXApKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCB2YWx1ZSA9IHJlc291cmNlLnJlbGF0aW9uc2hpcHNbcmVzb3VyY2VSZWxdO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmRlc2VyaWFsaXplUmVsYXRpb25zaGlwKHJlY29yZCwgcmVsYXRpb25zaGlwLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZGVzZXJpYWxpemVSZWxhdGlvbnNoaXAocmVjb3JkLCByZWxhdGlvbnNoaXAsIHZhbHVlKSB7XG4gICAgICAgIGxldCByZXNvdXJjZURhdGEgPSB2YWx1ZS5kYXRhO1xuICAgICAgICBpZiAocmVzb3VyY2VEYXRhICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBkYXRhO1xuICAgICAgICAgICAgaWYgKHJlc291cmNlRGF0YSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGRhdGEgPSBudWxsO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpc0FycmF5KHJlc291cmNlRGF0YSkpIHtcbiAgICAgICAgICAgICAgICBkYXRhID0gcmVzb3VyY2VEYXRhLm1hcChyZXNvdXJjZUlkZW50aXR5ID0+IHRoaXMucmVjb3JkSWRlbnRpdHkocmVzb3VyY2VJZGVudGl0eSkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkYXRhID0gdGhpcy5yZWNvcmRJZGVudGl0eShyZXNvdXJjZURhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVjb3JkLnJlbGF0aW9uc2hpcHMgPSByZWNvcmQucmVsYXRpb25zaGlwcyB8fCB7fTtcbiAgICAgICAgICAgIHJlY29yZC5yZWxhdGlvbnNoaXBzW3JlbGF0aW9uc2hpcF0gPSB7IGRhdGEgfTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBfZ2VuZXJhdGVOZXdJZCh0eXBlLCBrZXlOYW1lLCBrZXlWYWx1ZSkge1xuICAgICAgICBsZXQgaWQgPSB0aGlzLnNjaGVtYS5nZW5lcmF0ZUlkKHR5cGUpO1xuICAgICAgICB0aGlzLmtleU1hcC5wdXNoUmVjb3JkKHtcbiAgICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgICBpZCxcbiAgICAgICAgICAgIGtleXM6IHtcbiAgICAgICAgICAgICAgICBba2V5TmFtZV06IGtleVZhbHVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gaWQ7XG4gICAgfVxufSJdfQ==