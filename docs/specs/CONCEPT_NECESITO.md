# "Necesito": the product in one sentence

> **Publish once and the offers compete for you.**

Buyniverse used to read as a toolbox: requests, quote rounds, live bids, orders,
invoices, talent, services, projects. Each lived in its own module with its own
vocabulary. The product is simpler than that. A buyer has a **need**; everything
else is that need moving through five stages.

| # | Stage | Who works | Where it happens |
|---|-------|-----------|------------------|
| 1 | **You publish** | Buyer | `/necesito`, then the request waits for its approver when the buyer cannot approve it |
| 2 | **They compete** | Suppliers | Quote round (`/procurement/sourcing`) or live reverse auction (`/procurement/auction`) |
| 3 | **You choose** | Buyer | Comparison and award (`/procurement/sourcing?tab=comparison`) |
| 4 | **You receive** | Buyer, warehouse | Order, receipt, issues (`/procurement/execution`) |
| 5 | **You pay** | Buyer, finance | Three-way match, CFDI invoice, escrow (`/invoices`) |

## One model, two readers

`app/lib/need-journey.js` is the single definition. It derives, from the
existing records (purchase request, sourcing event, auction, purchase order,
invoice), the stage of every need, whether it is asking for a hand, what the
best offer is and what the next action is. The home page, the stage rail, the
"My needs" board and the QA read the same function, so they cannot disagree.

Categories carry one accent each (products, talent, services, projects,
freight, supplies). The accent recolours everything the need touches: the dot
on the 3D mark, the auction card, the category chip, the board row.

## Publishing is governed, not shortcut

`store.publishNeed` creates the purchase request. If the person publishing is
also its approver (an admin, or the request's approver) it is approved on the
spot and `store.launchNeed` opens the round with the suppliers that fit the
category. Otherwise the request waits as "Pending approval" with its intent
attached, and the approver's approval opens the round by itself. The approver
never gains standing management rights over the owner's records: delegation
lasts for the one call (`scripts/qa/needFlow.js` checks both).

Suppliers are chosen by `matchSuppliers`: category fit first, then score, never
one that the risk rule excludes (risk above 40), and never fewer than two.

## What changed in the interface

- **Home**: one sentence and one search box. It types real needs, recolours by
  category and answers with a live (clearly labelled sample) reverse auction
  built from the real suppliers of that category. Submitting goes to `/necesito`.
- **Logo and favicon**: a ring and a dot (`assets/brand/buyniverse-ring.svg`),
  also rendered in 3D on the home page (`app/lib/bn-ring.js`). The dot orbits to
  the category you pick.
- **In-app**: the five-stage rail replaces the flat tabs; "My needs" replaces
  the cockpit's separate request/quote/order lists; the buyer sidebar is
  Needs / Market / Money; the header action is "I need…".
- **Palette and type**: aurora blue (`#3f6af2`) and teal (`#36e3c0`) on a night
  background, Sora for display and JetBrains Mono for data.

## The calm design language

Every screen follows the same few rules (tokens and shell in `app/experience/bn-calm.css`):

1. **No outlines.** Containers are soft planes; a hairline appears only between rows that would otherwise merge.
2. **Type carries hierarchy.** One large light number per idea (`font-mono`, weight 300), small plain labels, no icon tiles.
3. **One living accent.** The workspace glows with the colour of the stage you are in (publish, compete, choose, receive, pay); publishing a need recolours it by category.
4. **Space over chrome.** One prompt in the header ("I need…"), a quiet sidebar without section headings, tables that show their controls on intent.
5. **Movement with meaning.** Pages arrive, numbers count up, the dot orbits when a need goes out. Everything respects reduced motion.

Legacy lists and forms are re-skinned by the same layer, so a screen nobody has redesigned yet is still calm.

## Deliberately not changed

- Projects with milestones and escrow (`/post-job`) remain for service work; the
  need page links to it.
- Supplier workspaces keep their own navigation and a calm, 3D-free home.
- Raster brand assets (PNG marks, OG images, manifest icons) and the explainer
  film still show the old mark until `tools/brand` and `tools/marketplace-film` are
  re-rendered; the film is hidden on the home page until then.
