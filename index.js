// Holds the expression while typing and the result after "=".
const display = document.getElementById("display");

function appendToDisplay(input){
    display.value += input;
}

// The "C" key: clear.
function clearDisplay(){
    display.value = "";
}

function calculate(){
    try{
        // eval() is tolerable only because the display is read-only and
        // fed by the fixed keypad. See issue #4 for what it gets wrong.
        display.value = eval(display.value);
    }
    catch(error){
        // Incomplete or malformed expression, e.g. "7+".
        display.value = "Error";
    }
}
