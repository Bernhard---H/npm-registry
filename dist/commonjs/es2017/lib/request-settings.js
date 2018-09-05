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
function buildFetchSettings(options = {}, customSettings) {
    let settings = options.settings ? (0, _utils.clone)(options.settings) : {};
    if (customSettings) {
        (0, _utils.deepMerge)(settings, customSettings);
    }
    ['filter', 'include', 'page', 'sort'].forEach(param => {
        if (options[param]) {
            let value = options[param];
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9yZXF1ZXN0LXNldHRpbmdzLmpzIl0sIm5hbWVzIjpbImN1c3RvbVJlcXVlc3RPcHRpb25zIiwiYnVpbGRGZXRjaFNldHRpbmdzIiwic291cmNlIiwicXVlcnlPclRyYW5zZm9ybSIsIm5hbWUiLCJvcHRpb25zIiwiY3VzdG9tU2V0dGluZ3MiLCJzZXR0aW5ncyIsImZvckVhY2giLCJwYXJhbSIsInZhbHVlIiwiam9pbiIsInRpbWVvdXQiXSwibWFwcGluZ3MiOiI7Ozs7O1FBQ2dCQSxvQixHQUFBQSxvQjtRQUdBQyxrQixHQUFBQSxrQjs7QUFKaEI7O0FBQ08sU0FBU0Qsb0JBQVQsQ0FBOEJFLE1BQTlCLEVBQXNDQyxnQkFBdEMsRUFBd0Q7QUFDM0QsV0FBTyxvQkFBUUEsZ0JBQVIsRUFBMEIsQ0FBQyxTQUFELEVBQVksU0FBWixFQUF1QkQsT0FBT0UsSUFBOUIsQ0FBMUIsQ0FBUDtBQUNIO0FBQ00sU0FBU0gsa0JBQVQsQ0FBNEJJLFVBQVUsRUFBdEMsRUFBMENDLGNBQTFDLEVBQTBEO0FBQzdELFFBQUlDLFdBQVdGLFFBQVFFLFFBQVIsR0FBbUIsa0JBQU1GLFFBQVFFLFFBQWQsQ0FBbkIsR0FBNkMsRUFBNUQ7QUFDQSxRQUFJRCxjQUFKLEVBQW9CO0FBQ2hCLDhCQUFVQyxRQUFWLEVBQW9CRCxjQUFwQjtBQUNIO0FBQ0QsS0FBQyxRQUFELEVBQVcsU0FBWCxFQUFzQixNQUF0QixFQUE4QixNQUE5QixFQUFzQ0UsT0FBdEMsQ0FBOENDLFNBQVM7QUFDbkQsWUFBSUosUUFBUUksS0FBUixDQUFKLEVBQW9CO0FBQ2hCLGdCQUFJQyxRQUFRTCxRQUFRSSxLQUFSLENBQVo7QUFDQSxnQkFBSUEsVUFBVSxTQUFWLElBQXVCLG9CQUFRQyxLQUFSLENBQTNCLEVBQTJDO0FBQ3ZDQSx3QkFBUUEsTUFBTUMsSUFBTixDQUFXLEdBQVgsQ0FBUjtBQUNIO0FBQ0QsZ0NBQVFKLFFBQVIsRUFBa0IsQ0FBQyxRQUFELEVBQVdFLEtBQVgsQ0FBbEIsRUFBcUNDLEtBQXJDO0FBQ0g7QUFDSixLQVJEO0FBU0EsUUFBSUwsUUFBUSxTQUFSLENBQUosRUFBd0I7QUFDcEIsOEJBQVUsK0RBQVY7QUFDQUUsaUJBQVNLLE9BQVQsR0FBbUJQLFFBQVEsU0FBUixDQUFuQjtBQUNIO0FBQ0QsV0FBT0UsUUFBUDtBQUNIIiwiZmlsZSI6ImxpYi9yZXF1ZXN0LXNldHRpbmdzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY2xvbmUsIGRlZXBHZXQsIGRlZXBNZXJnZSwgZGVlcFNldCwgZGVwcmVjYXRlLCBpc0FycmF5IH0gZnJvbSAnQG9yYml0L3V0aWxzJztcbmV4cG9ydCBmdW5jdGlvbiBjdXN0b21SZXF1ZXN0T3B0aW9ucyhzb3VyY2UsIHF1ZXJ5T3JUcmFuc2Zvcm0pIHtcbiAgICByZXR1cm4gZGVlcEdldChxdWVyeU9yVHJhbnNmb3JtLCBbJ29wdGlvbnMnLCAnc291cmNlcycsIHNvdXJjZS5uYW1lXSk7XG59XG5leHBvcnQgZnVuY3Rpb24gYnVpbGRGZXRjaFNldHRpbmdzKG9wdGlvbnMgPSB7fSwgY3VzdG9tU2V0dGluZ3MpIHtcbiAgICBsZXQgc2V0dGluZ3MgPSBvcHRpb25zLnNldHRpbmdzID8gY2xvbmUob3B0aW9ucy5zZXR0aW5ncykgOiB7fTtcbiAgICBpZiAoY3VzdG9tU2V0dGluZ3MpIHtcbiAgICAgICAgZGVlcE1lcmdlKHNldHRpbmdzLCBjdXN0b21TZXR0aW5ncyk7XG4gICAgfVxuICAgIFsnZmlsdGVyJywgJ2luY2x1ZGUnLCAncGFnZScsICdzb3J0J10uZm9yRWFjaChwYXJhbSA9PiB7XG4gICAgICAgIGlmIChvcHRpb25zW3BhcmFtXSkge1xuICAgICAgICAgICAgbGV0IHZhbHVlID0gb3B0aW9uc1twYXJhbV07XG4gICAgICAgICAgICBpZiAocGFyYW0gPT09ICdpbmNsdWRlJyAmJiBpc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUuam9pbignLCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVlcFNldChzZXR0aW5ncywgWydwYXJhbXMnLCBwYXJhbV0sIHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGlmIChvcHRpb25zWyd0aW1lb3V0J10pIHtcbiAgICAgICAgZGVwcmVjYXRlKFwiSlNPTkFQSTogU3BlY2lmeSBgdGltZW91dGAgb3B0aW9uIGluc2lkZSBhIGBzZXR0aW5nc2Agb2JqZWN0LlwiKTtcbiAgICAgICAgc2V0dGluZ3MudGltZW91dCA9IG9wdGlvbnNbJ3RpbWVvdXQnXTtcbiAgICB9XG4gICAgcmV0dXJuIHNldHRpbmdzO1xufSJdfQ==