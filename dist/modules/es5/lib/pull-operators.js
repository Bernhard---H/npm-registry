import { toArray, merge } from '@orbit/utils';
import { QueryExpressionParseError, buildTransform } from '@orbit/data';
import { buildFetchSettings, customRequestOptions } from './request-settings';
function deserialize(source, document) {
    var deserialized = source.serializer.deserializeDocument(document);
    var records = toArray(deserialized.data);
    if (deserialized.included) {
        Array.prototype.push.apply(records, deserialized.included);
    }
    var operations = records.map(function (record) {
        return {
            op: 'replaceRecord',
            record: record
        };
    });
    return [buildTransform(operations)];
}
export var PullOperators = {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9wdWxsLW9wZXJhdG9ycy5qcyJdLCJuYW1lcyI6WyJ0b0FycmF5IiwibWVyZ2UiLCJRdWVyeUV4cHJlc3Npb25QYXJzZUVycm9yIiwiYnVpbGRUcmFuc2Zvcm0iLCJidWlsZEZldGNoU2V0dGluZ3MiLCJjdXN0b21SZXF1ZXN0T3B0aW9ucyIsImRlc2VyaWFsaXplIiwic291cmNlIiwiZG9jdW1lbnQiLCJkZXNlcmlhbGl6ZWQiLCJzZXJpYWxpemVyIiwiZGVzZXJpYWxpemVEb2N1bWVudCIsInJlY29yZHMiLCJkYXRhIiwiaW5jbHVkZWQiLCJBcnJheSIsInByb3RvdHlwZSIsInB1c2giLCJhcHBseSIsIm9wZXJhdGlvbnMiLCJtYXAiLCJvcCIsInJlY29yZCIsIlB1bGxPcGVyYXRvcnMiLCJmaW5kUmVjb3JkIiwicXVlcnkiLCJleHByZXNzaW9uIiwicmVxdWVzdE9wdGlvbnMiLCJzZXR0aW5ncyIsImZldGNoIiwicmVzb3VyY2VVUkwiLCJ0eXBlIiwiaWQiLCJ0aGVuIiwiZmluZFJlY29yZHMiLCJmaWx0ZXIiLCJidWlsZEZpbHRlclBhcmFtIiwic29ydCIsImJ1aWxkU29ydFBhcmFtIiwicGFnZSIsImN1c3RvbU9wdGlvbnMiLCJmaW5kUmVsYXRlZFJlY29yZCIsInJlbGF0aW9uc2hpcCIsInJlbGF0ZWRSZXNvdXJjZVVSTCIsImZpbmRSZWxhdGVkUmVjb3JkcyIsImZpbHRlclNwZWNpZmllcnMiLCJmaWx0ZXJzIiwiZm9yRWFjaCIsImZpbHRlclNwZWNpZmllciIsImtpbmQiLCJhdHRyaWJ1dGVGaWx0ZXIiLCJyZXNvdXJjZUF0dHJpYnV0ZSIsImF0dHJpYnV0ZSIsInZhbHVlIiwicmVsYXRlZFJlY29yZEZpbHRlciIsImlzQXJyYXkiLCJyZWxhdGlvbiIsImUiLCJqb2luIiwiRXJyb3IiLCJyZWxhdGVkUmVjb3Jkc0ZpbHRlciIsInNvcnRTcGVjaWZpZXJzIiwic29ydFNwZWNpZmllciIsImF0dHJpYnV0ZVNvcnQiLCJvcmRlciJdLCJtYXBw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QWpDLEVBQTRDMEIsSUFBNUMsQ0FBaUQsR0FBakQsQ0FBekM7QUFDSCxTQU5NLE1BTUE7QUFDSCxrQkFBTSxJQUFJeEQseUJBQUosdUJBQWtEOEMsZ0JBQWdCM0IsRUFBbEUseUNBQTBHMkIsZUFBMUcsQ0FBTjtBQUNIO0FBQ0osS0F0QkQ7QUF1QkEsV0FBT0YsT0FBUDtBQUNIO0FBQ0QsU0FBU1IsY0FBVCxDQUF3Qi9CLE1BQXhCLEVBQWdDc0QsY0FBaEMsRUFBZ0Q7QUFDNUMsV0FBT0EsZUFBZXpDLEdBQWYsQ0FBbUIseUJBQWlCO0FBQ3ZDLFlBQUkwQyxjQUFjYixJQUFkLEtBQXVCLFdBQTNCLEVBQXdDO0FBQ3BDLGdCQUFNYyxnQkFBZ0JELGFBQXRCO0FBQ0E7QUFDQSxnQkFBTVgsb0JBQW9CNUMsT0FBT0csVUFBUCxDQUFrQnlDLGlCQUFsQixDQUFvQyxJQUFwQyxFQUEwQ1ksY0FBY1gsU0FBeEQsQ0FBMUI7QUFDQSxtQkFBTyxDQUFDVSxjQUFjRSxLQUFkLEtBQXdCLFlBQXhCLEdBQXVDLEdBQXZDLEdBQTZDLEVBQTlDLElBQW9EYixpQkFBM0Q7QUFDSDtBQUNELGNBQU0sSUFBSWpELHlCQUFKLHFCQUFnRDRELGNBQWNiLElBQTlELHlDQUF3R2EsYUFBeEcsQ0FBTjtBQUNILEtBUk0sRUFRSkosSUFSSSxDQVFDLEdBUkQsQ0FBUDtBQVNIIiwiZmlsZSI6ImxpYi9wdWxsLW9wZXJhdG9ycy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHRvQXJyYXksIG1lcmdlIH0gZnJvbSAnQG9yYml0L3V0aWxzJztcbmltcG9ydCB7IFF1ZXJ5RXhwcmVzc2lvblBhcnNlRXJyb3IsIGJ1aWxkVHJhbnNmb3JtIH0gZnJvbSAnQG9yYml0L2RhdGEnO1xuaW1wb3J0IHsgYnVpbGRGZXRjaFNldHRpbmdzLCBjdXN0b21SZXF1ZXN0T3B0aW9ucyB9IGZyb20gJy4vcmVxdWVzdC1zZXR0aW5ncyc7XG5mdW5jdGlvbiBkZXNlcmlhbGl6ZShzb3VyY2UsIGRvY3VtZW50KSB7XG4gICAgY29uc3QgZGVzZXJpYWxpemVkID0gc291cmNlLnNlcmlhbGl6ZXIuZGVzZXJpYWxpemVEb2N1bWVudChkb2N1bWVudCk7XG4gICAgY29uc3QgcmVjb3JkcyA9IHRvQXJyYXkoZGVzZXJpYWxpemVkLmRhdGEpO1xuICAgIGlmIChkZXNlcmlhbGl6ZWQuaW5jbHVkZWQpIHtcbiAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkocmVjb3JkcywgZGVzZXJpYWxpemVkLmluY2x1ZGVkKTtcbiAgICB9XG4gICAgY29uc3Qgb3BlcmF0aW9ucyA9IHJlY29yZHMubWFwKHJlY29yZCA9PiB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcDogJ3JlcGxhY2VSZWNvcmQnLFxuICAgICAgICAgICAgcmVjb3JkXG4gICAgICAgIH07XG4gICAgfSk7XG4gICAgcmV0dXJuIFtidWlsZFRyYW5zZm9ybShvcGVyYXRpb25zKV07XG59XG5leHBvcnQgY29uc3QgUHVsbE9wZXJhdG9ycyA9IHtcbiAgICBmaW5kUmVjb3JkKHNvdXJjZSwgcXVlcnkpIHtcbiAgICAgICAgY29uc3QgZXhwcmVzc2lvbiA9IHF1ZXJ5LmV4cHJlc3Npb247XG4gICAgICAgIGNvbnN0IHsgcmVjb3JkIH0gPSBleHByZXNzaW9uO1xuICAgICAgICBjb25zdCByZXF1ZXN0T3B0aW9ucyA9IGN1c3RvbVJlcXVlc3RPcHRpb25zKHNvdXJjZSwgcXVlcnkpO1xuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGJ1aWxkRmV0Y2hTZXR0aW5ncyhyZXF1ZXN0T3B0aW9ucyk7XG4gICAgICAgIHJldHVybiBzb3VyY2UuZmV0Y2goc291cmNlLnJlc291cmNlVVJMKHJlY29yZC50eXBlLCByZWNvcmQuaWQpLCBzZXR0aW5ncykudGhlbihkYXRhID0+IGRlc2VyaWFsaXplKHNvdXJjZSwgZGF0YSkpO1xuICAgIH0sXG4gICAgZmluZFJlY29yZHMoc291cmNlLCBxdWVyeSkge1xuICAgICAgICBjb25zdCBleHByZXNzaW9uID0gcXVlcnkuZXhwcmVzc2lvbjtcbiAgICAgICAgY29uc3QgeyB0eXBlIH0gPSBleHByZXNzaW9uO1xuICAgICAgICBsZXQgcmVxdWVzdE9wdGlvbnMgPSB7fTtcbiAgICAgICAgaWYgKGV4cHJlc3Npb24uZmlsdGVyKSB7XG4gICAgICAgICAgICByZXF1ZXN0T3B0aW9ucy5maWx0ZXIgPSBidWlsZEZpbHRlclBhcmFtKHNvdXJjZSwgZXhwcmVzc2lvbi5maWx0ZXIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChleHByZXNzaW9uLnNvcnQpIHtcbiAgICAgICAgICAgIHJlcXVlc3RPcHRpb25zLnNvcnQgPSBidWlsZFNvcnRQYXJhbShzb3VyY2UsIGV4cHJlc3Npb24uc29ydCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGV4cHJlc3Npb24ucGFnZSkge1xuICAgICAgICAgICAgcmVxdWVzdE9wdGlvbnMucGFnZSA9IGV4cHJlc3Npb24ucGFnZTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgY3VzdG9tT3B0aW9ucyA9IGN1c3RvbVJlcXVlc3RPcHRpb25zKHNvdXJjZSwgcXVlcnkpO1xuICAgICAgICBpZiAoY3VzdG9tT3B0aW9ucykge1xuICAgICAgICAgICAgbWVyZ2UocmVxdWVzdE9wdGlvbnMsIGN1c3RvbU9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gYnVpbGRGZXRjaFNldHRpbmdzKHJlcXVlc3RPcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5mZXRjaChzb3VyY2UucmVzb3VyY2VVUkwodHlwZSksIHNldHRpbmdzKS50aGVuKGRhdGEgPT4gZGVzZXJpYWxpemUoc291cmNlLCBkYXRhKSk7XG4gICAgfSxcbiAgICBmaW5kUmVsYXRlZFJlY29yZChzb3VyY2UsIHF1ZXJ5KSB7XG4gICAgICAgIGNvbnN0IGV4cHJlc3Npb24gPSBxdWVyeS5leHByZXNzaW9uO1xuICAgICAgICBjb25zdCB7IHJlY29yZCwgcmVsYXRpb25zaGlwIH0gPSBleHByZXNzaW9uO1xuICAgICAgICBjb25zdCByZXF1ZXN0T3B0aW9ucyA9IGN1c3RvbVJlcXVlc3RPcHRpb25zKHNvdXJjZSwgcXVlcnkpO1xuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGJ1aWxkRmV0Y2hTZXR0aW5ncyhyZXF1ZXN0T3B0aW9ucyk7XG4gICAgICAgIHJldHVybiBzb3VyY2UuZmV0Y2goc291cmNlLnJlbGF0ZWRSZXNvdXJjZVVSTChyZWNvcmQudHlwZSwgcmVjb3JkLmlkLCByZWxhdGlvbnNoaXApLCBzZXR0aW5ncykudGhlbihkYXRhID0+IGRlc2VyaWFsaXplKHNvdXJjZSwgZGF0YSkpO1xuICAgIH0sXG4gICAgZmluZFJlbGF0ZWRSZWNvcmRzKHNvdXJjZSwgcXVlcnkpIHtcbiAgICAgICAgY29uc3QgZXhwcmVzc2lvbiA9IHF1ZXJ5LmV4cHJlc3Npb247XG4gICAgICAgIGNvbnN0IHsgcmVjb3JkLCByZWxhdGlvbnNoaXAgfSA9IGV4cHJlc3Npb247XG4gICAgICAgIGxldCByZXF1ZXN0T3B0aW9ucyA9IGN1c3RvbVJlcXVlc3RPcHRpb25zKHNvdXJjZSwgcXVlcnkpO1xuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGJ1aWxkRmV0Y2hTZXR0aW5ncyhyZXF1ZXN0T3B0aW9ucyk7XG4gICAgICAgIHJldHVybiBzb3VyY2UuZmV0Y2goc291cmNlLnJlbGF0ZWRSZXNvdXJjZVVSTChyZWNvcmQudHlwZSwgcmVjb3JkLmlkLCByZWxhdGlvbnNoaXApLCBzZXR0aW5ncykudGhlbihkYXRhID0+IGRlc2VyaWFsaXplKHNvdXJjZSwgZGF0YSkpO1xuICAgIH1cbn07XG5mdW5jdGlvbiBidWlsZEZpbHRlclBhcmFtKHNvdXJjZSwgZmlsdGVyU3BlY2lmaWVycykge1xuICAgIGNvbnN0IGZpbHRlcnMgPSB7fTtcbiAgICBmaWx0ZXJTcGVjaWZpZXJzLmZvckVhY2goZmlsdGVyU3BlY2lmaWVyID0+IHtcbiAgICAgICAgaWYgKGZpbHRlclNwZWNpZmllci5raW5kID09PSAnYXR0cmlidXRlJyAmJiBmaWx0ZXJTcGVjaWZpZXIub3AgPT09ICdlcXVhbCcpIHtcbiAgICAgICAgICAgIGNvbnN0IGF0dHJpYnV0ZUZpbHRlciA9IGZpbHRlclNwZWNpZmllcjtcbiAgICAgICAgICAgIC8vIE5vdGU6IFdlIGRvbid0IGtub3cgdGhlIGB0eXBlYCBvZiB0aGUgYXR0cmlidXRlIGhlcmUsIHNvIHBhc3NpbmcgYG51bGxgXG4gICAgICAgICAgICBjb25zdCByZXNvdXJjZUF0dHJpYnV0ZSA9IHNvdXJjZS5zZXJpYWxpemVyLnJlc291cmNlQXR0cmlidXRlKG51bGwsIGF0dHJpYnV0ZUZpbHRlci5hdHRyaWJ1dGUpO1xuICAgICAgICAgICAgZmlsdGVyc1tyZXNvdXJjZUF0dHJpYnV0ZV0gPSBhdHRyaWJ1dGVGaWx0ZXIudmFsdWU7XG4gICAgICAgIH0gZWxzZSBpZiAoZmlsdGVyU3BlY2lmaWVyLmtpbmQgPT09ICdyZWxhdGVkUmVjb3JkJykge1xuICAgICAgICAgICAgY29uc3QgcmVsYXRlZFJlY29yZEZpbHRlciA9IGZpbHRlclNwZWNpZmllcjtcbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHJlbGF0ZWRSZWNvcmRGaWx0ZXIucmVjb3JkKSkge1xuICAgICAgICAgICAgICAgIGZpbHRlcnNbcmVsYXRlZFJlY29yZEZpbHRlci5yZWxhdGlvbl0gPSByZWxhdGVkUmVjb3JkRmlsdGVyLnJlY29yZC5tYXAoZSA9PiBlLmlkKS5qb2luKCcsJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZpbHRlcnNbcmVsYXRlZFJlY29yZEZpbHRlci5yZWxhdGlvbl0gPSByZWxhdGVkUmVjb3JkRmlsdGVyLnJlY29yZC5pZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChmaWx0ZXJTcGVjaWZpZXIua2luZCA9PT0gJ3JlbGF0ZWRSZWNvcmRzJykge1xuICAgICAgICAgICAgaWYgKGZpbHRlclNwZWNpZmllci5vcCAhPT0gJ2VxdWFsJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgT3BlcmF0aW9uIFwiJHtmaWx0ZXJTcGVjaWZpZXIub3B9XCIgaXMgbm90IHN1cHBvcnRlZCBpbiBKU09OQVBJIGZvciByZWxhdGVkUmVjb3JkcyBmaWx0ZXJpbmdgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHJlbGF0ZWRSZWNvcmRzRmlsdGVyID0gZmlsdGVyU3BlY2lmaWVyO1xuICAgICAgICAgICAgZmlsdGVyc1tyZWxhdGVkUmVjb3Jkc0ZpbHRlci5yZWxhdGlvbl0gPSByZWxhdGVkUmVjb3Jkc0ZpbHRlci5yZWNvcmRzLm1hcChlID0+IGUuaWQpLmpvaW4oJywnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBRdWVyeUV4cHJlc3Npb25QYXJzZUVycm9yKGBGaWx0ZXIgb3BlcmF0aW9uICR7ZmlsdGVyU3BlY2lmaWVyLm9wfSBub3QgcmVjb2duaXplZCBmb3IgSlNPTkFQSVNvdXJjZS5gLCBmaWx0ZXJTcGVjaWZpZXIpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGZpbHRlcnM7XG59XG5mdW5jdGlvbiBidWlsZFNvcnRQYXJhbShzb3VyY2UsIHNvcnRTcGVjaWZpZXJzKSB7XG4gICAgcmV0dXJuIHNvcnRTcGVjaWZpZXJzLm1hcChzb3J0U3BlY2lmaWVyID0+IHtcbiAgICAgICAgaWYgKHNvcnRTcGVjaWZpZXIua2luZCA9PT0gJ2F0dHJpYnV0ZScpIHtcbiAgICAgICAgICAgIGNvbnN0IGF0dHJpYnV0ZVNvcnQgPSBzb3J0U3BlY2lmaWVyO1xuICAgICAgICAgICAgLy8gTm90ZTogV2UgZG9uJ3Qga25vdyB0aGUgYHR5cGVgIG9mIHRoZSBhdHRyaWJ1dGUgaGVyZSwgc28gcGFzc2luZyBgbnVsbGBcbiAgICAgICAgICAgIGNvbnN0IHJlc291cmNlQXR0cmlidXRlID0gc291cmNlLnNlcmlhbGl6ZXIucmVzb3VyY2VBdHRyaWJ1dGUobnVsbCwgYXR0cmlidXRlU29ydC5hdHRyaWJ1dGUpO1xuICAgICAgICAgICAgcmV0dXJuIChzb3J0U3BlY2lmaWVyLm9yZGVyID09PSAnZGVzY2VuZGluZycgPyAnLScgOiAnJykgKyByZXNvdXJjZUF0dHJpYnV0ZTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgUXVlcnlFeHByZXNzaW9uUGFyc2VFcnJvcihgU29ydCBzcGVjaWZpZXIgJHtzb3J0U3BlY2lmaWVyLmtpbmR9IG5vdCByZWNvZ25pemVkIGZvciBKU09OQVBJU291cmNlLmAsIHNvcnRTcGVjaWZpZXIpO1xuICAgIH0pLmpvaW4oJywnKTtcbn0iXX0=