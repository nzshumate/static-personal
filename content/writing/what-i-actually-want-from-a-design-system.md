I'd start with a date field.

There is nothing glamorous about a date field. That's useful. It gives us a chance to find out whether we're making a design system or preparing a very attractive presentation.

Put it in an expense form. Give it a label, help text, and a value the application won't accept. Make the viewport narrow. Use the keyboard. Now we have something to discuss.

**The label has to remain a label.** Connect it to the control. Don't make its only appearance inside a placeholder that disappears when the person starts typing. The field should continue to explain itself after it contains a value.

**The error has to be understandable and associated with the field.** Color alone isn't enough. Leave space for a useful explanation, including one that needs more than three words. If the layout can't tolerate the error text, fix the layout.

**The component needs to accept a business rule without owning the business.** Expenses can decide which dates are allowed. The shared field can handle how that decision is presented. I don't want the date control importing the expense policy so it knows how to look disappointed.

**The examples need to include failure.** Show a server rejection, long help text, and the field beside another control. A perfect isolated example proves that the component can survive a perfect isolated example.

**Someone needs to maintain it.** A repository with no available owner will acquire local replacements. Teams have deadlines. They will solve their immediate problem, and the product will gradually grow several interpretations of the standard.

Those are my initial requirements. We can discuss the exact shade of the border afterward.

The rest of the system should earn its place in much the same way. Shared spacing and color names can reduce repeated decisions if design and implementation use them consistently. A documented interaction can save several teams from inventing different behavior. Good defaults are useful when people can understand and apply them.

I'd build a real feature with the first controls before converting the entire application. Watch where using the system creates extra work. Some friction means the feature needs to change. Some means the component isn't ready. We need to be willing to discover either.

Release notes should tell consumers what to inspect. A change to validation timing may matter even when the JavaScript interface stays identical. The compiler won't report that the person can no longer find their error.

A small set of reliable controls would be an excellent first release. I'd rather ship that than another catalog of beautiful buttons awaiting the arrival of a form.
