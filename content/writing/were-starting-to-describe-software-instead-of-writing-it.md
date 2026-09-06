Here are two ways to ask for the same hypothetical feature.

> Add customer export.

That will probably produce an export. It leaves a remarkable amount of product design to whoever, or whatever, implements it.

Try this instead:

> Add a CSV export for the current filtered customer list. Use the existing export path. Include the same fields the screen currently permits this user to see; enforce access through the existing server-side permission boundary. Preserve the filter meaning. If the current API cannot support that behavior, identify the gap before implementing a workaround. Show a useful failure state and verify both authorized and unauthorized cases.

This still isn't a complete specification. We need to settle the size limit, date formatting, and precisely which fields belong in the file. The improvement is that important decisions and unknowns have started to become visible.

That is where I think more of the engineering work is going.

Tools such as the Codex agent released in May can work on repository tasks, edit files, and run checks in an isolated environment. The interaction can begin with a bounded change rather than a request for the next few lines. A weak brief can therefore become a substantial implementation before its missing assumptions are obvious.

I don't want to respond by specifying every function in prose. At that point we are writing the implementation in a language with worse error messages. Describe the behavior, the constraints, and the evidence. Leave room for an approach to be proposed.

The repository supplies part of the brief too. Which path is “the existing export path”? Is it discoverable? Do the examples reflect current practice? Can the relevant checks be run through a documented process?

If those answers require finding the longest-serving engineer, delegation will keep returning to that person. A little repository maintenance can remove more friction than another paragraph of instructions.

Acceptance needs its own thought. Passing tests proves what those tests check. An implementation and tests generated from the same mistaken interpretation may agree perfectly. Inspect the permission boundary and data selection against the requirement, not merely against the generated explanation.

Also consider whether the proposed machinery is necessary. A complete implementation is still a candidate, and it may be the wrong candidate. The speed of its arrival should make it easier to discard.

I am still happy to write code directly when that is the clearest way to finish a task. But a well-described change is increasingly something a tool can attempt. The quality of the description now has consequences sooner.

The second brief takes longer to write. Most of that time is spent making decisions somebody needed to make.
