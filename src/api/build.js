import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { mkdir } from 'fs/promises';
import crypto from 'crypto';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PATHS = {
    root: path.join(__dirname, '../..'),
    deployments: path.join(__dirname, '../../deployments'),
    dist: path.join(__dirname, '../../dist'),
    component: path.join(__dirname, '../components/UserComponent.jsx'),
    app: path.join(__dirname, '../App.jsx'),
    viteConfig: path.join(__dirname, '../../vite.config.js'),
    buildCache: path.join(__dirname, '../../.build-cache')
};

// Initialize build cache
async function initializeBuildCache() {
    await mkdir(PATHS.buildCache, { recursive: true });
}
initializeBuildCache().catch(console.error);

// Generate hash for component code
function generateHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}

// Generate optimized Vite config
function generateViteConfig(componentHash) {
    return `
        import { defineConfig } from 'vite';
        import react from '@vitejs/plugin-react';
        import path from 'path';

        export default defineConfig({
            plugins: [react()],
            build: {
                cache: true,
                minify: 'esbuild',
                sourcemap: false,
                rollupOptions: {
                    output: {
                        manualChunks: {
                            'vendor': ['react', 'react-dom'],
                            'ui': [
                                '@/components/ui/accordion',
                                '@/components/ui/alert-dialog',
                                '@/components/ui/alert',
                                '@/components/ui/avatar',
                                '@/components/ui/badge',
                                '@/components/ui/button',
                                '@/components/ui/card',
                                '@/components/ui/checkbox',
                                '@/components/ui/collapsible',
                                '@/components/ui/command',
                                '@/components/ui/context-menu',
                                '@/components/ui/dialog',
                                '@/components/ui/dropdown-menu',
                                '@/components/ui/form',
                                '@/components/ui/hover-card',
                                '@/components/ui/input',
                                '@/components/ui/label',
                                '@/components/ui/menubar',
                                '@/components/ui/navigation-menu',
                                '@/components/ui/popover',
                                '@/components/ui/progress',
                                '@/components/ui/radio-group',
                                '@/components/ui/scroll-area',
                                '@/components/ui/select',
                                '@/components/ui/separator',
                                '@/components/ui/sheet',
                                '@/components/ui/skeleton',
                                '@/components/ui/slider',
                                '@/components/ui/switch',
                                '@/components/ui/table',
                                '@/components/ui/tabs',
                                '@/components/ui/textarea',
                                '@/components/ui/toast',
                                '@/components/ui/toaster',
                                '@/components/ui/toggle',
                                '@/components/ui/tooltip'
                            ]
                        }
                    }
                },
                target: 'esnext',
                reportCompressedSize: false,
                chunkSizeWarningLimit: 1000
            },
            resolve: {
                alias: {
                    '@': path.resolve(__dirname, './src')
                }
            }
        });
    `;
}

// Check if build exists in cache
async function getBuildFromCache(hash) {
    try {
        const cachePath = path.join(PATHS.buildCache, hash);
        await fs.access(cachePath);
        return cachePath;
    } catch {
        return null;
    }
}

// Save build to cache
async function saveBuildToCache(hash, distPath) {
    const cachePath = path.join(PATHS.buildCache, hash);
    await fs.cp(distPath, cachePath, { 
        recursive: true,
        filter: (src) => !src.includes('node_modules') && !src.includes('.git')
    });
    return cachePath;
}

function generateAppCode(componentName) {
    return `
        import { useState, useEffect } from 'react'
        import ${componentName} from './components/${componentName}.jsx'

        function App() {
            return (
                <div className="w-screen h-screen">
                    <main className="w-full h-full bg-white">
                        <${componentName} />
                    </main>
                </div>
            )
        }

        export default App
    `;
}

async function runBuild() {
    return new Promise((resolve, reject) => {
        exec('npm run build', {
            cwd: path.join(__dirname, '../../'),
            maxBuffer: 1024 * 1024 * 10,
            env: { ...process.env, NODE_ENV: 'production' }
        }, (error, stdout, stderr) => {
            if (error) reject(error);
            else resolve(stdout);
        });
    });
}

async function cleanup(componentPath) {
    try {
        await fs.unlink(componentPath);
    } catch (error) {
        console.error('Cleanup error:', error);
    }
}

router.post('/build', async (req, res) => {
    const { componentCode } = req.body;
    const deploymentId = uuidv4();
    
    if (!componentCode) {
        return res.status(400).json({ error: 'Component code is required' });
    }

    try {
        // Generate hash for the component code
        const codeHash = generateHash(componentCode);
        
        // Create deployment directory
        const deploymentDir = path.join(PATHS.deployments, deploymentId);
        await mkdir(deploymentDir, { recursive: true });

        // Check build cache
        const cachedBuildPath = await getBuildFromCache(codeHash);
        
        if (cachedBuildPath) {
            // Use cached build
            console.log('Using cached build:', codeHash);
            await fs.cp(cachedBuildPath, deploymentDir, { recursive: true });
        } else {
            // Perform new build
            console.log('Creating new build:', codeHash);
            
            // Write files in parallel
            await Promise.all([
                fs.writeFile(PATHS.component, componentCode),
                fs.writeFile(PATHS.app, generateAppCode('UserComponent')),
                fs.writeFile(PATHS.viteConfig, generateViteConfig(codeHash))
            ]);

            // Run build
            await runBuild();

            // Save to cache and copy to deployment directory
            await Promise.all([
                saveBuildToCache(codeHash, PATHS.dist),
                fs.cp(PATHS.dist, deploymentDir, { 
                    recursive: true,
                    filter: (src) => !src.includes('node_modules') && !src.includes('.git')
                })
            ]);
        }

        // Update index.html paths
        const indexPath = path.join(deploymentDir, 'index.html');
        let indexContent = await fs.readFile(indexPath, 'utf-8');
        indexContent = indexContent
            .replace(/src="\/assets\//g, 'src="assets/')
            .replace(/href="\/assets\//g, 'href="assets/');
        
        await fs.writeFile(indexPath, indexContent);

        res.json({
            success: true,
            deploymentId,
            deploymentUrl: `/d/${deploymentId}`,
            downloadUrl: `/download/${deploymentId}`,
            fromCache: !!cachedBuildPath
        });

        // Cleanup in background
        if (!cachedBuildPath) {
            cleanup(PATHS.component).catch(err => 
                console.error('Cleanup error:', err)
            );
        }
        
    } catch (error) {
        console.error('Build failed:', error);
        await cleanup(PATHS.component);
        res.status(500).json({ error: error.message });
    }
});

// Cache maintenance
async function cleanupOldCache() {
    try {
        const cacheEntries = await fs.readdir(PATHS.buildCache);
        const now = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

        for (const entry of cacheEntries) {
            const cachePath = path.join(PATHS.buildCache, entry);
            const stats = await fs.stat(cachePath);
            if (now - stats.mtime.getTime() > maxAge) {
                await fs.rm(cachePath, { recursive: true });
            }
        }
    } catch (error) {
        console.error('Cache cleanup error:', error);
    }
}

setInterval(cleanupOldCache, 24 * 60 * 60 * 1000);

export default router;