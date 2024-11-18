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
    },
    define: {
        'process.env': {}
    }
});