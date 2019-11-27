"use strict";

var timers = [];
const PRG_SIZE = 16*1024;
const SPRITE_COUNT = 128;
const SPRITE_WIDTH = 8;
const SPRITE_HEIGHT = 8;
// A00ITBLR 000NNNNN   M00YYYYY 0XXXXXXX
const ACTOR_MAP_COLL=0x8000;
const ACTOR_ANIM_EVENT=0x8000;
const ACTOR_IN_EVENT=0x1000;
const ACTOR_T_EVENT=0x0800;
const ACTOR_B_EVENT=0x0400;
const ACTOR_Y_EVENT=0x0C00;
const ACTOR_L_EVENT=0x0200;
const ACTOR_R_EVENT=0x0100;
const ACTOR_X_EVENT=0x0300;
const SPRITE_MEMMAP = PRG_SIZE;
const SPRITE_MAP_SIZE = 4096;
const SPRITE_FLAGS_MEMMAP = 32*1024;	
const SPRITE_FLAGS_SIZE = 256;
const LINE_REDRAW_MEMMAP = SPRITE_FLAGS_MEMMAP+SPRITE_FLAGS_SIZE;
const LINE_REDRAW_SIZE = 128;
const TILEMAP_MEMMAP = SPRITE_MEMMAP+SPRITE_MAP_SIZE;
const TILEMAP_SIZE = 4096;
const SCREEN_MEMMAP = TILEMAP_MEMMAP+TILEMAP_SIZE;
const SCREEN_WIDTH = 128;
const SCREEN_WIDTH_BYTES = 64;
const SCREEN_HEIGHT = 128;
const PARTICLE_COUNT = 32;
const PARTICLE_SHRINK = 0x10;
const PARTICLE_GRAV =   0x20;
const PARTICLE_FRIC =   0x40;
const PARTICLE_STAR =   0x80;

var drwpalette = [];

function Cpu(){
	var mem = new Uint8Array(0x10000);			// 65536 bytes RAM
	var reg = [];			//16 registers
	var shadow_reg = [];			//16 shadow registers for interrupt handling
        var espico = {drawing: 0, palt: 1, coordshift: 0, clipx0: 0, clipy0: 0, clipx1: 128, clipy1: 128, camx: 0, camy: 0, flipx: 0, flipy: 0};
	var regx = 0;			//неявный регистр, указывает на Х позицию символа в текстовом режиме
	var nlregx = 0;			//неявный регистр, указывает на Х позицию символа в текстовом режиме
	var regy = 0;			//Y позиция символа
	var imageSize = 1;		//влияет на множитель размера выводимой картинки, не относится к спрайтам
	var n = 0;			// result of last operation (from wich flags are derived when needed)
	var shadow_n = 0;
	var pc = 0;				//program counter
	var interrupt = 0;		//флаг прерывания
	var redraw = 0;			//флаг, устанавливаемый после перерисовки
	var frame_count = 0;			//флаг, устанавливаемый после перерисовки
	var actors = [];		//массив адресов и координат спрайтов
	var particles = [];		//массив для частиц
	var maxParticles = PARTICLE_COUNT;	//максимальное количество частиц
	var emitter = [];		//настройки для частиц
	var bgcolor = 0;		//фоновый цвет
	var color = 7;			//цвет рисования
	var charArray = [];		//массив символов, выводимых на экран
	var interruptBuffer = [];
	var lastJKey = 0;
	var keyPosition = 0;
	var keyArray = "qwertyuiop[]{}()=789\basdfghjkl:;\"/#$@0456\nzxcvbnm<>?.,!%+*-123 ";
	const redrawAddress = SCREEN_MEMMAP;
	var drawAddress = SCREEN_MEMMAP;
	var line_draw = LINE_REDRAW_MEMMAP;

	function setDrawAddr(addr) {
  		drawAddress = (addr & 0x7fff);
  		if (drawAddress == redrawAddress) {
			line_draw = LINE_REDRAW_MEMMAP;
		} else {
			line_draw = LINE_REDRAW_MEMMAP+LINE_REDRAW_SIZE;
		}
	}

	function resetDrawAddr() {
		drawAddress = redrawAddress;
		line_draw = LINE_REDRAW_MEMMAP;
	}

	
	function SPRITE_ADDR(n){
		return (((n & 0xf0) << 5) + ((n & 0x0f) << 2));
	}

        function MEM_PIX(x,y){
                return (((y) << 6) + (x));
        }

	function GET_PIX_LEFT(p) {
		return ((p & 0xf0) >> 4);
	}

	function GET_PIX_RIGHT(p) {
		return (p & 0x0f);
	}

	function SET_PIX_LEFT(p, c) {
		return ((p & 0x0f) | ((c & 0x0f) << 4));
	}

	function SET_PIX_RIGHT(p, c) {
		return ((p & 0xf0) | (c & 0x0f));
	}

        function TILEMAP_ADDR(x,y){
                return (((y & 31) << 7) + (x & 127));
        }

        function IS_TRANSPARENT(col){
                return (espico.palt & (1 << col));
        }

        function line_redraw(y){
                return mem[LINE_REDRAW+(y & 127)];
        }

        function sprite_flags(spr){
                return (readMem(SPRITE_FLAGS_MEMMAP+(spr & 511)));
        }

	function resetActor(n) {
		if (n == 0xffff) {
			for(var i = 0; i < 32; i++){
				actors[i]  = {
					sprite: 0, frame: 0, x: 255, y: 255, speedx: 0, speedy: 0, sw: 8, sh: 8, hh: 0, hw: 0, angle: 0, refval: 0,
					lives: 0, flags: 0, gravity: 0, oncollision: 0, onanimate: 0
				};
			}
		} else {
			actors[n & 31]  = {
				sprite: 0, frame: 0, x: 255, y: 255, speedx: 0, speedy: 0, sw: 8, sh: 8, hh: 0, hw: 0, angle: 0, refval: 0,
				lives: 0, flags: 0, gravity: 0, oncollision: 0, onanimate: 0
			};
		}
	}

	function init(){
		for(var i = 0; i < PRG_SIZE; i++)
			mem[i] = 0;
		for(var i = 1; i < 16; i++)
			reg[i] = 0;
		// set stack pointer to end of PRG space
		reg[0] = PRG_SIZE;
		pc = 0;
		regx = 0;
		nlregx = 0;
		regy = 0;
		imageSize = 1;
		espico.drawing = 0;
		espico.palt = 1;
		espico.coordshift = 0;
		espico.clipx0 = 0;
		espico.clipy0 = 0;
		espico.clipx1 = 128;
		espico.clipy1 = 128;
		espico.camx = 0;
		espico.camy = 0;
		espico.flipx = 0;
		espico.flipy = 0;
		bgcolor = 0;
		color = 7;
		interrupt = 0;
		frame_count = 0;
		resetActor(0xffff);
		for(var i = 0; i < maxParticles; i++){
			particles[i] = {time: 0, radpx: 0, radq: 0, x: 0, y: 0, gravity: 0, speedx: 0, speedy: 0, color: 0};
		}
		emitter = { count: 0, nextp: 0, timeparticle: 0, timediff: 0, gravity: 0, speedx: 0, speedy: 0, speedx1: 0, speedy1: 0};
		for(var i = 0; i < 420; i++)
			charArray[i] = '';
		for(var i = 0; i < 8; i++)
			timers[i] = 0;
		for(var i = 0; i < 16; i++)
			drwpalette[i] = i;
		clearScreen(0);
	}
	
	function load(arr){
		for(var i = 0; i < arr.length; i++)
			mem[i] = arr[i];
	}
	
	function loadHex(txt, match_sections){
		var i = 0;
		var hex = [];
		var bytes_read = 0;
		var section = "none";
		var store;
		var max_bytes = 0;
		var new_line = 1;
		if (Array.isArray(match_sections)) {
		  for(var s = 0; s < match_sections.length; s++) {
			i = txt.indexOf("__"+match_sections[s]+"__");
			if (i == -1) {
				// no such section
				continue;
			}
		  bytes_read = 0; // restart counter
		  while (i+1 < txt.length) {
			while (txt[i] === '\n') i++;
			if (txt[i] == '_' && txt[i+1] == '_') {
				if (bytes_read > 0) {
					break; // only read one section
				}
				// new section
				if (txt.slice(i,i+7) === "__epo__") {
					init();  // PRG section load requires cpu re-init
					section = "epo";
					store = 0;
					max_bytes = PRG_SIZE;
					bytes_read = 0;
				} else if (txt.slice(i,i+7) === "__gfx__") {
					section = "gfx";
					store = SPRITE_MEMMAP;
					max_bytes = SPRITE_MAP_SIZE;
					bytes_read = 0;
				} else if (txt.slice(i,i+7) === "__gff__") {
					section = "gff";
					store = SPRITE_FLAGS_MEMMAP;
					max_bytes = SPRITE_FLAGS_SIZE;
					bytes_read = 0;
				} else if (txt.slice(i,i+7) === "__map__") {
					section = "map";
					store = TILEMAP_MEMMAP;
					max_bytes = TILEMAP_SIZE;
					bytes_read = 0;
				} else {
					section = "unknown";
					store = 0;
					max_bytes = 0;
					bytes_read = 0;
					break;
				}
				i += 7;
			} else if (bytes_read < max_bytes) {
				mem[store++] = hextobyte(txt[i], txt[i+1]);
				bytes_read++;
				i += 2;
			} else {
				i++;
			}
		  }
		  if (bytes_read > 0){
			// report bytes read and section
			info("cpu read "+bytes_read+" to section "+section);
		  }
		  }
		}
	}

	function exportHex(section) {
		var data = [];
		var store = 0;
		var bytes_written = 0;
		var max_bytes = 0;
		var rowlen = 0;

                if (section === "gfx") {
                  store = SPRITE_MEMMAP;
                  max_bytes = SPRITE_MAP_SIZE;
                  bytes_written = 0;
		  rowlen = 64;
                } else if (section === "gff") {
                  store = SPRITE_FLAGS_MEMMAP;
                  max_bytes = SPRITE_FLAGS_SIZE;
                  bytes_written = 0;
		  rowlen = 128;
                } else if (section === "map") {
                  store = TILEMAP_MEMMAP;
                  max_bytes = TILEMAP_SIZE;
                  bytes_written = 0;
		  rowlen = 64;
                } else {
		  return "";
		}

		while (bytes_written < max_bytes) {
			data.push(mem[store++]);
			bytes_written++;
		}
		
		return toHexE(data,section,rowlen);
	}

	function writeInt(adr, n){
		writeMem(adr + 1, (n & 0xff00) >> 8);
		writeMem(adr, n & 0xff);
	}
	
	function readInt(adr){
		return (readMem(adr + 1) << 8) + readMem(adr);
	}
	
	function writeMem(adr, n){
		mem[adr & 0xffff] = n & 0xff;
	}
	
	function readMem(adr){
		return mem[adr & 0xffff];
	}

	function setMem(to_adr, val, num_bytes) {
		var numb = (0x8000 < num_bytes) ? 0x8000 : num_bytes;
		if (to_adr + numb > 0x8000) numb = 0x8000 - to_adr;
		val = val & 0xff;
		mem.fill(val, to_adr, numb);
		/*for (var i = 0; i < num_bytes; i++) {
			mem[to_adr++] = val;
		}*/
	}

	function copyMem(to_adr, from_adr, num_bytes) {
		var numb = (0x8000 < num_bytes) ? 0x8000 : num_bytes;
		if (to_adr + numb > 0x8000) numb = 0x8000 - to_adr;
		if (from_adr + numb > 0x8000) numb = 0x8000 - from_adr;
		mem.copyWithin(to_adr,from_adr,from_adr+numb);
		/*for (var i = 0; i < num_bytes; i++) {
			mem[to_adr++] = mem[from_adr++];
		}*/
	}
	
	function setRedraw(){
		lastJKey = globalJKey;
		redraw = 1;
		frame_count++;
	}
	
	function ToInt16(n){
		return ((n >> 0) & 0xffff);
	}

	function ToInt32(n){
		return n >> 0;
	}

	function fromInt16(n){
                return (n > 0x7fff)?(n - 0x10000):n;
	}

	function setClip(x, y, w, h) {
		x = fromInt16(x);
		y = fromInt16(y);
		w = fromInt16(w);
		h = fromInt16(h);
		espico.clipx0 = (x < 0) ? 0 : x & 127;
		espico.clipx1 = (x + w > 128) ? 128 : x+w;
		espico.clipy0 = (y < 0) ? 0 : y & 127;
		espico.clipy1 = (y + h > 128) ? 128 : y+h;
	}

	function getEspicoState(s){
	  switch (s) {
	   case 0:
	     return espico.drawing;
	     break;
	   case 1:
	     return espico.coordshift;
	     break;
	  }
	}

	function setEspicoState(s, v){
	  switch (s) {
	   case 0:
	     espico.drawing = v;
	     break;
	   case 1:
	     espico.coordshift = v & 0xf;
	     break;
	   case 2:
	     espico.camx = fromInt16(v);
	     break;
	   case 3:
	     espico.camy = fromInt16(v);
	     break;
	  }
	}

	function setPalT(palt){
	  espico.palt = palt;
	}

	function coord(c) {
	  return Math.floor(c / (1 << espico.coordshift));
	} 

	function angleBetweenActors(n1, n2){
	  var A = Math.floor(Math.atan2(coord(actors[n1].y - actors[n2].y), coord(actors[n1].x - actors[n2].x)) * 57.4);
	  A = (A < 0) ? A + 360 : A;
	  return A;
	}

	function getRedrawPix(x, y) {
		if(x >= 0 && x < 128 && y >= 0 && y < 128) {
			if (x & 1) {
				return GET_PIX_RIGHT(mem[redrawAddress+MEM_PIX(x >> 1, y)]);
			} else {
				return GET_PIX_LEFT(mem[redrawAddress+MEM_PIX(x >> 1, y)]);
			}
		}
		return 0;
	}

	function getPix(x, y) {
		if(x >= 0 && x < 128 && y >= 0 && y < 128) {
			if (x & 1) {
				return GET_PIX_RIGHT(mem[drawAddress+MEM_PIX(x >> 1, y)]);
			} else {
				return GET_PIX_LEFT(mem[drawAddress+MEM_PIX(x >> 1, y)]);
			}
		}
		return 0;
	}
		

	function setPix(x, y, col){
		x -= espico.camx;
		y -= espico.camy;
		if (x >= espico.clipx0 && x < espico.clipx1 && y >= espico.clipy0 && y < espico.clipy1) {
		  if(x >= 0 && x < 128 && y >= 0 && y < 128) {
		    var x2 = x >> 1;
		    var px = mem[drawAddress+MEM_PIX(x2,y)];
		    var b = px;
		    if (x & 1) {
			px = SET_PIX_RIGHT(px, col);
		    } else {
			px = SET_PIX_LEFT(px, col);
		    }
		    if (b != px) {
			mem[drawAddress+MEM_PIX(x2,y)] = px;
			mem[line_draw+y] |= (1 << (x >> 4));
		    }
		  }
		}
	}

	function clearScreen(color) {
		var twocolor = ((drwpalette[color] << 4) | (drwpalette[color]));
		for (var i = 0; i < SCREEN_HEIGHT; i++) {
			for (var x = 0; x < SCREEN_WIDTH_BYTES; x++) {
				var px = mem[drawAddress+MEM_PIX(x,i)];
				if (px != twocolor) {
					mem[drawAddress+MEM_PIX(x,i)] = twocolor; 
      					mem[line_draw+i] = 255;
				}
			}
		}
  		espico.nlregx = 0;
  		espico.regx = 0;
  		espico.regy = 0;
  		setClip(0,0,128,128);
	}

	function drawRect(x0, y0, x1, y1){
	  var fgcolor = drwpalette[color];
          x0 = fromInt16(x0);
          y0 = fromInt16(y0);
          x1 = fromInt16(x1);
          y1 = fromInt16(y1);

	  drawFastHLine(x0, x1, y0, fgcolor);
	  drawFastHLine(x0, x1, y1, fgcolor);
	  drawFastVLine(x0, y0, y1, fgcolor);
	  drawFastVLine(x1, y1, y1, fgcolor);
	}

	function fillRectXY(x0, y0, x1,  y1){
          x0 = fromInt16(x0);
          y0 = fromInt16(y0);
          x1 = fromInt16(x1);
          y1 = fromInt16(y1);
	  for(var jy = y0; jy <= y1; jy++)
	    drawFastHLine(x0, x1, jy, drwpalette[bgcolor]);
	}

	function drawCirc(x0, y0, r){
	  var fgcolor = drwpalette[color];
	  var x  = 0;
	  var dx = 1;
	  var dy = r+r;
	  var p  = -(r>>1);
          x0 = fromInt16(x0);
          y0 = fromInt16(y0);

	  // These are ordered to minimise coordinate changes in x or y
	  // drawPixel can then send fewer bounding box commands
	  setPix(x0 + r, y0, fgcolor);
	  setPix(x0 - r, y0, fgcolor);
	  setPix(x0, y0 - r, fgcolor);
	  setPix(x0, y0 + r, fgcolor);

	  while(x<r){
		
	    if(p>=0) {
	      dy-=2;
	      p-=dy;
	      r--;
	    }
	
	    dx+=2;
	    p+=dx;
	
	    x++;
	
	    // These are ordered to minimise coordinate changes in x or y
	    // drawPixel can then send fewer bounding box commands
	    setPix(x0 + x, y0 + r, fgcolor);
	    setPix(x0 - x, y0 + r, fgcolor);
	    setPix(x0 - x, y0 - r, fgcolor);
	    setPix(x0 + x, y0 - r, fgcolor);
	
	    setPix(x0 + r, y0 + x, fgcolor);
	    setPix(x0 - r, y0 + x, fgcolor);
	    setPix(x0 - r, y0 - x, fgcolor);
	    setPix(x0 + r, y0 - x, fgcolor);
	  }
	}

	function fillCirc(x0, y0, r){
       	  var  x  = 0;
	  var  dx = 1;
	  var  dy = r+r;
	  var  p  = -(r>>1);
          x0 = fromInt16(x0);
          y0 = fromInt16(y0);
	
	  drawFHLine(x0 - r, y0, dy + 1, drwpalette[bgcolor]);
	
	  while(x<r){
	
	    if(p>=0) {
	      dy-=2;
	      p-=dy;
	      r--;
	    }
	
	    dx+=2;
	    p+=dx;
	
	    x++;
	
	    drawFHLine(x0 - r, y0 + x, 2 * r + 1, drwpalette[bgcolor]);
	    drawFHLine(x0 - r, y0 - x, 2 * r + 1, drwpalette[bgcolor]);
	    drawFHLine(x0 - x, y0 + r, 2 * x + 1, drwpalette[bgcolor]);
	    drawFHLine(x0 - x, y0 - r, 2 * x + 1, drwpalette[bgcolor]);
	
	  }
	}

	function fillRect(x, y, w, h, c){
		x = fromInt16(x);
		y = fromInt16(y);

		for(var jx = x; jx < x + w; jx++)
			for(var jy = y; jy < y + h; jy++)
				setPix(jx, jy, c);
	}

	function setActorPosition(n, x1, y1){
		actors[n].x = fromInt16(x1);
		actors[n].y = fromInt16(y1);
	}

	function setParticleTime(time, timediff){
		emitter.timeparticle = (time <= 32*255)?Math.floor(time / 32):255;
		emitter.timediff = (time-timediff <= 32*255)?Math.floor((time-timediff)/ 32):255;
	}

	function setEmitter(gravity, dir, dir1, speed){
		gravity = fromInt16(gravity);
		dir = fromInt16(dir) % 360;
		dir1 = fromInt16(dir1) % 360;
		speed = fromInt16(speed);
		emitter.gravity = coord(gravity);
		emitter.speedx = coord(Math.round(speed * Math.cos(dir / 57)));
		emitter.speedy = coord(Math.round(speed * Math.sin(dir / 57)));
		emitter.speedx1 = coord(Math.round(speed * Math.cos(dir1 / 57)));
		emitter.speedy1 = coord(Math.round(speed * Math.sin(dir1 / 57)));
	}
	
	function makeParticleColor(col1, col2, prefsteps, ptype){
		return (((ptype & 0xf0) << 8) | ((prefsteps & 0xf)<<8) | ((col1 & 0xf) | ((col2 & 0xf) << 4)));
	}

	function nearesthibit(n){
		var u = setlower8bits(n);
		var l = u-(u >> 1);
		u += 1;
		var m = (u|l) >> 1;
		return (n & m == m)?u:l;
 	}

	function setlower8bits(n){
		n |= (n >>  1);
		n |= (n >>  2);
		n |= (n >>  4);
		return (n & 0xff);
 	}

	function drawParticles(x, y, pcolor, radpx, count){
		x = coord(fromInt16(x));
		y = coord(fromInt16(y));
		radpx = fromInt16(radpx);
		if (count <= 0 || x < 0 || x > 127 || y < 0 || y > 127) return;

		if (radpx < 0) radpx = 0;
		else if (radpx > 15) radpx = 15;
		// to enable colorfading without growing, set to 0

		var radpt = (pcolor >> 8) & 0xf0; 
		var ccolor = (pcolor & 0xff);
		var colsteps = (pcolor >> 8) & 0xf;
		var radq = 255;
		if (radpx == 0) radpt |= PARTICLE_SHRINK;
		if (colsteps > radpx) radq = nearesthibit(Math.floor((emitter.timeparticle+1) / colsteps))-1;
		else radq = nearesthibit(Math.floor((emitter.timeparticle+1) / (radpx+1)))-1;
		radpt |= (radpt & PARTICLE_SHRINK) ? radpx : 0;
		// create count particles
		if (count > PARTICLE_COUNT) count = PARTICLE_COUNT;
		var n = emitter.nextp;
		do {
			if(particles[n].time == 0){
				particles[n].time = randomD(emitter.timeparticle, emitter.timediff);
				particles[n].x = x;
				particles[n].y = y;
				particles[n].radpt = radpt;
				particles[n].radq = radq;
				particles[n].color = ccolor;
				particles[n].speedx = randomD(emitter.speedx, emitter.speedx1);
				particles[n].speedy = randomD(emitter.speedy, emitter.speedy1);
				count--;
			}
			n++;
			if (n >= PARTICLE_COUNT) n = 0;
		} while ((count > 0) && (n != emitter.nextp));
		emitter.nextp = n;
	}
	
	function randomD(a, b) {
		var min = Math.min(a, b);
		var max = Math.max(a, b);
		return (Math.floor(Math.random() * (max - min + 1)) + min);
	}
	
	function animateParticles(){
		for(var n = 0; n < PARTICLE_COUNT; n++){
			if(particles[n].time > 0){
				// calculate x and y
				var x, y;
				x = particles[n].x;
				y = particles[n].y;
				var radpx = (particles[n].radpt & 0xf);
				var ptype = (particles[n].radpt & 0xf0);
				if (particles[n].color == 0){
					if (ptype & PARTICLE_STAR) {
						drawLine(x-radpx,y,x+radpx,y);
						drawLine(x,y-radpx,x,y+radpx);
					} else {
						if (bgcolor == 0) drawCirc(x,y,radpx);
						else fillCirc(x,y,radpx);
					} 
				} else {
					if (ptype & PARTICLE_STAR) {
						var tmpc = color;
						color = (particles[n].color & 0xf);
						drawLine(x-radpx,y,x+radpx,y);
						drawLine(x,y-radpx,x,y+radpx);
						color = tmpc;
					} else {
						var tmpc = bgcolor;
						bgcolor = (particles[n].color & 0xf);
						fillCirc(x,y,radpx);
						bgcolor = tmpc;
					}
				}
				// calc new radius
				if ((particles[n].time & particles[n].radq) == 0) {
					if ((particles[n].radpt & (PARTICLE_SHRINK | 0xf)) > PARTICLE_SHRINK) particles[n].radpt--; 
					else if ((particles[n].radpt & (PARTICLE_SHRINK | 0xf)) < PARTICLE_SHRINK) particles[n].radpt++;
					// cycle color here 
					if ((particles[n].color & 0xf) > (particles[n].color >> 4)) particles[n].color -= 1;
					else if ((particles[n].color & 0xf) < (particles[n].color >> 4)) particles[n].color += 1;
					// particles[n].color = (particles[n].color << 4) | (particles[n].color >> 4);
				}
				// check type here

				if (particles[n].time & 1) {
					x += particles[n].speedx;
					y += particles[n].speedy;
					if (ptype & PARTICLE_GRAV) particles[n].speedy += emitter.gravity;
				} else {
					x += (particles[n].speedx / 4) >> 0;
                                        y += (particles[n].speedy / 4) >> 0;
				}
				if (ptype & PARTICLE_FRIC) {
					particles[n].speedx = ((particles[n].speedx / 2) >> 0);
                                        particles[n].speedy = ((particles[n].speedy / 2) >> 0);
				}
					
				// delete if outside screen
				if (x < 0 || x > 127 || y < 0 || y > 127) particles[n].time = 0;
				else {
					particles[n].time--;
					particles[n].x = x;
					particles[n].y = y;
				}
			}
		}
	}

	function actorSetDirectionAndSpeed(n, speed, direction){
		speed = fromInt16(speed);
		direction = fromInt16(direction) % 360;
		var nx = speed * Math.cos(direction / 57);
		var ny = speed * Math.sin(direction / 57);
		actors[n].speedx = Math.floor(nx);
		actors[n].speedy = Math.floor(ny);
	}
	/*
	function drawRotateSprPixel(color, x1, y1, x, y, w, h, a){
		var x0 = w/2;
		var y0 = h/2;
		var nx = x0 + (x - x0) * Math.cos(a) - (y - y0) * Math.sin(a);
		var ny = y0 + (y - y0) * Math.cos(a) + (x - x0) * Math.sin(a);
		display.drawActorPixel(color, x1 + Math.floor(nx), y1 + Math.floor(ny));
	}
	*/

	function moveActor(i){
  	  var n = i+1;
	  if (i == 0xffff){
	    i = 0;
	    n = 32;
	  }
	  for(; i < n; i++)
	  if(actors[i].lives > 0){
	    var event = 0;
	    actors[i].x += actors[i].speedx;
	    actors[i].y += actors[i].speedy;
	    actors[i].speedy += actors[i].gravity;
	    if(coord(actors[i].x + actors[i].hw) < 0) event = ACTOR_L_EVENT;
	    else if (coord(actors[i].x - actors[i].hw) > 127) event = ACTOR_R_EVENT;
	    
	    if(coord(actors[i].y + actors[i].hh) < 0) event |= ACTOR_T_EVENT;
	    else if (coord(actors[i].y - actors[i].hh) > 127) event |= ACTOR_B_EVENT;

	    if (event == 0) event = ACTOR_IN_EVENT;
	    event |= ACTOR_ANIM_EVENT;
	    if(actors[i].onanimate > 0)
		 setinterrupt(actors[i].onanimate, event | i, (frame_count & 31));
	  }
	}

	function drawActor(i){
	  var n = i+1;
	  if (i == 0xffff){
	    i = 0;
	    n = 32;
	  }
	  for(; i < n; i++)
	    if (actors[i].lives > 0)
	      drawSprite(actors[i].sprite+actors[i].frame, coord(actors[i].x)-(actors[i].sw >> 1), coord(actors[i].y)-(actors[i].sh >> 1), actors[i].sw, actors[i].sh);
	}

	function nextinterrupt(){
	    reg[0] -= 2;
	    writeInt(reg[0], interruptBuffer.pop());
	    reg[0] -= 2;
	    writeInt(reg[0], interruptBuffer.pop());
	    reg[0] -= 2;
	    writeInt(reg[0], pc);
	    interrupt = pc;
	    pc = interruptBuffer.pop();
	}
	
	function setinterrupt(adr, param1, param2){
		if(interrupt == 0){
			shadow_n = n;
			for(var j = 1; j <= 15; j++){
				shadow_reg[j] = reg[j];
			}
			reg[0] -= 2;
			writeInt(reg[0], param1);
			reg[0] -= 2;
			writeInt(reg[0], param2);
			reg[0] -= 2;
			writeInt(reg[0], pc);
			interrupt = pc;
			pc = adr;
		}
		else if(interruptBuffer.length < 32*4){
			interruptBuffer.push(adr);
			interruptBuffer.push(param2);
			interruptBuffer.push(param1);
		}
	}
	
	function getActorInXY(x,y){
		x = fromInt16(x);
		y = fromInt16(y);
		for(var n = 0; n < 32; n++){
			if(actors[n].lives > 0)
				if(actors[n].x - actors.hw  < x && actors[n].x + actors[n].hw > x &&
					actors[n].y - actors[n].hh < y  && actors[n].y + actors[n].hh > y)
						return n;
		}
		return - 1;
	}
	
	function testActorCollision(){
		var n, i;
		for(n = 0; n < 32; n++){
			if(actors[n].lives > 0){
				for(i = n+1; i < 32; i++){
					if(actors[i].lives > 0){
						var x0 = Math.abs(actors[n].x - actors[i].x);
						var y0 = Math.abs(actors[n].y - actors[i].y);
						if(x0 < (actors[n].hw + actors[i].hw) && 
						   y0 < (actors[n].hh + actors[i].hh)) {
				                	var nevent = 0;
				                	var ievent = 0;
							if (actors[n].x < actors[i].x) {
							  if (actors[n].x > actors[i].x - actors[i].hw) nevent |= ACTOR_IN_EVENT;
							  else nevent |= ACTOR_R_EVENT;
							  if (actors[i].x < actors[n].x + actors[n].hw) ievent |= ACTOR_IN_EVENT;
							  else ievent |= ACTOR_L_EVENT;
							} else if (actors[n].x > actors[i].x) {
							  if (actors[i].x > actors[n].x - actors[n].hw) nevent |= ACTOR_IN_EVENT;
							  else nevent |= ACTOR_L_EVENT;
							  if (actors[n].x < actors[i].x + actors[i].hw) ievent |= ACTOR_IN_EVENT;
							  else ievent |= ACTOR_R_EVENT;
							} else {
							  nevent |= ACTOR_IN_EVENT;
							  ievent |= ACTOR_IN_EVENT;
							}
							if (actors[n].y < actors[i].y) {
							  if (actors[n].y > actors[i].y - actors[i].hh) nevent |= ACTOR_IN_EVENT;
							  else nevent |= ACTOR_B_EVENT;
							  if (actors[i].y < actors[n].y + actors[n].hh) ievent |= ACTOR_IN_EVENT;
							  else ievent |= ACTOR_T_EVENT;
							} else if (actors[n].y > actors[i].y) {
							  if (actors[i].y > actors[n].y - actors[n].hh) nevent |= ACTOR_IN_EVENT;
							  else nevent |= ACTOR_T_EVENT;
							  if (actors[n].y < actors[i].y + actors[i].hh) ievent |= ACTOR_IN_EVENT;
							  else ievent |= ACTOR_B_EVENT;
							} else {
							  nevent |= ACTOR_IN_EVENT;
							  ievent |= ACTOR_IN_EVENT;
							}
							if (nevent & (ACTOR_X_EVENT | ACTOR_Y_EVENT)) {
							  // not actually inside I
							  nevent &= (ACTOR_X_EVENT | ACTOR_Y_EVENT);
							}
							if (ievent & (ACTOR_X_EVENT | ACTOR_Y_EVENT)) {
							  // not actually inside N
							  ievent &= (ACTOR_X_EVENT | ACTOR_Y_EVENT);
							}
							if(actors[n].oncollision > 0)
								setinterrupt(actors[n].oncollision, nevent | n, i );
							if(actors[i].oncollision > 0)
								setinterrupt(actors[i].oncollision, ievent | i, n );
						}
					}
				}
			}
		}
	}

	function testTile(tx,ty,x,y,tw,th,flags){
	  return ((x >= 0 && x < tw && y >= 0 && y < th) && (sprite_flags(getTile(tx+x,ty+y)) & flags));
	}
	
	function testMapX(tx,ty,xs,xe,xdir,y,tw,th,flags,n,event){
 	    for(var x = xs; (xdir == 1) ? x<=xe : x>=xe; x+=xdir){
	        if(testTile(tx,ty,x,y,tw,th,flags)){
		  setinterrupt(actors[n].oncollision, event | n, (((ty+y) << 8) + (tx+x)) | ACTOR_MAP_COLL);
	        }
            }
	}
	
	function testMapY(tx,ty,ys,ye,ydir,x,tw,th,flags,n,event){
 	    for(var y = ys; (ydir == 1) ? y<=ye : y>=ye; y+=ydir){
	        if(testTile(tx,ty,x,y,tw,th,flags)){
		  setinterrupt(actors[n].oncollision, event | n, (((ty+y) << 8) + (tx+x)) | ACTOR_MAP_COLL);
	        }
            }
	}

	// 000I TBLR 000NNNNN  M00YYYYY0XXXXXXX
	// 00EI TBLR 000NNNNN  00000000000AAAAA

	function testActorMap(celx, cely, sx, sy, celw, celh, flags){
	  sx = fromInt16(sx);
	  sy = fromInt16(sy);
	  var x0, y0, xm, ym, x1, y1;
	  var event = 0;
	  for(var n = 0; n < 32; n++){
	    if(actors[n].lives > 0 && actors[n].oncollision > 0){
		  var ydir, xdir;
		  var e_x0, e_x1, e_y0, e_y1;
		  ydir = 1;
		  xdir = 1;
		  e_x0 = ACTOR_L_EVENT;
		  e_y0 = ACTOR_T_EVENT;
		  e_x1 = ACTOR_R_EVENT;
		  e_y1 = ACTOR_B_EVENT;
	          x0 = Math.floor(((coord(actors[n].x + actors[n].speedx - actors[n].hw) - sx) / SPRITE_WIDTH));
	          xm = Math.floor(((coord(actors[n].x + actors[n].speedx) - sx) / SPRITE_WIDTH));
	          x1 = Math.floor(((coord(actors[n].x + actors[n].speedx + actors[n].hw) - sx) / SPRITE_WIDTH));
	          y0 = Math.floor(((coord(actors[n].y + actors[n].speedy - actors[n].hh) - sy) / SPRITE_HEIGHT));
	          ym = Math.floor(((coord(actors[n].y + actors[n].speedy) - sy) / SPRITE_HEIGHT));
	          y1 = Math.floor(((coord(actors[n].y + actors[n].speedy + actors[n].hh) - sy) / SPRITE_HEIGHT));
		  if ((actors[n].speedx > 0 && x0 != xm) || (x1 == xm)){
		    var tmpx = x0;
		    x0 = x1; x1 = tmpx;
		    xdir = -1;
		    e_x0 = ACTOR_R_EVENT;
		    e_x1 = ACTOR_L_EVENT;
		  }
		  if ((actors[n].speedy > 0 && y0 != ym) || (y1 == ym)){
		    var tmpy = y0;
		    y0 = y1; y1 = tmpy;
		    ydir = -1;
		    e_y0 = ACTOR_B_EVENT;
		    e_y1 = ACTOR_T_EVENT;
		  }
		  if (x0 == xm) e_x0 = ACTOR_IN_EVENT;
		  if (x1 == xm) e_x1 = ACTOR_IN_EVENT;
		  if (y0 == ym) e_y0 = ACTOR_IN_EVENT;
		  if (y1 == ym) e_y1 = ACTOR_IN_EVENT;

		  for(var y = y0+ydir; (ydir == 1) ? y<y1 : y>y1; y+=ydir){
		    testMapX(celx,cely,x0+xdir,x1-xdir,xdir,y,celw,celh,flags,n,ACTOR_IN_EVENT);
		  }
		  testMapX(celx,cely,x0+xdir,x1-xdir,xdir,y0,celw,celh,flags,n,e_y0);
		  if (y0 != y1) testMapX(celx,cely,x0+xdir,x1-xdir,xdir,y1,celw,celh,flags,n,e_y1);
		  testMapY(celx,cely,y0+ydir,y1-ydir,ydir,x0,celw,celh,flags,n,e_x0);
		  if (x0 != x1) testMapY(celx,cely,y0+ydir,y1-ydir,ydir,x1,celw,celh,flags,n,e_x1);
		  if (testTile(celx,cely,x0,y0,celw,celh,flags)) 
                    setinterrupt(actors[n].oncollision, e_x0 | e_y0 | n, (((cely+y0) << 8) + (celx+x0)) | ACTOR_MAP_COLL);
		  if ((y0 != y1) && (testTile(celx,cely,x0,y1,celw,celh,flags))) 
                    setinterrupt(actors[n].oncollision, e_x0 | e_y1 | n, (((cely+y1) << 8) + (celx+x0)) | ACTOR_MAP_COLL);
		  if (x0 != x1){ 
		    if (testTile(celx,cely,x1,y0,celw,celh,flags)) 
                      setinterrupt(actors[n].oncollision, e_x1 | e_y0 | n, (((cely+y0) << 8) + (celx+x1)) | ACTOR_MAP_COLL);
		    if ((y0 != y1) && (testTile(celx,cely,x1,y1,celw,celh,flags)))
                      setinterrupt(actors[n].oncollision, e_x1 | e_y1 | n, (((cely+y1) << 8) + (celx+x1)) | ACTOR_MAP_COLL);
		  }
	    }
	  }
	}

	function getTile(x, y){
		return readMem(TILEMAP_MEMMAP+TILEMAP_ADDR(x,y));
	}

	function setTile(x, y, v){
		writeMem(TILEMAP_MEMMAP+TILEMAP_ADDR(x,y),v);
	}	

	function drawSprite(n, x0, y0, w, h){
	  drawImage(SPRITE_MEMMAP+SPRITE_ADDR(n), x0, y0, w, h);
	}

	function drawImage(adr, x1, y1, w, h){
		var add_next_row = 0, ainc = 1;
		if (adr >= SPRITE_MEMMAP){
		  add_next_row = 64 - (w >> 1);
		}
		if (espico.flipx != espico.flipy) {
		  add_next_row += w;
		}
		if (espico.flipy) {
		  add_next_row = -add_next_row;
		  adr = adr + 64 * (h-1);
		} 
		if (espico.flipx) {
		  adr += (w >> 1) - 1;
		  ainc = -1;
		}

		var color;
		for(var y = 0; y < h; y++){
			if (espico.flipx) {
			  for(var x = 0; x < w; x++){
				color = (readMem(adr) & 0xf);
				if(IS_TRANSPARENT(color) == 0)
					setPix(x1 + x, y1 + y, drwpalette[color]);
				x++;
				color = (readMem(adr) & 0xf0) >> 4;
				if(IS_TRANSPARENT(color) == 0)
					setPix(x1 + x, y1 + y, drwpalette[color]);
				adr += ainc;
			  }
			} else {
			  for(var x = 0; x < w; x++){
				color = (readMem(adr) & 0xf0) >> 4;
				if(IS_TRANSPARENT(color) == 0)
					setPix(x1 + x, y1 + y, drwpalette[color]);
				x++;
				color = (readMem(adr) & 0xf);
				if(IS_TRANSPARENT(color) == 0)
					setPix(x1 + x, y1 + y, drwpalette[color]);
				adr += ainc;
			  }
			}
			adr += add_next_row;
		}
	}
	
	function drawImage1bit(adr, x1, y1, w, h){
		var size = w * h / 8;
		var i = 0;
		var bit;

		for(var y = 0; y < h; y++)
			for(var x = 0; x < w; x++){
				if(i % 8 == 0){
					bit = readMem(adr);
					adr++;
				}
				if(bit & 0x80)
					setPix(x1 + x, y1 + y, drwpalette[color]);
				else
					setPix(x1 + x, y1 + y, drwpalette[bgcolor]);
				bit = bit << 1;
				i++;
			}
	}

	function drawImageS(adr, x1, y1, w, h){
                var add_next_row = 0, ainc = 1;
                if (adr >= SPRITE_MEMMAP){
                    add_next_row = 64 - (w >> 1);
                }
		if (espico.flipx != espico.flipy) {
		  add_next_row += (w & 0xfffe);
		}
		if (espico.flipy) {
		  add_next_row = -add_next_row;
		  adr = adr + (add_next_row + (w >> 1)) * (h-1);
		} 
		if (espico.flipx) {
		  adr += (w >> 1) - 1;
		  ainc = -1;
		}

		var color,jx,jy;
		var s = imageSize;
		var ws = w * s;
		var hs = h * s;
		for(var y = 0; y < hs; y+=s){
			if (espico.flipx) {
			  for(var x = 0; x < ws; x+=s){
				color = (readMem(adr) & 0xf);
				if(IS_TRANSPARENT(color) == 0)
					for(jy = 0; jy < s; jy++)
						for(jx = 0; jx < s; jx++)
							setPix(x1 + x + jx, y1 + y + jy, drwpalette[color]);
				x += s;
				color = (readMem(adr) & 0xf0) >> 4;
				if(IS_TRANSPARENT(color) == 0)
					for(jy = 0; jy < s; jy++)
						for(jx = 0; jx < s; jx++)
							setPix(x1 + x + jx, y1 + y + jy, drwpalette[color]);
				adr += ainc;
			  }
			} else {
			  for(var x = 0; x < ws; x+=s){
				color = (readMem(adr) & 0xf0) >> 4;
				if(IS_TRANSPARENT(color) == 0)
					for(jy = 0; jy < s; jy++)
						for(jx = 0; jx < s; jx++)
							setPix(x1 + x + jx, y1 + y + jy, drwpalette[color]);
				x += s;
				color = (readMem(adr) & 0xf);
				if(IS_TRANSPARENT(color) == 0)
					for(jy = 0; jy < s; jy++)
						for(jx = 0; jx < s; jx++)
							setPix(x1 + x + jx, y1 + y + jy, drwpalette[color]);
				adr += ainc;
			  }
			}
			adr += add_next_row;
		}
	}
	
	function drawImage1bitS(adr, x1, y1, w, h){
		var size = w * h / 8;
		var i = 0;
		var bit,jx,jy;
		var s = imageSize;
		for(var y = 0; y < h; y++)
			for(var x = 0; x < w; x++){
				if(i % 8 == 0){
					bit = readMem(adr);
					adr++;
				}
				if(bit & 0x80){
					for(jx = 0; jx < s; jx++)
						for(jy = 0; jy < s; jy++)
							setPix(x1 + x * s + jx, y1 + y * s + jy, drwpalette[color]);
				}
				else{
					for(jx = 0; jx < s; jx++)
						for(jy = 0; jy < s; jy++)
							setPix(x1 + x * s + jx, y1 + y * s + jy, drwpalette[bgcolor]);
				}
				bit = bit << 1;
				i++;
			}
	}

	function drawTileMap(celx, cely, x0, y0, celw, celh, layer){
		x0 = fromInt16(x0);
		y0 = fromInt16(y0);

    		var nx, ny;
    		var spr;
    		for(var x = 0; x < celw; x++){
      			nx = x0 + x * 8;
      			for(var y = 0; y < celh; y++){
        			spr = getTile(celx+x, cely+y);
        			ny = y0 + y * 8;
        			if (spr > 0) {
				  if ((sprite_flags(spr) & layer) == layer) { 
				    drawSprite(spr, nx, ny, 8, 8);
				  }
				} else if (espico.palt == 0) {
				    fillRect(nx,ny,8,8,0);
				}
      			}
    		}
	}
	
	function drawFastVLine(x, y1, y2, color){
		for(var i = y1; i <= y2; i++)
			setPix(x, i, color);
	}
	
	function drawFastHLine(x1, x2, y, color){
		for(var i = x1; i <= x2; i++)
			setPix(i, y, color);
	}

	function drawFHLine(x, y, w, color){
		for(var i = x; i < x+w; i++)
			setPix(i, y, color);
	}
	
	function drawLine(x1, y1, x2, y2) {
		var fgcolor = drwpalette[color];
		if(x1 == x2){
			if(y1 > y2)
				drawFastVLine(x1, y2, y1, fgcolor);
			else
				drawFastVLine(x1, y1, y2, fgcolor);
			return;
		}
		else if(y1 == y2){
			if(x1 > x2)
				drawFastHLine(x2, x1, y1, fgcolor);
			else
				drawFastHLine(x1, x2, y1, fgcolor);
			return;
		}
		var deltaX = Math.abs(x2 - x1);
		var deltaY = Math.abs(y2 - y1);
		var signX = x1 < x2 ? 1 : -1;
		var signY = y1 < y2 ? 1 : -1;
		var error = deltaX - deltaY;
		setPix(x2, y2, fgcolor);
		while(x1 != x2 || y1 != y2){
			setPix(x1, y1, fgcolor);
			var error2 = error * 2;
			if(error2 > -deltaY){
				error -= deltaY;
				x1 += signX;
			}
			if(error2 < deltaX){
				error += deltaX;
				y1 += signY;
			}
		}
	}

        function putchar(chr, x, y, col){
                var c = chr.charCodeAt(0);
		col = drwpalette[col];
                if (c >= 32 && c < (32 + (font.length / FONT_WIDTH))) {
                        c -= 32;
                for(var i=0; i<FONT_WIDTH; i++ ) { // Char bitmap = 5 columns
                        var line = font[c * FONT_WIDTH + i];
                        for(var j=0; j<FONT_HEIGHT; j++, line >>= 1) {
                                if(line & 1)
                                        setPix(x+i, y+j, col);
                        }
                }
                }
        }

	
	function prints(adr){
		var i = 0;
		var x = regx;
		while(!(readMem(adr + i) == 0 || i > 1023)){
			var c = String.fromCharCode(readMem(adr + i));
			if (c == '\n'){
				regy += FONT_HEIGHT;
				x = nlregx;
			} else {
				putchar(c , x, regy, color);
				x += FONT_WIDTH+1;
			}
			i++;
		}
		regy += FONT_HEIGHT;
		regx = nlregx;
	}

	function printc(c){
		if (c == '\n') {
			regy += FONT_HEIGHT;
			regx = nlregx;
		} else {
			putchar(c , regx, regy, color);
			regx += FONT_WIDTH+1;
		}
	}
	
	function randomInteger(min, max) {
		var rand = min - 0.5 + Math.random() * (max - min + 1)
		rand = Math.round(rand);
		return rand;
	}
	
	function distancepp(x1, y1, x2, y2){
		return Math.floor(Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)));
	}
	
	function step(){
		//все команды двухбайтные, за некоторыми следуют два байта данных
		var op1 = mem[pc++]; //первый байт
		var op2 = mem[pc++]; //второй байт
		var reg1 = 0;		// дополнительные переменные
		var reg2 = 0;
		var reg3 = 0;
		switch(op1 & 0xf0){
			case 0x00:
				switch(op1){ 
					case 0x01: 
						//LDI R,int		01 0R XXXX
						reg1 = (op2 & 0xf);
						n = readInt(pc);
						reg[reg1] = ToInt16(n);
						pc += 2;
						break;
					case 0x02: 
						//LDI R,(R)		02 RR
						reg1 = ((op2 & 0xf0) >> 4);
						reg2 = (op2 & 0xf);
						n = readInt(reg[reg2]);
						reg[reg1] = ToInt16(n);
						break;
					case 0x03: 
						//LDI R,(adr)	03 0R XXXX
						reg1 = (op2 & 0xf);
						n = readInt(readInt(pc));
						reg[reg1] = ToInt16(n);
						pc += 2;
						break;
					case 0x04: 
						//LDI R,(int+R)	04 RR XXXX
						reg1 = ((op2 & 0xf0) >> 4);
						reg2 = (op2 & 0xf);
						n  = readInt(reg[reg2] + readInt(pc));
						reg[reg1] = ToInt16(n);
						pc += 2;
						break;
					case 0x05: 
						//STI (R),R		05 RR
						reg1 = (op2 & 0xf0) >> 4;
						reg2 = op2 & 0xf;
						//writeInt(readInt(reg[reg1]),reg[reg2]);
						writeInt(reg[reg1],reg[reg2]);
						break;
					case 0x06:
						if((op2 & 0x0f) == 0){
							//STI (adr),R	06 R0 XXXX
							reg1 = (op2 & 0xf0) >> 4;
							writeInt(readInt(pc),reg[reg1]);
							pc += 2;
						}
						else{
							//STI (adr+R),R 06 RR XXXX
							reg1 = (op2 & 0xf0) >> 4;
							reg2 = op2 & 0xf;
							writeInt(readInt(pc) + reg[reg1],reg[reg2]);
							pc += 2;
						}
						break;
					case 0x07:
						//MOV R,R		07 RR
						reg1 = (op2 & 0xf0) >> 4;
						reg2 = op2 & 0xf;
						reg[reg1] = reg[reg2];
						break;
					case 0x08:
						//LDIAL R,(int+R*2)	08 RR XXXX
						reg1 = (op2 & 0xf0) >> 4;
						reg2 = op2 & 0xf;
						n = readInt(reg[reg2] * 2 + readInt(pc));
						reg[reg1] = ToInt16(n);
						pc += 2;
						break;
					case 0x09:
						//STIAL (adr+R*2),R 	09 RR XXXX
						reg1 = (op2 & 0xf0) >> 4;
						reg2 = op2 & 0xf;
						writeInt(readInt(pc) + reg[reg1] * 2,reg[reg2]);
						pc += 2;
						break;
					default:
						pc++;
				}
				break;
			case 0x10:
				// LDC R,char	1R XX
				reg1 = (op1 & 0xf);
				n = reg[reg1] = op2;
				break;
			case 0x20:
				if(op1 == 0x20){
					// LDC R,(R)	20 RR
					reg1 = ((op2 & 0xf0) >> 4);
					reg2 = (op2 & 0xf);
					n = readMem(reg[reg2]);
					reg[reg1] = ToInt16(n);
				}
				else{
					// LDC R,(R+R)	2R RR
					reg1 = (op1 & 0xf);
					reg2 = ((op2 & 0xf0) >> 4);
					reg3 = (op2 & 0xf);
					n = readMem(reg[reg2] + reg[reg3]);
					reg[reg1] = ToInt16(n);
				}
				break;
			case 0x30: 
				switch(op1){
					case 0x30:
						// LDC R,(int+R)30 RR XXXX
						reg1 = ((op2 & 0xf0) >> 4);
						reg2 = (op2 & 0xf);
						n = readMem(reg[reg2] + readInt(pc));
						reg[reg1] = ToInt16(n);
						pc += 2;
						break;
					case 0x31:
						// LDC R,(adr)	31 0R XXXX
						reg1 = (op2 & 0xf);
						n = readMem(readInt(pc));
						reg[reg1] = ToInt16(n);
						pc += 2;
						break;
					case 0x32:
						// STC (adr),R	32 0R XXXX
						reg1 = (op2 & 0xf0) >> 4;
						writeMem(readInt(pc),reg[reg1]);
						pc += 2;
						break;
					case 0x33:
						// STC (int+R),R33 RR XXXX
						reg1 = (op2 & 0xf0) >> 4;
						reg2 = op2 & 0xf;
						writeMem(readInt(pc) + reg[reg1],reg[reg2]);
						pc += 2;
						break;
				}
				break;
			case 0x40:
				if(op1 == 0x40){
					// STC (R),R	40 RR
					reg1 = (op2 & 0xf0) >> 4;
					reg2 = op2 & 0xf;
					//writeMem(readInt(reg[reg1]),reg[reg2]);
					writeMem(reg[reg1], reg[reg2]);
				}
				else{
					// STC (R+R),R	4R RR 
					reg1 = (op1 & 0xf);
					reg2 = ((op2 & 0xf0) >> 4);
					reg3 = (op2 & 0xf);
					writeMem(reg[reg1] + reg[reg2], reg[reg3]);
				}
				break;
			case 0x50:
				switch(op1){ 
					case 0x50:
						//HLT				5000
						//FLIP                          5050
						if (op2 == 0x50) {
							if (redraw) {
								redraw = 0;
								break;
							}
							// on hardware this is a good place to disable CPU 
							// until redraw has been done 
						}
						pc -= 2;
						break;
					case 0x51:
						// STIMER R,R		51RR
						reg1 = (op2 & 0xf0) >> 4;
						reg2 = op2 & 0xf;
						timers[reg[reg1] & 0x7] = reg[reg2];
						break;
					case 0x52:
						// GTIMER R		520R
						reg1 = op2 & 0xf;
						n = reg[reg1] = timers[reg[reg1] & 0x7];
						break;
					case 0x55:
						// EPSTAT R,R   55RR
						reg1 = (op2 & 0xf0) >> 4;
						reg2 = op2 & 0xf;
						setEspicoState(reg1,reg[reg2]);
						break;
				}
				break;
			case 0x60:
				// LDIAL R,(R+R*2)	6R RR
				reg1 = (op1 & 0xf);
				reg2 = ((op2 & 0xf0) >> 4);
				reg3 = (op2 & 0xf);
				n = readInt(reg[reg2] + reg[reg3]*2);
				reg[reg1] = ToInt16(n);
				break;
			case 0x70:
				// STIAL (R+R*2),R	7R RR
				reg1 = (op1 & 0xf);
				reg2 = ((op2 & 0xf0) >> 4);
				reg3 = (op2 & 0xf);
				writeInt(reg[reg1] + reg[reg2]*2, reg[reg3]);
				break;	
			case 0x80:
				switch(op1){
					case 0x80:
						// POP R		80 0R
						reg1 = (op2 & 0xf);
						reg[reg1] = readInt(reg[0]);
						reg[0] += 2;
						break;
					case 0x81:
						// POPN R		81 0R
						reg1 = (op2 & 0xf);
						for(var j = reg1; j >= 1; j--){
							reg[j] = readInt(reg[0]);
							reg[0] += 2;
						}
						break;
					case 0x82:
						// PUSH R		82 0R
						reg1 = (op2 & 0xf);
						reg[0] -= 2;
						writeInt(reg[0], reg[reg1]);
						break;
					case 0x83:
						// PUSHN R		83 0R
						reg1 = (op2 & 0xf);
						for(var j = 1; j <= reg1; j++){
							reg[0] -= 2;
							writeInt(reg[0], reg[j]);
						}
						break;
					case 0x84:
						// PUSH int		84 00 XXXX
						reg[0] -= 2;
						writeInt(reg[0], readInt(pc));
						pc += 2;
						break;
					case 0x88:
						// MEMSET R		88 0R
						// MEMCPY R		88 1R
						reg1 = (op2 & 0xf0);
						reg2 = (op2 & 0x0f);
						var adr = reg[reg2];
						var ptr1 = (readInt(adr + 4) & 0x7fff);
						var ptr2 = (readInt(adr + 2) & 0x7fff);
						var numb = readInt(adr);
						if (numb > 0x8000) numb = 0x8000;
						if (ptr1 + numb > 0x8000) numb = 0x8000 - ptr1;
						if (reg1 == 0x00) {
							setMem(ptr1, ptr2 & 0xff, numb);
						} else if (reg1 == 0x10) {
							if (ptr2 + numb > 0x8000) numb = 0x8000 - ptr2;
							copyMem(ptr1, ptr2, numb);
						}
						break;
				}
				break;
			case 0x90:
				switch(op1){
					case 0x90:
						// JMP adr		90 00 XXXX
						pc = readInt(pc);
						break;
					case 0x91:
						// JNZ adr		91 00 XXXX
						if(n != 0)
							pc = readInt(pc);
						else 
							pc += 2;
						break;
					case 0x92:
						// JZ adr		92 00 XXXX
						if(n == 0)
							pc = readInt(pc);
						else 
							pc += 2;
						break;
					case 0x93:
						// JNP adr		93 00 XXXX
						if((n & 0xffff) > 0x7fff)
							pc = readInt(pc);
						else 
							pc += 2;
						break;
					case 0x94:
						// JP adr		94 00 XXXX
						if((n & 0xffff) <= 0x7fff)
							pc = readInt(pc);
						else 
							pc += 2;
						break;
					case 0x95:
						// JNC adr		95 00 XXXX
						if(n <= 0xffff)
							pc = readInt(pc);
						else 
							pc += 2;
						break;
					case 0x96:
						// JC adr		96 00 XXXX
						if(n > 0xffff)
							pc = readInt(pc);
						else 
							pc += 2;
						break;
					case 0x97:
						// JZR R,adr	97 0R XXXX
						reg1 = op2 & 0xf;
						if(reg[reg1] == 0)
							pc = readInt(pc);
						else 
							pc += 2;
						break;
					case 0x98:
						// JNZR R,adr	98 0R XXXX
						reg1 = op2 & 0xf;
						if(reg[reg1] != 0)
							pc = readInt(pc);
						else 
							pc += 2;
						break;
					case 0x99:
						// CALL adr		99 00 XXXX
						// CALL (adr)		99 10 XXXX
						// CALL (adr+R)		99 2R XXXX
						reg1 = op2 & 0xf;
						reg[0] -= 2;
						if(reg[0] < 0) reg[0] += 0xffff;
						writeInt(reg[0], pc + 2);
						if ((op2 & 0xf0) == 0x20) pc = readInt(readInt(pc) + reg[reg1]);
						else if ((op2 & 0xf0) == 0x10) pc = readInt(readInt(pc));
						else pc = readInt(pc);
						break;
					case 0x9A:
						// RET			9A 00
						if(interrupt == 0){
							pc = readInt(reg[0]);
							reg[0] += 2;
						}
						else{
							pc = readInt(reg[0]);
							if(pc == interrupt){
								reg[0] += 6;
								if (interruptBuffer.length > 0) {
									nextinterrupt();
								} else {
								for(var j = 15; j >= 1; j--){
									reg[j] = shadow_reg[j];
								}
								n = shadow_n;
								interrupt = 0;
								}
							}
							else
								reg[0] += 2;
						}
						break;
				}
				break;
			case 0xA0:
				switch(op1){
					case 0xA0:
						// ADD R,R		A0 RR
						reg1 = (op2 & 0xf0) >> 4;
						reg2 = op2 & 0xf;
						n = ToInt32( reg[reg1] + reg[reg2] );
						reg[reg1] = ToInt16(n);
						break;
					case 0xA1:
						// ADC R,R		A1 RR
						reg1 = (op2 & 0xf0) >> 4;
						reg2 = op2 & 0xf;
						n = ToInt32( reg[reg1] + reg[reg2] + ((n > 0xffff) ? 1 : 0) );
						reg[reg1] = ToInt16(n);
						break;
					case 0xA2:
						// SUB R,R		A2 RR
						reg1 = (op2 & 0xf0) >> 4;
						reg2 = op2 & 0xf;
						n = ToInt32( reg[reg1] - reg[reg2] );
						reg[reg1] = ToInt16(n);
						break;
					case 0xA3:
						// SBC R,R		A3 RR
						reg1 = (op2 & 0xf0) >> 4;
						reg2 = op2 & 0xf;
						n = ToInt32( reg[reg1] - reg[reg2] - ((n > 0xffff) ? 1 : 0) );
						reg[reg1] = ToInt16(n);
						break;
					case 0xA4:
						// MUL R,R		A4 RR
						reg1 = (op2 & 0xf0) >> 4;
						reg2 = op2 & 0xf;
						var v1 = fromInt16(reg[reg1]);
						var v2 = fromInt16(reg[reg2]);
						n = ToInt32( v1 * v2 );
						reg[reg1] = ToInt16(n);
						break;
					case 0xA5:
						// DIV R,R		A5 RR
						reg1 = (op2 & 0xf0) >> 4;
						reg2 = op2 & 0xf;
						var v1 = fromInt16(reg[reg1]);
						var v2 = fromInt16(reg[reg2]);
						if(v1 == 0){
						  n = 0;
						  reg[reg2] = 0;
						} else if(v2 == 0){
						  n = (v1 > 0) ? 0x7fff : 0x8000;
						  reg[reg2] = 0; 
						} else{
						  n = ToInt32( v1 / v2 );
						  var m = Math.abs(v1 % v2);
						  reg[reg2] = (v2 < 0) ? -m : m;
						}
						reg[reg1] = ToInt16(n);
						break;
					case 0xA6:
						// AND R,R		A6 RR
						reg1 = (op2 & 0xf0) >> 4;
						reg2 = op2 & 0xf;
						n = ToInt32( reg[reg1] & reg[reg2] );
						reg[reg1] = ToInt16(n);
						break;
					case 0xA7:
						// OR R,R		A7 RR
						reg1 = (op2 & 0xf0) >> 4;
						reg2 = op2 & 0xf;
						n = ToInt32( reg[reg1] | reg[reg2] );
						reg[reg1] = ToInt16(n);
						break;
					case 0xA8:
						if(op2 == 0x10){
							// INC adr		A8 10 XXXX
							reg1 = op2 & 0xf;
							n = ToInt32( readInt(readInt(pc)) + 1 );
							writeInt(readInt(pc), n);
							pc += 2;
						}
						else if(op2 > 0x10){
							// INC R,n		A8 nR
							reg1 = op2 & 0xf;
							n = ToInt32( reg[reg1] + (op2 >> 4) );
							reg[reg1] = ToInt16(n);
						}
						else{
							// INC R		A8 0R				
							reg1 = op2 & 0xf;
							n = ToInt32( reg[reg1] + 1 );
							reg[reg1] = ToInt16(n);
						}
						break;
					case 0xA9:
						if(op2 == 0x10){
							// DEC adr		A9 10 XXXX
							reg1 = op2 & 0xf;
							n = ToInt32( readInt(readInt(pc)) - 1 );
							writeInt(readInt(pc), n);
							pc += 2;
						}
						else if(op2 > 0x10){
							// DEC R,n		A9 nR
							reg1 = op2 & 0xf;
							n = ToInt32( reg[reg1] - (op2 >> 4) );
							reg[reg1] = ToInt16(n);
						}
						else{
							// DEC R		A9 0R
							reg1 = op2 & 0xf;
							n = ToInt32( reg[reg1] - 1 );
							reg[reg1] = ToInt16(n);
						}
						break;
					case 0xAA:
						// XOR R,R		AA RR
						reg1 = (op2 & 0xf0) >> 4;
						reg2 = op2 & 0xf;
						n = ToInt32( reg[reg1] ^ reg[reg2] );
						reg[reg1] = ToInt16(n);
						break;
					case 0xAB:
						// SHL R,R		AB RR
						reg1 = (op2 & 0xf0) >> 4;
						reg2 = op2 & 0xf;
						n = ToInt32( reg[reg1] << reg[reg2] );
						reg[reg1] = ToInt16(n);
						break;
					case 0xAC:
						// SHR R,R		AC RR
						reg1 = (op2 & 0xf0) >> 4;
						reg2 = op2 & 0xf;
						n = ToInt32( reg[reg1] >> reg[reg2] );
						reg[reg1] = ToInt16(n);
						break;
					case 0xAD:
						reg1 = op2 & 0xf;
						reg2 = op2 & 0xf0;
						// RAND R,R		AD 0R
						if(reg2 == 0x00){
							n = randomInteger(0, fromInt16(reg[reg1]));
							reg[reg1] = ToInt16(n);
						}
						// SQRT R		AD 1R
						else if(reg2 == 0x10){
							n = Math.floor(Math.sqrt(fromInt16(reg[reg1])));
							reg[reg1] = ToInt16(n);
						}
						// COS R		AD 2R
						else if(reg2 == 0x20){
							n = Math.floor(Math.cos(fromInt16(reg[reg1])/57.4)*128);
							reg[reg1] = ToInt16(n);
						}
						// SIN R		AD 3R
						else if(reg2 == 0x30){
							n = Math.floor(Math.sin(fromInt16(reg[reg1])/57.4)*128);
							reg[reg1] = ToInt16(n);
						}
						// ABS R		AD 4R
						else if(reg2 == 0x40){
							n = Math.abs(fromInt16(reg[reg1]));
							reg[reg1] = ToInt16(n);
						}
						// NOTL R		AD 5R
						else if(reg2 == 0x50){
							n = ((fromInt16(reg[reg1])) ? 0 : 1);
							reg[reg1] = ToInt16(n);
						}
						// ABS R		AD 6R
						else if(reg2 == 0x60){
							n = ~(fromInt16(reg[reg1]));
							reg[reg1] = ToInt16(n);
						}
						break;
					case 0xAE:
						// ANDL R,R		AE RR
						reg1 = (op2 & 0xf0) >> 4;
						reg2 = op2 & 0xf;
						n = (reg[reg1] != 0 && reg[reg2] != 0) ? 1 : 0;
						reg[reg1] = ToInt16(n);
						break;
					case 0xAF:
						// ORL R,R		AF RR
						reg1 = (op2 & 0xf0) >> 4;
						reg2 = op2 & 0xf;
						n = (reg[reg1] != 0 || reg[reg2] != 0) ? 1 : 0;
						reg[reg1] = ToInt16(n);
						break;
				}
				break;
			case 0xB0:
				//CMP R,CHR		BR XX
				reg1 = (op1 & 0x0f);
				n = ToInt32( reg[reg1] - op2 );
				break;
			case 0xC0:
				switch(op1){
					case 0xC0:
						//CMP R,INT		C0 R0 XXXX
						reg1 = (op2 & 0xf0) >> 4;
						n = ToInt32( reg[reg1] - readInt(pc) );
						pc += 2;
						break;
					case 0xC1:
						//CMP R,R		C1 RR
						reg1 = (op2 & 0xf0) >> 4;
						reg2 = op2 & 0xf;
						n = ToInt32( reg[reg1] - reg[reg2] );
						break;
					case 0xC2:
						//LDF R,F		C2 RF
						reg1 = (op2 & 0xf0) >> 4;
						reg2 = op2 & 0xf;
						if(reg2 == 0)        // carry
							reg[reg1] = (n > 0xffff) ? 1 : 0;
						else if(reg2 == 1)   // zero
							reg[reg1] = (n == 0) ? 1 : 0;
						else if(reg2 == 2)   // negative
							reg[reg1] = ((n & 0xffff) > 0x7fff) ? 1 : 0;
						else if(reg2 == 3){  //pozitive
							if(n != 0 && ((n & 0xffff) <= 0x7fff))
								reg[reg1] = 1;
							else
								reg[reg1] = 0;
						}
						else if(reg2 == 4){  //not pozitive
							if(n != 0 && ((n & 0xffff) <= 0x7fff))
								reg[reg1] = 0;
							else
								reg[reg1] = 1;
						}
						else if(reg2 == 5)   // not zero
							reg[reg1] = (n == 0) ? 0 : 1;
						else if(reg2 == 6){  // redraw
							reg[reg1] = redraw;
							redraw = 0;
						}
						else
							reg[reg1] = 0;
						break;
					case 0xC3:
						//LDRES X,R		C3 XR
						reg1 = (op2 & 0xf0) >> 4;
						reg2 = op2 & 0xf;
						reg[reg2] = ToInt16(n >> reg1);
						break;
				        case 0xC4:
				          // MULRES X,R    C4 XR
				          reg1 = (op2 & 0xf0) >> 4;
				          reg2 = op2 & 0xf;
				          n = ToInt32( reg[reg2] * (1 << reg1) );
				          reg[reg2] = ToInt16(n);
				          break;
				        case 0xC5:
				          // DIVRES X,R    C5 XR
				          reg1 = (op2 & 0xf0) >> 4;
				          reg2 = op2 & 0xf;
				          if (reg1 == 0) {
				            if(reg[reg2] != 0)
				              n = ToInt32( n / reg[reg2] );
				            else
				              n = 0xffffffff; //error, but give max
				          } else {
				            n = ToInt32( n / (1 << reg1) );
				          }
				          reg[reg2] = ToInt16(n);
				          break;
				}
				break;
			case 0xD0:
				switch(op1){ 
					case 0xD0:
						//CLS		D000
					          if (op2 == 0x00) {
						    clearScreen(bgcolor);
					          } else if ((op2 & 0xf0) == 0x10) {
					            reg1 = (op2 & 0xf);
					            var adr = reg[reg1];
					            drawRect(readInt(adr + 6), readInt(adr + 4), readInt(adr + 2), readInt(adr));
					          } else if ((op2 & 0xf0) == 0x20) {
					            reg1 = (op2 & 0xf);
					            var adr = reg[reg1];
					            fillRectXY(readInt(adr + 6), readInt(adr + 4), readInt(adr + 2), readInt(adr));
					          } else if ((op2 & 0xf0) == 0x30) {
					            reg1 = (op2 & 0xf);
					            var adr = reg[reg1];
					            drawCirc(readInt(adr + 4), readInt(adr + 2), readInt(adr));
					          } else if ((op2 & 0xf0) == 0x40) {
					            reg1 = (op2 & 0xf);
					            var adr = reg[reg1];
					            fillCirc(readInt(adr + 4), readInt(adr + 2), readInt(adr));
					          }
						  break;
					case 0xD1:
						switch(op2 & 0xf0){
							case 0x00:
								//PUTC R	D10R
								reg1 = (op2 & 0xf);
								//console.log(String.fromCharCode(reg[reg1]) + ':' + reg[reg1]);
								printc(String.fromCharCode(reg[reg1]));
								break;
							case 0x10:
								//PUTS R	D11R
								reg1 = (op2 & 0xf);
								prints(reg[reg1]);
								break;
							case 0x20:
								//PUTN R D12R 
								reg1 = (op2 & 0xf);
								var s;
								if(reg[reg1] < 32768)
									s = reg[reg1].toString(10);
								else
									s = (reg[reg1] - 0x10000).toString(10);
								for(var i = 0; i < s.length; i++){
									printc(s[i]);
								}
								break;
							case 0x30:
								//SETX R			D13R
								reg1 = (op2 & 0xf);
								regx = (reg[reg1] & 0xff);
								nlregx = regx;
								break;
							case 0x40:
								//SETY R			D14R
								reg1 = (op2 & 0xf);
								regy = (reg[reg1] & 0xff);
								break;
							case 0x50:
								//CLIP R			D15R
								reg1 = (op2 & 0xf);
								var adr = reg[reg1];
								setClip(readInt(adr+6), readInt(adr+4), readInt(adr+2), readInt(adr));
								break;
            						case 0xA0:
              							//DRWADR R      D1AR
              							//RSTDAD        D1A0
              							reg1 = (op2 & 0xf);
              							if (reg1 == 0) {
              								resetDrawAddr();
              							} else {
              								setDrawAddr(reg[reg1]);
              							}
              							break;
							case 0xB0:
								//PUTRES X 			D1BX
								// const deci = [0,1,2,3,3,3, 3,3,3,3,3, 4,4,5,5,5];
								const deci = [0,2,3,4,4,4, 4,4,4,4,4, 5,5,6,6,6];
								reg1 = (op2 & 0xf);
								var numi = ToInt16(n);
								var s;
								if (numi < 32768) {
									s = (numi / (1 << reg1)).toFixed(deci[reg1]).slice(0,-1);
								} else {
									s = '-';
									s += (ToInt16((~numi)+1) / (1 << reg1)).toFixed(deci[reg1]).slice(0,-1);
								} /*
								var numi = ToInt32(n >> reg1);
								var s;
								s = n.toString(10) + '=';
								if(numi < (1 << (15-reg1)))
									s += numi.toString(10);
								else
									s += (numi - (1 << (16-reg1))).toString(10);
								if(reg1 > 0) {
									s += '.';
									var tmul = tens[reg1-1];
									var numf = ToInt32(((n & (fmul - 1)) * tmul) >> (reg1-1));
									// round
									numf = (numf >> 1) + (numf & 1);
									tmul /= 10;
									while (tmul > 1 && numf < tmul) {
										tmul /= 10;
										s += '0';
									}
									s += numf.toString(10);
								} */
								for(var i = 0; i < s.length; i++){
									printc(s[i]);
								}
								break;
						}
						break;
					case 0xD2: 
						switch(op2 & 0xf0){
							case 0x00:
								// GETK R			D20R
								reg1 = (op2 & 0xf);
								/*
								display.viewKeyboard(keyPosition);
								if(globalJKey == 1 && keyPosition > 21)
									keyPosition -= 21;
								if(globalJKey == 2 && keyPosition < 42)
									keyPosition += 21;
								if(globalJKey == 4 && keyPosition > 0)
									keyPosition--;
								if(globalJKey == 8 && keyPosition < 62)
									keyPosition++;
								if(globalJKey >= 16)
									globalKey = keyArray.charCodeAt(keyPosition) & 0xff;
								globalJKey = 0;
								if(globalKey != 0)
									reg[reg1] = globalKey;
								else
									pc -= 2;
								globalKey = 0;
								*/
								reg[reg1] = 0;
								break;
							case 0x10:
								// GETJ R			D21R
								reg1 = (op2 & 0xf);
								n = globalJKey;
								reg[reg1] = ToInt16(n);
								break;
							case 0x20:
								// BTN R			D22R
								reg1 = (op2 & 0xf);
								n = globalJKey;
								if (reg[reg1] != 0xffff) {
								  reg[reg1] &= 7;
								  n &= (1 << reg[reg1]);
								}
								reg[reg1] = ToInt16(n);
								break;
							case 0x30:
								// BTNP R			D23R
								reg1 = (op2 & 0xf);
								n = globalJKey & (~lastJKey);
								if (reg[reg1] != 0xffff) {
								  reg[reg1] &= 7;
								  n &= (1 << reg[reg1]);
								}
								reg[reg1] = ToInt16(n);
								break;
						}
						break;
					case 0xD3:
						// PPIX R,R		D3RR
						reg1 = (op2 & 0xf0) >> 4;
						reg2 = op2 & 0xf;
						setPix(reg[reg1], reg[reg2], color);
						break;
					case 0xD4:
						switch(op2 & 0xf0){
							case 0x00:
								// DRWIM R			D40R
								reg1 = op2 & 0xf;
								reg2 = reg[reg1];//регистр указывает на участок памяти, в котором расположены последовательно h, w, y, x, адрес
								if(imageSize > 1)
									drawImageS(readInt(reg2 + 8), readInt(reg2 + 6), readInt(reg2 + 4), readInt(reg2 + 2), readInt(reg2));
								else
									drawImage(readInt(reg2 + 8), readInt(reg2 + 6), readInt(reg2 + 4), readInt(reg2 + 2), readInt(reg2));
								break;
							case 0x10:
								// SFCLR R			D41R
								reg1 = op2 & 0xf;
								color = reg[reg1] & 0xf;
								break;
							case 0x20:
								// SBCLR R			D42R
								reg1 = op2 & 0xf;
								bgcolor = reg[reg1] & 0xf;
								break;
							case 0x30:
								// GFCLR R			D43R
								reg1 = op2 & 0xf;
								n = color;
								reg[reg1] = ToInt16(n);
								break;
							case 0x40:
								// GBCLR R			D44R
								reg1 = op2 & 0xf;
								n = bgcolor;
								reg[reg1] = ToInt16(n);
								break;
							case 0x50:
								// IMOPTS			D45R
								reg1 = op2 & 0xf;
								if (reg[reg1] & 31) imageSize = reg[reg1] & 31;
								espico.flipy = ((reg[reg1] & 0x80) ? 1 : 0);
								espico.flipx = ((reg[reg1] & 0x40) ? 1 : 0);
								break;
							case 0x60:
								// DLINE			D46R
								reg1 = op2 & 0xf;
								reg2 = reg[reg1];//регистр указывает на участок памяти, в котором расположены последовательно y1, x1, y, x
								drawLine(readInt(reg2 + 6), readInt(reg2 + 4), readInt(reg2 + 2), readInt(reg2));
								break;
							case 0x70:
								// DRWSPR R		D4 7R
								reg1 = op2 & 0xf;
								reg2 = reg[reg1];//регистр указывает на участок памяти, в котором расположены последовательно h, w, y, x, адрес
								drawSprite(readInt(reg2 + 8), readInt(reg2 + 6), readInt(reg2 + 4), readInt(reg2 + 2), readInt(reg2));
								break;
							case 0x80:
								// SMAPXY R		D4 8R
								reg1 = op2 & 0xf;
								reg2 = reg[reg1];//регистр указывает на участок памяти, в котором расположены последовательно height, width, iheight, iwidth, adr
								setTile(readInt(reg2 + 4), readInt(reg2 + 2), readInt(reg2));
								break;
							case 0x90:
								// ACTDS R*2	D4 9R
								reg1 = op2 & 0xf;
								reg2 = reg[reg1];//регистр указывает на участок памяти, в котором расположены последовательно direction, speed, n
								actorSetDirectionAndSpeed(readInt(reg2 + 4), readInt(reg2 + 2), readInt(reg2));
								break;
							case 0xA0:
								// DRW1BIT R	D4AR
								reg1 = op2 & 0xf;
								reg2 = reg[reg1];//регистр указывает на участок памяти, в котором расположены последовательно h, w, y, x, адрес
								if(imageSize > 1)
									drawImage1bitS(readInt(reg2 + 8), readInt(reg2 + 6), readInt(reg2 + 4), readInt(reg2 + 2), readInt(reg2));
								else
									drawImage1bit(readInt(reg2 + 8), readInt(reg2 + 6), readInt(reg2 + 4), readInt(reg2 + 2), readInt(reg2));
								break;
                           			        case 0xB0:
				               		        // DRWMAP R   D4 BR
          						        reg1 = op2 & 0xf;
           							reg2 = reg[reg1]; // stack adr, for layer, celh, celw, y0, x0, cely, celx 
        							drawTileMap(readInt(reg2 + 12), readInt(reg2 + 10), readInt(reg2 + 8), readInt(reg2 + 6), readInt(reg2 + 4), readInt(reg2 + 2), readInt(reg2));
          						        break;
    						        case 0xC0:
      							        // MVACT R    D4 CR
						                reg1 = op2 & 0xf;
						                moveActor(reg[reg1]);
						                break;
						        case 0xD0:
						                // DRWACT R    D4 DR
						                reg1 = op2 & 0xf;
						                drawActor(reg[reg1]);
						                break;
    						        case 0xE0:
						                // TACTC R    D4 ER
						                reg1 = op2 & 0xf;
						                testActorCollision();
						                break;
	     					        case 0xF0:
					        	        // TACTM R    D4 FR
         						     	reg1 = op2 & 0xf;
              							reg2 = reg[reg1];
						       		testActorMap(readInt(reg2 + 12), readInt(reg2 + 10), readInt(reg2 + 8), readInt(reg2 + 6), readInt(reg2 + 4), readInt(reg2 + 2), readInt(reg2));
 				        	        	break;
						
						}
						break;
					case 0xD5:
						// FSET R,R   D5RR
						// FGET R     D50R
						reg1 = (op2 & 0xf0) >> 4; //sprite
						reg2 = op2 & 0xf; // flag
						if (reg1 == 0) {
							n = getSpriteFlag(reg[reg2]);
							reg[reg2] = ToInt16(n);
						}
						else setSpriteFlag(reg[reg1], reg[reg2]);
						break;
					case 0xD6:
                                                if (op2 == 0x00) {
						// RPALET 		D6 00
                                                  display.resetPalette();
                                                } else {
						// SPALET R,R		D6 RR
						  reg1 = (op2 & 0xf0) >> 4;//номер цвета
						  reg2 = op2 & 0xf;//новый цвет
						  if (reg1 == 0) {  // PALT D6 0R
							setPalT(reg[reg2]);
						  } else {
							display.changePalette(reg[reg1] & 15, reg[reg2]);
						  }
                                                }
						break;
					case 0xD7:
						reg1 = op2 & 0xf;
						reg2 = reg[reg1];
						if((op2 & 0xf0) == 0)
							// SPART R 		D7 0R
							setParticleTime(readInt(reg2 + 2), readInt(reg2));
						else if((op2 & 0xf0) == 0x10)
							setEmitter(readInt(reg2 + 6), readInt(reg2 + 4), readInt(reg2 + 2), readInt(reg2));
						else if((op2 & 0xf0) == 0x20)
							// DPART R 		D7 2R
							drawParticles(readInt(reg2 + 8), readInt(reg2 + 6), readInt(reg2 + 4), readInt(reg2 + 2), readInt(reg2));
						else if((op2 & 0xf0) == 0x50) {
							n = distancepp(readInt(reg2 + 6), readInt(reg2 + 4), readInt(reg2 + 2), readInt(reg2));
							reg[reg1] = ToInt16(n);
						} else if((op2 & 0xf0) == 0x60)
							animateParticles();
						else if((op2 & 0xf0) == 0x70) {
							// MPARTC R 		D7 7R
							n = makeParticleColor(readInt(reg2 + 6), readInt(reg2 + 4), readInt(reg2 + 2), readInt(reg2));
							reg[reg1] = ToInt16(n);
						}
						break;
					case 0xD8:
						// SCROLL R,R		D8RR  disabled in espico
						reg1 = (op2 & 0xf0) >> 4;//шаг, доделать
						reg2 = op2 & 0xf;//направление
						// /scrollScreen(1, reg[reg2]);
						// if(reg[reg2] == 0 || reg[reg2] == 2)
						// 	scrollScreen(1, reg[reg2]);
						break;
					case 0xD9:
						// GETPIX R,R		D9RR
						reg1 = (op2 & 0xf0) >> 4;//x
						reg2 = op2 & 0xf;//y
						n = getPixel(reg[reg1], reg[reg2]);
						reg[reg1] = ToInt16(n);
						break;
					case 0xDA:
						// ATAN2 R,R		DA RR
						reg1 = (op2 & 0xf0) >> 4;//x
						reg2 = op2 & 0xf;//y
						n = Math.floor(Math.atan2(fromInt16(reg[reg1]), fromInt16(reg[reg2])) * 57.4);
						reg[reg1] = ToInt16(n);
						break;
					case 0xDB:
						// GACTXY R,R		DB RR
						reg1 = (op2 & 0xf0) >> 4;//num
						reg2 = op2 & 0xf;//speed y
                                                n = getActorInXY(reg[reg1],reg[reg2]);
                                                reg[reg1] = ToInt16(n);
						break;
					case 0xDC:
						// ACTGET R,R		DC RR
						reg1 = (op2 & 0xf0) >> 4;//num
						reg2 = op2 & 0xf;//type
						if(reg[reg2] == 0)
							n = actors[reg[reg1] & 31].x;
						else if(reg[reg2] == 1)
							n = actors[reg[reg1] & 31].y;
						else if(reg[reg2] == 2)
							n = actors[reg[reg1] & 31].speedx;
						else if(reg[reg2] == 3)
							n = actors[reg[reg1] & 31].speedy;
						else if(reg[reg2] == 4)
							n = actors[reg[reg1] & 31].hw;
						else if(reg[reg2] == 5)
							n = actors[reg[reg1] & 31].hh;
						else if(reg[reg2] == 6)
							n = actors[reg[reg1] & 31].angle & 0x01FF;
						else if(reg[reg2] == 7)
							n = actors[reg[reg1] & 31].lives;
						else if(reg[reg2] == 8)
							n = actors[reg[reg1] & 31].refval;
						else if(reg[reg2] == 9)
							n = actors[reg[reg1] & 31].flags;
						else if(reg[reg2] == 10)
							n = actors[reg[reg1] & 31].gravity;
						else if(reg[reg2] == 15)
							n = actors[reg[reg1] & 31].sprite;
						else if(reg[reg2] == 16)
							n = actors[reg[reg1] & 31].frame;
						else if(reg[reg2] == 17)
							n = actors[reg[reg1] & 31].sw;
						else if(reg[reg2] == 18)
							n = actors[reg[reg1] & 31].sh;
						else n = 0;
						reg[reg1] = ToInt16(n);
						break;
					case 0xDE:
						// AGBACT R,R			DE RR
						reg1 = (op2 & 0xf0) >> 4;//n1
						reg2 = op2 & 0xf;//n2
						n = angleBetweenActors(reg[reg1], reg[reg2]);
						reg[reg1] = ToInt16(n);
						break;
					case 0xDF:
						// GMAPXY R,R			DF RR
						reg1 = (op2 & 0xf0) >> 4;
						reg2 = op2 & 0xf;
						n = getTile(reg[reg1], reg[reg2]);
						reg[reg1] = ToInt16(n);
						break;
				}
				break;
			case 0xE0:
				// SOUND
				switch (op1) {
                        	case 0xE0:
                                	switch (op2) {
                                       	// PLAYRT               E000
                                	case 0x00:
                                       		rtttl.play = 1;
                                       		break;
                                       	// PAUSERT              E001
                                	case 0x01:
                                       		rtttl.play = 0;
                                       		break;
                                       	// STOPRT               E002
                                	case 0x02:
                                       		rtttl.play = 0;
                                       		rtttl.position = 0;
                                       		break;
                                	}
                                	break;
				case 0xE1:
                                	// LOADRT               E10R
                                	reg1 = (op2 & 0xf0) >> 4;
                                	reg2 = op2 & 0xf;
                                	rtttl.address = reg[reg1];
                                	rtttl.loop = reg[reg2];
                                	loadRtttl();
                                	break;
                        	case 0xE2:
                                	// PLAYTN               E20R
                                	reg1 = (op2 & 0xf0) >> 4;
                                	reg2 = op2 & 0xf;
                                	addTone(reg[reg1], reg[reg2]);
                                	break;
				}
				break;
			case 0xF0:
				// ACTSET R,R,R	FR RR
				reg1 = (op1 & 0xf);//номер спрайта
				reg2 = (op2 & 0xf0) >> 4;//type
				reg3 = op2 & 0xf;//value
				if(reg[reg2] == 0xffff)
					resetActor(reg[reg1]);
				else if(reg[reg2] == 0){
					actors[reg[reg1] & 31].x = fromInt16(reg[reg3]);
				}
				else if(reg[reg2] == 1){
					actors[reg[reg1] & 31].y = fromInt16(reg[reg3]);
				}
				else if(reg[reg2] == 2){
					actors[reg[reg1] & 31].speedx = fromInt16(reg[reg3]);
				}
				else if(reg[reg2] == 3){
					actors[reg[reg1] & 31].speedy = fromInt16(reg[reg3]);
				}
				else if(reg[reg2] == 4)
					actors[reg[reg1] & 31].hw = reg[reg3];
				else if(reg[reg2] == 5)
					actors[reg[reg1] & 31].hh = reg[reg3];
				else if(reg[reg2] == 6) {
					var v = fromInt16(reg[reg3]) % 360;
					actors[reg[reg1] & 31].angle = (v < 0) ? v + 360 : v;
				}
				else if(reg[reg2] == 7){
					if(reg[reg3] > 128)
						actors[reg[reg1] & 31].lives = -(256 - (reg[reg3] & 0xff));
					else
						actors[reg[reg1] & 31].lives = reg[reg3];
				}
				else if(reg[reg2] == 9)
					actors[reg[reg1] & 31].flags = reg[reg3];
				else if(reg[reg2] == 10)
					actors[reg[reg1] & 31].gravity = reg[reg3] & 0x7f;
				else if(reg[reg2] == 11)
					actors[reg[reg1] & 31].oncollision = reg[reg3];
				//else if(reg[reg2] == 12)
				//	actors[reg[reg1] & 31].onexitscreen = reg[reg3];
				else if(reg[reg2] == 13)
					actors[reg[reg1] & 31].onanimate = reg[reg3];
				else if(reg[reg2] == 8)
					actors[reg[reg1] & 31].refval = reg[reg3];
				else if(reg[reg2] == 15)
					actors[reg[reg1] & 31].sprite = (reg[reg3] < SPRITE_COUNT) ? reg[reg3] : 0;
				else if(reg[reg2] == 16)
					actors[reg[reg1] & 31].frame = reg[reg3];
				else if(reg[reg2] == 17)
					actors[reg[reg1] & 31].sw = (reg[reg3] < 128) ? reg[reg3] : 128;
				else if(reg[reg2] == 18)
					actors[reg[reg1] & 31].sh = (reg[reg3] < 128) ? reg[reg3] : 128;
					break;
		}
	}
	
	function debug(){
		var d = '';
		var s = 'pc:' + toHex4(pc) + '\t';
		s += 'op:' + toHex4((mem[pc] << 8) + mem[pc + 1]);
		if (interrupt != 0) s+= '\t' + 'int:' + toHex4(interrupt);
		s += '\n';
		s += 'C' + ((n > 0xffff) ? 1 : 0) + 'Z' + ((n == 0) ? 1 : 0) + 'N' + (((n & 0xffff) > 0x7fff) ? 1 : 0) + '\n';
		for(var i = 0; i < 16; i++)
			s += 'R' + i + ':' + toHex4(reg[i]) + ' (' + reg[i] + ')\n';
		for(var i = 0; i < debugVar.length; i++){
			d += debugVar[i].variable + '\t';
			d += toHex4(debugVar[i].adress) + '   ';
			d += readInt(debugVar[i].adress) + '\n';
		}
		debugVarArea.value = d;
		viewMemory();
		for(var i = 0; i < numberDebugString.length; i++)
			if(numberDebugString[i][2] == pc){
				thisDebugString = numberDebugString[i][1];
			}
		d = '';
		for(var i = 0; i < 32; i++){
			d += '\nactor ' + i + '\n';
			d += 'A_SPRITE \t' + actors[i].sprite + '\n';
			d += 'A_FRAME \t' + actors[i].frame + '\n';
			d += 'A_FLAGS \t' + toHex4(actors[i].flags) + '\n';
			d += 'A_X \t' + actors[i].x + '\n';
			d += 'A_Y \t' + actors[i].y + '\n';
			d += 'A_SPEEDX \t' + actors[i].speedx + '\n';
			d += 'A_SPEEDY \t' + actors[i].speedy + '\n';
			d += 'A_WIDTH \t' + actors[i].hw + '\n';
			d += 'A_HEIGHT \t' + actors[i].hh + '\n';
			d += 'A_REFVAL \t' + actors[i].refval + '\n';
			d += 'A_ANGLE \t' + actors[i].angle + '\n';
			d += 'A_LIVES \t' + actors[i].lives + '\n';
		}
		debugSprArea.value = d;
		highliteLine();
		return s;
	}
	
	return {
		init:init,
		load:load,
		loadHex:loadHex,
		exportHex:exportHex,
		step:step,
		debug:debug,
		readMem:readMem,
		getRedrawPix:getRedrawPix,
		setRedraw:setRedraw,
		getEspicoState:getEspicoState,
		setEspicoState:setEspicoState,
		setPalT:setPalT
	};
}

var cpu = new Cpu;
cpu.init();
