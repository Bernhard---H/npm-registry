'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.AbstractOperators = undefined;

var _utils = require('@orbit/utils');

var _data = require('@orbit/data');

var _requestSettings = require('./request-settings');

var AbstractOperators = exports.AbstractOperators = {
    findRecord: function (source, query) {
        var expression = query.expression;
        var record = expression.record;

        var requestOptions = (0, _requestSettings.customRequestOptions)(source, query);
        var settings = (0, _requestSettings.buildFetchSettings)(requestOptions);
        return source.fetch(source.resourceURL(record.type, record.id), settings);
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
        return source.fetch(source.resourceURL(type), settings);
    },
    findRelatedRecord: function (source, query) {
        var expression = query.expression;
        var record = expression.record,
            relationship = expression.relationship;

        var requestOptions = (0, _requestSettings.customRequestOptions)(source, query);
        var settings = (0, _requestSettings.buildFetchSettings)(requestOptions);
        return source.fetch(source.relatedResourceURL(record.type, record.id, relationship), settings);
    },
    findRelatedRecords: function (source, query) {
        var expression = query.expression;
        var record = expression.record,
            relationship = expression.relationship;

        var requestOptions = (0, _requestSettings.customRequestOptions)(source, query);
        var settings = (0, _requestSettings.buildFetchSettings)(requestOptions);
        return source.fetch(source.relatedResourceURL(record.type, record.id, relationship), settings);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9hYnN0cmFjdC1vcGVyYXRvcnMuanMiXSwibmFtZXMiOlsiQWJzdHJhY3RPcGVyYXRvcnMiLCJleHByZXNzaW9uIiwicXVlcnkiLCJyZXF1ZXN0T3B0aW9ucyIsImN1c3RvbVJlcXVlc3RPcHRpb25zIiwic2V0dGluZ3MiLCJidWlsZEZldGNoU2V0dGluZ3MiLCJzb3VyY2UiLCJyZWNvcmQiLCJidWlsZEZpbHRlclBhcmFtIiwiYnVpbGRTb3J0UGFyYW0iLCJjdXN0b21PcHRpb25zIiwibWVyZ2UiLCJmaWx0ZXJzIiwiZmlsdGVyU3BlY2lmaWVycyIsImZpbHRlclNwZWNpZmllciIsImF0dHJpYnV0ZUZpbHRlciIsInJlc291cmNlQXR0cmlidXRlIiwicmVsYXRlZFJlY29yZEZpbHRlciIsIkFycmF5IiwiZSIsInJlbGF0ZWRSZWNvcmRzRmlsdGVyIiwic29ydFNwZWNpZmllciIsImF0dHJpYnV0ZVNvcnQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUNBOztBQUNBOztBQUNPLElBQU1BLGdEQUFvQjtBQUFBLGdCQUFBLFVBQUEsTUFBQSxFQUFBLEtBQUEsRUFDSDtBQUN0QixZQUFNQyxhQUFhQyxNQUFuQixVQUFBO0FBRHNCLFlBQUEsU0FBQSxXQUFBLE1BQUE7O0FBR3RCLFlBQU1DLGlCQUFpQkMsMkNBQUFBLE1BQUFBLEVBQXZCLEtBQXVCQSxDQUF2QjtBQUNBLFlBQU1DLFdBQVdDLHlDQUFqQixjQUFpQkEsQ0FBakI7QUFDQSxlQUFPQyxPQUFBQSxLQUFBQSxDQUFhQSxPQUFBQSxXQUFBQSxDQUFtQkMsT0FBbkJELElBQUFBLEVBQWdDQyxPQUE3Q0QsRUFBYUEsQ0FBYkEsRUFBUCxRQUFPQSxDQUFQO0FBTnlCLEtBQUE7QUFBQSxpQkFBQSxVQUFBLE1BQUEsRUFBQSxLQUFBLEVBUUY7QUFDdkIsWUFBTU4sYUFBYUMsTUFBbkIsVUFBQTtBQUR1QixZQUFBLE9BQUEsV0FBQSxJQUFBOztBQUd2QixZQUFJQyxpQkFBSixFQUFBO0FBQ0EsWUFBSUYs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SUFBQSxDQUFQLEdBQU8sQ0FBUDtBQVNIIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgbWVyZ2UgfSBmcm9tICdAb3JiaXQvdXRpbHMnO1xuaW1wb3J0IHsgUXVlcnlFeHByZXNzaW9uUGFyc2VFcnJvciB9IGZyb20gJ0BvcmJpdC9kYXRhJztcbmltcG9ydCB7IGJ1aWxkRmV0Y2hTZXR0aW5ncywgY3VzdG9tUmVxdWVzdE9wdGlvbnMgfSBmcm9tICcuL3JlcXVlc3Qtc2V0dGluZ3MnO1xuZXhwb3J0IGNvbnN0IEFic3RyYWN0T3BlcmF0b3JzID0ge1xuICAgIGZpbmRSZWNvcmQoc291cmNlLCBxdWVyeSkge1xuICAgICAgICBjb25zdCBleHByZXNzaW9uID0gcXVlcnkuZXhwcmVzc2lvbjtcbiAgICAgICAgY29uc3QgeyByZWNvcmQgfSA9IGV4cHJlc3Npb247XG4gICAgICAgIGNvbnN0IHJlcXVlc3RPcHRpb25zID0gY3VzdG9tUmVxdWVzdE9wdGlvbnMoc291cmNlLCBxdWVyeSk7XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gYnVpbGRGZXRjaFNldHRpbmdzKHJlcXVlc3RPcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5mZXRjaChzb3VyY2UucmVzb3VyY2VVUkwocmVjb3JkLnR5cGUsIHJlY29yZC5pZCksIHNldHRpbmdzKTtcbiAgICB9LFxuICAgIGZpbmRSZWNvcmRzKHNvdXJjZSwgcXVlcnkpIHtcbiAgICAgICAgY29uc3QgZXhwcmVzc2lvbiA9IHF1ZXJ5LmV4cHJlc3Npb247XG4gICAgICAgIGNvbnN0IHsgdHlwZSB9ID0gZXhwcmVzc2lvbjtcbiAgICAgICAgbGV0IHJlcXVlc3RPcHRpb25zID0ge307XG4gICAgICAgIGlmIChleHByZXNzaW9uLmZpbHRlcikge1xuICAgICAgICAgICAgcmVxdWVzdE9wdGlvbnMuZmlsdGVyID0gYnVpbGRGaWx0ZXJQYXJhbShzb3VyY2UsIGV4cHJlc3Npb24uZmlsdGVyKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZXhwcmVzc2lvbi5zb3J0KSB7XG4gICAgICAgICAgICByZXF1ZXN0T3B0aW9ucy5zb3J0ID0gYnVpbGRTb3J0UGFyYW0oc291cmNlLCBleHByZXNzaW9uLnNvcnQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChleHByZXNzaW9uLnBhZ2UpIHtcbiAgICAgICAgICAgIHJlcXVlc3RPcHRpb25zLnBhZ2UgPSBleHByZXNzaW9uLnBhZ2U7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGN1c3RvbU9wdGlvbnMgPSBjdXN0b21SZXF1ZXN0T3B0aW9ucyhzb3VyY2UsIHF1ZXJ5KTtcbiAgICAgICAgaWYgKGN1c3RvbU9wdGlvbnMpIHtcbiAgICAgICAgICAgIG1lcmdlKHJlcXVlc3RPcHRpb25zLCBjdXN0b21PcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGJ1aWxkRmV0Y2hTZXR0aW5ncyhyZXF1ZXN0T3B0aW9ucyk7XG4gICAgICAgIHJldHVybiBzb3VyY2UuZmV0Y2goc291cmNlLnJlc291cmNlVVJMKHR5cGUpLCBzZXR0aW5ncyk7XG4gICAgfSxcbiAgICBmaW5kUmVsYXRlZFJlY29yZChzb3VyY2UsIHF1ZXJ5KSB7XG4gICAgICAgIGNvbnN0IGV4cHJlc3Npb24gPSBxdWVyeS5leHByZXNzaW9uO1xuICAgICAgICBjb25zdCB7IHJlY29yZCwgcmVsYXRpb25zaGlwIH0gPSBleHByZXNzaW9uO1xuICAgICAgICBjb25zdCByZXF1ZXN0T3B0aW9ucyA9IGN1c3RvbVJlcXVlc3RPcHRpb25zKHNvdXJjZSwgcXVlcnkpO1xuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGJ1aWxkRmV0Y2hTZXR0aW5ncyhyZXF1ZXN0T3B0aW9ucyk7XG4gICAgICAgIHJldHVybiBzb3VyY2UuZmV0Y2goc291cmNlLnJlbGF0ZWRSZXNvdXJjZVVSTChyZWNvcmQudHlwZSwgcmVjb3JkLmlkLCByZWxhdGlvbnNoaXApLCBzZXR0aW5ncyk7XG4gICAgfSxcbiAgICBmaW5kUmVsYXRlZFJlY29yZHMoc291cmNlLCBxdWVyeSkge1xuICAgICAgICBjb25zdCBleHByZXNzaW9uID0gcXVlcnkuZXhwcmVzc2lvbjtcbiAgICAgICAgY29uc3QgeyByZWNvcmQsIHJlbGF0aW9uc2hpcCB9ID0gZXhwcmVzc2lvbjtcbiAgICAgICAgbGV0IHJlcXVlc3RPcHRpb25zID0gY3VzdG9tUmVxdWVzdE9wdGlvbnMoc291cmNlLCBxdWVyeSk7XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gYnVpbGRGZXRjaFNldHRpbmdzKHJlcXVlc3RPcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5mZXRjaChzb3VyY2UucmVsYXRlZFJlc291cmNlVVJMKHJlY29yZC50eXBlLCByZWNvcmQuaWQsIHJlbGF0aW9uc2hpcCksIHNldHRpbmdzKTtcbiAgICB9XG59O1xuZnVuY3Rpb24gYnVpbGRGaWx0ZXJQYXJhbShzb3VyY2UsIGZpbHRlclNwZWNpZmllcnMpIHtcbiAgICBjb25zdCBmaWx0ZXJzID0ge307XG4gICAgZmlsdGVyU3BlY2lmaWVycy5mb3JFYWNoKGZpbHRlclNwZWNpZmllciA9PiB7XG4gICAgICAgIGlmIChmaWx0ZXJTcGVjaWZpZXIua2luZCA9PT0gJ2F0dHJpYnV0ZScgJiYgZmlsdGVyU3BlY2lmaWVyLm9wID09PSAnZXF1YWwnKSB7XG4gICAgICAgICAgICBjb25zdCBhdHRyaWJ1dGVGaWx0ZXIgPSBmaWx0ZXJTcGVjaWZpZXI7XG4gICAgICAgICAgICAvLyBOb3RlOiBXZSBkb24ndCBrbm93IHRoZSBgdHlwZWAgb2YgdGhlIGF0dHJpYnV0ZSBoZXJlLCBzbyBwYXNzaW5nIGBudWxsYFxuICAgICAgICAgICAgY29uc3QgcmVzb3VyY2VBdHRyaWJ1dGUgPSBzb3VyY2Uuc2VyaWFsaXplci5yZXNvdXJjZUF0dHJpYnV0ZShudWxsLCBhdHRyaWJ1dGVGaWx0ZXIuYXR0cmlidXRlKTtcbiAgICAgICAgICAgIGZpbHRlcnNbcmVzb3VyY2VBdHRyaWJ1dGVdID0gYXR0cmlidXRlRmlsdGVyLnZhbHVlO1xuICAgICAgICB9IGVsc2UgaWYgKGZpbHRlclNwZWNpZmllci5raW5kID09PSAncmVsYXRlZFJlY29yZCcpIHtcbiAgICAgICAgICAgIGNvbnN0IHJlbGF0ZWRSZWNvcmRGaWx0ZXIgPSBmaWx0ZXJTcGVjaWZpZXI7XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShyZWxhdGVkUmVjb3JkRmlsdGVyLnJlY29yZCkpIHtcbiAgICAgICAgICAgICAgICBmaWx0ZXJzW3JlbGF0ZWRSZWNvcmRGaWx0ZXIucmVsYXRpb25dID0gcmVsYXRlZFJlY29yZEZpbHRlci5yZWNvcmQubWFwKGUgPT4gZS5pZCkuam9pbignLCcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmaWx0ZXJzW3JlbGF0ZWRSZWNvcmRGaWx0ZXIucmVsYXRpb25dID0gcmVsYXRlZFJlY29yZEZpbHRlci5yZWNvcmQuaWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoZmlsdGVyU3BlY2lmaWVyLmtpbmQgPT09ICdyZWxhdGVkUmVjb3JkcycpIHtcbiAgICAgICAgICAgIGlmIChmaWx0ZXJTcGVjaWZpZXIub3AgIT09ICdlcXVhbCcpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE9wZXJhdGlvbiBcIiR7ZmlsdGVyU3BlY2lmaWVyLm9wfVwiIGlzIG5vdCBzdXBwb3J0ZWQgaW4gSlNPTkFQSSBmb3IgcmVsYXRlZFJlY29yZHMgZmlsdGVyaW5nYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCByZWxhdGVkUmVjb3Jkc0ZpbHRlciA9IGZpbHRlclNwZWNpZmllcjtcbiAgICAgICAgICAgIGZpbHRlcnNbcmVsYXRlZFJlY29yZHNGaWx0ZXIucmVsYXRpb25dID0gcmVsYXRlZFJlY29yZHNGaWx0ZXIucmVjb3Jkcy5tYXAoZSA9PiBlLmlkKS5qb2luKCcsJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgUXVlcnlFeHByZXNzaW9uUGFyc2VFcnJvcihgRmlsdGVyIG9wZXJhdGlvbiAke2ZpbHRlclNwZWNpZmllci5vcH0gbm90IHJlY29nbml6ZWQgZm9yIEpTT05BUElTb3VyY2UuYCwgZmlsdGVyU3BlY2lmaWVyKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBmaWx0ZXJzO1xufVxuZnVuY3Rpb24gYnVpbGRTb3J0UGFyYW0oc291cmNlLCBzb3J0U3BlY2lmaWVycykge1xuICAgIHJldHVybiBzb3J0U3BlY2lmaWVycy5tYXAoc29ydFNwZWNpZmllciA9PiB7XG4gICAgICAgIGlmIChzb3J0U3BlY2lmaWVyLmtpbmQgPT09ICdhdHRyaWJ1dGUnKSB7XG4gICAgICAgICAgICBjb25zdCBhdHRyaWJ1dGVTb3J0ID0gc29ydFNwZWNpZmllcjtcbiAgICAgICAgICAgIC8vIE5vdGU6IFdlIGRvbid0IGtub3cgdGhlIGB0eXBlYCBvZiB0aGUgYXR0cmlidXRlIGhlcmUsIHNvIHBhc3NpbmcgYG51bGxgXG4gICAgICAgICAgICBjb25zdCByZXNvdXJjZUF0dHJpYnV0ZSA9IHNvdXJjZS5zZXJpYWxpemVyLnJlc291cmNlQXR0cmlidXRlKG51bGwsIGF0dHJpYnV0ZVNvcnQuYXR0cmlidXRlKTtcbiAgICAgICAgICAgIHJldHVybiAoc29ydFNwZWNpZmllci5vcmRlciA9PT0gJ2Rlc2NlbmRpbmcnID8gJy0nIDogJycpICsgcmVzb3VyY2VBdHRyaWJ1dGU7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IFF1ZXJ5RXhwcmVzc2lvblBhcnNlRXJyb3IoYFNvcnQgc3BlY2lmaWVyICR7c29ydFNwZWNpZmllci5raW5kfSBub3QgcmVjb2duaXplZCBmb3IgSlNPTkFQSVNvdXJjZS5gLCBzb3J0U3BlY2lmaWVyKTtcbiAgICB9KS5qb2luKCcsJyk7XG59Il19