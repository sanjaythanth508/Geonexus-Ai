---
name: Geospatial Intelligence UI
colors:
  surface: '#051424'
  surface-dim: '#051424'
  surface-bright: '#2c3a4c'
  surface-container-lowest: '#010f1f'
  surface-container-low: '#0d1c2d'
  surface-container: '#122131'
  surface-container-high: '#1c2b3c'
  surface-container-highest: '#273647'
  on-surface: '#d4e4fa'
  on-surface-variant: '#c7c6cc'
  inverse-surface: '#d4e4fa'
  inverse-on-surface: '#233143'
  outline: '#909096'
  outline-variant: '#46464c'
  surface-tint: '#c3c6d7'
  primary: '#c3c6d7'
  on-primary: '#2c303d'
  primary-container: '#0a0e1a'
  on-primary-container: '#777b8a'
  inverse-primary: '#5a5e6d'
  secondary: '#5de6ff'
  on-secondary: '#00363e'
  secondary-container: '#00cbe6'
  on-secondary-container: '#00515d'
  tertiary: '#ddb7ff'
  on-tertiary: '#490080'
  tertiary-container: '#1a0033'
  on-tertiary-container: '#a350f2'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dfe2f3'
  primary-fixed-dim: '#c3c6d7'
  on-primary-fixed: '#171b28'
  on-primary-fixed-variant: '#434654'
  secondary-fixed: '#a2eeff'
  secondary-fixed-dim: '#2fd9f4'
  on-secondary-fixed: '#001f25'
  on-secondary-fixed-variant: '#004e5a'
  tertiary-fixed: '#f0dbff'
  tertiary-fixed-dim: '#ddb7ff'
  on-tertiary-fixed: '#2c0051'
  on-tertiary-fixed-variant: '#6900b3'
  background: '#051424'
  on-background: '#d4e4fa'
  surface-variant: '#273647'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '900'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  display-md:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.02em
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
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

The design system is engineered for high-fidelity geospatial intelligence, projecting a personality that is authoritative, precise, and sophisticated. It operates at the intersection of data science and futuristic exploration, evoking an emotional response of total control and cutting-edge capability.

The visual style is a fusion of **Glassmorphism** and **Corporate Modernism**. It utilizes deep, atmospheric layering to create a sense of infinite digital space, where information floats with clarity over complex map data. High-precision borders and subtle luminescence provide the "instrument-grade" feel required for professional intelligence tools.

## Colors

This design system utilizes a "Deep Space" palette to maximize contrast for geospatial data visualization. 

- **Primary (Deep Cosmic Navy):** Used for the base environment and deep background layers to reduce eye strain during long-form analysis.
- **Accent 1 (Electric Cyan):** Reserved for primary interactive states, data selection, and active "ping" indicators.
- **Accent 2 (Vivid Amethyst):** Specifically designated for AI-generated insights, predictive modeling, and secondary system highlights.
- **Surface Strategy:** Surfaces use semi-transparent white overlays (6-10%) to create a tiered glass effect, allowing map textures to remain subtly visible beneath UI panels.

## Typography

The typographic hierarchy prioritizes density and readability. 

- **Headlines:** Use tight tracking and heavy weights to create a sense of urgency and importance. 
- **Body:** Uses standard Inter for maximum legibility against dark backgrounds.
- **Data Display:** For coordinates, timestamps, and mathematical scores, the system employs **JetBrains Mono** with tabular figures. This ensures that numerical data aligns vertically in tables and monitoring dashboards, preventing layout shifts during real-time updates.

## Layout & Spacing

The layout utilizes a **Fluid Grid** approach for data density but maintains **Fixed Panels** for toolsets.

- **The Map Canvas:** Always occupies the full viewport background.
- **Floating Panels:** UI elements float with a 24px margin from the screen edge.
- **Sidebar Units:** Intelligence sidebars have a fixed width of 360px on desktop to ensure data visualizations remain consistent.
- **Responsive Behavior:** On mobile devices, panels transition to bottom sheets to maximize the viewable area of the map coordinates.

## Elevation & Depth

Depth is established through **Backdrop Blurs** and **Tonal Borders** rather than traditional shadows.

- **Level 1 (Base):** Map layer.
- **Level 2 (Panels):** `20px` background blur with a `1px` solid border (`#FFFFFF15`).
- **Level 3 (Modals/Popovers):** `40px` background blur with a subtle `Electric Cyan` outer glow (0px 0px 15px rgba(34, 211, 238, 0.2)).
- **Interactive States:** Hovering over a card or interactive element should trigger a slight increase in border opacity (from 10% to 25%) and a subtle interior gradient shift.

## Shapes

The shape language balances approachability with technical precision. Large radii on major containers (20px) give the system a premium, modern feel, while tighter radii on internal components (8px - 12px) maintain an organized, "instrumental" appearance.

All interactive elements must maintain a clear, geometric footprint. Avoid organic or overly fluid shapes to keep the focus on the data.

## Components

- **Buttons:** Primary buttons use a solid `Electric Cyan` fill with dark text. Secondary buttons use a glass background with a subtle gradient border.
- **Cards:** Must feature the `20px` corner radius and `20px` backdrop blur. Use a subtle top-down linear gradient for the border to simulate overhead lighting.
- **Data Tables:** Tables use zebra-striping created by alternating row opacities (0% and 4%). Columns containing coordinates or IDs must use the `data-mono` type style.
- **Chips/Status:** Status indicators for AI insights use a glowing `Vivid Amethyst` dot. For system health, use `Emerald Glow` and `Crimson Flare`.
- **Inputs:** Fields are dark with a `1px` border that illuminates to `Electric Cyan` on focus.
- **Icons:** Use high-stroke-weight (2px+) minimalist icons to ensure visibility against complex map backgrounds.
- **Intelligence Feed:** A specialized vertical list component for real-time events, utilizing timestamped entries and color-coded priority markers.