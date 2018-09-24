import { isArray, dasherize, camelize, deepSet } from '@orbit/utils';
export default class JSONAPISerializer {
    constructor(settings) {
        this._schema = settings.schema;
        this._keyMap = settings.keyMap;
    }
    get schema() {
        return this._schema;
    }
    get keyMap() {
        return this._keyMap;
    }
    resourceKey(type) {
        return 'id';
    }
    resourceType(type) {
        return dasherize(this.schema.pluralize(type));
    }
    resourceRelationship(type, relationship) {
        return dasherize(relationship);
    }
    resourceAttribute(type, attr) {
        return dasherize(attr);
    }
    resourceIdentity(identity) {
        return {
            type: this.resourceType(identity.type),
            id: this.resourceId(identity.type, identity.id)
        };
    }
    resourceIds(type, ids) {
        return ids.map(id => this.resourceId(type, id));
    }
    resourceId(type, id) {
        let resourceKey = this.resourceKey(type);
        if (resourceKey === 'id') {
            return id;
        } else {
            return this.keyMap.idToKey(type, resourceKey, id);
        }
    }
    recordId(type, resourceId) {
        let resourceKey = this.resourceKey(type);
        if (resourceKey === 'id') {
            return resourceId;
        }
        let existingId = this.keyMap.keyToId(type, resourceKey, resourceId);
        if (existingId) {
            return existingId;
        }
        return this._generateNewId(type, resourceKey, resourceId);
    }
    recordType(resourceType) {
        return camelize(this.schema.singularize(resourceType));
    }
    recordIdentity(resourceIdentity) {
        let type = this.recordType(resourceIdentity.type);
        let id = this.recordId(type, resourceIdentity.id);
        return { type, id };
    }
    recordAttribute(type, resourceAttribute) {
        return camelize(resourceAttribute);
    }
    recordRelationship(type, resourceRelationship) {
        return camelize(resourceRelationship);
    }
    serializeDocument(data) {
        return {
            data: isArray(data) ? this.serializeRecords(data) : this.serializeRecord(data)
        };
    }
    serializeRecords(records) {
        return records.map(record => this.serializeRecord(record));
    }
    serializeRecord(record) {
        let resource = {
            type: this.resourceType(record.type)
        };
        this.serializeId(resource, record);
        this.serializeAttributes(resource, record);
        this.serializeRelationships(resource, record);
        return resource;
    }
    serializeId(resource, record) {
        let value = this.resourceId(record.type, record.id);
        if (value !== undefined) {
            resource.id = value;
        }
    }
    serializeAttributes(resource, record) {
        if (record.attributes) {
            Object.keys(record.attributes).forEach(attr => {
                this.serializeAttribute(resource, record, attr);
            });
        }
    }
    serializeAttribute(resource, record, attr) {
        let value = record.attributes[attr];
        if (value !== undefined) {
            deepSet(resource, ['attributes', this.resourceAttribute(record.type, attr)], value);
        }
    }
    serializeRelationships(resource, record) {
        if (record.relationships) {
            Object.keys(record.relationships).forEach(relationship => {
                this.serializeRelationship(resource, record, relationship);
            });
        }
    }
    serializeRelationship(resource, record, relationship) {
        const value = record.relationships[relationship].data;
        if (value !== undefined) {
            let data;
            if (isArray(value)) {
                data = value.map(id => this.resourceIdentity(id));
            } else if (value !== null) {
                data = this.resourceIdentity(value);
            } else {
                data = null;
            }
            const resourceRelationship = this.resourceRelationship(record.type, relationship);
            deepSet(resource, ['relationships', resourceRelationship, 'data'], data);
        }
    }
    deserializeDocument(document, primaryRecordData) {
        let result;
        let data;
        if (isArray(document.data)) {
            if (primaryRecordData !== undefined) {
                data = document.data.map((entry, i) => {
                    return this.deserializeResource(entry, primaryRecordData[i]);
                });
            } else {
                data = document.data.map((entry, i) => this.deserializeResource(entry));
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
        result = { data };
        if (document.included) {
            result.included = document.included.map(e => this.deserializeResource(e));
        }
        return result;
    }
    deserializeResource(resource, primaryRecord) {
        let record;
        let type = this.recordType(resource.type);
        let resourceKey = this.resourceKey(type);
        if (resourceKey === 'id') {
            record = { type, id: resource.id };
        } else {
            let id;
            let keys;
            if (resource.id) {
                keys = {
                    [resourceKey]: resource.id
                };
                id = primaryRecord && primaryRecord.id || this.keyMap.idFromKeys(type, keys) || this.schema.generateId(type);
            } else {
                id = primaryRecord && primaryRecord.id || this.schema.generateId(type);
            }
            record = { type, id };
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
    }
    deserializeAttributes(record, resource) {
        if (resource.attributes) {
            Object.keys(resource.attributes).forEach(resourceAttribute => {
                let attribute = this.recordAttribute(record.type, resourceAttribute);
                if (this.schema.hasAttribute(record.type, attribute)) {
                    let value = resource.attributes[resourceAttribute];
                    this.deserializeAttribute(record, attribute, value);
                }
            });
        }
    }
    deserializeAttribute(record, attr, value) {
        record.attributes = record.attributes || {};
        record.attributes[attr] = value;
    }
    deserializeRelationships(record, resource) {
        if (resource.relationships) {
            Object.keys(resource.relationships).forEach(resourceRel => {
                let relationship = this.recordRelationship(record.type, resourceRel);
                if (this.schema.hasRelationship(record.type, relationship)) {
                    let value = resource.relationships[resourceRel];
                    this.deserializeRelationship(record, relationship, value);
                }
            });
        }
    }
    deserializeRelationship(record, relationship, value) {
        let resourceData = value.data;
        if (resourceData !== undefined) {
            let data;
            if (resourceData === null) {
                data = null;
            } else if (isArray(resourceData)) {
                data = resourceData.map(resourceIdentity => this.recordIdentity(resourceIdentity));
            } else {
                data = this.recordIdentity(resourceData);
            }
            record.relationships = record.relationships || {};
            record.relationships[relationship] = { data };
        }
    }
    _generateNewId(type, keyName, keyValue) {
        let id = this.schema.generateId(type);
        this.keyMap.pushRecord({
            type,
            id,
            keys: {
                [keyName]: keyValue
            }
        });
        return id;
    }
}