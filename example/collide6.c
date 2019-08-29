// wall and actor collisions
// by zep

// actor = {} //all actors in world

int frames[4];
int aframe[4];
int bounce[4];
int inertia[4];

int testmin = -1;
actor atmp = 0;
actor pl = 0;
actor cb_a = 0;
actor cb_c = 0;
int cb_ce = 0;
int cb_cn = 0;
int sx = 0;
int sy = 0;
int b = 0;
int f = 0;
int n = 0;
int c = 0;

/*
void main(){
 setparticletime(500,200);
 setemitter(1,200,290,10);
 c = makeparticlecolor(9,8,3);
 drawparticles(64,64,c,-4,8);
 while(1) {
	animateparticles();
	flip();
	//animateparticles();
	//flip();
	delayredraw();
	cls();
 }
}
*/

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
	// b = 0-bounce[cb_c];
	// b = cb_c.dx;
      if (cb_c.dx < 0) {
	cb_c.dx = fmf(0 - cb_c.dx,bounce[cb_c]);
	if (cb_c == pl) {
 		setemitter(0.25,180,270,0.6);
		drawparticles(pl.x,pl.y,c,3,4);
		b = b + 1;
	}
      }

    }
    if (n & ACTOR_R_EVENT) {
	// b = 0-bounce[cb_c];
	// b = cb_c.dx;
      if (cb_c.dx > 0) {
	cb_c.dx = fmf(0 - cb_c.dx,bounce[cb_c]);
	if (cb_c == pl) {
 		setemitter(0.25,270,360,0.6);
		drawparticles(pl.x,pl.y,c,3,4);
		b = b + 1;
	}
      }
    }
    if (n & ACTOR_T_EVENT) {
	// b = 0-bounce[cb_c];
      if (cb_c.dy < 0) {
	cb_c.dy = fmf(0 - cb_c.dy,bounce[cb_c]);
	if (cb_c == pl) {
 		setemitter(0.25,230,310,0.6);
		drawparticles(pl.x,pl.y,c,3,4);
		b = b + 1;
	}
      }
    }
    if (n & ACTOR_B_EVENT) {
	// b = 0-bounce[cb_c];
      if (cb_c.dy > 0) {
	cb_c.dy = fmf(0 - cb_c.dy,bounce[cb_c]);
	if (cb_c == pl) {
 		setemitter(0.25,60,120,0.4);
		drawparticles(pl.x,pl.y,c,3,4);
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

void cb_actoranimate(int a, int e) {
 // advance one frame every
 // time actor moves 1/4 of
 // a tile
  cb_a = (a & ACTOR_MASK);

  cb_a.dx = fmf(cb_a.dx,inertia[cb_a]);
  cb_a.dy = fmf(cb_a.dy,inertia[cb_a]);

  f = aframe[cb_a];
  f += abs(cb_a.dx) * 4;
  f += abs(cb_a.dy) * 4;
  f = f % frames[cb_a];
  aframe[cb_a] = f;
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
  
  // maybe move these to callback
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
 bounce[3] = 0.9;

 // tiny guy

 make_actor(1, 7.0, 5.0);
 atmp.sprite = 5;
 atmp.dx = 0.125;
 inertia[1] = 0.8;
 frames[1] = 4.0;

 setparticletime(600,200);
 setemitter(0.25,200,340,1.0);
 c = makeparticlecolor(7,6,3,PARTICLE_SHRINK|PARTICLE_FRIC|PARTICLE_GRAV);
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
 testactormap(0,0,16,16,2);

 moveactor(ALL_ACTORS);
 cb_c = -1;
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
 move_actors();
 control_player();
}

void draw() {
 palt(0);
 drawmap(0,0,0,0,16,16,0);
 palt(1);
 // putsprite(16,16,16,8,8);
 drawactor(ALL_ACTORS);
 animateparticles();
 // drawcirc(8,8,16);
 // print("x "..pl.x,0,120,7)
 // print("y "..pl.y,64,120,7)
}


