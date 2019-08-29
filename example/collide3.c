// wall and actor collisions
// by zep

// actor = {} //all actors in world

int frames[4];
int bounce[4];
int inertia[4];

int testmin = -1;
actor atmp = 0;
actor pl = 0;
actor cb_a = 0;
actor cb_c = 0;
int cb_ce = 0;
int sx = 0;
int sy = 0;

void cb_actorcoll(int n, int e) {
  // get actor n coll value
  // if TILE then 
  //   if TILE_ON_X 
  //     bounce
  //   if TILE_ON_Y
  //     bounce
  
  cb_c = n;
  cb_ce = e;

  if (e & ACTOR_X_EVENT) {
	// b = 0-bounce[cb_c];
	// b = cb_c.dx;
	if (n == 2) sx = cb_c.dy;
    cb_c.dx = 0 - cb_c.dx;
  }
  if (e & ACTOR_Y_EVENT) {
	// b = 0-bounce[cb_c];
	if (n == 2) sy = cb_c.dy;
    cb_c.dy = 0 - cb_c.dy;
  }

  if (e & ACTOR_IN_EVENT) {
	cb_c.dx = 0 - cb_c.dx;
	cb_c.dy = 0 - cb_c.dy;
  }
/*  if (cb_c == 2) {
	cb_c.dy = 0.5;
  }
*/
 
}

void cb_actoranimate(int a, int e) {
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
  bounce[a] = 1.0;
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
  atmp.lives = 1;
  atmp.flags = 1;
}

void init() {
 coordshift(4);
 // make player top left
 make_actor(pl, 2.0, 2.0);
 pl.sprite = 17;

 // make a bouncy ball
 
 make_actor(2, 7.0, 7.0);
 atmp.sprite = 33;
 atmp.dx = 0.05;
 atmp.dy = -0.1;
 inertia[2] = 0.5;
 
 make_actor(3, 3.0, 7.0);
 atmp.sprite = 49;
 atmp.dx = -0.1;
 atmp.dy = 0.15;
 inertia[3] = 1.0;
 bounce[3] = 0.8;

 // tiny guy

 make_actor(1, 7.0, 5.0);
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
 // testactormap(0,0,16,16,1);

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
 // control_player();
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
 // putsprite(16,16,16,8,8);
 drawactor(ALL_ACTORS);

 // print("x "..pl.x,0,120,7)
 // print("y "..pl.y,64,120,7)
}

