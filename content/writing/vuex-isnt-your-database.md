Open a customer record. Change the name. Click Cancel.

If the name in the page heading has already changed, there's a decent chance the form has been editing the same object the rest of the page reads. The Cancel button is decorative. We should probably tell the designer.

Vuex makes this mistake convenient because the record is right there. Bind the field to it, watch the UI update, and enjoy the apparent absence of plumbing. The problem arrives when you need to distinguish a proposed change from an accepted one.

For this editor, I would keep three things separate:

| Value | Owner | When it changes |
| --- | --- | --- |
| Saved customer | Shared store | After an accepted response or deliberate refresh |
| Draft name | Editor instance | As the person types |
| Save status | The workflow handling the request | When the request starts, succeeds, or fails |

The draft begins as a copy of the values being edited. Cancel discards it. Save submits it. A rejected request leaves the draft available so the person can fix it or try again. A successful response updates the shared record with what the server accepted.

That is a little more code than binding directly to the store. It also gives Cancel something to do.

With nested objects, check what “copy” means. A new outer object can still contain references to the original inner objects. If the editor changes those, the apparent draft isn't independent. This is JavaScript being entirely consistent while we weren't paying attention.

### Now leave the page

The next question is how long each value should survive. Local state disappears with its component instance. Shared state can stay around until we explicitly clear or replace it.

Sometimes a draft should survive navigation. That's a feature worth designing. It needs an owner, a way to resume it, and a decision about what happens when the saved record changes underneath it. Moving the object into Vuex doesn't answer any of those questions.

The store's customer record needs a lifetime too. It is a browser-side snapshot. If somebody changes the customer elsewhere, two screens reading the store can agree perfectly and still display an old name.

Maybe fetching on entry is sufficient. Maybe this screen needs a refresh command or a more deliberate cache policy. Decide what freshness the workflow requires. “We already have it” is not a freshness policy.

Persistence to browser storage deserves particular suspicion. Now the stale value can outlive the session that created it. Check what gets cleared on logout before a different user arrives to enjoy the convenience.

### I still want the store to have rules

Use mutations for synchronous changes to shared state and actions for asynchronous work. I think the distinction earns its keep when several components participate in a workflow. Give the operations names that explain what happened.

I wouldn't add an action merely to forward every mutation. But I am willing to pay some ceremony for a predictable shared place to change data. A team needs something better than assignments scattered through whichever component had access to the object.

The same justification doesn't extend to every open dropdown and expanded help message. Shared visibility has a cost. If one component needs a value during one interaction, local state is a perfectly respectable place for it.

For each proposed store field, ask who uses it and when it stops being valid. You should be able to answer both without saying “because we're using Vuex.”
