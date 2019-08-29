// wall and actor collisions
// original for pico-8 by zep

// additional actor values
int frames[4];
int aframe[4];
int bounce[4];
int inertia[4];

// global actor vars needed, no support for local actors yet
actor atmp = 0;
actor pl = 0;
actor cb_a = 0;
actor cb_c = 0;
// these are global for easy debugging
int cb_ce = 0;
int cb_cn = 0;
int sx = 0;
int sy = 0;
int b = 0;
int f = 0;
int n = 0;
int c = 0;


void cb_actorcoll(int n, int e) {
 
  // handle only first collision for each actor 
  if (cb_c != (n & ACTOR_MASK)) {
    cb_c = (n & ACTOR_MASK);
    if (n & ACTOR_L_EVENT) { // left collision
      if (cb_c.dx < 0) {
	cb_c.dx = fmf(0 - cb_c.dx,bounce[cb_c]);
	if (cb_c == pl) {
 		setemitter(0.25,180,270,0.6);
		drawparticles(pl.x,pl.y,c,3,4);
	}
      }
    }
    if (n & ACTOR_R_EVENT) { // right collision
      if (cb_c.dx > 0) {
	cb_c.dx = fmf(0 - cb_c.dx,bounce[cb_c]);
	if (cb_c == pl) {
 		setemitter(0.25,270,360,0.6);
		drawparticles(pl.x,pl.y,c,3,4);
	}
      }
    }
    if (n & ACTOR_T_EVENT) { // top collision
      if (cb_c.dy < 0) {
	cb_c.dy = fmf(0 - cb_c.dy,bounce[cb_c]);
	if (cb_c == pl) {
 		setemitter(0.25,230,310,0.6);
		drawparticles(pl.x,pl.y,c,3,4);
	}
      }
    }
    if (n & ACTOR_B_EVENT) { // bottom collision
      if (cb_c.dy > 0) {
	cb_c.dy = fmf(0 - cb_c.dy,bounce[cb_c]);
	if (cb_c == pl) {
 		setemitter(0.25,60,120,0.4);
		drawparticles(pl.x,pl.y,c,3,4);
	}
      }
    }
  } 
}

void cb_actoranimate(int a, int e) {
  cb_a = (a & ACTOR_MASK);

  // apply inertia
  cb_a.dx = fmf(cb_a.dx,inertia[cb_a]);
  cb_a.dy = fmf(cb_a.dy,inertia[cb_a]);

  // advance one frame every
  // time actor moves 1/4 of
  // a tile
  f = aframe[cb_a];
  f += abs(cb_a.dx) * 4;
  f += abs(cb_a.dy) * 4;
  f = f % frames[cb_a];

  // set actor frame, but first save fixpoint number
  aframe[cb_a] = f;
  cb_a.frame = f2i(f);
}

// make an actor
// and add to global collection
// x,y means center of the actor
void make_actor(int a, int x, int y) {
  // set atmp to use actor values
  atmp = a;
  atmp.x = x; 
  atmp.y = y;
  atmp.dx = 0;
  atmp.dy = 0;
  atmp.sprite = 16;
  atmp.frame = 0;
  
  frames[a] = 2.0;
  inertia[a] = 0.6;
  bounce[a] = 1.0;
  aframe[a] = 0;

  // half-width and half-height
  // slightly less than 0.5 so
  // that will fit through 1-wide
  // holes.
  // a.w = 6  // 0.4 * 8
  // a.h = 6  // 0.4 * 8
  atmp.w = 0.4;
  atmp.h = 0.4;

  // callbacks for collision and movement
  atmp.oncollision = (cb_actorcoll); 
  atmp.onanimate = (cb_actoranimate);
  atmp.lives = 1;
  atmp.flags = 1;

}

void init() {
 // actor coordinates relates to map by >> 4 ( 1/16 )
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
 bounce[3] = 0.9;

 // tiny guy

 make_actor(1, 7.0, 5.0);
 atmp.sprite = 5;
 atmp.dx = 0.125;
 inertia[1] = 0.8;
 frames[1] = 4.0;

 // initialize particle emitter
 setparticletime(600,200); // each particle lives 600 ms with a variation of 200 (that is 400-600)
 setemitter(0.25,200,340,1.0); // gravity is 0.25, spawn angle 200-340, speed 1.0
 // create particle color and type, shift between color 7 and 6 preferably 3 times and set type 
 c = makeparticlecolor(7,6,3,PARTICLE_SHRINK|PARTICLE_FRIC|PARTICLE_GRAV);
}

void move_actors() {
 // only move actor along x
 // if the resulting position
 // will not overlap with a wall

 // test actot to actor collision
 testactorcoll();
 // test actor to map collision, given map corner point and size, filtered by flag
 testactormap(0,0,16,16,2);
 // move all actors
 moveactor(ALL_ACTORS);
 // clear actor callback var, accepting new collisions
 cb_c = -1;
}

char key;
// how fast to accelerate
int accel = 0.1;

void control_player() {
  key = getkey();
  
  if (key & KEY_LEFT) pl.dx -= accel;
  if (key & KEY_RIGHT) pl.dx += accel;
  if (key & KEY_UP) pl.dy -= accel;
  if (key & KEY_DOWN) pl.dy += accel;
}

void update() {
 // move actors first
 move_actors();
 // then set speed
 control_player();
}

void draw() {
 // only opaque colors 
 palt(0);
 // redraw map, essentially overwrite map
 drawmap(0,0,0,0,16,16,0);
 // set black transparent again
 palt(1);
 // draw actors
 drawactor(ALL_ACTORS);
 // animate particles
 animateparticles();
}


