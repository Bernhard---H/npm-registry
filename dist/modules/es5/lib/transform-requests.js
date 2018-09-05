import { cloneRecordIdentity, equalRecordIdentities, recordDiffs, buildTransform } from '@orbit/data';
import { clone, deepSet } from '@orbit/utils';
import { buildFetchSettings, customRequestOptions } from './request-settings';
export var TransformRequestProcessors = {
    addRecord: function (source, request) {
        var serializer = source.serializer;

        var record = request.record;
        var requestDoc = serializer.serializeDocument(record);
        var settings = buildFetchSettings(request.options, { method: 'POST', json: requestDoc });
        return source.fetch(source.resourceURL(record.type), settings).then(function (raw) {
            var responseDoc = serializer.deserializeDocument(raw);
            var updatedRecord = responseDoc.data;
            var updateOps = recordDiffs(record, updatedRecord);
            if (updateOps.length > 0) {
                return [buildTransform(updateOps)];
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
export function getTransformRequests(source, transform) {
    var requests = [];
    var prevRequest = void 0;
    transform.operations.forEach(function (operation) {
        var request = void 0;
        var newRequestNeeded = true;
        if (prevRequest && equalRecordIdentities(prevRequest.record, operation.record)) {
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
                prevRequest.relatedRecords.push(cloneRecordIdentity(operation.relatedRecord));
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
            record: clone(operation.record)
        };
    },
    removeRecord: function (operation) {
        return {
            op: 'removeRecord',
            record: cloneRecordIdentity(operation.record)
        };
    },
    replaceAttribute: function (operation) {
        var record = cloneRecordIdentity(operation.record);
        replaceRecordAttribute(record, operation.attribute, operation.value);
        return {
            op: 'replaceRecord',
            record: record
        };
    },
    replaceRecord: function (operation) {
        return {
            op: 'replaceRecord',
            record: clone(operation.record)
        };
    },
    addToRelatedRecords: function (operation) {
        return {
            op: 'addToRelatedRecords',
            record: cloneRecordIdentity(operation.record),
            relationship: operation.relationship,
            relatedRecords: [cloneRecordIdentity(operation.relatedRecord)]
        };
    },
    removeFromRelatedRecords: function (operation) {
        return {
            op: 'removeFromRelatedRecords',
            record: cloneRecordIdentity(operation.record),
            relationship: operation.relationship,
            relatedRecords: [cloneRecordIdentity(operation.relatedRecord)]
        };
    },
    replaceRelatedRecord: function (operation) {
        var record = {
            type: operation.record.type,
            id: operation.record.id
        };
        deepSet(record, ['relationships', operation.relationship, 'data'], operation.relatedRecord);
        return {
            op: 'replaceRecord',
            record: record
        };
    },
    replaceRelatedRecords: function (operation) {
        var record = cloneRecordIdentity(operation.record);
        deepSet(record, ['relationships', operation.relationship, 'data'], operation.relatedRecords);
        return {
            op: 'replaceRecord',
            record: record
        };
    }
};
function replaceRecordAttribute(record, attribute, value) {
    deepSet(record, ['attributes', attribute], value);
}
function replaceRecordHasOne(record, relationship, relatedRecord) {
    deepSet(record, ['relationships', relationship, 'data'], relatedRecord ? cloneRecordIdentity(relatedRecord) : null);
}
function replaceRecordHasMany(record, relationship, relatedRecords) {
    deepSet(record, ['relationships', relationship, 'data'], relatedRecords.map(function (r) {
        return cloneRecordIdentity(r);
    }));
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi90cmFuc2Zvcm0tcmVxdWVzdHMuanMiXSwibmFtZXMiOlsiY2xvbmVSZWNvcmRJZGVudGl0eSIsImVxdWFsUmVjb3JkSWRlbnRpdGllcyIsInJlY29yZERpZmZzIiwiYnVpbGRUcmFuc2Zvcm0iLCJjbG9uZSIsImRlZXBTZXQiLCJidWlsZEZldGNoU2V0dGluZ3MiLCJjdXN0b21SZXF1ZXN0T3B0aW9ucyIsIlRyYW5zZm9ybVJlcXVlc3RQcm9jZXNzb3JzIiwiYWRkUmVjb3JkIiwic291cmNlIiwicmVxdWVzdCIsInNlcmlhbGl6ZXIiLCJyZWNvcmQiLCJyZXF1ZXN0RG9jIiwic2VyaWFsaXplRG9jdW1lbnQiLCJzZXR0aW5ncyIsIm9wdGlvbnMiLCJtZXRob2QiLCJqc29uIiwiZmV0Y2giLCJyZXNvdXJjZVVSTCIsInR5cGUiLCJ0aGVuIiwicmVzcG9uc2VEb2MiLCJkZXNlcmlhbGl6ZURvY3VtZW50IiwicmF3IiwidXBkYXRlZFJlY29yZCIsImRhdGEiLCJ1cGRhdGVPcHMiLCJsZW5ndGgiLCJyZW1vdmVSZWNvcmQiLCJpZCIsInJlcGxhY2VSZWNvcmQiLCJhZGRUb1JlbGF0ZWRSZWNvcmRzIiwicmVsYXRpb25zaGlwIiwicmVsYXRlZFJlY29yZHMiLCJtYXAiLCJyZXNvdXJjZUlkZW50aXR5IiwiciIsInJlc291cmNlUmVsYXRpb25zaGlwVVJMIiwicmVtb3ZlRnJvbVJlbGF0ZWRSZWNvcmRzIiwicmVwbGFjZVJlbGF0ZWRSZWNvcmQiLCJyZWxhdGVkUmVjb3JkIiwicmVwbGFjZVJlbGF0ZWRSZWNvcmRzIiwiZ2V0VHJhbnNmb3JtUmVxdWVzdHMiLCJ0cmFuc2Zvcm0iLCJyZXF1ZXN0cyIsInByZXZSZXF1ZXN0Iiwib3BlcmF0aW9ucyIsImZvckVhY2giLCJuZXdSZXF1ZXN0TmVlZGVkIiwib3BlcmF0aW9uIiwib3AiLCJwb3AiLCJyZXBsYWNlUmVjb3JkQXR0cmlidXRlIiwiYXR0cmlidXRlIiwidmFsdWUiLCJyZXBsYWNlUmVjb3JkSGFzT25lIiwicmVwbGFjZVJlY29yZEhhc01hbnkiLCJwdXNoIiwiT3BlcmF0aW9uVG9SZXF1ZXN0TWFwIiwicmVwbGFjZUF0dHJpYnV0ZSJdLCJtYXBwaW5ncyI6IkFBQUEsU0FBU0EsbUJBQVQsRUFBOEJDLHFCQUE5QixFQUFxREMsV0FBckQsRUFBa0VDLGNBQWxFLFFBQXdGLGFBQXhGO0FBQ0EsU0FBU0MsS0FBVCxFQUFnQkMsT0FBaEIsUUFBK0IsY0FBL0I7QUFDQSxTQUFTQyxrQkFBVCxFQUE2QkMsb0JBQTdCLFFBQXlELG9CQUF6RDtBQUNBLE9BQU8sSUFBTUMsNkJBQTZCO0FBQ3RDQyxhQURzQyxZQUM1QkMsTUFENEIsRUFDcEJDLE9BRG9CLEVBQ1g7QUFBQSxZQUNmQyxVQURlLEdBQ0FGLE1BREEsQ0FDZkUsVUFEZTs7QUFFdkIsWUFBTUMsU0FBU0YsUUFBUUUsTUFBdkI7QUFDQSxZQUFNQyxhQUFhRixXQUFXRyxpQkFBWCxDQUE2QkYsTUFBN0IsQ0FBbkI7QUFDQSxZQUFNRyxXQUFXVixtQkFBbUJLLFFBQVFNLE9BQTNCLEVBQW9DLEVBQUVDLFFBQVEsTUFBVixFQUFrQkMsTUFBTUwsVUFBeEIsRUFBcEMsQ0FBakI7QUFDQSxlQUFPSixPQUFPVSxLQUFQLENBQWFWLE9BQU9XLFdBQVAsQ0FBbUJSLE9BQU9TLElBQTFCLENBQWIsRUFBOENOLFFBQTlDLEVBQXdETyxJQUF4RCxDQUE2RCxlQUFPO0FBQ3ZFLGdCQUFJQyxjQUFjWixXQUFXYSxtQkFBWCxDQUErQkMsR0FBL0IsQ0FBbEI7QUFDQSxnQkFBSUMsZ0JBQWdCSCxZQUFZSSxJQUFoQztBQUNBLGdCQUFJQyxZQUFZM0IsWUFBWVcsTUFBWixFQUFvQmMsYUFBcEIsQ0FBaEI7QUFDQSxnQkFBSUUsVUFBVUMsTUFBVixHQUFtQixDQUF2QixFQUEwQjtBQUN0Qix1QkFBTyxDQUFDM0IsZUFBZTBCLFNBQWYsQ0FBRCxDQUFQO0FBQ0g7QUFDSixTQVBNLENBQVA7QUFRSCxLQWRxQztBQWV0Q0UsZ0JBZnNDLFlBZXpCckIsTUFmeUIsRUFlakJDLE9BZmlC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QW9CMkMsYUFBcEIsQ0FBaEIsR0FBcUQsSUFBOUc7QUFDSDtBQUNELFNBQVNnQixvQkFBVCxDQUE4QjlDLE1BQTlCLEVBQXNDc0IsWUFBdEMsRUFBb0RDLGNBQXBELEVBQW9FO0FBQ2hFL0IsWUFBUVEsTUFBUixFQUFnQixDQUFDLGVBQUQsRUFBa0JzQixZQUFsQixFQUFnQyxNQUFoQyxDQUFoQixFQUF5REMsZUFBZUMsR0FBZixDQUFtQjtBQUFBLGVBQUtyQyxvQkFBb0J1QyxDQUFwQixDQUFMO0FBQUEsS0FBbkIsQ0FBekQ7QUFDSCIsImZpbGUiOiJsaWIvdHJhbnNmb3JtLXJlcXVlc3RzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY2xvbmVSZWNvcmRJZGVudGl0eSwgZXF1YWxSZWNvcmRJZGVudGl0aWVzLCByZWNvcmREaWZmcywgYnVpbGRUcmFuc2Zvcm0gfSBmcm9tICdAb3JiaXQvZGF0YSc7XG5pbXBvcnQgeyBjbG9uZSwgZGVlcFNldCB9IGZyb20gJ0BvcmJpdC91dGlscyc7XG5pbXBvcnQgeyBidWlsZEZldGNoU2V0dGluZ3MsIGN1c3RvbVJlcXVlc3RPcHRpb25zIH0gZnJvbSAnLi9yZXF1ZXN0LXNldHRpbmdzJztcbmV4cG9ydCBjb25zdCBUcmFuc2Zvcm1SZXF1ZXN0UHJvY2Vzc29ycyA9IHtcbiAgICBhZGRSZWNvcmQoc291cmNlLCByZXF1ZXN0KSB7XG4gICAgICAgIGNvbnN0IHsgc2VyaWFsaXplciB9ID0gc291cmNlO1xuICAgICAgICBjb25zdCByZWNvcmQgPSByZXF1ZXN0LnJlY29yZDtcbiAgICAgICAgY29uc3QgcmVxdWVzdERvYyA9IHNlcmlhbGl6ZXIuc2VyaWFsaXplRG9jdW1lbnQocmVjb3JkKTtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBidWlsZEZldGNoU2V0dGluZ3MocmVxdWVzdC5vcHRpb25zLCB7IG1ldGhvZDogJ1BPU1QnLCBqc29uOiByZXF1ZXN0RG9jIH0pO1xuICAgICAgICByZXR1cm4gc291cmNlLmZldGNoKHNvdXJjZS5yZXNvdXJjZVVSTChyZWNvcmQudHlwZSksIHNldHRpbmdzKS50aGVuKHJhdyA9PiB7XG4gICAgICAgICAgICBsZXQgcmVzcG9uc2VEb2MgPSBzZXJpYWxpemVyLmRlc2VyaWFsaXplRG9jdW1lbnQocmF3KTtcbiAgICAgICAgICAgIGxldCB1cGRhdGVkUmVjb3JkID0gcmVzcG9uc2VEb2MuZGF0YTtcbiAgICAgICAgICAgIGxldCB1cGRhdGVPcHMgPSByZWNvcmREaWZmcyhyZWNvcmQsIHVwZGF0ZWRSZWNvcmQpO1xuICAgICAgICAgICAgaWYgKHVwZGF0ZU9wcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtidWlsZFRyYW5zZm9ybSh1cGRhdGVPcHMpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICByZW1vdmVSZWNvcmQoc291cmNlLCByZXF1ZXN0KSB7XG4gICAgICAgIGNvbnN0IHsgdHlwZSwgaWQgfSA9IHJlcXVlc3QucmVjb3JkO1xuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGJ1aWxkRmV0Y2hTZXR0aW5ncyhyZXF1ZXN0Lm9wdGlvbnMsIHsgbWV0aG9kOiAnREVMRVRFJyB9KTtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5mZXRjaChzb3VyY2UucmVzb3VyY2VVUkwodHlwZSwgaWQpLCBzZXR0aW5ncykudGhlbigoKSA9PiBbXSk7XG4gICAgfSxcbiAgICByZXBsYWNlUmVjb3JkKHNvdXJjZSwgcmVxdWVzdCkge1xuICAgICAgICBjb25zdCByZWNvcmQgPSByZXF1ZXN0LnJlY29yZDtcbiAgICAgICAgY29uc3QgeyB0eXBlLCBpZCB9ID0gcmVjb3JkO1xuICAgICAgICBjb25zdCByZXF1ZXN0RG9jID0gc291cmNlLnNlcmlhbGl6ZXIuc2VyaWFsaXplRG9jdW1lbnQocmVjb3JkKTtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBidWlsZEZldGNoU2V0dGluZ3MocmVxdWVzdC5vcHRpb25zLCB7IG1ldGhvZDogJ1BBVENIJywganNvbjogcmVxdWVzdERvYyB9KTtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5mZXRjaChzb3VyY2UucmVzb3VyY2VVUkwodHlwZSwgaWQpLCBzZXR0aW5ncykudGhlbigoKSA9PiBbXSk7XG4gICAgfSxcbiAgICBhZGRUb1JlbGF0ZWRSZWNvcmRzKHNvdXJjZSwgcmVxdWVzdCkge1xuICAgICAgICBjb25zdCB7IHR5cGUsIGlkIH0gPSByZXF1ZXN0LnJlY29yZDtcbiAgICAgICAgY29uc3QgeyByZWxhdGlvbnNoaXAgfSA9IHJlcXVlc3Q7XG4gICAgICAgIGNvbnN0IGpzb24gPSB7XG4gICAgICAgICAgICBkYXRhOiByZXF1ZXN0LnJlbGF0ZWRSZWNvcmRzLm1hcChyID0+IHNvdXJjZS5zZXJpYWxpemVyLnJlc291cmNlSWRlbnRpdHkocikpXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gYnVpbGRGZXRjaFNldHRpbmdzKHJlcXVlc3Qub3B0aW9ucywgeyBtZXRob2Q6ICdQT1NUJywganNvbiB9KTtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5mZXRjaChzb3VyY2UucmVzb3VyY2VSZWxhdGlvbnNoaXBVUkwodHlwZSwgaWQsIHJlbGF0aW9uc2hpcCksIHNldHRpbmdzKS50aGVuKCgpID0+IFtdKTtcbiAgICB9LFxuICAgIHJlbW92ZUZyb21SZWxhdGVkUmVjb3Jkcyhzb3VyY2UsIHJlcXVlc3QpIHtcbiAgICAgICAgY29uc3QgeyB0eXBlLCBpZCB9ID0gcmVxdWVzdC5yZWNvcmQ7XG4gICAgICAgIGNvbnN0IHsgcmVsYXRpb25zaGlwIH0gPSByZXF1ZXN0O1xuICAgICAgICBjb25zdCBqc29uID0ge1xuICAgICAgICAgICAgZGF0YTogcmVxdWVzdC5yZWxhdGVkUmVjb3Jkcy5tYXAociA9PiBzb3VyY2Uuc2VyaWFsaXplci5yZXNvdXJjZUlkZW50aXR5KHIpKVxuICAgICAgICB9O1xuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGJ1aWxkRmV0Y2hTZXR0aW5ncyhyZXF1ZXN0Lm9wdGlvbnMsIHsgbWV0aG9kOiAnREVMRVRFJywganNvbiB9KTtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5mZXRjaChzb3VyY2UucmVzb3VyY2VSZWxhdGlvbnNoaXBVUkwodHlwZSwgaWQsIHJlbGF0aW9uc2hpcCksIHNldHRpbmdzKS50aGVuKCgpID0+IFtdKTtcbiAgICB9LFxuICAgIHJlcGxhY2VSZWxhdGVkUmVjb3JkKHNvdXJjZSwgcmVxdWVzdCkge1xuICAgICAgICBjb25zdCB7IHR5cGUsIGlkIH0gPSByZXF1ZXN0LnJlY29yZDtcbiAgICAgICAgY29uc3QgeyByZWxhdGlvbnNoaXAsIHJlbGF0ZWRSZWNvcmQgfSA9IHJlcXVlc3Q7XG4gICAgICAgIGNvbnN0IGpzb24gPSB7XG4gICAgICAgICAgICBkYXRhOiByZWxhdGVkUmVjb3JkID8gc291cmNlLnNlcmlhbGl6ZXIucmVzb3VyY2VJZGVudGl0eShyZWxhdGVkUmVjb3JkKSA6IG51bGxcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBidWlsZEZldGNoU2V0dGluZ3MocmVxdWVzdC5vcHRpb25zLCB7IG1ldGhvZDogJ1BBVENIJywganNvbiB9KTtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5mZXRjaChzb3VyY2UucmVzb3VyY2VSZWxhdGlvbnNoaXBVUkwodHlwZSwgaWQsIHJlbGF0aW9uc2hpcCksIHNldHRpbmdzKS50aGVuKCgpID0+IFtdKTtcbiAgICB9LFxuICAgIHJlcGxhY2VSZWxhdGVkUmVjb3Jkcyhzb3VyY2UsIHJlcXVlc3QpIHtcbiAgICAgICAgY29uc3QgeyB0eXBlLCBpZCB9ID0gcmVxdWVzdC5yZWNvcmQ7XG4gICAgICAgIGNvbnN0IHsgcmVsYXRpb25zaGlwLCByZWxhdGVkUmVjb3JkcyB9ID0gcmVxdWVzdDtcbiAgICAgICAgY29uc3QganNvbiA9IHtcbiAgICAgICAgICAgIGRhdGE6IHJlbGF0ZWRSZWNvcmRzLm1hcChyID0+IHNvdXJjZS5zZXJpYWxpemVyLnJlc291cmNlSWRlbnRpdHkocikpXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gYnVpbGRGZXRjaFNldHRpbmdzKHJlcXVlc3Qub3B0aW9ucywgeyBtZXRob2Q6ICdQQVRDSCcsIGpzb24gfSk7XG4gICAgICAgIHJldHVybiBzb3VyY2UuZmV0Y2goc291cmNlLnJlc291cmNlUmVsYXRpb25zaGlwVVJMKHR5cGUsIGlkLCByZWxhdGlvbnNoaXApLCBzZXR0aW5ncykudGhlbigoKSA9PiBbXSk7XG4gICAgfVxufTtcbmV4cG9ydCBmdW5jdGlvbiBnZXRUcmFuc2Zvcm1SZXF1ZXN0cyhzb3VyY2UsIHRyYW5zZm9ybSkge1xuICAgIGNvbnN0IHJlcXVlc3RzID0gW107XG4gICAgbGV0IHByZXZSZXF1ZXN0O1xuICAgIHRyYW5zZm9ybS5vcGVyYXRpb25zLmZvckVhY2gob3BlcmF0aW9uID0+IHtcbiAgICAgICAgbGV0IHJlcXVlc3Q7XG4gICAgICAgIGxldCBuZXdSZXF1ZXN0TmVlZGVkID0gdHJ1ZTtcbiAgICAgICAgaWYgKHByZXZSZXF1ZXN0ICYmIGVxdWFsUmVjb3JkSWRlbnRpdGllcyhwcmV2UmVxdWVzdC5yZWNvcmQsIG9wZXJhdGlvbi5yZWNvcmQpKSB7XG4gICAgICAgICAgICBpZiAob3BlcmF0aW9uLm9wID09PSAncmVtb3ZlUmVjb3JkJykge1xuICAgICAgICAgICAgICAgIG5ld1JlcXVlc3ROZWVkZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBpZiAocHJldlJlcXVlc3Qub3AgIT09ICdyZW1vdmVSZWNvcmQnKSB7XG4gICAgICAgICAgICAgICAgICAgIHByZXZSZXF1ZXN0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgcmVxdWVzdHMucG9wKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChwcmV2UmVxdWVzdC5vcCA9PT0gJ2FkZFJlY29yZCcgfHwgcHJldlJlcXVlc3Qub3AgPT09ICdyZXBsYWNlUmVjb3JkJykge1xuICAgICAgICAgICAgICAgIGlmIChvcGVyYXRpb24ub3AgPT09ICdyZXBsYWNlQXR0cmlidXRlJykge1xuICAgICAgICAgICAgICAgICAgICBuZXdSZXF1ZXN0TmVlZGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHJlcGxhY2VSZWNvcmRBdHRyaWJ1dGUocHJldlJlcXVlc3QucmVjb3JkLCBvcGVyYXRpb24uYXR0cmlidXRlLCBvcGVyYXRpb24udmFsdWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAob3BlcmF0aW9uLm9wID09PSAncmVwbGFjZVJlbGF0ZWRSZWNvcmQnKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld1JlcXVlc3ROZWVkZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgcmVwbGFjZVJlY29yZEhhc09uZShwcmV2UmVxdWVzdC5yZWNvcmQsIG9wZXJhdGlvbi5yZWxhdGlvbnNoaXAsIG9wZXJhdGlvbi5yZWxhdGVkUmVjb3JkKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG9wZXJhdGlvbi5vcCA9PT0gJ3JlcGxhY2VSZWxhdGVkUmVjb3JkcycpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3UmVxdWVzdE5lZWRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICByZXBsYWNlUmVjb3JkSGFzTWFueShwcmV2UmVxdWVzdC5yZWNvcmQsIG9wZXJhdGlvbi5yZWxhdGlvbnNoaXAsIG9wZXJhdGlvbi5yZWxhdGVkUmVjb3Jkcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChwcmV2UmVxdWVzdC5vcCA9PT0gJ2FkZFRvUmVsYXRlZFJlY29yZHMnICYmIG9wZXJhdGlvbi5vcCA9PT0gJ2FkZFRvUmVsYXRlZFJlY29yZHMnICYmIHByZXZSZXF1ZXN0LnJlbGF0aW9uc2hpcCA9PT0gb3BlcmF0aW9uLnJlbGF0aW9uc2hpcCkge1xuICAgICAgICAgICAgICAgIG5ld1JlcXVlc3ROZWVkZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBwcmV2UmVxdWVzdC5yZWxhdGVkUmVjb3Jkcy5wdXNoKGNsb25lUmVjb3JkSWRlbnRpdHkob3BlcmF0aW9uLnJlbGF0ZWRSZWNvcmQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAobmV3UmVxdWVzdE5lZWRlZCkge1xuICAgICAgICAgICAgcmVxdWVzdCA9IE9wZXJhdGlvblRvUmVxdWVzdE1hcFtvcGVyYXRpb24ub3BdKG9wZXJhdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlcXVlc3QpIHtcbiAgICAgICAgICAgIGxldCBvcHRpb25zID0gY3VzdG9tUmVxdWVzdE9wdGlvbnMoc291cmNlLCB0cmFuc2Zvcm0pO1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9wdGlvbnMgPSBvcHRpb25zO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVxdWVzdHMucHVzaChyZXF1ZXN0KTtcbiAgICAgICAgICAgIHByZXZSZXF1ZXN0ID0gcmVxdWVzdDtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXF1ZXN0cztcbn1cbmNvbnN0IE9wZXJhdGlvblRvUmVxdWVzdE1hcCA9IHtcbiAgICBhZGRSZWNvcmQob3BlcmF0aW9uKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcDogJ2FkZFJlY29yZCcsXG4gICAgICAgICAgICByZWNvcmQ6IGNsb25lKG9wZXJhdGlvbi5yZWNvcmQpXG4gICAgICAgIH07XG4gICAgfSxcbiAgICByZW1vdmVSZWNvcmQob3BlcmF0aW9uKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcDogJ3JlbW92ZVJlY29yZCcsXG4gICAgICAgICAgICByZWNvcmQ6IGNsb25lUmVjb3JkSWRlbnRpdHkob3BlcmF0aW9uLnJlY29yZClcbiAgICAgICAgfTtcbiAgICB9LFxuICAgIHJlcGxhY2VBdHRyaWJ1dGUob3BlcmF0aW9uKSB7XG4gICAgICAgIGNvbnN0IHJlY29yZCA9IGNsb25lUmVjb3JkSWRlbnRpdHkob3BlcmF0aW9uLnJlY29yZCk7XG4gICAgICAgIHJlcGxhY2VSZWNvcmRBdHRyaWJ1dGUocmVjb3JkLCBvcGVyYXRpb24uYXR0cmlidXRlLCBvcGVyYXRpb24udmFsdWUpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3A6ICdyZXBsYWNlUmVjb3JkJyxcbiAgICAgICAgICAgIHJlY29yZFxuICAgICAgICB9O1xuICAgIH0sXG4gICAgcmVwbGFjZVJlY29yZChvcGVyYXRpb24pIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9wOiAncmVwbGFjZVJlY29yZCcsXG4gICAgICAgICAgICByZWNvcmQ6IGNsb25lKG9wZXJhdGlvbi5yZWNvcmQpXG4gICAgICAgIH07XG4gICAgfSxcbiAgICBhZGRUb1JlbGF0ZWRSZWNvcmRzKG9wZXJhdGlvbikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3A6ICdhZGRUb1JlbGF0ZWRSZWNvcmRzJyxcbiAgICAgICAgICAgIHJlY29yZDogY2xvbmVSZWNvcmRJZGVudGl0eShvcGVyYXRpb24ucmVjb3JkKSxcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcDogb3BlcmF0aW9uLnJlbGF0aW9uc2hpcCxcbiAgICAgICAgICAgIHJlbGF0ZWRSZWNvcmRzOiBbY2xvbmVSZWNvcmRJZGVudGl0eShvcGVyYXRpb24ucmVsYXRlZFJlY29yZCldXG4gICAgICAgIH07XG4gICAgfSxcbiAgICByZW1vdmVGcm9tUmVsYXRlZFJlY29yZHMob3BlcmF0aW9uKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcDogJ3JlbW92ZUZyb21SZWxhdGVkUmVjb3JkcycsXG4gICAgICAgICAgICByZWNvcmQ6IGNsb25lUmVjb3JkSWRlbnRpdHkob3BlcmF0aW9uLnJlY29yZCksXG4gICAgICAgICAgICByZWxhdGlvbnNoaXA6IG9wZXJhdGlvbi5yZWxhdGlvbnNoaXAsXG4gICAgICAgICAgICByZWxhdGVkUmVjb3JkczogW2Nsb25lUmVjb3JkSWRlbnRpdHkob3BlcmF0aW9uLnJlbGF0ZWRSZWNvcmQpXVxuICAgICAgICB9O1xuICAgIH0sXG4gICAgcmVwbGFjZVJlbGF0ZWRSZWNvcmQob3BlcmF0aW9uKSB7XG4gICAgICAgIGNvbnN0IHJlY29yZCA9IHtcbiAgICAgICAgICAgIHR5cGU6IG9wZXJhdGlvbi5yZWNvcmQudHlwZSxcbiAgICAgICAgICAgIGlkOiBvcGVyYXRpb24ucmVjb3JkLmlkXG4gICAgICAgIH07XG4gICAgICAgIGRlZXBTZXQocmVjb3JkLCBbJ3JlbGF0aW9uc2hpcHMnLCBvcGVyYXRpb24ucmVsYXRpb25zaGlwLCAnZGF0YSddLCBvcGVyYXRpb24ucmVsYXRlZFJlY29yZCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcDogJ3JlcGxhY2VSZWNvcmQnLFxuICAgICAgICAgICAgcmVjb3JkXG4gICAgICAgIH07XG4gICAgfSxcbiAgICByZXBsYWNlUmVsYXRlZFJlY29yZHMob3BlcmF0aW9uKSB7XG4gICAgICAgIGNvbnN0IHJlY29yZCA9IGNsb25lUmVjb3JkSWRlbnRpdHkob3BlcmF0aW9uLnJlY29yZCk7XG4gICAgICAgIGRlZXBTZXQocmVjb3JkLCBbJ3JlbGF0aW9uc2hpcHMnLCBvcGVyYXRpb24ucmVsYXRpb25zaGlwLCAnZGF0YSddLCBvcGVyYXRpb24ucmVsYXRlZFJlY29yZHMpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3A6ICdyZXBsYWNlUmVjb3JkJyxcbiAgICAgICAgICAgIHJlY29yZFxuICAgICAgICB9O1xuICAgIH1cbn07XG5mdW5jdGlvbiByZXBsYWNlUmVjb3JkQXR0cmlidXRlKHJlY29yZCwgYXR0cmlidXRlLCB2YWx1ZSkge1xuICAgIGRlZXBTZXQocmVjb3JkLCBbJ2F0dHJpYnV0ZXMnLCBhdHRyaWJ1dGVdLCB2YWx1ZSk7XG59XG5mdW5jdGlvbiByZXBsYWNlUmVjb3JkSGFzT25lKHJlY29yZCwgcmVsYXRpb25zaGlwLCByZWxhdGVkUmVjb3JkKSB7XG4gICAgZGVlcFNldChyZWNvcmQsIFsncmVsYXRpb25zaGlwcycsIHJlbGF0aW9uc2hpcCwgJ2RhdGEnXSwgcmVsYXRlZFJlY29yZCA/IGNsb25lUmVjb3JkSWRlbnRpdHkocmVsYXRlZFJlY29yZCkgOiBudWxsKTtcbn1cbmZ1bmN0aW9uIHJlcGxhY2VSZWNvcmRIYXNNYW55KHJlY29yZCwgcmVsYXRpb25zaGlwLCByZWxhdGVkUmVjb3Jkcykge1xuICAgIGRlZXBTZXQocmVjb3JkLCBbJ3JlbGF0aW9uc2hpcHMnLCByZWxhdGlvbnNoaXAsICdkYXRhJ10sIHJlbGF0ZWRSZWNvcmRzLm1hcChyID0+IGNsb25lUmVjb3JkSWRlbnRpdHkocikpKTtcbn0iXX0=