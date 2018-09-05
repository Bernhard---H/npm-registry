import { GetOperators } from "./get-operators";
function deserialize(source, document) {
    return source.serializer.deserializeDocument(document);
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