/**
 * Shared class for form controls — text inputs, selects, textareas. Pair with
 * <Field> (which supplies the label). Box metrics (px-3 py-2, text sizes) match
 * the long-standing form controls exactly; the hover/focus-border transitions
 * are pure enrichments and don't change layout.
 */
export const controlClass =
  'w-full rounded border border-brand-rule-grey bg-brand-input px-3 py-2 text-base lg:text-sm text-white transition-colors hover:border-brand-mid-grey focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red'
