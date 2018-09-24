import { merge } from '@orbit/utils';
import { QueryExpressionParseError } from '@orbit/data';
import { buildFetchSettings, customRequestOptions } from './request-settings';
export const GetOperators = {
    findRecord(source, query) {
        const expression = query.expression;
        const { record } = expression;
        const requestOptions = customRequestOptions(source, query);
        const settings = buildFetchSettings(requestOptions);
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
        let customOptions = customRequestOptions(source, query);
        if (customOptions) {
            merge(requestOptions, customOptions);
        }
        const settings = buildFetchSettings(requestOptions);
        return source.fetch(source.resourceURL(type), settings);
    },
    findRelatedRecord(source, query) {
        const expression = query.expression;
        const { record, relationship } = expression;
        const requestOptions = customRequestOptions(source, query);
        const settings = buildFetchSettings(requestOptions);
        return source.fetch(source.relatedResourceURL(record.type, record.id, relationship), settings);
    },
    findRelatedRecords(source, query) {
        const expression = query.expression;
        const { record, relationship } = expression;
        let requestOptions = customRequestOptions(source, query);
        const settings = buildFetchSettings(requestOptions);
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
            throw new QueryExpressionParseError(`Filter operation ${filterSpecifier.op} not recognized for JSONAPISource.`, filterSpecifier);
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
        throw new QueryExpressionParseError(`Sort specifier ${sortSpecifier.kind} not recognized for JSONAPISource.`, sortSpecifier);
    }).join(',');
}