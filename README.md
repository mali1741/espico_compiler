# espico game engine for esp8266 with compiler

This is a compiler with a subset of C, compiles into espico bytecode and can be run in the virtual machine written in js. 
The VM has access to 65,534 bytes of memory, though only 32,768 bytes are available on the esp8266 itself, since the remaining memory goes to the screen buffer and library. 
The screen has a size of 128x128 pixels, with 16 colors of a fixed palette. Any color can be transparent, the first (black) is transparent by default. There are 32 actor objects available, which can be tied to sprite animation and used in collision testing. The compiler supports int and unsigned char types, one-dimensional arrays and debugging.

