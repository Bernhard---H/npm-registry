import { RecordOperation, Source, SourceSettings, Syncable, Query, QueryOrExpression, Queryable, Updatable, Transform, TransformOrOperations } from '@orbit/data';
import Cache, { CacheSettings } from './cache';
import { PatchResultData } from '@orbit/record-cache';
export interface StoreSettings extends SourceSettings {
    base?: Store;
    cacheSettings?: CacheSettings;
}
export interface StoreMergeOptions {
    coalesce?: boolean;
    sinceTransformId?: string;
    transformOptions?: object;
}
export default class Store extends Source implements Syncable, Queryable, Updatable {
    private _cache;
    private _base;
    private _forkPoint;
    private _transforms;
    private _transformInverses;
    sync: (transformOrTransforms: Transform | Transform[]) => Promise<void>;
    query: (queryOrExpression: QueryOrExpression, options?: object, id?: string) => Promise<any>;
    update: (transformOrOperations: TransformOrOperations, options?: object, id?: string) => Promise<any>;
    constructor(settings?: StoreSettings);
    readonly cache: Cache;
    readonly base: Store;
    readonly forkPoint: string;
    upgrade(): Promise<void>;
    _sync(transform: Transform): Promise<void>;
    _update(transform: Transform): Promise<any>;
    _query(query: Query, hints?: any): Promise<any>;
    /**
     Create a clone, or "fork", from a "base" store.
  
     The forked store will have the same `schema` and `keyMap` as its base store.
     The forked store's cache will start with the same immutable document as
     the base store. Its contents and log will evolve independently.
  
     @method fork
     @returns {Store} The forked store.
    */
    fork(settings?: StoreSettings): Store;
    /**
     Merge transforms from a forked store back into a base store.
  
     By default, all of the operations from all of the transforms in the forked
     store's history will be reduced into a single transform. A subset of
     operations can be selected by specifying the `sinceTransformId` option.
  
     The `coalesce` option controls whether operations are coalesced into a
     minimal equivalent set before being reduced into a transform.
  
     @method merge
     @param {Store} forkedStore - The store to merge.
     @param {Object}  [options] settings
     @param {Boolean} [options.coalesce = true] Should operations be coalesced into a minimal equivalent set?
     @param {String}  [options.sinceTransformId = null] Select only transforms since the specified ID.
     @returns {Promise} The result of calling `update()` with the forked transforms.
    */
    merge(forkedStore: Store, options?: StoreMergeOptions): Promise<any>;
    /**
     * This rebase method works similarly to a git rebase:
     *
     * After a store is forked, there is a parent- and a child-store.
     * Both may be updated with transforms.
     * If after some updates on both stores `childStore.rebase()` is called,
     * the result on the child store will look like,
     * as if all updates to the parent store were added first,
     * followed by those made in the child store.
     * This means that updates in the child store have a tendency of winning.
     */
    rebase(): void;
    /**
     Rolls back the Store to a particular transformId
  
     @method rollback
     @param {string} transformId - The ID of the transform to roll back to
     @param {number} relativePosition - A positive or negative integer to specify a position relative to `transformId`
     @returns {undefined}
    */
    rollback(transformId: string, relativePosition?: number): Promise<void>;
    /**
     Returns all transforms since a particular `transformId`.
  
     @method transformsSince
     @param {string} transformId - The ID of the transform to start with.
     @returns {Array} Array of transforms.
    */
    transformsSince(transformId: string): Transform[];
    /**
     Returns all tracked transforms.
  
     @method allTransforms
     @returns {Array} Array of transforms.
    */
    allTransforms(): Transform[];
    getTransform(transformId: string): Transform;
    getInverseOperations(transformId: string): RecordOperation[];
    protected _applyTransform(transform: Transform): PatchResultData[];
    protected _clearTransformFromHistory(transformId: string): void;
    protected _logCleared(): void;
    protected _logTruncated(transformId: string, relativePosition: number, removed: string[]): void;
    protected _logRolledback(transformId: string, relativePosition: number, removed: string[]): void;
}
