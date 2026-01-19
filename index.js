//Fetch the HTML input field
const display = document.getElementById("display");
//input as a parameter for the buttons entered by the user
function appendToDisplay(input){
    //Add the saved string in the linked function from the button
    //to the input field
    display.value += input;
}
//Implementation of the C button (Cancel)
function clearDisplay(){
    display.value = "";
}
//eval function for the entered values of the user
function calculate(){
    try{
        display.value = eval(display.value);
    }
    //Try and catch if the user makes mistakes, e.g. '7+ (presses '=')'
    //then display error inside the input field
    catch(error){
        display.value = "Error";
    }

}