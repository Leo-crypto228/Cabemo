---
name: Pro-Stakes Logic
colors:
  surface: '#081425'
  surface-dim: '#081425'
  surface-bright: '#2f3a4c'
  surface-container-lowest: '#040e1f'
  surface-container-low: '#111c2d'
  surface-container: '#152031'
  surface-container-high: '#1f2a3c'
  surface-container-highest: '#2a3548'
  on-surface: '#d8e3fb'
  on-surface-variant: '#c6c6cd'
  inverse-surface: '#d8e3fb'
  inverse-on-surface: '#263143'
  outline: '#909097'
  outline-variant: '#45464d'
  surface-tint: '#bec6e0'
  primary: '#bec6e0'
  on-primary: '#283044'
  primary-container: '#0f172a'
  on-primary-container: '#798098'
  inverse-primary: '#565e74'
  secondary: '#ffe083'
  on-secondary: '#3c2f00'
  secondary-container: '#eec200'
  on-secondary-container: '#645000'
  tertiary: '#adc6ff'
  on-tertiary: '#002e6a'
  tertiary-container: '#00163a'
  on-tertiary-container: '#357df1'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#ffe083'
  secondary-fixed-dim: '#eec200'
  on-secondary-fixed: '#231b00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#adc6ff'
  on-tertiary-fixed: '#001a42'
  on-tertiary-fixed-variant: '#004395'
  background: '#081425'
  on-background: '#d8e3fb'
  surface-variant: '#2a3548'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  stat-value:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '800'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  gutter: 12px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

The brand personality is authoritative, analytical, and disciplined. It moves away from the chaotic, high-stimulus aesthetic of traditional gambling to focus on a "Sober Professional" identity. The goal is to evoke the feeling of a premium financial dashboard or a data-rich sports management tool.

The design style is **Corporate / Modern** with a focus on data density. It prioritizes clarity over decoration, using subtle borders and structured information blocks rather than gradients or atmospheric blurs. The aesthetic is built for high-stakes decision-making where legibility and speed of comprehension are paramount.

## Colors

The palette is anchored in a deep charcoal and navy background to provide a low-strain, high-contrast environment for prolonged data analysis. 

- **Primary Canvas (#0F172A):** The main background color, providing a sober foundation.
- **Secondary / Action (#FACC15):** A focused, vibrant yellow reserved exclusively for 'More' or 'Over' actions to draw the eye to critical conversion points.
- **Tertiary / Utility (#3B82F6):** A professional blue used for selection states and brand identifiers.
- **Surface Neutral (#1E293B):** Used for card backgrounds and elevated containers to separate them from the canvas.
- **Less / Under Action (#334155):** A muted, structural grey-blue for secondary betting options, ensuring the primary 'More' action remains the visual anchor.

## Typography

This design system utilizes **Inter** exclusively for its neutral, highly legible characteristics, particularly with numerical data.

- **Data Hierarchy:** Odds and statistical values use `stat-value` to ensure they are the most prominent elements on the screen.
- **Player Information:** Player names use `headline-sm` for immediate recognition.
- **Metadata:** Use `label-caps` for statistical categories (e.g., "PASSING YARDS") to provide clear labeling without competing with the data values.
- **Mobile Adjustments:** Headlines above 24px should scale down to 20px on mobile devices to preserve horizontal space for betting cards.

## Layout & Spacing

The layout follows a strict **8px grid system** to maintain structural alignment. 

- **Density:** The design system prioritizes "Compact Density." Vertical spacing between betting cards is kept at 12px (`gutter`) to maximize the amount of actionable information visible on a single viewport.
- **Grid Model:** A 12-column fluid grid is used for desktop, while mobile uses a single-column stack with 16px side margins.
- **Card Padding:** Internal padding for betting cards is fixed at 16px on the sides and 12px on the top/bottom to ensure the touch targets for 'More' and 'Less' are comfortable but the card remains slim.

## Elevation & Depth

To maintain a professional, sober aesthetic, the design system avoids heavy shadows and glows. 

- **Layering:** Hierarchy is achieved primarily through **Tonal Layers**. The background is #0F172A, and interactive cards are #1E293B. 
- **Borders:** Subtle 1px solid borders using `#334155` define card boundaries.
- **Depth:** A very subtle, 4px blur shadow with 20% opacity is used only on "Active" or "Focused" states to lift them slightly from the grid.
- **Active States:** Selected chips or active tabs use a solid #3B82F6 background with no shadow, emphasizing a flat, digital-first interface.

## Shapes

The shape language is **Soft (0.25rem)**. This provides a modern feel without being overly "friendly" or bubbly.

- **Standard Radius:** 4px (0.25rem) for all buttons, inputs, and small chips.
- **Card Radius:** 8px (0.5rem) for main betting cards to give them a distinct, structural presence.
- **Pill Factor:** Only selection chips in filter bars use a fully rounded (pill) radius to distinguish them from actionable betting buttons.

## Components

- **Betting Cards:** Use a three-row structure. Row 1: Player/Team Avatar + Name + Game Time. Row 2: Large Stat Value + Stat Label. Row 3: Split-action buttons ('Less' on left, 'More' on right).
- **Action Buttons:** 'More' buttons use the Primary Yellow with black text. 'Less' buttons use a dark navy background with white text and a thin border.
- **Category Chips:** Small, low-profile horizontal scrollers with 4px radius. Active state: Blue background. Inactive state: Dark navy background with border.
- **Input Fields:** Minimalist design with 1px border. No background fill when focused, only a blue border highlight.
- **Data Visuals:** High-contrast line graphs or progress bars using Primary Blue, avoiding complex gradients.
- **Header:** Fixed at the top with a simplified logo, balance display, and profile access. Use a slight bottom border rather than a shadow for separation.