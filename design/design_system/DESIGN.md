---
colors:
  surface: '#fcf8f9'
  surface-dim: '#dcd9da'
  surface-bright: '#fcf8f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f4'
  surface-container: '#f0edee'
  surface-container-high: '#ebe7e8'
  surface-container-highest: '#e5e2e3'
  on-surface: '#1c1b1c'
  on-surface-variant: '#46464c'
  inverse-surface: '#313031'
  inverse-on-surface: '#f3f0f1'
  outline: '#76767c'
  outline-variant: '#c7c6cc'
  surface-tint: '#5a5e6d'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#171b28'
  on-primary-container: '#808393'
  inverse-primary: '#c3c6d7'
  secondary: '#0050cc'
  on-secondary: '#ffffff'
  secondary-container: '#0266ff'
  on-secondary-container: '#f9f7ff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#2f1500'
  on-tertiary-container: '#c96b00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dfe2f3'
  primary-fixed-dim: '#c3c6d7'
  on-primary-fixed: '#171b28'
  on-primary-fixed-variant: '#434654'
  secondary-fixed: '#dae1ff'
  secondary-fixed-dim: '#b3c5ff'
  on-secondary-fixed: '#001849'
  on-secondary-fixed-variant: '#003fa4'
  tertiary-fixed: '#ffdcc4'
  tertiary-fixed-dim: '#ffb77f'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6f3900'
  background: '#fcf8f9'
  on-background: '#1c1b1c'
  surface-variant: '#e5e2e3'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-padding: 20px
  gutter: 16px
---

## Brand & Style

The design system is engineered to bridge the gap between high-end digital aesthetics and the gritty reliability of physical labor. It evokes a "Pro-at-your-fingertips" emotional response, utilizing a high-fidelity visual language inspired by market leaders like Stripe and Linear.

The style is defined by extreme precision, generous whitespace, and a sophisticated interplay between deep monochromatic surfaces and vibrant functional accents. It rejects the "utility" look of typical classified apps in favor of a sleek, transactional environment that justifies a premium price point. Key motifs include ultra-thin borders, subtle motion blur backgrounds for overlays, and a strict adherence to a 4pt grid system to ensure visual density remains optimal for mobile-first interactions.

## Colors

This design system utilizes a high-contrast palette to drive user action and establish institutional trust.

- **Primary Dark Navy (#0A0E1A):** Used for primary text, deep backgrounds, and high-level navigation components. It provides the "anchor" for the premium feel.
- **Secondary Electric Blue (#0066FF):** The core brand color. Used for selection states, links, and progress indicators. It signals modern technology.
- **Vivid Orange (#FF8A00):** Reserved exclusively for primary Call-to-Action (CTA) buttons. This high-energy accent ensures the "Book Now" flow is never missed.
- **Yellow (#FFD600):** A functional color for urgency, warning states, and high-priority service badges (e.g., "Arriving Soon").
- **Background & Surfaces:** A tiered system of `#F8FAFC` for the canvas and `#FFFFFF` for cards creates a crisp, layered hierarchy that feels light and accessible.

## Typography

The typography relies on **Inter** to deliver a neutral, highly legible experience across various screen densities. 

Hierarchy is achieved through weight rather than just size. Headlines use `600` or `700` weight with tighter letter spacing to create a "compact" tech aesthetic. Body text is kept at `400` with generous line height to ensure readability for technical service descriptions. For mobile, avoid using any size smaller than `12px` for critical information. Label styles utilize `600` weight and slight tracking to differentiate them from body copy in form fields and metadata.

## Layout & Spacing

The design system follows a **fluid grid** model optimized for mobile-first delivery. 

- **Mobile (Default):** 4-column grid with 20px side margins and 16px gutters.
- **Tablet/Desktop:** 12-column centered grid with a max-width of 1200px.

Spacing is strictly based on a 4px base unit. Component internal padding should default to `md` (16px) to maintain a spacious, premium feel. Stacked sections should use `xl` (32px) spacing to prevent visual clutter. Vertical rhythm is critical; elements are grouped logically with smaller increments (4px, 8px) while distinct functional blocks are separated by larger increments (24px, 32px).

## Elevation & Depth

Depth is used sparingly to denote interactivity and information hierarchy. This design system avoids heavy, muddy shadows in favor of "ambient" lighting and glassmorphism.

- **Level 0 (Base):** Background color `#F8FAFC`.
- **Level 1 (Card):** White surface with a 1px stroke of `#E2E8F0` and no shadow.
- **Level 2 (Elevated):** White surface with a very soft, diffused shadow: `0px 4px 12px rgba(10, 14, 26, 0.05)`. Used for interactive cards.
- **Level 3 (Overlay):** Used for Modals and Drawers. Implements a backdrop blur (12px) on the layer below and a deeper shadow: `0px 12px 32px rgba(10, 14, 26, 0.12)`.
- **Glassmorphism:** Navigation bars and bottom sheets should use a semi-transparent white `rgba(255, 255, 255, 0.8)` with a `blur(20px)` effect to maintain context of the scroll position.

## Shapes

The shape language is friendly yet structured. The "Rounded" setting ensures that the interface feels modern and approachable without becoming overly "bubbly."

- **Standard Elements:** 16px (`1rem`) border radius is the default for buttons, input fields, and small cards.
- **Large Containers:** 24px (`1.5rem`) radius is used for top-level cards and bottom sheets.
- **Pill Shapes:** Used exclusively for tags, status chips, and toggle switches.
- **Focus States:** A 2px secondary blue stroke with a 4px offset to ensure accessibility without breaking the container's silhouette.

## Components

### Buttons
- **Primary:** Background `Vivid Orange (#FF8A00)`, Text `White`, Rounded `16px`. Heavy emphasis, used only once per view.
- **Secondary:** Background `Electric Blue (#0066FF)` or `Dark Navy (#0A0E1A)`, Text `White`.
- **Ghost:** Transparent background, 1px border `Primary Navy` at 10% opacity.

### Input Fields
- Heights should be 56px for mobile tap targets. 
- Background `White`, 1px Border `#E2E8F0`. 
- Active state: 1.5px Border `Electric Blue`.

### Cards
- Service provider cards must feature a prominent rating chip (Yellow background) and a clear price-point label. 
- Content should be padded with 20px on all sides.

### Chips & Status Indicators
- Use pill-shaped containers. 
- "Available" uses a soft green tint; "Urgent" uses the Vivid Orange.

### Navigation
- **Bottom Bar:** Glassmorphism effect with a subtle 1px top border. Icons should be 24px, 2pt stroke width.
- **Active State:** Icon and label in Electric Blue.

### Additional Elements
- **Provider Quick-View:** A bottom sheet that slides up, utilizing the `Level 3` elevation and a 24px top radius.
- **Booking Progress:** A slim, 4px tall progress bar at the very top of the viewport in Electric Blue.