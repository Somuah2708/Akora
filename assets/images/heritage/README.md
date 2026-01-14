# Heritage Images Directory

This directory stores all images used in the heritage/history section of the Akora app.

## Image Categories

### Notable Alumni
Place portrait images of notable alumni here:
- john-atta-mills.jpg
- robert-mugabe.jpg
- kofi-abrefa-busia.jpg
- kwame-nkrumah.jpg
- edward-akufo-addo.jpg
- jerry-rawlings.jpg

### Historical Milestones
Place historical images and school photos here:
- governor-guggisberg.jpg
- assembly-hall.jpg
- clock-tower.jpg
- university-ghana-hall.jpg
- school-grounds.jpg

### Founders
Place images of school founders here:
- guggisberg.jpg
- fraser.jpg
- aggrey.jpg

## Image Guidelines

- **Format**: PNG or JPG
- **Size**: Portraits should be at least 440x440px
- **Quality**: High resolution for optimal display on mobile devices
- **Naming**: Use lowercase with hyphens (kebab-case)

## Usage

After placing images in this directory, update the image paths in `/app/heritage/index.tsx`:

```typescript
// Instead of:
image: 'https://upload.wikimedia.org/...'

// Use local images:
image: require('@/assets/images/heritage/john-atta-mills.jpg')
```

---
*Created: January 14, 2026*
