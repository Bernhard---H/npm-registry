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
            let responseDoc = serializer.deserializeDocument(raw, record);
            let updatedRecord = responseDoc.data;
            let transforms = [];
            let updateOps = (0, _data.recordDiffs)(record, updatedRecord);
            if (updateOps.length > 0) {
                transforms.push((0, _data.buildTransform)(updateOps));
            }
            if (responseDoc.included && responseDoc.included.length > 0) {
                let includedOps = responseDoc.included.map(record => {
                    return { op: 'replaceRecord', record };
                });
                transforms.push((0, _data.buildTransform)(includedOps));
            }
            return transforms;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi90cmFuc2Zvcm0tcmVxdWVzdHMuanMiXSwibmFtZXMiOlsiZ2V0VHJhbnNmb3JtUmVxdWVzdHMiLCJUcmFuc2Zvcm1SZXF1ZXN0UHJvY2Vzc29ycyIsImFkZFJlY29yZCIsInNvdXJjZSIsInJlcXVlc3QiLCJzZXJpYWxpemVyIiwicmVjb3JkIiwicmVxdWVzdERvYyIsInNlcmlhbGl6ZURvY3VtZW50Iiwic2V0dGluZ3MiLCJvcHRpb25zIiwibWV0aG9kIiwianNvbiIsImZldGNoIiwicmVzb3VyY2VVUkwiLCJ0eXBlIiwidGhlbiIsInJhdyIsInJlc3BvbnNlRG9jIiwiZGVzZXJpYWxpemVEb2N1bWVudCIsInVwZGF0ZWRSZWNvcmQiLCJkYXRhIiwidHJhbnNmb3JtcyIsInVwZGF0ZU9wcyIsImxlbmd0aCIsInB1c2giLCJpbmNsdWRlZCIsImluY2x1ZGVkT3BzIiwibWFwIiwib3AiLCJyZW1vdmVSZWNvcmQiLCJpZCIsInJlcGxhY2VSZWNvcmQiLCJhZGRUb1JlbGF0ZWRSZWNvcmRzIiwicmVsYXRpb25zaGlwIiwicmVsYXRlZFJlY29yZHMiLCJyIiwicmVzb3VyY2VJZGVudGl0eSIsInJlc291cmNlUmVsYXRpb25zaGlwVVJMIiwicmVtb3ZlRnJvbVJlbGF0ZWRSZWNvcmRzIiwicmVwbGFjZVJlbGF0ZWRSZWNvcmQiLCJyZWxhdGVkUmVjb3JkIiwicmVwbGFjZVJlbGF0ZWRSZWNvcmRzIiwidHJhbnNmb3JtIiwicmVxdWVzdHMiLCJwcmV2UmVxdWVzdCIsIm9wZXJhdGlvbnMiLCJmb3JFYWNoIiwib3BlcmF0aW9uIiwibmV3UmVxdWVzdE5lZWRlZCIsInBvcCIsInJlcGxhY2VSZWNvcmRBdHRyaWJ1dGUiLCJhdHRyaWJ1dGUiLCJ2YWx1ZSIsInJlcGxhY2VSZWNvcmRIYXNPbmUiLCJyZXBsYWNlUmVjb3JkSGFzTWFueSIsIk9wZXJhdGlvblRvUmVxdWVzdE1hcCIsInJlcGxhY2VBdHRyaWJ1dGUiXSwibWFwcGluZ3MiOiI7Ozs7OztRQTJFZ0JB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QWtCMEMsVUFBVWQsWUFBNUIsRUFBMEMsTUFBMUMsQ0FBaEIsRUFBbUVjLFVBQVViLGNBQTdFO0FBQ0EsZUFBTztBQUNITixnQkFBSSxlQUREO0FBRUh2QjtBQUZHLFNBQVA7QUFJSDtBQTdEeUIsQ0FBOUI7QUErREEsU0FBUzZDLHNCQUFULENBQWdDN0MsTUFBaEMsRUFBd0M4QyxTQUF4QyxFQUFtREMsS0FBbkQsRUFBMEQ7QUFDdEQsd0JBQVEvQyxNQUFSLEVBQWdCLENBQUMsWUFBRCxFQUFlOEMsU0FBZixDQUFoQixFQUEyQ0MsS0FBM0M7QUFDSDtBQUNELFNBQVNDLG1CQUFULENBQTZCaEQsTUFBN0IsRUFBcUM0QixZQUFyQyxFQUFtRE8sYUFBbkQsRUFBa0U7QUFDOUQsd0JBQVFuQyxNQUFSLEVBQWdCLENBQUMsZUFBRCxFQUFrQjRCLFlBQWxCLEVBQWdDLE1BQWhDLENBQWhCLEVBQXlETyxnQkFBZ0IsK0JBQW9CQSxhQUFwQixDQUFoQixHQUFxRCxJQUE5RztBQUNIO0FBQ0QsU0FBU2Msb0JBQVQsQ0FBOEJqRCxNQUE5QixFQUFzQzRCLFlBQXRDLEVBQW9EQyxjQUFwRCxFQUFvRTtBQUNoRSx3QkFBUTdCLE1BQVIsRUFBZ0IsQ0FBQyxlQUFELEVBQWtCNEIsWUFBbEIsRUFBZ0MsTUFBaEMsQ0FBaEIsRUFBeURDLGVBQWVQLEdBQWYsQ0FBbUJRLEtBQUssK0JBQW9CQSxDQUFwQixDQUF4QixDQUF6RDtBQUNIIiwiZmlsZSI6ImxpYi90cmFuc2Zvcm0tcmVxdWVzdHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjbG9uZVJlY29yZElkZW50aXR5LCBlcXVhbFJlY29yZElkZW50aXRpZXMsIHJlY29yZERpZmZzLCBidWlsZFRyYW5zZm9ybSB9IGZyb20gJ0BvcmJpdC9kYXRhJztcbmltcG9ydCB7IGNsb25lLCBkZWVwU2V0IH0gZnJvbSAnQG9yYml0L3V0aWxzJztcbmltcG9ydCB7IGJ1aWxkRmV0Y2hTZXR0aW5ncywgY3VzdG9tUmVxdWVzdE9wdGlvbnMgfSBmcm9tICcuL3JlcXVlc3Qtc2V0dGluZ3MnO1xuZXhwb3J0IGNvbnN0IFRyYW5zZm9ybVJlcXVlc3RQcm9jZXNzb3JzID0ge1xuICAgIGFkZFJlY29yZChzb3VyY2UsIHJlcXVlc3QpIHtcbiAgICAgICAgY29uc3QgeyBzZXJpYWxpemVyIH0gPSBzb3VyY2U7XG4gICAgICAgIGNvbnN0IHJlY29yZCA9IHJlcXVlc3QucmVjb3JkO1xuICAgICAgICBjb25zdCByZXF1ZXN0RG9jID0gc2VyaWFsaXplci5zZXJpYWxpemVEb2N1bWVudChyZWNvcmQpO1xuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGJ1aWxkRmV0Y2hTZXR0aW5ncyhyZXF1ZXN0Lm9wdGlvbnMsIHsgbWV0aG9kOiAnUE9TVCcsIGpzb246IHJlcXVlc3REb2MgfSk7XG4gICAgICAgIHJldHVybiBzb3VyY2UuZmV0Y2goc291cmNlLnJlc291cmNlVVJMKHJlY29yZC50eXBlKSwgc2V0dGluZ3MpLnRoZW4ocmF3ID0+IHtcbiAgICAgICAgICAgIGxldCByZXNwb25zZURvYyA9IHNlcmlhbGl6ZXIuZGVzZXJpYWxpemVEb2N1bWVudChyYXcsIHJlY29yZCk7XG4gICAgICAgICAgICBsZXQgdXBkYXRlZFJlY29yZCA9IHJlc3BvbnNlRG9jLmRhdGE7XG4gICAgICAgICAgICBsZXQgdHJhbnNmb3JtcyA9IFtdO1xuICAgICAgICAgICAgbGV0IHVwZGF0ZU9wcyA9IHJlY29yZERpZmZzKHJlY29yZCwgdXBkYXRlZFJlY29yZCk7XG4gICAgICAgICAgICBpZiAodXBkYXRlT3BzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB0cmFuc2Zvcm1zLnB1c2goYnVpbGRUcmFuc2Zvcm0odXBkYXRlT3BzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmVzcG9uc2VEb2MuaW5jbHVkZWQgJiYgcmVzcG9uc2VEb2MuaW5jbHVkZWQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGxldCBpbmNsdWRlZE9wcyA9IHJlc3BvbnNlRG9jLmluY2x1ZGVkLm1hcChyZWNvcmQgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBvcDogJ3JlcGxhY2VSZWNvcmQnLCByZWNvcmQgfTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB0cmFuc2Zvcm1zLnB1c2goYnVpbGRUcmFuc2Zvcm0oaW5jbHVkZWRPcHMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cmFuc2Zvcm1zO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIHJlbW92ZVJlY29yZChzb3VyY2UsIHJlcXVlc3QpIHtcbiAgICAgICAgY29uc3QgeyB0eXBlLCBpZCB9ID0gcmVxdWVzdC5yZWNvcmQ7XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gYnVpbGRGZXRjaFNldHRpbmdzKHJlcXVlc3Qub3B0aW9ucywgeyBtZXRob2Q6ICdERUxFVEUnIH0pO1xuICAgICAgICByZXR1cm4gc291cmNlLmZldGNoKHNvdXJjZS5yZXNvdXJjZVVSTCh0eXBlLCBpZCksIHNldHRpbmdzKS50aGVuKCgpID0+IFtdKTtcbiAgICB9LFxuICAgIHJlcGxhY2VSZWNvcmQoc291cmNlLCByZXF1ZXN0KSB7XG4gICAgICAgIGNvbnN0IHJlY29yZCA9IHJlcXVlc3QucmVjb3JkO1xuICAgICAgICBjb25zdCB7IHR5cGUsIGlkIH0gPSByZWNvcmQ7XG4gICAgICAgIGNvbnN0IHJlcXVlc3REb2MgPSBzb3VyY2Uuc2VyaWFsaXplci5zZXJpYWxpemVEb2N1bWVudChyZWNvcmQpO1xuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGJ1aWxkRmV0Y2hTZXR0aW5ncyhyZXF1ZXN0Lm9wdGlvbnMsIHsgbWV0aG9kOiAnUEFUQ0gnLCBqc29uOiByZXF1ZXN0RG9jIH0pO1xuICAgICAgICByZXR1cm4gc291cmNlLmZldGNoKHNvdXJjZS5yZXNvdXJjZVVSTCh0eXBlLCBpZCksIHNldHRpbmdzKS50aGVuKCgpID0+IFtdKTtcbiAgICB9LFxuICAgIGFkZFRvUmVsYXRlZFJlY29yZHMoc291cmNlLCByZXF1ZXN0KSB7XG4gICAgICAgIGNvbnN0IHsgdHlwZSwgaWQgfSA9IHJlcXVlc3QucmVjb3JkO1xuICAgICAgICBjb25zdCB7IHJlbGF0aW9uc2hpcCB9ID0gcmVxdWVzdDtcbiAgICAgICAgY29uc3QganNvbiA9IHtcbiAgICAgICAgICAgIGRhdGE6IHJlcXVlc3QucmVsYXRlZFJlY29yZHMubWFwKHIgPT4gc291cmNlLnNlcmlhbGl6ZXIucmVzb3VyY2VJZGVudGl0eShyKSlcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBidWlsZEZldGNoU2V0dGluZ3MocmVxdWVzdC5vcHRpb25zLCB7IG1ldGhvZDogJ1BPU1QnLCBqc29uIH0pO1xuICAgICAgICByZXR1cm4gc291cmNlLmZldGNoKHNvdXJjZS5yZXNvdXJjZVJlbGF0aW9uc2hpcFVSTCh0eXBlLCBpZCwgcmVsYXRpb25zaGlwKSwgc2V0dGluZ3MpLnRoZW4oKCkgPT4gW10pO1xuICAgIH0sXG4gICAgcmVtb3ZlRnJvbVJlbGF0ZWRSZWNvcmRzKHNvdXJjZSwgcmVxdWVzdCkge1xuICAgICAgICBjb25zdCB7IHR5cGUsIGlkIH0gPSByZXF1ZXN0LnJlY29yZDtcbiAgICAgICAgY29uc3QgeyByZWxhdGlvbnNoaXAgfSA9IHJlcXVlc3Q7XG4gICAgICAgIGNvbnN0IGpzb24gPSB7XG4gICAgICAgICAgICBkYXRhOiByZXF1ZXN0LnJlbGF0ZWRSZWNvcmRzLm1hcChyID0+IHNvdXJjZS5zZXJpYWxpemVyLnJlc291cmNlSWRlbnRpdHkocikpXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gYnVpbGRGZXRjaFNldHRpbmdzKHJlcXVlc3Qub3B0aW9ucywgeyBtZXRob2Q6ICdERUxFVEUnLCBqc29uIH0pO1xuICAgICAgICByZXR1cm4gc291cmNlLmZldGNoKHNvdXJjZS5yZXNvdXJjZVJlbGF0aW9uc2hpcFVSTCh0eXBlLCBpZCwgcmVsYXRpb25zaGlwKSwgc2V0dGluZ3MpLnRoZW4oKCkgPT4gW10pO1xuICAgIH0sXG4gICAgcmVwbGFjZVJlbGF0ZWRSZWNvcmQoc291cmNlLCByZXF1ZXN0KSB7XG4gICAgICAgIGNvbnN0IHsgdHlwZSwgaWQgfSA9IHJlcXVlc3QucmVjb3JkO1xuICAgICAgICBjb25zdCB7IHJlbGF0aW9uc2hpcCwgcmVsYXRlZFJlY29yZCB9ID0gcmVxdWVzdDtcbiAgICAgICAgY29uc3QganNvbiA9IHtcbiAgICAgICAgICAgIGRhdGE6IHJlbGF0ZWRSZWNvcmQgPyBzb3VyY2Uuc2VyaWFsaXplci5yZXNvdXJjZUlkZW50aXR5KHJlbGF0ZWRSZWNvcmQpIDogbnVsbFxuICAgICAgICB9O1xuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGJ1aWxkRmV0Y2hTZXR0aW5ncyhyZXF1ZXN0Lm9wdGlvbnMsIHsgbWV0aG9kOiAnUEFUQ0gnLCBqc29uIH0pO1xuICAgICAgICByZXR1cm4gc291cmNlLmZldGNoKHNvdXJjZS5yZXNvdXJjZVJlbGF0aW9uc2hpcFVSTCh0eXBlLCBpZCwgcmVsYXRpb25zaGlwKSwgc2V0dGluZ3MpLnRoZW4oKCkgPT4gW10pO1xuICAgIH0sXG4gICAgcmVwbGFjZVJlbGF0ZWRSZWNvcmRzKHNvdXJjZSwgcmVxdWVzdCkge1xuICAgICAgICBjb25zdCB7IHR5cGUsIGlkIH0gPSByZXF1ZXN0LnJlY29yZDtcbiAgICAgICAgY29uc3QgeyByZWxhdGlvbnNoaXAsIHJlbGF0ZWRSZWNvcmRzIH0gPSByZXF1ZXN0O1xuICAgICAgICBjb25zdCBqc29uID0ge1xuICAgICAgICAgICAgZGF0YTogcmVsYXRlZFJlY29yZHMubWFwKHIgPT4gc291cmNlLnNlcmlhbGl6ZXIucmVzb3VyY2VJZGVudGl0eShyKSlcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBidWlsZEZldGNoU2V0dGluZ3MocmVxdWVzdC5vcHRpb25zLCB7IG1ldGhvZDogJ1BBVENIJywganNvbiB9KTtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5mZXRjaChzb3VyY2UucmVzb3VyY2VSZWxhdGlvbnNoaXBVUkwodHlwZSwgaWQsIHJlbGF0aW9uc2hpcCksIHNldHRpbmdzKS50aGVuKCgpID0+IFtdKTtcbiAgICB9XG59O1xuZXhwb3J0IGZ1bmN0aW9uIGdldFRyYW5zZm9ybVJlcXVlc3RzKHNvdXJjZSwgdHJhbnNmb3JtKSB7XG4gICAgY29uc3QgcmVxdWVzdHMgPSBbXTtcbiAgICBsZXQgcHJldlJlcXVlc3Q7XG4gICAgdHJhbnNmb3JtLm9wZXJhdGlvbnMuZm9yRWFjaChvcGVyYXRpb24gPT4ge1xuICAgICAgICBsZXQgcmVxdWVzdDtcbiAgICAgICAgbGV0IG5ld1JlcXVlc3ROZWVkZWQgPSB0cnVlO1xuICAgICAgICBpZiAocHJldlJlcXVlc3QgJiYgZXF1YWxSZWNvcmRJZGVudGl0aWVzKHByZXZSZXF1ZXN0LnJlY29yZCwgb3BlcmF0aW9uLnJlY29yZCkpIHtcbiAgICAgICAgICAgIGlmIChvcGVyYXRpb24ub3AgPT09ICdyZW1vdmVSZWNvcmQnKSB7XG4gICAgICAgICAgICAgICAgbmV3UmVxdWVzdE5lZWRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGlmIChwcmV2UmVxdWVzdC5vcCAhPT0gJ3JlbW92ZVJlY29yZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJldlJlcXVlc3QgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICByZXF1ZXN0cy5wb3AoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByZXZSZXF1ZXN0Lm9wID09PSAnYWRkUmVjb3JkJyB8fCBwcmV2UmVxdWVzdC5vcCA9PT0gJ3JlcGxhY2VSZWNvcmQnKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9wZXJhdGlvbi5vcCA9PT0gJ3JlcGxhY2VBdHRyaWJ1dGUnKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld1JlcXVlc3ROZWVkZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgcmVwbGFjZVJlY29yZEF0dHJpYnV0ZShwcmV2UmVxdWVzdC5yZWNvcmQsIG9wZXJhdGlvbi5hdHRyaWJ1dGUsIG9wZXJhdGlvbi52YWx1ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChvcGVyYXRpb24ub3AgPT09ICdyZXBsYWNlUmVsYXRlZFJlY29yZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3UmVxdWVzdE5lZWRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICByZXBsYWNlUmVjb3JkSGFzT25lKHByZXZSZXF1ZXN0LnJlY29yZCwgb3BlcmF0aW9uLnJlbGF0aW9uc2hpcCwgb3BlcmF0aW9uLnJlbGF0ZWRSZWNvcmQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAob3BlcmF0aW9uLm9wID09PSAncmVwbGFjZVJlbGF0ZWRSZWNvcmRzJykge1xuICAgICAgICAgICAgICAgICAgICBuZXdSZXF1ZXN0TmVlZGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHJlcGxhY2VSZWNvcmRIYXNNYW55KHByZXZSZXF1ZXN0LnJlY29yZCwgb3BlcmF0aW9uLnJlbGF0aW9uc2hpcCwgb3BlcmF0aW9uLnJlbGF0ZWRSZWNvcmRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByZXZSZXF1ZXN0Lm9wID09PSAnYWRkVG9SZWxhdGVkUmVjb3JkcycgJiYgb3BlcmF0aW9uLm9wID09PSAnYWRkVG9SZWxhdGVkUmVjb3JkcycgJiYgcHJldlJlcXVlc3QucmVsYXRpb25zaGlwID09PSBvcGVyYXRpb24ucmVsYXRpb25zaGlwKSB7XG4gICAgICAgICAgICAgICAgbmV3UmVxdWVzdE5lZWRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHByZXZSZXF1ZXN0LnJlbGF0ZWRSZWNvcmRzLnB1c2goY2xvbmVSZWNvcmRJZGVudGl0eShvcGVyYXRpb24ucmVsYXRlZFJlY29yZCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChuZXdSZXF1ZXN0TmVlZGVkKSB7XG4gICAgICAgICAgICByZXF1ZXN0ID0gT3BlcmF0aW9uVG9SZXF1ZXN0TWFwW29wZXJhdGlvbi5vcF0ob3BlcmF0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVxdWVzdCkge1xuICAgICAgICAgICAgbGV0IG9wdGlvbnMgPSBjdXN0b21SZXF1ZXN0T3B0aW9ucyhzb3VyY2UsIHRyYW5zZm9ybSk7XG4gICAgICAgICAgICBpZiAob3B0aW9ucykge1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXF1ZXN0cy5wdXNoKHJlcXVlc3QpO1xuICAgICAgICAgICAgcHJldlJlcXVlc3QgPSByZXF1ZXN0O1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcXVlc3RzO1xufVxuY29uc3QgT3BlcmF0aW9uVG9SZXF1ZXN0TWFwID0ge1xuICAgIGFkZFJlY29yZChvcGVyYXRpb24pIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9wOiAnYWRkUmVjb3JkJyxcbiAgICAgICAgICAgIHJlY29yZDogY2xvbmUob3BlcmF0aW9uLnJlY29yZClcbiAgICAgICAgfTtcbiAgICB9LFxuICAgIHJlbW92ZVJlY29yZChvcGVyYXRpb24pIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9wOiAncmVtb3ZlUmVjb3JkJyxcbiAgICAgICAgICAgIHJlY29yZDogY2xvbmVSZWNvcmRJZGVudGl0eShvcGVyYXRpb24ucmVjb3JkKVxuICAgICAgICB9O1xuICAgIH0sXG4gICAgcmVwbGFjZUF0dHJpYnV0ZShvcGVyYXRpb24pIHtcbiAgICAgICAgY29uc3QgcmVjb3JkID0gY2xvbmVSZWNvcmRJZGVudGl0eShvcGVyYXRpb24ucmVjb3JkKTtcbiAgICAgICAgcmVwbGFjZVJlY29yZEF0dHJpYnV0ZShyZWNvcmQsIG9wZXJhdGlvbi5hdHRyaWJ1dGUsIG9wZXJhdGlvbi52YWx1ZSk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcDogJ3JlcGxhY2VSZWNvcmQnLFxuICAgICAgICAgICAgcmVjb3JkXG4gICAgICAgIH07XG4gICAgfSxcbiAgICByZXBsYWNlUmVjb3JkKG9wZXJhdGlvbikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3A6ICdyZXBsYWNlUmVjb3JkJyxcbiAgICAgICAgICAgIHJlY29yZDogY2xvbmUob3BlcmF0aW9uLnJlY29yZClcbiAgICAgICAgfTtcbiAgICB9LFxuICAgIGFkZFRvUmVsYXRlZFJlY29yZHMob3BlcmF0aW9uKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcDogJ2FkZFRvUmVsYXRlZFJlY29yZHMnLFxuICAgICAgICAgICAgcmVjb3JkOiBjbG9uZVJlY29yZElkZW50aXR5KG9wZXJhdGlvbi5yZWNvcmQpLFxuICAgICAgICAgICAgcmVsYXRpb25zaGlwOiBvcGVyYXRpb24ucmVsYXRpb25zaGlwLFxuICAgICAgICAgICAgcmVsYXRlZFJlY29yZHM6IFtjbG9uZVJlY29yZElkZW50aXR5KG9wZXJhdGlvbi5yZWxhdGVkUmVjb3JkKV1cbiAgICAgICAgfTtcbiAgICB9LFxuICAgIHJlbW92ZUZyb21SZWxhdGVkUmVjb3JkcyhvcGVyYXRpb24pIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9wOiAncmVtb3ZlRnJvbVJlbGF0ZWRSZWNvcmRzJyxcbiAgICAgICAgICAgIHJlY29yZDogY2xvbmVSZWNvcmRJZGVudGl0eShvcGVyYXRpb24ucmVjb3JkKSxcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcDogb3BlcmF0aW9uLnJlbGF0aW9uc2hpcCxcbiAgICAgICAgICAgIHJlbGF0ZWRSZWNvcmRzOiBbY2xvbmVSZWNvcmRJZGVudGl0eShvcGVyYXRpb24ucmVsYXRlZFJlY29yZCldXG4gICAgICAgIH07XG4gICAgfSxcbiAgICByZXBsYWNlUmVsYXRlZFJlY29yZChvcGVyYXRpb24pIHtcbiAgICAgICAgY29uc3QgcmVjb3JkID0ge1xuICAgICAgICAgICAgdHlwZTogb3BlcmF0aW9uLnJlY29yZC50eXBlLFxuICAgICAgICAgICAgaWQ6IG9wZXJhdGlvbi5yZWNvcmQuaWRcbiAgICAgICAgfTtcbiAgICAgICAgZGVlcFNldChyZWNvcmQsIFsncmVsYXRpb25zaGlwcycsIG9wZXJhdGlvbi5yZWxhdGlvbnNoaXAsICdkYXRhJ10sIG9wZXJhdGlvbi5yZWxhdGVkUmVjb3JkKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9wOiAncmVwbGFjZVJlY29yZCcsXG4gICAgICAgICAgICByZWNvcmRcbiAgICAgICAgfTtcbiAgICB9LFxuICAgIHJlcGxhY2VSZWxhdGVkUmVjb3JkcyhvcGVyYXRpb24pIHtcbiAgICAgICAgY29uc3QgcmVjb3JkID0gY2xvbmVSZWNvcmRJZGVudGl0eShvcGVyYXRpb24ucmVjb3JkKTtcbiAgICAgICAgZGVlcFNldChyZWNvcmQsIFsncmVsYXRpb25zaGlwcycsIG9wZXJhdGlvbi5yZWxhdGlvbnNoaXAsICdkYXRhJ10sIG9wZXJhdGlvbi5yZWxhdGVkUmVjb3Jkcyk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcDogJ3JlcGxhY2VSZWNvcmQnLFxuICAgICAgICAgICAgcmVjb3JkXG4gICAgICAgIH07XG4gICAgfVxufTtcbmZ1bmN0aW9uIHJlcGxhY2VSZWNvcmRBdHRyaWJ1dGUocmVjb3JkLCBhdHRyaWJ1dGUsIHZhbHVlKSB7XG4gICAgZGVlcFNldChyZWNvcmQsIFsnYXR0cmlidXRlcycsIGF0dHJpYnV0ZV0sIHZhbHVlKTtcbn1cbmZ1bmN0aW9uIHJlcGxhY2VSZWNvcmRIYXNPbmUocmVjb3JkLCByZWxhdGlvbnNoaXAsIHJlbGF0ZWRSZWNvcmQpIHtcbiAgICBkZWVwU2V0KHJlY29yZCwgWydyZWxhdGlvbnNoaXBzJywgcmVsYXRpb25zaGlwLCAnZGF0YSddLCByZWxhdGVkUmVjb3JkID8gY2xvbmVSZWNvcmRJZGVudGl0eShyZWxhdGVkUmVjb3JkKSA6IG51bGwpO1xufVxuZnVuY3Rpb24gcmVwbGFjZVJlY29yZEhhc01hbnkocmVjb3JkLCByZWxhdGlvbnNoaXAsIHJlbGF0ZWRSZWNvcmRzKSB7XG4gICAgZGVlcFNldChyZWNvcmQsIFsncmVsYXRpb25zaGlwcycsIHJlbGF0aW9uc2hpcCwgJ2RhdGEnXSwgcmVsYXRlZFJlY29yZHMubWFwKHIgPT4gY2xvbmVSZWNvcmRJZGVudGl0eShyKSkpO1xufSJdfQ==