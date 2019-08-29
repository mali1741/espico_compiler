char b[] = {0xdd,0xdd};
int map[] ={
	b,b,b,b,b,b,b,b,
	b,0,0,b,0,0,b,b,
	b,b,0,b,0,0,b,b,
	b,0,0,0,0,0,0,b,
	b,0,0,0,b,b,b,b,
	b,0,0,0,0,0,0,b,
	b,b,b,b,b,b,b,b
}

int x,y,x1,y1,prevx,prevy,angle,a,i,d,h,top,key;

int colors[] = {4,11,9,12,15,1,3};
int sintable[] = {0, 4, 8, 13, 17, 22, 26, 31, 35, 40, 44, 48, 53, 57, 61, 66, 70, 74, 79, 83, 87, 91, 95, 100, 104, 108, 112, 116, 120, 124, 127, 131, 135, 139, 143, 146, 150, 154, 157, 161, 164, 167, 171, 174, 177, 181, 184, 187, 190, 193, 196, 198, 201, 204, 207, 209, 212, 214, 217, 219, 221, 223, 226, 228, 230, 232, 233, 235, 237, 238, 240, 242, 243, 244, 246, 247, 248, 249, 250, 251, 252, 252, 253, 254, 254, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 254, 254, 253, 252, 252, 251, 250, 249, 248, 247, 246, 244, 243, 242, 240, 239, 237, 235, 233, 232, 230, 228, 226, 223, 221, 219, 217, 214, 212, 209, 207, 204, 201, 198, 196, 193, 190, 187, 184, 181, 177, 174, 171, 167, 164, 161, 157, 154, 150, 146, 143, 139, 135, 131, 128, 124, 120, 116, 112, 108, 104, 100, 95, 91, 87, 83, 79, 74, 70, 66, 61, 57, 53, 48, 44, 40, 35, 31, 26, 22, 17, 13, 8, 4, 0, -5, -9, -14, -18, -23, -27, -32, -36, -40, -45, -49, -54, -58, -62, -67, -71, -75, -80, -84, -88, -92, -96, -100, -105, -109, -113, -117, -121, -125, -128, -132, -136, -140, -144, -147, -151, -155, -158, -162, -165, -168, -172, -175, -178, -181, -185, -188, -191, -194, -197, -199, -202, -205, -208, -210, -213, -215, -218, -220, -222, -224, -226, -229, -231, -232, -234, -236, -238, -239, -241, -243, -244, -245, -247, -248, -249, -250, -251, -252, -253, -253, -254, -255, -255, -256, -256, -256, -256, -256, -256, -256, -256, -256, -256, -256, -255, -255, -254, -253, -253, -252, -251, -250, -249, -248, -247, -245, -244, -243, -241, -240, -238, -236, -234, -233, -231, -229, -227, -224, -222, -220, -218, -215, -213, -210, -208, -205, -202, -200, -197, -194, -191, -188, -185, -182, -178, -175, -172, -169, -165, -162, -158, -155, -151, -147, -144, -140, -136, -132, -129, -125, -121, -117, -113, -109, -105, -101, -97, -92, -88, -84, -80, -75, -71, -67, -63, -58, -54, -49, -45, -41, -36, -32, -27, -23, -18, -14, -10, -5};
int costable[] = {256, 255, 255, 255, 255, 255, 254, 254, 253, 252, 252, 251, 250, 249, 248, 247, 246, 244, 243, 242, 240, 238, 237, 235, 233, 232, 230, 228, 226, 223, 221, 219, 217, 214, 212, 209, 207, 204, 201, 198, 196, 193, 190, 187, 184, 181, 177, 174, 171, 167, 164, 161, 157, 154, 150, 146, 143, 139, 135, 131, 128, 124, 120, 116, 112, 108, 104, 100, 95, 91, 87, 83, 79, 74, 70, 66, 61, 57, 53, 48, 44, 40, 35, 31, 26, 22, 17, 13, 8, 4, 0, -5, -9, -14, -18, -23, -27, -32, -36, -41, -45, -49, -54, -58, -62, -67, -71, -75, -80, -84, -88, -92, -96, -100, -105, -109, -113, -117, -121, -125, -128, -132, -136, -140, -144, -147, -151, -155, -158, -162, -165, -168, -172, -175, -178, -181, -185, -188, -191, -194, -197, -199, -202, -205, -208, -210, -213, -215, -218, -220, -222, -224, -227, -229, -231, -232, -234, -236, -238, -239, -241, -243, -244, -245, -247, -248, -249, -250, -251, -252, -253, -253, -254, -255, -255, -256, -256, -256, -256, -256, -256, -256, -256, -256, -256, -256, -255, -255, -254, -253, -253, -252, -251, -250, -249, -248, -247, -245, -244, -243, -241, -240, -238, -236, -234, -233, -231, -229, -227, -224, -222, -220, -218, -215, -213, -210, -208, -205, -202, -199, -197, -194, -191, -188, -185, -182, -178, -175, -172, -169, -165, -162, -158, -155, -151, -147, -144, -140, -136, -132, -129, -125, -121, -117, -113, -109, -105, -101, -96, -92, -88, -84, -80, -75, -71, -67, -63, -58, -54, -49, -45, -41, -36, -32, -27, -23, -18, -14, -10, -5, -1, 4, 8, 13, 17, 22, 26, 31, 35, 39, 44, 48, 53, 57, 61, 66, 70, 74, 79, 83, 87, 91, 95, 99, 104, 108, 112, 116, 120, 124, 127, 131, 135, 139, 143, 146, 150, 153, 157, 161, 164, 167, 171, 174, 177, 180, 184, 187, 190, 193, 196, 198, 201, 204, 207, 209, 212, 214, 217, 219, 221, 223, 225, 228, 230, 231, 233, 235, 237, 238, 240, 242, 243, 244, 246, 247, 248, 249, 250, 251, 252, 252, 253, 254, 254, 255, 255, 255, 255, 255};
//char rcos[] = {256,255,255,255,255,255,254,254,253,252,252,251,250,249,248,247,246,244,243,242,240,238,237,235,233,232,230,228,226,223,221,219,217,219,221,223,226,228,230,232,233,235,237,238,240,242,243,244,246,247,248,249,250,251,252,252,253,254,254,255,255,255,255,255,256};
char rcos[] = {256,255,255,255,255,255,254,254,253,252,252,251,250,249,248,247,246,247,248,249,250,251,252,252,253,254,254,255,255,255,255,255,256};
char cast(int ang){
	int i;
	ang = ang % 360;
	for(i = 0; i < 18; i++){
		x1 = x + (i*costable[ang])/64;
  	y1 = y + (i*sintable[ang])/64;
  	if(map[x1/16+y1/16*8] != 0){
			return 1;
		}
	}
	return 0;
}

void main(){
	x = 50;
	y = 70;
	angle = 90;
	loadtile(map, 2,2,8,7);
	drawtile(0,90);
	while(1){
		delayredraw();
		for(i = 0; i < 64; i++){
			if(i == 40)
				delayredraw();
			setcolor(0);
			line(i*2, 0, i*2, 64);
			line(i*2+1, 0, i*2+1, 64);
			cast(angle+i);
			d = distance(x, y, x1, y1);
				if(d < 64){
					gotoxy(4,13);
					setcolor(2);
					a = rcos[i/2];
					h = 64-d;
					setcolor(colors[h/12]);
					h = ((64 - d) * a)/256);
					top = (64-h)/2;
					line(i*2, top, i*2, h + top);
					line(i*2+1, top, i*2+1, h + top);
				}
		}
		key = getkey();
		if(key == KEY_UP){
			prevx = x;
			prevy = y;
			a = (angle + 32) % 360;
			x = x + (costable[a])/64;
			y = y + (sintable[a])/64;
			if(map[x/16+y/16*8] != 0){
				x = prevx;
				y = prevy;
			}
		}
		if(key == KEY_DOWN){
			prevx = x;
			prevy = y;
			a = (angle + 32) % 360;
			x = x - (costable[a])/64;
			y = y - (sintable[a])/64;
			if(map[x/16+y/16*8] != 0){
				x = prevx;
				y = prevy;
			}
		}
		if(key == KEY_LEFT)
			angle-=16;
		if(key == KEY_RIGHT)
			angle+=16;
		if(angle >= 360)
			angle = 0;
		if(angle < 0)
			angle = 359;
		setcolor(0);
		putpixel(prevx/8,prevy/8 + 90);
		setcolor(2);
		putpixel(x/8,y/8 + 90);
		gotoxy(4,12);
		printf("a%d, x%d, y%d ", angle, x, y);
	}
}					
					
					