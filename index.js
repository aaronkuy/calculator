"use strict";

// Connects the page to the logic in calculator.js. Wrapped in a function so
// nothing here becomes a global.
(() => {
    const display = document.getElementById("display");
    const keys = document.getElementById("keys");

    // The display used to be the only state: results and the text "Error"
    // were written into it and then read back as input. Keeping the
    // expression and the mode apart is what makes "=" after an error, or a
    // digit after a result, behave.
    let expression = "";
    /** @type {"typing" | "result" | "error"} */
    let mode = "typing";

    function render() {
        display.value = mode === "error" ? "Error" : expression;
        // Keep the end of a long expression in view.
        display.scrollLeft = display.scrollWidth;
    }

    function press(key) {
        const startsNumber = key === "." || (key >= "0" && key <= "9");
        // After an error everything starts over. After a result a digit
        // starts a new calculation, while an operator continues with it.
        if (mode === "error" || (mode === "result" && startsNumber)) {
            expression = "";
        }
        expression = Calculator.appendKey(expression, key);
        mode = "typing";
        render();
    }

    function equals() {
        // Nothing to do on an empty display, a result or an error.
        if (mode !== "typing" || expression === "") return;
        try {
            expression = Calculator.format(Calculator.evaluate(expression));
            mode = "result";
        } catch {
            // Incomplete input such as "7+", or division by zero.
            expression = "";
            mode = "error";
        }
        render();
    }

    function clear() {
        expression = "";
        mode = "typing";
        render();
    }

    function backspace() {
        // A result or an error is not something to edit character by
        // character; remove it as a whole.
        if (mode !== "typing") {
            clear();
            return;
        }
        expression = expression.slice(0, -1);
        render();
    }

    // One listener for the whole keypad instead of an onclick per button.
    keys.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button) return;

        if (button.dataset.action === "equals") {
            equals();
        } else if (button.dataset.action === "clear") {
            clear();
        } else {
            press(button.dataset.key);
        }

        // A mouse click leaves the button focused, and Enter would then
        // press it again instead of calculating. Clicks that come from the
        // keyboard (detail === 0) keep their focus.
        if (event.detail > 0) button.blur();
    });

    document.addEventListener("keydown", (event) => {
        // Leave browser shortcuts such as Ctrl+1 or Cmd+- alone.
        if (event.ctrlKey || event.metaKey || event.altKey) return;

        // Enter and Space on a focused button or link belong to that
        // element. Without this, tabbing to "7" and pressing Enter would
        // calculate instead of typing a 7.
        const onControl = event.target.closest("button, a") !== null;
        if (onControl && (event.key === "Enter" || event.key === " ")) return;

        // The numeric keypad of many European layouts sends a comma.
        const key = event.key === "," ? "." : event.key;

        if ("0123456789.+-*/".includes(key) && key.length === 1) {
            press(key);
        } else if (key === "Enter" || key === "=") {
            equals();
        } else if (key === "Backspace") {
            backspace();
        } else if (key === "Escape" || key === "Delete") {
            clear();
        } else {
            return;
        }
        // "/" opens quick find in Firefox, Backspace can navigate back.
        event.preventDefault();
    });
})();
