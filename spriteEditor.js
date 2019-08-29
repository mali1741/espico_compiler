"use strict";

var mousedown;

function SpriteEditor(){
	var data = [];
	var thiscolor = 0;
	var pixelareabgcolor = 0;
	var sprite = [];
	var spriteflags = [];
	var pixelarea = document.getElementById("pixelearea");
	var pixelareactx = pixelarea.getContext('2d');
	var lastx = 0, lasty = 0, lastselect = -1;
	var type = 0, spritesel = -1;
	const SHEET_HEIGHT = 64;
	const SHEET_WIDTH = 128;
	
	function setType(n){
		if(n == 1) {
			type = 1;
		} else if(n == 0) {
			type = 0;
		} else {
			type = 2;
		}
	}

	function flipSpriteFlag(n,state) {
		if (spritesel != -1) {
		  var mask = (~(1 << n)) & 0xFF;
		  spriteflags[spritesel] &= mask;
		  if (state) {
			 spriteflags[spritesel] |= (1 << n);
		  }
		  document.getElementById("spriteFlags").innerHTML = 'flags: 0x' + spriteflags[spritesel].toString(16);
		}
	}
	
	function scroll(direction){
		var bufPixel;
		data = [];
		if(direction == 2){
			for(var y = 0; y < 16; y++){
				bufPixel = sprite[0][ y];
				for(var x = 1; x < 16; x++)
					sprite[x - 1][ y] = sprite[x][ y];
				sprite[15][ y] = bufPixel;
			}
		}
		else if(direction == 1){
			for(var x = 0; x < 16; x++){
				bufPixel = sprite[x][ 0];
				for(var y = 1; y < 16; y++)
					sprite[x][ y - 1] = sprite[x][ y];
				sprite[x][ 15] = bufPixel;
			}
		}
		else if(direction == 0){
			for(var y = 0; y < 16; y++){
				bufPixel = sprite[15][ y];
				for(var x = 15; x > 0; x--)
					sprite[x][ y] = sprite[x - 1][ y];
				sprite[0][ y] = bufPixel;
			}
		}
		else {
			for(var x = 0; x < 16; x++){
				bufPixel = sprite[x][ 15];
				for(var y = 15; y > 0; y--)
					sprite[x][ y] = sprite[x][ y - 1];
				sprite[x][ 0] = bufPixel;
			}
		}
		for(var i = 0; i <= 15; i++)
			for(var j = 0; j <= 15; j++){
				pixelareactx.fillStyle = epalette[sprite[i][j]];
				pixelareactx.fillRect(i, j, 1, 1);					
			}
		updateText();
	}

        function loadHex(txt, match_section){
                var i = 0;
                var hex = [];
                var bytes_read = 0;
                var section = "none";
		var store = 0;
                var max_bytes = 0;
                var new_line = 1;
                if (match_section) {
                        i = txt.indexOf("__"+match_section+"__");
                        if (i == -1) {
                                // no such section
                                return;
                        }
                }
                while (i+1 < txt.length) {
                        while (txt[i] === '\n') i++;
                        if (txt[i] == '_' && txt[i+1] == '_') {
                                if (bytes_read > 0) {
					info("sprite editor read "+bytes_read+" to section "+section);
                                        // report bytes read
                                        if (match_section) return; // only read one section
                                }
                                // new section
                                if (txt.slice(i,i+7) === "__gfx__") {
                                        section = "gfx";
                                        store = 0;
                                        max_bytes = 4096;
                                        bytes_read = 0;
					// data = [];
					// pixelareactx.clearRect(0,0,128,64);
                                } else if (txt.slice(i,i+7) === "__gff__") {
                                        section = "gff";
                                        store = SPRITE_FLAGS_MEMMAP;
                                        max_bytes = 256;
                                        bytes_read = 0;
                                } else if (txt.slice(i,i+7) === "__map__") {
                                        section = "map";
                                        store = TILEMAP_MEMMAP;
                                        max_bytes = 4096;
                                        bytes_read = 0;
                                } else {
                                        section = "none";
                                        store = 0;
                                        max_bytes = 0;
                                        bytes_read = 0;
                                }
                                i += 7;
                        } else if (bytes_read < max_bytes) {
				if (section === "gfx") {
					sprite[store%128][Math.floor(store/128)] = hextoval(txt[i]);
					pixelareactx.fillStyle = epalette[hextoval(txt[i])];
					pixelareactx.fillRect(store%128, Math.floor(store/128), 1, 1);
					store++;
					sprite[store%128][Math.floor(store/128)] = hextoval(txt[i+1]);
					pixelareactx.fillStyle = epalette[hextoval(txt[i+1])];
					pixelareactx.fillRect(store%128, Math.floor(store/128), 1, 1);
					store++;
                                	// data.push(hextobyte(txt[i], txt[i+1]));
				}
                                bytes_read++;
                                i += 2;
                        } else {
                                i++;
                        }
                }
                if (bytes_read > 0){
			info("sprite editor read "+bytes_read+" to section "+section);
                        // report bytes read and section
                }
		// updateText();
        }
	
	function exportHex(section) {
		if (section === "gfx") {
			var gfxdata = []
			for(var i = 0; i < SHEET_HEIGHT; i++){
                                for(var j = 0; j < SHEET_WIDTH; j++){
                                                gfxdata.push(((sprite[j][i] & 0xf) << 4) + (sprite[++j][i] & 0xf));
				}          
                        }
			return toHexE(gfxdata,section,64);
		}
		return "";
	}
	
	function init(){
		pixelareactx.fillStyle = "#000000";
		pixelareactx.fillRect(0, 0, SHEET_WIDTH, SHEET_HEIGHT+1);	
		thiscolor = 0;
		document.getElementById("selectColor").style.background = epalette[thiscolor];
		for(var i = 0; i<SHEET_WIDTH; i++){
			pixelareactx.fillStyle = epalette[i%16];
			pixelareactx.fillRect(i, SHEET_HEIGHT, 1, 1);
			sprite[i] = [];
			for(var j = 0; j<SHEET_HEIGHT; j++){
				sprite[i][j] = 0;
			}
		}
		for(var f = 0; f < 256; f++) spriteflags[f] = 0;
		pixelareactx.fillStyle = "#000000";
		pixelarea.addEventListener('mousedown', function (e) {
			mousedown = 1;
			setPixel(e);
		});
		pixelarea.addEventListener('mouseup', function (e) {
			mousedown = 0;
		});
		pixelarea.addEventListener('mouseout', function (e) {
			mousedown = 0;
		});
		pixelarea.addEventListener('mousemove', function (e) {
			setPixel(e);
		});
	}
	
	function setPixel(e){
		var rect = pixelarea.getBoundingClientRect();
		var x = Math.floor((e.offsetX==undefined?e.layerX:e.offsetX)/(rect.width/SHEET_WIDTH));
		var y = Math.floor((e.offsetY==undefined?e.layerY:e.offsetY)/(rect.height/(SHEET_HEIGHT+1)));
		if(mousedown){
			data = [];
			if(y == SHEET_HEIGHT){
				thiscolor = x%16;
				pixelareactx.fillStyle = epalette[x%16];
				document.getElementById("selectColor").style.background = epalette[x%16];
			}
			else{
				if(type == 0){
					pixelareactx.fillRect(x, y, 1, 1);
					sprite[x][y] = thiscolor;	
				} else if(type == 1) {
					pixelareactx.fillStyle = epalette[thiscolor];
					if(sprite[x][y] != thiscolor)
						fillPixels(x, y, sprite[x][y], thiscolor);
				} else {
					spritesel = Math.floor(x/8)+Math.floor(y/8)*16;
					if (lastselect != -1) {
						var lastsprx = (lastselect%16)*8;
						var lastspry = (lastselect >> 4)*8;;
						for(var lsx = 0; lsx < 8; lsx++)
						  for(var lsy = 0; lsy < 8; lsy++) {
						    pixelareactx.fillStyle = epalette[sprite[lastsprx+lsx][lastspry+lsy]];
						    pixelareactx.fillRect(lastsprx+lsx, lastspry+lsy, 1, 1);
						  }
						if (lastselect == spritesel) spritesel = -1;
					}
					if (spritesel != -1) {	
				 	  pixelareactx.fillStyle = 'rgba(105,255,180,0.5)';
					  pixelareactx.fillRect((spritesel%16)*8, Math.floor(spritesel/16)*8, 8, 8);
					}
					lastselect = spritesel;
				}
			}
			var spritewidth = 0;
			var spriteheight = 0; 
			for(var i = 0; i < SHEET_WIDTH; i++){
				for(var j = 0; j < SHEET_HEIGHT; j++){
					if(sprite[i][j] != pixelareabgcolor){
						if(i > spritewidth)
							spritewidth = i;
						if(j > spriteheight)
							spriteheight = j;
					}
				}
			}
			for(i = 0; i <= spriteheight; i++)
				for(j = 0; j <= spritewidth; j++){
						data.push(((sprite[j][i] & 0xf) << 4) + (sprite[++j][i] & 0xf));					
				}
			updateText();
			spriteheight++;
			spritewidth++;
			document.getElementById("spriteInfo").innerHTML = spritewidth + 'x' + spriteheight + ' selected: ' + spritesel;
			if (spritesel == -1) {
				document.getElementById("spriteFlags").innerHTML = 'No flags';
				document.getElementById("spriteFlag7").checked = false;
				document.getElementById("spriteFlag6").checked = false;
				document.getElementById("spriteFlag5").checked = false;
				document.getElementById("spriteFlag4").checked = false;
				document.getElementById("spriteFlag3").checked = false;
				document.getElementById("spriteFlag2").checked = false;
				document.getElementById("spriteFlag1").checked = false;
				document.getElementById("spriteFlag0").checked = false;
			} else {
				document.getElementById("spriteFlags").innerHTML = 'flags: 0x' + spriteflags[spritesel].toString(16);
				if (spriteflags[spritesel] & (1 << 7)) {
					document.getElementById("spriteFlag7").checked = true;
				} else {
					document.getElementById("spriteFlag7").checked = false;
				}
				if (spriteflags[spritesel] & (1 << 6)) {
					document.getElementById("spriteFlag6").checked = true;
				} else {
					document.getElementById("spriteFlag6").checked = false;
				}
				if (spriteflags[spritesel] & (1 << 5)) {
					document.getElementById("spriteFlag5").checked = true;
				} else {
					document.getElementById("spriteFlag5").checked = false;
				}
				if (spriteflags[spritesel] & (1 << 4)) {
					document.getElementById("spriteFlag4").checked = true;
				} else {
					document.getElementById("spriteFlag4").checked = false;
				}
				if (spriteflags[spritesel] & (1 << 3)) {
					document.getElementById("spriteFlag3").checked = true;
				} else {
					document.getElementById("spriteFlag3").checked = false;
				}
				if (spriteflags[spritesel] & (1 << 2)) {
					document.getElementById("spriteFlag2").checked = true;
				} else {
					document.getElementById("spriteFlag2").checked = false;
				}
				if (spriteflags[spritesel] & (1 << 1)) {
					document.getElementById("spriteFlag1").checked = true;
				} else {
					document.getElementById("spriteFlag1").checked = false;
				}
				if (spriteflags[spritesel] & (1 << 0)) {
					document.getElementById("spriteFlag0").checked = true;
				} else {
					document.getElementById("spriteFlag0").checked = false;
				}
			}
		}
		if(x >=0 && x < SHEET_WIDTH && y >=0 && y < SHEET_HEIGHT){	
			if(x != lastx || y != lasty){
				pixelareactx.fillStyle = epalette[sprite[lastx][lasty]];
				pixelareactx.fillRect(lastx, lasty, 1, 1);
				lastx = x;
				lasty = y;
				pixelareactx.fillStyle = 'rgba(255,105,180,0.5)';
				pixelareactx.fillRect(x, y, 1, 1);
			}
		}
		else{
			pixelareactx.fillStyle = epalette[sprite[lastx][lasty]];
			pixelareactx.fillRect(lastx, lasty, 1, 1);
		}
	}
	
	function fillPixels(x, y, color, changecolor){
		if(x >=0 && x < SHEET_WIDTH && y >=0 && y < SHEET_HEIGHT){
			pixelareactx.fillRect(x, y, 1, 1);
			sprite[x][y] = changecolor;
			if(x > 0 && sprite[x - 1][y] == color)
				fillPixels(x - 1, y, color, changecolor);
			if(x < SHEET_WIDTH-1 && sprite[x + 1][y] == color)
				fillPixels(x + 1, y, color, changecolor);
			if(y > 0 && sprite[x][y - 1] == color)
				fillPixels(x, y - 1, color, changecolor);
			if(y < SHEET_HEIGHT-1 && sprite[x][y + 1] == color)
				fillPixels(x, y + 1, color, changecolor);
		}
	}
	
	function updateText(){
		var i;
		var spr = '{';
			// for(i = 0; i < data.length; i++)
			//	spr +='0x' + data[i].toString(16) + ',';
			spr += toHexA(data);
			// spr = spr.substring(0, spr.length - 1)
			spr += '};';
		document.getElementById("spriteArea").value = spr;
	}
	
	function edit(){
		var d = document.getElementById("div_wind2");
		d.style.display = "block";
		d.style.left = window.innerWidth/4 + 'px';
		d.style.top = "3em";
	}

	function selectAll(){
		document.getElementById("spriteArea").focus();
		document.getElementById("spriteArea").select();
	}

	function pAreaAllowDrop(ev){
		ev.preventDefault();
	}

	function clear(){
		pixelareactx.fillStyle = epalette[0];
		pixelareactx.fillRect(0, 0, SHEET_WIDTH, SHEET_HEIGHT);
		document.getElementById("selectColor").style.background = epalette[thiscolor];
		for(var i = 0; i<SHEET_WIDTH; i++){
			pixelareactx.fillStyle = epalette[i%16];
			pixelareactx.fillRect(i, SHEET_HEIGHT, 1, 1);
			sprite[i] = [];
			for(var j = 0; j<SHEET_HEIGHT; j++){
				sprite[i][j] = 0;
			}
		}
		pixelareactx.fillStyle = epalette[pixelareabgcolor];	
	}
	
	return {
		flipSpriteFlag:flipSpriteFlag,
		setType:setType,
		init:init,
		edit:edit,
		clear:clear,
		fillPixels:fillPixels,
		selectAll:selectAll,
		scroll:scroll,
		loadHex:loadHex,
		exportHex:exportHex
	};
}
