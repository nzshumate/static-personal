I owe the mutations an apology. Specifically, I owe everyone who had to write them an apology for how readily I defended the paperwork.

In 2019 I said Vuex's discipline was worth paying for. I still want shared state to have understandable operations. Pinia has made it awkward to argue that a separate mutation layer is necessary to get them.

An action can update state directly. A small store can look like this:

```js
import { defineStore } from 'pinia'

export const useSelectionStore = defineStore('selection', {
  state: () => ({ selectedId: null }),
  actions: {
    select(id) {
      this.selectedId = id
    }
  }
})
```

There's the state. There's the operation. No forwarding address required.

The TypeScript support matters too. Imported stores and inferred actions give tooling a clearer interface to work with. I would prefer a rename that the editor understands over another expedition to find significant strings.

This doesn't invalidate the rest of the 2019 post. A draft can remain local. A cached response still needs a freshness policy. Pinia's agreeable syntax is not a reason to give every tooltip a store.

For an existing application, migrate a coherent piece of state with its consumers. Decide which store owns it during the transition. Two writable versions of the truth are not a migration strategy I want to debug.

I wouldn't interrupt stable work just to remove Vuex. For new shared state, though, Pinia is my preference. It preserves the parts I care about with less machinery.

Apparently some of the structure I considered necessary was simply familiar.
