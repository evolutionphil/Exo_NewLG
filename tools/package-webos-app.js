#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const rimraf = require('rimraf');
const { execSync } = require('child_process');
const { minimatch } = require('minimatch');

// Allowed files and directories to include in the build
const allowedList = new Set([
  'assets',
  'css',
  'images',
  'js',
  'app_launcher.png',
  'appinfo.json',
  'config.xml',
  'index.html',
  'privacy_policy.html',
  'terms_conditions.html'
]);

// Glob patterns to exclude nested files
const excludeGlobPatterns = [
  '.*',               // dotfiles like .gitignore, .DS_Store
  '*.log',            // log files
  '*.map',            // source maps
  'LICENSE*',
  'package.json',
  'README.md',
  'webOSTV-dev.js',
  'Thumbs.db',        // Windows junk
  '.env',             // dotenv config
  '*.tmp',            // temp files
];

// Default configuration
const outputDirName = 'Release';
const defaultPackageName = 'exo.player';
const defaultVersion = '1.0.0';

/**
 * Main function to package the WebOS application
 */
async function packageWebOSApp() {
  try {
    console.log('Starting WebOS app packaging process...');

    const appDir = process.cwd();
    const outputDir = path.join(appDir, outputDirName);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let appName = defaultPackageName;
    let appVersion = defaultVersion;

    // Try to extract app details from appinfo.json
    try {
      const appInfo = JSON.parse(fs.readFileSync(path.join(appDir, 'appinfo.json'), 'utf8'));
      appName = appInfo.id || appName;
      appVersion = appInfo.version || appVersion;
      console.log(`Found WebOS app ID: ${appName} (version ${appVersion})`);
    } catch {
      console.log('No appinfo.json found or unable to parse. Using fallback app details.');
    }

    const outputFile = path.join(outputDir, `${appName}_${appVersion}.ipk`);

    // Clean previous build
    const buildTmpDir = path.join(appDir, 'build-tmp');
    if (fs.existsSync(buildTmpDir)) rimraf.sync(buildTmpDir);
    fs.mkdirSync(buildTmpDir, { recursive: true });

    console.log('Copying allowed app files...');
    copyAllowedFiles(appDir, buildTmpDir);

    let useAresPackage = false;
    try {
      execSync('ares-package --version', { stdio: 'ignore' });
      useAresPackage = true;
      console.log('Using ares-package to build IPK...');
      execSync(`ares-package ${buildTmpDir} --outdir ${outputDir}`, { stdio: 'inherit' });
      console.log(`IPK package created: ${outputFile}`);
    } catch (err) {
      console.warn('ares-package not available or failed. Falling back to ZIP packaging.');
      const zipOutputPath = path.join(outputDir, `${appName}_${appVersion}.zip`);
      await createZipArchive(buildTmpDir, zipOutputPath);
      console.log(`ZIP archive created: ${zipOutputPath}`);
    }

    console.log('Cleaning up temporary files...');
    rimraf.sync(buildTmpDir);
    console.log('Packaging completed successfully!');
  } catch (err) {
    console.error('Error during packaging:', err);
    process.exit(1);
  }
}

/**
 * Checks if a filename matches any of the exclusion glob patterns
 */
function isGlobExcluded(filename) {
  return excludeGlobPatterns.some(pattern => minimatch(filename, pattern, { dot: true }));
}

/**
 * Copies only allowed files and folders from src to dest
 */
function copyAllowedFiles(src, dest) {
  for (const name of allowedList) {
    const srcPath = path.join(src, name);
    const destPath = path.join(dest, name);
    if (!fs.existsSync(srcPath)) continue;

    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyFolderContents(srcPath, destPath);
    } else if (stat.isFile() && !isGlobExcluded(name)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Recursively copies contents of a folder
 */
function copyFolderContents(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (isGlobExcluded(entry.name)) continue;

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyFolderContents(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Creates a ZIP archive as a fallback to IPK
 */
function createZipArchive(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`Archive created: ${archive.pointer()} total bytes`);
      resolve();
    });

    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

// Start packaging
packageWebOSApp();
