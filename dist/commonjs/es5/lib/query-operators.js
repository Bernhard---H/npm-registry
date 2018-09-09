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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9xdWVyeS1vcGVyYXRvcnMuanMiXSwibmFtZXMiOlsiZGVzZXJpYWxpemVkIiwic291cmNlIiwicmVjb3JkcyIsInRvQXJyYXkiLCJBcnJheSIsIm9wZXJhdGlvbnMiLCJvcCIsInJlY29yZCIsInRyYW5zZm9ybXMiLCJidWlsZFRyYW5zZm9ybSIsInByaW1hcnlEYXRhIiwiUXVlcnlPcGVyYXRvcnMiLCJkZXNlcmlhbGl6ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQ0E7O0FBQ0E7O0FBQ0EsU0FBQSxXQUFBLENBQUEsTUFBQSxFQUFBLFFBQUEsRUFBdUM7QUFDbkMsUUFBTUEsZUFBZUMsT0FBQUEsVUFBQUEsQ0FBQUEsbUJBQUFBLENBQXJCLFFBQXFCQSxDQUFyQjtBQUNBLFFBQU1DLFVBQVVDLG9CQUFRSCxhQUF4QixJQUFnQkcsQ0FBaEI7QUFDQSxRQUFJSCxhQUFKLFFBQUEsRUFBMkI7QUFDdkJJLGNBQUFBLFNBQUFBLENBQUFBLElBQUFBLENBQUFBLEtBQUFBLENBQUFBLE9BQUFBLEVBQW9DSixhQUFwQ0ksUUFBQUE7QUFDSDtBQUNELFFBQU1DLGFBQWEsUUFBQSxHQUFBLENBQVksVUFBQSxNQUFBLEVBQVU7QUFDckMsZUFBTztBQUNIQyxnQkFERyxlQUFBO0FBRUhDLG9CQUFBQTtBQUZHLFNBQVA7QUFESixLQUFtQixDQUFuQjtBQU1BLFFBQUlDLGFBQWEsQ0FBQ0MsMEJBQWxCLFVBQWtCQSxDQUFELENBQWpCO0FBQ0EsUUFBSUMsY0FBY1YsYUFBbEIsSUFBQTtBQUNBLFdBQU8sRUFBRVEsWUFBRixVQUFBLEVBQWNFLGFBQXJCLFdBQU8sRUFBUDtBQUNIO0FBQ00sSUFBTUMsMENBQWlCO0FBQUEsZ0JBQUEsVUFBQSxNQUFBLEVBQUEsS0FBQSxFQUNBO0FBQ3RCLGVBQU8sMkJBQUEsVUFBQSxDQUFBLE1BQUEsRUFBQSxLQUFBLEVBQUEsSUFBQSxDQUE0QyxVQUFBLElBQUEsRUFBQTtBQUFBLG1CQUFRQyxZQUFBQSxNQUFBQSxFQUFSLElBQVFBLENBQVI7QUFBbkQsU0FBTyxDQUFQO0FBRnNCLEtBQUE7QUFBQSxpQkFBQSxVQUFBLE1BQUEsRUFBQSxLQUFBLEVBSUM7QUFDdkIsZUFBTywyQkFBQSxXQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxJQUFBLENBQTZDLFVBQUEsSUFBQSxFQUFBO0FBQUEsbUJBQVFBLFlBQUFBLE1BQUFBLEVBQVIsSUFBUUEsQ0FBUjtBQUFwRCxTQUFPLENBQVA7QUFMc0IsS0FBQTtBQUFBLHVCQUFBLFVBQUEsTUFBQSxFQUFBLEtBQUEsRUFPTztBQUM3QixlQUFPLDJCQUFBLGlCQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxJQUFBLENBQW1ELFVBQUEsSUFBQSxFQUFBO0FBQUEsbUJBQVFBLFlBQUFBLE1BQUFBLEVBQVIsSUFBUUEsQ0FBUjtBQUExRCxTQUFPLENBQVA7QUFSc0IsS0FBQTtBQUFBLHdCQUFBLFVBQUEsTUFBQSxFQUFBLEtBQUEsRUFVUTtBQUM5QixlQUFPLDJCQUFBLGtCQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxJQUFBLENBQW9ELFVBQUEsSUFBQSxFQUFBO0FBQUEsbUJBQVFBLFlBQUFBLE1BQUFBLEVBQVIsSUFBUUEsQ0FBUjtBQUEzRCxTQUFPLENBQVA7QUFDSDtBQVp5QixDQUF2QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHRvQXJyYXkgfSBmcm9tICdAb3JiaXQvdXRpbHMnO1xuaW1wb3J0IHsgYnVpbGRUcmFuc2Zvcm0gfSBmcm9tICdAb3JiaXQvZGF0YSc7XG5pbXBvcnQgeyBHZXRPcGVyYXRvcnMgfSBmcm9tIFwiLi9nZXQtb3BlcmF0b3JzXCI7XG5mdW5jdGlvbiBkZXNlcmlhbGl6ZShzb3VyY2UsIGRvY3VtZW50KSB7XG4gICAgY29uc3QgZGVzZXJpYWxpemVkID0gc291cmNlLnNlcmlhbGl6ZXIuZGVzZXJpYWxpemVEb2N1bWVudChkb2N1bWVudCk7XG4gICAgY29uc3QgcmVjb3JkcyA9IHRvQXJyYXkoZGVzZXJpYWxpemVkLmRhdGEpO1xuICAgIGlmIChkZXNlcmlhbGl6ZWQuaW5jbHVkZWQpIHtcbiAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkocmVjb3JkcywgZGVzZXJpYWxpemVkLmluY2x1ZGVkKTtcbiAgICB9XG4gICAgY29uc3Qgb3BlcmF0aW9ucyA9IHJlY29yZHMubWFwKHJlY29yZCA9PiB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcDogJ3JlcGxhY2VSZWNvcmQnLFxuICAgICAgICAgICAgcmVjb3JkXG4gICAgICAgIH07XG4gICAgfSk7XG4gICAgbGV0IHRyYW5zZm9ybXMgPSBbYnVpbGRUcmFuc2Zvcm0ob3BlcmF0aW9ucyldO1xuICAgIGxldCBwcmltYXJ5RGF0YSA9IGRlc2VyaWFsaXplZC5kYXRhO1xuICAgIHJldHVybiB7IHRyYW5zZm9ybXMsIHByaW1hcnlEYXRhIH07XG59XG5leHBvcnQgY29uc3QgUXVlcnlPcGVyYXRvcnMgPSB7XG4gICAgZmluZFJlY29yZChzb3VyY2UsIHF1ZXJ5KSB7XG4gICAgICAgIHJldHVybiBHZXRPcGVyYXRvcnMuZmluZFJlY29yZChzb3VyY2UsIHF1ZXJ5KS50aGVuKGRhdGEgPT4gZGVzZXJpYWxpemUoc291cmNlLCBkYXRhKSk7XG4gICAgfSxcbiAgICBmaW5kUmVjb3Jkcyhzb3VyY2UsIHF1ZXJ5KSB7XG4gICAgICAgIHJldHVybiBHZXRPcGVyYXRvcnMuZmluZFJlY29yZHMoc291cmNlLCBxdWVyeSkudGhlbihkYXRhID0+IGRlc2VyaWFsaXplKHNvdXJjZSwgZGF0YSkpO1xuICAgIH0sXG4gICAgZmluZFJlbGF0ZWRSZWNvcmQoc291cmNlLCBxdWVyeSkge1xuICAgICAgICByZXR1cm4gR2V0T3BlcmF0b3JzLmZpbmRSZWxhdGVkUmVjb3JkKHNvdXJjZSwgcXVlcnkpLnRoZW4oZGF0YSA9PiBkZXNlcmlhbGl6ZShzb3VyY2UsIGRhdGEpKTtcbiAgICB9LFxuICAgIGZpbmRSZWxhdGVkUmVjb3Jkcyhzb3VyY2UsIHF1ZXJ5KSB7XG4gICAgICAgIHJldHVybiBHZXRPcGVyYXRvcnMuZmluZFJlbGF0ZWRSZWNvcmRzKHNvdXJjZSwgcXVlcnkpLnRoZW4oZGF0YSA9PiBkZXNlcmlhbGl6ZShzb3VyY2UsIGRhdGEpKTtcbiAgICB9XG59OyJdfQ==