import numpy as np, subprocess, wave, math, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W,H,FPS=1280,720,24
DUR=28.0; N=int(DUR*FPS)
import os; HERE=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.join(HERE,"le_dernier_quai.mp4")
D=HERE+"/"
serif=lambda s: ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",s)
sans=lambda s: ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",s)
random.seed(3); rng=np.random.default_rng(3)
drops=[[random.uniform(0,W+300),random.uniform(0,H),random.uniform(18,34)] for _ in range(260)]
buildings=[]; x=-200
while x<W+200:
    w=random.randint(60,150); h=random.randint(150,420)
    wins=[(random.randint(6,w-16),random.randint(10,h-20)) for _ in range(random.randint(4,18))]
    buildings.append((x,w,h,wins)); x+=w+random.randint(0,10)

def clamp(v): return max(0,min(1,v))
def ease(t): return t*t*(3-2*t)

def sky(img,top,bot):
    a=np.linspace(0,1,H)[:,None,None]
    arr=(np.array(top)*(1-a)+np.array(bot)*a)*np.ones((H,W,3))
    img.paste(Image.fromarray(arr.astype(np.uint8)))

def rain(d,t,alpha=150):
    for dr in drops:
        x=(dr[0]-t*260)%(W+300)-150; y=(dr[1]+t*dr[2]*40)%H
        d.line([(x,y),(x-6,y+dr[2])],fill=(170,185,210,alpha),width=1)

def subtitle(d,text,a):
    if a<=0: return
    f=sans(30); bw=d.textlength(text,font=f)
    d.text(((W-bw)/2,H-140),text,font=f,fill=(240,235,220,int(255*a)),stroke_width=2,stroke_fill=(0,0,0,int(200*a)))

def frame(i):
    t=i/FPS
    img=Image.new("RGB",(W,H)); d=ImageDraw.Draw(img,"RGBA")
    if t<4:   # titre
        a=clamp(t/1.2)*clamp((4-t)/0.8)
        f=serif(72); s="LE DERNIER QUAI"; bw=d.textlength(s,font=f)
        d.text(((W-bw)/2,H/2-60),s,font=f,fill=(230,200,140,int(255*a)))
        f2=sans(24); s2="un court essai"; bw=d.textlength(s2,font=f2)
        d.text(((W-bw)/2,H/2+40),s2,font=f2,fill=(180,180,190,int(200*a)))
    elif t<11:  # plan large ville
        lt=t-4; z=1+0.08*ease(lt/7)
        sky(img,(8,10,28),(40,35,60))
        d.ellipse([950,90,1030,170],fill=(235,230,200))
        for (bx,bw_,bh,wins) in buildings:
            cx=W/2+(bx-W/2)*z; cw=bw_*z; ch=bh*z
            d.rectangle([cx,H-ch,cx+cw,H],fill=(14,14,22))
            for (wx,wy) in wins:
                on=(math.sin(wx*7+wy+lt*0.5)>-0.6)
                if on: d.rectangle([cx+wx*z,H-ch+wy*z,cx+wx*z+8*z,H-ch+wy*z+10*z],fill=(230,190,110,200))
        rain(d,t)
        subtitle(d,"Minuit. Il pleut sur la ville.",clamp((lt-1)/0.6)*clamp((6.5-lt)/0.5))
    elif t<18:  # quai, silhouette
        lt=t-11
        sky(img,(5,6,14),(22,22,34))
        d.rectangle([0,520,W,H],fill=(30,30,36))
        d.line([(0,520),(W,520)],fill=(200,170,60),width=6)
        for k in range(12): d.rectangle([k*120-((lt*4)%120),600,k*120+60-((lt*4)%120),612],fill=(50,45,40))
        flick=1.0 if (math.sin(lt*23)+math.sin(lt*7.3))>-1.2 else 0.25
        lx=760
        d.rectangle([lx-4,180,lx+4,520],fill=(20,20,24))
        for r in range(220,0,-20):
            d.ellipse([lx-r,200-r*0.4,lx+r,200+r*1.6],fill=(255,210,130,int(10*flick)))
        d.polygon([(lx-30,195),(lx+30,195),(lx+200,520),(lx-200,520)],fill=(255,210,130,int(35*flick)))
        d.ellipse([lx-14,186,lx+14,206],fill=(255,230,170,int(255*flick)))
        # silhouette
        sx=640; body=(6,6,8)
        d.ellipse([sx-18,330,sx+18,368],fill=body)
        d.polygon([(sx-26,370),(sx+26,370),(sx+40,470),(sx-40,470)],fill=body)
        d.rectangle([sx-22,470,sx-6,520],fill=body); d.rectangle([sx+6,470,sx+22,520],fill=body)
        d.polygon([(sx-34,328),(sx+34,328),(sx+20,318),(sx-20,318)],fill=body)  # chapeau
        rain(d,t,120)
        subtitle(d,"— Elle avait dit qu'elle viendrait...",clamp((lt-1.5)/0.6)*clamp((6.5-lt)/0.5))
    elif t<25:  # le train arrive
        lt=t-18; p=ease(clamp(lt/6.5))
        sky(img,(4,4,10),(18,18,26))
        vx,vy=W/2,330
        d.polygon([(0,H),(W,H),(vx+20,vy),(vx-20,vy)],fill=(26,26,30))
        for k in range(14):
            yy=vy+(H-vy)*((k/14+lt*0.15)%1)**2
            hw=20+(W/2)*((yy-vy)/(H-vy))
            d.line([(vx-hw*0.5,yy),(vx+hw*0.5,yy)],fill=(45,40,35),width=3)
        r=4+p*520; glow=int(40+200*p)
        for k in range(8,0,-1):
            rr=r*k/3
            d.ellipse([vx-rr,vy-rr*0.7,vx+rr,vy+rr*0.7],fill=(255,245,220,int(glow/k/1.5)))
        d.ellipse([vx-r*0.3,vy-r*0.2,vx+r*0.3,vy+r*0.2],fill=(255,255,240,min(255,glow+40)))
        rain(d,t,100)
        subtitle(d,"Au loin, une lumière.",clamp((lt-0.5)/0.6)*clamp((3.5-lt)/0.5))
        if lt>5.5: d.rectangle([0,0,W,H],fill=(255,255,255,int(255*clamp((lt-5.5)/1.5))))
    else:  # FIN
        lt=t-25
        v=int(255*clamp(1-lt/0.8))
        img.paste((v,v,v),[0,0,W,H])
        a=clamp((lt-0.8)/0.7)
        f=serif(56); bw=d.textlength("FIN",font=f)
        d.text(((W-bw)/2,H/2-35),"FIN",font=f,fill=(230,200,140,int(255*a)))
    # grain + bandes cinéma + vignette
    arr=np.asarray(img).astype(np.int16)
    arr+=rng.integers(-12,13,(H,W,1),dtype=np.int16)
    arr=(arr*VIG).clip(0,255).astype(np.uint8)
    arr[:70]=0; arr[-70:]=0
    return arr

yy,xx=np.mgrid[0:H,0:W]
VIG=(1-0.55*(((xx-W/2)/(W/2))**2+((yy-H/2)/(H/2))**2)/2)[...,None].clip(0.3,1)

# audio
SR=44100; n=int(DUR*SR); tt=np.arange(n)/SR
noise=rng.standard_normal(n)
rainA=np.convolve(noise,np.ones(8)/8,"same")*0.12
rainA*=np.where((tt>4)&(tt<25),1,0.0)*np.clip(np.minimum((tt-4)/1.5,1),0,1)
drone=(np.sin(2*np.pi*55*tt)+0.5*np.sin(2*np.pi*82.5*tt))*0.08*np.clip(np.minimum(tt/3,(28-tt)/3),0,1)
tr=np.clip((tt-18)/6.5,0,1)**2*(tt<25)
rumble=np.convolve(rng.standard_normal(n),np.ones(200)/200,"same")*6*tr
whistle=np.sin(2*np.pi*660*tt)*0.15*((tt>22)&(tt<23.6))*np.sin(np.pi*np.clip((tt-22)/1.6,0,1))
mix=rainA+drone+rumble+whistle; mix=mix/np.abs(mix).max()*0.8
with wave.open(D+"audio.wav","wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype(np.int16).tobytes())

p=subprocess.Popen(["ffmpeg","-y","-loglevel","error","-f","rawvideo","-pix_fmt","rgb24","-s",f"{W}x{H}","-r",str(FPS),"-i","-",
  "-i",D+"audio.wav","-c:v","libx264","-pix_fmt","yuv420p","-crf","20","-c:a","aac","-shortest",OUT],stdin=subprocess.PIPE)
for i in range(N): p.stdin.write(frame(i).tobytes())
p.stdin.close(); p.wait()
for s in [2,7,14,21,23,26.5]:
    Image.fromarray(frame(int(s*FPS))).save(D+f"still_{s}.png")
print("ok")
