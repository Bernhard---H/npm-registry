export { default } from './store';
export { default as Cache } from './cache';
// LEGACY EXPORTS
export { SyncOperationProcessor as OperationProcessor, SyncCacheIntegrityProcessor as CacheIntegrityProcessor, SyncSchemaConsistencyProcessor as SchemaConsistencyProcessor, SyncSchemaValidationProcessor as SchemaValidationProcessor } from '@orbit/record-cache';