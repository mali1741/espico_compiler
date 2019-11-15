int y;
char espico[] = {0x00,0x00,0x00, 0xE6,0xC9,0x80, 0xC8,0xA2,0x10, 0x82,0xCA,0x28, 0xEC,0x89,0x90};

void main(){
        fcol(5);
	palt(0);
        cls();
	
        for(y = 1; y < 12; y++){
	  img1bit(espico, 54, y, 24, 5);
          flip();
        }
        
        zoom(2);
	fcol(13);
        for(y = 12; y < 20; y++){
	  img1bit(espico, 43, y, 24, 5);
          flip();
        }
	
        zoom(3);
	fcol(6);
        for(y = 20; y < 28; y++){
          img1bit(espico, 32, y, 24, 5);
          flip();
        }

        zoom(4);
	fcol(7);
        img1bit(espico,22,y,24,5);
	flip();
	flip();
	flip();
        bcol(10);
	rectfill(94,40,97,43);
	flip();
	flip();
	flip();
        bcol(8);
	rectfill(98,36,101,39);
	flip();
	flip();
	flip();
        bcol(12);
	rectfill(102,40,105,43);
	flip();
	flip();
	flip();
        bcol(11);
	rectfill(98,44,101,47);
	for(y=0; y < 10; y++) flip();
	bcol(0);
	palt(1);
	cls();
}
