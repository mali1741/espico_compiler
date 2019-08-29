# espico game engine for esp8266 with compiler

This is a compiler with a subset of C, compiles into espico bytecode and can be run in the virtual machine written in js.
It is a fork of the LGE by corax89 though no longer compatible as concepts has diverted far away from each other.
 
The VM has access to 65,534 bytes of memory, though only 32,768 bytes are available on the esp8266 itself, since the remaining memory goes to the screen buffer and library. 
The screen has a size of 128x128 pixels, with 16 colors of a fixed palette. Any color can be transparent, the first (black) is transparent by default. There are 32 actor objects available, which can be tied to sprite animation and used in collision testing. A simple particle engine is builtin. The compiler supports int and unsigned char types, fixed point numbers (9.7 is builtin but any 16-bit combination could be used) actor struct-like value access, one-dimensional arrays and debugging.
The sprite editor supports loading p8-files (espico has the same palette) to access sprites, flags and tilemap data.

TODO:
- explicit fixpoint type (now int is used for both fxp and ints)
- map editor
- simple sound
- rewrite old lge examples

