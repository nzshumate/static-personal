Two gray rectangles on a mockup can cause an unreasonable amount of trouble.

They have the same padding. A heading, a few lines of text, a button in the bottom right. Naturally, someone suggests making them the same component. Sensible enough. We don't need to handcraft every rectangle.

Then you read what the buttons do.

One updates a shipping address. The other changes a billing address. Shipping has delivery restrictions. Billing has a “same as shipping” option. Saving one may change the available delivery methods; saving the other may require a different request. The mockup has been very discreet about all of this.

You can still share some code. But the border has given you almost no useful information about where to put it.

## Try changing one of them

Suppose we build an `AddressPanel` that handles both jobs. Give it an address and a type. It displays the fields, validates the input, sends the request, and shows the result.

Now add an instruction field that applies only to shipping. Then let billing show a company name. Then disable editing in one place while a purchase is being processed. The component needs to know where it is, which kind of address it has, and what the rest of the checkout is doing.

The prop list starts to read like the minutes of several unrelated meetings.

I don't object to a boolean prop. `disabled` is a perfectly useful word. I get suspicious when each new caller needs another switch to exempt it from behavior the component considers normal. Eventually, understanding one use requires reading all the others. We saved some markup and acquired a small administrative job.

I'd rather start with separate shipping and billing components and look for something specific they can share. An address field group might earn its place if the fields, labels, and error presentation really behave alike. A common panel wrapper might be enough if only the appearance matches.

There may also be a plain validation function worth sharing. It doesn't need a template to qualify as useful code.

The question I find helpful is what happens when only shipping changes. If a delivery instruction requires editing the billing path, or checking three billing screens just in case, I'd reconsider the arrangement. The shared component may be collecting responsibilities that don't belong together.

## Someone has to own the edit

Splitting the file is easy. Deciding who owns an unfinished address takes more thought.

For a panel with its own Save and Cancel buttons, I'd usually keep a draft inside the editor. Its parent supplies the saved address. The editor works on a copy, then emits a submission event with the proposed values. The parent can handle the request and pass the result or error back down.

In Vue 2, props and custom events support that arrangement directly. Passing an object as a prop doesn't protect its contents from mutation, though. If a child binds its inputs to the original object's fields, it can change the parent's data before anyone clicks Save. Cancel then becomes an optimistic label.

For a flat object containing strings, a shallow copy can be enough. If the address includes nested objects that the editor changes, those references need attention too. Calling something `draft` doesn't make it independent.

I'd also decide when that draft gets replaced. Opening the editor is a reasonable moment to initialize it. Copying every incoming prop update over the user's typing is a good way to make a form feel haunted.

There are screens where the parent should own the draft instead. If several sections submit together, keeping the pending values together may make the whole form easier to follow. I'd make that decision from the save behavior. The arrangement of boxes on the page still has very little to say about it.

## Small enough to understand

Once components are easy to create, it's tempting to keep going. Extract the heading. Extract the row. Extract the label beside the row. A large file becomes a collection of small files, and now a minor text change requires a tour.

A component should give the reader something for opening it. Maybe it owns a complete interaction. Maybe it implements a control used in several places. Maybe it hides enough awkward markup that the parent becomes easier to read. Those are useful reasons.

“The file was getting long” is a reason to investigate. It doesn't tell you where to cut.

I can tolerate a few adjacent fields in one component if their behavior belongs together. I'd be much less comfortable with a tiny child that needs its parent's internal methods, the current route, and a particular global event to do its job. Its line count is excellent. Everything else is somebody else's problem.

This is also why I don't expect every component to be reusable. `ShippingAddressEditor` can do one job in one application. Giving it an honest name leaves room to understand that job. Renaming it `UniversalAddressManager` mostly creates obligations.

When reviewing a split, I'd follow an actual edit through it. Where does the pending value live? Who validates it? Who decides that saving succeeded? Can I answer those questions without opening unrelated features?

Vue makes the mechanics pleasant enough that I can spend time on those decisions. That's still what I like about it. But I have to make them.

For the two address panels, I'd be happy to share the field styling and keep separate editors until their behavior gives me a better reason. A little repeated markup is affordable. Having to understand billing before adding a delivery note is a lousy bargain.
