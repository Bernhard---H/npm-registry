var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

import { isArray, dasherize, camelize, deepSet } from '@orbit/utils';

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
        return dasherize(this.schema.pluralize(type));
    };

    JSONAPISerializer.prototype.resourceRelationship = function resourceRelationship(type, relationship) {
        return dasherize(relationship);
    };

    JSONAPISerializer.prototype.resourceAttribute = function resourceAttribute(type, attr) {
        return dasherize(attr);
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
        return camelize(this.schema.singularize(resourceType));
    };

    JSONAPISerializer.prototype.recordIdentity = function recordIdentity(resourceIdentity) {
        var type = this.recordType(resourceIdentity.type);
        var id = this.recordId(type, resourceIdentity.id);
        return { type: type, id: id };
    };

    JSONAPISerializer.prototype.recordAttribute = function recordAttribute(type, resourceAttribute) {
        return camelize(resourceAttribute);
    };

    JSONAPISerializer.prototype.recordRelationship = function recordRelationship(type, resourceRelationship) {
        return camelize(resourceRelationship);
    };

    JSONAPISerializer.prototype.serializeDocument = function serializeDocument(data) {
        return {
            data: isArray(data) ? this.serializeRecords(data) : this.serializeRecord(data)
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
            deepSet(resource, ['attributes', this.resourceAttribute(record.type, attr)], value);
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
            if (isArray(value)) {
                data = value.map(function (id) {
                    return _this5.resourceIdentity(id);
                });
            } else if (value !== null) {
                data = this.resourceIdentity(value);
            } else {
                data = null;
            }
            var resourceRelationship = this.resourceRelationship(record.type, relationship);
            deepSet(resource, ['relationships', resourceRelationship, 'data'], data);
        }
    };

    JSONAPISerializer.prototype.deserializeDocument = function deserializeDocument(document) {
        var result = void 0;
        var data = document.data;
        if (isArray(data)) {
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
            } else if (isArray(resourceData)) {
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

export default JSONAPISerializer;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpzb25hcGktc2VyaWFsaXplci5qcyJdLCJuYW1lcyI6WyJpc0FycmF5IiwiZGFzaGVyaXplIiwiY2FtZWxpemUiLCJkZWVwU2V0IiwiSlNPTkFQSVNlcmlhbGl6ZXIiLCJzZXR0aW5ncyIsIl9zY2hlbWEiLCJzY2hlbWEiLCJfa2V5TWFwIiwia2V5TWFwIiwicmVzb3VyY2VLZXkiLCJ0eXBlIiwicmVzb3VyY2VUeXBlIiwicGx1cmFsaXplIiwicmVzb3VyY2VSZWxhdGlvbnNoaXAiLCJyZWxhdGlvbnNoaXAiLCJyZXNvdXJjZUF0dHJpYnV0ZSIsImF0dHIiLCJyZXNvdXJjZUlkZW50aXR5IiwiaWRlbnRpdHkiLCJpZCIsInJlc291cmNlSWQiLCJyZXNvdXJjZUlkcyIsImlkcyIsIm1hcCIsImlkVG9LZXkiLCJyZWNvcmRJZCIsImV4aXN0aW5nSWQiLCJrZXlUb0lkIiwiX2dlbmVyYXRlTmV3SWQiLCJyZWNvcmRUeXBlIiwic2luZ3VsYXJpemUiLCJyZWNvcmRJZGVudGl0eSIsInJlY29yZEF0dHJpYnV0ZSIsInJlY29yZFJlbGF0aW9uc2hpcCIsInNlcmlhbGl6ZURvY3VtZW50IiwiZGF0YSIsInNlcmlhbGl6ZVJlY29yZHMiLCJzZXJpYWxpemVSZWNvcmQiLCJyZWNvcmRzIiwicmVjb3JkIiwicmVzb3VyY2UiLCJzZXJpYWxpemVJZCIsInNlcmlhbGl6ZUF0dHJpYnV0ZXMiLCJzZXJpYWxpemVSZWxhdGlvbnNoaXBzIiwidmFsdWUiLCJ1bmRlZmluZWQiLCJhdHRyaWJ1dGVzIiwiT2JqZWN0Iiwia2V5cyIsImZvckVhY2giLCJzZXJpYWxpemVBdHRyaWJ1dGUiLCJyZWxhdGlvbnNoaXBzIiwic2VyaWFsaXplUmVsYXRpb25zaGlwIiwiZGVzZXJpYWxpemVEb2N1bWVudCIsImRvY3VtZW50IiwicmVzdWx0IiwiZGVzZXJpYWxpemVSZXNvdXJjZSIsImluY2x1ZGVkIiwiaWRGcm9tS2V5cyIsImdlbmVyYXRlSWQiLCJkZXNlcmlhbGl6ZUF0dHJpYnV0ZXMiLCJkZXNlcmlhbGl6ZVJlbGF0aW9uc2hpcHMiLCJwdXNoUmVjb3JkIiwiYXR0cmlidXRlIiwiaGFzQXR0cmlidXRlIiwiZGVzZXJpYWxpemVBdHRyaWJ1dGUiLCJyZXNvdXJjZVJlbCIsImhhc1JlbGF0aW9uc2hpcCIsImRlc2VyaWFsaXplUmVsYXRpb25zaGlwIiwicmVzb3VyY2VEYXRhIiwia2V5TmFtZSIsImtleVZhbHVlIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUEsU0FBU0EsT0FBVCxFQUFrQkMsU0FBbEIsRUFBNkJDLFFBQTdCLEVBQXVDQyxPQUF2QyxRQUFzRCxjQUF0RDs7SUFDcUJDLGlCO0FBQ2pCLCtCQUFZQyxRQUFaLEVBQXNCO0FBQUE7O0FBQ2xCLGFBQUtDLE9BQUwsR0FBZUQsU0FBU0UsTUFBeEI7QUFDQSxhQUFLQyxPQUFMLEdBQWVILFNBQVNJLE1BQXhCO0FBQ0g7O2dDQU9EQyxXLHdCQUFZQyxJLEVBQU07QUFDZCxlQUFPLElBQVA7QUFDSCxLOztnQ0FDREMsWSx5QkFBYUQsSSxFQUFNO0FBQ2YsZUFBT1YsVUFBVSxLQUFLTSxNQUFMLENBQVlNLFNBQVosQ0FBc0JGLElBQXRCLENBQVYsQ0FBUDtBQUNILEs7O2dDQUNERyxvQixpQ0FBcUJILEksRUFBTUksWSxFQUFjO0FBQ3JDLGVBQU9kLFVBQVVjLFlBQVYsQ0FBUDtBQUNILEs7O2dDQUNEQyxpQiw4QkFBa0JMLEksRUFBTU0sSSxFQUFNO0FBQzFCLGVBQU9oQixVQUFVZ0IsSUFBVixDQUFQO0FBQ0gsSzs7Z0NBQ0RDLGdCLDZCQUFpQkMsUSxFQUFVO0FBQ3ZCLGVBQU87QUFDSFIsa0JBQU0sS0FBS0MsWUFBTCxDQUFrQk8sU0FBU1IsSUFBM0IsQ0FESDtBQUVIUyxnQkFBSSxLQUFLQyxVQUFMLENBQWdCRixTQUFTUixJQUF6QixFQUErQlEsU0FBU0MsRUFBeEM7QUFGRCxTQUFQO0FBSUgsSzs7Z0NBQ0RFLFcsd0JBQVlYLEksRUFBTVksRyxFQUFLO0FBQUE7O0FBQ25CLGVBQU9BLElBQUlDLEdBQUosQ0FBUTtBQUFBLG1CQUFN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SUFBckIsRUFBMkI7QUFDdkJsQyx1QkFBTyxJQUFQO0FBQ0gsYUFGRCxNQUVPLElBQUlwQyxRQUFRc0UsWUFBUixDQUFKLEVBQTJCO0FBQzlCbEMsdUJBQU9rQyxhQUFhOUMsR0FBYixDQUFpQjtBQUFBLDJCQUFvQixPQUFLUSxjQUFMLENBQW9CZCxnQkFBcEIsQ0FBcEI7QUFBQSxpQkFBakIsQ0FBUDtBQUNILGFBRk0sTUFFQTtBQUNIa0IsdUJBQU8sS0FBS0osY0FBTCxDQUFvQnNDLFlBQXBCLENBQVA7QUFDSDtBQUNEOUIsbUJBQU9ZLGFBQVAsR0FBdUJaLE9BQU9ZLGFBQVAsSUFBd0IsRUFBL0M7QUFDQVosbUJBQU9ZLGFBQVAsQ0FBcUJyQyxZQUFyQixJQUFxQyxFQUFFcUIsVUFBRixFQUFyQztBQUNIO0FBQ0osSzs7Z0NBQ0RQLGMsMkJBQWVsQixJLEVBQU00RCxPLEVBQVNDLFEsRUFBVTtBQUFBOztBQUNwQyxZQUFJcEQsS0FBSyxLQUFLYixNQUFMLENBQVlxRCxVQUFaLENBQXVCakQsSUFBdkIsQ0FBVDtBQUNBLGFBQUtGLE1BQUwsQ0FBWXNELFVBQVosQ0FBdUI7QUFDbkJwRCxzQkFEbUI7QUFFbkJTLGtCQUZtQjtBQUduQjZCLHVDQUNLc0IsT0FETCxJQUNlQyxRQURmO0FBSG1CLFNBQXZCO0FBT0EsZUFBT3BELEVBQVA7QUFDSCxLOzs7O3lCQXZOWTtBQUNULG1CQUFPLEtBQUtkLE9BQVo7QUFDSDs7O3lCQUNZO0FBQ1QsbUJBQU8sS0FBS0UsT0FBWjtBQUNIOzs7Ozs7ZUFWZ0JKLGlCIiwiZmlsZSI6Impzb25hcGktc2VyaWFsaXplci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGlzQXJyYXksIGRhc2hlcml6ZSwgY2FtZWxpemUsIGRlZXBTZXQgfSBmcm9tICdAb3JiaXQvdXRpbHMnO1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSlNPTkFQSVNlcmlhbGl6ZXIge1xuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzKSB7XG4gICAgICAgIHRoaXMuX3NjaGVtYSA9IHNldHRpbmdzLnNjaGVtYTtcbiAgICAgICAgdGhpcy5fa2V5TWFwID0gc2V0dGluZ3Mua2V5TWFwO1xuICAgIH1cbiAgICBnZXQgc2NoZW1hKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2NoZW1hO1xuICAgIH1cbiAgICBnZXQga2V5TWFwKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fa2V5TWFwO1xuICAgIH1cbiAgICByZXNvdXJjZUtleSh0eXBlKSB7XG4gICAgICAgIHJldHVybiAnaWQnO1xuICAgIH1cbiAgICByZXNvdXJjZVR5cGUodHlwZSkge1xuICAgICAgICByZXR1cm4gZGFzaGVyaXplKHRoaXMuc2NoZW1hLnBsdXJhbGl6ZSh0eXBlKSk7XG4gICAgfVxuICAgIHJlc291cmNlUmVsYXRpb25zaGlwKHR5cGUsIHJlbGF0aW9uc2hpcCkge1xuICAgICAgICByZXR1cm4gZGFzaGVyaXplKHJlbGF0aW9uc2hpcCk7XG4gICAgfVxuICAgIHJlc291cmNlQXR0cmlidXRlKHR5cGUsIGF0dHIpIHtcbiAgICAgICAgcmV0dXJuIGRhc2hlcml6ZShhdHRyKTtcbiAgICB9XG4gICAgcmVzb3VyY2VJZGVudGl0eShpZGVudGl0eSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogdGhpcy5yZXNvdXJjZVR5cGUoaWRlbnRpdHkudHlwZSksXG4gICAgICAgICAgICBpZDogdGhpcy5yZXNvdXJjZUlkKGlkZW50aXR5LnR5cGUsIGlkZW50aXR5LmlkKVxuICAgICAgICB9O1xuICAgIH1cbiAgICByZXNvdXJjZUlkcyh0eXBlLCBpZHMpIHtcbiAgICAgICAgcmV0dXJuIGlkcy5tYXAoaWQgPT4gdGhpcy5yZXNvdXJjZUlkKHR5cGUsIGlkKSk7XG4gICAgfVxuICAgIHJlc291cmNlSWQodHlwZSwgaWQpIHtcbiAgICAgICAgbGV0IHJlc291cmNlS2V5ID0gdGhpcy5yZXNvdXJjZUtleSh0eXBlKTtcbiAgICAgICAgaWYgKHJlc291cmNlS2V5ID09PSAnaWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gaWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5rZXlNYXAuaWRUb0tleSh0eXBlLCByZXNvdXJjZUtleSwgaWQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJlY29yZElkKHR5cGUsIHJlc291cmNlSWQpIHtcbiAgICAgICAgbGV0IHJlc291cmNlS2V5ID0gdGhpcy5yZXNvdXJjZUtleSh0eXBlKTtcbiAgICAgICAgaWYgKHJlc291cmNlS2V5ID09PSAnaWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzb3VyY2VJZDtcbiAgICAgICAgfVxuICAgICAgICBsZXQgZXhpc3RpbmdJZCA9IHRoaXMua2V5TWFwLmtleVRvSWQodHlwZSwgcmVzb3VyY2VLZXksIHJlc291cmNlSWQpO1xuICAgICAgICBpZiAoZXhpc3RpbmdJZCkge1xuICAgICAgICAgICAgcmV0dXJuIGV4aXN0aW5nSWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2dlbmVyYXRlTmV3SWQodHlwZSwgcmVzb3VyY2VLZXksIHJlc291cmNlSWQpO1xuICAgIH1cbiAgICByZWNvcmRUeXBlKHJlc291cmNlVHlwZSkge1xuICAgICAgICByZXR1cm4gY2FtZWxpemUodGhpcy5zY2hlbWEuc2luZ3VsYXJpemUocmVzb3VyY2VUeXBlKSk7XG4gICAgfVxuICAgIHJlY29yZElkZW50aXR5KHJlc291cmNlSWRlbnRpdHkpIHtcbiAgICAgICAgbGV0IHR5cGUgPSB0aGlzLnJlY29yZFR5cGUocmVzb3VyY2VJZGVudGl0eS50eXBlKTtcbiAgICAgICAgbGV0IGlkID0gdGhpcy5yZWNvcmRJZCh0eXBlLCByZXNvdXJjZUlkZW50aXR5LmlkKTtcbiAgICAgICAgcmV0dXJuIHsgdHlwZSwgaWQgfTtcbiAgICB9XG4gICAgcmVjb3JkQXR0cmlidXRlKHR5cGUsIHJlc291cmNlQXR0cmlidXRlKSB7XG4gICAgICAgIHJldHVybiBjYW1lbGl6ZShyZXNvdXJjZUF0dHJpYnV0ZSk7XG4gICAgfVxuICAgIHJlY29yZFJlbGF0aW9uc2hpcCh0eXBlLCByZXNvdXJjZVJlbGF0aW9uc2hpcCkge1xuICAgICAgICByZXR1cm4gY2FtZWxpemUocmVzb3VyY2VSZWxhdGlvbnNoaXApO1xuICAgIH1cbiAgICBzZXJpYWxpemVEb2N1bWVudChkYXRhKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkYXRhOiBpc0FycmF5KGRhdGEpID8gdGhpcy5zZXJpYWxpemVSZWNvcmRzKGRhdGEpIDogdGhpcy5zZXJpYWxpemVSZWNvcmQoZGF0YSlcbiAgICAgICAgfTtcbiAgICB9XG4gICAgc2VyaWFsaXplUmVjb3JkcyhyZWNvcmRzKSB7XG4gICAgICAgIHJldHVybiByZWNvcmRzLm1hcChyZWNvcmQgPT4gdGhpcy5zZXJpYWxpemVSZWNvcmQocmVjb3JkKSk7XG4gICAgfVxuICAgIHNlcmlhbGl6ZVJlY29yZChyZWNvcmQpIHtcbiAgICAgICAgbGV0IHJlc291cmNlID0ge1xuICAgICAgICAgICAgdHlwZTogdGhpcy5yZXNvdXJjZVR5cGUocmVjb3JkLnR5cGUpXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuc2VyaWFsaXplSWQocmVzb3VyY2UsIHJlY29yZCk7XG4gICAgICAgIHRoaXMuc2VyaWFsaXplQXR0cmlidXRlcyhyZXNvdXJjZSwgcmVjb3JkKTtcbiAgICAgICAgdGhpcy5zZXJpYWxpemVSZWxhdGlvbnNoaXBzKHJlc291cmNlLCByZWNvcmQpO1xuICAgICAgICByZXR1cm4gcmVzb3VyY2U7XG4gICAgfVxuICAgIHNlcmlhbGl6ZUlkKHJlc291cmNlLCByZWNvcmQpIHtcbiAgICAgICAgbGV0IHZhbHVlID0gdGhpcy5yZXNvdXJjZUlkKHJlY29yZC50eXBlLCByZWNvcmQuaWQpO1xuICAgICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmVzb3VyY2UuaWQgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBzZXJpYWxpemVBdHRyaWJ1dGVzKHJlc291cmNlLCByZWNvcmQpIHtcbiAgICAgICAgaWYgKHJlY29yZC5hdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhyZWNvcmQuYXR0cmlidXRlcykuZm9yRWFjaChhdHRyID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlcmlhbGl6ZUF0dHJpYnV0ZShyZXNvdXJjZSwgcmVjb3JkLCBhdHRyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHNlcmlhbGl6ZUF0dHJpYnV0ZShyZXNvdXJjZSwgcmVjb3JkLCBhdHRyKSB7XG4gICAgICAgIGxldCB2YWx1ZSA9IHJlY29yZC5hdHRyaWJ1dGVzW2F0dHJdO1xuICAgICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZGVlcFNldChyZXNvdXJjZSwgWydhdHRyaWJ1dGVzJywgdGhpcy5yZXNvdXJjZUF0dHJpYnV0ZShyZWNvcmQudHlwZSwgYXR0cildLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgc2VyaWFsaXplUmVsYXRpb25zaGlwcyhyZXNvdXJjZSwgcmVjb3JkKSB7XG4gICAgICAgIGlmIChyZWNvcmQucmVsYXRpb25zaGlwcykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMocmVjb3JkLnJlbGF0aW9uc2hpcHMpLmZvckVhY2gocmVsYXRpb25zaGlwID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlcmlhbGl6ZVJlbGF0aW9uc2hpcChyZXNvdXJjZSwgcmVjb3JkLCByZWxhdGlvbnNoaXApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgc2VyaWFsaXplUmVsYXRpb25zaGlwKHJlc291cmNlLCByZWNvcmQsIHJlbGF0aW9uc2hpcCkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHJlY29yZC5yZWxhdGlvbnNoaXBzW3JlbGF0aW9uc2hpcF0uZGF0YTtcbiAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBkYXRhO1xuICAgICAgICAgICAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IHZhbHVlLm1hcChpZCA9PiB0aGlzLnJlc291cmNlSWRlbnRpdHkoaWQpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBkYXRhID0gdGhpcy5yZXNvdXJjZUlkZW50aXR5KHZhbHVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCByZXNvdXJjZVJlbGF0aW9uc2hpcCA9IHRoaXMucmVzb3VyY2VSZWxhdGlvbnNoaXAocmVjb3JkLnR5cGUsIHJlbGF0aW9uc2hpcCk7XG4gICAgICAgICAgICBkZWVwU2V0KHJlc291cmNlLCBbJ3JlbGF0aW9uc2hpcHMnLCByZXNvdXJjZVJlbGF0aW9uc2hpcCwgJ2RhdGEnXSwgZGF0YSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZGVzZXJpYWxpemVEb2N1bWVudChkb2N1bWVudCkge1xuICAgICAgICBsZXQgcmVzdWx0O1xuICAgICAgICBsZXQgZGF0YSA9IGRvY3VtZW50LmRhdGE7XG4gICAgICAgIGlmIChpc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICByZXN1bHQgPSB7XG4gICAgICAgICAgICAgICAgZGF0YTogZGF0YS5tYXAodGhpcy5kZXNlcmlhbGl6ZVJlc291cmNlLCB0aGlzKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHtcbiAgICAgICAgICAgICAgICBkYXRhOiB0aGlzLmRlc2VyaWFsaXplUmVzb3VyY2UoZGF0YSlcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRvY3VtZW50LmluY2x1ZGVkKSB7XG4gICAgICAgICAgICByZXN1bHQuaW5jbHVkZWQgPSBkb2N1bWVudC5pbmNsdWRlZC5tYXAodGhpcy5kZXNlcmlhbGl6ZVJlc291cmNlLCB0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBkZXNlcmlhbGl6ZVJlc291cmNlKHJlc291cmNlKSB7XG4gICAgICAgIGxldCByZWNvcmQ7XG4gICAgICAgIGxldCB0eXBlID0gdGhpcy5yZWNvcmRUeXBlKHJlc291cmNlLnR5cGUpO1xuICAgICAgICBsZXQgcmVzb3VyY2VLZXkgPSB0aGlzLnJlc291cmNlS2V5KHR5cGUpO1xuICAgICAgICBpZiAocmVzb3VyY2VLZXkgPT09ICdpZCcpIHtcbiAgICAgICAgICAgIHJlY29yZCA9IHsgdHlwZSwgaWQ6IHJlc291cmNlLmlkIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgaWQ7XG4gICAgICAgICAgICBsZXQga2V5cztcbiAgICAgICAgICAgIGlmIChyZXNvdXJjZS5pZCkge1xuICAgICAgICAgICAgICAgIGtleXMgPSB7XG4gICAgICAgICAgICAgICAgICAgIFtyZXNvdXJjZUtleV06IHJlc291cmNlLmlkXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBpZCA9IHRoaXMua2V5TWFwLmlkRnJvbUtleXModHlwZSwga2V5cykgfHwgdGhpcy5zY2hlbWEuZ2VuZXJhdGVJZCh0eXBlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWQgPSB0aGlzLnNjaGVtYS5nZW5lcmF0ZUlkKHR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVjb3JkID0geyB0eXBlLCBpZCB9O1xuICAgICAgICAgICAgaWYgKGtleXMpIHtcbiAgICAgICAgICAgICAgICByZWNvcmQua2V5cyA9IGtleXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5kZXNlcmlhbGl6ZUF0dHJpYnV0ZXMocmVjb3JkLCByZXNvdXJjZSk7XG4gICAgICAgIHRoaXMuZGVzZXJpYWxpemVSZWxhdGlvbnNoaXBzKHJlY29yZCwgcmVzb3VyY2UpO1xuICAgICAgICBpZiAodGhpcy5rZXlNYXApIHtcbiAgICAgICAgICAgIHRoaXMua2V5TWFwLnB1c2hSZWNvcmQocmVjb3JkKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVjb3JkO1xuICAgIH1cbiAgICBkZXNlcmlhbGl6ZUF0dHJpYnV0ZXMocmVjb3JkLCByZXNvdXJjZSkge1xuICAgICAgICBpZiAocmVzb3VyY2UuYXR0cmlidXRlcykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMocmVzb3VyY2UuYXR0cmlidXRlcykuZm9yRWFjaChyZXNvdXJjZUF0dHJpYnV0ZSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IGF0dHJpYnV0ZSA9IHRoaXMucmVjb3JkQXR0cmlidXRlKHJlY29yZC50eXBlLCByZXNvdXJjZUF0dHJpYnV0ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc2NoZW1hLmhhc0F0dHJpYnV0ZShyZWNvcmQudHlwZSwgYXR0cmlidXRlKSkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgdmFsdWUgPSByZXNvdXJjZS5hdHRyaWJ1dGVzW3Jlc291cmNlQXR0cmlidXRlXTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kZXNlcmlhbGl6ZUF0dHJpYnV0ZShyZWNvcmQsIGF0dHJpYnV0ZSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGRlc2VyaWFsaXplQXR0cmlidXRlKHJlY29yZCwgYXR0ciwgdmFsdWUpIHtcbiAgICAgICAgcmVjb3JkLmF0dHJpYnV0ZXMgPSByZWNvcmQuYXR0cmlidXRlcyB8fCB7fTtcbiAgICAgICAgcmVjb3JkLmF0dHJpYnV0ZXNbYXR0cl0gPSB2YWx1ZTtcbiAgICB9XG4gICAgZGVzZXJpYWxpemVSZWxhdGlvbnNoaXBzKHJlY29yZCwgcmVzb3VyY2UpIHtcbiAgICAgICAgaWYgKHJlc291cmNlLnJlbGF0aW9uc2hpcHMpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKHJlc291cmNlLnJlbGF0aW9uc2hpcHMpLmZvckVhY2gocmVzb3VyY2VSZWwgPT4ge1xuICAgICAgICAgICAgICAgIGxldCByZWxhdGlvbnNoaXAgPSB0aGlzLnJlY29yZFJlbGF0aW9uc2hpcChyZWNvcmQudHlwZSwgcmVzb3VyY2VSZWwpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnNjaGVtYS5oYXNSZWxhdGlvbnNoaXAocmVjb3JkLnR5cGUsIHJlbGF0aW9uc2hpcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHZhbHVlID0gcmVzb3VyY2UucmVsYXRpb25zaGlwc1tyZXNvdXJjZVJlbF07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGVzZXJpYWxpemVSZWxhdGlvbnNoaXAocmVjb3JkLCByZWxhdGlvbnNoaXAsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBkZXNlcmlhbGl6ZVJlbGF0aW9uc2hpcChyZWNvcmQsIHJlbGF0aW9uc2hpcCwgdmFsdWUpIHtcbiAgICAgICAgbGV0IHJlc291cmNlRGF0YSA9IHZhbHVlLmRhdGE7XG4gICAgICAgIGlmIChyZXNvdXJjZURhdGEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGV0IGRhdGE7XG4gICAgICAgICAgICBpZiAocmVzb3VyY2VEYXRhID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IG51bGw7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzQXJyYXkocmVzb3VyY2VEYXRhKSkge1xuICAgICAgICAgICAgICAgIGRhdGEgPSByZXNvdXJjZURhdGEubWFwKHJlc291cmNlSWRlbnRpdHkgPT4gdGhpcy5yZWNvcmRJZGVudGl0eShyZXNvdXJjZUlkZW50aXR5KSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRhdGEgPSB0aGlzLnJlY29yZElkZW50aXR5KHJlc291cmNlRGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZWNvcmQucmVsYXRpb25zaGlwcyA9IHJlY29yZC5yZWxhdGlvbnNoaXBzIHx8IHt9O1xuICAgICAgICAgICAgcmVjb3JkLnJlbGF0aW9uc2hpcHNbcmVsYXRpb25zaGlwXSA9IHsgZGF0YSB9O1xuICAgICAgICB9XG4gICAgfVxuICAgIF9nZW5lcmF0ZU5ld0lkKHR5cGUsIGtleU5hbWUsIGtleVZhbHVlKSB7XG4gICAgICAgIGxldCBpZCA9IHRoaXMuc2NoZW1hLmdlbmVyYXRlSWQodHlwZSk7XG4gICAgICAgIHRoaXMua2V5TWFwLnB1c2hSZWNvcmQoe1xuICAgICAgICAgICAgdHlwZSxcbiAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAga2V5czoge1xuICAgICAgICAgICAgICAgIFtrZXlOYW1lXToga2V5VmFsdWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBpZDtcbiAgICB9XG59Il19