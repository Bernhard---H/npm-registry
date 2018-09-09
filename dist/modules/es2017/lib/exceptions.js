import { Exception } from '@orbit/core';
export class InvalidServerResponse extends Exception {
    constructor(response) {
        super(`Invalid server response: ${response}`);
        this.response = response;
    }
}