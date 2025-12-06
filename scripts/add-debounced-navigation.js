#!/usr/bin/env node
/**
 * Script to add debounced navigation across all app screens
 * This prevents double-tap issues where multiple screens open
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Files to process
const appDir = path.join(__dirname, '../app');

// Find all .tsx files in the app directory
async function findTsxFiles() {
  return await glob(`${appDir}/**/*.tsx`, {
    ignore: [
      '**/node_modules/**',
      '**/_layout.tsx', // Skip layout files
      '**/+not-found.tsx',
    ]
  });
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Skip if already has debouncedRouter import
  if (content.includes('debouncedRouter')) {
    console.log(`⏭️  Skipping ${path.relative(process.cwd(), filePath)} (already updated)`);
    return false;
  }

  // Check if file uses router
  if (!content.includes('from \'expo-router\'')) {
    return false;
  }

  // Add imports after expo-router import
  const expoRouterImport = /import\s+{([^}]+)}\s+from\s+['"]expo-router['"]/;
  const match = content.match(expoRouterImport);
  
  if (match) {
    const existingImports = match[1];
    
    // Add DebouncedTouchable import if not exists
    if (!content.includes('DebouncedTouchable')) {
      const insertPos = content.indexOf(match[0]) + match[0].length;
      content = content.slice(0, insertPos) + 
        "\nimport { DebouncedTouchable } from '@/components/DebouncedTouchable';" +
        "\nimport { debouncedRouter } from '@/utils/navigationDebounce';" +
        content.slice(insertPos);
      modified = true;
    }

    // Replace router.push with debouncedRouter.push
    const routerPushRegex = /router\.(push|replace|back)\(/g;
    let tempContent = content.replace(routerPushRegex, (match, method) => {
      if (method === 'back') {
        return `debouncedRouter.${method}(`;
      }
      return `debouncedRouter.${method}(`;
    });

    // Remove ' as any' from navigation calls
    tempContent = tempContent.replace(/debouncedRouter\.(push|replace)\(([^)]+)\s+as\s+any\)/g, 'debouncedRouter.$1($2)');

    if (tempContent !== content) {
      content = tempContent;
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated ${path.relative(process.cwd(), filePath)}`);
    return true;
  }

  return false;
}

async function main() {
  console.log('🚀 Starting navigation debounce implementation...\n');
  
  const files = await findTsxFiles();
  console.log(`📁 Found ${files.length} .tsx files to process\n`);

  let updatedCount = 0;
  
  for (const file of files) {
    try {
      if (processFile(file)) {
        updatedCount++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }

  console.log(`\n✨ Done! Updated ${updatedCount} files`);
}

main().catch(console.error);
