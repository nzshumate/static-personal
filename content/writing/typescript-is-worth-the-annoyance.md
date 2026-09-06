Here is an object that asks every consumer to be careful:

```ts
type CustomerResult = {
  loading: boolean
  error: string | null
  customer: Customer | null
}
```

`Customer` is the application's customer type. The rest is familiar request state. Nothing looks especially dangerous.

But the shape permits a successful customer and an error at the same time. It permits loading with an error. It permits no customer, no error, and no loading. Some of these might be intentional. Reading the type doesn't tell me which.

To understand the screen, I now have to find every assignment to the object and reconstruct the rules. The type tells me what each field contains. The workflow is still a rumor.

For a request that has four distinct states, I'd prefer this:

```ts
type CustomerResult =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'failed'; message: string }
  | { status: 'ready'; customer: Customer }
```

When code handles `ready`, the customer is available. When it handles `failed`, there is a message. We have made a decision about the possible states, and the compiler can help preserve it.

This is the TypeScript benefit I care about. A future edit has to confront the model instead of accidentally inventing another combination of booleans.

### Then the requirement changes

Suppose the product wants to keep the old customer visible while refreshing. The second model doesn't currently express that.

Good. We found a decision.

We can add an explicit refreshing state that contains the previous customer, then decide how a failed refresh differs from an initial failure. That requires changes in the consumers. Those consumers needed attention anyway; the compiler is making the obligation visible while the requirement is still fresh.

A type that never inconveniences us may not be preserving much.

The same logic applies to optional fields. Adding a question mark to make a diagnostic go away changes the agreement with every reader of the value. If absence is normal, model it. If it means the incoming record is invalid, handle that at the boundary instead of spreading uncertainty throughout the application.

### The server can still send nonsense

None of this validates incoming JSON. An assertion that a value is a `Customer` doesn't examine it at runtime. The network has not read our interface declaration.

Validate the information the application depends on at the external boundary. Decide how an invalid response is handled. Internal code can then use the justified representation without every function checking the same field again.

That is a worthwhile division of labor: runtime evidence where the outside world enters, static checking where our code passes agreed values around.

It won't catch a correctly typed calculation using the wrong rule. It won't tell us that the product requirement was mistaken. There is still plenty of work left for tests and people.

I also have a limit on how clever I want the types to get. If a generic helper requires reading its implementation to understand an error at the call site, consider a more explicit function. A type system is allowed to be powerful without every application becoming a demonstration of that power.

Use `any` as an identifiable migration compromise if necessary. A repository full of assertions and escape hatches may have TypeScript filenames while continuing to rely on exactly the same guesses.

The simple union above doesn't impress me because it is sophisticated. It impresses me because the next engineer can see what is possible.

I am willing to endure an irritating diagnostic for that. I would still like the diagnostic to be shorter.
