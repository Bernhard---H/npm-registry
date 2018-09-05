"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.QueryOperators = undefined;

var _abstractOperators = require("./abstract-operators");

function deserialize(source, document) {
    return source.serializer.deserializeDocument(document);
}
var QueryOperators = exports.QueryOperators = {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9xdWVyeS1vcGVyYXRvcnMuanMiXSwibmFtZXMiOlsic291cmNlIiwiUXVlcnlPcGVyYXRvcnMiLCJkZXNlcmlhbGl6ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQ0EsU0FBQSxXQUFBLENBQUEsTUFBQSxFQUFBLFFBQUEsRUFBdUM7QUFDbkMsV0FBT0EsT0FBQUEsVUFBQUEsQ0FBQUEsbUJBQUFBLENBQVAsUUFBT0EsQ0FBUDtBQUNIO0FBQ00sSUFBTUMsMENBQWlCO0FBQUEsZ0JBQUEsVUFBQSxNQUFBLEVBQUEsS0FBQSxFQUNBO0FBQ3RCLGVBQU8scUNBQUEsVUFBQSxDQUFBLE1BQUEsRUFBQSxLQUFBLEVBQUEsSUFBQSxDQUFpRCxVQUFBLElBQUEsRUFBQTtBQUFBLG1CQUFRQyxZQUFBQSxNQUFBQSxFQUFSLElBQVFBLENBQVI7QUFBeEQsU0FBTyxDQUFQO0FBRnNCLEtBQUE7QUFBQSxpQkFBQSxVQUFBLE1BQUEsRUFBQSxLQUFBLEVBSUM7QUFDdkIsZUFBTyxxQ0FBQSxXQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxJQUFBLENBQWtELFVBQUEsSUFBQSxFQUFBO0FBQUEsbUJBQVFBLFlBQUFBLE1BQUFBLEVBQVIsSUFBUUEsQ0FBUjtBQUF6RCxTQUFPLENBQVA7QUFMc0IsS0FBQTtBQUFBLHVCQUFBLFVBQUEsTUFBQSxFQUFBLEtBQUEsRUFPTztBQUM3QixlQUFPLHFDQUFBLGlCQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxJQUFBLENBQXdELFVBQUEsSUFBQSxFQUFBO0FBQUEsbUJBQVFBLFlBQUFBLE1BQUFBLEVBQVIsSUFBUUEsQ0FBUjtBQUEvRCxTQUFPLENBQVA7QUFSc0IsS0FBQTtBQUFBLHdCQUFBLFVBQUEsTUFBQSxFQUFBLEtBQUEsRUFVUTtBQUM5QixlQUFPLHFDQUFBLGtCQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxJQUFBLENBQXlELFVBQUEsSUFBQSxFQUFBO0FBQUEsbUJBQVFBLFlBQUFBLE1BQUFBLEVBQVIsSUFBUUEsQ0FBUjtBQUFoRSxTQUFPLENBQVA7QUFDSDtBQVp5QixDQUF2QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFic3RyYWN0T3BlcmF0b3JzIH0gZnJvbSBcIi4vYWJzdHJhY3Qtb3BlcmF0b3JzXCI7XG5mdW5jdGlvbiBkZXNlcmlhbGl6ZShzb3VyY2UsIGRvY3VtZW50KSB7XG4gICAgcmV0dXJuIHNvdXJjZS5zZXJpYWxpemVyLmRlc2VyaWFsaXplRG9jdW1lbnQoZG9jdW1lbnQpO1xufVxuZXhwb3J0IGNvbnN0IFF1ZXJ5T3BlcmF0b3JzID0ge1xuICAgIGZpbmRSZWNvcmQoc291cmNlLCBxdWVyeSkge1xuICAgICAgICByZXR1cm4gQWJzdHJhY3RPcGVyYXRvcnMuZmluZFJlY29yZChzb3VyY2UsIHF1ZXJ5KS50aGVuKGRhdGEgPT4gZGVzZXJpYWxpemUoc291cmNlLCBkYXRhKSk7XG4gICAgfSxcbiAgICBmaW5kUmVjb3Jkcyhzb3VyY2UsIHF1ZXJ5KSB7XG4gICAgICAgIHJldHVybiBBYnN0cmFjdE9wZXJhdG9ycy5maW5kUmVjb3Jkcyhzb3VyY2UsIHF1ZXJ5KS50aGVuKGRhdGEgPT4gZGVzZXJpYWxpemUoc291cmNlLCBkYXRhKSk7XG4gICAgfSxcbiAgICBmaW5kUmVsYXRlZFJlY29yZChzb3VyY2UsIHF1ZXJ5KSB7XG4gICAgICAgIHJldHVybiBBYnN0cmFjdE9wZXJhdG9ycy5maW5kUmVsYXRlZFJlY29yZChzb3VyY2UsIHF1ZXJ5KS50aGVuKGRhdGEgPT4gZGVzZXJpYWxpemUoc291cmNlLCBkYXRhKSk7XG4gICAgfSxcbiAgICBmaW5kUmVsYXRlZFJlY29yZHMoc291cmNlLCBxdWVyeSkge1xuICAgICAgICByZXR1cm4gQWJzdHJhY3RPcGVyYXRvcnMuZmluZFJlbGF0ZWRSZWNvcmRzKHNvdXJjZSwgcXVlcnkpLnRoZW4oZGF0YSA9PiBkZXNlcmlhbGl6ZShzb3VyY2UsIGRhdGEpKTtcbiAgICB9XG59OyJdfQ==