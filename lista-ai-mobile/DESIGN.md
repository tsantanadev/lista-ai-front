# Design System Strategy: The Intelligent Curator

## 1. Overview & Creative North Star
The creative North Star for this design system is **"The Intelligent Curator."** This concept moves away from the utility-only "warehouse" feel of typical shopping apps and instead adopts an editorial, high-end lifestyle aesthetic.

The system breaks the standard "list of boxes" template through **intentional asymmetry**, high-contrast typography scales, and a depth model based on **tonal layering** rather than structural lines. By utilizing generous white space (breathing room) and sophisticated glassmorphism, we transform a mundane chore into a premium, curated digital experience.

---

## 2. Color & Atmosphere
This system uses a palette of deep forest greens and vibrant teals, accented by a warm "premium" amber to signal AI-driven features and loyalty status.

### The "No-Line" Rule
To achieve a high-end editorial feel, **1px solid borders for sectioning are strictly prohibited.** Boundaries must be defined through background color shifts or tonal transitions. For example, a `surface-container-low` card should sit on a `surface` background to define its edges naturally.

### Surface Hierarchy & Nesting
Depth is achieved through the physical layering of "frosted" surfaces.
- **Surface (Base):** `#0b1513` (Dark) / `#FFFFFF` (Light).
- **Surface-Container-Low:** Used for large secondary sections.
- **Surface-Container-High:** Used for interactive cards and primary list items.
- **The Glass & Gradient Rule:** Floating elements (Modals, Bottom Sheets) must use semi-transparent surface colors with a `backdrop-blur` (12px–20px). Main CTAs should utilize a subtle linear gradient (e.g., `primary` to `primary_container`) to provide visual "soul."

---

## 3. Typography: The Editorial Voice
We utilize a pairing of **Plus Jakarta Sans** for expressive, modern headlines and **Manrope** for high-legibility functional text.

| Level | Font | Size | Weight | Intent |
| :--- | :--- | :--- | :--- | :--- |
| **Display-LG** | Plus Jakarta | 3.5rem | 700 | Large brand moments |
| **Headline-MD** | Plus Jakarta | 1.75rem | 600 | Page titles / List names |
| **Title-SM** | Manrope | 1rem | 600 | Item names / Section headers |
| **Body-MD** | Manrope | 0.875rem | 400 | Secondary info / Quantities |
| **Label-MD** | Manrope | 0.75rem | 500 | Metadata / Micro-copy |

The hierarchy relies on extreme scale contrast. A `Headline-MD` list title is paired with a significantly smaller `Label-MD` to create a sophisticated, unbalanced layout that feels intentional and custom.

---

## 4. Elevation & Depth
Traditional drop shadows are too "heavy" for this system. Instead, we use **Tonal Layering.**

* **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section to create a soft, natural lift.
* **Ambient Shadows:** If a floating effect is required (e.g., a "New List" button), use an extra-diffused shadow: `blur: 24px`, `opacity: 6%`, color tinted to `on-surface`.
* **The Ghost Border Fallback:** If accessibility requires a stroke, use the `outline_variant` token at **15% opacity**. Never use 100% opaque borders.
* **Glassmorphism:** Bottom sheets (like "Share this list") should feel like a sheet of frosted glass sliding over the content, maintaining the context of the list underneath.

---

## 5. Components

### Buttons
* **Primary:** Rounded `xl` (1.5rem), using the `primary` to `primary_container` gradient. No border.
* **Secondary:** `surface_container_highest` background with `on_surface` text.
* **AI/Premium CTA:** Uses `secondary` (Amber) to highlight intelligent features.

### Cards & Lists
* **Strict Rule:** No divider lines between list items. Use `12px` of vertical white space to separate items.
* **States:** Checked items transition to `surface_container_low` with a subtle strike-through and 50% opacity on the text.

### Selection & Input
* **Checkboxes:** Large, custom circular rings. When checked, they fill with the `primary` teal and a white checkmark.
* **Input Fields:** Use a `surface_container_high` fill. Avoid the "box" look; use a `rounded-md` (0.75rem) corner and a "Ghost Border" only on focus.

### Additional Signature Components
* **The Progress Micro-Bar:** A slim, 4px rounded bar under the List Title using `primary` and `surface_variant` to show "items completed" without cluttering the UI.
* **Floating "Smart" Action:** A non-centered, floating action button for "Add Item" to break the symmetry of the bottom navigation.

---

## 6. Do's and Don'ts

### Do
* **Do** use overlapping elements. Let a category icon slightly bleed outside its container to create depth.
* **Do** use "Plus Jakarta Sans" for all numbers and prices; its geometric nature feels more premium.
* **Do** prioritize high-quality icons with a consistent stroke weight (1.5pt).

### Don't
* **Don't** use pure black (#000) or pure grey. Use the tinted `surface` tones provided in the palette.
* **Don't** use standard "Material Design" shadows. Keep elevations flat or ambiently blurred.
* **Don't** cram information. If a list feels tight, increase the `surface` padding. Editorial design requires space to "breathe."