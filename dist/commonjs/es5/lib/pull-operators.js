'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.PullOperators = undefined;

var _utils = require('@orbit/utils');

var _data = require('@orbit/data');

var _getOperators = require('./get-operators');

function deserialize(source, document) {
    var deserialized = source.serializer.deserializeDocument(document);
    var records = (0, _utils.toArray)(deserialized.data);
    if (deserialized.included) {
        Array.prototype.push.apply(records, deserialized.included);
    }
    var operations = records.map(function (record) {
        return {
            op: 'replaceRecord',
            record: record
        };
    });
    return [(0, _data.buildTransform)(operations)];
}
var PullOperators = exports.PullOperators = {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9wdWxsLW9wZXJhdG9ycy5qcyJdLCJuYW1lcyI6WyJkZXNlcmlhbGl6ZWQiLCJzb3VyY2UiLCJyZWNvcmRzIiwidG9BcnJheSIsIkFycmF5Iiwib3BlcmF0aW9ucyIsIm9wIiwicmVjb3JkIiwiYnVpbGRUcmFuc2Zvcm0iLCJQdWxsT3BlcmF0b3JzIiwiZGVzZXJpYWxpemUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUNBOztBQUNBOztBQUNBLFNBQUEsV0FBQSxDQUFBLE1BQUEsRUFBQSxRQUFBLEVBQXVDO0FBQ25DLFFBQU1BLGVBQWVDLE9BQUFBLFVBQUFBLENBQUFBLG1CQUFBQSxDQUFyQixRQUFxQkEsQ0FBckI7QUFDQSxRQUFNQyxVQUFVQyxvQkFBUUgsYUFBeEIsSUFBZ0JHLENBQWhCO0FBQ0EsUUFBSUgsYUFBSixRQUFBLEVBQTJCO0FBQ3ZCSSxjQUFBQSxTQUFBQSxDQUFBQSxJQUFBQSxDQUFBQSxLQUFBQSxDQUFBQSxPQUFBQSxFQUFvQ0osYUFBcENJLFFBQUFBO0FBQ0g7QUFDRCxRQUFNQyxhQUFhLFFBQUEsR0FBQSxDQUFZLFVBQUEsTUFBQSxFQUFVO0FBQ3JDLGVBQU87QUFDSEMsZ0JBREcsZUFBQTtBQUVIQyxvQkFBQUE7QUFGRyxTQUFQO0FBREosS0FBbUIsQ0FBbkI7QUFNQSxXQUFPLENBQUNDLDBCQUFSLFVBQVFBLENBQUQsQ0FBUDtBQUNIO0FBQ00sSUFBTUMsd0NBQWdCO0FBQUEsZ0JBQUEsVUFBQSxNQUFBLEVBQUEsS0FBQSxFQUNDO0FBQ3RCLGVBQU8sMkJBQUEsVUFBQSxDQUFBLE1BQUEsRUFBQSxLQUFBLEVBQUEsSUFBQSxDQUE0QyxVQUFBLElBQUEsRUFBQTtBQUFBLG1CQUFRQyxZQUFBQSxNQUFBQSxFQUFSLElBQVFBLENBQVI7QUFBbkQsU0FBTyxDQUFQO0FBRnFCLEtBQUE7QUFBQSxpQkFBQSxVQUFBLE1BQUEsRUFBQSxLQUFBLEVBSUU7QUFDdkIsZUFBTywyQkFBQSxXQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxJQUFBLENBQTZDLFVBQUEsSUFBQSxFQUFBO0FBQUEsbUJBQVFBLFlBQUFBLE1BQUFBLEVBQVIsSUFBUUEsQ0FBUjtBQUFwRCxTQUFPLENBQVA7QUFMcUIsS0FBQTtBQUFBLHVCQUFBLFVBQUEsTUFBQSxFQUFBLEtBQUEsRUFPUTtBQUM3QixlQUFPLDJCQUFBLGlCQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxJQUFBLENBQW1ELFVBQUEsSUFBQSxFQUFBO0FBQUEsbUJBQVFBLFlBQUFBLE1BQUFBLEVBQVIsSUFBUUEsQ0FBUjtBQUExRCxTQUFPLENBQVA7QUFScUIsS0FBQTtBQUFBLHdCQUFBLFVBQUEsTUFBQSxFQUFBLEtBQUEsRUFVUztBQUM5QixlQUFPLDJCQUFBLGtCQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxJQUFBLENBQW9ELFVBQUEsSUFBQSxFQUFBO0FBQUEsbUJBQVFBLFlBQUFBLE1BQUFBLEVBQVIsSUFBUUEsQ0FBUjtBQUEzRCxTQUFPLENBQVA7QUFDSDtBQVp3QixDQUF0QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHRvQXJyYXkgfSBmcm9tICdAb3JiaXQvdXRpbHMnO1xuaW1wb3J0IHsgYnVpbGRUcmFuc2Zvcm0gfSBmcm9tICdAb3JiaXQvZGF0YSc7XG5pbXBvcnQgeyBHZXRPcGVyYXRvcnMgfSBmcm9tIFwiLi9nZXQtb3BlcmF0b3JzXCI7XG5mdW5jdGlvbiBkZXNlcmlhbGl6ZShzb3VyY2UsIGRvY3VtZW50KSB7XG4gICAgY29uc3QgZGVzZXJpYWxpemVkID0gc291cmNlLnNlcmlhbGl6ZXIuZGVzZXJpYWxpemVEb2N1bWVudChkb2N1bWVudCk7XG4gICAgY29uc3QgcmVjb3JkcyA9IHRvQXJyYXkoZGVzZXJpYWxpemVkLmRhdGEpO1xuICAgIGlmIChkZXNlcmlhbGl6ZWQuaW5jbHVkZWQpIHtcbiAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkocmVjb3JkcywgZGVzZXJpYWxpemVkLmluY2x1ZGVkKTtcbiAgICB9XG4gICAgY29uc3Qgb3BlcmF0aW9ucyA9IHJlY29yZHMubWFwKHJlY29yZCA9PiB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcDogJ3JlcGxhY2VSZWNvcmQnLFxuICAgICAgICAgICAgcmVjb3JkXG4gICAgICAgIH07XG4gICAgfSk7XG4gICAgcmV0dXJuIFtidWlsZFRyYW5zZm9ybShvcGVyYXRpb25zKV07XG59XG5leHBvcnQgY29uc3QgUHVsbE9wZXJhdG9ycyA9IHtcbiAgICBmaW5kUmVjb3JkKHNvdXJjZSwgcXVlcnkpIHtcbiAgICAgICAgcmV0dXJuIEdldE9wZXJhdG9ycy5maW5kUmVjb3JkKHNvdXJjZSwgcXVlcnkpLnRoZW4oZGF0YSA9PiBkZXNlcmlhbGl6ZShzb3VyY2UsIGRhdGEpKTtcbiAgICB9LFxuICAgIGZpbmRSZWNvcmRzKHNvdXJjZSwgcXVlcnkpIHtcbiAgICAgICAgcmV0dXJuIEdldE9wZXJhdG9ycy5maW5kUmVjb3Jkcyhzb3VyY2UsIHF1ZXJ5KS50aGVuKGRhdGEgPT4gZGVzZXJpYWxpemUoc291cmNlLCBkYXRhKSk7XG4gICAgfSxcbiAgICBmaW5kUmVsYXRlZFJlY29yZChzb3VyY2UsIHF1ZXJ5KSB7XG4gICAgICAgIHJldHVybiBHZXRPcGVyYXRvcnMuZmluZFJlbGF0ZWRSZWNvcmQoc291cmNlLCBxdWVyeSkudGhlbihkYXRhID0+IGRlc2VyaWFsaXplKHNvdXJjZSwgZGF0YSkpO1xuICAgIH0sXG4gICAgZmluZFJlbGF0ZWRSZWNvcmRzKHNvdXJjZSwgcXVlcnkpIHtcbiAgICAgICAgcmV0dXJuIEdldE9wZXJhdG9ycy5maW5kUmVsYXRlZFJlY29yZHMoc291cmNlLCBxdWVyeSkudGhlbihkYXRhID0+IGRlc2VyaWFsaXplKHNvdXJjZSwgZGF0YSkpO1xuICAgIH1cbn07Il19