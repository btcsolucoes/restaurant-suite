import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath,URL} from 'node:url';
export default defineConfig({base:'./',plugins:[react()],resolve:{alias:{'@':fileURLToPath(new URL('.',import.meta.url))}},define:{__APP_VERSION__:JSON.stringify(process.env.APP_VERSION||'1.1.0')},server:{allowedHosts:['terminal.local']}});
