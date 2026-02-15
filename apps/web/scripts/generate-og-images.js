/**
 * Generate OG images for SmartDuka SEO
 * Run: node scripts/generate-og-images.js
 * 
 * This creates PNG versions of OG images from SVG templates
 * Requires: npm install sharp
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Sharp not installed. Install with: npm install sharp');
  console.log('For now, using SVG files directly (supported by most modern platforms)');
  process.exit(0);
}

const screenshotsDir = path.join(__dirname, '../public/screenshots');

async function generateImages() {
  // Ensure directory exists
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // Generate pos-desktop.png from SVG
  const svgPath = path.join(screenshotsDir, 'og-image.svg');
  const pngPath = path.join(screenshotsDir, 'pos-desktop.png');
  
  if (fs.existsSync(svgPath)) {
    try {
      await sharp(svgPath)
        .resize(1280, 720)
        .png()
        .toFile(pngPath);
      console.log('✓ Generated pos-desktop.png (1280x720)');
    } catch (err) {
      console.error('Error generating pos-desktop.png:', err.message);
    }
  }

  // Generate Twitter card image
  const twitterPath = path.join(screenshotsDir, 'twitter-card.png');
  if (fs.existsSync(svgPath)) {
    try {
      await sharp(svgPath)
        .resize(1200, 628)
        .png()
        .toFile(twitterPath);
      console.log('✓ Generated twitter-card.png (1200x628)');
    } catch (err) {
      console.error('Error generating twitter-card.png:', err.message);
    }
  }

  // Generate mobile screenshot placeholder
  const mobilePath = path.join(screenshotsDir, 'pos-mobile.png');
  if (!fs.existsSync(mobilePath)) {
    // Create a simple placeholder - in production, use actual app screenshot
    console.log('Note: pos-mobile.png should be a real app screenshot (390x844)');
  }

  console.log('\nDone! OG images generated in public/screenshots/');
}

generateImages().catch(console.error);
