#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch').default || require('pixelmatch');

/**
 * Compare two screenshots and generate a diff image
 * Usage: node compare-screenshots.js <image1> <image2> [output-diff]
 */

function resizeImageData(img, targetWidth, targetHeight) {
  const resized = new PNG({ width: targetWidth, height: targetHeight });

  const scaleX = img.width / targetWidth;
  const scaleY = img.height / targetHeight;

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const srcX = Math.floor(x * scaleX);
      const srcY = Math.floor(y * scaleY);
      const srcIdx = (srcY * img.width + srcX) * 4;
      const destIdx = (y * targetWidth + x) * 4;

      resized.data[destIdx] = img.data[srcIdx];
      resized.data[destIdx + 1] = img.data[srcIdx + 1];
      resized.data[destIdx + 2] = img.data[srcIdx + 2];
      resized.data[destIdx + 3] = img.data[srcIdx + 3];
    }
  }

  return resized;
}

async function compareImages(img1Path, img2Path, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      // Read both images
      const img1 = PNG.sync.read(fs.readFileSync(img1Path));
      const img2 = PNG.sync.read(fs.readFileSync(img2Path));

      console.log(`\n📊 Comparing screenshots:`);
      console.log(`  Image 1: ${img1Path} (${img1.width}x${img1.height})`);
      console.log(`  Image 2: ${img2Path} (${img2.width}x${img2.height})`);

      let processedImg1 = img1;
      let processedImg2 = img2;

      // Resize if dimensions don't match
      if (img1.width !== img2.width || img1.height !== img2.height) {
        console.log(`\n⚠️  Images have different dimensions, resizing to match...`);
        const maxWidth = Math.max(img1.width, img2.width);
        const maxHeight = Math.max(img1.height, img2.height);

        if (img1.width !== maxWidth || img1.height !== maxHeight) {
          processedImg1 = resizeImageData(img1, maxWidth, maxHeight);
        }
        if (img2.width !== maxWidth || img2.height !== maxHeight) {
          processedImg2 = resizeImageData(img2, maxWidth, maxHeight);
        }

        console.log(`  Resized to: ${maxWidth}x${maxHeight}`);
      }

      const { width, height } = processedImg1;
      const diff = new PNG({ width, height });

      // Compare images
      const numDiffPixels = pixelmatch(
        processedImg1.data,
        processedImg2.data,
        diff.data,
        width,
        height,
        {
          threshold: 0.1, // Sensitivity (0-1), lower = more sensitive
          alpha: 0.5,     // Alpha blending for diff output
          diffColor: [255, 0, 0], // Red for differences
          aaColor: [255, 255, 0]  // Yellow for anti-aliasing differences
        }
      );

      const totalPixels = width * height;
      const diffPercentage = ((numDiffPixels / totalPixels) * 100).toFixed(2);
      const similarity = (100 - diffPercentage).toFixed(2);

      // Save diff image
      fs.writeFileSync(outputPath, PNG.sync.write(diff));

      console.log(`\n✨ Comparison Results:`);
      console.log(`  Similarity:     ${similarity}%`);
      console.log(`  Different:      ${diffPercentage}%`);
      console.log(`  Diff pixels:    ${numDiffPixels.toLocaleString()} / ${totalPixels.toLocaleString()}`);
      console.log(`  Diff image:     ${outputPath}`);

      // Visual indicator
      const similarityNum = parseFloat(similarity);
      let indicator = '';
      if (similarityNum >= 98) {
        indicator = '🎉 Excellent match!';
      } else if (similarityNum >= 95) {
        indicator = '✅ Very good match';
      } else if (similarityNum >= 90) {
        indicator = '👍 Good match';
      } else if (similarityNum >= 80) {
        indicator = '⚠️  Moderate differences';
      } else {
        indicator = '❌ Significant differences';
      }

      console.log(`\n${indicator}\n`);

      resolve({
        similarity: parseFloat(similarity),
        diffPercentage: parseFloat(diffPercentage),
        numDiffPixels,
        totalPixels,
        diffImagePath: outputPath
      });
    } catch (error) {
      reject(error);
    }
  });
}

// CLI Usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node compare-screenshots.js <image1> <image2> [output-diff]');
    console.error('Example: node compare-screenshots.js original.png rendered.png diff.png');
    process.exit(1);
  }

  const img1Path = args[0];
  const img2Path = args[1];
  const outputPath = args[2] || 'screenshots/diff.png';

  // Verify files exist
  if (!fs.existsSync(img1Path)) {
    console.error(`❌ Error: File not found: ${img1Path}`);
    process.exit(1);
  }
  if (!fs.existsSync(img2Path)) {
    console.error(`❌ Error: File not found: ${img2Path}`);
    process.exit(1);
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  compareImages(img1Path, img2Path, outputPath)
    .then(results => {
      process.exit(results.similarity >= 95 ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Error comparing images:', error.message);
      process.exit(1);
    });
}

module.exports = { compareImages };
