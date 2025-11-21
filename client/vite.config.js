import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Generate unique build version based on timestamp
const buildVersion = Date.now().toString();

// Plugin to generate version.json file
const versionPlugin = () => ({
  name: 'version-plugin',
  writeBundle() {
    const versionInfo = {
      version: buildVersion,
      buildTime: new Date().toISOString()
    };
    
    // Write version.json to dist folder
    const distPath = path.resolve(__dirname, 'dist');
    if (!fs.existsSync(distPath)) {
      fs.mkdirSync(distPath, { recursive: true });
    }
    fs.writeFileSync(
      path.resolve(distPath, 'version.json'),
      JSON.stringify(versionInfo, null, 2)
    );
    console.log('✅ Generated version.json with version:', buildVersion);
  }
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), versionPlugin()],
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    port: 5173,
  },
  define: {
    '__APP_VERSION__': JSON.stringify(buildVersion)
  }
})

