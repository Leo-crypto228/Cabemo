---
name: Cademo
colors:
  surface: '#0b1323'
  surface-dim: '#0b1323'
  surface-bright: '#31394b'
  surface-container-lowest: '#060e1e'
  surface-container-low: '#141b2c'
  surface-container: '#182030'
  surface-container-high: '#222a3b'
  surface-container-highest: '#2d3546'
  on-surface: '#dbe2f9'
  on-surface-variant: '#c4c5d7'
  inverse-surface: '#dbe2f9'
  inverse-on-surface: '#293041'
  outline: '#8e90a0'
  outline-variant: '#434655'
  surface-tint: '#b7c4ff'
  primary: '#b7c4ff'
  on-primary: '#002682'
  primary-container: '#1d4ed8'
  on-primary-container: '#cad3ff'
  inverse-primary: '#2151da'
  secondary: '#ffe083'
  on-secondary: '#3c2f00'
  secondary-container: '#eec200'
  on-secondary-container: '#645000'
  tertiary: '#4ae176'
  on-tertiary: '#003915'
  tertiary-container: '#006b2d'
  on-tertiary-container: '#5cf083'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001551'
  on-primary-fixed-variant: '#0039b5'
  secondary-fixed: '#ffe083'
  secondary-fixed-dim: '#eec200'
  on-secondary-fixed: '#231b00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#6bff8f'
  tertiary-fixed-dim: '#4ae176'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005321'
  background: '#0b1323'
  on-background: '#dbe2f9'
  surface-variant: '#2d3546'
typography:
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 20px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 18px
  label-bold:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-muted:
    fontFamily: Hanken Grotesk
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  data-display:
    fontFamily: Hanken Grotesk
    fontSize: 22px
    fontWeight: '800'
    lineHeight: 22px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  space-xs: 4px
  space-sm: 8px
  space-md: 12px
  space-lg: 16px
  container-margin: 12px
  card-gap: 8px
---

## Brand & Style

The design system is engineered for high-stakes, data-rich environments where speed and legibility are paramount. The personality is **Professional, Technical, and Kinetic**. It targets a user base that demands efficiency and clarity under pressure, evoking a sense of "performance-grade" software.

The visual style is **Modern Corporate with a High-Density Athletic edge**. It avoids decorative flourishes like blurs or glows, favoring a crisp, flat aesthetic with structural integrity. Depth is achieved through strategic color layering rather than shadows, ensuring that critical data points remain the primary focus in a dark-mode-first environment.

## Colors

The palette is anchored in a deep **Midnight Navy (#101828)** which serves as the canvas for the entire experience. 

- **Primary Blue (#1D4ED8):** Used for selected states, highlighting player cards, and key interactive elements.
- **Action Yellow (#FACC15):** Reserved strictly for high-priority calls to action, such as the active "More" betting option. It provides maximum contrast against the navy background.
- **Success Green (#22C55E):** Used for positive balance indicators and "add" actions.
- **Layering Neutrals:** We use subtle shifts in navy/slate to differentiate card surfaces from the background, creating a clear hierarchical stack without needing shadows.

## Typography

This design system utilizes **Hanken Grotesk** across all levels for its sharp terminals and excellent legibility in high-density layouts. 

- **Data Dominance:** Numeric values (e.g., "32.5") use the `data-display` style—bold, heavy, and large—to ensure they are the first thing a user sees.
- **Hierarchy through Weight:** We rely on font weight (Bold vs. Medium) and color (White vs. Slate-400) to distinguish between primary data (Player Name) and metadata (Game Time, Team).
- **Condensed Spacing:** Line heights are tight to accommodate the "above the fold" requirement of data-heavy mobile interfaces.

## Layout & Spacing

The layout philosophy is **High-Density Fluid**. This design system maximizes vertical space to ensure users can view multiple betting options simultaneously.

- **Grid Model:** 12-column fluid grid for desktop; single-column stack for mobile with 12px side margins.
- **Tight Gutters:** 8px spacing between cards and 12px internal padding for card components creates a compact, efficient rhythm.
- **Scanning Pattern:** Elements are horizontally segmented. Player info sits top-left, while action buttons are anchored to the right, creating a clear "Z-pattern" for decision making.

## Elevation & Depth

The system uses **Tonal Layering** instead of shadows. 

1. **Level 0 (Background):** #101828 - The global canvas.
2. **Level 1 (Default Card):** #1E293B - Used for inactive or standard player rows.
3. **Level 2 (Active/High-Contrast):** Primary Blue (#1D4ED8) - Used to highlight a card that is currently being interacted with.
4. **Level 3 (UI Overlays):** #334155 - Used for modals or tooltips.

All borders are 1px solid with low opacity (#FFFFFF10) to provide crisp definition between surfaces without adding visual weight.

## Shapes

The design system uses a **Standardized Rounded** corner radius. 

- **Cards & Inputs:** 8px (rounded-md) provides a modern, professional look that balances the "sharpness" of the data.
- **Action Buttons:** 8px to match cards, ensuring a cohesive unit.
- **Pills/Chips:** 100px (fully rounded) are used for category filters (e.g., "Points", "Rebounds") to differentiate them from the primary actionable cards.
- **Avatars:** Circular clips for player photos, framed within the card structure.

## Components

### Player Cards
Cards are the primary data container. They feature a 2-tier layout:
- **Top Tier:** Player avatar (left), Name and Game Metadata (right).
- **Bottom Tier:** Stat target (e.g., "32.5 Points") on the left; dual-action buttons ("Less" / "More") on the right.

### Buttons
- **Primary Action (Active):** Solid Yellow background with Black text. No shadow.
- **Secondary Action (Inactive):** Dark Slate background (#334155) with White text and a subtle down/up arrow icon.
- **Ghost Buttons:** Used for secondary filters and navigation.

### Input & Search
Search bars are dark-filled (#1E293B) with a magnifying glass icon on the right, maintaining a low profile until interacted with.

### Category Chips
Horizontally scrollable pills. Selected state uses Primary Blue; unselected state uses a subtle navy outline or semi-transparent fill.