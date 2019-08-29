// wall and actor collisions
// by zep

// actor = {} //all actors in world

int frames[4];
int bounce[4];
int inertia[4];

actor atmp = 0;
actor pl = 0;
actor cb_a = 0;

void cb_actorcoll(int n) {
  // get actor n coll value
  // if TILE then 
  //   if TILE_ON_X 
  //     bounce
  //   if TILE_ON_Y
  //     bounce
  
  // cb_a = getactor(n);

  if (n & ACTOR_X_EVENT) {
    cb_a.dx = fmf(cb_a.dx,0-bounce[cb_a]);
  }
  if (n & ACTOR_Y_EVENT) {
    cb_a.dy = fmf(cb_a.dy,0-bounce[cb_a]);
  }
 
}

void cb_actoranimate(int a) {
 // advance one frame every
 // time actor moves 1/4 of
 // a tile
  cb_a = a;

  cb_a.dx = fmf(cb_a.dx,inertia[a]);
  cb_a.dy = fmf(cb_a.dy,inertia[a]);

  int f = cb_a.frame;
  f += abs(cb_a.dx) * 4;
  f += abs(cb_a.dy) * 4;
  f = f2i(f) % frames[a];

  cb_a.frame = f;
}

// make an actor
// and add to global collection
// x,y means center of the actor
// in map tiles (not pixels)
void make_actor(int a, int x, int y) {
  atmp = a;
  atmp.x = x; 
  atmp.y = y;
  atmp.dx = 0;
  atmp.dy = 0;
  atmp.sprite = 16;
  atmp.frame = 0;
  
  // maybe move these to callback
  frames[a] = 2;
  inertia[a] = 0.6;
  bounce[a] = 1;
 // half-width and half-height
 // slightly less than 0.5 so
 // that will fit through 1-wide
 // holes.
 // a.w = 6  // 0.4 * 8
 // a.h = 6  // 0.4 * 8
  atmp.w = 0.4;
  atmp.h = 0.4;

  atmp.oncollision = (cb_actorcoll); 
  atmp.onanimate = (cb_actoranimate); 
}

void init() {
 fixpcoords();
 // make player top left
 make_actor(pl, 16,16);
 pl.sprite = 17;

 // make a bouncy ball
 
 make_actor(2, 8.5, 7.5);
 atmp.sprite = 33;
 atmp.dx = 0.05;
 atmp.dy = -0.1;
 inertia[2] = 0.5;
 
 make_actor(3, 3, 7.5);
 atmp.sprite = 49;
 atmp.dx = -0.1;
 atmp.dy = 0.15;
 inertia[3] = 1;
 bounce[3] = 0.8;

 // tiny guy

 make_actor(1, 7, 5);
 atmp.sprite = 5;
 atmp.dx = 0.125;
 inertia[1] = 0.8;
 frames[1] = 4;
}


// for any given point on the
// map, true if there is wall
// there.
/*
void solid(x, y)

 // grab the cell value
 val=mget(x, y)

 // check if flag 1 is set (the
 // orange toggle button in the
 // sprite editor)
 return fget(val, 1)

end
*/


void move_actors() {
 // only move actor along x
 // if the resulting position
 // will not overlap with a wall

 testactorcoll();
 testactormap(0,0,16,16,1);

 moveactor(ALL_ACTORS);

}

char key;
int accel = 0.1;

void control_player() {
  // how fast to accelerate
  key = getkey();
 
  if (key & KEY_LEFT) pl.dx -= accel;
  if (key & KEY_RIGHT) pl.dx += accel;
  if (key & KEY_UP) pl.dy -= accel;
  if (key & KEY_DOWN) pl.dy += accel;
}

void update() {
 control_player();
 move_actors();
}

/*
void draw_actor(a) {
 local sx = (a.x * 8) - 4;
 local sy = (a.y * 8) - 4;
 spr(a.sprite + a.frame, sx, sy);
}
*/

void draw() {
 cls();
 drawmap(0,0,0,0,16,16,0);

 drawactor(ALL_ACTORS);

 // print("x "..pl.x,0,120,7)
 // print("y "..pl.y,64,120,7)
}

// // // old stuff

// wall and actor collisions
// by zep

// actor = {} //all actors in world

int frames[4];
int bounce[4];
int inertia[4];

actor atmp = 0;
actor pl = 0;
actor cb_a = 0;

// make an actor
// and add to global collection
// x,y means center of the actor
// in map tiles (not pixels)
void make_actor(int a, int x, int y) {
  atmp = a;
  atmp.x = x; 
  atmp.y = y;
  atmp.dx = 0
  atmp.dy = 0
  atmp.sprite = 16
  atmp.frame = 0
  
  // maybe move these to callback
  frames[a] = 2;
  inerta[a] = 0.6;
  bounce[a] = 1;
 // half-width and half-height
 // slightly less than 0.5 so
 // that will fit through 1-wide
 // holes.
 // a.w = 6  // 0.4 * 8
 // a.h = 6  // 0.4 * 8
  atmp.w = 0.4;
  atmp.h = 0.4;

  atmp.oncollision = cb_actorcoll; 
  atmp.onanimate = cb_actoranimate; 
}

void init() {
 fixpcoords();
 // make player top left
 make_actor(pl, 16,16);
 pl.sprite = 17;

 // make a bouncy ball
 
 make_actor(2, 8.5, 7.5);
 amtp.sprite = 33;
 amtp.dx = 0.05;
 amtp.dy = -0.1;
 inertia[2] = 0.5;
 
 make_actor(3, 3, 7,5);
 amtp.sprite = 49;
 amtp.dx = -0.1;
 amtp.dy = 0.15;
 inertia[3] = 1;
 bounce[3] = 0.8;

 // tiny guy

 make_actor(1, 7, 5);
 atmp.sprite = 5;
 atmp.dx = 0.125;
 inertia[1] = 0.8;
 frames[1] = 4;
}


// for any given point on the
// map, true if there is wall
// there.
/*
void solid(x, y)

 // grab the cell value
 val=mget(x, y)

 // check if flag 1 is set (the
 // orange toggle button in the
 // sprite editor)
 return fget(val, 1)

end
*/

void cb_actorcoll(int n) {
  // get actor n coll value
  // if TILE then 
  //   if TILE_ON_X 
  //     bounce
  //   if TILE_ON_Y
  //     bounce
  
  cb_a = getactor(n);

  if (n & ACTOR_X_EVENT) {
    cb_a.dx = fmf(a.dx,0-bounce[cb_a]);
  }
  if (n & ACTOR_Y_EVENT) {
    cb_a.dy = fmf(a.dy,0-bounce[cb_a]);
  }
 
}

void cb_actoranimate(int a) {
 // advance one frame every
 // time actor moves 1/4 of
 // a tile
  cb_a = a;

  cb_a.dx = fmf(cb_a.dx,inertia[a]);
  cb_a.dy = fmf(cb_a.dy,inertia[a]);

  int f = cb_a.frame;
  f += abs(cb_a.dx) * 4;
  f += abs(cb_a.dy) * 4;
  f = f2i(f) % frames[a];

  cb_a.frame = f;
}

void move_actors() {
 // only move actor along x
 // if the resulting position
 // will not overlap with a wall

 testactorcoll();
 testactormap(0,0,16,16,1);

 moveactor(ALL_ACTORS);

}

char key;
int accel = 0.1;

void control_player() {
  // how fast to accelerate
  key = getkey();
 
  if (key & KEY_LEFT) pl.dx -= accel;
  if (key & KEY_RIGHT) pl.dx += accel;
  if (key & KEY_UP) pl.dy -= accel;
  if (key & KEY_DOWN) pl.dy += accel;
}

void update() {
 control_player();
 move_actors();
}

/*
void draw_actor(a) {
 local sx = (a.x * 8) - 4;
 local sy = (a.y * 8) - 4;
 spr(a.sprite + a.frame, sx, sy);
}
*/

void draw() {
 cls();
 drawmap(0,0,0,0,16,16);

 drawactor(ALL_ACTORS);

 // print("x "..pl.x,0,120,7)
 // print("y "..pl.y,64,120,7)
}


