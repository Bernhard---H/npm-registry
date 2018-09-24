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
            var responseDoc = serializer.deserializeDocument(raw, record);
            var updatedRecord = responseDoc.data;
            var transforms = [];
            var updateOps = (0, _data.recordDiffs)(record, updatedRecord);
            if (updateOps.length > 0) {
                transforms.push((0, _data.buildTransform)(updateOps));
            }
            if (responseDoc.included && responseDoc.included.length > 0) {
                var includedOps = responseDoc.included.map(function (record) {
                    return { op: 'replaceRecord', record: record };
                });
                transforms.push((0, _data.buildTransform)(includedOps));
            }
            return transforms;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi90cmFuc2Zvcm0tcmVxdWVzdHMuanMiXSwibmFtZXMiOlsiVHJhbnNmb3JtUmVxdWVzdFByb2Nlc3NvcnMiLCJyZWNvcmQiLCJyZXF1ZXN0IiwicmVxdWVzdERvYyIsInNlcmlhbGl6ZXIiLCJzZXR0aW5ncyIsImJ1aWxkRmV0Y2hTZXR0aW5ncyIsIm1ldGhvZCIsImpzb24iLCJzb3VyY2UiLCJyZXNwb25zZURvYyIsInVwZGF0ZWRSZWNvcmQiLCJ0cmFuc2Zvcm1zIiwidXBkYXRlT3BzIiwicmVjb3JkRGlmZnMiLCJidWlsZFRyYW5zZm9ybSIsImluY2x1ZGVkT3BzIiwib3AiLCJkYXRhIiwicmVsYXRlZFJlY29yZCIsInJlcXVlc3RzIiwicHJldlJlcXVlc3QiLCJ0cmFuc2Zvcm0iLCJuZXdSZXF1ZXN0TmVlZGVkIiwiZXF1YWxSZWNvcmRJZGVudGl0aWVzIiwib3BlcmF0aW9uIiwicmVwbGFjZVJlY29yZEF0dHJpYnV0ZSIsInJlcGxhY2VSZWNvcmRIYXNPbmUiLCJyZXBsYWNlUmVjb3JkSGFzTWFueSIsImNsb25lUmVjb3JkSWRlbnRpdHkiLCJPcGVyYXRpb25Ub1JlcXVlc3RNYXAiLCJvcHRpb25zIiwiY3VzdG9tUmVxdWVzdE9wdGlvbnMiLCJjbG9uZSIsInJlbGF0aW9uc2hpcCIsInJlbGF0ZWRSZWNvcmRzIiwidHlwZSIsImlkIiwiZGVlcFNldCJdLCJtYXBwaW5ncyI6Ijs7Ozs7O1FBMkVPLG9CLEdBQUEsb0I7Ozs7QUExRVA7O0FBQ0E7O0FBQ08sSUFBTUEsa0VBQTZCO0FBQUEsZUFBQSxVQUFBLE1BQUEsRUFBQSxPQUFBLEVBQ1g7QUFBQSxZQUFBLGFBQUEsT0FBQSxVQUFBOztBQUV2QixZQUFNQyxTQUFTQyxRQUFmLE1BQUE7QUFDQSxZQUFNQyxhQUFhQyxXQUFBQSxpQkFBQUEsQ0FBbkIsTUFBbUJBLENBQW5CO0FBQ0EsWUFBTUMsV0FBV0MseUNBQW1CSixRQUFuQkksT0FBQUEsRUFBb0MsRUFBRUMsUUFBRixNQUFBLEVBQWtCQyxN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QUEsRUFBaEJhLE1BQWdCLENBQWhCQSxFQUFtRWIsVUFBbkVhLGNBQUFBO0FBQ0EsZUFBTztBQUNIckIsZ0JBREcsZUFBQTtBQUVIaEIsb0JBQUFBO0FBRkcsU0FBUDtBQUlIO0FBN0R5QixDQUE5QjtBQStEQSxTQUFBLHNCQUFBLENBQUEsTUFBQSxFQUFBLFNBQUEsRUFBQSxLQUFBLEVBQTBEO0FBQ3REcUMsd0JBQUFBLE1BQUFBLEVBQWdCLENBQUEsWUFBQSxFQUFoQkEsU0FBZ0IsQ0FBaEJBLEVBQUFBLEtBQUFBO0FBQ0g7QUFDRCxTQUFBLG1CQUFBLENBQUEsTUFBQSxFQUFBLFlBQUEsRUFBQSxhQUFBLEVBQWtFO0FBQzlEQSx3QkFBQUEsTUFBQUEsRUFBZ0IsQ0FBQSxlQUFBLEVBQUEsWUFBQSxFQUFoQkEsTUFBZ0IsQ0FBaEJBLEVBQXlEbkIsZ0JBQWdCVSwrQkFBaEJWLGFBQWdCVSxDQUFoQlYsR0FBekRtQixJQUFBQTtBQUNIO0FBQ0QsU0FBQSxvQkFBQSxDQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsY0FBQSxFQUFvRTtBQUNoRUEsd0JBQUFBLE1BQUFBLEVBQWdCLENBQUEsZUFBQSxFQUFBLFlBQUEsRUFBaEJBLE1BQWdCLENBQWhCQSxFQUF5RCxlQUFBLEdBQUEsQ0FBbUIsVUFBQSxDQUFBLEVBQUE7QUFBQSxlQUFLVCwrQkFBTCxDQUFLQSxDQUFMO0FBQTVFUyxLQUF5RCxDQUF6REE7QUFDSCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNsb25lUmVjb3JkSWRlbnRpdHksIGVxdWFsUmVjb3JkSWRlbnRpdGllcywgcmVjb3JkRGlmZnMsIGJ1aWxkVHJhbnNmb3JtIH0gZnJvbSAnQG9yYml0L2RhdGEnO1xuaW1wb3J0IHsgY2xvbmUsIGRlZXBTZXQgfSBmcm9tICdAb3JiaXQvdXRpbHMnO1xuaW1wb3J0IHsgYnVpbGRGZXRjaFNldHRpbmdzLCBjdXN0b21SZXF1ZXN0T3B0aW9ucyB9IGZyb20gJy4vcmVxdWVzdC1zZXR0aW5ncyc7XG5leHBvcnQgY29uc3QgVHJhbnNmb3JtUmVxdWVzdFByb2Nlc3NvcnMgPSB7XG4gICAgYWRkUmVjb3JkKHNvdXJjZSwgcmVxdWVzdCkge1xuICAgICAgICBjb25zdCB7IHNlcmlhbGl6ZXIgfSA9IHNvdXJjZTtcbiAgICAgICAgY29uc3QgcmVjb3JkID0gcmVxdWVzdC5yZWNvcmQ7XG4gICAgICAgIGNvbnN0IHJlcXVlc3REb2MgPSBzZXJpYWxpemVyLnNlcmlhbGl6ZURvY3VtZW50KHJlY29yZCk7XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gYnVpbGRGZXRjaFNldHRpbmdzKHJlcXVlc3Qub3B0aW9ucywgeyBtZXRob2Q6ICdQT1NUJywganNvbjogcmVxdWVzdERvYyB9KTtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5mZXRjaChzb3VyY2UucmVzb3VyY2VVUkwocmVjb3JkLnR5cGUpLCBzZXR0aW5ncykudGhlbihyYXcgPT4ge1xuICAgICAgICAgICAgbGV0IHJlc3BvbnNlRG9jID0gc2VyaWFsaXplci5kZXNlcmlhbGl6ZURvY3VtZW50KHJhdywgcmVjb3JkKTtcbiAgICAgICAgICAgIGxldCB1cGRhdGVkUmVjb3JkID0gcmVzcG9uc2VEb2MuZGF0YTtcbiAgICAgICAgICAgIGxldCB0cmFuc2Zvcm1zID0gW107XG4gICAgICAgICAgICBsZXQgdXBkYXRlT3BzID0gcmVjb3JkRGlmZnMocmVjb3JkLCB1cGRhdGVkUmVjb3JkKTtcbiAgICAgICAgICAgIGlmICh1cGRhdGVPcHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHRyYW5zZm9ybXMucHVzaChidWlsZFRyYW5zZm9ybSh1cGRhdGVPcHMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyZXNwb25zZURvYy5pbmNsdWRlZCAmJiByZXNwb25zZURvYy5pbmNsdWRlZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgbGV0IGluY2x1ZGVkT3BzID0gcmVzcG9uc2VEb2MuaW5jbHVkZWQubWFwKHJlY29yZCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IG9wOiAncmVwbGFjZVJlY29yZCcsIHJlY29yZCB9O1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRyYW5zZm9ybXMucHVzaChidWlsZFRyYW5zZm9ybShpbmNsdWRlZE9wcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRyYW5zZm9ybXM7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgcmVtb3ZlUmVjb3JkKHNvdXJjZSwgcmVxdWVzdCkge1xuICAgICAgICBjb25zdCB7IHR5cGUsIGlkIH0gPSByZXF1ZXN0LnJlY29yZDtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBidWlsZEZldGNoU2V0dGluZ3MocmVxdWVzdC5vcHRpb25zLCB7IG1ldGhvZDogJ0RFTEVURScgfSk7XG4gICAgICAgIHJldHVybiBzb3VyY2UuZmV0Y2goc291cmNlLnJlc291cmNlVVJMKHR5cGUsIGlkKSwgc2V0dGluZ3MpLnRoZW4oKCkgPT4gW10pO1xuICAgIH0sXG4gICAgcmVwbGFjZVJlY29yZChzb3VyY2UsIHJlcXVlc3QpIHtcbiAgICAgICAgY29uc3QgcmVjb3JkID0gcmVxdWVzdC5yZWNvcmQ7XG4gICAgICAgIGNvbnN0IHsgdHlwZSwgaWQgfSA9IHJlY29yZDtcbiAgICAgICAgY29uc3QgcmVxdWVzdERvYyA9IHNvdXJjZS5zZXJpYWxpemVyLnNlcmlhbGl6ZURvY3VtZW50KHJlY29yZCk7XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gYnVpbGRGZXRjaFNldHRpbmdzKHJlcXVlc3Qub3B0aW9ucywgeyBtZXRob2Q6ICdQQVRDSCcsIGpzb246IHJlcXVlc3REb2MgfSk7XG4gICAgICAgIHJldHVybiBzb3VyY2UuZmV0Y2goc291cmNlLnJlc291cmNlVVJMKHR5cGUsIGlkKSwgc2V0dGluZ3MpLnRoZW4oKCkgPT4gW10pO1xuICAgIH0sXG4gICAgYWRkVG9SZWxhdGVkUmVjb3Jkcyhzb3VyY2UsIHJlcXVlc3QpIHtcbiAgICAgICAgY29uc3QgeyB0eXBlLCBpZCB9ID0gcmVxdWVzdC5yZWNvcmQ7XG4gICAgICAgIGNvbnN0IHsgcmVsYXRpb25zaGlwIH0gPSByZXF1ZXN0O1xuICAgICAgICBjb25zdCBqc29uID0ge1xuICAgICAgICAgICAgZGF0YTogcmVxdWVzdC5yZWxhdGVkUmVjb3Jkcy5tYXAociA9PiBzb3VyY2Uuc2VyaWFsaXplci5yZXNvdXJjZUlkZW50aXR5KHIpKVxuICAgICAgICB9O1xuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGJ1aWxkRmV0Y2hTZXR0aW5ncyhyZXF1ZXN0Lm9wdGlvbnMsIHsgbWV0aG9kOiAnUE9TVCcsIGpzb24gfSk7XG4gICAgICAgIHJldHVybiBzb3VyY2UuZmV0Y2goc291cmNlLnJlc291cmNlUmVsYXRpb25zaGlwVVJMKHR5cGUsIGlkLCByZWxhdGlvbnNoaXApLCBzZXR0aW5ncykudGhlbigoKSA9PiBbXSk7XG4gICAgfSxcbiAgICByZW1vdmVGcm9tUmVsYXRlZFJlY29yZHMoc291cmNlLCByZXF1ZXN0KSB7XG4gICAgICAgIGNvbnN0IHsgdHlwZSwgaWQgfSA9IHJlcXVlc3QucmVjb3JkO1xuICAgICAgICBjb25zdCB7IHJlbGF0aW9uc2hpcCB9ID0gcmVxdWVzdDtcbiAgICAgICAgY29uc3QganNvbiA9IHtcbiAgICAgICAgICAgIGRhdGE6IHJlcXVlc3QucmVsYXRlZFJlY29yZHMubWFwKHIgPT4gc291cmNlLnNlcmlhbGl6ZXIucmVzb3VyY2VJZGVudGl0eShyKSlcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBidWlsZEZldGNoU2V0dGluZ3MocmVxdWVzdC5vcHRpb25zLCB7IG1ldGhvZDogJ0RFTEVURScsIGpzb24gfSk7XG4gICAgICAgIHJldHVybiBzb3VyY2UuZmV0Y2goc291cmNlLnJlc291cmNlUmVsYXRpb25zaGlwVVJMKHR5cGUsIGlkLCByZWxhdGlvbnNoaXApLCBzZXR0aW5ncykudGhlbigoKSA9PiBbXSk7XG4gICAgfSxcbiAgICByZXBsYWNlUmVsYXRlZFJlY29yZChzb3VyY2UsIHJlcXVlc3QpIHtcbiAgICAgICAgY29uc3QgeyB0eXBlLCBpZCB9ID0gcmVxdWVzdC5yZWNvcmQ7XG4gICAgICAgIGNvbnN0IHsgcmVsYXRpb25zaGlwLCByZWxhdGVkUmVjb3JkIH0gPSByZXF1ZXN0O1xuICAgICAgICBjb25zdCBqc29uID0ge1xuICAgICAgICAgICAgZGF0YTogcmVsYXRlZFJlY29yZCA/IHNvdXJjZS5zZXJpYWxpemVyLnJlc291cmNlSWRlbnRpdHkocmVsYXRlZFJlY29yZCkgOiBudWxsXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gYnVpbGRGZXRjaFNldHRpbmdzKHJlcXVlc3Qub3B0aW9ucywgeyBtZXRob2Q6ICdQQVRDSCcsIGpzb24gfSk7XG4gICAgICAgIHJldHVybiBzb3VyY2UuZmV0Y2goc291cmNlLnJlc291cmNlUmVsYXRpb25zaGlwVVJMKHR5cGUsIGlkLCByZWxhdGlvbnNoaXApLCBzZXR0aW5ncykudGhlbigoKSA9PiBbXSk7XG4gICAgfSxcbiAgICByZXBsYWNlUmVsYXRlZFJlY29yZHMoc291cmNlLCByZXF1ZXN0KSB7XG4gICAgICAgIGNvbnN0IHsgdHlwZSwgaWQgfSA9IHJlcXVlc3QucmVjb3JkO1xuICAgICAgICBjb25zdCB7IHJlbGF0aW9uc2hpcCwgcmVsYXRlZFJlY29yZHMgfSA9IHJlcXVlc3Q7XG4gICAgICAgIGNvbnN0IGpzb24gPSB7XG4gICAgICAgICAgICBkYXRhOiByZWxhdGVkUmVjb3Jkcy5tYXAociA9PiBzb3VyY2Uuc2VyaWFsaXplci5yZXNvdXJjZUlkZW50aXR5KHIpKVxuICAgICAgICB9O1xuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGJ1aWxkRmV0Y2hTZXR0aW5ncyhyZXF1ZXN0Lm9wdGlvbnMsIHsgbWV0aG9kOiAnUEFUQ0gnLCBqc29uIH0pO1xuICAgICAgICByZXR1cm4gc291cmNlLmZldGNoKHNvdXJjZS5yZXNvdXJjZVJlbGF0aW9uc2hpcFVSTCh0eXBlLCBpZCwgcmVsYXRpb25zaGlwKSwgc2V0dGluZ3MpLnRoZW4oKCkgPT4gW10pO1xuICAgIH1cbn07XG5leHBvcnQgZnVuY3Rpb24gZ2V0VHJhbnNmb3JtUmVxdWVzdHMoc291cmNlLCB0cmFuc2Zvcm0pIHtcbiAgICBjb25zdCByZXF1ZXN0cyA9IFtdO1xuICAgIGxldCBwcmV2UmVxdWVzdDtcbiAgICB0cmFuc2Zvcm0ub3BlcmF0aW9ucy5mb3JFYWNoKG9wZXJhdGlvbiA9PiB7XG4gICAgICAgIGxldCByZXF1ZXN0O1xuICAgICAgICBsZXQgbmV3UmVxdWVzdE5lZWRlZCA9IHRydWU7XG4gICAgICAgIGlmIChwcmV2UmVxdWVzdCAmJiBlcXVhbFJlY29yZElkZW50aXRpZXMocHJldlJlcXVlc3QucmVjb3JkLCBvcGVyYXRpb24ucmVjb3JkKSkge1xuICAgICAgICAgICAgaWYgKG9wZXJhdGlvbi5vcCA9PT0gJ3JlbW92ZVJlY29yZCcpIHtcbiAgICAgICAgICAgICAgICBuZXdSZXF1ZXN0TmVlZGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgaWYgKHByZXZSZXF1ZXN0Lm9wICE9PSAncmVtb3ZlUmVjb3JkJykge1xuICAgICAgICAgICAgICAgICAgICBwcmV2UmVxdWVzdCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIHJlcXVlc3RzLnBvcCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJldlJlcXVlc3Qub3AgPT09ICdhZGRSZWNvcmQnIHx8IHByZXZSZXF1ZXN0Lm9wID09PSAncmVwbGFjZVJlY29yZCcpIHtcbiAgICAgICAgICAgICAgICBpZiAob3BlcmF0aW9uLm9wID09PSAncmVwbGFjZUF0dHJpYnV0ZScpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3UmVxdWVzdE5lZWRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICByZXBsYWNlUmVjb3JkQXR0cmlidXRlKHByZXZSZXF1ZXN0LnJlY29yZCwgb3BlcmF0aW9uLmF0dHJpYnV0ZSwgb3BlcmF0aW9uLnZhbHVlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG9wZXJhdGlvbi5vcCA9PT0gJ3JlcGxhY2VSZWxhdGVkUmVjb3JkJykge1xuICAgICAgICAgICAgICAgICAgICBuZXdSZXF1ZXN0TmVlZGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHJlcGxhY2VSZWNvcmRIYXNPbmUocHJldlJlcXVlc3QucmVjb3JkLCBvcGVyYXRpb24ucmVsYXRpb25zaGlwLCBvcGVyYXRpb24ucmVsYXRlZFJlY29yZCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChvcGVyYXRpb24ub3AgPT09ICdyZXBsYWNlUmVsYXRlZFJlY29yZHMnKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld1JlcXVlc3ROZWVkZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgcmVwbGFjZVJlY29yZEhhc01hbnkocHJldlJlcXVlc3QucmVjb3JkLCBvcGVyYXRpb24ucmVsYXRpb25zaGlwLCBvcGVyYXRpb24ucmVsYXRlZFJlY29yZHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJldlJlcXVlc3Qub3AgPT09ICdhZGRUb1JlbGF0ZWRSZWNvcmRzJyAmJiBvcGVyYXRpb24ub3AgPT09ICdhZGRUb1JlbGF0ZWRSZWNvcmRzJyAmJiBwcmV2UmVxdWVzdC5yZWxhdGlvbnNoaXAgPT09IG9wZXJhdGlvbi5yZWxhdGlvbnNoaXApIHtcbiAgICAgICAgICAgICAgICBuZXdSZXF1ZXN0TmVlZGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgcHJldlJlcXVlc3QucmVsYXRlZFJlY29yZHMucHVzaChjbG9uZVJlY29yZElkZW50aXR5KG9wZXJhdGlvbi5yZWxhdGVkUmVjb3JkKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5ld1JlcXVlc3ROZWVkZWQpIHtcbiAgICAgICAgICAgIHJlcXVlc3QgPSBPcGVyYXRpb25Ub1JlcXVlc3RNYXBbb3BlcmF0aW9uLm9wXShvcGVyYXRpb24pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXF1ZXN0KSB7XG4gICAgICAgICAgICBsZXQgb3B0aW9ucyA9IGN1c3RvbVJlcXVlc3RPcHRpb25zKHNvdXJjZSwgdHJhbnNmb3JtKTtcbiAgICAgICAgICAgIGlmIChvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5vcHRpb25zID0gb3B0aW9ucztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlcXVlc3RzLnB1c2gocmVxdWVzdCk7XG4gICAgICAgICAgICBwcmV2UmVxdWVzdCA9IHJlcXVlc3Q7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVxdWVzdHM7XG59XG5jb25zdCBPcGVyYXRpb25Ub1JlcXVlc3RNYXAgPSB7XG4gICAgYWRkUmVjb3JkKG9wZXJhdGlvbikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3A6ICdhZGRSZWNvcmQnLFxuICAgICAgICAgICAgcmVjb3JkOiBjbG9uZShvcGVyYXRpb24ucmVjb3JkKVxuICAgICAgICB9O1xuICAgIH0sXG4gICAgcmVtb3ZlUmVjb3JkKG9wZXJhdGlvbikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3A6ICdyZW1vdmVSZWNvcmQnLFxuICAgICAgICAgICAgcmVjb3JkOiBjbG9uZVJlY29yZElkZW50aXR5KG9wZXJhdGlvbi5yZWNvcmQpXG4gICAgICAgIH07XG4gICAgfSxcbiAgICByZXBsYWNlQXR0cmlidXRlKG9wZXJhdGlvbikge1xuICAgICAgICBjb25zdCByZWNvcmQgPSBjbG9uZVJlY29yZElkZW50aXR5KG9wZXJhdGlvbi5yZWNvcmQpO1xuICAgICAgICByZXBsYWNlUmVjb3JkQXR0cmlidXRlKHJlY29yZCwgb3BlcmF0aW9uLmF0dHJpYnV0ZSwgb3BlcmF0aW9uLnZhbHVlKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9wOiAncmVwbGFjZVJlY29yZCcsXG4gICAgICAgICAgICByZWNvcmRcbiAgICAgICAgfTtcbiAgICB9LFxuICAgIHJlcGxhY2VSZWNvcmQob3BlcmF0aW9uKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcDogJ3JlcGxhY2VSZWNvcmQnLFxuICAgICAgICAgICAgcmVjb3JkOiBjbG9uZShvcGVyYXRpb24ucmVjb3JkKVxuICAgICAgICB9O1xuICAgIH0sXG4gICAgYWRkVG9SZWxhdGVkUmVjb3JkcyhvcGVyYXRpb24pIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9wOiAnYWRkVG9SZWxhdGVkUmVjb3JkcycsXG4gICAgICAgICAgICByZWNvcmQ6IGNsb25lUmVjb3JkSWRlbnRpdHkob3BlcmF0aW9uLnJlY29yZCksXG4gICAgICAgICAgICByZWxhdGlvbnNoaXA6IG9wZXJhdGlvbi5yZWxhdGlvbnNoaXAsXG4gICAgICAgICAgICByZWxhdGVkUmVjb3JkczogW2Nsb25lUmVjb3JkSWRlbnRpdHkob3BlcmF0aW9uLnJlbGF0ZWRSZWNvcmQpXVxuICAgICAgICB9O1xuICAgIH0sXG4gICAgcmVtb3ZlRnJvbVJlbGF0ZWRSZWNvcmRzKG9wZXJhdGlvbikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3A6ICdyZW1vdmVGcm9tUmVsYXRlZFJlY29yZHMnLFxuICAgICAgICAgICAgcmVjb3JkOiBjbG9uZVJlY29yZElkZW50aXR5KG9wZXJhdGlvbi5yZWNvcmQpLFxuICAgICAgICAgICAgcmVsYXRpb25zaGlwOiBvcGVyYXRpb24ucmVsYXRpb25zaGlwLFxuICAgICAgICAgICAgcmVsYXRlZFJlY29yZHM6IFtjbG9uZVJlY29yZElkZW50aXR5KG9wZXJhdGlvbi5yZWxhdGVkUmVjb3JkKV1cbiAgICAgICAgfTtcbiAgICB9LFxuICAgIHJlcGxhY2VSZWxhdGVkUmVjb3JkKG9wZXJhdGlvbikge1xuICAgICAgICBjb25zdCByZWNvcmQgPSB7XG4gICAgICAgICAgICB0eXBlOiBvcGVyYXRpb24ucmVjb3JkLnR5cGUsXG4gICAgICAgICAgICBpZDogb3BlcmF0aW9uLnJlY29yZC5pZFxuICAgICAgICB9O1xuICAgICAgICBkZWVwU2V0KHJlY29yZCwgWydyZWxhdGlvbnNoaXBzJywgb3BlcmF0aW9uLnJlbGF0aW9uc2hpcCwgJ2RhdGEnXSwgb3BlcmF0aW9uLnJlbGF0ZWRSZWNvcmQpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3A6ICdyZXBsYWNlUmVjb3JkJyxcbiAgICAgICAgICAgIHJlY29yZFxuICAgICAgICB9O1xuICAgIH0sXG4gICAgcmVwbGFjZVJlbGF0ZWRSZWNvcmRzKG9wZXJhdGlvbikge1xuICAgICAgICBjb25zdCByZWNvcmQgPSBjbG9uZVJlY29yZElkZW50aXR5KG9wZXJhdGlvbi5yZWNvcmQpO1xuICAgICAgICBkZWVwU2V0KHJlY29yZCwgWydyZWxhdGlvbnNoaXBzJywgb3BlcmF0aW9uLnJlbGF0aW9uc2hpcCwgJ2RhdGEnXSwgb3BlcmF0aW9uLnJlbGF0ZWRSZWNvcmRzKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9wOiAncmVwbGFjZVJlY29yZCcsXG4gICAgICAgICAgICByZWNvcmRcbiAgICAgICAgfTtcbiAgICB9XG59O1xuZnVuY3Rpb24gcmVwbGFjZVJlY29yZEF0dHJpYnV0ZShyZWNvcmQsIGF0dHJpYnV0ZSwgdmFsdWUpIHtcbiAgICBkZWVwU2V0KHJlY29yZCwgWydhdHRyaWJ1dGVzJywgYXR0cmlidXRlXSwgdmFsdWUpO1xufVxuZnVuY3Rpb24gcmVwbGFjZVJlY29yZEhhc09uZShyZWNvcmQsIHJlbGF0aW9uc2hpcCwgcmVsYXRlZFJlY29yZCkge1xuICAgIGRlZXBTZXQocmVjb3JkLCBbJ3JlbGF0aW9uc2hpcHMnLCByZWxhdGlvbnNoaXAsICdkYXRhJ10sIHJlbGF0ZWRSZWNvcmQgPyBjbG9uZVJlY29yZElkZW50aXR5KHJlbGF0ZWRSZWNvcmQpIDogbnVsbCk7XG59XG5mdW5jdGlvbiByZXBsYWNlUmVjb3JkSGFzTWFueShyZWNvcmQsIHJlbGF0aW9uc2hpcCwgcmVsYXRlZFJlY29yZHMpIHtcbiAgICBkZWVwU2V0KHJlY29yZCwgWydyZWxhdGlvbnNoaXBzJywgcmVsYXRpb25zaGlwLCAnZGF0YSddLCByZWxhdGVkUmVjb3Jkcy5tYXAociA9PiBjbG9uZVJlY29yZElkZW50aXR5KHIpKSk7XG59Il19