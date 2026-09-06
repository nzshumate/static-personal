The part that changed my mind doesn't render anything.

Consider a connection that keeps a report current. It has a status, operations that establish and close it, and cleanup that needs to happen when the screen goes away. In a component with several other jobs, that concern can be scattered through `data`, `methods`, and lifecycle hooks.

Each section is reasonable. Following the connection still means moving around the file.

That's the problem I hadn't given enough weight when looking at the Composition API. I was attached to Vue's familiar categories because they make a small component easy to read. They still do. But a larger component can need another kind of organization: all the parts of one job together.

Vue 3 is a prerelease as I write this. I'm thinking through the API, not reporting a completed production migration.

A composition function can establish reactive state, define the related operations, and register cleanup. The component calls it and receives the values it needs. The relationship is visible in the function's inputs and return value, rather than distributed across a mixin's additions to the component.

For the connection, I'd want to read the creation and disposal in the same place. I'd want the endpoint or other dependency supplied explicitly. I'd want calling the function to make it reasonably obvious that some ongoing work is being started.

Those requirements don't need a grand theory. They make it easier to edit the connection without accidentally editing the rest of the report.

There are ways to spoil the arrangement. Put hidden shared state in a module. Start work as a surprise side effect. Return twenty things with vague names. Then the function becomes another place to conceal responsibilities. Vue cannot stop an engineer from being inventive.

Refs add a little unfamiliarity too. In JavaScript, `.value` keeps the reactive reference explicit; the common template use is more convenient. That difference needs to be understood. I'd learn it with a small example before extracting half an application into a directory of functions beginning with `use`.

The existing Options API doesn't become wrong. A component with a little state and one computed value may be clearer exactly as it is. I have no desire to turn a useful new capability into compulsory maintenance.

My initial objection was that we already had places for the code. The connection example shows where those places can be awkward. I can accept another arrangement when it solves that particular problem.

Whether an application should migrate is a separate decision involving dependencies, tooling, and the release itself. For now, I have a reason to keep looking at Vue 3 that is more substantial than a version number.
