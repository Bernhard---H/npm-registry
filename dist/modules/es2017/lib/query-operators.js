import { AbstractOperators } from "./abstract-operators";
function deserialize(source, document) {
    return source.serializer.deserializeDocument(document);
}
export const QueryOperators = {
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