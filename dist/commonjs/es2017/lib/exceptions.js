'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.InvalidServerResponse = undefined;

var _core = require('@orbit/core');

class InvalidServerResponse extends _core.Exception {
    constructor(response) {
        super(`Invalid server response: ${response}`);
        this.response = response;
    }
}
exports.InvalidServerResponse = InvalidServerResponse;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9leGNlcHRpb25zLmpzIl0sIm5hbWVzIjpbIkludmFsaWRTZXJ2ZXJSZXNwb25zZSIsIkV4Y2VwdGlvbiIsImNvbnN0cnVjdG9yIiwicmVzcG9uc2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTs7QUFDTyxNQUFNQSxxQkFBTixTQUFvQ0MsZUFBcEMsQ0FBOEM7QUFDakRDLGdCQUFZQyxRQUFaLEVBQXNCO0FBQ2xCLGNBQU8sNEJBQTJCQSxRQUFTLEVBQTNDO0FBQ0EsYUFBS0EsUUFBTCxHQUFnQkEsUUFBaEI7QUFDSDtBQUpnRDtRQUF4Q0gscUIsR0FBQUEscUIiLCJmaWxlIjoibGliL2V4Y2VwdGlvbnMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBFeGNlcHRpb24gfSBmcm9tICdAb3JiaXQvY29yZSc7XG5leHBvcnQgY2xhc3MgSW52YWxpZFNlcnZlclJlc3BvbnNlIGV4dGVuZHMgRXhjZXB0aW9uIHtcbiAgICBjb25zdHJ1Y3RvcihyZXNwb25zZSkge1xuICAgICAgICBzdXBlcihgSW52YWxpZCBzZXJ2ZXIgcmVzcG9uc2U6ICR7cmVzcG9uc2V9YCk7XG4gICAgICAgIHRoaXMucmVzcG9uc2UgPSByZXNwb25zZTtcbiAgICB9XG59Il19