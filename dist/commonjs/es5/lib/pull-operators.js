'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.PullOperators = undefined;

var _utils = require('@orbit/utils');

var _data = require('@orbit/data');

var _requestSettings = require('./request-settings');

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
        var expression = query.expression;
        var record = expression.record;

        var requestOptions = (0, _requestSettings.customRequestOptions)(source, query);
        var settings = (0, _requestSettings.buildFetchSettings)(requestOptions);
        return source.fetch(source.resourceURL(record.type, record.id), settings).then(function (data) {
            return deserialize(source, data);
        });
    },
    findRecords: function (source, query) {
        var expression = query.expression;
        var type = expression.type;

        var requestOptions = {};
        if (expression.filter) {
            requestOptions.filter = buildFilterParam(source, expression.filter);
        }
        if (expression.sort) {
            requestOptions.sort = buildSortParam(source, expression.sort);
        }
        if (expression.page) {
            requestOptions.page = expression.page;
        }
        var customOptions = (0, _requestSettings.customRequestOptions)(source, query);
        if (customOptions) {
            (0, _utils.merge)(requestOptions, customOptions);
        }
        var settings = (0, _requestSettings.buildFetchSettings)(requestOptions);
        return source.fetch(source.resourceURL(type), settings).then(function (data) {
            return deserialize(source, data);
        });
    },
    findRelatedRecord: function (source, query) {
        var expression = query.expression;
        var record = expression.record,
            relationship = expression.relationship;

        var requestOptions = (0, _requestSettings.customRequestOptions)(source, query);
        var settings = (0, _requestSettings.buildFetchSettings)(requestOptions);
        return source.fetch(source.relatedResourceURL(record.type, record.id, relationship), settings).then(function (data) {
            return deserialize(source, data);
        });
    },
    findRelatedRecords: function (source, query) {
        var expression = query.expression;
        var record = expression.record,
            relationship = expression.relationship;

        var requestOptions = (0, _requestSettings.customRequestOptions)(source, query);
        var settings = (0, _requestSettings.buildFetchSettings)(requestOptions);
        return source.fetch(source.relatedResourceURL(record.type, record.id, relationship), settings).then(function (data) {
            return deserialize(source, data);
        });
    }
};
function buildFilterParam(source, filterSpecifiers) {
    var filters = {};
    filterSpecifiers.forEach(function (filterSpecifier) {
        if (filterSpecifier.kind === 'attribute' && filterSpecifier.op === 'equal') {
            var attributeFilter = filterSpecifier;
            // Note: We don't know the `type` of the attribute here, so passing `null`
            var resourceAttribute = source.serializer.resourceAttribute(null, attributeFilter.attribute);
            filters[resourceAttribute] = attributeFilter.value;
        } else if (filterSpecifier.kind === 'relatedRecord') {
            var relatedRecordFilter = filterSpecifier;
            if (Array.isArray(relatedRecordFilter.record)) {
                filters[relatedRecordFilter.relation] = relatedRecordFilter.record.map(function (e) {
                    return e.id;
                }).join(',');
            } else {
                filters[relatedRecordFilter.relation] = relatedRecordFilter.record.id;
            }
        } else if (filterSpecifier.kind === 'relatedRecords') {
            if (filterSpecifier.op !== 'equal') {
                throw new Error('Operation "' + filterSpecifier.op + '" is not supported in JSONAPI for relatedRecords filtering');
            }
            var relatedRecordsFilter = filterSpecifier;
            filters[relatedRecordsFilter.relation] = relatedRecordsFilter.records.map(function (e) {
                return e.id;
            }).join(',');
        } else {
            throw new _data.QueryExpressionParseError('Filter operation ' + filterSpecifier.op + ' not recognized for JSONAPISource.', filterSpecifier);
        }
    });
    return filters;
}
function buildSortParam(source, sortSpecifiers) {
    return sortSpecifiers.map(function (sortSpecifier) {
        if (sortSpecifier.kind === 'attribute') {
            var attributeSort = sortSpecifier;
            // Note: We don't know the `type` of the attribute here, so passing `null`
            var resourceAttribute = source.serializer.resourceAttribute(null, attributeSort.attribute);
            return (sortSpecifier.order === 'descending' ? '-' : '') + resourceAttribute;
        }
        throw new _data.QueryExpressionParseError('Sort specifier ' + sortSpecifier.kind + ' not recognized for JSONAPISource.', sortSpecifier);
    }).join(',');
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9wdWxsLW9wZXJhdG9ycy5qcyJdLCJuYW1lcyI6WyJkZXNlcmlhbGl6ZWQiLCJzb3VyY2UiLCJyZWNvcmRzIiwidG9BcnJheSIsIkFycmF5Iiwib3BlcmF0aW9ucyIsIm9wIiwicmVjb3JkIiwiYnVpbGRUcmFuc2Zvcm0iLCJQdWxsT3BlcmF0b3JzIiwiZXhwcmVzc2lvbiIsInF1ZXJ5IiwicmVxdWVzdE9wdGlvbnMiLCJjdXN0b21SZXF1ZXN0T3B0aW9ucyIsInNldHRpbmdzIiwiYnVpbGRGZXRjaFNldHRpbmdzIiwiZGVzZXJpYWxpemUiLCJidWlsZEZpbHRlclBhcmFtIiwiYnVpbGRTb3J0UGFyYW0iLCJjdXN0b21PcHRpb25zIiwibWVyZ2UiLCJmaWx0ZXJzIiwiZmlsdGVyU3BlY2lmaWVycyIsImZpbHRlclNwZWNpZmllciIsImF0dHJpYnV0ZUZpbHRlciIsInJlc291cmNlQXR0cmlidXRlIiwicmVsYXRlZFJlY29yZEZpbHRlciIsImUiLCJyZWxhdGVkUmVjb3Jkc0ZpbHRlciIsInNvcnRTcGVjaWZpZXIiLCJhdHRyaWJ1dGVTb3J0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFDQTs7QUFDQTs7QUFDQSxTQUFBLFdBQUEsQ0FBQSxNQUFBLEVBQUEsUUFBQSxFQUF1QztBQUNuQyxRQUFNQSxlQUFlQyxPQUFBQSxVQUFBQSxDQUFBQSxtQkFBQUEsQ0FBckIsUUFBcUJBLENBQXJCO0FBQ0EsUUFBTUMsVUFBVUMsb0JBQVFILGFBQXhCLElBQWdCRyxDQUFoQjtBQUNBLFFBQUlILGFBQUosUUFBQSxFQUEyQjtBQUN2QkksY0FBQUEsU0FBQUEsQ0FBQUEsSUFBQUEsQ0FBQUEsS0FBQUEsQ0FBQUEsT0FBQUEsRUFBb0NKLGFBQXBDSSxRQUFBQTtBQUNIO0FBQ0QsUUFBTUMsYUFBYSxRQUFBLEdBQUEsQ0FBWSxVQUFBLE1BQUEsRUFBVTtBQUNyQyxlQUFPO0FBQ0hDLGdCQURHLGVBQUE7QUFFSEMsb0JBQUFBO0FBRkcsU0FBUDtBQURKLEtBQW1CLENB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Q2xELGdCQUFJQSxnQkFBQUEsRUFBQUEsS0FBSixPQUFBLEVBQW9DO0FBQ2hDLHNCQUFNLElBQUEsS0FBQSxDQUFBLGdCQUF3QkEsZ0JBQXhCLEVBQUEsR0FBTiw0REFBTSxDQUFOO0FBQ0g7QUFDRCxnQkFBTUssdUJBQU4sZUFBQTtBQUNBUCxvQkFBUU8scUJBQVJQLFFBQUFBLElBQXlDLHFCQUFBLE9BQUEsQ0FBQSxHQUFBLENBQWlDLFVBQUEsQ0FBQSxFQUFBO0FBQUEsdUJBQUtNLEVBQUwsRUFBQTtBQUFqQyxhQUFBLEVBQUEsSUFBQSxDQUF6Q04sR0FBeUMsQ0FBekNBO0FBTEcsU0FBQSxNQU1BO0FBQ0gsa0JBQU0sSUFBQSwrQkFBQSxDQUFBLHNCQUFrREUsZ0JBQWxELEVBQUEsR0FBQSxvQ0FBQSxFQUFOLGVBQU0sQ0FBTjtBQUNIO0FBckJMRCxLQUFBQTtBQXVCQSxXQUFBLE9BQUE7QUFDSDtBQUNELFNBQUEsY0FBQSxDQUFBLE1BQUEsRUFBQSxjQUFBLEVBQWdEO0FBQzVDLFdBQU8sZUFBQSxHQUFBLENBQW1CLFVBQUEsYUFBQSxFQUFpQjtBQUN2QyxZQUFJTyxjQUFBQSxJQUFBQSxLQUFKLFdBQUEsRUFBd0M7QUFDcEMsZ0JBQU1DLGdCQUFOLGFBQUE7QUFDQTtBQUNBLGdCQUFNTCxvQkFBb0J4QixPQUFBQSxVQUFBQSxDQUFBQSxpQkFBQUEsQ0FBQUEsSUFBQUEsRUFBMEM2QixjQUFwRSxTQUEwQjdCLENBQTFCO0FBQ0EsbUJBQU8sQ0FBQzRCLGNBQUFBLEtBQUFBLEtBQUFBLFlBQUFBLEdBQUFBLEdBQUFBLEdBQUQsRUFBQSxJQUFQLGlCQUFBO0FBQ0g7QUFDRCxjQUFNLElBQUEsK0JBQUEsQ0FBQSxvQkFBZ0RBLGNBQWhELElBQUEsR0FBQSxvQ0FBQSxFQUFOLGFBQU0sQ0FBTjtBQVBHLEtBQUEsRUFBQSxJQUFBLENBQVAsR0FBTyxDQUFQO0FBU0giLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB0b0FycmF5LCBtZXJnZSB9IGZyb20gJ0BvcmJpdC91dGlscyc7XG5pbXBvcnQgeyBRdWVyeUV4cHJlc3Npb25QYXJzZUVycm9yLCBidWlsZFRyYW5zZm9ybSB9IGZyb20gJ0BvcmJpdC9kYXRhJztcbmltcG9ydCB7IGJ1aWxkRmV0Y2hTZXR0aW5ncywgY3VzdG9tUmVxdWVzdE9wdGlvbnMgfSBmcm9tICcuL3JlcXVlc3Qtc2V0dGluZ3MnO1xuZnVuY3Rpb24gZGVzZXJpYWxpemUoc291cmNlLCBkb2N1bWVudCkge1xuICAgIGNvbnN0IGRlc2VyaWFsaXplZCA9IHNvdXJjZS5zZXJpYWxpemVyLmRlc2VyaWFsaXplRG9jdW1lbnQoZG9jdW1lbnQpO1xuICAgIGNvbnN0IHJlY29yZHMgPSB0b0FycmF5KGRlc2VyaWFsaXplZC5kYXRhKTtcbiAgICBpZiAoZGVzZXJpYWxpemVkLmluY2x1ZGVkKSB7XG4gICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KHJlY29yZHMsIGRlc2VyaWFsaXplZC5pbmNsdWRlZCk7XG4gICAgfVxuICAgIGNvbnN0IG9wZXJhdGlvbnMgPSByZWNvcmRzLm1hcChyZWNvcmQgPT4ge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3A6ICdyZXBsYWNlUmVjb3JkJyxcbiAgICAgICAgICAgIHJlY29yZFxuICAgICAgICB9O1xuICAgIH0pO1xuICAgIHJldHVybiBbYnVpbGRUcmFuc2Zvcm0ob3BlcmF0aW9ucyldO1xufVxuZXhwb3J0IGNvbnN0IFB1bGxPcGVyYXRvcnMgPSB7XG4gICAgZmluZFJlY29yZChzb3VyY2UsIHF1ZXJ5KSB7XG4gICAgICAgIGNvbnN0IGV4cHJlc3Npb24gPSBxdWVyeS5leHByZXNzaW9uO1xuICAgICAgICBjb25zdCB7IHJlY29yZCB9ID0gZXhwcmVzc2lvbjtcbiAgICAgICAgY29uc3QgcmVxdWVzdE9wdGlvbnMgPSBjdXN0b21SZXF1ZXN0T3B0aW9ucyhzb3VyY2UsIHF1ZXJ5KTtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBidWlsZEZldGNoU2V0dGluZ3MocmVxdWVzdE9wdGlvbnMpO1xuICAgICAgICByZXR1cm4gc291cmNlLmZldGNoKHNvdXJjZS5yZXNvdXJjZVVSTChyZWNvcmQudHlwZSwgcmVjb3JkLmlkKSwgc2V0dGluZ3MpLnRoZW4oZGF0YSA9PiBkZXNlcmlhbGl6ZShzb3VyY2UsIGRhdGEpKTtcbiAgICB9LFxuICAgIGZpbmRSZWNvcmRzKHNvdXJjZSwgcXVlcnkpIHtcbiAgICAgICAgY29uc3QgZXhwcmVzc2lvbiA9IHF1ZXJ5LmV4cHJlc3Npb247XG4gICAgICAgIGNvbnN0IHsgdHlwZSB9ID0gZXhwcmVzc2lvbjtcbiAgICAgICAgbGV0IHJlcXVlc3RPcHRpb25zID0ge307XG4gICAgICAgIGlmIChleHByZXNzaW9uLmZpbHRlcikge1xuICAgICAgICAgICAgcmVxdWVzdE9wdGlvbnMuZmlsdGVyID0gYnVpbGRGaWx0ZXJQYXJhbShzb3VyY2UsIGV4cHJlc3Npb24uZmlsdGVyKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZXhwcmVzc2lvbi5zb3J0KSB7XG4gICAgICAgICAgICByZXF1ZXN0T3B0aW9ucy5zb3J0ID0gYnVpbGRTb3J0UGFyYW0oc291cmNlLCBleHByZXNzaW9uLnNvcnQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChleHByZXNzaW9uLnBhZ2UpIHtcbiAgICAgICAgICAgIHJlcXVlc3RPcHRpb25zLnBhZ2UgPSBleHByZXNzaW9uLnBhZ2U7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGN1c3RvbU9wdGlvbnMgPSBjdXN0b21SZXF1ZXN0T3B0aW9ucyhzb3VyY2UsIHF1ZXJ5KTtcbiAgICAgICAgaWYgKGN1c3RvbU9wdGlvbnMpIHtcbiAgICAgICAgICAgIG1lcmdlKHJlcXVlc3RPcHRpb25zLCBjdXN0b21PcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGJ1aWxkRmV0Y2hTZXR0aW5ncyhyZXF1ZXN0T3B0aW9ucyk7XG4gICAgICAgIHJldHVybiBzb3VyY2UuZmV0Y2goc291cmNlLnJlc291cmNlVVJMKHR5cGUpLCBzZXR0aW5ncykudGhlbihkYXRhID0+IGRlc2VyaWFsaXplKHNvdXJjZSwgZGF0YSkpO1xuICAgIH0sXG4gICAgZmluZFJlbGF0ZWRSZWNvcmQoc291cmNlLCBxdWVyeSkge1xuICAgICAgICBjb25zdCBleHByZXNzaW9uID0gcXVlcnkuZXhwcmVzc2lvbjtcbiAgICAgICAgY29uc3QgeyByZWNvcmQsIHJlbGF0aW9uc2hpcCB9ID0gZXhwcmVzc2lvbjtcbiAgICAgICAgY29uc3QgcmVxdWVzdE9wdGlvbnMgPSBjdXN0b21SZXF1ZXN0T3B0aW9ucyhzb3VyY2UsIHF1ZXJ5KTtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBidWlsZEZldGNoU2V0dGluZ3MocmVxdWVzdE9wdGlvbnMpO1xuICAgICAgICByZXR1cm4gc291cmNlLmZldGNoKHNvdXJjZS5yZWxhdGVkUmVzb3VyY2VVUkwocmVjb3JkLnR5cGUsIHJlY29yZC5pZCwgcmVsYXRpb25zaGlwKSwgc2V0dGluZ3MpLnRoZW4oZGF0YSA9PiBkZXNlcmlhbGl6ZShzb3VyY2UsIGRhdGEpKTtcbiAgICB9LFxuICAgIGZpbmRSZWxhdGVkUmVjb3Jkcyhzb3VyY2UsIHF1ZXJ5KSB7XG4gICAgICAgIGNvbnN0IGV4cHJlc3Npb24gPSBxdWVyeS5leHByZXNzaW9uO1xuICAgICAgICBjb25zdCB7IHJlY29yZCwgcmVsYXRpb25zaGlwIH0gPSBleHByZXNzaW9uO1xuICAgICAgICBsZXQgcmVxdWVzdE9wdGlvbnMgPSBjdXN0b21SZXF1ZXN0T3B0aW9ucyhzb3VyY2UsIHF1ZXJ5KTtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBidWlsZEZldGNoU2V0dGluZ3MocmVxdWVzdE9wdGlvbnMpO1xuICAgICAgICByZXR1cm4gc291cmNlLmZldGNoKHNvdXJjZS5yZWxhdGVkUmVzb3VyY2VVUkwocmVjb3JkLnR5cGUsIHJlY29yZC5pZCwgcmVsYXRpb25zaGlwKSwgc2V0dGluZ3MpLnRoZW4oZGF0YSA9PiBkZXNlcmlhbGl6ZShzb3VyY2UsIGRhdGEpKTtcbiAgICB9XG59O1xuZnVuY3Rpb24gYnVpbGRGaWx0ZXJQYXJhbShzb3VyY2UsIGZpbHRlclNwZWNpZmllcnMpIHtcbiAgICBjb25zdCBmaWx0ZXJzID0ge307XG4gICAgZmlsdGVyU3BlY2lmaWVycy5mb3JFYWNoKGZpbHRlclNwZWNpZmllciA9PiB7XG4gICAgICAgIGlmIChmaWx0ZXJTcGVjaWZpZXIua2luZCA9PT0gJ2F0dHJpYnV0ZScgJiYgZmlsdGVyU3BlY2lmaWVyLm9wID09PSAnZXF1YWwnKSB7XG4gICAgICAgICAgICBjb25zdCBhdHRyaWJ1dGVGaWx0ZXIgPSBmaWx0ZXJTcGVjaWZpZXI7XG4gICAgICAgICAgICAvLyBOb3RlOiBXZSBkb24ndCBrbm93IHRoZSBgdHlwZWAgb2YgdGhlIGF0dHJpYnV0ZSBoZXJlLCBzbyBwYXNzaW5nIGBudWxsYFxuICAgICAgICAgICAgY29uc3QgcmVzb3VyY2VBdHRyaWJ1dGUgPSBzb3VyY2Uuc2VyaWFsaXplci5yZXNvdXJjZUF0dHJpYnV0ZShudWxsLCBhdHRyaWJ1dGVGaWx0ZXIuYXR0cmlidXRlKTtcbiAgICAgICAgICAgIGZpbHRlcnNbcmVzb3VyY2VBdHRyaWJ1dGVdID0gYXR0cmlidXRlRmlsdGVyLnZhbHVlO1xuICAgICAgICB9IGVsc2UgaWYgKGZpbHRlclNwZWNpZmllci5raW5kID09PSAncmVsYXRlZFJlY29yZCcpIHtcbiAgICAgICAgICAgIGNvbnN0IHJlbGF0ZWRSZWNvcmRGaWx0ZXIgPSBmaWx0ZXJTcGVjaWZpZXI7XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShyZWxhdGVkUmVjb3JkRmlsdGVyLnJlY29yZCkpIHtcbiAgICAgICAgICAgICAgICBmaWx0ZXJzW3JlbGF0ZWRSZWNvcmRGaWx0ZXIucmVsYXRpb25dID0gcmVsYXRlZFJlY29yZEZpbHRlci5yZWNvcmQubWFwKGUgPT4gZS5pZCkuam9pbignLCcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmaWx0ZXJzW3JlbGF0ZWRSZWNvcmRGaWx0ZXIucmVsYXRpb25dID0gcmVsYXRlZFJlY29yZEZpbHRlci5yZWNvcmQuaWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoZmlsdGVyU3BlY2lmaWVyLmtpbmQgPT09ICdyZWxhdGVkUmVjb3JkcycpIHtcbiAgICAgICAgICAgIGlmIChmaWx0ZXJTcGVjaWZpZXIub3AgIT09ICdlcXVhbCcpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE9wZXJhdGlvbiBcIiR7ZmlsdGVyU3BlY2lmaWVyLm9wfVwiIGlzIG5vdCBzdXBwb3J0ZWQgaW4gSlNPTkFQSSBmb3IgcmVsYXRlZFJlY29yZHMgZmlsdGVyaW5nYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCByZWxhdGVkUmVjb3Jkc0ZpbHRlciA9IGZpbHRlclNwZWNpZmllcjtcbiAgICAgICAgICAgIGZpbHRlcnNbcmVsYXRlZFJlY29yZHNGaWx0ZXIucmVsYXRpb25dID0gcmVsYXRlZFJlY29yZHNGaWx0ZXIucmVjb3Jkcy5tYXAoZSA9PiBlLmlkKS5qb2luKCcsJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgUXVlcnlFeHByZXNzaW9uUGFyc2VFcnJvcihgRmlsdGVyIG9wZXJhdGlvbiAke2ZpbHRlclNwZWNpZmllci5vcH0gbm90IHJlY29nbml6ZWQgZm9yIEpTT05BUElTb3VyY2UuYCwgZmlsdGVyU3BlY2lmaWVyKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBmaWx0ZXJzO1xufVxuZnVuY3Rpb24gYnVpbGRTb3J0UGFyYW0oc291cmNlLCBzb3J0U3BlY2lmaWVycykge1xuICAgIHJldHVybiBzb3J0U3BlY2lmaWVycy5tYXAoc29ydFNwZWNpZmllciA9PiB7XG4gICAgICAgIGlmIChzb3J0U3BlY2lmaWVyLmtpbmQgPT09ICdhdHRyaWJ1dGUnKSB7XG4gICAgICAgICAgICBjb25zdCBhdHRyaWJ1dGVTb3J0ID0gc29ydFNwZWNpZmllcjtcbiAgICAgICAgICAgIC8vIE5vdGU6IFdlIGRvbid0IGtub3cgdGhlIGB0eXBlYCBvZiB0aGUgYXR0cmlidXRlIGhlcmUsIHNvIHBhc3NpbmcgYG51bGxgXG4gICAgICAgICAgICBjb25zdCByZXNvdXJjZUF0dHJpYnV0ZSA9IHNvdXJjZS5zZXJpYWxpemVyLnJlc291cmNlQXR0cmlidXRlKG51bGwsIGF0dHJpYnV0ZVNvcnQuYXR0cmlidXRlKTtcbiAgICAgICAgICAgIHJldHVybiAoc29ydFNwZWNpZmllci5vcmRlciA9PT0gJ2Rlc2NlbmRpbmcnID8gJy0nIDogJycpICsgcmVzb3VyY2VBdHRyaWJ1dGU7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IFF1ZXJ5RXhwcmVzc2lvblBhcnNlRXJyb3IoYFNvcnQgc3BlY2lmaWVyICR7c29ydFNwZWNpZmllci5raW5kfSBub3QgcmVjb2duaXplZCBmb3IgSlNPTkFQSVNvdXJjZS5gLCBzb3J0U3BlY2lmaWVyKTtcbiAgICB9KS5qb2luKCcsJyk7XG59Il19