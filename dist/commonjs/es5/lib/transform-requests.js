'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.TransformRequestProcessors = undefined;
exports.getTransformRequests = getTransformRequests;

var _data = require('@orbit/data');

var _utils = require('@orbit/utils');

var _requestSettings = require('./request-settings');

var TransformRequestProcessors = exports.TransformRequestProcessors = {
    addRecord: function (source, request) {
        var serializer = source.serializer;

        var record = request.record;
        var requestDoc = serializer.serializeDocument(record);
        var settings = (0, _requestSettings.buildFetchSettings)(request.options, { method: 'POST', json: requestDoc });
        return source.fetch(source.resourceURL(record.type), settings).then(function (raw) {
            var responseDoc = serializer.deserializeDocument(raw);
            var updatedRecord = responseDoc.data;
            var updateOps = (0, _data.recordDiffs)(record, updatedRecord);
            if (updateOps.length > 0) {
                return [(0, _data.buildTransform)(updateOps)];
            }
        });
    },
    removeRecord: function (source, request) {
        var _request$record = request.record,
            type = _request$record.type,
            id = _request$record.id;

        var settings = (0, _requestSettings.buildFetchSettings)(request.options, { method: 'DELETE' });
        return source.fetch(source.resourceURL(type, id), settings).then(function () {
            return [];
        });
    },
    replaceRecord: function (source, request) {
        var record = request.record;
        var type = record.type,
            id = record.id;

        var requestDoc = source.serializer.serializeDocument(record);
        var settings = (0, _requestSettings.buildFetchSettings)(request.options, { method: 'PATCH', json: requestDoc });
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
        var settings = (0, _requestSettings.buildFetchSettings)(request.options, { method: 'POST', json: json });
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
        var settings = (0, _requestSettings.buildFetchSettings)(request.options, { method: 'DELETE', json: json });
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
        var settings = (0, _requestSettings.buildFetchSettings)(request.options, { method: 'PATCH', json: json });
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
        var settings = (0, _requestSettings.buildFetchSettings)(request.options, { method: 'PATCH', json: json });
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
            var options = (0, _requestSettings.customRequestOptions)(source, transform);
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
            record: (0, _utils.clone)(operation.record)
        };
    },
    removeRecord: function (operation) {
        return {
            op: 'removeRecord',
            record: (0, _data.cloneRecordIdentity)(operation.record)
        };
    },
    replaceAttribute: function (operation) {
        var record = (0, _data.cloneRecordIdentity)(operation.record);
        replaceRecordAttribute(record, operation.attribute, operation.value);
        return {
            op: 'replaceRecord',
            record: record
        };
    },
    replaceRecord: function (operation) {
        return {
            op: 'replaceRecord',
            record: (0, _utils.clone)(operation.record)
        };
    },
    addToRelatedRecords: function (operation) {
        return {
            op: 'addToRelatedRecords',
            record: (0, _data.cloneRecordIdentity)(operation.record),
            relationship: operation.relationship,
            relatedRecords: [(0, _data.cloneRecordIdentity)(operation.relatedRecord)]
        };
    },
    removeFromRelatedRecords: function (operation) {
        return {
            op: 'removeFromRelatedRecords',
            record: (0, _data.cloneRecordIdentity)(operation.record),
            relationship: operation.relationship,
            relatedRecords: [(0, _data.cloneRecordIdentity)(operation.relatedRecord)]
        };
    },
    replaceRelatedRecord: function (operation) {
        var record = {
            type: operation.record.type,
            id: operation.record.id
        };
        (0, _utils.deepSet)(record, ['relationships', operation.relationship, 'data'], operation.relatedRecord);
        return {
            op: 'replaceRecord',
            record: record
        };
    },
    replaceRelatedRecords: function (operation) {
        var record = (0, _data.cloneRecordIdentity)(operation.record);
        (0, _utils.deepSet)(record, ['relationships', operation.relationship, 'data'], operation.relatedRecords);
        return {
            op: 'replaceRecord',
            record: record
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
    (0, _utils.deepSet)(record, ['relationships', relationship, 'data'], relatedRecords.map(function (r) {
        return (0, _data.cloneRecordIdentity)(r);
    }));
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi90cmFuc2Zvcm0tcmVxdWVzdHMuanMiXSwibmFtZXMiOlsiVHJhbnNmb3JtUmVxdWVzdFByb2Nlc3NvcnMiLCJyZWNvcmQiLCJyZXF1ZXN0IiwicmVxdWVzdERvYyIsInNlcmlhbGl6ZXIiLCJzZXR0aW5ncyIsImJ1aWxkRmV0Y2hTZXR0aW5ncyIsIm1ldGhvZCIsImpzb24iLCJzb3VyY2UiLCJyZXNwb25zZURvYyIsInVwZGF0ZWRSZWNvcmQiLCJ1cGRhdGVPcHMiLCJyZWNvcmREaWZmcyIsImJ1aWxkVHJhbnNmb3JtIiwiZGF0YSIsInJlbGF0ZWRSZWNvcmQiLCJyZXF1ZXN0cyIsInByZXZSZXF1ZXN0IiwidHJhbnNmb3JtIiwibmV3UmVxdWVzdE5lZWRlZCIsImVxdWFsUmVjb3JkSWRlbnRpdGllcyIsIm9wZXJhdGlvbiIsInJlcGxhY2VSZWNvcmRBdHRyaWJ1dGUiLCJyZXBsYWNlUmVjb3JkSGFzT25lIiwicmVwbGFjZVJlY29yZEhhc01hbnkiLCJjbG9uZVJlY29yZElkZW50aXR5IiwiT3BlcmF0aW9uVG9SZXF1ZXN0TWFwIiwib3B0aW9ucyIsImN1c3RvbVJlcXVlc3RPcHRpb25zIiwib3AiLCJjbG9uZSIsInJlbGF0aW9uc2hpcCIsInJlbGF0ZWRSZWNvcmRzIiwidHlwZSIsImlkIiwiZGVlcFNldCJdLCJtYXBwaW5ncyI6Ijs7Ozs7O1FBbUVPLG9CLEdBQUEsb0I7Ozs7QUFsRVA7O0FBQ0E7O0FBQ08sSUFBTUEsa0VBQTZCO0FBQUEsZUFBQSxVQUFBLE1BQUEsRUFBQSxPQUFBLEVBQ1g7QUFBQSxZQUFBLGFBQUEsT0FBQSxVQUFBOztBQUV2QixZQUFNQyxTQUFTQyxRQUFmLE1BQUE7QUFDQSxZQUFNQyxhQUFhQyxXQUFBQSxpQkFBQUEsQ0FBbkIsTUFBbUJBLENBQW5CO0FBQ0EsWUFBTUMsV0FBV0MseUNBQW1CSixRQUFuQkksT0FBQUEsRUFBb0MsRUFBRUMsUUFBRixNQUFBLEVBQWtCQyxNQUF2RSxVQUFxRCxFQUFwQ0YsQ0FBakI7QUFD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QUFnQixDQUFoQkEsRUFBeURwQixnQkFBZ0JVLCtCQUFoQlYsYUFBZ0JVLENBQWhCVixHQUF6RG9CLElBQUFBO0FBQ0g7QUFDRCxTQUFBLG9CQUFBLENBQUEsTUFBQSxFQUFBLFlBQUEsRUFBQSxjQUFBLEVBQW9FO0FBQ2hFQSx3QkFBQUEsTUFBQUEsRUFBZ0IsQ0FBQSxlQUFBLEVBQUEsWUFBQSxFQUFoQkEsTUFBZ0IsQ0FBaEJBLEVBQXlELGVBQUEsR0FBQSxDQUFtQixVQUFBLENBQUEsRUFBQTtBQUFBLGVBQUtWLCtCQUFMLENBQUtBLENBQUw7QUFBNUVVLEtBQXlELENBQXpEQTtBQUNIIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY2xvbmVSZWNvcmRJZGVudGl0eSwgZXF1YWxSZWNvcmRJZGVudGl0aWVzLCByZWNvcmREaWZmcywgYnVpbGRUcmFuc2Zvcm0gfSBmcm9tICdAb3JiaXQvZGF0YSc7XG5pbXBvcnQgeyBjbG9uZSwgZGVlcFNldCB9IGZyb20gJ0BvcmJpdC91dGlscyc7XG5pbXBvcnQgeyBidWlsZEZldGNoU2V0dGluZ3MsIGN1c3RvbVJlcXVlc3RPcHRpb25zIH0gZnJvbSAnLi9yZXF1ZXN0LXNldHRpbmdzJztcbmV4cG9ydCBjb25zdCBUcmFuc2Zvcm1SZXF1ZXN0UHJvY2Vzc29ycyA9IHtcbiAgICBhZGRSZWNvcmQoc291cmNlLCByZXF1ZXN0KSB7XG4gICAgICAgIGNvbnN0IHsgc2VyaWFsaXplciB9ID0gc291cmNlO1xuICAgICAgICBjb25zdCByZWNvcmQgPSByZXF1ZXN0LnJlY29yZDtcbiAgICAgICAgY29uc3QgcmVxdWVzdERvYyA9IHNlcmlhbGl6ZXIuc2VyaWFsaXplRG9jdW1lbnQocmVjb3JkKTtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBidWlsZEZldGNoU2V0dGluZ3MocmVxdWVzdC5vcHRpb25zLCB7IG1ldGhvZDogJ1BPU1QnLCBqc29uOiByZXF1ZXN0RG9jIH0pO1xuICAgICAgICByZXR1cm4gc291cmNlLmZldGNoKHNvdXJjZS5yZXNvdXJjZVVSTChyZWNvcmQudHlwZSksIHNldHRpbmdzKS50aGVuKHJhdyA9PiB7XG4gICAgICAgICAgICBsZXQgcmVzcG9uc2VEb2MgPSBzZXJpYWxpemVyLmRlc2VyaWFsaXplRG9jdW1lbnQocmF3KTtcbiAgICAgICAgICAgIGxldCB1cGRhdGVkUmVjb3JkID0gcmVzcG9uc2VEb2MuZGF0YTtcbiAgICAgICAgICAgIGxldCB1cGRhdGVPcHMgPSByZWNvcmREaWZmcyhyZWNvcmQsIHVwZGF0ZWRSZWNvcmQpO1xuICAgICAgICAgICAgaWYgKHVwZGF0ZU9wcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtidWlsZFRyYW5zZm9ybSh1cGRhdGVPcHMpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICByZW1vdmVSZWNvcmQoc291cmNlLCByZXF1ZXN0KSB7XG4gICAgICAgIGNvbnN0IHsgdHlwZSwgaWQgfSA9IHJlcXVlc3QucmVjb3JkO1xuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGJ1aWxkRmV0Y2hTZXR0aW5ncyhyZXF1ZXN0Lm9wdGlvbnMsIHsgbWV0aG9kOiAnREVMRVRFJyB9KTtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5mZXRjaChzb3VyY2UucmVzb3VyY2VVUkwodHlwZSwgaWQpLCBzZXR0aW5ncykudGhlbigoKSA9PiBbXSk7XG4gICAgfSxcbiAgICByZXBsYWNlUmVjb3JkKHNvdXJjZSwgcmVxdWVzdCkge1xuICAgICAgICBjb25zdCByZWNvcmQgPSByZXF1ZXN0LnJlY29yZDtcbiAgICAgICAgY29uc3QgeyB0eXBlLCBpZCB9ID0gcmVjb3JkO1xuICAgICAgICBjb25zdCByZXF1ZXN0RG9jID0gc291cmNlLnNlcmlhbGl6ZXIuc2VyaWFsaXplRG9jdW1lbnQocmVjb3JkKTtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBidWlsZEZldGNoU2V0dGluZ3MocmVxdWVzdC5vcHRpb25zLCB7IG1ldGhvZDogJ1BBVENIJywganNvbjogcmVxdWVzdERvYyB9KTtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5mZXRjaChzb3VyY2UucmVzb3VyY2VVUkwodHlwZSwgaWQpLCBzZXR0aW5ncykudGhlbigoKSA9PiBbXSk7XG4gICAgfSxcbiAgICBhZGRUb1JlbGF0ZWRSZWNvcmRzKHNvdXJjZSwgcmVxdWVzdCkge1xuICAgICAgICBjb25zdCB7IHR5cGUsIGlkIH0gPSByZXF1ZXN0LnJlY29yZDtcbiAgICAgICAgY29uc3QgeyByZWxhdGlvbnNoaXAgfSA9IHJlcXVlc3Q7XG4gICAgICAgIGNvbnN0IGpzb24gPSB7XG4gICAgICAgICAgICBkYXRhOiByZXF1ZXN0LnJlbGF0ZWRSZWNvcmRzLm1hcChyID0+IHNvdXJjZS5zZXJpYWxpemVyLnJlc291cmNlSWRlbnRpdHkocikpXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gYnVpbGRGZXRjaFNldHRpbmdzKHJlcXVlc3Qub3B0aW9ucywgeyBtZXRob2Q6ICdQT1NUJywganNvbiB9KTtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5mZXRjaChzb3VyY2UucmVzb3VyY2VSZWxhdGlvbnNoaXBVUkwodHlwZSwgaWQsIHJlbGF0aW9uc2hpcCksIHNldHRpbmdzKS50aGVuKCgpID0+IFtdKTtcbiAgICB9LFxuICAgIHJlbW92ZUZyb21SZWxhdGVkUmVjb3Jkcyhzb3VyY2UsIHJlcXVlc3QpIHtcbiAgICAgICAgY29uc3QgeyB0eXBlLCBpZCB9ID0gcmVxdWVzdC5yZWNvcmQ7XG4gICAgICAgIGNvbnN0IHsgcmVsYXRpb25zaGlwIH0gPSByZXF1ZXN0O1xuICAgICAgICBjb25zdCBqc29uID0ge1xuICAgICAgICAgICAgZGF0YTogcmVxdWVzdC5yZWxhdGVkUmVjb3Jkcy5tYXAociA9PiBzb3VyY2Uuc2VyaWFsaXplci5yZXNvdXJjZUlkZW50aXR5KHIpKVxuICAgICAgICB9O1xuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGJ1aWxkRmV0Y2hTZXR0aW5ncyhyZXF1ZXN0Lm9wdGlvbnMsIHsgbWV0aG9kOiAnREVMRVRFJywganNvbiB9KTtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5mZXRjaChzb3VyY2UucmVzb3VyY2VSZWxhdGlvbnNoaXBVUkwodHlwZSwgaWQsIHJlbGF0aW9uc2hpcCksIHNldHRpbmdzKS50aGVuKCgpID0+IFtdKTtcbiAgICB9LFxuICAgIHJlcGxhY2VSZWxhdGVkUmVjb3JkKHNvdXJjZSwgcmVxdWVzdCkge1xuICAgICAgICBjb25zdCB7IHR5cGUsIGlkIH0gPSByZXF1ZXN0LnJlY29yZDtcbiAgICAgICAgY29uc3QgeyByZWxhdGlvbnNoaXAsIHJlbGF0ZWRSZWNvcmQgfSA9IHJlcXVlc3Q7XG4gICAgICAgIGNvbnN0IGpzb24gPSB7XG4gICAgICAgICAgICBkYXRhOiByZWxhdGVkUmVjb3JkID8gc291cmNlLnNlcmlhbGl6ZXIucmVzb3VyY2VJZGVudGl0eShyZWxhdGVkUmVjb3JkKSA6IG51bGxcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBidWlsZEZldGNoU2V0dGluZ3MocmVxdWVzdC5vcHRpb25zLCB7IG1ldGhvZDogJ1BBVENIJywganNvbiB9KTtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5mZXRjaChzb3VyY2UucmVzb3VyY2VSZWxhdGlvbnNoaXBVUkwodHlwZSwgaWQsIHJlbGF0aW9uc2hpcCksIHNldHRpbmdzKS50aGVuKCgpID0+IFtdKTtcbiAgICB9LFxuICAgIHJlcGxhY2VSZWxhdGVkUmVjb3Jkcyhzb3VyY2UsIHJlcXVlc3QpIHtcbiAgICAgICAgY29uc3QgeyB0eXBlLCBpZCB9ID0gcmVxdWVzdC5yZWNvcmQ7XG4gICAgICAgIGNvbnN0IHsgcmVsYXRpb25zaGlwLCByZWxhdGVkUmVjb3JkcyB9ID0gcmVxdWVzdDtcbiAgICAgICAgY29uc3QganNvbiA9IHtcbiAgICAgICAgICAgIGRhdGE6IHJlbGF0ZWRSZWNvcmRzLm1hcChyID0+IHNvdXJjZS5zZXJpYWxpemVyLnJlc291cmNlSWRlbnRpdHkocikpXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gYnVpbGRGZXRjaFNldHRpbmdzKHJlcXVlc3Qub3B0aW9ucywgeyBtZXRob2Q6ICdQQVRDSCcsIGpzb24gfSk7XG4gICAgICAgIHJldHVybiBzb3VyY2UuZmV0Y2goc291cmNlLnJlc291cmNlUmVsYXRpb25zaGlwVVJMKHR5cGUsIGlkLCByZWxhdGlvbnNoaXApLCBzZXR0aW5ncykudGhlbigoKSA9PiBbXSk7XG4gICAgfVxufTtcbmV4cG9ydCBmdW5jdGlvbiBnZXRUcmFuc2Zvcm1SZXF1ZXN0cyhzb3VyY2UsIHRyYW5zZm9ybSkge1xuICAgIGNvbnN0IHJlcXVlc3RzID0gW107XG4gICAgbGV0IHByZXZSZXF1ZXN0O1xuICAgIHRyYW5zZm9ybS5vcGVyYXRpb25zLmZvckVhY2gob3BlcmF0aW9uID0+IHtcbiAgICAgICAgbGV0IHJlcXVlc3Q7XG4gICAgICAgIGxldCBuZXdSZXF1ZXN0TmVlZGVkID0gdHJ1ZTtcbiAgICAgICAgaWYgKHByZXZSZXF1ZXN0ICYmIGVxdWFsUmVjb3JkSWRlbnRpdGllcyhwcmV2UmVxdWVzdC5yZWNvcmQsIG9wZXJhdGlvbi5yZWNvcmQpKSB7XG4gICAgICAgICAgICBpZiAob3BlcmF0aW9uLm9wID09PSAncmVtb3ZlUmVjb3JkJykge1xuICAgICAgICAgICAgICAgIG5ld1JlcXVlc3ROZWVkZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBpZiAocHJldlJlcXVlc3Qub3AgIT09ICdyZW1vdmVSZWNvcmQnKSB7XG4gICAgICAgICAgICAgICAgICAgIHByZXZSZXF1ZXN0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgcmVxdWVzdHMucG9wKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChwcmV2UmVxdWVzdC5vcCA9PT0gJ2FkZFJlY29yZCcgfHwgcHJldlJlcXVlc3Qub3AgPT09ICdyZXBsYWNlUmVjb3JkJykge1xuICAgICAgICAgICAgICAgIGlmIChvcGVyYXRpb24ub3AgPT09ICdyZXBsYWNlQXR0cmlidXRlJykge1xuICAgICAgICAgICAgICAgICAgICBuZXdSZXF1ZXN0TmVlZGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHJlcGxhY2VSZWNvcmRBdHRyaWJ1dGUocHJldlJlcXVlc3QucmVjb3JkLCBvcGVyYXRpb24uYXR0cmlidXRlLCBvcGVyYXRpb24udmFsdWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAob3BlcmF0aW9uLm9wID09PSAncmVwbGFjZVJlbGF0ZWRSZWNvcmQnKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld1JlcXVlc3ROZWVkZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgcmVwbGFjZVJlY29yZEhhc09uZShwcmV2UmVxdWVzdC5yZWNvcmQsIG9wZXJhdGlvbi5yZWxhdGlvbnNoaXAsIG9wZXJhdGlvbi5yZWxhdGVkUmVjb3JkKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG9wZXJhdGlvbi5vcCA9PT0gJ3JlcGxhY2VSZWxhdGVkUmVjb3JkcycpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3UmVxdWVzdE5lZWRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICByZXBsYWNlUmVjb3JkSGFzTWFueShwcmV2UmVxdWVzdC5yZWNvcmQsIG9wZXJhdGlvbi5yZWxhdGlvbnNoaXAsIG9wZXJhdGlvbi5yZWxhdGVkUmVjb3Jkcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChwcmV2UmVxdWVzdC5vcCA9PT0gJ2FkZFRvUmVsYXRlZFJlY29yZHMnICYmIG9wZXJhdGlvbi5vcCA9PT0gJ2FkZFRvUmVsYXRlZFJlY29yZHMnICYmIHByZXZSZXF1ZXN0LnJlbGF0aW9uc2hpcCA9PT0gb3BlcmF0aW9uLnJlbGF0aW9uc2hpcCkge1xuICAgICAgICAgICAgICAgIG5ld1JlcXVlc3ROZWVkZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBwcmV2UmVxdWVzdC5yZWxhdGVkUmVjb3Jkcy5wdXNoKGNsb25lUmVjb3JkSWRlbnRpdHkob3BlcmF0aW9uLnJlbGF0ZWRSZWNvcmQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAobmV3UmVxdWVzdE5lZWRlZCkge1xuICAgICAgICAgICAgcmVxdWVzdCA9IE9wZXJhdGlvblRvUmVxdWVzdE1hcFtvcGVyYXRpb24ub3BdKG9wZXJhdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlcXVlc3QpIHtcbiAgICAgICAgICAgIGxldCBvcHRpb25zID0gY3VzdG9tUmVxdWVzdE9wdGlvbnMoc291cmNlLCB0cmFuc2Zvcm0pO1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICByZXF1ZXN0Lm9wdGlvbnMgPSBvcHRpb25zO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVxdWVzdHMucHVzaChyZXF1ZXN0KTtcbiAgICAgICAgICAgIHByZXZSZXF1ZXN0ID0gcmVxdWVzdDtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXF1ZXN0cztcbn1cbmNvbnN0IE9wZXJhdGlvblRvUmVxdWVzdE1hcCA9IHtcbiAgICBhZGRSZWNvcmQob3BlcmF0aW9uKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcDogJ2FkZFJlY29yZCcsXG4gICAgICAgICAgICByZWNvcmQ6IGNsb25lKG9wZXJhdGlvbi5yZWNvcmQpXG4gICAgICAgIH07XG4gICAgfSxcbiAgICByZW1vdmVSZWNvcmQob3BlcmF0aW9uKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcDogJ3JlbW92ZVJlY29yZCcsXG4gICAgICAgICAgICByZWNvcmQ6IGNsb25lUmVjb3JkSWRlbnRpdHkob3BlcmF0aW9uLnJlY29yZClcbiAgICAgICAgfTtcbiAgICB9LFxuICAgIHJlcGxhY2VBdHRyaWJ1dGUob3BlcmF0aW9uKSB7XG4gICAgICAgIGNvbnN0IHJlY29yZCA9IGNsb25lUmVjb3JkSWRlbnRpdHkob3BlcmF0aW9uLnJlY29yZCk7XG4gICAgICAgIHJlcGxhY2VSZWNvcmRBdHRyaWJ1dGUocmVjb3JkLCBvcGVyYXRpb24uYXR0cmlidXRlLCBvcGVyYXRpb24udmFsdWUpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3A6ICdyZXBsYWNlUmVjb3JkJyxcbiAgICAgICAgICAgIHJlY29yZFxuICAgICAgICB9O1xuICAgIH0sXG4gICAgcmVwbGFjZVJlY29yZChvcGVyYXRpb24pIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9wOiAncmVwbGFjZVJlY29yZCcsXG4gICAgICAgICAgICByZWNvcmQ6IGNsb25lKG9wZXJhdGlvbi5yZWNvcmQpXG4gICAgICAgIH07XG4gICAgfSxcbiAgICBhZGRUb1JlbGF0ZWRSZWNvcmRzKG9wZXJhdGlvbikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3A6ICdhZGRUb1JlbGF0ZWRSZWNvcmRzJyxcbiAgICAgICAgICAgIHJlY29yZDogY2xvbmVSZWNvcmRJZGVudGl0eShvcGVyYXRpb24ucmVjb3JkKSxcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcDogb3BlcmF0aW9uLnJlbGF0aW9uc2hpcCxcbiAgICAgICAgICAgIHJlbGF0ZWRSZWNvcmRzOiBbY2xvbmVSZWNvcmRJZGVudGl0eShvcGVyYXRpb24ucmVsYXRlZFJlY29yZCldXG4gICAgICAgIH07XG4gICAgfSxcbiAgICByZW1vdmVGcm9tUmVsYXRlZFJlY29yZHMob3BlcmF0aW9uKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcDogJ3JlbW92ZUZyb21SZWxhdGVkUmVjb3JkcycsXG4gICAgICAgICAgICByZWNvcmQ6IGNsb25lUmVjb3JkSWRlbnRpdHkob3BlcmF0aW9uLnJlY29yZCksXG4gICAgICAgICAgICByZWxhdGlvbnNoaXA6IG9wZXJhdGlvbi5yZWxhdGlvbnNoaXAsXG4gICAgICAgICAgICByZWxhdGVkUmVjb3JkczogW2Nsb25lUmVjb3JkSWRlbnRpdHkob3BlcmF0aW9uLnJlbGF0ZWRSZWNvcmQpXVxuICAgICAgICB9O1xuICAgIH0sXG4gICAgcmVwbGFjZVJlbGF0ZWRSZWNvcmQob3BlcmF0aW9uKSB7XG4gICAgICAgIGNvbnN0IHJlY29yZCA9IHtcbiAgICAgICAgICAgIHR5cGU6IG9wZXJhdGlvbi5yZWNvcmQudHlwZSxcbiAgICAgICAgICAgIGlkOiBvcGVyYXRpb24ucmVjb3JkLmlkXG4gICAgICAgIH07XG4gICAgICAgIGRlZXBTZXQocmVjb3JkLCBbJ3JlbGF0aW9uc2hpcHMnLCBvcGVyYXRpb24ucmVsYXRpb25zaGlwLCAnZGF0YSddLCBvcGVyYXRpb24ucmVsYXRlZFJlY29yZCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcDogJ3JlcGxhY2VSZWNvcmQnLFxuICAgICAgICAgICAgcmVjb3JkXG4gICAgICAgIH07XG4gICAgfSxcbiAgICByZXBsYWNlUmVsYXRlZFJlY29yZHMob3BlcmF0aW9uKSB7XG4gICAgICAgIGNvbnN0IHJlY29yZCA9IGNsb25lUmVjb3JkSWRlbnRpdHkob3BlcmF0aW9uLnJlY29yZCk7XG4gICAgICAgIGRlZXBTZXQocmVjb3JkLCBbJ3JlbGF0aW9uc2hpcHMnLCBvcGVyYXRpb24ucmVsYXRpb25zaGlwLCAnZGF0YSddLCBvcGVyYXRpb24ucmVsYXRlZFJlY29yZHMpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3A6ICdyZXBsYWNlUmVjb3JkJyxcbiAgICAgICAgICAgIHJlY29yZFxuICAgICAgICB9O1xuICAgIH1cbn07XG5mdW5jdGlvbiByZXBsYWNlUmVjb3JkQXR0cmlidXRlKHJlY29yZCwgYXR0cmlidXRlLCB2YWx1ZSkge1xuICAgIGRlZXBTZXQocmVjb3JkLCBbJ2F0dHJpYnV0ZXMnLCBhdHRyaWJ1dGVdLCB2YWx1ZSk7XG59XG5mdW5jdGlvbiByZXBsYWNlUmVjb3JkSGFzT25lKHJlY29yZCwgcmVsYXRpb25zaGlwLCByZWxhdGVkUmVjb3JkKSB7XG4gICAgZGVlcFNldChyZWNvcmQsIFsncmVsYXRpb25zaGlwcycsIHJlbGF0aW9uc2hpcCwgJ2RhdGEnXSwgcmVsYXRlZFJlY29yZCA/IGNsb25lUmVjb3JkSWRlbnRpdHkocmVsYXRlZFJlY29yZCkgOiBudWxsKTtcbn1cbmZ1bmN0aW9uIHJlcGxhY2VSZWNvcmRIYXNNYW55KHJlY29yZCwgcmVsYXRpb25zaGlwLCByZWxhdGVkUmVjb3Jkcykge1xuICAgIGRlZXBTZXQocmVjb3JkLCBbJ3JlbGF0aW9uc2hpcHMnLCByZWxhdGlvbnNoaXAsICdkYXRhJ10sIHJlbGF0ZWRSZWNvcmRzLm1hcChyID0+IGNsb25lUmVjb3JkSWRlbnRpdHkocikpKTtcbn0iXX0=