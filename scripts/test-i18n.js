/**
 * I18n Migration Test Script
 * 
 * This script helps verify that the migration from next-intl to react-i18next
 * was successful by checking key functionality.
 * 
 * Run this script with: node scripts/test-i18n.js
 */

const fs = require('fs');
const path = require('path');

// Simple color functions for console output
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`
};

console.log(colors.blue('🌐 Starting i18n Migration Test\n'));

// Step 1: Check that all translation files exist and have content
console.log(colors.blue('Checking translation files...'));
const locales = ['en', 'ms', 'zh'];
const translationDir = path.join(__dirname, '../locales');

let allFilesExist = true;
locales.forEach(locale => {
  const filePath = path.join(translationDir, `${locale}.json`);
  
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsedContent = JSON.parse(content);
      
      console.log(colors.green(`✓ ${locale}.json exists and is valid JSON`));
      console.log(`  - Contains ${Object.keys(parsedContent).length} top-level keys`);
    } else {
      console.log(colors.red(`✗ ${locale}.json does not exist`));
      allFilesExist = false;
    }
  } catch (error) {
    console.log(colors.red(`✗ Error with ${locale}.json: ${error.message}`));
    allFilesExist = false;
  }
});

// Step 2: Check that next-intl is not in package.json dependencies
console.log('\n' + colors.blue('Checking package.json...'));
const packageJsonPath = path.join(__dirname, '../package.json');
try {
  const packageJson = require(packageJsonPath);
  if (packageJson.dependencies['next-intl']) {
    console.log(colors.red('✗ next-intl is still in package.json dependencies'));
  } else {
    console.log(colors.green('✓ next-intl has been removed from dependencies'));
  }
  
  if (packageJson.dependencies['i18next'] && 
      packageJson.dependencies['react-i18next'] &&
      packageJson.dependencies['i18next-browser-languagedetector']) {
    console.log(colors.green('✓ i18next dependencies are correctly installed'));
  } else {
    console.log(colors.yellow('⚠ Some i18next dependencies may be missing'));
  }
} catch (error) {
  console.log(colors.red(`✗ Error reading package.json: ${error.message}`));
}

// Step 3: Check for remaining next-intl imports in code
console.log('\n' + colors.blue('Checking for remaining next-intl imports...'));
const checkDirs = ['components', 'app', 'lib', 'src'];
let remainingImports = [];

function searchFilesForNextIntl(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules and .next
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        searchFilesForNextIntl(fullPath);
      }
    } else if (entry.isFile() && 
              (fullPath.endsWith('.js') || 
               fullPath.endsWith('.jsx') || 
               fullPath.endsWith('.ts') || 
               fullPath.endsWith('.tsx'))) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('next-intl')) {
          remainingImports.push(fullPath);
        }
      } catch (error) {
        console.error(`Error reading ${fullPath}:`, error);
      }
    }
  }
}

try {
  for (const dir of checkDirs) {
    const dirPath = path.join(__dirname, '..', dir);
    if (fs.existsSync(dirPath)) {
      searchFilesForNextIntl(dirPath);
    }
  }
  
  if (remainingImports.length === 0) {
    console.log(colors.green('✓ No remaining next-intl imports found'));
  } else {
    console.log(colors.yellow(`⚠ Found ${remainingImports.length} files with next-intl imports:`));
    remainingImports.forEach(file => {
      console.log(`  - ${file.replace(__dirname + '/../', '')}`);
    });
  }
} catch (error) {
  console.log(colors.red(`✗ Error searching for next-intl imports: ${error.message}`));
}

// Summary
console.log('\n' + colors.blue('I18n Migration Test Summary:'));
if (allFilesExist && remainingImports.length === 0) {
  console.log(colors.green('✓ The migration appears to be successful!'));
  console.log('\nNext steps:');
  console.log('1. Run the application to verify it works correctly');
  console.log('2. Test language switching functionality');
  console.log('3. Verify all translations are displayed correctly in each locale');
} else {
  console.log(colors.yellow('⚠ The migration may need additional work'));
  
  if (!allFilesExist) {
    console.log('- Fix missing or invalid translation files');
  }
  
  if (remainingImports.length > 0) {
    console.log('- Replace remaining next-intl imports with react-i18next equivalents');
  }
} 