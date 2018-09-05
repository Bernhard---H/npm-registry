"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.QueryOperators = undefined;

var _getOperators = require("./get-operators");

function deserialize(source, document) {
    return source.serializer.deserializeDocument(document);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9xdWVyeS1vcGVyYXRvcnMuanMiXSwibmFtZXMiOlsic291cmNlIiwiUXVlcnlPcGVyYXRvcnMiLCJkZXNlcmlhbGl6ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQ0EsU0FBQSxXQUFBLENBQUEsTUFBQSxFQUFBLFFBQUEsRUFBdUM7QUFDbkMsV0FBT0EsT0FBQUEsVUFBQUEsQ0FBQUEsbUJBQUFBLENBQVAsUUFBT0EsQ0FBUDtBQUNIO0FBQ00sSUFBTUMsMENBQWlCO0FBQUEsZ0JBQUEsVUFBQSxNQUFBLEVBQUEsS0FBQSxFQUNBO0FBQ3RCLGVBQU8sMkJBQUEsVUFBQSxDQUFBLE1BQUEsRUFBQSxLQUFBLEVBQUEsSUFBQSxDQUE0QyxVQUFBLElBQUEsRUFBQTtBQUFBLG1CQUFRQyxZQUFBQSxNQUFBQSxFQUFSLElBQVFBLENBQVI7QUFBbkQsU0FBTyxDQUFQO0FBRnNCLEtBQUE7QUFBQSxpQkFBQSxVQUFBLE1BQUEsRUFBQSxLQUFBLEVBSUM7QUFDdkIsZUFBTywyQkFBQSxXQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxJQUFBLENBQTZDLFVBQUEsSUFBQSxFQUFBO0FBQUEsbUJBQVFBLFlBQUFBLE1BQUFBLEVBQVIsSUFBUUEsQ0FBUjtBQUFwRCxTQUFPLENBQVA7QUFMc0IsS0FBQTtBQUFBLHVCQUFBLFVBQUEsTUFBQSxFQUFBLEtBQUEsRUFPTztBQUM3QixlQUFPLDJCQUFBLGlCQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxJQUFBLENBQW1ELFVBQUEsSUFBQSxFQUFBO0FBQUEsbUJBQVFBLFlBQUFBLE1BQUFBLEVBQVIsSUFBUUEsQ0FBUjtBQUExRCxTQUFPLENBQVA7QUFSc0IsS0FBQTtBQUFBLHdCQUFBLFVBQUEsTUFBQSxFQUFBLEtBQUEsRUFVUTtBQUM5QixlQUFPLDJCQUFBLGtCQUFBLENBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQSxJQUFBLENBQW9ELFVBQUEsSUFBQSxFQUFBO0FBQUEsbUJBQVFBLFlBQUFBLE1BQUFBLEVBQVIsSUFBUUEsQ0FBUjtBQUEzRCxTQUFPLENBQVA7QUFDSDtBQVp5QixDQUF2QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEdldE9wZXJhdG9ycyB9IGZyb20gXCIuL2dldC1vcGVyYXRvcnNcIjtcbmZ1bmN0aW9uIGRlc2VyaWFsaXplKHNvdXJjZSwgZG9jdW1lbnQpIHtcbiAgICByZXR1cm4gc291cmNlLnNlcmlhbGl6ZXIuZGVzZXJpYWxpemVEb2N1bWVudChkb2N1bWVudCk7XG59XG5leHBvcnQgY29uc3QgUXVlcnlPcGVyYXRvcnMgPSB7XG4gICAgZmluZFJlY29yZChzb3VyY2UsIHF1ZXJ5KSB7XG4gICAgICAgIHJldHVybiBHZXRPcGVyYXRvcnMuZmluZFJlY29yZChzb3VyY2UsIHF1ZXJ5KS50aGVuKGRhdGEgPT4gZGVzZXJpYWxpemUoc291cmNlLCBkYXRhKSk7XG4gICAgfSxcbiAgICBmaW5kUmVjb3Jkcyhzb3VyY2UsIHF1ZXJ5KSB7XG4gICAgICAgIHJldHVybiBHZXRPcGVyYXRvcnMuZmluZFJlY29yZHMoc291cmNlLCBxdWVyeSkudGhlbihkYXRhID0+IGRlc2VyaWFsaXplKHNvdXJjZSwgZGF0YSkpO1xuICAgIH0sXG4gICAgZmluZFJlbGF0ZWRSZWNvcmQoc291cmNlLCBxdWVyeSkge1xuICAgICAgICByZXR1cm4gR2V0T3BlcmF0b3JzLmZpbmRSZWxhdGVkUmVjb3JkKHNvdXJjZSwgcXVlcnkpLnRoZW4oZGF0YSA9PiBkZXNlcmlhbGl6ZShzb3VyY2UsIGRhdGEpKTtcbiAgICB9LFxuICAgIGZpbmRSZWxhdGVkUmVjb3Jkcyhzb3VyY2UsIHF1ZXJ5KSB7XG4gICAgICAgIHJldHVybiBHZXRPcGVyYXRvcnMuZmluZFJlbGF0ZWRSZWNvcmRzKHNvdXJjZSwgcXVlcnkpLnRoZW4oZGF0YSA9PiBkZXNlcmlhbGl6ZShzb3VyY2UsIGRhdGEpKTtcbiAgICB9XG59OyJdfQ==