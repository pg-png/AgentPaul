/**
 * Deploy Module
 * Vercel deployment and Notion database integration
 */

export {
  deployToVercel,
  listDeployments,
  deleteDeployment
} from './vercel';

export {
  upsertPageRecord,
  findPageBySlug,
  getPagesByUser,
  updatePageStatus,
  getPublishedPages,
  NotionPageRecord
} from './notion';

// Re-export types
export interface DeploymentResult {
  success: boolean;
  url?: string;
  deploymentId?: string;
  error?: string;
}
