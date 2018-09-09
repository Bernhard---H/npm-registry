'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.QueryOperators = undefined;

var _utils = require('@orbit/utils');

var _data = require('@orbit/data');

var _getOperators = require('./get-operators');

function deserialize(source, document) {
    const deserialized = source.serializer.deserializeDocument(document);
    const records = (0, _utils.toArray)(deserialized.data);
    if (deserialized.included) {
        Array.prototype.push.apply(records, deserialized.included);
    }
    const operations = records.map(record => {
        return {
            op: 'replaceRecord',
            record
        };
    });
    let transforms = [(0, _data.buildTransform)(operations)];
    let primaryData = deserialized.data;
    return { transforms, primaryData };
}
const QueryOperators = exports.QueryOperators = {
    findRecord(source, query) {
        return _getOperators.GetOperators.findRecord(source, query).then(data => deserialize(source, data));
    },
    findRecords(source, query) {
        return _getOperators.GetOperators.findRecords(source, query).then(data => deserialize(source, data));
    },
    findRelatedRecord(source, query) {
        return _getOperators.GetOperators.findRelatedRecord(source, query).then(data => deserialize(source, data));
    },
    findRelatedRecords(source, query) {
        return _getOperators.GetOperators.findRelatedRecords(source, query).then(data => deserialize(source, data));
    }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9xdWVyeS1vcGVyYXRvcnMuanMiXSwibmFtZXMiOlsiZGVzZXJpYWxpemUiLCJzb3VyY2UiLCJkb2N1bWVudCIsImRlc2VyaWFsaXplZCIsInNlcmlhbGl6ZXIiLCJkZXNlcmlhbGl6ZURvY3VtZW50IiwicmVjb3JkcyIsImRhdGEiLCJpbmNsdWRlZCIsIkFycmF5IiwicHJvdG90eXBlIiwicHVzaCIsImFwcGx5Iiwib3BlcmF0aW9ucyIsIm1hcCIsInJlY29yZCIsIm9wIiwidHJhbnNmb3JtcyIsInByaW1hcnlEYXRhIiwiUXVlcnlPcGVyYXRvcnMiLCJmaW5kUmVjb3JkIiwicXVlcnkiLCJHZXRPcGVyYXRvcnMiLCJ0aGVuIiwiZmluZFJlY29yZHMiLCJmaW5kUmVsYXRlZFJlY29yZCIsImZpbmRSZWxhdGVkUmVjb3JkcyJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOztBQUNBOztBQUNBOztBQUNBLFNBQVNBLFdBQVQsQ0FBcUJDLE1BQXJCLEVBQTZCQyxRQUE3QixFQUF1QztBQUNuQyxVQUFNQyxlQUFlRixPQUFPRyxVQUFQLENBQWtCQyxtQkFBbEIsQ0FBc0NILFFBQXRDLENBQXJCO0FBQ0EsVUFBTUksVUFBVSxvQkFBUUgsYUFBYUksSUFBckIsQ0FBaEI7QUFDQSxRQUFJSixhQUFhSyxRQUFqQixFQUEyQjtBQUN2QkMsY0FBTUMsU0FBTixDQUFnQkMsSUFBaEIsQ0FBcUJDLEtBQXJCLENBQTJCTixPQUEzQixFQUFvQ0gsYUFBYUssUUFBakQ7QUFDSDtBQUNELFVBQU1LLGFBQWFQLFFBQVFRLEdBQVIsQ0FBWUMsVUFBVTtBQUNyQyxlQUFPO0FBQ0hDLGdCQUFJLGVBREQ7QUFFSEQ7QUFGRyxTQUFQO0FBSUgsS0FMa0IsQ0FBbkI7QUFNQSxRQUFJRSxhQUFhLENBQUMsMEJBQWVKLFVBQWYsQ0FBRCxDQUFqQjtBQUNBLFFBQUlLLGNBQWNmLGFBQWFJLElBQS9CO0FBQ0EsV0FBTyxFQUFFVSxVQUFGLEVBQWNDLFdBQWQsRUFBUDtBQUNIO0FBQ00sTUFBTUMsMENBQWlCO0FBQzFCQyxlQUFXbkIsTUFBWCxFQUFtQm9CLEtBQW5CLEVBQTBCO0FBQ3RCLGVBQU9DLDJCQUFhRixVQUFiLENBQXdCbkIsTUFBeEIsRUFBZ0NvQixLQUFoQyxFQUF1Q0UsSUFBdkMsQ0FBNENoQixRQUFRUCxZQUFZQyxNQUFaLEVBQW9CTSxJQUFwQixDQUFwRCxDQUFQO0FBQ0gsS0FIeUI7QUFJMUJpQixnQkFBWXZCLE1BQVosRUFBb0JvQixLQUFwQixFQUEyQjtBQUN2QixlQUFPQywyQkFBYUUsV0FBYixDQUF5QnZCLE1BQXpCLEVBQWlDb0IsS0FBakMsRUFBd0NFLElBQXhDLENBQTZDaEIsUUFBUVAsWUFBWUMsTUFBWixFQUFvQk0sSUFBcEIsQ0FBckQsQ0FBUDtBQUNILEtBTnlCO0FBTzFCa0Isc0JBQWtCeEIsTUFBbEIsRUFBMEJvQixLQUExQixFQUFpQztBQUM3QixlQUFPQywyQkFBYUcsaUJBQWIsQ0FBK0J4QixNQUEvQixFQUF1Q29CLEtBQXZDLEVBQThDRSxJQUE5QyxDQUFtRGhCLFFBQVFQLFlBQVlDLE1BQVosRUFBb0JNLElBQXBCLENBQTNELENBQVA7QUFDSCxLQVR5QjtBQVUxQm1CLHVCQUFtQnpCLE1BQW5CLEVBQTJCb0IsS0FBM0IsRUFBa0M7QUFDOUIsZUFBT0MsMkJBQWFJLGtCQUFiLENBQWdDekIsTUFBaEMsRUFBd0NvQixLQUF4QyxFQUErQ0UsSUFBL0MsQ0FBb0RoQixRQUFRUCxZQUFZQyxNQUFaLEVBQW9CTSxJQUFwQixDQUE1RCxDQUFQO0FBQ0g7QUFaeUIsQ0FBdkIiLCJmaWxlIjoibGliL3F1ZXJ5LW9wZXJhdG9ycy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHRvQXJyYXkgfSBmcm9tICdAb3JiaXQvdXRpbHMnO1xuaW1wb3J0IHsgYnVpbGRUcmFuc2Zvcm0gfSBmcm9tICdAb3JiaXQvZGF0YSc7XG5pbXBvcnQgeyBHZXRPcGVyYXRvcnMgfSBmcm9tIFwiLi9nZXQtb3BlcmF0b3JzXCI7XG5mdW5jdGlvbiBkZXNlcmlhbGl6ZShzb3VyY2UsIGRvY3VtZW50KSB7XG4gICAgY29uc3QgZGVzZXJpYWxpemVkID0gc291cmNlLnNlcmlhbGl6ZXIuZGVzZXJpYWxpemVEb2N1bWVudChkb2N1bWVudCk7XG4gICAgY29uc3QgcmVjb3JkcyA9IHRvQXJyYXkoZGVzZXJpYWxpemVkLmRhdGEpO1xuICAgIGlmIChkZXNlcmlhbGl6ZWQuaW5jbHVkZWQpIHtcbiAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkocmVjb3JkcywgZGVzZXJpYWxpemVkLmluY2x1ZGVkKTtcbiAgICB9XG4gICAgY29uc3Qgb3BlcmF0aW9ucyA9IHJlY29yZHMubWFwKHJlY29yZCA9PiB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcDogJ3JlcGxhY2VSZWNvcmQnLFxuICAgICAgICAgICAgcmVjb3JkXG4gICAgICAgIH07XG4gICAgfSk7XG4gICAgbGV0IHRyYW5zZm9ybXMgPSBbYnVpbGRUcmFuc2Zvcm0ob3BlcmF0aW9ucyldO1xuICAgIGxldCBwcmltYXJ5RGF0YSA9IGRlc2VyaWFsaXplZC5kYXRhO1xuICAgIHJldHVybiB7IHRyYW5zZm9ybXMsIHByaW1hcnlEYXRhIH07XG59XG5leHBvcnQgY29uc3QgUXVlcnlPcGVyYXRvcnMgPSB7XG4gICAgZmluZFJlY29yZChzb3VyY2UsIHF1ZXJ5KSB7XG4gICAgICAgIHJldHVybiBHZXRPcGVyYXRvcnMuZmluZFJlY29yZChzb3VyY2UsIHF1ZXJ5KS50aGVuKGRhdGEgPT4gZGVzZXJpYWxpemUoc291cmNlLCBkYXRhKSk7XG4gICAgfSxcbiAgICBmaW5kUmVjb3Jkcyhzb3VyY2UsIHF1ZXJ5KSB7XG4gICAgICAgIHJldHVybiBHZXRPcGVyYXRvcnMuZmluZFJlY29yZHMoc291cmNlLCBxdWVyeSkudGhlbihkYXRhID0+IGRlc2VyaWFsaXplKHNvdXJjZSwgZGF0YSkpO1xuICAgIH0sXG4gICAgZmluZFJlbGF0ZWRSZWNvcmQoc291cmNlLCBxdWVyeSkge1xuICAgICAgICByZXR1cm4gR2V0T3BlcmF0b3JzLmZpbmRSZWxhdGVkUmVjb3JkKHNvdXJjZSwgcXVlcnkpLnRoZW4oZGF0YSA9PiBkZXNlcmlhbGl6ZShzb3VyY2UsIGRhdGEpKTtcbiAgICB9LFxuICAgIGZpbmRSZWxhdGVkUmVjb3Jkcyhzb3VyY2UsIHF1ZXJ5KSB7XG4gICAgICAgIHJldHVybiBHZXRPcGVyYXRvcnMuZmluZFJlbGF0ZWRSZWNvcmRzKHNvdXJjZSwgcXVlcnkpLnRoZW4oZGF0YSA9PiBkZXNlcmlhbGl6ZShzb3VyY2UsIGRhdGEpKTtcbiAgICB9XG59OyJdfQ==