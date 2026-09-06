Here's a fictional history of a temporary permission check.

**The first feature.** The proper interface isn't available yet. A component reads a convenient field from the account response and uses it to decide whether to show an edit control. The server still enforces access. The display workaround meets the deadline.

The review says we'll replace it when the API exposes the actual capability.

Reasonable enough.

**The second feature.** Another engineer needs the same decision. They find the first component and copy its interpretation. There is no shared helper because the first use was temporary. There is also no reason for the second engineer to know the conversation that accompanied it.

**The third feature.** The pattern now has precedent. A reviewer sees that the implementation is consistent with existing code. This is usually something reviewers like.

**The API catches up.** It now supplies the capability directly. Nobody has been assigned to replace the display checks. The original feature is done, and the new work has its own deadline.

**The rule changes.** The three interpretations need attention. There may be more. Someone searches for the field name and tries to distinguish permission logic from unrelated uses. This wasn't in the estimate because it is apparently implementation detail.

That is how a cheap decision acquires expensive consumers.

The original compromise wasn't necessarily wrong. What was missing was a place to contain it and a person responsible for recognizing when its removal became possible.

One clearly named function could have held the temporary interpretation. It wouldn't need an elaborate abstraction. Its consumers would be discoverable, and its explanation could name the missing contract. Replacing it would then be a defined piece of work.

“Clean up later” supplies neither the condition nor the owner.

When prioritizing the repair, describe the actual cost: changing this permission rule requires edits across several screens and can leave inconsistent behavior if one is missed. That gives a product partner something concrete to weigh against upcoming work. “We have technical debt” is too broad to help much.

Also investigate why this particular shortcut keeps being needed. Repeatedly bypassing a boundary may mean the supported path is incomplete or too slow. Fixing that obstacle can prevent more debt than repairing each copy afterward.

A deadline can justify a local compromise. It shouldn't silently authorize a permanent convention. The next engineer will learn from the easiest example to find, whether or not we intended to teach it.
