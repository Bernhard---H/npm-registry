'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.customRequestOptions = customRequestOptions;
exports.buildFetchSettings = buildFetchSettings;

var _utils = require('@orbit/utils');

function customRequestOptions(source, queryOrTransform) {
    return (0, _utils.deepGet)(queryOrTransform, ['options', 'sources', source.name]);
}
function buildFetchSettings() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var customSettings = arguments[1];

    var settings = options.settings ? (0, _utils.clone)(options.settings) : {};
    if (customSettings) {
        (0, _utils.deepMerge)(settings, customSettings);
    }
    ['filter', 'include', 'page', 'sort'].forEach(function (param) {
        if (options[param]) {
            var value = options[param];
            if (param === 'include' && (0, _utils.isArray)(value)) {
                value = value.join(',');
            }
            (0, _utils.deepSet)(settings, ['params', param], value);
        }
    });
    if (options['timeout']) {
        (0, _utils.deprecate)("JSONAPI: Specify `timeout` option inside a `settings` object.");
        settings.timeout = options['timeout'];
    }
    return settings;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9yZXF1ZXN0LXNldHRpbmdzLmpzIl0sIm5hbWVzIjpbImRlZXBHZXQiLCJzb3VyY2UiLCJvcHRpb25zIiwiY3VzdG9tU2V0dGluZ3MiLCJzZXR0aW5ncyIsImNsb25lIiwiZGVlcE1lcmdlIiwidmFsdWUiLCJwYXJhbSIsImlzQXJyYXkiLCJkZWVwU2V0IiwiZGVwcmVjYXRlIl0sIm1hcHBpbmdzIjoiOzs7OztRQUNPLG9CLEdBQUEsb0I7UUFHQSxrQixHQUFBLGtCOzs7O0FBSEEsU0FBQSxvQkFBQSxDQUFBLE1BQUEsRUFBQSxnQkFBQSxFQUF3RDtBQUMzRCxXQUFPQSxvQkFBQUEsZ0JBQUFBLEVBQTBCLENBQUEsU0FBQSxFQUFBLFNBQUEsRUFBdUJDLE9BQXhELElBQWlDLENBQTFCRCxDQUFQO0FBQ0g7QUFDTSxTQUFBLGtCQUFBLEdBQTBEO0FBQUEsUUFBOUJFLFVBQThCLFVBQUEsTUFBQSxHQUFBLENBQUEsSUFBQSxVQUFBLENBQUEsTUFBQSxTQUFBLEdBQUEsVUFBQSxDQUFBLENBQUEsR0FBcEIsRUFBb0I7QUFBQSxRQUFoQkMsaUJBQWdCLFVBQUEsQ0FBQSxDQUFBOztBQUM3RCxRQUFJQyxXQUFXRixRQUFBQSxRQUFBQSxHQUFtQkcsa0JBQU1ILFFBQXpCQSxRQUFtQkcsQ0FBbkJILEdBQWYsRUFBQTtBQUNBLFFBQUEsY0FBQSxFQUFvQjtBQUNoQkksOEJBQUFBLFFBQUFBLEVBQUFBLGNBQUFBO0FBQ0g7QUFDRCxLQUFBLFFBQUEsRUFBQSxTQUFBLEVBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQSxPQUFBLENBQThDLFVBQUEsS0FBQSxFQUFTO0FBQ25ELFlBQUlKLFFBQUosS0FBSUEsQ0FBSixFQUFvQjtBQUNoQixnQkFBSUssUUFBUUwsUUFBWixLQUFZQSxDQUFaO0FBQ0EsZ0JBQUlNLFVBQUFBLFNBQUFBLElBQXVCQyxvQkFBM0IsS0FBMkJBLENBQTNCLEVBQTJDO0FBQ3ZDRix3QkFBUUEsTUFBQUEsSUFBQUEsQ0FBUkEsR0FBUUEsQ0FBUkE7QUFDSDtBQUNERyxnQ0FBQUEsUUFBQUEsRUFBa0IsQ0FBQSxRQUFBLEVBQWxCQSxLQUFrQixDQUFsQkEsRUFBQUEsS0FBQUE7QUFDSDtBQVBMLEtBQUE7QUFTQSxRQUFJUixRQUFKLFNBQUlBLENBQUosRUFBd0I7QUFDcEJTLDhCQUFBQSwrREFBQUE7QUFDQVAsaUJBQUFBLE9BQUFBLEdBQW1CRixRQUFuQkUsU0FBbUJGLENBQW5CRTtBQUNIO0FBQ0QsV0FBQSxRQUFBO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjbG9uZSwgZGVlcEdldCwgZGVlcE1lcmdlLCBkZWVwU2V0LCBkZXByZWNhdGUsIGlzQXJyYXkgfSBmcm9tICdAb3JiaXQvdXRpbHMnO1xuZXhwb3J0IGZ1bmN0aW9uIGN1c3RvbVJlcXVlc3RPcHRpb25zKHNvdXJjZSwgcXVlcnlPclRyYW5zZm9ybSkge1xuICAgIHJldHVybiBkZWVwR2V0KHF1ZXJ5T3JUcmFuc2Zvcm0sIFsnb3B0aW9ucycsICdzb3VyY2VzJywgc291cmNlLm5hbWVdKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEZldGNoU2V0dGluZ3Mob3B0aW9ucyA9IHt9LCBjdXN0b21TZXR0aW5ncykge1xuICAgIGxldCBzZXR0aW5ncyA9IG9wdGlvbnMuc2V0dGluZ3MgPyBjbG9uZShvcHRpb25zLnNldHRpbmdzKSA6IHt9O1xuICAgIGlmIChjdXN0b21TZXR0aW5ncykge1xuICAgICAgICBkZWVwTWVyZ2Uoc2V0dGluZ3MsIGN1c3RvbVNldHRpbmdzKTtcbiAgICB9XG4gICAgWydmaWx0ZXInLCAnaW5jbHVkZScsICdwYWdlJywgJ3NvcnQnXS5mb3JFYWNoKHBhcmFtID0+IHtcbiAgICAgICAgaWYgKG9wdGlvbnNbcGFyYW1dKSB7XG4gICAgICAgICAgICBsZXQgdmFsdWUgPSBvcHRpb25zW3BhcmFtXTtcbiAgICAgICAgICAgIGlmIChwYXJhbSA9PT0gJ2luY2x1ZGUnICYmIGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5qb2luKCcsJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWVwU2V0KHNldHRpbmdzLCBbJ3BhcmFtcycsIHBhcmFtXSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgaWYgKG9wdGlvbnNbJ3RpbWVvdXQnXSkge1xuICAgICAgICBkZXByZWNhdGUoXCJKU09OQVBJOiBTcGVjaWZ5IGB0aW1lb3V0YCBvcHRpb24gaW5zaWRlIGEgYHNldHRpbmdzYCBvYmplY3QuXCIpO1xuICAgICAgICBzZXR0aW5ncy50aW1lb3V0ID0gb3B0aW9uc1sndGltZW91dCddO1xuICAgIH1cbiAgICByZXR1cm4gc2V0dGluZ3M7XG59Il19