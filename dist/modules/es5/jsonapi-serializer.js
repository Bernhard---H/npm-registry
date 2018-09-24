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

    JSONAPISerializer.prototype.deserializeDocument = function deserializeDocument(document, primaryRecordData) {
        var _this6 = this;

        var result = void 0;
        var data = void 0;
        if (isArray(document.data)) {
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
            } else if (isArray(resourceData)) {
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

export default JSONAPISerializer;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpzb25hcGktc2VyaWFsaXplci5qcyJdLCJuYW1lcyI6WyJpc0FycmF5IiwiZGFzaGVyaXplIiwiY2FtZWxpemUiLCJkZWVwU2V0IiwiSlNPTkFQSVNlcmlhbGl6ZXIiLCJzZXR0aW5ncyIsIl9zY2hlbWEiLCJzY2hlbWEiLCJfa2V5TWFwIiwia2V5TWFwIiwicmVzb3VyY2VLZXkiLCJ0eXBlIiwicmVzb3VyY2VUeXBlIiwicGx1cmFsaXplIiwicmVzb3VyY2VSZWxhdGlvbnNoaXAiLCJyZWxhdGlvbnNoaXAiLCJyZXNvdXJjZUF0dHJpYnV0ZSIsImF0dHIiLCJyZXNvdXJjZUlkZW50aXR5IiwiaWRlbnRpdHkiLCJpZCIsInJlc291cmNlSWQiLCJyZXNvdXJjZUlkcyIsImlkcyIsIm1hcCIsImlkVG9LZXkiLCJyZWNvcmRJZCIsImV4aXN0aW5nSWQiLCJrZXlUb0lkIiwiX2dlbmVyYXRlTmV3SWQiLCJyZWNvcmRUeXBlIiwic2luZ3VsYXJpemUiLCJyZWNvcmRJZGVudGl0eSIsInJlY29yZEF0dHJpYnV0ZSIsInJlY29yZFJlbGF0aW9uc2hpcCIsInNlcmlhbGl6ZURvY3VtZW50IiwiZGF0YSIsInNlcmlhbGl6ZVJlY29yZHMiLCJzZXJpYWxpemVSZWNvcmQiLCJyZWNvcmRzIiwicmVjb3JkIiwicmVzb3VyY2UiLCJzZXJpYWxpemVJZCIsInNlcmlhbGl6ZUF0dHJpYnV0ZXMiLCJzZXJpYWxpemVSZWxhdGlvbnNoaXBzIiwidmFsdWUiLCJ1bmRlZmluZWQiLCJhdHRyaWJ1dGVzIiwiT2JqZWN0Iiwia2V5cyIsImZvckVhY2giLCJzZXJpYWxpemVBdHRyaWJ1dGUiLCJyZWxhdGlvbnNoaXBzIiwic2VyaWFsaXplUmVsYXRpb25zaGlwIiwiZGVzZXJpYWxpemVEb2N1bWVudCIsImRvY3VtZW50IiwicHJpbWFyeVJlY29yZERhdGEiLCJyZXN1bHQiLCJlbnRyeSIsImkiLCJkZXNlcmlhbGl6ZVJlc291cmNlIiwiaW5jbHVkZWQiLCJlIiwicHJpbWFyeVJlY29yZCIsImlkRnJvbUtleXMiLCJnZW5lcmF0ZUlkIiwiZGVzZXJpYWxpemVBdHRyaWJ1dGVzIiwiZGVzZXJpYWxpemVSZWxhdGlvbnNoaXBzIiwicHVzaFJlY29yZCIsImF0dHJpYnV0ZSIsImhhc0F0dHJpYnV0ZSIsImRlc2VyaWFsaXplQXR0cmlidXRlIiwicmVzb3VyY2VSZWwiLCJoYXNSZWxhdGlvbnNoaXAiLCJkZXNlcmlhbGl6ZVJlbGF0aW9uc2hpcCIsInJlc291cmNlRGF0YSIsImtleU5hbWUiLCJrZXlWYWx1ZSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLFNBQVNBLE9BQVQsRUFBa0JDLFNBQWxCLEVBQTZCQyxRQUE3QixFQUF1Q0MsT0FBdkMsUUFBc0QsY0FBdEQ7O0lBQ3FCQyxpQjtBQUNqQiwrQkFBWUMsUUFBWixFQUFzQjtBQUFBOztBQUNsQixhQUFLQyxPQUFMLEdBQWVELFNBQVNFLE1BQXhCO0FBQ0EsYUFBS0MsT0FBTCxHQUFlSCxTQUFTSSxNQUF4QjtBQUNIOztnQ0FPREMsVyx3QkFBWUMsSSxFQUFNO0FBQ2QsZUFBTyxJQUFQO0FBQ0gsSzs7Z0NBQ0RDLFkseUJBQWFELEksRUFBTTtBQUNmLGVBQU9WLFVBQVUsS0FBS00sTUFBTCxDQUFZTSxTQUFaLENBQXNCRixJQUF0QixDQUFWLENBQVA7QUFDSCxLOztnQ0FDREcsb0IsaUNBQXFCSCxJLEVBQU1JLFksRUFBYztBQUNyQyxlQUFPZCxVQUFVYyxZQUFWLENBQVA7QUFDSCxLOztnQ0FDREMsaUIsOEJBQWtCTCxJLEVBQU1NLEksRUFBTTtBQUMxQixlQUFPaEIsVUFBVWdCLElBQVYsQ0FBUDtBQUNILEs7O2dDQUNEQyxnQiw2QkFBaUJDLFEsRUFBVTtBQUN2QixlQUFPO0FBQ0hSLGtCQUFNLEtBQUtDLFlBQUwsQ0FBa0JPLFNBQVNSLElBQTNCLENBREg7QUFFSFMsZ0JBQUksS0FBS0MsVUFBTCxDQUFnQkYsU0FBU1IsSUFBekIsRUFBK0JRLFNBQVNDLEVBQXhDO0FBRkQsU0FBUDtBQUlILEs7O2dDQUNERSxXLHdCQUFZWCxJLEVBQU1Z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LElBQXdCLEVBQS9DO0FBQ0FaLG1CQUFPWSxhQUFQLENBQXFCckMsWUFBckIsSUFBcUMsRUFBRXFCLFVBQUYsRUFBckM7QUFDSDtBQUNKLEs7O2dDQUNEUCxjLDJCQUFlbEIsSSxFQUFNaUUsTyxFQUFTQyxRLEVBQVU7QUFBQTs7QUFDcEMsWUFBSXpELEtBQUssS0FBS2IsTUFBTCxDQUFZMEQsVUFBWixDQUF1QnRELElBQXZCLENBQVQ7QUFDQSxhQUFLRixNQUFMLENBQVkyRCxVQUFaLENBQXVCO0FBQ25CekQsc0JBRG1CO0FBRW5CUyxrQkFGbUI7QUFHbkI2Qix1Q0FDSzJCLE9BREwsSUFDZUMsUUFEZjtBQUhtQixTQUF2QjtBQU9BLGVBQU96RCxFQUFQO0FBQ0gsSzs7Ozt5QkFoT1k7QUFDVCxtQkFBTyxLQUFLZCxPQUFaO0FBQ0g7Ozt5QkFDWTtBQUNULG1CQUFPLEtBQUtFLE9BQVo7QUFDSDs7Ozs7O2VBVmdCSixpQiIsImZpbGUiOiJqc29uYXBpLXNlcmlhbGl6ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBpc0FycmF5LCBkYXNoZXJpemUsIGNhbWVsaXplLCBkZWVwU2V0IH0gZnJvbSAnQG9yYml0L3V0aWxzJztcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEpTT05BUElTZXJpYWxpemVyIHtcbiAgICBjb25zdHJ1Y3RvcihzZXR0aW5ncykge1xuICAgICAgICB0aGlzLl9zY2hlbWEgPSBzZXR0aW5ncy5zY2hlbWE7XG4gICAgICAgIHRoaXMuX2tleU1hcCA9IHNldHRpbmdzLmtleU1hcDtcbiAgICB9XG4gICAgZ2V0IHNjaGVtYSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NjaGVtYTtcbiAgICB9XG4gICAgZ2V0IGtleU1hcCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2tleU1hcDtcbiAgICB9XG4gICAgcmVzb3VyY2VLZXkodHlwZSkge1xuICAgICAgICByZXR1cm4gJ2lkJztcbiAgICB9XG4gICAgcmVzb3VyY2VUeXBlKHR5cGUpIHtcbiAgICAgICAgcmV0dXJuIGRhc2hlcml6ZSh0aGlzLnNjaGVtYS5wbHVyYWxpemUodHlwZSkpO1xuICAgIH1cbiAgICByZXNvdXJjZVJlbGF0aW9uc2hpcCh0eXBlLCByZWxhdGlvbnNoaXApIHtcbiAgICAgICAgcmV0dXJuIGRhc2hlcml6ZShyZWxhdGlvbnNoaXApO1xuICAgIH1cbiAgICByZXNvdXJjZUF0dHJpYnV0ZSh0eXBlLCBhdHRyKSB7XG4gICAgICAgIHJldHVybiBkYXNoZXJpemUoYXR0cik7XG4gICAgfVxuICAgIHJlc291cmNlSWRlbnRpdHkoaWRlbnRpdHkpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IHRoaXMucmVzb3VyY2VUeXBlKGlkZW50aXR5LnR5cGUpLFxuICAgICAgICAgICAgaWQ6IHRoaXMucmVzb3VyY2VJZChpZGVudGl0eS50eXBlLCBpZGVudGl0eS5pZClcbiAgICAgICAgfTtcbiAgICB9XG4gICAgcmVzb3VyY2VJZHModHlwZSwgaWRzKSB7XG4gICAgICAgIHJldHVybiBpZHMubWFwKGlkID0+IHRoaXMucmVzb3VyY2VJZCh0eXBlLCBpZCkpO1xuICAgIH1cbiAgICByZXNvdXJjZUlkKHR5cGUsIGlkKSB7XG4gICAgICAgIGxldCByZXNvdXJjZUtleSA9IHRoaXMucmVzb3VyY2VLZXkodHlwZSk7XG4gICAgICAgIGlmIChyZXNvdXJjZUtleSA9PT0gJ2lkJykge1xuICAgICAgICAgICAgcmV0dXJuIGlkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMua2V5TWFwLmlkVG9LZXkodHlwZSwgcmVzb3VyY2VLZXksIGlkKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZWNvcmRJZCh0eXBlLCByZXNvdXJjZUlkKSB7XG4gICAgICAgIGxldCByZXNvdXJjZUtleSA9IHRoaXMucmVzb3VyY2VLZXkodHlwZSk7XG4gICAgICAgIGlmIChyZXNvdXJjZUtleSA9PT0gJ2lkJykge1xuICAgICAgICAgICAgcmV0dXJuIHJlc291cmNlSWQ7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGV4aXN0aW5nSWQgPSB0aGlzLmtleU1hcC5rZXlUb0lkKHR5cGUsIHJlc291cmNlS2V5LCByZXNvdXJjZUlkKTtcbiAgICAgICAgaWYgKGV4aXN0aW5nSWQpIHtcbiAgICAgICAgICAgIHJldHVybiBleGlzdGluZ0lkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9nZW5lcmF0ZU5ld0lkKHR5cGUsIHJlc291cmNlS2V5LCByZXNvdXJjZUlkKTtcbiAgICB9XG4gICAgcmVjb3JkVHlwZShyZXNvdXJjZVR5cGUpIHtcbiAgICAgICAgcmV0dXJuIGNhbWVsaXplKHRoaXMuc2NoZW1hLnNpbmd1bGFyaXplKHJlc291cmNlVHlwZSkpO1xuICAgIH1cbiAgICByZWNvcmRJZGVudGl0eShyZXNvdXJjZUlkZW50aXR5KSB7XG4gICAgICAgIGxldCB0eXBlID0gdGhpcy5yZWNvcmRUeXBlKHJlc291cmNlSWRlbnRpdHkudHlwZSk7XG4gICAgICAgIGxldCBpZCA9IHRoaXMucmVjb3JkSWQodHlwZSwgcmVzb3VyY2VJZGVudGl0eS5pZCk7XG4gICAgICAgIHJldHVybiB7IHR5cGUsIGlkIH07XG4gICAgfVxuICAgIHJlY29yZEF0dHJpYnV0ZSh0eXBlLCByZXNvdXJjZUF0dHJpYnV0ZSkge1xuICAgICAgICByZXR1cm4gY2FtZWxpemUocmVzb3VyY2VBdHRyaWJ1dGUpO1xuICAgIH1cbiAgICByZWNvcmRSZWxhdGlvbnNoaXAodHlwZSwgcmVzb3VyY2VSZWxhdGlvbnNoaXApIHtcbiAgICAgICAgcmV0dXJuIGNhbWVsaXplKHJlc291cmNlUmVsYXRpb25zaGlwKTtcbiAgICB9XG4gICAgc2VyaWFsaXplRG9jdW1lbnQoZGF0YSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGF0YTogaXNBcnJheShkYXRhKSA/IHRoaXMuc2VyaWFsaXplUmVjb3JkcyhkYXRhKSA6IHRoaXMuc2VyaWFsaXplUmVjb3JkKGRhdGEpXG4gICAgICAgIH07XG4gICAgfVxuICAgIHNlcmlhbGl6ZVJlY29yZHMocmVjb3Jkcykge1xuICAgICAgICByZXR1cm4gcmVjb3Jkcy5tYXAocmVjb3JkID0+IHRoaXMuc2VyaWFsaXplUmVjb3JkKHJlY29yZCkpO1xuICAgIH1cbiAgICBzZXJpYWxpemVSZWNvcmQocmVjb3JkKSB7XG4gICAgICAgIGxldCByZXNvdXJjZSA9IHtcbiAgICAgICAgICAgIHR5cGU6IHRoaXMucmVzb3VyY2VUeXBlKHJlY29yZC50eXBlKVxuICAgICAgICB9O1xuICAgICAgICB0aGlzLnNlcmlhbGl6ZUlkKHJlc291cmNlLCByZWNvcmQpO1xuICAgICAgICB0aGlzLnNlcmlhbGl6ZUF0dHJpYnV0ZXMocmVzb3VyY2UsIHJlY29yZCk7XG4gICAgICAgIHRoaXMuc2VyaWFsaXplUmVsYXRpb25zaGlwcyhyZXNvdXJjZSwgcmVjb3JkKTtcbiAgICAgICAgcmV0dXJuIHJlc291cmNlO1xuICAgIH1cbiAgICBzZXJpYWxpemVJZChyZXNvdXJjZSwgcmVjb3JkKSB7XG4gICAgICAgIGxldCB2YWx1ZSA9IHRoaXMucmVzb3VyY2VJZChyZWNvcmQudHlwZSwgcmVjb3JkLmlkKTtcbiAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJlc291cmNlLmlkID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgc2VyaWFsaXplQXR0cmlidXRlcyhyZXNvdXJjZSwgcmVjb3JkKSB7XG4gICAgICAgIGlmIChyZWNvcmQuYXR0cmlidXRlcykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMocmVjb3JkLmF0dHJpYnV0ZXMpLmZvckVhY2goYXR0ciA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXJpYWxpemVBdHRyaWJ1dGUocmVzb3VyY2UsIHJlY29yZCwgYXR0cik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBzZXJpYWxpemVBdHRyaWJ1dGUocmVzb3VyY2UsIHJlY29yZCwgYXR0cikge1xuICAgICAgICBsZXQgdmFsdWUgPSByZWNvcmQuYXR0cmlidXRlc1thdHRyXTtcbiAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGRlZXBTZXQocmVzb3VyY2UsIFsnYXR0cmlidXRlcycsIHRoaXMucmVzb3VyY2VBdHRyaWJ1dGUocmVjb3JkLnR5cGUsIGF0dHIpXSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHNlcmlhbGl6ZVJlbGF0aW9uc2hpcHMocmVzb3VyY2UsIHJlY29yZCkge1xuICAgICAgICBpZiAocmVjb3JkLnJlbGF0aW9uc2hpcHMpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKHJlY29yZC5yZWxhdGlvbnNoaXBzKS5mb3JFYWNoKHJlbGF0aW9uc2hpcCA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXJpYWxpemVSZWxhdGlvbnNoaXAocmVzb3VyY2UsIHJlY29yZCwgcmVsYXRpb25zaGlwKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHNlcmlhbGl6ZVJlbGF0aW9uc2hpcChyZXNvdXJjZSwgcmVjb3JkLCByZWxhdGlvbnNoaXApIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSByZWNvcmQucmVsYXRpb25zaGlwc1tyZWxhdGlvbnNoaXBdLmRhdGE7XG4gICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsZXQgZGF0YTtcbiAgICAgICAgICAgIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIGRhdGEgPSB2YWx1ZS5tYXAoaWQgPT4gdGhpcy5yZXNvdXJjZUlkZW50aXR5KGlkKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IHRoaXMucmVzb3VyY2VJZGVudGl0eSh2YWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRhdGEgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgcmVzb3VyY2VSZWxhdGlvbnNoaXAgPSB0aGlzLnJlc291cmNlUmVsYXRpb25zaGlwKHJlY29yZC50eXBlLCByZWxhdGlvbnNoaXApO1xuICAgICAgICAgICAgZGVlcFNldChyZXNvdXJjZSwgWydyZWxhdGlvbnNoaXBzJywgcmVzb3VyY2VSZWxhdGlvbnNoaXAsICdkYXRhJ10sIGRhdGEpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGRlc2VyaWFsaXplRG9jdW1lbnQoZG9jdW1lbnQsIHByaW1hcnlSZWNvcmREYXRhKSB7XG4gICAgICAgIGxldCByZXN1bHQ7XG4gICAgICAgIGxldCBkYXRhO1xuICAgICAgICBpZiAoaXNBcnJheShkb2N1bWVudC5kYXRhKSkge1xuICAgICAgICAgICAgaWYgKHByaW1hcnlSZWNvcmREYXRhICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBkYXRhID0gZG9jdW1lbnQuZGF0YS5tYXAoKGVudHJ5LCBpKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRlc2VyaWFsaXplUmVzb3VyY2UoZW50cnksIHByaW1hcnlSZWNvcmREYXRhW2ldKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IGRvY3VtZW50LmRhdGEubWFwKChlbnRyeSwgaSkgPT4gdGhpcy5kZXNlcmlhbGl6ZVJlc291cmNlKGVudHJ5KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQuZGF0YSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKHByaW1hcnlSZWNvcmREYXRhICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBkYXRhID0gdGhpcy5kZXNlcmlhbGl6ZVJlc291cmNlKGRvY3VtZW50LmRhdGEsIHByaW1hcnlSZWNvcmREYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IHRoaXMuZGVzZXJpYWxpemVSZXNvdXJjZShkb2N1bWVudC5kYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRhdGEgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdCA9IHsgZGF0YSB9O1xuICAgICAgICBpZiAoZG9jdW1lbnQuaW5jbHVkZWQpIHtcbiAgICAgICAgICAgIHJlc3VsdC5pbmNsdWRlZCA9IGRvY3VtZW50LmluY2x1ZGVkLm1hcChlID0+IHRoaXMuZGVzZXJpYWxpemVSZXNvdXJjZShlKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgZGVzZXJpYWxpemVSZXNvdXJjZShyZXNvdXJjZSwgcHJpbWFyeVJlY29yZCkge1xuICAgICAgICBsZXQgcmVjb3JkO1xuICAgICAgICBsZXQgdHlwZSA9IHRoaXMucmVjb3JkVHlwZShyZXNvdXJjZS50eXBlKTtcbiAgICAgICAgbGV0IHJlc291cmNlS2V5ID0gdGhpcy5yZXNvdXJjZUtleSh0eXBlKTtcbiAgICAgICAgaWYgKHJlc291cmNlS2V5ID09PSAnaWQnKSB7XG4gICAgICAgICAgICByZWNvcmQgPSB7IHR5cGUsIGlkOiByZXNvdXJjZS5pZCB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IGlkO1xuICAgICAgICAgICAgbGV0IGtleXM7XG4gICAgICAgICAgICBpZiAocmVzb3VyY2UuaWQpIHtcbiAgICAgICAgICAgICAgICBrZXlzID0ge1xuICAgICAgICAgICAgICAgICAgICBbcmVzb3VyY2VLZXldOiByZXNvdXJjZS5pZFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaWQgPSBwcmltYXJ5UmVjb3JkICYmIHByaW1hcnlSZWNvcmQuaWQgfHwgdGhpcy5rZXlNYXAuaWRGcm9tS2V5cyh0eXBlLCBrZXlzKSB8fCB0aGlzLnNjaGVtYS5nZW5lcmF0ZUlkKHR5cGUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZCA9IHByaW1hcnlSZWNvcmQgJiYgcHJpbWFyeVJlY29yZC5pZCB8fCB0aGlzLnNjaGVtYS5nZW5lcmF0ZUlkKHR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVjb3JkID0geyB0eXBlLCBpZCB9O1xuICAgICAgICAgICAgaWYgKGtleXMpIHtcbiAgICAgICAgICAgICAgICByZWNvcmQua2V5cyA9IGtleXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5kZXNlcmlhbGl6ZUF0dHJpYnV0ZXMocmVjb3JkLCByZXNvdXJjZSk7XG4gICAgICAgIHRoaXMuZGVzZXJpYWxpemVSZWxhdGlvbnNoaXBzKHJlY29yZCwgcmVzb3VyY2UpO1xuICAgICAgICBpZiAodGhpcy5rZXlNYXApIHtcbiAgICAgICAgICAgIHRoaXMua2V5TWFwLnB1c2hSZWNvcmQocmVjb3JkKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVjb3JkO1xuICAgIH1cbiAgICBkZXNlcmlhbGl6ZUF0dHJpYnV0ZXMocmVjb3JkLCByZXNvdXJjZSkge1xuICAgICAgICBpZiAocmVzb3VyY2UuYXR0cmlidXRlcykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMocmVzb3VyY2UuYXR0cmlidXRlcykuZm9yRWFjaChyZXNvdXJjZUF0dHJpYnV0ZSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IGF0dHJpYnV0ZSA9IHRoaXMucmVjb3JkQXR0cmlidXRlKHJlY29yZC50eXBlLCByZXNvdXJjZUF0dHJpYnV0ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc2NoZW1hLmhhc0F0dHJpYnV0ZShyZWNvcmQudHlwZSwgYXR0cmlidXRlKSkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgdmFsdWUgPSByZXNvdXJjZS5hdHRyaWJ1dGVzW3Jlc291cmNlQXR0cmlidXRlXTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kZXNlcmlhbGl6ZUF0dHJpYnV0ZShyZWNvcmQsIGF0dHJpYnV0ZSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGRlc2VyaWFsaXplQXR0cmlidXRlKHJlY29yZCwgYXR0ciwgdmFsdWUpIHtcbiAgICAgICAgcmVjb3JkLmF0dHJpYnV0ZXMgPSByZWNvcmQuYXR0cmlidXRlcyB8fCB7fTtcbiAgICAgICAgcmVjb3JkLmF0dHJpYnV0ZXNbYXR0cl0gPSB2YWx1ZTtcbiAgICB9XG4gICAgZGVzZXJpYWxpemVSZWxhdGlvbnNoaXBzKHJlY29yZCwgcmVzb3VyY2UpIHtcbiAgICAgICAgaWYgKHJlc291cmNlLnJlbGF0aW9uc2hpcHMpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKHJlc291cmNlLnJlbGF0aW9uc2hpcHMpLmZvckVhY2gocmVzb3VyY2VSZWwgPT4ge1xuICAgICAgICAgICAgICAgIGxldCByZWxhdGlvbnNoaXAgPSB0aGlzLnJlY29yZFJlbGF0aW9uc2hpcChyZWNvcmQudHlwZSwgcmVzb3VyY2VSZWwpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnNjaGVtYS5oYXNSZWxhdGlvbnNoaXAocmVjb3JkLnR5cGUsIHJlbGF0aW9uc2hpcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHZhbHVlID0gcmVzb3VyY2UucmVsYXRpb25zaGlwc1tyZXNvdXJjZVJlbF07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGVzZXJpYWxpemVSZWxhdGlvbnNoaXAocmVjb3JkLCByZWxhdGlvbnNoaXAsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBkZXNlcmlhbGl6ZVJlbGF0aW9uc2hpcChyZWNvcmQsIHJlbGF0aW9uc2hpcCwgdmFsdWUpIHtcbiAgICAgICAgbGV0IHJlc291cmNlRGF0YSA9IHZhbHVlLmRhdGE7XG4gICAgICAgIGlmIChyZXNvdXJjZURhdGEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGV0IGRhdGE7XG4gICAgICAgICAgICBpZiAocmVzb3VyY2VEYXRhID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IG51bGw7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzQXJyYXkocmVzb3VyY2VEYXRhKSkge1xuICAgICAgICAgICAgICAgIGRhdGEgPSByZXNvdXJjZURhdGEubWFwKHJlc291cmNlSWRlbnRpdHkgPT4gdGhpcy5yZWNvcmRJZGVudGl0eShyZXNvdXJjZUlkZW50aXR5KSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRhdGEgPSB0aGlzLnJlY29yZElkZW50aXR5KHJlc291cmNlRGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZWNvcmQucmVsYXRpb25zaGlwcyA9IHJlY29yZC5yZWxhdGlvbnNoaXBzIHx8IHt9O1xuICAgICAgICAgICAgcmVjb3JkLnJlbGF0aW9uc2hpcHNbcmVsYXRpb25zaGlwXSA9IHsgZGF0YSB9O1xuICAgICAgICB9XG4gICAgfVxuICAgIF9nZW5lcmF0ZU5ld0lkKHR5cGUsIGtleU5hbWUsIGtleVZhbHVlKSB7XG4gICAgICAgIGxldCBpZCA9IHRoaXMuc2NoZW1hLmdlbmVyYXRlSWQodHlwZSk7XG4gICAgICAgIHRoaXMua2V5TWFwLnB1c2hSZWNvcmQoe1xuICAgICAgICAgICAgdHlwZSxcbiAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAga2V5czoge1xuICAgICAgICAgICAgICAgIFtrZXlOYW1lXToga2V5VmFsdWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBpZDtcbiAgICB9XG59Il19