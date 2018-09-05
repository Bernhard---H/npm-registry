import { toArray } from '@orbit/utils';
import { buildTransform } from '@orbit/data';
import { AbstractOperators } from "./abstract-operators";
function deserialize(source, document) {
    const deserialized = source.serializer.deserializeDocument(document);
    const records = toArray(deserialized.data);
    if (deserialized.included) {
        Array.prototype.push.apply(records, deserialized.included);
    }
    const operations = records.map(record => {
        return {
            op: 'replaceRecord',
            record
        };
    });
    return [buildTransform(operations)];
}
export const PullOperators = {
    findRecord(source, query) {
        return AbstractOperators.findRecord(source, query).then(data => deserialize(source, data));
    },
    findRecords(source, query) {
        return AbstractOperators.findRecords(source, query).then(data => deserialize(source, data));
    },
    findRelatedRecord(source, query) {
        return AbstractOperators.findRelatedRecord(source, query).then(data => deserialize(source, data));
    },
    findRelatedRecords(source, query) {
        return AbstractOperators.findRelatedRecords(source, query).then(data => deserialize(source, data));
    }
};