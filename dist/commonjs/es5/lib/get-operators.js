'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.GetOperators = undefined;

var _utils = require('@orbit/utils');

var _data = require('@orbit/data');

var _requestSettings = require('./request-settings');

var GetOperators = exports.GetOperators = {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9nZXQtb3BlcmF0b3JzLmpzIl0sIm5hbWVzIjpbIkdldE9wZXJhdG9ycyIsImV4cHJlc3Npb24iLCJxdWVyeSIsInJlcXVlc3RPcHRpb25zIiwiY3VzdG9tUmVxdWVzdE9wdGlvbnMiLCJzZXR0aW5ncyIsImJ1aWxkRmV0Y2hTZXR0aW5ncyIsInNvdXJjZSIsInJlY29yZCIsImJ1aWxkRmlsdGVyUGFyYW0iLCJidWlsZFNvcnRQYXJhbSIsImN1c3RvbU9wdGlvbnMiLCJtZXJnZSIsImZpbHRlcnMiLCJmaWx0ZXJTcGVjaWZpZXJzIiwiZmlsdGVyU3BlY2lmaWVyIiwiYXR0cmlidXRlRmlsdGVyIiwicmVzb3VyY2VBdHRyaWJ1dGUiLCJyZWxhdGVkUmVjb3JkRmlsdGVyIiwiQXJyYXkiLCJlIiwicmVsYXRlZFJlY29yZHNGaWx0ZXIiLCJzb3J0U3BlY2lmaWVyIiwiYXR0cmlidXRlU29ydCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQ0E7O0FBQ0E7O0FBQ08sSUFBTUEsc0NBQWU7QUFBQSxnQkFBQSxVQUFBLE1BQUEsRUFBQSxLQUFBLEVBQ0U7QUFDdEIsWUFBTUMsYUFBYUMsTUFBbkIsVUFBQTtBQURzQixZQUFBLFNBQUEsV0FBQSxNQUFBOztBQUd0QixZQUFNQyxpQkFBaUJDLDJDQUFBQSxNQUFBQSxFQUF2QixLQUF1QkEsQ0FBdkI7QUFDQSxZQUFNQyxXQUFXQyx5Q0FBakIsY0FBaUJBLENBQWpCO0FBQ0EsZUFBT0MsT0FBQUEsS0FBQUEsQ0FBYUEsT0FBQUEsV0FBQUEsQ0FBbUJDLE9BQW5CRCxJQUFBQSxFQUFnQ0MsT0FBN0NELEVBQWFBLENBQWJBLEVBQVAsUUFBT0EsQ0FBUDtBQU5vQixLQUFBO0FBQUEsaUJBQUEsVUFBQSxNQUFBLEVBQUEsS0FBQSxFQVFHO0FBQ3ZCLFlBQU1OLGFBQWFDLE1BQW5CLFVBQUE7QUFEdUIsWUFBQSxPQUFBLFdBQUEsSUFBQTs7QUFHdkIsWUFBSUMsaUJBQUosRUFBQTtBQUNBLFlBQUlGLFdBQUosTUFBQSxF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QUFPLENBQVA7QUFTSCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IG1lcmdlIH0gZnJvbSAnQG9yYml0L3V0aWxzJztcbmltcG9ydCB7IFF1ZXJ5RXhwcmVzc2lvblBhcnNlRXJyb3IgfSBmcm9tICdAb3JiaXQvZGF0YSc7XG5pbXBvcnQgeyBidWlsZEZldGNoU2V0dGluZ3MsIGN1c3RvbVJlcXVlc3RPcHRpb25zIH0gZnJvbSAnLi9yZXF1ZXN0LXNldHRpbmdzJztcbmV4cG9ydCBjb25zdCBHZXRPcGVyYXRvcnMgPSB7XG4gICAgZmluZFJlY29yZChzb3VyY2UsIHF1ZXJ5KSB7XG4gICAgICAgIGNvbnN0IGV4cHJlc3Npb24gPSBxdWVyeS5leHByZXNzaW9uO1xuICAgICAgICBjb25zdCB7IHJlY29yZCB9ID0gZXhwcmVzc2lvbjtcbiAgICAgICAgY29uc3QgcmVxdWVzdE9wdGlvbnMgPSBjdXN0b21SZXF1ZXN0T3B0aW9ucyhzb3VyY2UsIHF1ZXJ5KTtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBidWlsZEZldGNoU2V0dGluZ3MocmVxdWVzdE9wdGlvbnMpO1xuICAgICAgICByZXR1cm4gc291cmNlLmZldGNoKHNvdXJjZS5yZXNvdXJjZVVSTChyZWNvcmQudHlwZSwgcmVjb3JkLmlkKSwgc2V0dGluZ3MpO1xuICAgIH0sXG4gICAgZmluZFJlY29yZHMoc291cmNlLCBxdWVyeSkge1xuICAgICAgICBjb25zdCBleHByZXNzaW9uID0gcXVlcnkuZXhwcmVzc2lvbjtcbiAgICAgICAgY29uc3QgeyB0eXBlIH0gPSBleHByZXNzaW9uO1xuICAgICAgICBsZXQgcmVxdWVzdE9wdGlvbnMgPSB7fTtcbiAgICAgICAgaWYgKGV4cHJlc3Npb24uZmlsdGVyKSB7XG4gICAgICAgICAgICByZXF1ZXN0T3B0aW9ucy5maWx0ZXIgPSBidWlsZEZpbHRlclBhcmFtKHNvdXJjZSwgZXhwcmVzc2lvbi5maWx0ZXIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChleHByZXNzaW9uLnNvcnQpIHtcbiAgICAgICAgICAgIHJlcXVlc3RPcHRpb25zLnNvcnQgPSBidWlsZFNvcnRQYXJhbShzb3VyY2UsIGV4cHJlc3Npb24uc29ydCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGV4cHJlc3Npb24ucGFnZSkge1xuICAgICAgICAgICAgcmVxdWVzdE9wdGlvbnMucGFnZSA9IGV4cHJlc3Npb24ucGFnZTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgY3VzdG9tT3B0aW9ucyA9IGN1c3RvbVJlcXVlc3RPcHRpb25zKHNvdXJjZSwgcXVlcnkpO1xuICAgICAgICBpZiAoY3VzdG9tT3B0aW9ucykge1xuICAgICAgICAgICAgbWVyZ2UocmVxdWVzdE9wdGlvbnMsIGN1c3RvbU9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gYnVpbGRGZXRjaFNldHRpbmdzKHJlcXVlc3RPcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5mZXRjaChzb3VyY2UucmVzb3VyY2VVUkwodHlwZSksIHNldHRpbmdzKTtcbiAgICB9LFxuICAgIGZpbmRSZWxhdGVkUmVjb3JkKHNvdXJjZSwgcXVlcnkpIHtcbiAgICAgICAgY29uc3QgZXhwcmVzc2lvbiA9IHF1ZXJ5LmV4cHJlc3Npb247XG4gICAgICAgIGNvbnN0IHsgcmVjb3JkLCByZWxhdGlvbnNoaXAgfSA9IGV4cHJlc3Npb247XG4gICAgICAgIGNvbnN0IHJlcXVlc3RPcHRpb25zID0gY3VzdG9tUmVxdWVzdE9wdGlvbnMoc291cmNlLCBxdWVyeSk7XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gYnVpbGRGZXRjaFNldHRpbmdzKHJlcXVlc3RPcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5mZXRjaChzb3VyY2UucmVsYXRlZFJlc291cmNlVVJMKHJlY29yZC50eXBlLCByZWNvcmQuaWQsIHJlbGF0aW9uc2hpcCksIHNldHRpbmdzKTtcbiAgICB9LFxuICAgIGZpbmRSZWxhdGVkUmVjb3Jkcyhzb3VyY2UsIHF1ZXJ5KSB7XG4gICAgICAgIGNvbnN0IGV4cHJlc3Npb24gPSBxdWVyeS5leHByZXNzaW9uO1xuICAgICAgICBjb25zdCB7IHJlY29yZCwgcmVsYXRpb25zaGlwIH0gPSBleHByZXNzaW9uO1xuICAgICAgICBsZXQgcmVxdWVzdE9wdGlvbnMgPSBjdXN0b21SZXF1ZXN0T3B0aW9ucyhzb3VyY2UsIHF1ZXJ5KTtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBidWlsZEZldGNoU2V0dGluZ3MocmVxdWVzdE9wdGlvbnMpO1xuICAgICAgICByZXR1cm4gc291cmNlLmZldGNoKHNvdXJjZS5yZWxhdGVkUmVzb3VyY2VVUkwocmVjb3JkLnR5cGUsIHJlY29yZC5pZCwgcmVsYXRpb25zaGlwKSwgc2V0dGluZ3MpO1xuICAgIH1cbn07XG5mdW5jdGlvbiBidWlsZEZpbHRlclBhcmFtKHNvdXJjZSwgZmlsdGVyU3BlY2lmaWVycykge1xuICAgIGNvbnN0IGZpbHRlcnMgPSB7fTtcbiAgICBmaWx0ZXJTcGVjaWZpZXJzLmZvckVhY2goZmlsdGVyU3BlY2lmaWVyID0+IHtcbiAgICAgICAgaWYgKGZpbHRlclNwZWNpZmllci5raW5kID09PSAnYXR0cmlidXRlJyAmJiBmaWx0ZXJTcGVjaWZpZXIub3AgPT09ICdlcXVhbCcpIHtcbiAgICAgICAgICAgIGNvbnN0IGF0dHJpYnV0ZUZpbHRlciA9IGZpbHRlclNwZWNpZmllcjtcbiAgICAgICAgICAgIC8vIE5vdGU6IFdlIGRvbid0IGtub3cgdGhlIGB0eXBlYCBvZiB0aGUgYXR0cmlidXRlIGhlcmUsIHNvIHBhc3NpbmcgYG51bGxgXG4gICAgICAgICAgICBjb25zdCByZXNvdXJjZUF0dHJpYnV0ZSA9IHNvdXJjZS5zZXJpYWxpemVyLnJlc291cmNlQXR0cmlidXRlKG51bGwsIGF0dHJpYnV0ZUZpbHRlci5hdHRyaWJ1dGUpO1xuICAgICAgICAgICAgZmlsdGVyc1tyZXNvdXJjZUF0dHJpYnV0ZV0gPSBhdHRyaWJ1dGVGaWx0ZXIudmFsdWU7XG4gICAgICAgIH0gZWxzZSBpZiAoZmlsdGVyU3BlY2lmaWVyLmtpbmQgPT09ICdyZWxhdGVkUmVjb3JkJykge1xuICAgICAgICAgICAgY29uc3QgcmVsYXRlZFJlY29yZEZpbHRlciA9IGZpbHRlclNwZWNpZmllcjtcbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHJlbGF0ZWRSZWNvcmRGaWx0ZXIucmVjb3JkKSkge1xuICAgICAgICAgICAgICAgIGZpbHRlcnNbcmVsYXRlZFJlY29yZEZpbHRlci5yZWxhdGlvbl0gPSByZWxhdGVkUmVjb3JkRmlsdGVyLnJlY29yZC5tYXAoZSA9PiBlLmlkKS5qb2luKCcsJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZpbHRlcnNbcmVsYXRlZFJlY29yZEZpbHRlci5yZWxhdGlvbl0gPSByZWxhdGVkUmVjb3JkRmlsdGVyLnJlY29yZC5pZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChmaWx0ZXJTcGVjaWZpZXIua2luZCA9PT0gJ3JlbGF0ZWRSZWNvcmRzJykge1xuICAgICAgICAgICAgaWYgKGZpbHRlclNwZWNpZmllci5vcCAhPT0gJ2VxdWFsJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgT3BlcmF0aW9uIFwiJHtmaWx0ZXJTcGVjaWZpZXIub3B9XCIgaXMgbm90IHN1cHBvcnRlZCBpbiBKU09OQVBJIGZvciByZWxhdGVkUmVjb3JkcyBmaWx0ZXJpbmdgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHJlbGF0ZWRSZWNvcmRzRmlsdGVyID0gZmlsdGVyU3BlY2lmaWVyO1xuICAgICAgICAgICAgZmlsdGVyc1tyZWxhdGVkUmVjb3Jkc0ZpbHRlci5yZWxhdGlvbl0gPSByZWxhdGVkUmVjb3Jkc0ZpbHRlci5yZWNvcmRzLm1hcChlID0+IGUuaWQpLmpvaW4oJywnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBRdWVyeUV4cHJlc3Npb25QYXJzZUVycm9yKGBGaWx0ZXIgb3BlcmF0aW9uICR7ZmlsdGVyU3BlY2lmaWVyLm9wfSBub3QgcmVjb2duaXplZCBmb3IgSlNPTkFQSVNvdXJjZS5gLCBmaWx0ZXJTcGVjaWZpZXIpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGZpbHRlcnM7XG59XG5mdW5jdGlvbiBidWlsZFNvcnRQYXJhbShzb3VyY2UsIHNvcnRTcGVjaWZpZXJzKSB7XG4gICAgcmV0dXJuIHNvcnRTcGVjaWZpZXJzLm1hcChzb3J0U3BlY2lmaWVyID0+IHtcbiAgICAgICAgaWYgKHNvcnRTcGVjaWZpZXIua2luZCA9PT0gJ2F0dHJpYnV0ZScpIHtcbiAgICAgICAgICAgIGNvbnN0IGF0dHJpYnV0ZVNvcnQgPSBzb3J0U3BlY2lmaWVyO1xuICAgICAgICAgICAgLy8gTm90ZTogV2UgZG9uJ3Qga25vdyB0aGUgYHR5cGVgIG9mIHRoZSBhdHRyaWJ1dGUgaGVyZSwgc28gcGFzc2luZyBgbnVsbGBcbiAgICAgICAgICAgIGNvbnN0IHJlc291cmNlQXR0cmlidXRlID0gc291cmNlLnNlcmlhbGl6ZXIucmVzb3VyY2VBdHRyaWJ1dGUobnVsbCwgYXR0cmlidXRlU29ydC5hdHRyaWJ1dGUpO1xuICAgICAgICAgICAgcmV0dXJuIChzb3J0U3BlY2lmaWVyLm9yZGVyID09PSAnZGVzY2VuZGluZycgPyAnLScgOiAnJykgKyByZXNvdXJjZUF0dHJpYnV0ZTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgUXVlcnlFeHByZXNzaW9uUGFyc2VFcnJvcihgU29ydCBzcGVjaWZpZXIgJHtzb3J0U3BlY2lmaWVyLmtpbmR9IG5vdCByZWNvZ25pemVkIGZvciBKU09OQVBJU291cmNlLmAsIHNvcnRTcGVjaWZpZXIpO1xuICAgIH0pLmpvaW4oJywnKTtcbn0iXX0=