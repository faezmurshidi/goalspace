import preset from '@goalspace/config/tailwind/preset';
import type { Config } from 'tailwindcss';

/**
 * The preset defines the shadcn semantic colours as `hsl(var(--token))`, which
 * cannot express the OKLCH palette this system is built on. Everything below
 * overrides those keys rather than adding to them: `theme.extend` in this file
 * is merged over the preset's, so same-named keys win here.
 *
 * `oklch(var(--x) / <alpha-value>)` is the form that lets Tailwind inject
 * opacity modifiers. See the long note in app/globals.css for why the tokens
 * are stored as bare channels to make this possible.
 */
const manual = (token: string) => `oklch(var(--${token}) / <alpha-value>)`;

export default {
  presets: [preset],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    '../../packages/*/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Manual palette, addressable directly: text-ink, border-rule,
        // bg-oxide-deep, text-waiting.
        paper: manual('paper'),
        'paper-shade': manual('paper-shade'),
        ink: manual('ink'),
        'ink-soft': manual('ink-soft'),
        rule: manual('rule'),
        'rule-strong': manual('rule-strong'),
        oxide: manual('oxide'),
        'oxide-deep': manual('oxide-deep'),
        waiting: manual('waiting'),

        // Semantic names, so shared @goalspace/ui components resolve into
        // this palette untouched.
        background: manual('background'),
        foreground: manual('foreground'),
        border: manual('border'),
        input: manual('input'),
        ring: manual('ring'),
        card: {
          DEFAULT: manual('card'),
          foreground: manual('card-foreground'),
        },
        popover: {
          DEFAULT: manual('popover'),
          foreground: manual('popover-foreground'),
        },
        primary: {
          DEFAULT: manual('primary'),
          foreground: manual('primary-foreground'),
        },
        secondary: {
          DEFAULT: manual('secondary'),
          foreground: manual('secondary-foreground'),
        },
        muted: {
          DEFAULT: manual('muted'),
          foreground: manual('muted-foreground'),
        },
        accent: {
          DEFAULT: manual('accent'),
          foreground: manual('accent-foreground'),
        },
        destructive: {
          DEFAULT: manual('destructive'),
          foreground: manual('destructive-foreground'),
        },
        // The preset also declares a `sidebar` scale against tokens this app
        // no longer defines. Remapped rather than deleted, so any shared
        // component reaching for it lands on the manual palette instead of an
        // unresolvable var.
        sidebar: {
          DEFAULT: manual('paper-shade'),
          foreground: manual('ink'),
          accent: manual('paper-shade'),
          'accent-foreground': manual('ink'),
          primary: manual('oxide-deep'),
          'primary-foreground': manual('paper'),
        },
      },

      fontFamily: {
        sans: ['var(--font-archivo)', 'Helvetica Neue', 'sans-serif'],
        mono: ['var(--font-azeret)', 'ui-monospace', 'monospace'],
      },

      /**
       * A fixed rem scale, not the fluid clamp() scale apps/web uses. Product
       * register: users sit at a consistent DPI, and a heading that shrinks
       * because it happens to sit in a narrow column looks broken rather than
       * responsive. Steps run at roughly 1.2.
       *
       * `display` exists for exactly one thing: the elapsed-time figure on the
       * resume view, per DESIGN.md's Duration Rule. There is no second display
       * number anywhere in the workspace.
       */
      fontSize: {
        display: ['3rem', { lineHeight: '0.95', letterSpacing: '-0.02em', fontWeight: '800' }],
        headline: ['1.5rem', { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '700' }],
        title: ['1.0625rem', { lineHeight: '1.3', fontWeight: '600' }],
        body: ['0.9375rem', { lineHeight: '1.55' }],
        label: ['0.75rem', { lineHeight: '1.3', letterSpacing: '0.08em', fontWeight: '500' }],
        micro: ['0.6875rem', { lineHeight: '1.25', letterSpacing: '0.06em', fontWeight: '500' }],
      },

      /**
       * Square corners are non-negotiable across the system, so every step is
       * flattened rather than only the ones this app writes by hand: shared
       * components hardcode `rounded-md` and `rounded-lg` internally, and
       * those have to land at zero too.
       *
       * `full` survives as the single exception DESIGN.md allows, for the
       * circled callout number.
       */
      borderRadius: {
        none: '0px',
        sm: '0px',
        DEFAULT: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px',
        full: '9999px',
      },

      /**
       * The No Shadow Rule. A printed page does not cast a shadow onto itself,
       * and the moment one appears the system collapses into a generic card
       * interface. Flattened at the scale rather than by convention, because
       * shared Dialog/Popover/Toast components apply `shadow-lg` internally
       * where this app never gets to intervene. They separate by border and
       * ground instead, which they already carry.
       */
      boxShadow: {
        none: 'none',
        sm: 'none',
        DEFAULT: 'none',
        md: 'none',
        lg: 'none',
        xl: 'none',
        '2xl': 'none',
        inner: 'none',
      },

      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
      },

      transitionDuration: {
        // Product register: state changes land in 150-250ms.
        DEFAULT: '150ms',
      },
    },
  },
} satisfies Config;
