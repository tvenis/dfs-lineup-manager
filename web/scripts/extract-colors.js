const Vibrant = require('node-vibrant/lib/vibrant');
const fs = require('fs');
const path = require('path');

async function extractColors() {
  try {
    const imagePath = path.join(__dirname, '../public/figma/canvas.png');
    const palette = await Vibrant.from(imagePath).getPalette();
    
    const colors = {
      primary: palette.Vibrant?.hex || '#000000',
      secondary: palette.Muted?.hex || '#666666',
      accent: palette.DarkVibrant?.hex || '#333333',
      background: palette.LightMuted?.hex || '#f5f5f5',
      surface: palette.LightVibrant?.hex || '#ffffff',
      text: palette.DarkMuted?.hex || '#1a1a1a',
      border: palette.Muted?.hex || '#e5e5e5'
    };
    
    console.log('Extracted colors:', colors);
    
    // Generate CSS variables
    const cssVars = `:root {
  --color-primary: ${colors.primary};
  --color-secondary: ${colors.secondary};
  --color-accent: ${colors.accent};
  --color-background: ${colors.background};
  --color-surface: ${colors.surface};
  --color-text: ${colors.text};
  --color-border: ${colors.border};
}`;
    
    fs.writeFileSync(path.join(__dirname, '../src/app/figma-colors.css'), cssVars);
    console.log('CSS variables written to figma-colors.css');
    
  } catch (error) {
    console.error('Error extracting colors:', error);
  }
}

extractColors();
