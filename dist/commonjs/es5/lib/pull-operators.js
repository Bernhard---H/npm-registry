'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.PullOperators = undefined;

var _utils = require('@orbit/utils');

var _data = require('@orbit/data');

var _abstractOperators = require('./abstract-operators');

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
        return _abstractOperators.AbstractOperators.findRecord(source, query).then(function (data) {
            return deserialize(source, data);
        });
    },
    findRecords: function (source, query) {
        return _abstractOperators.AbstractOperators.findRecords(source, query).then(function (data) {
            return deserialize(source, data);
        });
    },
    findRelatedRecord: function (source, query) {
        return _abstractOperators.AbstractOperators.findRelatedRecord(source, query).then(function (data) {
            return deserialize(source, data);
        });
    },
    findRelatedRecords: function (source, query) {
        return _abstractOperators.AbstractOperators.findRelatedRecords(source, query).then(function (data) {
            return deserialize(source, data);
        });
    }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9wdWxsLW9wZXJhdG9ycy5qcyJdLCJuYW1lcyI6WyJkZXNlcmlhbGl6ZWQiLCJzb3VyY2UiLCJyZWNvcmRzIiwidG9BcnJheSIsIkFycmF5Iiwib3BlcmF0aW9ucyIsIm9wIiwicmVjb3JkIiwiYnVpbGRUcmFuc2Zvcm0iLCJQdWxsT3BlcmF0b3JzIiwiZGVzZXJpYWxpemUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUNBOztBQUNBOztBQUNBLFNBQUEsV0FBQSxDQUFBLE1BQUEsRUFBQSxRQUFBLEVBQXVDO0FBQ25DLFFBQU1BLGVBQWVDLE9BQUFBLFVBQUFBLENBQUFBLG1CQUFBQSxDQUFyQixRQUFxQkEsQ0FBckI7QUFDQSxRQUFNQyxVQUFVQyxvQkFBUUgsYUFBeEIsSUFBZ0JHLENBQWhCO0FBQ0EsUUFBSUgsYUFBSixRQUFBLEVBQTJCO0FBQ3ZCSSxjQUFBQSxTQUFBQSxDQUFBQSxJQUFBQSxDQUFBQSxLQUFBQSxDQUFBQSxPQUFBQSxFQUFvQ0osYUFBcENJLFFBQUFBO0FBQ0g7QUFDRCxRQUFNQyxhQUFhLFFBQUEsR0FBQSxDQUFZLFVBQUEsTUFBQSxFQUFVO0FBQ3JDLGVBQU87QUFDSEMsZ0JBREcsZUFBQTtBQUVIQyxvQkFBQUE7QUFGRyxTQUFQO0FBREosS0FBbUIsQ0FBbkI7QUFNQSxXQUFPLENBQUNDLDBCQUFSLFVBQVFBLENBQUQsQ0FBUDtBQUNIO0FBQ00sSUFBTUMsd0NBQWdCO0FBQUEsZ0JBQUEsVUFBQSxNQUFBLEVBQUEsS0FBQSxFQUNDO0FBQ3RCLGVBQU8scUNBQUEsVUFBQSxDQUFBLE1BQUEsRUFBQSxLQUFBLEVBQUEsSUFBQSxDQUFpRCxVQUFBLElBQUEsRUFBQTtBQUFBLG1CQUFRQyxZQUFBQSxNQUFBQSxFQUFSLElBQVFBLENBQVI7QUFBeEQsU0FBTyxDQUFQO0FBRnFCLEtBQUE7QUFBQSxpQkFBQSxVQUFBLE1BQUEsRUFBQSxLQUFBLEVBSUU7QUFDdkIsZUFBTyxxQ0FBQSxXQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxJQUFBLENBQWtELFVBQUEsSUFBQSxFQUFBO0FBQUEsbUJBQVFBLFlBQUFBLE1BQUFBLEVBQVIsSUFBUUEsQ0FBUjtBQUF6RCxTQUFPLENBQVA7QUFMcUIsS0FBQTtBQUFBLHVCQUFBLFVBQUEsTUFBQSxFQUFBLEtBQUEsRUFPUTtBQUM3QixlQUFPLHFDQUFBLGlCQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxJQUFBLENBQXdELFVBQUEsSUFBQSxFQUFBO0FBQUEsbUJBQVFBLFlBQUFBLE1BQUFBLEVBQVIsSUFBUUEsQ0FBUjtBQUEvRCxTQUFPLENBQVA7QUFScUIsS0FBQTtBQUFBLHdCQUFBLFVBQUEsTUFBQSxFQUFBLEtBQUEsRUFVUztBQUM5QixlQUFPLHFDQUFBLGtCQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxJQUFBLENBQXlELFVBQUEsSUFBQSxFQUFBO0FBQUEsbUJBQVFBLFlBQUFBLE1BQUFBLEVBQVIsSUFBUUEsQ0FBUjtBQUFoRSxTQUFPLENBQVA7QUFDSDtBQVp3QixDQUF0QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHRvQXJyYXkgfSBmcm9tICdAb3JiaXQvdXRpbHMnO1xuaW1wb3J0IHsgYnVpbGRUcmFuc2Zvcm0gfSBmcm9tICdAb3JiaXQvZGF0YSc7XG5pbXBvcnQgeyBBYnN0cmFjdE9wZXJhdG9ycyB9IGZyb20gXCIuL2Fic3RyYWN0LW9wZXJhdG9yc1wiO1xuZnVuY3Rpb24gZGVzZXJpYWxpemUoc291cmNlLCBkb2N1bWVudCkge1xuICAgIGNvbnN0IGRlc2VyaWFsaXplZCA9IHNvdXJjZS5zZXJpYWxpemVyLmRlc2VyaWFsaXplRG9jdW1lbnQoZG9jdW1lbnQpO1xuICAgIGNvbnN0IHJlY29yZHMgPSB0b0FycmF5KGRlc2VyaWFsaXplZC5kYXRhKTtcbiAgICBpZiAoZGVzZXJpYWxpemVkLmluY2x1ZGVkKSB7XG4gICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KHJlY29yZHMsIGRlc2VyaWFsaXplZC5pbmNsdWRlZCk7XG4gICAgfVxuICAgIGNvbnN0IG9wZXJhdGlvbnMgPSByZWNvcmRzLm1hcChyZWNvcmQgPT4ge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3A6ICdyZXBsYWNlUmVjb3JkJyxcbiAgICAgICAgICAgIHJlY29yZFxuICAgICAgICB9O1xuICAgIH0pO1xuICAgIHJldHVybiBbYnVpbGRUcmFuc2Zvcm0ob3BlcmF0aW9ucyldO1xufVxuZXhwb3J0IGNvbnN0IFB1bGxPcGVyYXRvcnMgPSB7XG4gICAgZmluZFJlY29yZChzb3VyY2UsIHF1ZXJ5KSB7XG4gICAgICAgIHJldHVybiBBYnN0cmFjdE9wZXJhdG9ycy5maW5kUmVjb3JkKHNvdXJjZSwgcXVlcnkpLnRoZW4oZGF0YSA9PiBkZXNlcmlhbGl6ZShzb3VyY2UsIGRhdGEpKTtcbiAgICB9LFxuICAgIGZpbmRSZWNvcmRzKHNvdXJjZSwgcXVlcnkpIHtcbiAgICAgICAgcmV0dXJuIEFic3RyYWN0T3BlcmF0b3JzLmZpbmRSZWNvcmRzKHNvdXJjZSwgcXVlcnkpLnRoZW4oZGF0YSA9PiBkZXNlcmlhbGl6ZShzb3VyY2UsIGRhdGEpKTtcbiAgICB9LFxuICAgIGZpbmRSZWxhdGVkUmVjb3JkKHNvdXJjZSwgcXVlcnkpIHtcbiAgICAgICAgcmV0dXJuIEFic3RyYWN0T3BlcmF0b3JzLmZpbmRSZWxhdGVkUmVjb3JkKHNvdXJjZSwgcXVlcnkpLnRoZW4oZGF0YSA9PiBkZXNlcmlhbGl6ZShzb3VyY2UsIGRhdGEpKTtcbiAgICB9LFxuICAgIGZpbmRSZWxhdGVkUmVjb3Jkcyhzb3VyY2UsIHF1ZXJ5KSB7XG4gICAgICAgIHJldHVybiBBYnN0cmFjdE9wZXJhdG9ycy5maW5kUmVsYXRlZFJlY29yZHMoc291cmNlLCBxdWVyeSkudGhlbihkYXRhID0+IGRlc2VyaWFsaXplKHNvdXJjZSwgZGF0YSkpO1xuICAgIH1cbn07Il19