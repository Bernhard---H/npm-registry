import { toArray } from '@orbit/utils';
import { buildTransform } from '@orbit/data';
import { GetOperators } from "./get-operators";
function deserialize(source, document) {
    const deserialized = source.serializer.deserializeDocument(document);
    const records = [];
    Array.prototype.push.apply(records, toArray(deserialized.data));
    if (deserialized.included) {
        Array.prototype.push.apply(records, deserialized.included);
    }
    const operations = records.map(record => {
        return {
            op: 'replaceRecord',
            record
        };
    });
    let transforms = [buildTransform(operations)];
    let primaryData = deserialized.data;
    return { transforms, primaryData };
}
export const QueryOperators = {
    findRecord(source, query) {
        return GetOperators.findRecord(source, query).then(data => deserialize(source, data));
    },
    findRecords(source, query) {
        return GetOperators.findRecords(source, query).then(data => deserialize(source, data));
    },
    findRelatedRecord(source, query) {
        return GetOperators.findRelatedRecord(source, query).then(data => deserialize(source, data));
    },
    findRelatedRecords(source, query) {
        return GetOperators.findRelatedRecords(source, query).then(data => deserialize(source, data));
    }
};