import { clone, deepGet, deepMerge, deepSet, deprecate, isArray } from '@orbit/utils';
export function customRequestOptions(source, queryOrTransform) {
    return deepGet(queryOrTransform, ['options', 'sources', source.name]);
}
export function buildFetchSettings() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var customSettings = arguments[1];

    var settings = options.settings ? clone(options.settings) : {};
    if (customSettings) {
        deepMerge(settings, customSettings);
    }
    ['filter', 'include', 'page', 'sort'].forEach(function (param) {
        if (options[param]) {
            var value = options[param];
            if (param === 'include' && isArray(value)) {
                value = value.join(',');
            }
            deepSet(settings, ['params', param], value);
        }
    });
    if (options['timeout']) {
        deprecate("JSONAPI: Specify `timeout` option inside a `settings` object.");
        settings.timeout = options['timeout'];
    }
    return settings;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9yZXF1ZXN0LXNldHRpbmdzLmpzIl0sIm5hbWVzIjpbImNsb25lIiwiZGVlcEdldCIsImRlZXBNZXJnZSIsImRlZXBTZXQiLCJkZXByZWNhdGUiLCJpc0FycmF5IiwiY3VzdG9tUmVxdWVzdE9wdGlvbnMiLCJzb3VyY2UiLCJxdWVyeU9yVHJhbnNmb3JtIiwibmFtZSIsImJ1aWxkRmV0Y2hTZXR0aW5ncyIsIm9wdGlvbnMiLCJjdXN0b21TZXR0aW5ncyIsInNldHRpbmdzIiwiZm9yRWFjaCIsInBhcmFtIiwidmFsdWUiLCJqb2luIiwidGltZW91dCJdLCJtYXBwaW5ncyI6IkFBQUEsU0FBU0EsS0FBVCxFQUFnQkMsT0FBaEIsRUFBeUJDLFNBQXpCLEVBQW9DQyxPQUFwQyxFQUE2Q0MsU0FBN0MsRUFBd0RDLE9BQXhELFFBQXVFLGNBQXZFO0FBQ0EsT0FBTyxTQUFTQyxvQkFBVCxDQUE4QkMsTUFBOUIsRUFBc0NDLGdCQUF0QyxFQUF3RDtBQUMzRCxXQUFPUCxRQUFRTyxnQkFBUixFQUEwQixDQUFDLFNBQUQsRUFBWSxTQUFaLEVBQXVCRCxPQUFPRSxJQUE5QixDQUExQixDQUFQO0FBQ0g7QUFDRCxPQUFPLFNBQVNDLGtCQUFULEdBQTBEO0FBQUEsUUFBOUJDLE9BQThCLHVFQUFwQixFQUFvQjtBQUFBLFFBQWhCQyxjQUFnQjs7QUFDN0QsUUFBSUMsV0FBV0YsUUFBUUUsUUFBUixHQUFtQmIsTUFBTVcsUUFBUUUsUUFBZCxDQUFuQixHQUE2QyxFQUE1RDtBQUNBLFFBQUlELGNBQUosRUFBb0I7QUFDaEJWLGtCQUFVVyxRQUFWLEVBQW9CRCxjQUFwQjtBQUNIO0FBQ0QsS0FBQyxRQUFELEVBQVcsU0FBWCxFQUFzQixNQUF0QixFQUE4QixNQUE5QixFQUFzQ0UsT0FBdEMsQ0FBOEMsaUJBQVM7QUFDbkQsWUFBSUgsUUFBUUksS0FBUixDQUFKLEVBQW9CO0FBQ2hCLGdCQUFJQyxRQUFRTCxRQUFRSSxLQUFSLENBQVo7QUFDQSxnQkFBSUEsVUFBVSxTQUFWLElBQXVCVixRQUFRVyxLQUFSLENBQTNCLEVBQTJDO0FBQ3ZDQSx3QkFBUUEsTUFBTUMsSUFBTixDQUFXLEdBQVgsQ0FBUjtBQUNIO0FBQ0RkLG9CQUFRVSxRQUFSLEVBQWtCLENBQUMsUUFBRCxFQUFXRSxLQUFYLENBQWxCLEVBQXFDQyxLQUFyQztBQUNIO0FBQ0osS0FSRDtBQVNBLFFBQUlMLFFBQVEsU0FBUixDQUFKLEVBQXdCO0FBQ3BCUCxrQkFBVSwrREFBVjtBQUNBUyxpQkFBU0ssT0FBVCxHQUFtQlAsUUFBUSxTQUFSLENBQW5CO0FBQ0g7QUFDRCxXQUFPRSxRQUFQO0FBQ0giLCJmaWxlIjoibGliL3JlcXVlc3Qtc2V0dGluZ3MuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjbG9uZSwgZGVlcEdldCwgZGVlcE1lcmdlLCBkZWVwU2V0LCBkZXByZWNhdGUsIGlzQXJyYXkgfSBmcm9tICdAb3JiaXQvdXRpbHMnO1xuZXhwb3J0IGZ1bmN0aW9uIGN1c3RvbVJlcXVlc3RPcHRpb25zKHNvdXJjZSwgcXVlcnlPclRyYW5zZm9ybSkge1xuICAgIHJldHVybiBkZWVwR2V0KHF1ZXJ5T3JUcmFuc2Zvcm0sIFsnb3B0aW9ucycsICdzb3VyY2VzJywgc291cmNlLm5hbWVdKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEZldGNoU2V0dGluZ3Mob3B0aW9ucyA9IHt9LCBjdXN0b21TZXR0aW5ncykge1xuICAgIGxldCBzZXR0aW5ncyA9IG9wdGlvbnMuc2V0dGluZ3MgPyBjbG9uZShvcHRpb25zLnNldHRpbmdzKSA6IHt9O1xuICAgIGlmIChjdXN0b21TZXR0aW5ncykge1xuICAgICAgICBkZWVwTWVyZ2Uoc2V0dGluZ3MsIGN1c3RvbVNldHRpbmdzKTtcbiAgICB9XG4gICAgWydmaWx0ZXInLCAnaW5jbHVkZScsICdwYWdlJywgJ3NvcnQnXS5mb3JFYWNoKHBhcmFtID0+IHtcbiAgICAgICAgaWYgKG9wdGlvbnNbcGFyYW1dKSB7XG4gICAgICAgICAgICBsZXQgdmFsdWUgPSBvcHRpb25zW3BhcmFtXTtcbiAgICAgICAgICAgIGlmIChwYXJhbSA9PT0gJ2luY2x1ZGUnICYmIGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5qb2luKCcsJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWVwU2V0KHNldHRpbmdzLCBbJ3BhcmFtcycsIHBhcmFtXSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgaWYgKG9wdGlvbnNbJ3RpbWVvdXQnXSkge1xuICAgICAgICBkZXByZWNhdGUoXCJKU09OQVBJOiBTcGVjaWZ5IGB0aW1lb3V0YCBvcHRpb24gaW5zaWRlIGEgYHNldHRpbmdzYCBvYmplY3QuXCIpO1xuICAgICAgICBzZXR0aW5ncy50aW1lb3V0ID0gb3B0aW9uc1sndGltZW91dCddO1xuICAgIH1cbiAgICByZXR1cm4gc2V0dGluZ3M7XG59Il19