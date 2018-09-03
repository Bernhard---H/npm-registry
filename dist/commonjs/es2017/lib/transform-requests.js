'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.TransformRequestProcessors = undefined;
exports.getTransformRequests = getTransformRequests;

var _data = require('@orbit/data');

var _utils = require('@orbit/utils');

var _requestSettings = require('./request-settings');

const TransformRequestProcessors = exports.TransformRequestProcessors = {
    addRecord(source, request) {
        const { serializer } = source;
        const record = request.record;
        const requestDoc = serializer.serializeDocument(record);
        const settings = (0, _requestSettings.buildFetchSettings)(request.options, { method: 'POST', json: requestDoc });
        return source.fetch(source.resourceURL(record.type), settings).then(raw => {
            let responseDoc = serializer.deserializeDocument(raw);
            let updatedRecord = responseDoc.data;
            let updateOps = (0, _data.recordDiffs)(record, updatedRecord);
            if (updateOps.length > 0) {
                return [(0, _data.buildTransform)(updateOps)];
            }
        });
    },
    removeRecord(source, request) {
        const { type, id } = request.record;
        const settings = (0, _requestSettings.buildFetchSettings)(request.options, { method: 'DELETE' });
        return source.fetch(source.resourceURL(type, id), settings).then(() => []);
    },
    replaceRecord(source, request) {
        const record = request.record;
        const { type, id } = record;
        const requestDoc = source.serializer.serializeDocument(record);
        const settings = (0, _requestSettings.buildFetchSettings)(request.options, { method: 'PATCH', json: requestDoc });
        return source.fetch(source.resourceURL(type, id), settings).then(() => []);
    },
    addToRelatedRecords(source, request) {
        const { type, id } = request.record;
        const { relationship } = request;
        const json = {
            data: request.relatedRecords.map(r => source.serializer.resourceIdentity(r))
        };
        const settings = (0, _requestSettings.buildFetchSettings)(request.options, { method: 'POST', json });
        return source.fetch(source.resourceRelationshipURL(type, id, relationship), settings).then(() => []);
    },
    removeFromRelatedRecords(source, request) {
        const { type, id } = request.record;
        const { relationship } = request;
        const json = {
            data: request.relatedRecords.map(r => source.serializer.resourceIdentity(r))
        };
        const settings = (0, _requestSettings.buildFetchSettings)(request.options, { method: 'DELETE', json });
        return source.fetch(source.resourceRelationshipURL(type, id, relationship), settings).then(() => []);
    },
    replaceRelatedRecord(source, request) {
        const { type, id } = request.record;
        const { relationship, relatedRecord } = request;
        const json = {
            data: relatedRecord ? source.serializer.resourceIdentity(relatedRecord) : null
        };
        const settings = (0, _requestSettings.buildFetchSettings)(request.options, { method: 'PATCH', json });
        return source.fetch(source.resourceRelationshipURL(type, id, relationship), settings).then(() => []);
    },
    replaceRelatedRecords(source, request) {
        const { type, id } = request.record;
        const { relationship, relatedRecords } = request;
        const json = {
            data: relatedRecords.map(r => source.serializer.resourceIdentity(r))
        };
        const settings = (0, _requestSettings.buildFetchSettings)(request.options, { method: 'PATCH', json });
        return source.fetch(source.resourceRelationshipURL(type, id, relationship), settings).then(() => []);
    }
};
function getTransformRequests(source, transform) {
    const requests = [];
    let prevRequest;
    transform.operations.forEach(operation => {
        let request;
        let newRequestNeeded = true;
        if (prevRequest && (0, _data.equalRecordIdentities)(prevRequest.record, operation.record)) {
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
                prevRequest.relatedRecords.push((0, _data.cloneRecordIdentity)(operation.relatedRecord));
            }
        }
        if (newRequestNeeded) {
            request = OperationToRequestMap[operation.op](operation);
        }
        if (request) {
            let options = (0, _requestSettings.customRequestOptions)(source, transform);
            if (options) {
                request.options = options;
            }
            requests.push(request);
            prevRequest = request;
        }
    });
    return requests;
}
const OperationToRequestMap = {
    addRecord(operation) {
        return {
            op: 'addRecord',
            record: (0, _utils.clone)(operation.record)
        };
    },
    removeRecord(operation) {
        return {
            op: 'removeRecord',
            record: (0, _data.cloneRecordIdentity)(operation.record)
        };
    },
    replaceAttribute(operation) {
        const record = (0, _data.cloneRecordIdentity)(operation.record);
        replaceRecordAttribute(record, operation.attribute, operation.value);
        return {
            op: 'replaceRecord',
            record
        };
    },
    replaceRecord(operation) {
        return {
            op: 'replaceRecord',
            record: (0, _utils.clone)(operation.record)
        };
    },
    addToRelatedRecords(operation) {
        return {
            op: 'addToRelatedRecords',
            record: (0, _data.cloneRecordIdentity)(operation.record),
            relationship: operation.relationship,
            relatedRecords: [(0, _data.cloneRecordIdentity)(operation.relatedRecord)]
        };
    },
    removeFromRelatedRecords(operation) {
        return {
            op: 'removeFromRelatedRecords',
            record: (0, _data.cloneRecordIdentity)(operation.record),
            relationship: operation.relationship,
            relatedRecords: [(0, _data.cloneRecordIdentity)(operation.relatedRecord)]
        };
    },
    replaceRelatedRecord(operation) {
        const record = {
            type: operation.record.type,
            id: operation.record.id
        };
        (0, _utils.deepSet)(record, ['relationships', operation.relationship, 'data'], operation.relatedRecord);
        return {
            op: 'replaceRecord',
            record
        };
    },
    replaceRelatedRecords(operation) {
        const record = (0, _data.cloneRecordIdentity)(operation.record);
        (0, _utils.deepSet)(record, ['relationships', operation.relationship, 'data'], operation.relatedRecords);
        return {
            op: 'replaceRecord',
            record
        };
    }
};
function replaceRecordAttribute(record, attribute, value) {
    (0, _utils.deepSet)(record, ['attributes', attribute], value);
}
function replaceRecordHasOne(record, relationship, relatedRecord) {
    (0, _utils.deepSet)(record, ['relationships', relationship, 'data'], relatedRecord ? (0, _data.cloneRecordIdentity)(relatedRecord) : null);
}
function replaceRecordHasMany(record, relationship, relatedRecords) {
    (0, _utils.deepSet)(record, ['relationships', relationship, 'data'], relatedRecords.map(r => (0, _data.cloneRecordIdentity)(r)));
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi90cmFuc2Zvcm0tcmVxdWVzdHMuanMiXSwibmFtZXMiOlsiZ2V0VHJhbnNmb3JtUmVxdWVzdHMiLCJUcmFuc2Zvcm1SZXF1ZXN0UHJvY2Vzc29ycyIsImFkZFJlY29yZCIsInNvdXJjZSIsInJlcXVlc3QiLCJzZXJpYWxpemVyIiwicmVjb3JkIiwicmVxdWVzdERvYyIsInNlcmlhbGl6ZURvY3VtZW50Iiwic2V0dGluZ3MiLCJvcHRpb25zIiwibWV0aG9kIiwianNvbiIsImZldGNoIiwicmVzb3VyY2VVUkwiLCJ0eXBlIiwidGhlbiIsInJhdyIsInJlc3BvbnNlRG9jIiwiZGVzZXJpYWxpemVEb2N1bWVudCIsInVwZGF0ZWRSZWNvcmQiLCJkYXRhIiwidXBkYXRlT3BzIiwibGVuZ3RoIiwicmVtb3ZlUmVjb3JkIiwiaWQiLCJyZXBsYWNlUmVjb3JkIiwiYWRkVG9SZWxhdGVkUmVjb3JkcyIsInJlbGF0aW9uc2hpcCIsInJlbGF0ZWRSZWNvcmRzIiwibWFwIiwiciIsInJlc291cmNlSWRlbnRpdHkiLCJyZXNvdXJjZVJlbGF0aW9uc2hpcFVSTCIsInJlbW92ZUZyb21SZWxhdGVkUmVjb3JkcyIsInJlcGxhY2VSZWxhdGVkUmVjb3JkIiwicmVsYXRlZFJlY29yZCIsInJlcGxhY2VSZWxhdGVkUmVjb3JkcyIsInRyYW5zZm9ybSIsInJlcXVlc3RzIiwicHJldlJlcXVlc3QiLCJvcGVyYXRpb25zIiwiZm9yRWFjaCIsIm9wZXJhdGlvbiIsIm5ld1JlcXVlc3ROZWVkZWQiLCJvcCIsInBvcCIsInJlcGxhY2VSZWNvcmRBdHRyaWJ1dGUiLCJhdHRyaWJ1dGUiLCJ2YWx1ZSIsInJlcGxhY2VSZWNvcmRIYXNPbmUiLCJyZXBsYWNlUmVjb3JkSGFzTWFueSIsInB1c2giLCJPcGVyYXRpb25Ub1JlcXVlc3RNYXAiLCJyZXBsYWNlQXR0cmlidXRlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7UUFtRWdCQSxvQixHQUFBQSxvQjs7QUFuRWhCOztBQUNBOztBQUNBOztBQUNP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QUFoQixFQUF5RFEsZ0JBQWdCLCtCQUFvQkEsYUFBcEIsQ0FBaEIsR0FBcUQsSUFBOUc7QUFDSDtBQUNELFNBQVNlLG9CQUFULENBQThCN0MsTUFBOUIsRUFBc0NzQixZQUF0QyxFQUFvREMsY0FBcEQsRUFBb0U7QUFDaEUsd0JBQVF2QixNQUFSLEVBQWdCLENBQUMsZUFBRCxFQUFrQnNCLFlBQWxCLEVBQWdDLE1BQWhDLENBQWhCLEVBQXlEQyxlQUFlQyxHQUFmLENBQW1CQyxLQUFLLCtCQUFvQkEsQ0FBcEIsQ0FBeEIsQ0FBekQ7QUFDSCIsImZpbGUiOiJsaWIvdHJhbnNmb3JtLXJlcXVlc3RzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY2xvbmVSZWNvcmRJZGVudGl0eSwgZXF1YWxSZWNvcmRJZGVudGl0aWVzLCByZWNvcmREaWZmcywgYnVpbGRUcmFuc2Zvcm0gfSBmcm9tICdAb3JiaXQvZGF0YSc7XG5pbXBvcnQgeyBjbG9uZSwgZGVlcFNldCB9IGZyb20gJ0BvcmJpdC91dGlscyc7XG5pbXBvcnQgeyBidWlsZEZldGNoU2V0dGluZ3MsIGN1c3RvbVJlcXVlc3RPcHRpb25zIH0gZnJvbSAnLi9yZXF1ZXN0LXNldHRpbmdzJztcbmV4cG9ydCBjb25zdCBUcmFuc2Zvcm1SZXF1ZXN0UHJvY2Vzc29ycyA9IHtcbiAgICBhZGRSZWNvcmQoc291cmNlLCByZXF1ZXN0KSB7XG4gICAgICAgIGNvbnN0IHsgc2VyaWFsaXplciB9ID0gc291cmNlO1xuICAgICAgICBjb25zdCByZWNvcmQgPSByZXF1ZXN0LnJlY29yZDtcbiAgICAgICAgY29uc3QgcmVxdWVzdERvYyA9IHNlcmlhbGl6ZXIuc2VyaWFsaXplRG9jdW1lbnQocmVjb3JkKTtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBidWlsZEZldGNoU2V0dGluZ3MocmVxdWVzdC5vcHRpb25zLCB7IG1ldGhvZDogJ1BPU1QnLCBqc29uOiByZXF1ZXN0RG9jIH0pO1xuICAgICAgICByZXR1cm4gc291cmNlLmZldGNoKHNvdXJjZS5yZXNvdXJjZVVSTChyZWNvcmQudHlwZSksIHNldHRpbmdzKS50aGVuKHJhdyA9PiB7XG4gICAgICAgICAgICBsZXQgcmVzcG9uc2VEb2MgPSBzZXJpYWxpemVyLmRlc2VyaWFsaXplRG9jdW1lbnQocmF3KTtcbiAgICAgICAgICAgIGxldCB1cGRhdGVkUmVjb3JkID0gcmVzcG9uc2VEb2MuZGF0YTtcbiAgICAgICAgICAgIGxldCB1cGRhdGVPcHMgPSByZWNvcmREaWZmcyhyZWNvcmQsIHVwZGF0ZWRSZWNvcmQpO1xuICAgICAgICAgICAgaWYgKHVwZGF0ZU9wcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtidWlsZFRyYW5zZm9ybSh1cGRhdGVPcHMpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICByZW1vdmVSZWNvcmQoc291cmNlLCByZXF1ZXN0KSB7XG4gICAgICAgIGNvbnN0IHsgdHlwZSwgaWQgfSA9IHJlcXVlc3QucmVjb3JkO1xuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGJ1aWxkRmV0Y2hTZXR0aW5ncyhyZXF1ZXN0Lm9wdGlvbnMsIHsgbWV0aG9kOiAnREVMRVRFJyB9KTtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5mZXRjaChzb3VyY2UucmVzb3VyY2VVUkwodHlwZSwgaWQpLCBzZXR0aW5ncykudGhlbigoKSA9PiBbXSk7XG4gICAgfSxcbiAgICByZXBsYWNlUmVjb3JkKHNvdXJjZSwgcmVxdWVzdCkge1xuICAgICAgICBjb25zdCByZWNvcmQgPSByZXF1ZXN0LnJlY29yZDtcbiAgICAgICAgY29uc3QgeyB0eXBlLCBpZCB9ID0gcmVjb3JkO1xuICAgICAgICBjb25zdCByZXF1ZXN0RG9jID0gc291cmNlLnNlcmlhbGl6ZXIuc2VyaWFsaXplRG9jdW1lbnQocmVjb3JkKTtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBidWlsZEZldGNoU2V0dGluZ3MocmVxdWVzdC5vcHRpb25zLCB7IG1ldGhvZDogJ1BBVENIJywganNvbjogcmVxdWVzdERvYyB9KTtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5mZXRjaChzb3VyY2UucmVzb3VyY2VVUkwodHlwZSwgaWQpLCBzZXR0aW5ncykudGhlbigoKSA9PiBbXSk7XG4gICAgfSxcbiAgICBhZGRUb1JlbGF0ZWRSZWNvcmRzKHNvdXJjZSwgcmVxdWVzdCkge1xuICAgICAgICBjb25zdCB7IHR5cGUsIGlkIH0gPSByZXF1ZXN0LnJlY29yZDtcbiAgICAgICAgY29uc3QgeyByZWxhdGlvbnNoaXAgfSA9IHJlcXVlc3Q7XG4gICAgICAgIGNvbnN0IGpzb24gPSB7XG4gICAgICAgICAgICBkYXRhOiByZXF1ZXN0LnJlbGF0ZWRSZWNvcmRzLm1hcChyID0+IHNvdXJjZS5zZXJpYWxpemVyLnJlc291cmNlSWRlbnRpdHkocikpXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gYnVpbGRGZXRjaFNldHRpbmdzKHJlcXVlc3Qub3B0aW9ucywgeyBtZXRob2Q6ICdQT1NUJywganNvbiB9KTtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5mZXRjaChzb3VyY2UucmVzb3VyY2VSZWxhdGlvbnNoaXBVUkwodHlwZSwgaWQsIHJlbGF0aW9uc2hpcCksIHNldHRpbmdzKS50aGVuKCgpID0+IFtdKTtcbiAgICB9LFxuICAgIHJlbW92ZUZyb21SZWxhdGVkUmVjb3Jkcyhzb3VyY2UsIHJlcXVlc3QpIHtcbiAgICAgICAgY29uc3QgeyB0eXBlLCBpZCB9ID0gcmVxdWVzdC5yZWNvcmQ7XG4gICAgICAgIGNvbnN0IHsgcmVsYXRpb25zaGlwIH0gPSByZXF1ZXN0O1xuICAgICAgICBjb25zdCBqc29uID0ge1xuICAgICAgICAgICAgZGF0YTogcmVxdWVzdC5yZWxhdGVkUmVjb3Jkcy5tYXAociA9PiBzb3VyY2Uuc2VyaWFsaXplci5yZXNvdXJjZUlkZW50aXR5KHIpKVxuICAgICAgICB9O1xuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGJ1aWxkRmV0Y2hTZXR0aW5ncyhyZXF1ZXN0Lm9wdGlvbnMsIHsgbWV0aG9kOiAnREVMRVRFJywganNvbiB9KTtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5mZXRjaChzb3VyY2UucmVzb3VyY2VSZWxhdGlvbnNoaXBVUkwodHlwZSwgaWQsIHJlbGF0aW9uc2hpcCksIHNldHRpbmdzKS50aGVuKCgpID0+IFtdKTtcbiAgICB9LFxuICAgIHJlcGxhY2VSZWxhdGVkUmVjb3JkKHNvdXJjZSwgcmVxdWVzdCkge1xuICAgICAgICBjb25zdCB7IHR5cGUsIGlkIH0gPSByZXF1ZXN0LnJlY29yZDtcbiAgICAgICAgY29uc3QgeyByZWxhdGlvbnNoaXAsIHJlbGF0ZWRSZWNvcmQgfSA9IHJlcXVlc3Q7XG4gICAgICAgIGNvbnN0IGpzb24gPSB7XG4gICAgICAgICAgICBkYXRhOiByZWxhdGVkUmVjb3JkID8gc291cmNlLnNlcmlhbGl6ZXIucmVzb3VyY2VJZGVudGl0eShyZWxhdGVkUmVjb3JkKSA6IG51bGxcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBidWlsZEZldGNoU2V0dGluZ3MocmVxdWVzdC5vcHRpb25zLCB7IG1ldGhvZDogJ1BBVENIJywganNvbiB9KTtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5mZXRjaChzb3VyY2UucmVzb3VyY2VSZWxhdGlvbnNoaXBVUkwodHlwZSwgaWQsIHJlbGF0aW9uc2hpcCksIHNldHRpbmdzKS50aGVuKCgpID0+IFtdKTtcbiAgICB9LFxuICAgIHJlcGxhY2VSZWxhdGVkUmVjb3Jkcyhzb3VyY2UsIHJlcXVlc3QpIHtcbiAgICAgICAgY29uc3QgeyB0eXBlLCBpZCB9ID0gcmVxdWVzdC5yZWNvcmQ7XG4gICAgICAgIGNvbnN0IHsgcmVsYXRpb25zaGlwLCByZWxhdGVkUmVjb3JkcyB9ID0gcmVxdWVzdDtcbiAgICAgICAgY29uc3QganNvbiA9IHtcbiAgICAgICAgICAgIGRhdGE6IHJlbGF0ZWRSZWNvcmRzLm1hcChyID0+IHNvdXJjZS5zZXJpYWxpemVyLnJlc291cmNlSWRlbnRpdHkocikpXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gYnVpbGRGZXRjaFNldHRpbmdzKHJlcXVlc3Qub3B0aW9ucywgeyBtZXRob2Q6ICdQQVRDSCcsIGpzb24gfSk7XG4gICAgICAgIHJldHVybiBzb3VyY2UuZmV0Y2goc291cmNlLnJlc291cmNlUmVsYXRpb25zaGlwVVJMKHR5cGUsIGlkLCByZWxhdGlvbnNoaXApLCBzZXR0aW5ncykudGhlbigoKSA9PiBbXSk7XG4gICAgfVxufTtcbmV4cG9ydCBmdW5jdGlvbiBnZXRUcmFuc2Zvcm1SZXF1ZXN0cyhzb3VyY2UsIHRyYW5zZm9ybSkge1xuICAgIGNvbnN0IHJlcXVlc3RzID0gW107XG4gICAgbGV0IHByZXZSZXF1ZXN0O1xuICAgIHRyYW5zZm9ybS5vcGVyYXRpb25zLmZvckVhY2gob3BlcmF0aW9uID0+IHtcbiAgICAgICAgbGV0IHJlcXVlc3Q7XG4gICAgICAgIGxldCBuZXdSZXF1ZXN0TmVlZGVkID0gdHJ1ZTtcbiAgICAgICAgaWYgKHByZXZSZXF1ZXN0ICYmIGVxdWFsUmVjb3JkSWRlbnRpdGllcyhwcmV2UmVxdWVzdC5yZWNvcmQsIG9wZXJhdGlvbi5yZWNvcmQpKSB7XG4gICAgICAgICAgICBpZiAob3BlcmF0aW9uLm9wID09PSAncmVtb3ZlUmVjb3JkJykge1xuICAgICAgICAgICAgICAgIG5ld1JlcXVlc3ROZWVkZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBpZiAocHJldlJlcXVlc3Qub3AgIT09ICdyZW1vdmVSZWNvcmQnKSB7XG4gICAgICAgICAgICAgICAgICAgIHByZXZSZXF1ZXN0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgcmVxdWVzdHMucG9wKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChwcmV2UmVxdWVzdC5vcCA9PT0gJ2FkZFJlY29yZCcgfHwgcHJldlJlcXVlc3Qub3AgPT09ICdyZXBsYWNlUmVjb3JkJykge1xuICAgICAgICAgICAgICAgIGlmIChvcGVyYXRpb24ub3AgPT09ICdyZXBsYWNlQXR0cmlidXRlJykge1xuICAgICAgICAgICAgICAgICAgICBuZXdSZXF1ZXN0TmVlZGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHJlcGxhY2VSZWNvcmRBdHRyaWJ1dGUocHJldlJlcXVlc3QucmVjb3JkLCBvcGVyYXRpb24uYXR0cmlidXRlLCBvcGVyYXRpb24udmFsdWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAob3BlcmF0aW9uLm9wID09PSAncmVwbGFjZVJlbGF0ZWRSZWNvcmQnKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld1JlcXVlc3ROZWVkZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgcmVwbGFjZVJlY29yZEhhc09uZShwcmV2UmVxdWVzdC5yZWNvcmQsIG9wZXJhdGlvbi5yZWxhdGlvbnNoaXAsIG9wZXJhdGlvbi5yZWxhdGVkUmVjb3JkKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG9wZXJhdGlvbi5vcCA9PT0gJ3JlcGxhY2VSZWxhdGVkUmVjb3JkcycpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3UmVxdWVzdE5lZWRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICByZXBsYWNlUmVjb3JkSGFzTWFueShwcmV2UmVxdWVzdC5yZWNvcmQsIG9wZXJhdGlvbi5yZWxhdGlvbnNoaXAsIG9wZXJhdGlvbi5yZWxhdGVkUmVjb3Jkcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChwcmV2UmVxdWVzdC5vcCA9PT0gJ2FkZFRvUmVsYXRlZFJlY29yZHMnICYmIG9wZXJhdGlvbi5vcCA9PT0gJ2FkZFRvUmVsYXRlZFJlY29yZHMnICYmIHByZXZSZXF1ZXN0LnJlbGF0aW9uc2hpcCA9PT0gb3BlcmF0aW9uLnJlbGF0aW9uc2hpcCkge1xuICAgICAgICAgICAgICAgIG5ld1JlcXVlc3ROZWVkZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBwcmV2UmVxdWVzdC5yZWxhdGVkUmVjb3Jkcy5wdXNoKGNsb25lUmVjb3JkSWRlbnRpdHkob3BlcmF0aW9uLnJlbGF0ZWRSZWNvcmQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAobmV3UmVxdWVzdE5lZWRlZCkge1xuICAgICAgICAgICAgcmVxdWVzdCA9IE9wZXJhdGlvblRvUmVxdWVzdE1hcFtvcGVyYXRpb24ub3BdKG9wZXJhdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlcXVlc3QpIHtcbiAgICAgICAgICAgIGxldCBvcHRpb25zID0gY3VzdG9tUmVxdWVzdE9wdGlvbnMoc291cmNlLCB0cmFuc2Zvcm0pO1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9wdGlvbnMgPSBvcHRpb25zO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVxdWVzdHMucHVzaChyZXF1ZXN0KTtcbiAgICAgICAgICAgIHByZXZSZXF1ZXN0ID0gcmVxdWVzdDtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXF1ZXN0cztcbn1cbmNvbnN0IE9wZXJhdGlvblRvUmVxdWVzdE1hcCA9IHtcbiAgICBhZGRSZWNvcmQob3BlcmF0aW9uKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcDogJ2FkZFJlY29yZCcsXG4gICAgICAgICAgICByZWNvcmQ6IGNsb25lKG9wZXJhdGlvbi5yZWNvcmQpXG4gICAgICAgIH07XG4gICAgfSxcbiAgICByZW1vdmVSZWNvcmQob3BlcmF0aW9uKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcDogJ3JlbW92ZVJlY29yZCcsXG4gICAgICAgICAgICByZWNvcmQ6IGNsb25lUmVjb3JkSWRlbnRpdHkob3BlcmF0aW9uLnJlY29yZClcbiAgICAgICAgfTtcbiAgICB9LFxuICAgIHJlcGxhY2VBdHRyaWJ1dGUob3BlcmF0aW9uKSB7XG4gICAgICAgIGNvbnN0IHJlY29yZCA9IGNsb25lUmVjb3JkSWRlbnRpdHkob3BlcmF0aW9uLnJlY29yZCk7XG4gICAgICAgIHJlcGxhY2VSZWNvcmRBdHRyaWJ1dGUocmVjb3JkLCBvcGVyYXRpb24uYXR0cmlidXRlLCBvcGVyYXRpb24udmFsdWUpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3A6ICdyZXBsYWNlUmVjb3JkJyxcbiAgICAgICAgICAgIHJlY29yZFxuICAgICAgICB9O1xuICAgIH0sXG4gICAgcmVwbGFjZVJlY29yZChvcGVyYXRpb24pIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9wOiAncmVwbGFjZVJlY29yZCcsXG4gICAgICAgICAgICByZWNvcmQ6IGNsb25lKG9wZXJhdGlvbi5yZWNvcmQpXG4gICAgICAgIH07XG4gICAgfSxcbiAgICBhZGRUb1JlbGF0ZWRSZWNvcmRzKG9wZXJhdGlvbikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3A6ICdhZGRUb1JlbGF0ZWRSZWNvcmRzJyxcbiAgICAgICAgICAgIHJlY29yZDogY2xvbmVSZWNvcmRJZGVudGl0eShvcGVyYXRpb24ucmVjb3JkKSxcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcDogb3BlcmF0aW9uLnJlbGF0aW9uc2hpcCxcbiAgICAgICAgICAgIHJlbGF0ZWRSZWNvcmRzOiBbY2xvbmVSZWNvcmRJZGVudGl0eShvcGVyYXRpb24ucmVsYXRlZFJlY29yZCldXG4gICAgICAgIH07XG4gICAgfSxcbiAgICByZW1vdmVGcm9tUmVsYXRlZFJlY29yZHMob3BlcmF0aW9uKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcDogJ3JlbW92ZUZyb21SZWxhdGVkUmVjb3JkcycsXG4gICAgICAgICAgICByZWNvcmQ6IGNsb25lUmVjb3JkSWRlbnRpdHkob3BlcmF0aW9uLnJlY29yZCksXG4gICAgICAgICAgICByZWxhdGlvbnNoaXA6IG9wZXJhdGlvbi5yZWxhdGlvbnNoaXAsXG4gICAgICAgICAgICByZWxhdGVkUmVjb3JkczogW2Nsb25lUmVjb3JkSWRlbnRpdHkob3BlcmF0aW9uLnJlbGF0ZWRSZWNvcmQpXVxuICAgICAgICB9O1xuICAgIH0sXG4gICAgcmVwbGFjZVJlbGF0ZWRSZWNvcmQob3BlcmF0aW9uKSB7XG4gICAgICAgIGNvbnN0IHJlY29yZCA9IHtcbiAgICAgICAgICAgIHR5cGU6IG9wZXJhdGlvbi5yZWNvcmQudHlwZSxcbiAgICAgICAgICAgIGlkOiBvcGVyYXRpb24ucmVjb3JkLmlkXG4gICAgICAgIH07XG4gICAgICAgIGRlZXBTZXQocmVjb3JkLCBbJ3JlbGF0aW9uc2hpcHMnLCBvcGVyYXRpb24ucmVsYXRpb25zaGlwLCAnZGF0YSddLCBvcGVyYXRpb24ucmVsYXRlZFJlY29yZCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcDogJ3JlcGxhY2VSZWNvcmQnLFxuICAgICAgICAgICAgcmVjb3JkXG4gICAgICAgIH07XG4gICAgfSxcbiAgICByZXBsYWNlUmVsYXRlZFJlY29yZHMob3BlcmF0aW9uKSB7XG4gICAgICAgIGNvbnN0IHJlY29yZCA9IGNsb25lUmVjb3JkSWRlbnRpdHkob3BlcmF0aW9uLnJlY29yZCk7XG4gICAgICAgIGRlZXBTZXQocmVjb3JkLCBbJ3JlbGF0aW9uc2hpcHMnLCBvcGVyYXRpb24ucmVsYXRpb25zaGlwLCAnZGF0YSddLCBvcGVyYXRpb24ucmVsYXRlZFJlY29yZHMpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3A6ICdyZXBsYWNlUmVjb3JkJyxcbiAgICAgICAgICAgIHJlY29yZFxuICAgICAgICB9O1xuICAgIH1cbn07XG5mdW5jdGlvbiByZXBsYWNlUmVjb3JkQXR0cmlidXRlKHJlY29yZCwgYXR0cmlidXRlLCB2YWx1ZSkge1xuICAgIGRlZXBTZXQocmVjb3JkLCBbJ2F0dHJpYnV0ZXMnLCBhdHRyaWJ1dGVdLCB2YWx1ZSk7XG59XG5mdW5jdGlvbiByZXBsYWNlUmVjb3JkSGFzT25lKHJlY29yZCwgcmVsYXRpb25zaGlwLCByZWxhdGVkUmVjb3JkKSB7XG4gICAgZGVlcFNldChyZWNvcmQsIFsncmVsYXRpb25zaGlwcycsIHJlbGF0aW9uc2hpcCwgJ2RhdGEnXSwgcmVsYXRlZFJlY29yZCA/IGNsb25lUmVjb3JkSWRlbnRpdHkocmVsYXRlZFJlY29yZCkgOiBudWxsKTtcbn1cbmZ1bmN0aW9uIHJlcGxhY2VSZWNvcmRIYXNNYW55KHJlY29yZCwgcmVsYXRpb25zaGlwLCByZWxhdGVkUmVjb3Jkcykge1xuICAgIGRlZXBTZXQocmVjb3JkLCBbJ3JlbGF0aW9uc2hpcHMnLCByZWxhdGlvbnNoaXAsICdkYXRhJ10sIHJlbGF0ZWRSZWNvcmRzLm1hcChyID0+IGNsb25lUmVjb3JkSWRlbnRpdHkocikpKTtcbn0iXX0=