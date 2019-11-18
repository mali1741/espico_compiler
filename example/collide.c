// wall and actor collisions
// adapted from pico code by zep

// our actors need a few extra values
struct actextra { int maxframes,curframe,bounce,inertia; };

// which we store in this array
actextra av[4];

int testmin = -1;
// local actor variables are not yet supported
actor atmp = 0;
actor pl = 0;
actor cb_a = 0;
actor cb_c = 0;
// some callback values stored for debugging:
int cb_ce = 0;
int cb_cn = 0;
int sx = 0;
int sy = 0;
int b = 0x6;
int f = 0;
int n = 0;
int c = 0;

// this callback is for collisions
void cb_actorcoll(int n, int e) {
  // get actor n coll value
  // if TILE then
  //   if TILE_ON_X
  //     bounce
  //   if TILE_ON_Y
  //     bounce

  if (cb_c != (n & ACTOR_MASK)) {
    cb_c = (n & ACTOR_MASK);
    if (cb_c == 2) {
	cb_ce = e;
	cb_cn = n;
	// b = b + 1;
    }
    if (n & ACTOR_L_EVENT) {
      if (cb_c.dx < 0) {
	cb_c.dx = fmf(0 - cb_c.dx,av[cb_c].bounce);
	if (cb_c == pl) {
 		partdir(0.25,180,270,0.6);
		partset(pl.x,pl.y,c,3,4);
		b = b + 1;
	}
      }

    }
    if (n & ACTOR_R_EVENT) {
      if (cb_c.dx > 0) {
	cb_c.dx = fmf(0 - cb_c.dx,av[cb_c].bounce);
	if (cb_c == pl) {
 		partdir(0.25,270,360,0.6);
		partset(pl.x,pl.y,c,3,4);
		b = b + 1;
	}
      }
    }
    if (n & ACTOR_T_EVENT) {
      if (cb_c.dy < 0) {
	cb_c.dy = fmf(0 - cb_c.dy,av[cb_c].bounce);
	if (cb_c == pl) {
 		partdir(0.25,230,310,0.6);
		partset(pl.x,pl.y,c,3,4);
		b = b + 1;
	}
      }
    }
    if (n & ACTOR_B_EVENT) {
      if (cb_c.dy > 0) {
	cb_c.dy = fmf(0 - cb_c.dy,av[cb_c].bounce);
	if (cb_c == pl) {
 		partdir(0.25,60,120,0.6);
		partset(pl.x,pl.y,c,3,4);
		b = b + 1;
	}
      }
    }
    /*if (n & ACTOR_IN_EVENT) {
	cb_c.dx = 0 - cb_c.dx;
	cb_c.dy = 0 - cb_c.dy;
    }*/
  }
}

// this callback is for animation/movement and exiting screen
void cb_actoranimate(int a, int e) {
  // advance one frame every
  // time actor moves 1/4 of
  // a tile
  cb_a = (a & ACTOR_MASK);

  cb_a.dx = fmf(cb_a.dx,av[cb_a].inertia);
  cb_a.dy = fmf(cb_a.dy,av[cb_a].inertia);

  // calculate sprite frame
  // use global var f so we can debug the value
  f = av[cb_a].curframe;
  f += abs(cb_a.dx) * 4;
  f += abs(cb_a.dy) * 4;
  f = f % av[cb_a].maxframes;
  av[cb_a].curframe = f;
  cb_a.frame = f2i(f);
}

// make an actor
// and add to global collection
// x,y means center of the actor
void make_actor(int a, int x, int y) {
  atmp = a;
  atmp.x = x;
  atmp.y = y;
  atmp.dx = 0;
  atmp.dy = 0;
  atmp.sprite = 16;
  atmp.frame = 0;

  av[a].maxframes = 2.0;
  av[a].inertia = 0.6;
  av[a].bounce = 1.0;
  av[a].curframe = 0;

  // half-width and half-height
  // slightly less than 0.5 so
  // that will fit through 1-wide
  // holes.
  atmp.hw = 0.4;
  atmp.hh = 0.4;

  atmp.oncollision = (cb_actorcoll);
  atmp.onanimate = (cb_actoranimate);
  atmp.lives = 1;
  atmp.flags = 1;
}

void init() {
 // set coordinates shift to 4
 // coordinates are unbound to pixels and fixed point numbers
 // here we use 9.7 fixed point numbers for actors
 // 1.0 in coordinates therefore is 2^(7-4)=8 pixels on screen
 coordshift(4);
 // you can test the camera function here:
 // camera(5,5);
 // you can test the clip function here:
 // clip(17,11,100,100);

 // make player top left
 make_actor(pl, 3.0, 3.0);
 pl.sprite = 17;

 // make a bouncy ball
 make_actor(2, 7.0, 7.0);
 atmp.sprite = 33;
 atmp.dx = 0.05;
 atmp.dy = -0.1;
 av[atmp].inertia = 0.5;

 // make another bouncy ball
 make_actor(3, 3.0, 7.0);
 atmp.sprite = 49;
 atmp.dx = -0.1;
 atmp.dy = 0.15;
 av[atmp].inertia = 1.0;
 av[atmp].bounce = 0.9;

 // tiny guy
 make_actor(1, 7.0, 5.0);
 atmp.sprite = 5;
 atmp.dx = 0.125;
 av[atmp].inertia = 0.8;
 av[atmp].maxframes = 4.0;

 // set particle lifetime and time differation downwards
 // 600 ms and 200 ms diff, gives lifetimes between 600 and 400 ms
 parttime(600,200);
 // set particle direction and speed
 partdir(0.25,200,340,1.0);
 // generate particle color and type
 // this is a dustcloud
 c = partcolor(7,6,3,PARTICLE_SHRINK|PARTICLE_FRIC|PARTICLE_GRAV);
}

void move_actors() {
 // only move actor along x
 // if the resulting position
 // will not overlap with a wall

 // test collision with other actors
 atstcoll();
 // test map collision
 atstmap(0,0,0,8,16,16,2);

 // move all actors
 amove(ALL_ACTORS);
 cb_c = -1;
}

char key;
// how fast to accelerate
int accel = 0.1;

// control player
void control_player() {
  key = btn(BTN_ALL);

  if (key & KEY_LEFT) pl.dx -= accel;
  if (key & KEY_RIGHT) pl.dx += accel;
  if (key & KEY_UP) pl.dy -= accel;
  if (key & KEY_DOWN) pl.dy += accel;
}

// update actors
void update() {
 move_actors();
 control_player();
}

// draw to screen
void draw() {
 // draw map without transparency
 palt(0);
 map(0,0,0,8,16,16,0);
 // reset transparency
 palt(1);
 // draw actors
 adraw(ALL_ACTORS);
 // draw particles
 partdraw();
}



