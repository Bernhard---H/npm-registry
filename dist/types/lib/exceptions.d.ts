import { Exception } from '@orbit/core';
export declare class InvalidServerResponse extends Exception {
    response: string;
    constructor(response: string);
}
