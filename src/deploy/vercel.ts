/**
 * Vercel Deployer
 * Deploy static pages to Vercel via API
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

const VERCEL_API = 'https://api.vercel.com';

interface DeploymentFile {
  file: string;
  data: string;
}

interface DeploymentResult {
  success: boolean;
  url?: string;
  deploymentId?: string;
  error?: string;
}

/**
 * Deploy a page directory to Vercel
 */
export async function deployToVercel(
  pageDir: string,
  projectName: string
): Promise<DeploymentResult> {
  const token = process.env.VERCEL_TOKEN;

  if (!token) {
    return {
      success: false,
      error: 'VERCEL_TOKEN environment variable is required'
    };
  }

  console.log(`[Vercel] Deploying: ${projectName}`);

  try {
    // Collect all files to deploy
    const files = await collectFiles(pageDir);

    if (files.length === 0) {
      return {
        success: false,
        error: 'No files found to deploy'
      };
    }

    console.log(`[Vercel] Uploading ${files.length} files...`);

    // Create deployment
    const response = await axios.post(
      `${VERCEL_API}/v13/deployments`,
      {
        name: projectName,
        files: files.map(f => ({
          file: f.file,
          data: f.data
        })),
        projectSettings: {
          framework: null
        },
        target: 'production'
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const { id, url, readyState } = response.data;

    console.log(`[Vercel] Deployment created: ${id}`);
    console.log(`[Vercel] Initial URL: https://${url}`);

    // Wait for deployment to be ready
    if (readyState !== 'READY') {
      await waitForDeployment(id, token);
    }

    // Get the production alias URL (cleaner URL without hash)
    const productionUrl = await getProductionUrl(id, token, projectName);

    console.log(`[Vercel] Production URL: ${productionUrl}`);

    return {
      success: true,
      url: productionUrl,
      deploymentId: id
    };

  } catch (error: any) {
    console.error('[Vercel] Deployment failed:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
}

/**
 * Collect all files in a directory for deployment
 */
async function collectFiles(
  dir: string,
  basePath: string = ''
): Promise<DeploymentFile[]> {
  const files: DeploymentFile[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(basePath, entry.name);

    if (entry.isDirectory()) {
      // Recursively collect files from subdirectories
      const subFiles = await collectFiles(fullPath, relativePath);
      files.push(...subFiles);
    } else {
      // Read file and encode as base64
      const content = await fs.readFile(fullPath);
      const base64 = content.toString('base64');

      files.push({
        file: relativePath.replace(/\\/g, '/'),
        data: base64
      });
    }
  }

  return files;
}

/**
 * Get the production URL (clean alias without hash)
 */
async function getProductionUrl(
  deploymentId: string,
  token: string,
  projectName: string
): Promise<string> {
  try {
    // Get deployment details to find the alias
    const response = await axios.get(
      `${VERCEL_API}/v13/deployments/${deploymentId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const { alias } = response.data;

    // Find the cleanest alias (project name without hash)
    if (alias && alias.length > 0) {
      // Prefer the shortest alias (usually the production one)
      const cleanAlias = alias
        .filter((a: string) => a.includes(projectName))
        .sort((a: string, b: string) => a.length - b.length)[0];

      if (cleanAlias) {
        return `https://${cleanAlias}`;
      }

      // Fallback to first alias
      return `https://${alias[0]}`;
    }

    // Fallback to deployment URL
    return `https://${response.data.url}`;
  } catch (error) {
    console.error('[Vercel] Failed to get production URL:', error);
    return `https://${projectName}.vercel.app`;
  }
}

/**
 * Wait for deployment to be ready
 */
async function waitForDeployment(
  deploymentId: string,
  token: string,
  maxWaitMs: number = 60000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const response = await axios.get(
      `${VERCEL_API}/v13/deployments/${deploymentId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const { readyState } = response.data;

    if (readyState === 'READY') {
      console.log('[Vercel] Deployment ready!');
      return;
    }

    if (readyState === 'ERROR') {
      throw new Error('Deployment failed');
    }

    // Wait 2 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.warn('[Vercel] Deployment timeout - may still be in progress');
}

/**
 * List all deployments for a project
 */
export async function listDeployments(projectName: string): Promise<any[]> {
  const token = process.env.VERCEL_TOKEN;

  if (!token) {
    throw new Error('VERCEL_TOKEN environment variable is required');
  }

  const response = await axios.get(
    `${VERCEL_API}/v6/deployments`,
    {
      params: {
        projectId: projectName,
        limit: 10
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return response.data.deployments;
}

/**
 * Delete a deployment
 */
export async function deleteDeployment(deploymentId: string): Promise<boolean> {
  const token = process.env.VERCEL_TOKEN;

  if (!token) {
    throw new Error('VERCEL_TOKEN environment variable is required');
  }

  try {
    await axios.delete(
      `${VERCEL_API}/v13/deployments/${deploymentId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return true;
  } catch {
    return false;
  }
}
