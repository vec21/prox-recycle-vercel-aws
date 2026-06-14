/**
 * Frontend scan client — thin wrapper over /api/scan.
 * No AI credentials in the browser; all model calls run server-side.
 */
export { analyzeWaste } from './api';
export type { ScanResult } from './api';
