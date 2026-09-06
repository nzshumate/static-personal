I like being able to find the button.

That sounds like a low standard for a JavaScript framework. Read enough frontend code and it starts to feel ambitious. The button is sometimes three abstractions away from the thing that happens when you click it, wearing a name that tells you more about the author's design philosophy than its purpose.

Vue's templates appeal to the part of me that still wants to look at a page and recognize its markup. Here's the form. Here's the condition that shows the error. Here's the method the submit event calls. There are things to learn, but I can get my bearings before learning all of them.

That's what clicked for me. I can see how to do an ordinary piece of work, and I like where the code ends up.

Last September I argued that a framework ought to solve a problem you can name. I still want that receipt. With Vue, the problem is the amount of manual coordination involved in keeping an interface consistent with its data. The appeal is how little fuss there is around expressing the relationship.

## A small piece of the page

Take a list of employees with a text field above it. Type a name, narrow the list, show how many matches remain. Nothing here should require a planning meeting.

With manual DOM updates, it's easy to end up maintaining the original records, the visible rows, and the count separately. Then someone adds a department filter. Every path that changes the results needs to remember the count. You can organize that code carefully, of course. I'd prefer to have less of it to organize.

In Vue, I'd keep the records and the filter values as data, derive the matching records in a computed property, and render from that. The count comes from the matching records. There is no separate count to forget to update.

The useful part is being able to read that arrangement in the component. `data` holds the values we change. `computed` holds values derived from them. `methods` gives the actions somewhere obvious to go. I don't have to invent those categories or explain my personal interpretation of them in a README.

A computed property also saves me from writing a watcher whose entire job is to copy a calculation into another field. Watchers have their uses when a change needs to trigger work, such as a request. For filtering an array already in memory, I want the calculation where I can inspect it and leave it alone.

This isn't a remarkable screen. That's why I care. A lot of frontend work consists of unremarkable screens with enough small rules to make them expensive to get wrong.

## The file is useful, too

I also like single-file components more than I expected to like a new file extension.

A `.vue` file can hold the template, the component's JavaScript, and its styles. When I'm changing a small control, those are usually the things I need together. Having them nearby makes the file useful to read. I can check whether a class is used without conducting a search of the premises.

It still takes judgment to decide what belongs in that component. Put an entire settings section into one file and you can have a very well-organized thousand-line problem. Vue supplies the compartments. It doesn't object when you overfill them.

Props and events give me a sensible way to draw a boundary. A parent supplies a value; a child reports an action. I'd rather see a named event than discover that a child reached into an object it received and quietly changed something the parent owns. JavaScript will let you do that. Permission from the language is a fairly weak recommendation.

There is build work involved in using `.vue` files. They need processing before a browser can use them, and that configuration has to be maintained. I don't count it as a requirement for finding out whether I like Vue, though. A script tag and a small mounted section are enough to start. The component files can come when they earn their place.

That matters on an existing site. I want the scope of the experiment to stay under my control.

## Read the caveats before calling it magic

Vue 2 has rules I'd want anyone on the project to know. Adding a property to an already observed object doesn't automatically make that property reactive. Assigning an array item directly by index has a similar trap. You need to use the supported update paths, such as `Vue.set` or, for an array replacement, `splice`.

These are learnable constraints. They are also exactly the sort of thing that wastes an afternoon if your understanding stops at “change the data and the screen updates.” Declare the state you expect up front and read how the observation works.

Templates can become unpleasant, too. A long expression in an attribute is still a long expression. Moving it out of a JavaScript file hasn't improved it. When I have to stop and mentally execute a template to understand what it displays, I'd give the calculation a name.

None of that dampens my interest much. I can work with a tool whose conveniences have understandable limits.

I'm not ready to prescribe Vue for every frontend. I'd want to know more about the application and the people maintaining it before making that call. For the kind of interface code described here, though, the arrangement suits me: the markup is readable, derived values have a home, and a small experiment can stay small.

I can open the component, find the button, and follow what happens next. I want more of my working day to go like that.
