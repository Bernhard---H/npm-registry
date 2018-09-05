'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.AbstractOperators = undefined;

var _utils = require('@orbit/utils');

var _data = require('@orbit/data');

var _requestSettings = require('./request-settings');

const AbstractOperators = exports.AbstractOperators = {
    findRecord(source, query) {
        const expression = query.expression;
        const { record } = expression;
        const requestOptions = (0, _requestSettings.customRequestOptions)(source, query);
        const settings = (0, _requestSettings.buildFetchSettings)(requestOptions);
        return source.fetch(source.resourceURL(record.type, record.id), settings);
    },
    findRecords(source, query) {
        const expression = query.expression;
        const { type } = expression;
        let requestOptions = {};
        if (expression.filter) {
            requestOptions.filter = buildFilterParam(source, expression.filter);
        }
        if (expression.sort) {
            requestOptions.sort = buildSortParam(source, expression.sort);
        }
        if (expression.page) {
            requestOptions.page = expression.page;
        }
        let customOptions = (0, _requestSettings.customRequestOptions)(source, query);
        if (customOptions) {
            (0, _utils.merge)(requestOptions, customOptions);
        }
        const settings = (0, _requestSettings.buildFetchSettings)(requestOptions);
        return source.fetch(source.resourceURL(type), settings);
    },
    findRelatedRecord(source, query) {
        const expression = query.expression;
        const { record, relationship } = expression;
        const requestOptions = (0, _requestSettings.customRequestOptions)(source, query);
        const settings = (0, _requestSettings.buildFetchSettings)(requestOptions);
        return source.fetch(source.relatedResourceURL(record.type, record.id, relationship), settings);
    },
    findRelatedRecords(source, query) {
        const expression = query.expression;
        const { record, relationship } = expression;
        let requestOptions = (0, _requestSettings.customRequestOptions)(source, query);
        const settings = (0, _requestSettings.buildFetchSettings)(requestOptions);
        return source.fetch(source.relatedResourceURL(record.type, record.id, relationship), settings);
    }
};
function buildFilterParam(source, filterSpecifiers) {
    const filters = {};
    filterSpecifiers.forEach(filterSpecifier => {
        if (filterSpecifier.kind === 'attribute' && filterSpecifier.op === 'equal') {
            const attributeFilter = filterSpecifier;
            // Note: We don't know the `type` of the attribute here, so passing `null`
            const resourceAttribute = source.serializer.resourceAttribute(null, attributeFilter.attribute);
            filters[resourceAttribute] = attributeFilter.value;
        } else if (filterSpecifier.kind === 'relatedRecord') {
            const relatedRecordFilter = filterSpecifier;
            if (Array.isArray(relatedRecordFilter.record)) {
                filters[relatedRecordFilter.relation] = relatedRecordFilter.record.map(e => e.id).join(',');
            } else {
                filters[relatedRecordFilter.relation] = relatedRecordFilter.record.id;
            }
        } else if (filterSpecifier.kind === 'relatedRecords') {
            if (filterSpecifier.op !== 'equal') {
                throw new Error(`Operation "${filterSpecifier.op}" is not supported in JSONAPI for relatedRecords filtering`);
            }
            const relatedRecordsFilter = filterSpecifier;
            filters[relatedRecordsFilter.relation] = relatedRecordsFilter.records.map(e => e.id).join(',');
        } else {
            throw new _data.QueryExpressionParseError(`Filter operation ${filterSpecifier.op} not recognized for JSONAPISource.`, filterSpecifier);
        }
    });
    return filters;
}
function buildSortParam(source, sortSpecifiers) {
    return sortSpecifiers.map(sortSpecifier => {
        if (sortSpecifier.kind === 'attribute') {
            const attributeSort = sortSpecifier;
            // Note: We don't know the `type` of the attribute here, so passing `null`
            const resourceAttribute = source.serializer.resourceAttribute(null, attributeSort.attribute);
            return (sortSpecifier.order === 'descending' ? '-' : '') + resourceAttribute;
        }
        throw new _data.QueryExpressionParseError(`Sort specifier ${sortSpecifier.kind} not recognized for JSONAPISource.`, sortSpecifier);
    }).join(',');
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9hYnN0cmFjdC1vcGVyYXRvcnMuanMiXSwibmFtZXMiOlsiQWJzdHJhY3RPcGVyYXRvcnMiLCJmaW5kUmVjb3JkIiwic291cmNlIiwicXVlcnkiLCJleHByZXNzaW9uIiwicmVjb3JkIiwicmVxdWVzdE9wdGlvbnMiLCJzZXR0aW5ncyIsImZldGNoIiwicmVzb3VyY2VVUkwiLCJ0eXBlIiwiaWQiLCJmaW5kUmVjb3JkcyIsImZpbHRlciIsImJ1aWxkRmlsdGVyUGFyYW0iLCJzb3J0IiwiYnVpbGRTb3J0UGFyYW0iLCJwYWdlIiwiY3VzdG9tT3B0aW9ucyIsImZpbmRSZWxhdGVkUmVjb3JkIiwicmVsYXRpb25zaGlwIiwicmVsYXRlZFJlc291cmNlVVJMIiwiZmluZFJlbGF0ZWRSZWNvcmRzIiwiZmlsdGVyU3BlY2lmaWVycyIsImZpbHRlcnMiLCJmb3JFYWNoIiwiZmlsdGVyU3BlY2lmaWVyIiwia2luZCIsIm9wIiwiYXR0cmlidXRlRmlsdGVyIiwicmVzb3VyY2VBdHRyaWJ1dGUiLCJzZXJpYWxpemVyIiwiYXR0cmlidXRlIiwidmFsdWUiLCJyZWxhdGVkUmVjb3JkRmlsdGVyIiwiQXJyYXkiLCJpc0FycmF5IiwicmVsYXRpb24iLCJtYXAiLCJlIiwiam9pbiIsIkVycm9yIiwicmVsYXRlZFJlY29yZHNGaWx0ZXIiLCJyZWNvcmRzIiwiUXVlcnlFeHByZXNzaW9uUGFyc2VFcnJvciIsInNvcnRTcGVjaWZpZXJzIiwic29ydFNwZWNpZmllciIsImF0dHJpYnV0ZVNvcnQiLCJvcmRlciJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOztBQUNBOztBQUNBOztBQUNPLE1BQU1BLGdEQUFvQjtBQUM3QkMsZUFBV0MsTUFBWCxFQUFtQkMsS0FBbkIsRUFBMEI7QUFDdEIsY0FBTUMsYUFBYUQsTUFBTUMsVUFBekI7QUFDQSxjQUFNLEVBQUVDLE1BQUYsS0FBYUQsVUFBbkI7QUFDQSxjQUFNRSxpQkFBaUIsMkNBQXFCSixNQUFyQixFQUE2QkMsS0FBN0IsQ0FB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LGtCQUFNb0IsZ0JBQWdCRCxhQUF0QjtBQUNBO0FBQ0Esa0JBQU1oQixvQkFBb0I1QixPQUFPNkIsVUFBUCxDQUFrQkQsaUJBQWxCLENBQW9DLElBQXBDLEVBQTBDaUIsY0FBY2YsU0FBeEQsQ0FBMUI7QUFDQSxtQkFBTyxDQUFDYyxjQUFjRSxLQUFkLEtBQXdCLFlBQXhCLEdBQXVDLEdBQXZDLEdBQTZDLEVBQTlDLElBQW9EbEIsaUJBQTNEO0FBQ0g7QUFDRCxjQUFNLElBQUljLCtCQUFKLENBQStCLGtCQUFpQkUsY0FBY25CLElBQUssb0NBQW5FLEVBQXdHbUIsYUFBeEcsQ0FBTjtBQUNILEtBUk0sRUFRSk4sSUFSSSxDQVFDLEdBUkQsQ0FBUDtBQVNIIiwiZmlsZSI6ImxpYi9hYnN0cmFjdC1vcGVyYXRvcnMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBtZXJnZSB9IGZyb20gJ0BvcmJpdC91dGlscyc7XG5pbXBvcnQgeyBRdWVyeUV4cHJlc3Npb25QYXJzZUVycm9yIH0gZnJvbSAnQG9yYml0L2RhdGEnO1xuaW1wb3J0IHsgYnVpbGRGZXRjaFNldHRpbmdzLCBjdXN0b21SZXF1ZXN0T3B0aW9ucyB9IGZyb20gJy4vcmVxdWVzdC1zZXR0aW5ncyc7XG5leHBvcnQgY29uc3QgQWJzdHJhY3RPcGVyYXRvcnMgPSB7XG4gICAgZmluZFJlY29yZChzb3VyY2UsIHF1ZXJ5KSB7XG4gICAgICAgIGNvbnN0IGV4cHJlc3Npb24gPSBxdWVyeS5leHByZXNzaW9uO1xuICAgICAgICBjb25zdCB7IHJlY29yZCB9ID0gZXhwcmVzc2lvbjtcbiAgICAgICAgY29uc3QgcmVxdWVzdE9wdGlvbnMgPSBjdXN0b21SZXF1ZXN0T3B0aW9ucyhzb3VyY2UsIHF1ZXJ5KTtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBidWlsZEZldGNoU2V0dGluZ3MocmVxdWVzdE9wdGlvbnMpO1xuICAgICAgICByZXR1cm4gc291cmNlLmZldGNoKHNvdXJjZS5yZXNvdXJjZVVSTChyZWNvcmQudHlwZSwgcmVjb3JkLmlkKSwgc2V0dGluZ3MpO1xuICAgIH0sXG4gICAgZmluZFJlY29yZHMoc291cmNlLCBxdWVyeSkge1xuICAgICAgICBjb25zdCBleHByZXNzaW9uID0gcXVlcnkuZXhwcmVzc2lvbjtcbiAgICAgICAgY29uc3QgeyB0eXBlIH0gPSBleHByZXNzaW9uO1xuICAgICAgICBsZXQgcmVxdWVzdE9wdGlvbnMgPSB7fTtcbiAgICAgICAgaWYgKGV4cHJlc3Npb24uZmlsdGVyKSB7XG4gICAgICAgICAgICByZXF1ZXN0T3B0aW9ucy5maWx0ZXIgPSBidWlsZEZpbHRlclBhcmFtKHNvdXJjZSwgZXhwcmVzc2lvbi5maWx0ZXIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChleHByZXNzaW9uLnNvcnQpIHtcbiAgICAgICAgICAgIHJlcXVlc3RPcHRpb25zLnNvcnQgPSBidWlsZFNvcnRQYXJhbShzb3VyY2UsIGV4cHJlc3Npb24uc29ydCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGV4cHJlc3Npb24ucGFnZSkge1xuICAgICAgICAgICAgcmVxdWVzdE9wdGlvbnMucGFnZSA9IGV4cHJlc3Npb24ucGFnZTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgY3VzdG9tT3B0aW9ucyA9IGN1c3RvbVJlcXVlc3RPcHRpb25zKHNvdXJjZSwgcXVlcnkpO1xuICAgICAgICBpZiAoY3VzdG9tT3B0aW9ucykge1xuICAgICAgICAgICAgbWVyZ2UocmVxdWVzdE9wdGlvbnMsIGN1c3RvbU9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gYnVpbGRGZXRjaFNldHRpbmdzKHJlcXVlc3RPcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5mZXRjaChzb3VyY2UucmVzb3VyY2VVUkwodHlwZSksIHNldHRpbmdzKTtcbiAgICB9LFxuICAgIGZpbmRSZWxhdGVkUmVjb3JkKHNvdXJjZSwgcXVlcnkpIHtcbiAgICAgICAgY29uc3QgZXhwcmVzc2lvbiA9IHF1ZXJ5LmV4cHJlc3Npb247XG4gICAgICAgIGNvbnN0IHsgcmVjb3JkLCByZWxhdGlvbnNoaXAgfSA9IGV4cHJlc3Npb247XG4gICAgICAgIGNvbnN0IHJlcXVlc3RPcHRpb25zID0gY3VzdG9tUmVxdWVzdE9wdGlvbnMoc291cmNlLCBxdWVyeSk7XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gYnVpbGRGZXRjaFNldHRpbmdzKHJlcXVlc3RPcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5mZXRjaChzb3VyY2UucmVsYXRlZFJlc291cmNlVVJMKHJlY29yZC50eXBlLCByZWNvcmQuaWQsIHJlbGF0aW9uc2hpcCksIHNldHRpbmdzKTtcbiAgICB9LFxuICAgIGZpbmRSZWxhdGVkUmVjb3Jkcyhzb3VyY2UsIHF1ZXJ5KSB7XG4gICAgICAgIGNvbnN0IGV4cHJlc3Npb24gPSBxdWVyeS5leHByZXNzaW9uO1xuICAgICAgICBjb25zdCB7IHJlY29yZCwgcmVsYXRpb25zaGlwIH0gPSBleHByZXNzaW9uO1xuICAgICAgICBsZXQgcmVxdWVzdE9wdGlvbnMgPSBjdXN0b21SZXF1ZXN0T3B0aW9ucyhzb3VyY2UsIHF1ZXJ5KTtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBidWlsZEZldGNoU2V0dGluZ3MocmVxdWVzdE9wdGlvbnMpO1xuICAgICAgICByZXR1cm4gc291cmNlLmZldGNoKHNvdXJjZS5yZWxhdGVkUmVzb3VyY2VVUkwocmVjb3JkLnR5cGUsIHJlY29yZC5pZCwgcmVsYXRpb25zaGlwKSwgc2V0dGluZ3MpO1xuICAgIH1cbn07XG5mdW5jdGlvbiBidWlsZEZpbHRlclBhcmFtKHNvdXJjZSwgZmlsdGVyU3BlY2lmaWVycykge1xuICAgIGNvbnN0IGZpbHRlcnMgPSB7fTtcbiAgICBmaWx0ZXJTcGVjaWZpZXJzLmZvckVhY2goZmlsdGVyU3BlY2lmaWVyID0+IHtcbiAgICAgICAgaWYgKGZpbHRlclNwZWNpZmllci5raW5kID09PSAnYXR0cmlidXRlJyAmJiBmaWx0ZXJTcGVjaWZpZXIub3AgPT09ICdlcXVhbCcpIHtcbiAgICAgICAgICAgIGNvbnN0IGF0dHJpYnV0ZUZpbHRlciA9IGZpbHRlclNwZWNpZmllcjtcbiAgICAgICAgICAgIC8vIE5vdGU6IFdlIGRvbid0IGtub3cgdGhlIGB0eXBlYCBvZiB0aGUgYXR0cmlidXRlIGhlcmUsIHNvIHBhc3NpbmcgYG51bGxgXG4gICAgICAgICAgICBjb25zdCByZXNvdXJjZUF0dHJpYnV0ZSA9IHNvdXJjZS5zZXJpYWxpemVyLnJlc291cmNlQXR0cmlidXRlKG51bGwsIGF0dHJpYnV0ZUZpbHRlci5hdHRyaWJ1dGUpO1xuICAgICAgICAgICAgZmlsdGVyc1tyZXNvdXJjZUF0dHJpYnV0ZV0gPSBhdHRyaWJ1dGVGaWx0ZXIudmFsdWU7XG4gICAgICAgIH0gZWxzZSBpZiAoZmlsdGVyU3BlY2lmaWVyLmtpbmQgPT09ICdyZWxhdGVkUmVjb3JkJykge1xuICAgICAgICAgICAgY29uc3QgcmVsYXRlZFJlY29yZEZpbHRlciA9IGZpbHRlclNwZWNpZmllcjtcbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHJlbGF0ZWRSZWNvcmRGaWx0ZXIucmVjb3JkKSkge1xuICAgICAgICAgICAgICAgIGZpbHRlcnNbcmVsYXRlZFJlY29yZEZpbHRlci5yZWxhdGlvbl0gPSByZWxhdGVkUmVjb3JkRmlsdGVyLnJlY29yZC5tYXAoZSA9PiBlLmlkKS5qb2luKCcsJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZpbHRlcnNbcmVsYXRlZFJlY29yZEZpbHRlci5yZWxhdGlvbl0gPSByZWxhdGVkUmVjb3JkRmlsdGVyLnJlY29yZC5pZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChmaWx0ZXJTcGVjaWZpZXIua2luZCA9PT0gJ3JlbGF0ZWRSZWNvcmRzJykge1xuICAgICAgICAgICAgaWYgKGZpbHRlclNwZWNpZmllci5vcCAhPT0gJ2VxdWFsJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgT3BlcmF0aW9uIFwiJHtmaWx0ZXJTcGVjaWZpZXIub3B9XCIgaXMgbm90IHN1cHBvcnRlZCBpbiBKU09OQVBJIGZvciByZWxhdGVkUmVjb3JkcyBmaWx0ZXJpbmdgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHJlbGF0ZWRSZWNvcmRzRmlsdGVyID0gZmlsdGVyU3BlY2lmaWVyO1xuICAgICAgICAgICAgZmlsdGVyc1tyZWxhdGVkUmVjb3Jkc0ZpbHRlci5yZWxhdGlvbl0gPSByZWxhdGVkUmVjb3Jkc0ZpbHRlci5yZWNvcmRzLm1hcChlID0+IGUuaWQpLmpvaW4oJywnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBRdWVyeUV4cHJlc3Npb25QYXJzZUVycm9yKGBGaWx0ZXIgb3BlcmF0aW9uICR7ZmlsdGVyU3BlY2lmaWVyLm9wfSBub3QgcmVjb2duaXplZCBmb3IgSlNPTkFQSVNvdXJjZS5gLCBmaWx0ZXJTcGVjaWZpZXIpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGZpbHRlcnM7XG59XG5mdW5jdGlvbiBidWlsZFNvcnRQYXJhbShzb3VyY2UsIHNvcnRTcGVjaWZpZXJzKSB7XG4gICAgcmV0dXJuIHNvcnRTcGVjaWZpZXJzLm1hcChzb3J0U3BlY2lmaWVyID0+IHtcbiAgICAgICAgaWYgKHNvcnRTcGVjaWZpZXIua2luZCA9PT0gJ2F0dHJpYnV0ZScpIHtcbiAgICAgICAgICAgIGNvbnN0IGF0dHJpYnV0ZVNvcnQgPSBzb3J0U3BlY2lmaWVyO1xuICAgICAgICAgICAgLy8gTm90ZTogV2UgZG9uJ3Qga25vdyB0aGUgYHR5cGVgIG9mIHRoZSBhdHRyaWJ1dGUgaGVyZSwgc28gcGFzc2luZyBgbnVsbGBcbiAgICAgICAgICAgIGNvbnN0IHJlc291cmNlQXR0cmlidXRlID0gc291cmNlLnNlcmlhbGl6ZXIucmVzb3VyY2VBdHRyaWJ1dGUobnVsbCwgYXR0cmlidXRlU29ydC5hdHRyaWJ1dGUpO1xuICAgICAgICAgICAgcmV0dXJuIChzb3J0U3BlY2lmaWVyLm9yZGVyID09PSAnZGVzY2VuZGluZycgPyAnLScgOiAnJykgKyByZXNvdXJjZUF0dHJpYnV0ZTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgUXVlcnlFeHByZXNzaW9uUGFyc2VFcnJvcihgU29ydCBzcGVjaWZpZXIgJHtzb3J0U3BlY2lmaWVyLmtpbmR9IG5vdCByZWNvZ25pemVkIGZvciBKU09OQVBJU291cmNlLmAsIHNvcnRTcGVjaWZpZXIpO1xuICAgIH0pLmpvaW4oJywnKTtcbn0iXX0=