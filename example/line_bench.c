int i,time;

void main(){
while(1){
        cursor(37,50);
        print("PRESS ANY KEY");
        while(kget() == 0){};
                tmrset(0,30000);
                for (i = 1; i < 10000; i++){
                        fcol(rnd(15));
                        line(rnd(127),rnd(160),rnd(127),rnd(160));
                }
                time = 30000 - tmrget(0);
                cls();
                cursor(45,60);
                printn(time);
                print(" MS");
        }
}

