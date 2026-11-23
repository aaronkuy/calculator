"use strict";

// Calculator logic without any DOM access, so it can be tested with
// `node --test` and loaded in the page as a classic script. A module
// (`type="module"`) would be cleaner, but browsers block modules under
// file://, and the README promises that opening index.html just works.

const Calculator = (() => {
    const OPERATORS = "+-*/";

    // A number is digits with at most one decimal point ("12", "1.5", ".5",
    // "5."). The optional exponent cannot be typed on the keypad; it exists
    // so that a very large or small result ("1e+21") can be used as the
    // start of the next calculation.
    const TOKEN = /\s*(?:(\d+\.?\d*(?:e[+-]?\d+)?|\.\d+)|([-+*/]))/y;

    /**
     * Splits an expression into number and operator tokens.
     * Throws on anything else, so letters, brackets or leftover text such as
     * "Error" can never reach the arithmetic.
     * @param {string} expression
     * @returns {Array<number|string>}
     */
    function tokenize(expression) {
        const tokens = [];
        TOKEN.lastIndex = 0;
        while (TOKEN.lastIndex < expression.length) {
            const position = TOKEN.lastIndex;
            const match = TOKEN.exec(expression);
            if (!match) {
                if (expression.slice(position).trim() === "") break;
                throw new SyntaxError(`Unexpected character at position ${position}`);
            }
            // Number("010") is 10: no legacy octal, unlike eval("010").
            tokens.push(match[1] !== undefined ? Number(match[1]) : match[2]);
        }
        return tokens;
    }

    /**
     * Evaluates + - * / with the usual precedence (recursive descent).
     *
     *   expression := term (("+" | "-") term)*
     *   term       := factor (("*" | "/") factor)*
     *   factor     := "-"? number
     *
     * @param {string} expression
     * @returns {number} a finite number
     * @throws {SyntaxError} if the expression is empty, incomplete or malformed
     * @throws {RangeError} on division by zero or a result too large to represent
     */
    function evaluate(expression) {
        const tokens = tokenize(expression);
        let index = 0;

        function factor() {
            let sign = 1;
            // Exactly one leading minus: "5--3" is 8, "5---3" is a typo.
            if (tokens[index] === "-") {
                sign = -1;
                index += 1;
            }
            const token = tokens[index];
            if (typeof token !== "number") {
                throw new SyntaxError("Expected a number");
            }
            index += 1;
            return sign * token;
        }

        function term() {
            let value = factor();
            while (tokens[index] === "*" || tokens[index] === "/") {
                const operator = tokens[index];
                index += 1;
                const right = factor();
                if (operator === "/" && right === 0) {
                    // JavaScript would answer Infinity or NaN and happily
                    // keep calculating with it.
                    throw new RangeError("Division by zero");
                }
                value = operator === "*" ? value * right : value / right;
            }
            return value;
        }

        let value = term();
        while (tokens[index] === "+" || tokens[index] === "-") {
            const operator = tokens[index];
            index += 1;
            const right = term();
            value = operator === "+" ? value + right : value - right;
        }

        if (index < tokens.length) {
            throw new SyntaxError("Unexpected token after the expression");
        }
        if (!Number.isFinite(value)) {
            throw new RangeError("Result out of range");
        }
        return value;
    }

    /**
     * Turns a result into display text. Twelve significant digits hide binary
     * floating point noise (0.1 + 0.2 shows 0.3, not 0.30000000000000004)
     * and still fit the display.
     * @param {number} value
     * @returns {string}
     */
    function format(value) {
        return String(Number(value.toPrecision(12)));
    }

    /**
     * Returns the expression after pressing one key, or the unchanged
     * expression if the key makes no sense at this point. Rejecting input
     * here keeps most malformed expressions from being typed at all.
     * @param {string} expression
     * @param {string} key a digit, "." or one of + - * /
     * @returns {string}
     */
    function appendKey(expression, key) {
        const last = expression.slice(-1);
        const lastIsOperator = last !== "" && OPERATORS.includes(last);

        if (key >= "0" && key <= "9") {
            return expression + key;
        }

        if (key === ".") {
            // The number being typed is everything after the last operator.
            // An "e" means it is a carried-over result like "1e+21".
            const current = expression.split(/[-+*/]/).pop();
            const isExponent = /e[+-]?\d*$/.test(expression);
            return current.includes(".") || isExponent ? expression : expression + key;
        }

        if (OPERATORS.includes(key)) {
            if (expression === "") {
                // Only a negative number can start an expression.
                return key === "-" ? key : expression;
            }
            if (!lastIsOperator) {
                return expression + key;
            }
            const beforeLast = expression.slice(-2, -1);
            const twoOperators = beforeLast !== "" && OPERATORS.includes(beforeLast);
            if (key === "-" && !twoOperators && expression.length > 1) {
                // "7*-" starts a negative right-hand side.
                return expression + key;
            }
            if (expression.length === 1) {
                // A lone leading "-" has nothing to operate on yet.
                return key === "-" ? expression : "";
            }
            // Pressing another operator corrects the previous one: "7+*" -> "7*".
            return expression.slice(0, twoOperators ? -2 : -1) + key;
        }

        return expression;
    }

    return { evaluate, format, appendKey };
})();

// Node (tests) gets an export; in the browser `Calculator` is simply a
// top-level binding that index.js can see.
if (typeof module !== "undefined") {
    module.exports = Calculator;
}
