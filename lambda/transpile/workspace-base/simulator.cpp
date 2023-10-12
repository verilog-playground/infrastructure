#include <iostream>
#include <sstream>

#include <emscripten/bind.h>

#include "Vtop.h"

using namespace std;

Vtop *top;

string top_to_string()
{
    stringstream buffer;

    buffer << "{";

    buffer << "\"led\": " << +top->LED
           << ", \"seg\": " << +top->SEG;

    buffer << "}";

    return buffer.str();
}

string simulate(int swi, bool clk)
{
    if (top == nullptr)
        top = new Vtop();

    top->SWI = swi;
    top->clk_2 = clk;

    // Run one simulation step.
    top->eval();

    return top_to_string();
}

void finalize()
{
    top->final();
}

EMSCRIPTEN_BINDINGS(my_module)
{
    emscripten::function("simulate", &simulate);
    emscripten::function("finalize", &finalize);
}
