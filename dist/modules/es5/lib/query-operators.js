import { toArray, merge } from '@orbit/utils';
import { QueryExpressionParseError } from '@orbit/data';
import { buildFetchSettings, customRequestOptions } from './request-settings';
function deserialize(source, document) {
    var deserialized = source.serializer.deserializeDocument(document);
    var records = toArray(deserialized.data);
    if (deserialized.included) {
        Array.prototype.push.apply(records, deserialized.included);
    }
    return records;
}
export var QueryOperators = {
    findRecord: function (source, query) {
        var expression = query.expression;
        var record = expression.record;

        var requestOptions = customRequestOptions(source, query);
        var settings = buildFetchSettings(requestOptions);
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
        var customOptions = customRequestOptions(source, query);
        if (customOptions) {
            merge(requestOptions, customOptions);
        }
        var settings = buildFetchSettings(requestOptions);
        return source.fetch(source.resourceURL(type), settings).then(function (data) {
            return deserialize(source, data);
        });
    },
    findRelatedRecord: function (source, query) {
        var expression = query.expression;
        var record = expression.record,
            relationship = expression.relationship;

        var requestOptions = customRequestOptions(source, query);
        var settings = buildFetchSettings(requestOptions);
        return source.fetch(source.relatedResourceURL(record.type, record.id, relationship), settings).then(function (data) {
            return deserialize(source, data);
        });
    },
    findRelatedRecords: function (source, query) {
        var expression = query.expression;
        var record = expression.record,
            relationship = expression.relationship;

        var requestOptions = customRequestOptions(source, query);
        var settings = buildFetchSettings(requestOptions);
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
            throw new QueryExpressionParseError('Filter operation ' + filterSpecifier.op + ' not recognized for JSONAPISource.', filterSpecifier);
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
        throw new QueryExpressionParseError('Sort specifier ' + sortSpecifier.kind + ' not recognized for JSONAPISource.', sortSpecifier);
    }).join(',');
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9xdWVyeS1vcGVyYXRvcnMuanMiXSwibmFtZXMiOlsidG9BcnJheSIsIm1lcmdlIiwiUXVlcnlFeHByZXNzaW9uUGFyc2VFcnJvciIsImJ1aWxkRmV0Y2hTZXR0aW5ncyIsImN1c3RvbVJlcXVlc3RPcHRpb25zIiwiZGVzZXJpYWxpemUiLCJzb3VyY2UiLCJkb2N1bWVudCIsImRlc2VyaWFsaXplZCIsInNlcmlhbGl6ZXIiLCJkZXNlcmlhbGl6ZURvY3VtZW50IiwicmVjb3JkcyIsImRhdGEiLCJpbmNsdWRlZCIsIkFycmF5IiwicHJvdG90eXBlIiwicHVzaCIsImFwcGx5IiwiUXVlcnlPcGVyYXRvcnMiLCJmaW5kUmVjb3JkIiwicXVlcnkiLCJleHByZXNzaW9uIiwicmVjb3JkIiwicmVxdWVzdE9wdGlvbnMiLCJzZXR0aW5ncyIsImZldGNoIiwicmVzb3VyY2VVUkwiLCJ0eXBlIiwiaWQiLCJ0aGVuIiwiZmluZFJlY29yZHMiLCJmaWx0ZXIiLCJidWlsZEZpbHRlclBhcmFtIiwic29ydCIsImJ1aWxkU29ydFBhcmFtIiwicGFnZSIsImN1c3RvbU9wdGlvbnMiLCJmaW5kUmVsYXRlZFJlY29yZCIsInJlbGF0aW9uc2hpcCIsInJlbGF0ZWRSZXNvdXJjZVVSTCIsImZpbmRSZWxhdGVkUmVjb3JkcyIsImZpbHRlclNwZWNpZmllcnMiLCJmaWx0ZXJzIiwiZm9yRWFjaCIsImZpbHRlclNwZWNpZmllciIsImtpbmQiLCJvcCIsImF0dHJpYnV0ZUZpbHRlciIsInJlc291cmNlQXR0cmlidXRlIiwiYXR0cmlidXRlIiwidmFsdWUiLCJyZWxhdGVkUmVjb3JkRmlsdGVyIiwiaXNBcnJheSIsInJlbGF0aW9uIiwibWFwIiwiZSIsImpvaW4iLCJFcnJvciIsInJlbGF0ZWRSZWNvcmRzRmlsdGVyIiwic29ydFNwZWNpZmllcnMiLCJzb3J0U3BlY2lmaWVyIiwiYXR0cmlidXRlU29ydCIsIm9yZGVyIl0sIm1hcHBpbmdzIjoiQUFBQSxTQUFTQSxPQUFULEVBQWtC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TUFBeEIsRUFBZ0NxRCxjQUFoQyxFQUFnRDtBQUM1QyxXQUFPQSxlQUFlTCxHQUFmLENBQW1CLHlCQUFpQjtBQUN2QyxZQUFJTSxjQUFjZixJQUFkLEtBQXVCLFdBQTNCLEVBQXdDO0FBQ3BDLGdCQUFNZ0IsZ0JBQWdCRCxhQUF0QjtBQUNBO0FBQ0EsZ0JBQU1aLG9CQUFvQjFDLE9BQU9HLFVBQVAsQ0FBa0J1QyxpQkFBbEIsQ0FBb0MsSUFBcEMsRUFBMENhLGNBQWNaLFNBQXhELENBQTFCO0FBQ0EsbUJBQU8sQ0FBQ1csY0FBY0UsS0FBZCxLQUF3QixZQUF4QixHQUF1QyxHQUF2QyxHQUE2QyxFQUE5QyxJQUFvRGQsaUJBQTNEO0FBQ0g7QUFDRCxjQUFNLElBQUk5Qyx5QkFBSixxQkFBZ0QwRCxjQUFjZixJQUE5RCx5Q0FBd0dlLGFBQXhHLENBQU47QUFDSCxLQVJNLEVBUUpKLElBUkksQ0FRQyxHQVJELENBQVA7QUFTSCIsImZpbGUiOiJsaWIvcXVlcnktb3BlcmF0b3JzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdG9BcnJheSwgbWVyZ2UgfSBmcm9tICdAb3JiaXQvdXRpbHMnO1xuaW1wb3J0IHsgUXVlcnlFeHByZXNzaW9uUGFyc2VFcnJvciB9IGZyb20gJ0BvcmJpdC9kYXRhJztcbmltcG9ydCB7IGJ1aWxkRmV0Y2hTZXR0aW5ncywgY3VzdG9tUmVxdWVzdE9wdGlvbnMgfSBmcm9tICcuL3JlcXVlc3Qtc2V0dGluZ3MnO1xuZnVuY3Rpb24gZGVzZXJpYWxpemUoc291cmNlLCBkb2N1bWVudCkge1xuICAgIGNvbnN0IGRlc2VyaWFsaXplZCA9IHNvdXJjZS5zZXJpYWxpemVyLmRlc2VyaWFsaXplRG9jdW1lbnQoZG9jdW1lbnQpO1xuICAgIGNvbnN0IHJlY29yZHMgPSB0b0FycmF5KGRlc2VyaWFsaXplZC5kYXRhKTtcbiAgICBpZiAoZGVzZXJpYWxpemVkLmluY2x1ZGVkKSB7XG4gICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KHJlY29yZHMsIGRlc2VyaWFsaXplZC5pbmNsdWRlZCk7XG4gICAgfVxuICAgIHJldHVybiByZWNvcmRzO1xufVxuZXhwb3J0IGNvbnN0IFF1ZXJ5T3BlcmF0b3JzID0ge1xuICAgIGZpbmRSZWNvcmQoc291cmNlLCBxdWVyeSkge1xuICAgICAgICBjb25zdCBleHByZXNzaW9uID0gcXVlcnkuZXhwcmVzc2lvbjtcbiAgICAgICAgY29uc3QgeyByZWNvcmQgfSA9IGV4cHJlc3Npb247XG4gICAgICAgIGNvbnN0IHJlcXVlc3RPcHRpb25zID0gY3VzdG9tUmVxdWVzdE9wdGlvbnMoc291cmNlLCBxdWVyeSk7XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gYnVpbGRGZXRjaFNldHRpbmdzKHJlcXVlc3RPcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5mZXRjaChzb3VyY2UucmVzb3VyY2VVUkwocmVjb3JkLnR5cGUsIHJlY29yZC5pZCksIHNldHRpbmdzKS50aGVuKGRhdGEgPT4gZGVzZXJpYWxpemUoc291cmNlLCBkYXRhKSk7XG4gICAgfSxcbiAgICBmaW5kUmVjb3Jkcyhzb3VyY2UsIHF1ZXJ5KSB7XG4gICAgICAgIGNvbnN0IGV4cHJlc3Npb24gPSBxdWVyeS5leHByZXNzaW9uO1xuICAgICAgICBjb25zdCB7IHR5cGUgfSA9IGV4cHJlc3Npb247XG4gICAgICAgIGxldCByZXF1ZXN0T3B0aW9ucyA9IHt9O1xuICAgICAgICBpZiAoZXhwcmVzc2lvbi5maWx0ZXIpIHtcbiAgICAgICAgICAgIHJlcXVlc3RPcHRpb25zLmZpbHRlciA9IGJ1aWxkRmlsdGVyUGFyYW0oc291cmNlLCBleHByZXNzaW9uLmZpbHRlcik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGV4cHJlc3Npb24uc29ydCkge1xuICAgICAgICAgICAgcmVxdWVzdE9wdGlvbnMuc29ydCA9IGJ1aWxkU29ydFBhcmFtKHNvdXJjZSwgZXhwcmVzc2lvbi5zb3J0KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZXhwcmVzc2lvbi5wYWdlKSB7XG4gICAgICAgICAgICByZXF1ZXN0T3B0aW9ucy5wYWdlID0gZXhwcmVzc2lvbi5wYWdlO1xuICAgICAgICB9XG4gICAgICAgIGxldCBjdXN0b21PcHRpb25zID0gY3VzdG9tUmVxdWVzdE9wdGlvbnMoc291cmNlLCBxdWVyeSk7XG4gICAgICAgIGlmIChjdXN0b21PcHRpb25zKSB7XG4gICAgICAgICAgICBtZXJnZShyZXF1ZXN0T3B0aW9ucywgY3VzdG9tT3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBidWlsZEZldGNoU2V0dGluZ3MocmVxdWVzdE9wdGlvbnMpO1xuICAgICAgICByZXR1cm4gc291cmNlLmZldGNoKHNvdXJjZS5yZXNvdXJjZVVSTCh0eXBlKSwgc2V0dGluZ3MpLnRoZW4oZGF0YSA9PiBkZXNlcmlhbGl6ZShzb3VyY2UsIGRhdGEpKTtcbiAgICB9LFxuICAgIGZpbmRSZWxhdGVkUmVjb3JkKHNvdXJjZSwgcXVlcnkpIHtcbiAgICAgICAgY29uc3QgZXhwcmVzc2lvbiA9IHF1ZXJ5LmV4cHJlc3Npb247XG4gICAgICAgIGNvbnN0IHsgcmVjb3JkLCByZWxhdGlvbnNoaXAgfSA9IGV4cHJlc3Npb247XG4gICAgICAgIGNvbnN0IHJlcXVlc3RPcHRpb25zID0gY3VzdG9tUmVxdWVzdE9wdGlvbnMoc291cmNlLCBxdWVyeSk7XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gYnVpbGRGZXRjaFNldHRpbmdzKHJlcXVlc3RPcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5mZXRjaChzb3VyY2UucmVsYXRlZFJlc291cmNlVVJMKHJlY29yZC50eXBlLCByZWNvcmQuaWQsIHJlbGF0aW9uc2hpcCksIHNldHRpbmdzKS50aGVuKGRhdGEgPT4gZGVzZXJpYWxpemUoc291cmNlLCBkYXRhKSk7XG4gICAgfSxcbiAgICBmaW5kUmVsYXRlZFJlY29yZHMoc291cmNlLCBxdWVyeSkge1xuICAgICAgICBjb25zdCBleHByZXNzaW9uID0gcXVlcnkuZXhwcmVzc2lvbjtcbiAgICAgICAgY29uc3QgeyByZWNvcmQsIHJlbGF0aW9uc2hpcCB9ID0gZXhwcmVzc2lvbjtcbiAgICAgICAgbGV0IHJlcXVlc3RPcHRpb25zID0gY3VzdG9tUmVxdWVzdE9wdGlvbnMoc291cmNlLCBxdWVyeSk7XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gYnVpbGRGZXRjaFNldHRpbmdzKHJlcXVlc3RPcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5mZXRjaChzb3VyY2UucmVsYXRlZFJlc291cmNlVVJMKHJlY29yZC50eXBlLCByZWNvcmQuaWQsIHJlbGF0aW9uc2hpcCksIHNldHRpbmdzKS50aGVuKGRhdGEgPT4gZGVzZXJpYWxpemUoc291cmNlLCBkYXRhKSk7XG4gICAgfVxufTtcbmZ1bmN0aW9uIGJ1aWxkRmlsdGVyUGFyYW0oc291cmNlLCBmaWx0ZXJTcGVjaWZpZXJzKSB7XG4gICAgY29uc3QgZmlsdGVycyA9IHt9O1xuICAgIGZpbHRlclNwZWNpZmllcnMuZm9yRWFjaChmaWx0ZXJTcGVjaWZpZXIgPT4ge1xuICAgICAgICBpZiAoZmlsdGVyU3BlY2lmaWVyLmtpbmQgPT09ICdhdHRyaWJ1dGUnICYmIGZpbHRlclNwZWNpZmllci5vcCA9PT0gJ2VxdWFsJykge1xuICAgICAgICAgICAgY29uc3QgYXR0cmlidXRlRmlsdGVyID0gZmlsdGVyU3BlY2lmaWVyO1xuICAgICAgICAgICAgLy8gTm90ZTogV2UgZG9uJ3Qga25vdyB0aGUgYHR5cGVgIG9mIHRoZSBhdHRyaWJ1dGUgaGVyZSwgc28gcGFzc2luZyBgbnVsbGBcbiAgICAgICAgICAgIGNvbnN0IHJlc291cmNlQXR0cmlidXRlID0gc291cmNlLnNlcmlhbGl6ZXIucmVzb3VyY2VBdHRyaWJ1dGUobnVsbCwgYXR0cmlidXRlRmlsdGVyLmF0dHJpYnV0ZSk7XG4gICAgICAgICAgICBmaWx0ZXJzW3Jlc291cmNlQXR0cmlidXRlXSA9IGF0dHJpYnV0ZUZpbHRlci52YWx1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChmaWx0ZXJTcGVjaWZpZXIua2luZCA9PT0gJ3JlbGF0ZWRSZWNvcmQnKSB7XG4gICAgICAgICAgICBjb25zdCByZWxhdGVkUmVjb3JkRmlsdGVyID0gZmlsdGVyU3BlY2lmaWVyO1xuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVsYXRlZFJlY29yZEZpbHRlci5yZWNvcmQpKSB7XG4gICAgICAgICAgICAgICAgZmlsdGVyc1tyZWxhdGVkUmVjb3JkRmlsdGVyLnJlbGF0aW9uXSA9IHJlbGF0ZWRSZWNvcmRGaWx0ZXIucmVjb3JkLm1hcChlID0+IGUuaWQpLmpvaW4oJywnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZmlsdGVyc1tyZWxhdGVkUmVjb3JkRmlsdGVyLnJlbGF0aW9uXSA9IHJlbGF0ZWRSZWNvcmRGaWx0ZXIucmVjb3JkLmlkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGZpbHRlclNwZWNpZmllci5raW5kID09PSAncmVsYXRlZFJlY29yZHMnKSB7XG4gICAgICAgICAgICBpZiAoZmlsdGVyU3BlY2lmaWVyLm9wICE9PSAnZXF1YWwnKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBPcGVyYXRpb24gXCIke2ZpbHRlclNwZWNpZmllci5vcH1cIiBpcyBub3Qgc3VwcG9ydGVkIGluIEpTT05BUEkgZm9yIHJlbGF0ZWRSZWNvcmRzIGZpbHRlcmluZ2ApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgcmVsYXRlZFJlY29yZHNGaWx0ZXIgPSBmaWx0ZXJTcGVjaWZpZXI7XG4gICAgICAgICAgICBmaWx0ZXJzW3JlbGF0ZWRSZWNvcmRzRmlsdGVyLnJlbGF0aW9uXSA9IHJlbGF0ZWRSZWNvcmRzRmlsdGVyLnJlY29yZHMubWFwKGUgPT4gZS5pZCkuam9pbignLCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFF1ZXJ5RXhwcmVzc2lvblBhcnNlRXJyb3IoYEZpbHRlciBvcGVyYXRpb24gJHtmaWx0ZXJTcGVjaWZpZXIub3B9IG5vdCByZWNvZ25pemVkIGZvciBKU09OQVBJU291cmNlLmAsIGZpbHRlclNwZWNpZmllcik7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gZmlsdGVycztcbn1cbmZ1bmN0aW9uIGJ1aWxkU29ydFBhcmFtKHNvdXJjZSwgc29ydFNwZWNpZmllcnMpIHtcbiAgICByZXR1cm4gc29ydFNwZWNpZmllcnMubWFwKHNvcnRTcGVjaWZpZXIgPT4ge1xuICAgICAgICBpZiAoc29ydFNwZWNpZmllci5raW5kID09PSAnYXR0cmlidXRlJykge1xuICAgICAgICAgICAgY29uc3QgYXR0cmlidXRlU29ydCA9IHNvcnRTcGVjaWZpZXI7XG4gICAgICAgICAgICAvLyBOb3RlOiBXZSBkb24ndCBrbm93IHRoZSBgdHlwZWAgb2YgdGhlIGF0dHJpYnV0ZSBoZXJlLCBzbyBwYXNzaW5nIGBudWxsYFxuICAgICAgICAgICAgY29uc3QgcmVzb3VyY2VBdHRyaWJ1dGUgPSBzb3VyY2Uuc2VyaWFsaXplci5yZXNvdXJjZUF0dHJpYnV0ZShudWxsLCBhdHRyaWJ1dGVTb3J0LmF0dHJpYnV0ZSk7XG4gICAgICAgICAgICByZXR1cm4gKHNvcnRTcGVjaWZpZXIub3JkZXIgPT09ICdkZXNjZW5kaW5nJyA/ICctJyA6ICcnKSArIHJlc291cmNlQXR0cmlidXRlO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBRdWVyeUV4cHJlc3Npb25QYXJzZUVycm9yKGBTb3J0IHNwZWNpZmllciAke3NvcnRTcGVjaWZpZXIua2luZH0gbm90IHJlY29nbml6ZWQgZm9yIEpTT05BUElTb3VyY2UuYCwgc29ydFNwZWNpZmllcik7XG4gICAgfSkuam9pbignLCcpO1xufSJdfQ==