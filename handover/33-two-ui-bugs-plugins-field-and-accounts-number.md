# Two UI Bugs: Key Plugins Input and Accounts Numbering

## Key plugins input

The Key plugins field keeps its raw text while the user is typing. It no longer rebuilds the displayed value from the parsed array after every keystroke, so commas, spaces, and the next plugin name remain editable in one pass.

When the field loses focus, the text is parsed using the existing rule: split on commas, trim each item, and remove empty items. The parsed array is then saved through the existing manual auto-save flow, and the input is reseeded with the canonical comma-and-space format.

The general rule is: never bind an input's value to a round-tripped derivation of its own onChange. Keep the user's raw text in local input state, and parse it only at a boundary such as blur or save.

## Accounts & ownership numbering

The public manual always renders the Accounts & ownership section, including its empty state and the note explaining that passwords are never stored. The contents list now marks this section as present even when there are no account rows, so it receives its correct number and anchor link.

Section numbering still comes from the same section list, ensuring that every section after Accounts & ownership shifts by one when the section is present. If a rendered section requests an ID missing from that list, the page logs the ID with `console.error` and omits the number instead of silently displaying `0.`.

## Verification expectations

- Entering `WooCommerce, Yoast SEO, WP Rocket` in one pass preserves all three entries after saving and reloading.
- A published manual with no account rows shows Accounts & ownership as section 4, includes it in the contents list, and supports the anchor link.
- A manual with account rows keeps the existing Accounts & ownership behavior.
- The Accounts & ownership section remains unconditionally rendered.
- No database, public-manual data, migration, grant, anchor ID, print style, or locale behavior changes are required.
