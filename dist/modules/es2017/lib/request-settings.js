import { clone, deepGet, deepMerge, deepSet, deprecate, isArray } from '@orbit/utils';
export function customRequestOptions(source, queryOrTransform) {
    return deepGet(queryOrTransform, ['options', 'sources', source.name]);
}
export function buildFetchSettings(options = {}, customSettings) {
    let settings = options.settings ? clone(options.settings) : {};
    if (customSettings) {
        deepMerge(settings, customSettings);
    }
    ['filter', 'include', 'page', 'sort'].forEach(param => {
        if (options[param]) {
            let value = options[param];
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