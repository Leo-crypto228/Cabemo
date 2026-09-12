---
name: Cademo
colors:
  surface: '#0d1320'
  surface-dim: '#0d1320'
  surface-bright: '#333947'
  surface-container-lowest: '#070e1a'
  surface-container-low: '#151c28'
  surface-container: '#19202c'
  surface-container-high: '#232a37'
  surface-container-highest: '#2e3542'
  on-surface: '#dce2f4'
  on-surface-variant: '#d0c6ab'
  inverse-surface: '#dce2f4'
  inverse-on-surface: '#2a313e'
  outline: '#999077'
  outline-variant: '#4d4732'
  surface-tint: '#e9c400'
  primary: '#fff6df'
  on-primary: '#3a3000'
  primary-container: '#ffd700'
  on-primary-container: '#705e00'
  inverse-primary: '#705d00'
  secondary: '#b8c4ff'
  on-secondary: '#002584'
  secondary-container: '#173bab'
  on-secondary-container: '#a0b1ff'
  tertiary: '#d8ffe7'
  on-tertiary: '#003824'
  tertiary-container: '#65f2b5'
  on-tertiary-container: '#006d4a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe16d'
  primary-fixed-dim: '#e9c400'
  on-primary-fixed: '#221b00'
  on-primary-fixed-variant: '#544600'
  secondary-fixed: '#dde1ff'
  secondary-fixed-dim: '#b8c4ff'
  on-secondary-fixed: '#001453'
  on-secondary-fixed-variant: '#173bab'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0d1320'
  on-background: '#dce2f4'
  surface-variant: '#2e3542'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  title-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
  stats-numeric:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 32px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 12px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style
The brand personality is high-octane, elite, and intensely engaging. It targets a modern, data-savvy sports bettor who values precision and the thrill of the win. The visual direction is **Corporate / Modern** infused with **Glassmorphism** and **High-Contrast** elements.

This design system aims to evoke "focused excitement." By utilizing deep, light-absorbing backgrounds contrasted with luminous, neon-adjacent accents, the UI creates a "Las Vegas at Night" psychological effect—minimizing the sense of time passing while maximizing the visibility of rewarding actions. The "dopamine" feel is reinforced through subtle glows and tactile response metaphors.

## Colors
The palette is built on a "Deep Space" foundation to ensure maximum contrast for critical betting information.

- **Primary (#FFD700):** "Vibrant Gold." Reserved for high-value actions, "More" selections, and major CTA buttons. It signifies wealth and opportunity.
- **Secondary (#1E40AF):** "Electric Blue." Used for "Less" selections and secondary navigation. It provides a cool counterbalance to the heat of the gold.
- **Success (#10B981):** "Emerald Win." Used strictly for positive balance changes, winning tickets, and progress milestones.
- **Background Tiers:** The primary canvas is `#0B121E`. Surface containers and cards use `#151C2C` to create a subtle sense of depth without relying on heavy borders.

## Typography
The typography system uses **Inter** for its exceptional legibility in data-dense environments. 

- **Weight as Hierarchy:** Use Extra Bold (800) for betting odds and numbers to ensure they are the first thing a user sees.
- **Numerical Focus:** Statistics and balance figures should always use the `stats-numeric` style to feel substantial and authoritative.
- **Readability:** Maintain high contrast ratios by using Pure White (#FFFFFF) for primary text and a muted slate (#94A3B8) for secondary metadata.

## Layout & Spacing
This design system utilizes a **Fluid Grid** with a tight 4px base unit to accommodate the high density of information required for sports betting.

- **Density:** The layout should feel compact but organized. Use `sm` (12px) spacing between related betting elements and `lg` (24px) between distinct betting categories.
- **Mobile First:** On mobile, the grid uses a 2-column or 1-column layout for bet slips. Margins are fixed at 16px to maximize the "playable" area.
- **Reflow:** On larger screens, the bet slip should pin to the right-hand side as a persistent sidebar, while the main betting market expands into a multi-column card layout.

## Elevation & Depth
Depth is created through **Tonal Layering** and **Glassmorphism**, avoiding traditional shadows which can look muddy on dark backgrounds.

- **Level 0 (Base):** Deep Navy (#0B121E) - The main application background.
- **Level 1 (Cards):** Charcoal (#151C2C) - Used for individual player or match cards.
- **Level 2 (Active/Floating):** Semi-transparent overlays with a 12px backdrop blur. This is used for "Review & Enter" bars and modal dialogs.
- **Glow Accents:** Active bets or "Success" states should utilize a `box-shadow: 0 0 15px rgba(255, 215, 0, 0.3)` to simulate a neon light effect, making the winning elements feel "charged."

## Shapes
The shape language is consistently **Rounded**, striking a balance between professional precision and approachable gaming.

- **Standard Radius:** 12px-16px for all primary cards and buttons.
- **Inner Elements:** Small inputs or secondary buttons within a card should use 8px to maintain visual nested harmony.
- **Progress Bars:** Should be fully pill-shaped (100px radius) to emphasize the fluid movement toward the 2000€ goal.

## Components
- **Primary Buttons (More):** Solid #FFD700 background with black text. On hover/active, add an outer gold glow.
- **Secondary Buttons (Less):** Solid #1E40AF background with white text. 
- **Betting Cards:** Use a subtle 1px stroke (rgba(255,255,255,0.1)) to define edges against the dark background. 
- **Progress Tracker:** A prominent component showing the journey to 2000€. Use a gradient fill (Electric Blue to Emerald Green) to visualize growth.
- **Chips/Filters:** Pill-shaped with a dark stroke; when selected, they should fill with the primary gold or secondary blue depending on context.
- **Input Fields:** Darker than the card background (#070B14) with a focused state that "glows" the border in the primary gold color.
- **Win State:** When a bet is won, the entire card should flash with an emerald green border and a light particle effect to maximize the "dopamine" response.