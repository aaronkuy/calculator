"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { evaluate, format, appendKey } = require("../calculator.js");

const calc = (expression) => format(evaluate(expression));
const type = (keys, start = "") => [...keys].reduce(appendKey, start);

test("multiplication and division bind tighter than addition and subtraction", () => {
    assert.equal(evaluate("2+3*4"), 14);
    assert.equal(evaluate("2*3+4"), 10);
    assert.equal(evaluate("10-6/2"), 7);
    assert.equal(evaluate("2+3*4-6/2"), 11);
});

test("operators of the same precedence run left to right", () => {
    assert.equal(evaluate("10-4-3"), 3);
    assert.equal(evaluate("100/10/5"), 2);
    assert.equal(evaluate("8/4*2"), 4);
});

test("division by zero is an error, not Infinity or NaN", () => {
    assert.throws(() => evaluate("1/0"), RangeError);
    assert.throws(() => evaluate("0/0"), RangeError);
    assert.throws(() => evaluate("5/0.0"), RangeError);
    assert.throws(() => evaluate("5/-0"), RangeError);
    assert.equal(evaluate("0/5"), 0);
});

test("decimal numbers", () => {
    assert.equal(evaluate("1.5+2.25"), 3.75);
    assert.equal(evaluate(".5*4"), 2);
    assert.equal(evaluate("5.+1"), 6);
    assert.throws(() => evaluate("1.2.3"), SyntaxError);
    assert.throws(() => evaluate("."), SyntaxError);
});

test("results are rounded to hide floating point noise", () => {
    assert.equal(calc("0.1+0.2"), "0.3");
    assert.equal(calc("1-0.9"), "0.1");
    assert.equal(calc("1/3"), "0.333333333333");
    assert.equal(calc("2/4"), "0.5");
});

test("a single leading minus makes a number negative", () => {
    assert.equal(evaluate("-5+3"), -2);
    assert.equal(evaluate("5--3"), 8);
    assert.equal(evaluate("4*-2"), -8);
    assert.throws(() => evaluate("5---3"), SyntaxError);
    assert.throws(() => evaluate("+5"), SyntaxError);
});

test("empty and incomplete expressions are errors", () => {
    for (const expression of ["", "   ", "7+", "*5", "7+*2", "-"]) {
        assert.throws(() => evaluate(expression), SyntaxError, JSON.stringify(expression));
    }
});

test("JavaScript syntax that eval() used to accept is rejected or read as arithmetic", () => {
    // Legacy octal: eval("010+1") was 9.
    assert.equal(evaluate("010+1"), 11);
    // Comments: eval("5//2") was 5, eval("5/*2*/+3") was 8.
    assert.throws(() => evaluate("5//2"), SyntaxError);
    assert.throws(() => evaluate("5/*2*/+3"), SyntaxError);
    // Exponent operator: eval("7**2") was 49.
    assert.throws(() => evaluate("7**2"), SyntaxError);
    // Regex literal: eval("/5/") showed "/5/".
    assert.throws(() => evaluate("/5/"), SyntaxError);
    // Identifiers: eval("Error") showed the source of the Error function.
    assert.throws(() => evaluate("Error"), SyntaxError);
    assert.throws(() => evaluate("undefined5"), SyntaxError);
    assert.throws(() => evaluate("alert(1)"), SyntaxError);
    assert.throws(() => evaluate("(1+2)*3"), SyntaxError);
});

test("large results stay usable and overflow is an error", () => {
    assert.equal(calc("9999999999*9999999999*99"), "9.89999999802e+21");
    // The formatted result can start the next calculation.
    assert.equal(calc("9.89999999802e+21/99"), "99999999980000000000");
    assert.equal(calc("1/10000000"), "1e-7");
    assert.equal(calc("1e-7*10000000"), "1");
    assert.throws(() => evaluate("1e308*10"), RangeError);
});

test("appendKey: digits and operators build an expression", () => {
    assert.equal(type("12+3.5*4"), "12+3.5*4");
});

test("appendKey: one decimal point per number", () => {
    assert.equal(type("1.2.3"), "1.23");
    assert.equal(type("1.5+2.5.1"), "1.5+2.51");
    assert.equal(type("..5"), ".5");
    assert.equal(appendKey("1e+21", "."), "1e+21");
});

test("appendKey: an expression can only start with a digit, a point or a minus", () => {
    assert.equal(type("*5"), "5");
    assert.equal(type("+"), "");
    assert.equal(type("-5"), "-5");
    assert.equal(type("--5"), "-5");
    assert.equal(type("-+5"), "5");
});

test("appendKey: a second operator replaces the first, except a minus sign", () => {
    assert.equal(type("7+*2"), "7*2");
    assert.equal(type("7*-2"), "7*-2");
    assert.equal(type("7--2"), "7--2");
    assert.equal(type("7*-+2"), "7+2");
    assert.equal(type("7---2"), "7-2");
});

test("appendKey ignores keys it does not know", () => {
    assert.equal(appendKey("7", "a"), "7");
    assert.equal(appendKey("7", "("), "7");
});

test("everything appendKey lets through is either valid or just incomplete", () => {
    assert.equal(calc(type("7*-2+0.5")), "-13.5");
    assert.equal(calc(type("010+1")), "11");
    assert.equal(calc(type("5//2")), "2.5");
    assert.equal(calc(type("7**2")), "14");
});
