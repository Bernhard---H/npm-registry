'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.QueryOperators = undefined;

var _utils = require('@orbit/utils');

var _data = require('@orbit/data');

var _getOperators = require('./get-operators');

function deserialize(source, document) {
    var deserialized = source.serializer.deserializeDocument(document);
    var records = [];
    Array.prototype.push.apply(records, (0, _utils.toArray)(deserialized.data));
    if (deserialized.included) {
        Array.prototype.push.apply(records, deserialized.included);
    }
    var operations = records.map(function (record) {
        return {
            op: 'replaceRecord',
            record: record
        };
    });
    var transforms = [(0, _data.buildTransform)(operations)];
    var primaryData = deserialized.data;
    return { transforms: transforms, primaryData: primaryData };
}
var QueryOperators = exports.QueryOperators = {
    findRecord: function (source, query) {
        return _getOperators.GetOperators.findRecord(source, query).then(function (data) {
            return deserialize(source, data);
        });
    },
    findRecords: function (source, query) {
        return _getOperators.GetOperators.findRecords(source, query).then(function (data) {
            return deserialize(source, data);
        });
    },
    findRelatedRecord: function (source, query) {
        return _getOperators.GetOperators.findRelatedRecord(source, query).then(function (data) {
            return deserialize(source, data);
        });
    },
    findRelatedRecords: function (source, query) {
        return _getOperators.GetOperators.findRelatedRecords(source, query).then(function (data) {
            return deserialize(source, data);
        });
    }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9xdWVyeS1vcGVyYXRvcnMuanMiXSwibmFtZXMiOlsiZGVzZXJpYWxpemVkIiwic291cmNlIiwicmVjb3JkcyIsIkFycmF5IiwidG9BcnJheSIsIm9wZXJhdGlvbnMiLCJvcCIsInJlY29yZCIsInRyYW5zZm9ybXMiLCJidWlsZFRyYW5zZm9ybSIsInByaW1hcnlEYXRhIiwiUXVlcnlPcGVyYXRvcnMiLCJkZXNlcmlhbGl6ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQ0E7O0FBQ0E7O0FBQ0EsU0FBQSxXQUFBLENBQUEsTUFBQSxFQUFBLFFBQUEsRUFBdUM7QUFDbkMsUUFBTUEsZUFBZUMsT0FBQUEsVUFBQUEsQ0FBQUEsbUJBQUFBLENBQXJCLFFBQXFCQSxDQUFyQjtBQUNBLFFBQU1DLFVBQU4sRUFBQTtBQUNBQyxVQUFBQSxTQUFBQSxDQUFBQSxJQUFBQSxDQUFBQSxLQUFBQSxDQUFBQSxPQUFBQSxFQUFvQ0Msb0JBQVFKLGFBQTVDRyxJQUFvQ0MsQ0FBcENEO0FBQ0EsUUFBSUgsYUFBSixRQUFBLEVBQTJCO0FBQ3ZCRyxjQUFBQSxTQUFBQSxDQUFBQSxJQUFBQSxDQUFBQSxLQUFBQSxDQUFBQSxPQUFBQSxFQUFvQ0gsYUFBcENHLFFBQUFBO0FBQ0g7QUFDRCxRQUFNRSxhQUFhLFFBQUEsR0FBQSxDQUFZLFVBQUEsTUFBQSxFQUFVO0FBQ3JDLGVBQU87QUFDSEMsZ0JBREcsZUFBQTtBQUVIQyxvQkFBQUE7QUFGRyxTQUFQO0FBREosS0FBbUIsQ0FBbkI7QUFNQSxRQUFJQyxhQUFhLENBQUNDLDBCQUFsQixVQUFrQkEsQ0FBRCxDQUFqQjtBQUNBLFFBQUlDLGNBQWNWLGFBQWxCLElBQUE7QUFDQSxXQUFPLEVBQUVRLFlBQUYsVUFBQSxFQUFjRSxhQUFyQixXQUFPLEVBQVA7QUFDSDtBQUNNLElBQU1DLDBDQUFpQjtBQUFBLGdCQUFBLFVBQUEsTUFBQSxFQUFBLEtBQUEsRUFDQTtBQUN0QixlQUFPLDJCQUFBLFVBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQSxFQUFBLElBQUEsQ0FBNEMsVUFBQSxJQUFBLEVBQUE7QUFBQSxtQkFBUUMsWUFBQUEsTUFBQUEsRUFBUixJQUFRQSxDQUFSO0FBQW5ELFNBQU8sQ0FBUDtBQUZzQixLQUFBO0FBQUEsaUJBQUEsVUFBQSxNQUFBLEVBQUEsS0FBQSxFQUlDO0FBQ3ZCLGVBQU8sMkJBQUEsV0FBQSxDQUFBLE1BQUEsRUFBQSxLQUFBLEVBQUEsSUFBQSxDQUE2QyxVQUFBLElBQUEsRUFBQTtBQUFBLG1CQUFRQSxZQUFBQSxNQUFBQSxFQUFSLElBQVFBLENBQVI7QUFBcEQsU0FBTyxDQUFQO0FBTHNCLEtBQUE7QUFBQSx1QkFBQSxVQUFBLE1BQUEsRUFBQSxLQUFBLEVBT087QUFDN0IsZUFBTywyQkFBQSxpQkFBQSxDQUFBLE1BQUEsRUFBQSxLQUFBLEVBQUEsSUFBQSxDQUFtRCxVQUFBLElBQUEsRUFBQTtBQUFBLG1CQUFRQSxZQUFBQSxNQUFBQSxFQUFSLElBQVFBLENBQVI7QUFBMUQsU0FBTyxDQUFQO0FBUnNCLEtBQUE7QUFBQSx3QkFBQSxVQUFBLE1BQUEsRUFBQSxLQUFBLEVBVVE7QUFDOUIsZUFBTywyQkFBQSxrQkFBQSxDQUFBLE1BQUEsRUFBQSxLQUFBLEVBQUEsSUFBQSxDQUFvRCxVQUFBLElBQUEsRUFBQTtBQUFBLG1CQUFRQSxZQUFBQSxNQUFBQSxFQUFSLElBQVFBLENBQVI7QUFBM0QsU0FBTyxDQUFQO0FBQ0g7QUFaeUIsQ0FBdkIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB0b0FycmF5IH0gZnJvbSAnQG9yYml0L3V0aWxzJztcbmltcG9ydCB7IGJ1aWxkVHJhbnNmb3JtIH0gZnJvbSAnQG9yYml0L2RhdGEnO1xuaW1wb3J0IHsgR2V0T3BlcmF0b3JzIH0gZnJvbSBcIi4vZ2V0LW9wZXJhdG9yc1wiO1xuZnVuY3Rpb24gZGVzZXJpYWxpemUoc291cmNlLCBkb2N1bWVudCkge1xuICAgIGNvbnN0IGRlc2VyaWFsaXplZCA9IHNvdXJjZS5zZXJpYWxpemVyLmRlc2VyaWFsaXplRG9jdW1lbnQoZG9jdW1lbnQpO1xuICAgIGNvbnN0IHJlY29yZHMgPSBbXTtcbiAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShyZWNvcmRzLCB0b0FycmF5KGRlc2VyaWFsaXplZC5kYXRhKSk7XG4gICAgaWYgKGRlc2VyaWFsaXplZC5pbmNsdWRlZCkge1xuICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShyZWNvcmRzLCBkZXNlcmlhbGl6ZWQuaW5jbHVkZWQpO1xuICAgIH1cbiAgICBjb25zdCBvcGVyYXRpb25zID0gcmVjb3Jkcy5tYXAocmVjb3JkID0+IHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9wOiAncmVwbGFjZVJlY29yZCcsXG4gICAgICAgICAgICByZWNvcmRcbiAgICAgICAgfTtcbiAgICB9KTtcbiAgICBsZXQgdHJhbnNmb3JtcyA9IFtidWlsZFRyYW5zZm9ybShvcGVyYXRpb25zKV07XG4gICAgbGV0IHByaW1hcnlEYXRhID0gZGVzZXJpYWxpemVkLmRhdGE7XG4gICAgcmV0dXJuIHsgdHJhbnNmb3JtcywgcHJpbWFyeURhdGEgfTtcbn1cbmV4cG9ydCBjb25zdCBRdWVyeU9wZXJhdG9ycyA9IHtcbiAgICBmaW5kUmVjb3JkKHNvdXJjZSwgcXVlcnkpIHtcbiAgICAgICAgcmV0dXJuIEdldE9wZXJhdG9ycy5maW5kUmVjb3JkKHNvdXJjZSwgcXVlcnkpLnRoZW4oZGF0YSA9PiBkZXNlcmlhbGl6ZShzb3VyY2UsIGRhdGEpKTtcbiAgICB9LFxuICAgIGZpbmRSZWNvcmRzKHNvdXJjZSwgcXVlcnkpIHtcbiAgICAgICAgcmV0dXJuIEdldE9wZXJhdG9ycy5maW5kUmVjb3Jkcyhzb3VyY2UsIHF1ZXJ5KS50aGVuKGRhdGEgPT4gZGVzZXJpYWxpemUoc291cmNlLCBkYXRhKSk7XG4gICAgfSxcbiAgICBmaW5kUmVsYXRlZFJlY29yZChzb3VyY2UsIHF1ZXJ5KSB7XG4gICAgICAgIHJldHVybiBHZXRPcGVyYXRvcnMuZmluZFJlbGF0ZWRSZWNvcmQoc291cmNlLCBxdWVyeSkudGhlbihkYXRhID0+IGRlc2VyaWFsaXplKHNvdXJjZSwgZGF0YSkpO1xuICAgIH0sXG4gICAgZmluZFJlbGF0ZWRSZWNvcmRzKHNvdXJjZSwgcXVlcnkpIHtcbiAgICAgICAgcmV0dXJuIEdldE9wZXJhdG9ycy5maW5kUmVsYXRlZFJlY29yZHMoc291cmNlLCBxdWVyeSkudGhlbihkYXRhID0+IGRlc2VyaWFsaXplKHNvdXJjZSwgZGF0YSkpO1xuICAgIH1cbn07Il19