#!/usr/bin/env node

/**
 * Helper script to fetch Figma screenshots
 *
 * Since the Figma MCP returns image data that we can't directly save,
 * this script uses the Figma REST API as a fallback.
 *
 * Usage: node fetch-figma-screenshot.js <fileKey> <nodeId> <output>
 * Example: node fetch-figma-screenshot.js abc123 1:2 screenshots/original.png
 *
 * Note: Requires FIGMA_ACCESS_TOKEN environment variable
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

async function fetchFigmaImage(fileKey, nodeId, outputPath) {
  const token = process.env.FIGMA_ACCESS_TOKEN;

  if (!token) {
    console.error('❌ Error: FIGMA_ACCESS_TOKEN environment variable not set');
    console.error('');
    console.error('To get a token:');
    console.error('1. Go to https://www.figma.com/settings');
    console.error('2. Go to the security tab');
    console.error('3. Scroll to "Personal access tokens"');
    console.error('4. Create a new token');
    console.error('5. Set it: export FIGMA_ACCESS_TOKEN=your-token-here');
    process.exit(1);
  }

  // Convert node ID format (1:2 or 1-2) to URL format
  const formattedNodeId = nodeId.replace(':', '-');

  return new Promise((resolve, reject) => {
    // First, get the image URL from Figma API
    const apiUrl = `https://api.figma.com/v1/images/${fileKey}?ids=${formattedNodeId}&format=png&scale=2`;

    console.log(`🔍 Fetching image URL for node ${nodeId}...`);

    https.get(apiUrl, {
      headers: {
        'X-Figma-Token': token
      }
    }, (response) => {
      let data = '';

      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log('API Response:', JSON.stringify(json, null, 2));

          if (json.err) {
            reject(new Error(`Figma API error: ${json.err}`));
            return;
          }

          // API returns key with colon, not dash
          const imageUrl = json.images[nodeId] || json.images[formattedNodeId];

          if (!imageUrl) {
            console.log('Available keys:', Object.keys(json.images || {}));
            reject(new Error('No image URL returned from Figma API'));
            return;
          }

          console.log(`📥 Downloading image...`);

          // Download the actual image
          https.get(imageUrl, (imgResponse) => {
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
              fs.mkdirSync(outputDir, { recursive: true });
            }

            const fileStream = fs.createWriteStream(outputPath);
            imgResponse.pipe(fileStream);

            fileStream.on('finish', () => {
              fileStream.close();
              console.log(`✅ Screenshot saved to: ${outputPath}`);
              resolve(outputPath);
            });
          }).on('error', reject);

        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error('Usage: node fetch-figma-screenshot.js <fileKey> <nodeId> <output>');
    console.error('Example: node fetch-figma-screenshot.js abc123 1:2 screenshots/original.png');
    process.exit(1);
  }

  const [fileKey, nodeId, outputPath] = args;

  fetchFigmaImage(fileKey, nodeId, outputPath)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Error:', error.message);
      process.exit(1);
    });
}

module.exports = { fetchFigmaImage };
