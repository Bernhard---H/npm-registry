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
            var responseDoc = serializer.deserializeDocument(raw, record);
            var updatedRecord = responseDoc.data;
            var transforms = [];
            var updateOps = recordDiffs(record, updatedRecord);
            if (updateOps.length > 0) {
                transforms.push(buildTransform(updateOps));
            }
            if (responseDoc.included && responseDoc.included.length > 0) {
                var includedOps = responseDoc.included.map(function (record) {
                    return { op: 'replaceRecord', record: record };
                });
                transforms.push(buildTransform(includedOps));
            }
            return transforms;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi90cmFuc2Zvcm0tcmVxdWVzdHMuanMiXSwibmFtZXMiOlsiY2xvbmVSZWNvcmRJZGVudGl0eSIsImVxdWFsUmVjb3JkSWRlbnRpdGllcyIsInJlY29yZERpZmZzIiwiYnVpbGRUcmFuc2Zvcm0iLCJjbG9uZSIsImRlZXBTZXQiLCJidWlsZEZldGNoU2V0dGluZ3MiLCJjdXN0b21SZXF1ZXN0T3B0aW9ucyIsIlRyYW5zZm9ybVJlcXVlc3RQcm9jZXNzb3JzIiwiYWRkUmVjb3JkIiwic291cmNlIiwicmVxdWVzdCIsInNlcmlhbGl6ZXIiLCJyZWNvcmQiLCJyZXF1ZXN0RG9jIiwic2VyaWFsaXplRG9jdW1lbnQiLCJzZXR0aW5ncyIsIm9wdGlvbnMiLCJtZXRob2QiLCJqc29uIiwiZmV0Y2giLCJyZXNvdXJjZVVSTCIsInR5cGUiLCJ0aGVuIiwicmVzcG9uc2VEb2MiLCJkZXNlcmlhbGl6ZURvY3VtZW50IiwicmF3IiwidXBkYXRlZFJlY29yZCIsImRhdGEiLCJ0cmFuc2Zvcm1zIiwidXBkYXRlT3BzIiwibGVuZ3RoIiwicHVzaCIsImluY2x1ZGVkIiwiaW5jbHVkZWRPcHMiLCJtYXAiLCJvcCIsInJlbW92ZVJlY29yZCIsImlkIiwicmVwbGFjZVJlY29yZCIsImFkZFRvUmVsYXRlZFJlY29yZHMiLCJyZWxhdGlvbnNoaXAiLCJyZWxhdGVkUmVjb3JkcyIsInJlc291cmNlSWRlbnRpdHkiLCJyIiwicmVzb3VyY2VSZWxhdGlvbnNoaXBVUkwiLCJyZW1vdmVGcm9tUmVsYXRlZFJlY29yZHMiLCJyZXBsYWNlUmVsYXRlZFJlY29yZCIsInJlbGF0ZWRSZWNvcmQiLCJyZXBsYWNlUmVsYXRlZFJlY29yZHMiLCJnZXRUcmFuc2Zvcm1SZXF1ZXN0cyIsInRyYW5zZm9ybSIsInJlcXVlc3RzIiwicHJldlJlcXVlc3QiLCJvcGVyYXRpb25zIiwiZm9yRWFjaCIsIm5ld1JlcXVlc3ROZWVkZWQiLCJvcGVyYXRpb24iLCJwb3AiLCJyZXBsYWNlUmVjb3JkQXR0cmlidXRlIiwiYXR0cmlidXRlIiwidmFsdWUiLCJyZXBsYWNlUmVjb3JkSGFzT25lIiwicmVwbGFjZVJlY29yZEhhc01hbnkiLCJPcGVyYXRpb25Ub1JlcXVlc3RNYXAiLCJyZXBsYWNlQXR0cmlidXRlIl0sIm1hcHBpbmdzIjoiQUFBQSxTQUFTQSxtQkFBVCxFQUE4QkMscUJBQTlCLEVBQXFEQyxXQUFyRCxFQUFrRUMsY0FBbEUsUUFBd0YsYUFBeEY7QUFDQSxTQUFTQyxLQUFULEVBQWdCQyxPQUFoQixRQUErQixjQUEvQjtBQUNBLFNBQVNDLGtCQUFULEVBQTZCQyxvQkFBN0IsUUFBeUQsb0JBQXpEO0FBQ0EsT0FBTyxJQUFNQyw2QkFBNkI7QUFDdENDLGFBRHNDLFlBQzVCQyxNQUQ0QixFQUNwQkMsT0FEb0IsRUFDWDtBQUFBLFlBQ2ZDLFVBRGUsR0FDQUYsTUFEQSxDQUNmRSxVQURlOztBQUV2QixZQUFNQyxTQUFTRixRQUFRRSxNQUF2QjtBQUNBLFlBQU1DLGFBQWFGLFdBQVdHLGlCQUFYLENBQTZCRixNQUE3QixDQUFuQjtBQUNBLFlBQU1HLFdBQVdWLG1CQUFtQkssUUFBUU0sT0FBM0IsRUFBb0MsRUFBRUMsUUFBUSxNQUFWLEVBQWtCQyxNQUFNTCxVQUF4QixFQUFwQyxDQUFqQjtBQUNBLGVBQU9KLE9BQU9VLEtBQVAsQ0FBYVYsT0FBT1csV0FBUCxDQUFtQlIsT0FBT1MsSUFBMUIsQ0FBYixFQUE4Q04sUUFBOUMsRUFBd0RPLElBQXhELENBQTZELGVBQU87QUFDdkUsZ0JBQUlDLGNBQWNaLFdBQVdhLG1CQUFYLENBQStCQyxHQUEvQixFQUFvQ2IsTUFBcEMsQ0FBbEI7QUFDQSxnQkFBSWMsZ0JBQWdCSCxZQUFZSSxJQUFoQztBQUNBLGdCQUFJQyxhQUFhLEVBQWpCO0FBQ0EsZ0JBQUlDLFlBQVk1QixZQUFZVyxNQUFaLEVBQW9CYyxhQUFwQixDQUFoQjtBQUNBLGdCQUFJRyxVQUFVQyxNQUFWLEdBQW1CLENBQXZCLEVBQTBCO0FBQ3RCRiwyQkFBV0csSUFBWCxDQUFnQjdCLGVBQWUyQixTQUFm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MEMsTUFBMUMsQ0FBaEIsRUFBbUVnQixVQUFVZixjQUE3RTtBQUNBLGVBQU87QUFDSE4sZ0JBQUksZUFERDtBQUVIdkI7QUFGRyxTQUFQO0FBSUg7QUE3RHlCLENBQTlCO0FBK0RBLFNBQVM4QyxzQkFBVCxDQUFnQzlDLE1BQWhDLEVBQXdDK0MsU0FBeEMsRUFBbURDLEtBQW5ELEVBQTBEO0FBQ3REeEQsWUFBUVEsTUFBUixFQUFnQixDQUFDLFlBQUQsRUFBZStDLFNBQWYsQ0FBaEIsRUFBMkNDLEtBQTNDO0FBQ0g7QUFDRCxTQUFTQyxtQkFBVCxDQUE2QmpELE1BQTdCLEVBQXFDNEIsWUFBckMsRUFBbURPLGFBQW5ELEVBQWtFO0FBQzlEM0MsWUFBUVEsTUFBUixFQUFnQixDQUFDLGVBQUQsRUFBa0I0QixZQUFsQixFQUFnQyxNQUFoQyxDQUFoQixFQUF5RE8sZ0JBQWdCaEQsb0JBQW9CZ0QsYUFBcEIsQ0FBaEIsR0FBcUQsSUFBOUc7QUFDSDtBQUNELFNBQVNlLG9CQUFULENBQThCbEQsTUFBOUIsRUFBc0M0QixZQUF0QyxFQUFvREMsY0FBcEQsRUFBb0U7QUFDaEVyQyxZQUFRUSxNQUFSLEVBQWdCLENBQUMsZUFBRCxFQUFrQjRCLFlBQWxCLEVBQWdDLE1BQWhDLENBQWhCLEVBQXlEQyxlQUFlUCxHQUFmLENBQW1CO0FBQUEsZUFBS25DLG9CQUFvQjRDLENBQXBCLENBQUw7QUFBQSxLQUFuQixDQUF6RDtBQUNIIiwiZmlsZSI6ImxpYi90cmFuc2Zvcm0tcmVxdWVzdHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjbG9uZVJlY29yZElkZW50aXR5LCBlcXVhbFJlY29yZElkZW50aXRpZXMsIHJlY29yZERpZmZzLCBidWlsZFRyYW5zZm9ybSB9IGZyb20gJ0BvcmJpdC9kYXRhJztcbmltcG9ydCB7IGNsb25lLCBkZWVwU2V0IH0gZnJvbSAnQG9yYml0L3V0aWxzJztcbmltcG9ydCB7IGJ1aWxkRmV0Y2hTZXR0aW5ncywgY3VzdG9tUmVxdWVzdE9wdGlvbnMgfSBmcm9tICcuL3JlcXVlc3Qtc2V0dGluZ3MnO1xuZXhwb3J0IGNvbnN0IFRyYW5zZm9ybVJlcXVlc3RQcm9jZXNzb3JzID0ge1xuICAgIGFkZFJlY29yZChzb3VyY2UsIHJlcXVlc3QpIHtcbiAgICAgICAgY29uc3QgeyBzZXJpYWxpemVyIH0gPSBzb3VyY2U7XG4gICAgICAgIGNvbnN0IHJlY29yZCA9IHJlcXVlc3QucmVjb3JkO1xuICAgICAgICBjb25zdCByZXF1ZXN0RG9jID0gc2VyaWFsaXplci5zZXJpYWxpemVEb2N1bWVudChyZWNvcmQpO1xuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGJ1aWxkRmV0Y2hTZXR0aW5ncyhyZXF1ZXN0Lm9wdGlvbnMsIHsgbWV0aG9kOiAnUE9TVCcsIGpzb246IHJlcXVlc3REb2MgfSk7XG4gICAgICAgIHJldHVybiBzb3VyY2UuZmV0Y2goc291cmNlLnJlc291cmNlVVJMKHJlY29yZC50eXBlKSwgc2V0dGluZ3MpLnRoZW4ocmF3ID0+IHtcbiAgICAgICAgICAgIGxldCByZXNwb25zZURvYyA9IHNlcmlhbGl6ZXIuZGVzZXJpYWxpemVEb2N1bWVudChyYXcsIHJlY29yZCk7XG4gICAgICAgICAgICBsZXQgdXBkYXRlZFJlY29yZCA9IHJlc3BvbnNlRG9jLmRhdGE7XG4gICAgICAgICAgICBsZXQgdHJhbnNmb3JtcyA9IFtdO1xuICAgICAgICAgICAgbGV0IHVwZGF0ZU9wcyA9IHJlY29yZERpZmZzKHJlY29yZCwgdXBkYXRlZFJlY29yZCk7XG4gICAgICAgICAgICBpZiAodXBkYXRlT3BzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB0cmFuc2Zvcm1zLnB1c2goYnVpbGRUcmFuc2Zvcm0odXBkYXRlT3BzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmVzcG9uc2VEb2MuaW5jbHVkZWQgJiYgcmVzcG9uc2VEb2MuaW5jbHVkZWQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGxldCBpbmNsdWRlZE9wcyA9IHJlc3BvbnNlRG9jLmluY2x1ZGVkLm1hcChyZWNvcmQgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBvcDogJ3JlcGxhY2VSZWNvcmQnLCByZWNvcmQgfTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB0cmFuc2Zvcm1zLnB1c2goYnVpbGRUcmFuc2Zvcm0oaW5jbHVkZWRPcHMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cmFuc2Zvcm1zO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIHJlbW92ZVJlY29yZChzb3VyY2UsIHJlcXVlc3QpIHtcbiAgICAgICAgY29uc3QgeyB0eXBlLCBpZCB9ID0gcmVxdWVzdC5yZWNvcmQ7XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gYnVpbGRGZXRjaFNldHRpbmdzKHJlcXVlc3Qub3B0aW9ucywgeyBtZXRob2Q6ICdERUxFVEUnIH0pO1xuICAgICAgICByZXR1cm4gc291cmNlLmZldGNoKHNvdXJjZS5yZXNvdXJjZVVSTCh0eXBlLCBpZCksIHNldHRpbmdzKS50aGVuKCgpID0+IFtdKTtcbiAgICB9LFxuICAgIHJlcGxhY2VSZWNvcmQoc291cmNlLCByZXF1ZXN0KSB7XG4gICAgICAgIGNvbnN0IHJlY29yZCA9IHJlcXVlc3QucmVjb3JkO1xuICAgICAgICBjb25zdCB7IHR5cGUsIGlkIH0gPSByZWNvcmQ7XG4gICAgICAgIGNvbnN0IHJlcXVlc3REb2MgPSBzb3VyY2Uuc2VyaWFsaXplci5zZXJpYWxpemVEb2N1bWVudChyZWNvcmQpO1xuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGJ1aWxkRmV0Y2hTZXR0aW5ncyhyZXF1ZXN0Lm9wdGlvbnMsIHsgbWV0aG9kOiAnUEFUQ0gnLCBqc29uOiByZXF1ZXN0RG9jIH0pO1xuICAgICAgICByZXR1cm4gc291cmNlLmZldGNoKHNvdXJjZS5yZXNvdXJjZVVSTCh0eXBlLCBpZCksIHNldHRpbmdzKS50aGVuKCgpID0+IFtdKTtcbiAgICB9LFxuICAgIGFkZFRvUmVsYXRlZFJlY29yZHMoc291cmNlLCByZXF1ZXN0KSB7XG4gICAgICAgIGNvbnN0IHsgdHlwZSwgaWQgfSA9IHJlcXVlc3QucmVjb3JkO1xuICAgICAgICBjb25zdCB7IHJlbGF0aW9uc2hpcCB9ID0gcmVxdWVzdDtcbiAgICAgICAgY29uc3QganNvbiA9IHtcbiAgICAgICAgICAgIGRhdGE6IHJlcXVlc3QucmVsYXRlZFJlY29yZHMubWFwKHIgPT4gc291cmNlLnNlcmlhbGl6ZXIucmVzb3VyY2VJZGVudGl0eShyKSlcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBidWlsZEZldGNoU2V0dGluZ3MocmVxdWVzdC5vcHRpb25zLCB7IG1ldGhvZDogJ1BPU1QnLCBqc29uIH0pO1xuICAgICAgICByZXR1cm4gc291cmNlLmZldGNoKHNvdXJjZS5yZXNvdXJjZVJlbGF0aW9uc2hpcFVSTCh0eXBlLCBpZCwgcmVsYXRpb25zaGlwKSwgc2V0dGluZ3MpLnRoZW4oKCkgPT4gW10pO1xuICAgIH0sXG4gICAgcmVtb3ZlRnJvbVJlbGF0ZWRSZWNvcmRzKHNvdXJjZSwgcmVxdWVzdCkge1xuICAgICAgICBjb25zdCB7IHR5cGUsIGlkIH0gPSByZXF1ZXN0LnJlY29yZDtcbiAgICAgICAgY29uc3QgeyByZWxhdGlvbnNoaXAgfSA9IHJlcXVlc3Q7XG4gICAgICAgIGNvbnN0IGpzb24gPSB7XG4gICAgICAgICAgICBkYXRhOiByZXF1ZXN0LnJlbGF0ZWRSZWNvcmRzLm1hcChyID0+IHNvdXJjZS5zZXJpYWxpemVyLnJlc291cmNlSWRlbnRpdHkocikpXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gYnVpbGRGZXRjaFNldHRpbmdzKHJlcXVlc3Qub3B0aW9ucywgeyBtZXRob2Q6ICdERUxFVEUnLCBqc29uIH0pO1xuICAgICAgICByZXR1cm4gc291cmNlLmZldGNoKHNvdXJjZS5yZXNvdXJjZVJlbGF0aW9uc2hpcFVSTCh0eXBlLCBpZCwgcmVsYXRpb25zaGlwKSwgc2V0dGluZ3MpLnRoZW4oKCkgPT4gW10pO1xuICAgIH0sXG4gICAgcmVwbGFjZVJlbGF0ZWRSZWNvcmQoc291cmNlLCByZXF1ZXN0KSB7XG4gICAgICAgIGNvbnN0IHsgdHlwZSwgaWQgfSA9IHJlcXVlc3QucmVjb3JkO1xuICAgICAgICBjb25zdCB7IHJlbGF0aW9uc2hpcCwgcmVsYXRlZFJlY29yZCB9ID0gcmVxdWVzdDtcbiAgICAgICAgY29uc3QganNvbiA9IHtcbiAgICAgICAgICAgIGRhdGE6IHJlbGF0ZWRSZWNvcmQgPyBzb3VyY2Uuc2VyaWFsaXplci5yZXNvdXJjZUlkZW50aXR5KHJlbGF0ZWRSZWNvcmQpIDogbnVsbFxuICAgICAgICB9O1xuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGJ1aWxkRmV0Y2hTZXR0aW5ncyhyZXF1ZXN0Lm9wdGlvbnMsIHsgbWV0aG9kOiAnUEFUQ0gnLCBqc29uIH0pO1xuICAgICAgICByZXR1cm4gc291cmNlLmZldGNoKHNvdXJjZS5yZXNvdXJjZVJlbGF0aW9uc2hpcFVSTCh0eXBlLCBpZCwgcmVsYXRpb25zaGlwKSwgc2V0dGluZ3MpLnRoZW4oKCkgPT4gW10pO1xuICAgIH0sXG4gICAgcmVwbGFjZVJlbGF0ZWRSZWNvcmRzKHNvdXJjZSwgcmVxdWVzdCkge1xuICAgICAgICBjb25zdCB7IHR5cGUsIGlkIH0gPSByZXF1ZXN0LnJlY29yZDtcbiAgICAgICAgY29uc3QgeyByZWxhdGlvbnNoaXAsIHJlbGF0ZWRSZWNvcmRzIH0gPSByZXF1ZXN0O1xuICAgICAgICBjb25zdCBqc29uID0ge1xuICAgICAgICAgICAgZGF0YTogcmVsYXRlZFJlY29yZHMubWFwKHIgPT4gc291cmNlLnNlcmlhbGl6ZXIucmVzb3VyY2VJZGVudGl0eShyKSlcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBidWlsZEZldGNoU2V0dGluZ3MocmVxdWVzdC5vcHRpb25zLCB7IG1ldGhvZDogJ1BBVENIJywganNvbiB9KTtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5mZXRjaChzb3VyY2UucmVzb3VyY2VSZWxhdGlvbnNoaXBVUkwodHlwZSwgaWQsIHJlbGF0aW9uc2hpcCksIHNldHRpbmdzKS50aGVuKCgpID0+IFtdKTtcbiAgICB9XG59O1xuZXhwb3J0IGZ1bmN0aW9uIGdldFRyYW5zZm9ybVJlcXVlc3RzKHNvdXJjZSwgdHJhbnNmb3JtKSB7XG4gICAgY29uc3QgcmVxdWVzdHMgPSBbXTtcbiAgICBsZXQgcHJldlJlcXVlc3Q7XG4gICAgdHJhbnNmb3JtLm9wZXJhdGlvbnMuZm9yRWFjaChvcGVyYXRpb24gPT4ge1xuICAgICAgICBsZXQgcmVxdWVzdDtcbiAgICAgICAgbGV0IG5ld1JlcXVlc3ROZWVkZWQgPSB0cnVlO1xuICAgICAgICBpZiAocHJldlJlcXVlc3QgJiYgZXF1YWxSZWNvcmRJZGVudGl0aWVzKHByZXZSZXF1ZXN0LnJlY29yZCwgb3BlcmF0aW9uLnJlY29yZCkpIHtcbiAgICAgICAgICAgIGlmIChvcGVyYXRpb24ub3AgPT09ICdyZW1vdmVSZWNvcmQnKSB7XG4gICAgICAgICAgICAgICAgbmV3UmVxdWVzdE5lZWRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGlmIChwcmV2UmVxdWVzdC5vcCAhPT0gJ3JlbW92ZVJlY29yZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJldlJlcXVlc3QgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICByZXF1ZXN0cy5wb3AoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByZXZSZXF1ZXN0Lm9wID09PSAnYWRkUmVjb3JkJyB8fCBwcmV2UmVxdWVzdC5vcCA9PT0gJ3JlcGxhY2VSZWNvcmQnKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9wZXJhdGlvbi5vcCA9PT0gJ3JlcGxhY2VBdHRyaWJ1dGUnKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld1JlcXVlc3ROZWVkZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgcmVwbGFjZVJlY29yZEF0dHJpYnV0ZShwcmV2UmVxdWVzdC5yZWNvcmQsIG9wZXJhdGlvbi5hdHRyaWJ1dGUsIG9wZXJhdGlvbi52YWx1ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChvcGVyYXRpb24ub3AgPT09ICdyZXBsYWNlUmVsYXRlZFJlY29yZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3UmVxdWVzdE5lZWRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICByZXBsYWNlUmVjb3JkSGFzT25lKHByZXZSZXF1ZXN0LnJlY29yZCwgb3BlcmF0aW9uLnJlbGF0aW9uc2hpcCwgb3BlcmF0aW9uLnJlbGF0ZWRSZWNvcmQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAob3BlcmF0aW9uLm9wID09PSAncmVwbGFjZVJlbGF0ZWRSZWNvcmRzJykge1xuICAgICAgICAgICAgICAgICAgICBuZXdSZXF1ZXN0TmVlZGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHJlcGxhY2VSZWNvcmRIYXNNYW55KHByZXZSZXF1ZXN0LnJlY29yZCwgb3BlcmF0aW9uLnJlbGF0aW9uc2hpcCwgb3BlcmF0aW9uLnJlbGF0ZWRSZWNvcmRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByZXZSZXF1ZXN0Lm9wID09PSAnYWRkVG9SZWxhdGVkUmVjb3JkcycgJiYgb3BlcmF0aW9uLm9wID09PSAnYWRkVG9SZWxhdGVkUmVjb3JkcycgJiYgcHJldlJlcXVlc3QucmVsYXRpb25zaGlwID09PSBvcGVyYXRpb24ucmVsYXRpb25zaGlwKSB7XG4gICAgICAgICAgICAgICAgbmV3UmVxdWVzdE5lZWRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHByZXZSZXF1ZXN0LnJlbGF0ZWRSZWNvcmRzLnB1c2goY2xvbmVSZWNvcmRJZGVudGl0eShvcGVyYXRpb24ucmVsYXRlZFJlY29yZCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChuZXdSZXF1ZXN0TmVlZGVkKSB7XG4gICAgICAgICAgICByZXF1ZXN0ID0gT3BlcmF0aW9uVG9SZXF1ZXN0TWFwW29wZXJhdGlvbi5vcF0ob3BlcmF0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVxdWVzdCkge1xuICAgICAgICAgICAgbGV0IG9wdGlvbnMgPSBjdXN0b21SZXF1ZXN0T3B0aW9ucyhzb3VyY2UsIHRyYW5zZm9ybSk7XG4gICAgICAgICAgICBpZiAob3B0aW9ucykge1xuICAgICAgICAgICAgICAgIHJlcXVlc3Qub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXF1ZXN0cy5wdXNoKHJlcXVlc3QpO1xuICAgICAgICAgICAgcHJldlJlcXVlc3QgPSByZXF1ZXN0O1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcXVlc3RzO1xufVxuY29uc3QgT3BlcmF0aW9uVG9SZXF1ZXN0TWFwID0ge1xuICAgIGFkZFJlY29yZChvcGVyYXRpb24pIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9wOiAnYWRkUmVjb3JkJyxcbiAgICAgICAgICAgIHJlY29yZDogY2xvbmUob3BlcmF0aW9uLnJlY29yZClcbiAgICAgICAgfTtcbiAgICB9LFxuICAgIHJlbW92ZVJlY29yZChvcGVyYXRpb24pIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9wOiAncmVtb3ZlUmVjb3JkJyxcbiAgICAgICAgICAgIHJlY29yZDogY2xvbmVSZWNvcmRJZGVudGl0eShvcGVyYXRpb24ucmVjb3JkKVxuICAgICAgICB9O1xuICAgIH0sXG4gICAgcmVwbGFjZUF0dHJpYnV0ZShvcGVyYXRpb24pIHtcbiAgICAgICAgY29uc3QgcmVjb3JkID0gY2xvbmVSZWNvcmRJZGVudGl0eShvcGVyYXRpb24ucmVjb3JkKTtcbiAgICAgICAgcmVwbGFjZVJlY29yZEF0dHJpYnV0ZShyZWNvcmQsIG9wZXJhdGlvbi5hdHRyaWJ1dGUsIG9wZXJhdGlvbi52YWx1ZSk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcDogJ3JlcGxhY2VSZWNvcmQnLFxuICAgICAgICAgICAgcmVjb3JkXG4gICAgICAgIH07XG4gICAgfSxcbiAgICByZXBsYWNlUmVjb3JkKG9wZXJhdGlvbikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3A6ICdyZXBsYWNlUmVjb3JkJyxcbiAgICAgICAgICAgIHJlY29yZDogY2xvbmUob3BlcmF0aW9uLnJlY29yZClcbiAgICAgICAgfTtcbiAgICB9LFxuICAgIGFkZFRvUmVsYXRlZFJlY29yZHMob3BlcmF0aW9uKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcDogJ2FkZFRvUmVsYXRlZFJlY29yZHMnLFxuICAgICAgICAgICAgcmVjb3JkOiBjbG9uZVJlY29yZElkZW50aXR5KG9wZXJhdGlvbi5yZWNvcmQpLFxuICAgICAgICAgICAgcmVsYXRpb25zaGlwOiBvcGVyYXRpb24ucmVsYXRpb25zaGlwLFxuICAgICAgICAgICAgcmVsYXRlZFJlY29yZHM6IFtjbG9uZVJlY29yZElkZW50aXR5KG9wZXJhdGlvbi5yZWxhdGVkUmVjb3JkKV1cbiAgICAgICAgfTtcbiAgICB9LFxuICAgIHJlbW92ZUZyb21SZWxhdGVkUmVjb3JkcyhvcGVyYXRpb24pIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9wOiAncmVtb3ZlRnJvbVJlbGF0ZWRSZWNvcmRzJyxcbiAgICAgICAgICAgIHJlY29yZDogY2xvbmVSZWNvcmRJZGVudGl0eShvcGVyYXRpb24ucmVjb3JkKSxcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcDogb3BlcmF0aW9uLnJlbGF0aW9uc2hpcCxcbiAgICAgICAgICAgIHJlbGF0ZWRSZWNvcmRzOiBbY2xvbmVSZWNvcmRJZGVudGl0eShvcGVyYXRpb24ucmVsYXRlZFJlY29yZCldXG4gICAgICAgIH07XG4gICAgfSxcbiAgICByZXBsYWNlUmVsYXRlZFJlY29yZChvcGVyYXRpb24pIHtcbiAgICAgICAgY29uc3QgcmVjb3JkID0ge1xuICAgICAgICAgICAgdHlwZTogb3BlcmF0aW9uLnJlY29yZC50eXBlLFxuICAgICAgICAgICAgaWQ6IG9wZXJhdGlvbi5yZWNvcmQuaWRcbiAgICAgICAgfTtcbiAgICAgICAgZGVlcFNldChyZWNvcmQsIFsncmVsYXRpb25zaGlwcycsIG9wZXJhdGlvbi5yZWxhdGlvbnNoaXAsICdkYXRhJ10sIG9wZXJhdGlvbi5yZWxhdGVkUmVjb3JkKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9wOiAncmVwbGFjZVJlY29yZCcsXG4gICAgICAgICAgICByZWNvcmRcbiAgICAgICAgfTtcbiAgICB9LFxuICAgIHJlcGxhY2VSZWxhdGVkUmVjb3JkcyhvcGVyYXRpb24pIHtcbiAgICAgICAgY29uc3QgcmVjb3JkID0gY2xvbmVSZWNvcmRJZGVudGl0eShvcGVyYXRpb24ucmVjb3JkKTtcbiAgICAgICAgZGVlcFNldChyZWNvcmQsIFsncmVsYXRpb25zaGlwcycsIG9wZXJhdGlvbi5yZWxhdGlvbnNoaXAsICdkYXRhJ10sIG9wZXJhdGlvbi5yZWxhdGVkUmVjb3Jkcyk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcDogJ3JlcGxhY2VSZWNvcmQnLFxuICAgICAgICAgICAgcmVjb3JkXG4gICAgICAgIH07XG4gICAgfVxufTtcbmZ1bmN0aW9uIHJlcGxhY2VSZWNvcmRBdHRyaWJ1dGUocmVjb3JkLCBhdHRyaWJ1dGUsIHZhbHVlKSB7XG4gICAgZGVlcFNldChyZWNvcmQsIFsnYXR0cmlidXRlcycsIGF0dHJpYnV0ZV0sIHZhbHVlKTtcbn1cbmZ1bmN0aW9uIHJlcGxhY2VSZWNvcmRIYXNPbmUocmVjb3JkLCByZWxhdGlvbnNoaXAsIHJlbGF0ZWRSZWNvcmQpIHtcbiAgICBkZWVwU2V0KHJlY29yZCwgWydyZWxhdGlvbnNoaXBzJywgcmVsYXRpb25zaGlwLCAnZGF0YSddLCByZWxhdGVkUmVjb3JkID8gY2xvbmVSZWNvcmRJZGVudGl0eShyZWxhdGVkUmVjb3JkKSA6IG51bGwpO1xufVxuZnVuY3Rpb24gcmVwbGFjZVJlY29yZEhhc01hbnkocmVjb3JkLCByZWxhdGlvbnNoaXAsIHJlbGF0ZWRSZWNvcmRzKSB7XG4gICAgZGVlcFNldChyZWNvcmQsIFsncmVsYXRpb25zaGlwcycsIHJlbGF0aW9uc2hpcCwgJ2RhdGEnXSwgcmVsYXRlZFJlY29yZHMubWFwKHIgPT4gY2xvbmVSZWNvcmRJZGVudGl0eShyKSkpO1xufSJdfQ==