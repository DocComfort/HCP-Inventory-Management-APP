import { generateQWCFile } from './utils/qwc-generator.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate QWC file for Railway deployment
const qwcConfig = {
  appName: 'HCP Inventory Manager',
  appURL: 'https://hcp-inventory-management-app-production.up.railway.app/qbwc',
  appDescription: 'Sync inventory between HousecallPro and QuickBooks Desktop',
  appSupport: 'https://hcp-inventory-management-app-production.up.railway.app',
  userName: 'admin',
  ownerID: '{90A44FB7-33D9-4815-AC85-AC7932EADDCA}',
  fileID: '{8C9A4F6E-7D3B-4B5E-9F2C-1E8D7C6B5A4F}',
  qbType: 'QBFS' as const,
  scheduler: {
    runEvery: 30, // Run every 30 minutes
    enabled: true
  }
};

const qwcContent = generateQWCFile(qwcConfig);
const outputPath = path.join(__dirname, '..', 'HCP-Inventory-Manager.qwc');

fs.writeFileSync(outputPath, qwcContent, 'utf8');

console.log('✅ QWC file generated successfully!');
console.log(`📄 Location: ${outputPath}`);
console.log(`\n📋 Configuration:`);
console.log(`   App Name: ${qwcConfig.appName}`);
console.log(`   App URL: ${qwcConfig.appURL}`);
console.log(`   Username: ${qwcConfig.userName}`);
console.log(`   Schedule: Every ${qwcConfig.scheduler.runEvery} minutes`);
console.log(`\n📥 To install:`);
console.log(`   1. Open QuickBooks Web Connector`);
console.log(`   2. Click "Add an Application"`);
console.log(`   3. Browse to: ${outputPath}`);
console.log(`   4. Enter password when prompted`);
console.log(`   5. Click "Update Selected" to test connection`);
