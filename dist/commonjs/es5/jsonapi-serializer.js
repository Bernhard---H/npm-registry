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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpzb25hcGktc2VyaWFsaXplci5qcyJdLCJuYW1lcyI6WyJKU09OQVBJU2VyaWFsaXplciIsInNldHRpbmdzIiwicmVzb3VyY2VLZXkiLCJ0eXBlIiwicmVzb3VyY2VUeXBlIiwiZGFzaGVyaXplIiwicmVzb3VyY2VSZWxhdGlvbnNoaXAiLCJyZWxhdGlvbnNoaXAiLCJyZXNvdXJjZUF0dHJpYnV0ZSIsImF0dHIiLCJyZXNvdXJjZUlkZW50aXR5IiwiaWRlbnRpdHkiLCJpZCIsInJlc291cmNlSWRzIiwiaWRzIiwicmVzb3VyY2VJZCIsInJlY29yZElkIiwiZXhpc3RpbmdJZCIsInJlY29yZFR5cGUiLCJjYW1lbGl6ZSIsInJlY29yZElkZW50aXR5IiwicmVjb3JkQXR0cmlidXRlIiwicmVjb3JkUmVsYXRpb25zaGlwIiwic2VyaWFsaXplRG9jdW1lbnQiLCJkYXRhIiwiaXNBcnJheSIsInNlcmlhbGl6ZVJlY29yZHMiLCJyZWNvcmRzIiwic2VyaWFsaXplUmVjb3JkIiwicmVjb3JkIiwicmVzb3VyY2UiLCJzZXJpYWxpemVJZCIsInZhbHVlIiwic2VyaWFsaXplQXR0cmlidXRlcyIsIk9iamVjdCIsInNlcmlhbGl6ZUF0dHJpYnV0ZSIsImRlZXBTZXQiLCJzZXJpYWxpemVSZWxhdGlvbnNoaXBzIiwic2VyaWFsaXplUmVsYXRpb25zaGlwIiwiZGVzZXJpYWxpemVEb2N1bWVudCIsImRvY3VtZW50IiwicmVzdWx0IiwiZGVzZXJpYWxpemVSZXNvdXJjZSIsImtleXMiLCJkZXNlcmlhbGl6ZUF0dHJpYnV0ZXMiLCJhdHRyaWJ1dGUiLCJkZXNlcmlhbGl6ZUF0dHJpYnV0ZSIsImRlc2VyaWFsaXplUmVsYXRpb25zaGlwcyIsImRlc2VyaWFsaXplUmVsYXRpb25zaGlwIiwicmVzb3VyY2VEYXRhIiwiX2dlbmVyYXRlTmV3SWQiLCJrZXlOYW1lIiwia2V5VmFsdWUiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFDcUJBLG9CO0FB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QUFDQUEsbUJBQUFBLGFBQUFBLENBQUFBLFlBQUFBLElBQXFDLEVBQUVMLE1BQXZDSyxJQUFxQyxFQUFyQ0E7QUFDSDs7O2dDQUVMcUIsYywyQkFBZS9DLEksRUFBTWdELE8sRUFBU0MsUSxFQUFVO0FBQUEsWUFBQSxNQUFBOztBQUNwQyxZQUFJeEMsS0FBSyxLQUFBLE1BQUEsQ0FBQSxVQUFBLENBQVQsSUFBUyxDQUFUO0FBQ0EsYUFBQSxNQUFBLENBQUEsVUFBQSxDQUF1QjtBQUNuQlQsa0JBRG1CLElBQUE7QUFFbkJTLGdCQUZtQixFQUFBO0FBR25CK0IsbUJBQUFBLFNBQUFBLEVBQUFBLEVBQUFBLE9BQUFBLE9BQUFBLElBQUFBLFFBQUFBLEVBQUFBLE1BQUFBO0FBSG1CLFNBQXZCO0FBT0EsZUFBQSxFQUFBOzs7Ozt5QkF4TlM7QUFDVCxtQkFBTyxLQUFQLE9BQUE7QUFDSDs7O3lCQUNZO0FBQ1QsbUJBQU8sS0FBUCxPQUFBO0FBQ0g7Ozs7OztrQkFWZ0IzQyxpQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGlzQXJyYXksIGRhc2hlcml6ZSwgY2FtZWxpemUsIGRlZXBTZXQgfSBmcm9tICdAb3JiaXQvdXRpbHMnO1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSlNPTkFQSVNlcmlhbGl6ZXIge1xuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzKSB7XG4gICAgICAgIHRoaXMuX3NjaGVtYSA9IHNldHRpbmdzLnNjaGVtYTtcbiAgICAgICAgdGhpcy5fa2V5TWFwID0gc2V0dGluZ3Mua2V5TWFwO1xuICAgIH1cbiAgICBnZXQgc2NoZW1hKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2NoZW1hO1xuICAgIH1cbiAgICBnZXQga2V5TWFwKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fa2V5TWFwO1xuICAgIH1cbiAgICByZXNvdXJjZUtleSh0eXBlKSB7XG4gICAgICAgIHJldHVybiAnaWQnO1xuICAgIH1cbiAgICByZXNvdXJjZVR5cGUodHlwZSkge1xuICAgICAgICByZXR1cm4gZGFzaGVyaXplKHRoaXMuc2NoZW1hLnBsdXJhbGl6ZSh0eXBlKSk7XG4gICAgfVxuICAgIHJlc291cmNlUmVsYXRpb25zaGlwKHR5cGUsIHJlbGF0aW9uc2hpcCkge1xuICAgICAgICByZXR1cm4gZGFzaGVyaXplKHJlbGF0aW9uc2hpcCk7XG4gICAgfVxuICAgIHJlc291cmNlQXR0cmlidXRlKHR5cGUsIGF0dHIpIHtcbiAgICAgICAgcmV0dXJuIGRhc2hlcml6ZShhdHRyKTtcbiAgICB9XG4gICAgcmVzb3VyY2VJZGVudGl0eShpZGVudGl0eSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogdGhpcy5yZXNvdXJjZVR5cGUoaWRlbnRpdHkudHlwZSksXG4gICAgICAgICAgICBpZDogdGhpcy5yZXNvdXJjZUlkKGlkZW50aXR5LnR5cGUsIGlkZW50aXR5LmlkKVxuICAgICAgICB9O1xuICAgIH1cbiAgICByZXNvdXJjZUlkcyh0eXBlLCBpZHMpIHtcbiAgICAgICAgcmV0dXJuIGlkcy5tYXAoaWQgPT4gdGhpcy5yZXNvdXJjZUlkKHR5cGUsIGlkKSk7XG4gICAgfVxuICAgIHJlc291cmNlSWQodHlwZSwgaWQpIHtcbiAgICAgICAgbGV0IHJlc291cmNlS2V5ID0gdGhpcy5yZXNvdXJjZUtleSh0eXBlKTtcbiAgICAgICAgaWYgKHJlc291cmNlS2V5ID09PSAnaWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gaWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5rZXlNYXAuaWRUb0tleSh0eXBlLCByZXNvdXJjZUtleSwgaWQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJlY29yZElkKHR5cGUsIHJlc291cmNlSWQpIHtcbiAgICAgICAgbGV0IHJlc291cmNlS2V5ID0gdGhpcy5yZXNvdXJjZUtleSh0eXBlKTtcbiAgICAgICAgaWYgKHJlc291cmNlS2V5ID09PSAnaWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzb3VyY2VJZDtcbiAgICAgICAgfVxuICAgICAgICBsZXQgZXhpc3RpbmdJZCA9IHRoaXMua2V5TWFwLmtleVRvSWQodHlwZSwgcmVzb3VyY2VLZXksIHJlc291cmNlSWQpO1xuICAgICAgICBpZiAoZXhpc3RpbmdJZCkge1xuICAgICAgICAgICAgcmV0dXJuIGV4aXN0aW5nSWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2dlbmVyYXRlTmV3SWQodHlwZSwgcmVzb3VyY2VLZXksIHJlc291cmNlSWQpO1xuICAgIH1cbiAgICByZWNvcmRUeXBlKHJlc291cmNlVHlwZSkge1xuICAgICAgICByZXR1cm4gY2FtZWxpemUodGhpcy5zY2hlbWEuc2luZ3VsYXJpemUocmVzb3VyY2VUeXBlKSk7XG4gICAgfVxuICAgIHJlY29yZElkZW50aXR5KHJlc291cmNlSWRlbnRpdHkpIHtcbiAgICAgICAgbGV0IHR5cGUgPSB0aGlzLnJlY29yZFR5cGUocmVzb3VyY2VJZGVudGl0eS50eXBlKTtcbiAgICAgICAgbGV0IGlkID0gdGhpcy5yZWNvcmRJZCh0eXBlLCByZXNvdXJjZUlkZW50aXR5LmlkKTtcbiAgICAgICAgcmV0dXJuIHsgdHlwZSwgaWQgfTtcbiAgICB9XG4gICAgcmVjb3JkQXR0cmlidXRlKHR5cGUsIHJlc291cmNlQXR0cmlidXRlKSB7XG4gICAgICAgIHJldHVybiBjYW1lbGl6ZShyZXNvdXJjZUF0dHJpYnV0ZSk7XG4gICAgfVxuICAgIHJlY29yZFJlbGF0aW9uc2hpcCh0eXBlLCByZXNvdXJjZVJlbGF0aW9uc2hpcCkge1xuICAgICAgICByZXR1cm4gY2FtZWxpemUocmVzb3VyY2VSZWxhdGlvbnNoaXApO1xuICAgIH1cbiAgICBzZXJpYWxpemVEb2N1bWVudChkYXRhKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkYXRhOiBpc0FycmF5KGRhdGEpID8gdGhpcy5zZXJpYWxpemVSZWNvcmRzKGRhdGEpIDogdGhpcy5zZXJpYWxpemVSZWNvcmQoZGF0YSlcbiAgICAgICAgfTtcbiAgICB9XG4gICAgc2VyaWFsaXplUmVjb3JkcyhyZWNvcmRzKSB7XG4gICAgICAgIHJldHVybiByZWNvcmRzLm1hcChyZWNvcmQgPT4gdGhpcy5zZXJpYWxpemVSZWNvcmQocmVjb3JkKSk7XG4gICAgfVxuICAgIHNlcmlhbGl6ZVJlY29yZChyZWNvcmQpIHtcbiAgICAgICAgbGV0IHJlc291cmNlID0ge1xuICAgICAgICAgICAgdHlwZTogdGhpcy5yZXNvdXJjZVR5cGUocmVjb3JkLnR5cGUpXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuc2VyaWFsaXplSWQocmVzb3VyY2UsIHJlY29yZCk7XG4gICAgICAgIHRoaXMuc2VyaWFsaXplQXR0cmlidXRlcyhyZXNvdXJjZSwgcmVjb3JkKTtcbiAgICAgICAgdGhpcy5zZXJpYWxpemVSZWxhdGlvbnNoaXBzKHJlc291cmNlLCByZWNvcmQpO1xuICAgICAgICByZXR1cm4gcmVzb3VyY2U7XG4gICAgfVxuICAgIHNlcmlhbGl6ZUlkKHJlc291cmNlLCByZWNvcmQpIHtcbiAgICAgICAgbGV0IHZhbHVlID0gdGhpcy5yZXNvdXJjZUlkKHJlY29yZC50eXBlLCByZWNvcmQuaWQpO1xuICAgICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmVzb3VyY2UuaWQgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBzZXJpYWxpemVBdHRyaWJ1dGVzKHJlc291cmNlLCByZWNvcmQpIHtcbiAgICAgICAgaWYgKHJlY29yZC5hdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhyZWNvcmQuYXR0cmlidXRlcykuZm9yRWFjaChhdHRyID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlcmlhbGl6ZUF0dHJpYnV0ZShyZXNvdXJjZSwgcmVjb3JkLCBhdHRyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHNlcmlhbGl6ZUF0dHJpYnV0ZShyZXNvdXJjZSwgcmVjb3JkLCBhdHRyKSB7XG4gICAgICAgIGxldCB2YWx1ZSA9IHJlY29yZC5hdHRyaWJ1dGVzW2F0dHJdO1xuICAgICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZGVlcFNldChyZXNvdXJjZSwgWydhdHRyaWJ1dGVzJywgdGhpcy5yZXNvdXJjZUF0dHJpYnV0ZShyZWNvcmQudHlwZSwgYXR0cildLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgc2VyaWFsaXplUmVsYXRpb25zaGlwcyhyZXNvdXJjZSwgcmVjb3JkKSB7XG4gICAgICAgIGlmIChyZWNvcmQucmVsYXRpb25zaGlwcykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMocmVjb3JkLnJlbGF0aW9uc2hpcHMpLmZvckVhY2gocmVsYXRpb25zaGlwID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlcmlhbGl6ZVJlbGF0aW9uc2hpcChyZXNvdXJjZSwgcmVjb3JkLCByZWxhdGlvbnNoaXApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgc2VyaWFsaXplUmVsYXRpb25zaGlwKHJlc291cmNlLCByZWNvcmQsIHJlbGF0aW9uc2hpcCkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHJlY29yZC5yZWxhdGlvbnNoaXBzW3JlbGF0aW9uc2hpcF0uZGF0YTtcbiAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBkYXRhO1xuICAgICAgICAgICAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IHZhbHVlLm1hcChpZCA9PiB0aGlzLnJlc291cmNlSWRlbnRpdHkoaWQpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBkYXRhID0gdGhpcy5yZXNvdXJjZUlkZW50aXR5KHZhbHVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCByZXNvdXJjZVJlbGF0aW9uc2hpcCA9IHRoaXMucmVzb3VyY2VSZWxhdGlvbnNoaXAocmVjb3JkLnR5cGUsIHJlbGF0aW9uc2hpcCk7XG4gICAgICAgICAgICBkZWVwU2V0KHJlc291cmNlLCBbJ3JlbGF0aW9uc2hpcHMnLCByZXNvdXJjZVJlbGF0aW9uc2hpcCwgJ2RhdGEnXSwgZGF0YSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZGVzZXJpYWxpemVEb2N1bWVudChkb2N1bWVudCkge1xuICAgICAgICBsZXQgcmVzdWx0O1xuICAgICAgICBsZXQgZGF0YSA9IGRvY3VtZW50LmRhdGE7XG4gICAgICAgIGlmIChpc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICByZXN1bHQgPSB7XG4gICAgICAgICAgICAgICAgZGF0YTogZGF0YS5tYXAodGhpcy5kZXNlcmlhbGl6ZVJlc291cmNlLCB0aGlzKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIGlmIChkYXRhICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXN1bHQgPSB7XG4gICAgICAgICAgICAgICAgZGF0YTogdGhpcy5kZXNlcmlhbGl6ZVJlc291cmNlKGRhdGEpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0ID0geyBkYXRhOiBudWxsIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRvY3VtZW50LmluY2x1ZGVkKSB7XG4gICAgICAgICAgICByZXN1bHQuaW5jbHVkZWQgPSBkb2N1bWVudC5pbmNsdWRlZC5tYXAodGhpcy5kZXNlcmlhbGl6ZVJlc291cmNlLCB0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBkZXNlcmlhbGl6ZVJlc291cmNlKHJlc291cmNlKSB7XG4gICAgICAgIGxldCByZWNvcmQ7XG4gICAgICAgIGxldCB0eXBlID0gdGhpcy5yZWNvcmRUeXBlKHJlc291cmNlLnR5cGUpO1xuICAgICAgICBsZXQgcmVzb3VyY2VLZXkgPSB0aGlzLnJlc291cmNlS2V5KHR5cGUpO1xuICAgICAgICBpZiAocmVzb3VyY2VLZXkgPT09ICdpZCcpIHtcbiAgICAgICAgICAgIHJlY29yZCA9IHsgdHlwZSwgaWQ6IHJlc291cmNlLmlkIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgaWQ7XG4gICAgICAgICAgICBsZXQga2V5cztcbiAgICAgICAgICAgIGlmIChyZXNvdXJjZS5pZCkge1xuICAgICAgICAgICAgICAgIGtleXMgPSB7XG4gICAgICAgICAgICAgICAgICAgIFtyZXNvdXJjZUtleV06IHJlc291cmNlLmlkXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBpZCA9IHRoaXMua2V5TWFwLmlkRnJvbUtleXModHlwZSwga2V5cykgfHwgdGhpcy5zY2hlbWEuZ2VuZXJhdGVJZCh0eXBlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWQgPSB0aGlzLnNjaGVtYS5nZW5lcmF0ZUlkKHR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVjb3JkID0geyB0eXBlLCBpZCB9O1xuICAgICAgICAgICAgaWYgKGtleXMpIHtcbiAgICAgICAgICAgICAgICByZWNvcmQua2V5cyA9IGtleXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5kZXNlcmlhbGl6ZUF0dHJpYnV0ZXMocmVjb3JkLCByZXNvdXJjZSk7XG4gICAgICAgIHRoaXMuZGVzZXJpYWxpemVSZWxhdGlvbnNoaXBzKHJlY29yZCwgcmVzb3VyY2UpO1xuICAgICAgICBpZiAodGhpcy5rZXlNYXApIHtcbiAgICAgICAgICAgIHRoaXMua2V5TWFwLnB1c2hSZWNvcmQocmVjb3JkKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVjb3JkO1xuICAgIH1cbiAgICBkZXNlcmlhbGl6ZUF0dHJpYnV0ZXMocmVjb3JkLCByZXNvdXJjZSkge1xuICAgICAgICBpZiAocmVzb3VyY2UuYXR0cmlidXRlcykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMocmVzb3VyY2UuYXR0cmlidXRlcykuZm9yRWFjaChyZXNvdXJjZUF0dHJpYnV0ZSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IGF0dHJpYnV0ZSA9IHRoaXMucmVjb3JkQXR0cmlidXRlKHJlY29yZC50eXBlLCByZXNvdXJjZUF0dHJpYnV0ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc2NoZW1hLmhhc0F0dHJpYnV0ZShyZWNvcmQudHlwZSwgYXR0cmlidXRlKSkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgdmFsdWUgPSByZXNvdXJjZS5hdHRyaWJ1dGVzW3Jlc291cmNlQXR0cmlidXRlXTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kZXNlcmlhbGl6ZUF0dHJpYnV0ZShyZWNvcmQsIGF0dHJpYnV0ZSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGRlc2VyaWFsaXplQXR0cmlidXRlKHJlY29yZCwgYXR0ciwgdmFsdWUpIHtcbiAgICAgICAgcmVjb3JkLmF0dHJpYnV0ZXMgPSByZWNvcmQuYXR0cmlidXRlcyB8fCB7fTtcbiAgICAgICAgcmVjb3JkLmF0dHJpYnV0ZXNbYXR0cl0gPSB2YWx1ZTtcbiAgICB9XG4gICAgZGVzZXJpYWxpemVSZWxhdGlvbnNoaXBzKHJlY29yZCwgcmVzb3VyY2UpIHtcbiAgICAgICAgaWYgKHJlc291cmNlLnJlbGF0aW9uc2hpcHMpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKHJlc291cmNlLnJlbGF0aW9uc2hpcHMpLmZvckVhY2gocmVzb3VyY2VSZWwgPT4ge1xuICAgICAgICAgICAgICAgIGxldCByZWxhdGlvbnNoaXAgPSB0aGlzLnJlY29yZFJlbGF0aW9uc2hpcChyZWNvcmQudHlwZSwgcmVzb3VyY2VSZWwpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnNjaGVtYS5oYXNSZWxhdGlvbnNoaXAocmVjb3JkLnR5cGUsIHJlbGF0aW9uc2hpcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHZhbHVlID0gcmVzb3VyY2UucmVsYXRpb25zaGlwc1tyZXNvdXJjZVJlbF07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGVzZXJpYWxpemVSZWxhdGlvbnNoaXAocmVjb3JkLCByZWxhdGlvbnNoaXAsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBkZXNlcmlhbGl6ZVJlbGF0aW9uc2hpcChyZWNvcmQsIHJlbGF0aW9uc2hpcCwgdmFsdWUpIHtcbiAgICAgICAgbGV0IHJlc291cmNlRGF0YSA9IHZhbHVlLmRhdGE7XG4gICAgICAgIGlmIChyZXNvdXJjZURhdGEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGV0IGRhdGE7XG4gICAgICAgICAgICBpZiAocmVzb3VyY2VEYXRhID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IG51bGw7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzQXJyYXkocmVzb3VyY2VEYXRhKSkge1xuICAgICAgICAgICAgICAgIGRhdGEgPSByZXNvdXJjZURhdGEubWFwKHJlc291cmNlSWRlbnRpdHkgPT4gdGhpcy5yZWNvcmRJZGVudGl0eShyZXNvdXJjZUlkZW50aXR5KSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRhdGEgPSB0aGlzLnJlY29yZElkZW50aXR5KHJlc291cmNlRGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZWNvcmQucmVsYXRpb25zaGlwcyA9IHJlY29yZC5yZWxhdGlvbnNoaXBzIHx8IHt9O1xuICAgICAgICAgICAgcmVjb3JkLnJlbGF0aW9uc2hpcHNbcmVsYXRpb25zaGlwXSA9IHsgZGF0YSB9O1xuICAgICAgICB9XG4gICAgfVxuICAgIF9nZW5lcmF0ZU5ld0lkKHR5cGUsIGtleU5hbWUsIGtleVZhbHVlKSB7XG4gICAgICAgIGxldCBpZCA9IHRoaXMuc2NoZW1hLmdlbmVyYXRlSWQodHlwZSk7XG4gICAgICAgIHRoaXMua2V5TWFwLnB1c2hSZWNvcmQoe1xuICAgICAgICAgICAgdHlwZSxcbiAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAga2V5czoge1xuICAgICAgICAgICAgICAgIFtrZXlOYW1lXToga2V5VmFsdWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBpZDtcbiAgICB9XG59Il19