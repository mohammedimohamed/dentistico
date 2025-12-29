# Landing Page Configuration Guide

This document explains how to customize the Dentistico landing page by editing the configuration file.

## Configuration Files

- **JSON Format**: `src/lib/config/landing-page.json` (recommended for programmatic access)
- **YAML Format**: `src/lib/config/landing-page.yaml` (easier to read and edit manually)

## File Structure Overview

The configuration file is organized into the following main sections:

1. **metadata** - Version and description information
2. **theme** - Colors, spacing, typography, and animations
3. **navigation** - Header/navbar configuration
4. **hero** - Hero section with main heading and CTA
5. **services** - Services section with service cards
6. **about** - About section with stats and features
7. **footer** - Footer with links, contact, and newsletter
8. **scripts** - JavaScript behavior configuration

## Quick Start

### Changing Text Content

1. Open `src/lib/config/landing-page.json`
2. Find the section you want to modify (e.g., `hero.heading.text`)
3. Update the text value
4. Save the file
5. The changes will be reflected on the page

### Changing Images

1. Place your image in the `static/` directory
2. Update the image path in the config (e.g., `hero.image.src: "/your-image.png"`)
3. Save the file

### Changing Colors

1. Navigate to `theme.colors` section
2. Update color values (use Tailwind CSS color names or hex values)
3. Update classes that reference colors throughout the config

### Changing Styles/Classes

1. Find the element you want to style
2. Update the `classes` object for that element
3. Use Tailwind CSS utility classes

## Detailed Section Guide

### Theme Configuration

```json
{
  "theme": {
    "colors": {
      "primary": { "main": "teal-600", "value": "#0d9488" },
      "text": { "primary": "slate-900", "secondary": "slate-600" }
    },
    "spacing": {
      "container": { "maxWidth": "max-w-7xl", "padding": "px-6" }
    },
    "typography": {
      "headings": {
        "h1": { "mobile": "text-5xl", "desktop": "lg:text-7xl" }
      }
    }
  }
}
```

**What you can change:**
- All color values and names
- Spacing values (padding, margins)
- Typography sizes and weights
- Animation durations and effects

### Navigation Section

```json
{
  "navigation": {
    "logo": { "text": "Dentistico", "classes": "..." },
    "menu": {
      "items": [
        { "label": "Home", "href": "#home" }
      ]
    },
    "actions": {
      "buttons": [
        { "label": "Login", "href": "/login" }
      ]
    }
  }
}
```

**What you can change:**
- Logo text
- Menu items (add, remove, reorder)
- Button labels and links
- All CSS classes

### Hero Section

```json
{
  "hero": {
    "badge": { "text": "Professional Dental Care" },
    "heading": {
      "text": "Your Smile is Our {highlight}Greatest Passion{/highlight}",
      "highlight": { "text": "Greatest Passion", "classes": "text-teal-600" }
    },
    "description": { "text": "Experience state-of-the-art..." },
    "actions": {
      "buttons": [...],
      "socialProof": {
        "avatars": [...],
        "text": "Loved by 2k+ Patients"
      }
    },
    "image": {
      "src": "/hero.png",
      "decorativeElements": [...]
    }
  }
}
```

**What you can change:**
- Badge text
- Main heading (with highlight support)
- Description text
- CTA button text and link
- Social proof avatars and text
- Hero image
- Decorative elements (colors, positions, sizes)

### Services Section

```json
{
  "services": {
    "header": {
      "title": { "text": "Our Specialized Services" },
      "description": { "text": "We offer a wide range..." }
    },
    "items": [
      {
        "title": "General Dentistry",
        "description": "Comprehensive exams...",
        "image": { "src": "/service-general.png" },
        "link": { "href": "#services", "text": "Learn More" }
      }
    ]
  }
}
```

**What you can change:**
- Section title and description
- Add/remove/reorder service items
- Service titles, descriptions, images
- Link text and destinations
- All styling classes

### About Section

```json
{
  "about": {
    "images": {
      "items": [
        { "type": "image", "src": "/about-interior.png" },
        { "type": "stat", "value": "15+", "label": "Years Experience" }
      ]
    },
    "content": {
      "title": { "text": "Why Choose Dentistico?" },
      "description": { "text": "We believe..." },
      "features": {
        "items": [
          { "icon": "✨", "title": "Advanced Technology", "description": "..." }
        ]
      }
    }
  }
}
```

**What you can change:**
- Images (add/remove/reorder)
- Statistics (values and labels)
- Title and description
- Feature items (icons, titles, descriptions)
- Layout and styling

### Footer Section

```json
{
  "footer": {
    "brand": {
      "name": "Dentistico",
      "description": { "text": "Redefining dentistry..." },
      "socialMedia": { "items": [...] }
    },
    "quickLinks": { "items": [...] },
    "contact": { "items": [...] },
    "newsletter": { "enabled": true, "title": "Newsletter" },
    "copyright": { "text": "© 2025 Dentistico Clinic..." }
  }
}
```

**What you can change:**
- Brand name and description
- Social media links
- Quick links menu
- Contact information
- Newsletter settings
- Copyright text

## Advanced Customization

### Adding New Service Items

1. Copy an existing service item in `services.items`
2. Update the `id`, `title`, `description`, and `image.src`
3. Adjust `animationDelay` if needed (increments of 100ms)

### Changing Animation Delays

Service cards have staggered animations. Set `animationDelay` in milliseconds:
- First item: `0`
- Second item: `100`
- Third item: `200`
- etc.

### Customizing Decorative Elements

In the hero section, you can modify decorative blobs:
```json
"decorativeElements": [
  {
    "position": "bottom-left",
    "classes": "absolute -bottom-6 -left-6 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl"
  }
]
```

Change:
- `position`: "bottom-left", "top-right", etc.
- `classes`: Tailwind classes for size, color, position, blur

### Modifying Social Proof

Update the hero section's social proof:
```json
"socialProof": {
  "avatars": [
    { "src": "https://i.pravatar.cc/100?u=1", "alt": "user" }
  ],
  "text": "Loved by 2k+ Patients"
}
```

## CSS Classes Reference

The configuration uses Tailwind CSS classes. Common patterns:

- **Colors**: `text-teal-600`, `bg-slate-900`, `border-slate-100`
- **Spacing**: `px-6`, `py-4`, `mb-8`, `gap-4`
- **Typography**: `text-4xl`, `font-bold`, `leading-relaxed`
- **Layout**: `flex`, `grid`, `max-w-7xl`, `mx-auto`
- **Effects**: `rounded-full`, `shadow-xl`, `hover:scale-105`
- **Transitions**: `transition-all`, `duration-300`

## Best Practices

1. **Backup First**: Always backup the config file before making changes
2. **Test Incrementally**: Make small changes and test frequently
3. **Validate JSON**: Use a JSON validator to ensure syntax is correct
4. **Image Optimization**: Optimize images before adding to `static/`
5. **Consistent Naming**: Use consistent naming for IDs and classes
6. **Document Changes**: Keep notes of significant changes

## Troubleshooting

### JSON Syntax Errors
- Use a JSON validator (jsonlint.com)
- Check for missing commas, quotes, or brackets
- Ensure all strings are properly quoted

### Images Not Showing
- Verify image path starts with `/` (e.g., `/hero.png`)
- Check that image exists in `static/` directory
- Ensure file extension matches

### Styles Not Applying
- Verify Tailwind classes are valid
- Check for typos in class names
- Ensure classes are space-separated in strings

### Changes Not Reflecting
- Clear browser cache
- Restart development server
- Check browser console for errors

## Example: Complete Service Item

```json
{
  "id": "pediatric-dentistry",
  "title": "Pediatric Dentistry",
  "description": "Specialized dental care for children in a fun, friendly environment.",
  "image": {
    "src": "/service-pediatric.png",
    "alt": "Pediatric Dentistry"
  },
  "link": {
    "href": "#services",
    "text": "Learn More",
    "icon": "→",
    "classes": "text-teal-600 font-bold text-sm inline-flex items-center gap-2 group-hover:gap-3 transition-all"
  },
  "classes": {
    "card": "group p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-teal-200 transition-all duration-300 hover:shadow-xl reveal-up",
    "imageContainer": "w-full h-48 rounded-2xl overflow-hidden mb-6",
    "image": "w-full h-full object-cover group-hover:scale-110 transition-transform duration-500",
    "title": "text-xl font-bold text-slate-900 mb-3",
    "description": "text-slate-600 text-sm leading-relaxed mb-6"
  },
  "animationDelay": 300
}
```

## Support

For questions or issues with the configuration:
1. Check this documentation
2. Review the JSON structure
3. Validate JSON syntax
4. Check browser console for errors

