# Uso: python3 herramientas/fotos-demo.py img/demo  (necesita Pillow y numpy)
# Genera fotos "de ambiente" (bokeh, luces, agua) para la demo. Sin derechos de terceros.
import numpy as np, random, sys, os
from PIL import Image, ImageDraw, ImageFilter, ImageChops
W,H=1600,1000
OUT=sys.argv[1]
def grad(stops):
    y=np.linspace(0,1,H)[:,None]
    img=np.zeros((H,W,3))
    for c in range(3):
        xs=[s[0] for s in stops]; vs=[s[1][c] for s in stops]
        img[:,:,c]=np.interp(y,xs,vs)
    return img
def toimg(a): return Image.fromarray(np.clip(a,0,255).astype('uint8'))
def bokeh(base, n, colores, rmin, rmax, blur, region=(0,0,W,H), alpha=(0.25,0.8), seed=0, ring=True):
    rnd=random.Random(seed)
    layer=Image.new('RGB',(W,H),(0,0,0))
    d=ImageDraw.Draw(layer)
    for _ in range(n):
        x=rnd.uniform(region[0],region[2]); y=rnd.uniform(region[1],region[3]); r=rnd.uniform(rmin,rmax)
        c=rnd.choice(colores); a=rnd.uniform(*alpha)
        col=tuple(int(v*a) for v in c)
        d.ellipse([x-r,y-r,x+r,y+r],fill=col)
        if ring and r>18:
            col2=tuple(int(min(255,v*a*1.25)) for v in c)
            d.ellipse([x-r,y-r,x+r,y+r],outline=col2,width=max(2,int(r*0.07)))
    layer=layer.filter(ImageFilter.GaussianBlur(blur))
    return ImageChops.add(base,layer)
def glow(base, pts, color, r, blur, k=1.0):
    layer=Image.new('RGB',(W,H),(0,0,0)); d=ImageDraw.Draw(layer)
    for (x,y) in pts:
        d.ellipse([x-r,y-r,x+r,y+r],fill=tuple(int(c*k) for c in color))
    return ImageChops.add(base,layer.filter(ImageFilter.GaussianBlur(blur)))
def vignette(img, s=0.55):
    a=np.asarray(img).astype(float)
    yy,xx=np.mgrid[0:H,0:W]; d=np.sqrt(((xx-W/2)/(W/2))**2+((yy-H/2)/(H/2))**2)
    m=1-s*np.clip(d-0.35,0,1)**1.5
    return toimg(a*m[:,:,None])
def grain(img, k=7, seed=1):
    rng=np.random.default_rng(seed); a=np.asarray(img).astype(float)
    n=rng.normal(0,k,(H,W,1)); return toimg(a+n)
def silhouette(img, polys, color, blur):
    mask=Image.new('L',(W,H),0); d=ImageDraw.Draw(mask)
    for p in polys: d.polygon(p,fill=255)
    mask=mask.filter(ImageFilter.GaussianBlur(blur))
    solid=Image.new('RGB',(W,H),color)
    return Image.composite(solid,img,mask)
def trees(seed, base_y, count, hmin, hmax):
    rnd=random.Random(seed); polys=[]
    for i in range(count):
        cx=rnd.uniform(-100,W+100); h=rnd.uniform(hmin,hmax); w=h*rnd.uniform(0.5,0.9)
        pts=[]
        for k in range(40):
            t=k/39*np.pi; rr=1+0.05*np.sin(k*0.9+seed+i)
            pts.append((cx+np.cos(t)*w/2*rr, base_y-h*0.35-np.sin(t)*h*0.65*rr))
        pts+= [(cx+w*0.08,base_y),(cx-w*0.08,base_y)]
        polys.append(pts)
    polys.append([(0,base_y-20),(W,base_y-40),(W,H),(0,H)])
    return polys
def save(img,name,q=78):
    img=img.convert('RGB'); img.save(os.path.join(OUT,name+'.webp'),'WEBP',quality=q,method=6)
    print(name, os.path.getsize(os.path.join(OUT,name+'.webp'))//1024,'KB')
WARM=[(255,196,110),(255,170,80),(255,214,150),(255,150,70)]
# 1 HERO: atardecer con guirnaldas
b=toimg(grad([(0,(18,20,46)),(0.45,(70,46,82)),(0.7,(190,112,92)),(0.82,(238,160,104)),(1,(40,30,40))]))
b=bokeh(b,60,[(255,190,120),(255,150,90),(200,150,255)],20,70,14,(0,0,W,H*0.75),(0.08,0.25),seed=3)
b=silhouette(b,trees(5,H*0.9,7,300,520),(14,14,20),18)
# guirnalda
lay=Image.new('RGB',(W,H),(0,0,0)); d=ImageDraw.Draw(lay)
for (y0,sag,seed,r) in [(170,120,1,9),(80,160,2,14)]:
    pts=[(x, y0+sag*np.sin(np.pi*x/W)) for x in np.linspace(-50,W+50,200)]
    d.line(pts,fill=(30,24,30),width=3)
b=Image.composite(Image.new('RGB',(W,H),(20,16,22)),b,lay.convert('L').point(lambda v:255 if v>0 else 0))
pts=[]
for (y0,sag,step) in [(170,120,95),(80,160,140)]:
    for x in np.arange(20,W,step): pts.append((x,y0+sag*np.sin(np.pi*x/W)+14))
b=glow(b,pts,(255,190,110),26,22,0.9); b=glow(b,pts,(255,236,190),7,3,1.0)
b=bokeh(b,26,WARM,40,120,10,(0,H*0.3,W,H),(0.25,0.55),seed=9)
b=vignette(grain(b,6),0.5); save(b,'hero')
# 2 SALÓN: interior cálido con arañas
b=toimg(grad([(0,(28,18,14)),(0.5,(58,36,24)),(1,(22,14,12))]))
b=bokeh(b,140,WARM,10,55,8,(0,0,W,H*0.65),(0.2,0.7),seed=11)
b=glow(b,[(400,180),(800,140),(1200,180)],(255,200,130),90,70,0.8)
# mesas: franjas blancas desenfocadas
lay=Image.new('RGB',(W,H),(0,0,0)); d=ImageDraw.Draw(lay)
for i,(y,h) in enumerate([(640,40),(720,60),(820,90)]):
    d.ellipse([200-i*120,y,W-200+i*120,y+h*3],fill=(70,45,25))
b=ImageChops.add(b,lay.filter(ImageFilter.GaussianBlur(60)))
b=bokeh(b,40,WARM,4,10,1.5,(0,560,W,900),(0.6,1),seed=12,ring=False)
b=vignette(grain(b,6),0.6); save(b,'salon')
# 3 PISTA
b=toimg(grad([(0,(10,6,20)),(1,(26,10,36))]))
lay=Image.new('RGB',(W,H),(0,0,0)); d=ImageDraw.Draw(lay)
for (x,c,ang) in [(300,(170,60,255),0.35),(800,(40,220,210),-0.1),(1250,(255,60,150),-0.4),(600,(90,90,255),0.15)]:
    d.polygon([(x-10,0),(x+10,0),(x+600*ang+160,H),(x+600*ang-160,H)],fill=tuple(int(v*0.55) for v in c))
b=ImageChops.add(b,lay.filter(ImageFilter.GaussianBlur(30)))
b=bokeh(b,90,[(200,90,255),(60,230,220),(255,80,170),(255,220,255)],8,50,7,seed=21)
b=silhouette(b,[[(x,H-140-random.Random(x).uniform(0,130)) for x in []]+[(0,H),(W,H)]],(0,0,0),1) if False else b
crowd=[]
rnd=random.Random(4)
for i in range(22):
    cx=rnd.uniform(-40,W+40); hh=rnd.uniform(180,300)
    crowd.append([(cx-45,H),(cx-40,H-hh+60),(cx-28,H-hh+10),(cx,H-hh-10),(cx+28,H-hh+10),(cx+40,H-hh+60),(cx+45,H)])
    if rnd.random()<0.4: crowd.append([(cx+20,H-hh+40),(cx+70,H-hh-120),(cx+82,H-hh-112),(cx+38,H-hh+60)])
b=silhouette(b,crowd,(6,4,10),5)
b=vignette(grain(b,7),0.5); save(b,'pista')
# 4 PARQUE: verde soleado
b=toimg(grad([(0,(170,210,235)),(0.4,(150,190,150)),(1,(40,80,40))]))
b=bokeh(b,160,[(90,150,70),(130,180,80),(60,110,50),(200,220,120)],30,110,16,seed=31,alpha=(0.4,0.9))
b=glow(b,[(1250,140)],(255,245,200),180,120,0.9)
b=bokeh(b,40,[(255,250,210)],10,40,6,(800,0,W,500),(0.3,0.7),seed=32)
lay=Image.new('RGB',(W,H),(0,0,0)); d=ImageDraw.Draw(lay)
d.rectangle([0,H*0.78,W,H],fill=(40,70,20)); 
b=ImageChops.add(b,lay.filter(ImageFilter.GaussianBlur(40)))
b=vignette(grain(b,5),0.4); save(b,'parque')
# 5 PILETA: agua con cáusticas
yy,xx=np.mgrid[0:H,0:W]/1.0
v=np.zeros((H,W))
rng=np.random.default_rng(5)
for k in range(5):
    a=rng.uniform(0,np.pi); f=rng.uniform(0.006,0.014); ph=rng.uniform(0,6)
    wx=xx+30*np.sin(yy*0.01+k)+20*np.sin(xx*0.013+k*2); wy=yy+30*np.cos(xx*0.009+k)
    v+=np.sin((wx*np.cos(a)+wy*np.sin(a))*f+ph)
c=np.exp(-np.abs(v)*3.5)*0.6
base=np.stack([30+70*c,150+80*c,175+60*c],-1)
dep=np.linspace(1.05,0.75,H)[:,None,None]
b=toimg(base*dep); b=b.filter(ImageFilter.GaussianBlur(1.2)); b=vignette(grain(b,4),0.35); save(b,'pileta')
# 6 QUINCHO: brasas
b=toimg(grad([(0,(14,10,10)),(0.6,(40,18,10)),(1,(90,30,8))]))
b=bokeh(b,120,[(255,120,30),(255,170,60),(255,90,20)],4,22,3,(0,H*0.45,W,H),(0.5,1),seed=61,ring=False)
b=bokeh(b,40,[(255,140,50)],30,90,18,(0,H*0.3,W,H),(0.2,0.5),seed=62)
b=glow(b,[(W/2,H*1.05)],(255,110,30),500,160,0.9)
b=vignette(grain(b,7),0.55); save(b,'quincho')
# 7 MESA: velas
b=toimg(grad([(0,(20,14,12)),(0.6,(46,30,22)),(1,(70,50,40))]))
b=bokeh(b,70,WARM,30,90,10,(0,0,W,H*0.6),(0.15,0.45),seed=71)
lay=Image.new('RGB',(W,H),(0,0,0)); d=ImageDraw.Draw(lay)
d.ellipse([200,700,1400,1150],fill=(150,130,115))
b=ImageChops.add(b,lay.filter(ImageFilter.GaussianBlur(35)))
fl=[(560,560),(800,520),(1040,560)]
lay=Image.new('RGB',(W,H),(0,0,0)); d=ImageDraw.Draw(lay)
for (x,y) in fl: d.rectangle([x-14,y+30,x+14,y+200],fill=(225,215,200))
b=ImageChops.add(b,lay.filter(ImageFilter.GaussianBlur(2)))
b=glow(b,fl,(255,170,70),70,45,0.8)
lay=Image.new('RGB',(W,H),(0,0,0)); d=ImageDraw.Draw(lay)
for (x,y) in fl: d.ellipse([x-9,y-8,x+9,y+30],fill=(255,235,190))
b=ImageChops.add(b,lay.filter(ImageFilter.GaussianBlur(3)))
b=vignette(grain(b,6),0.55); save(b,'mesa')
# 8 BARRA: vidrio y destellos
b=toimg(grad([(0,(12,16,18)),(1,(30,26,22))]))
lay=Image.new('RGB',(W,H),(0,0,0)); d=ImageDraw.Draw(lay)
rnd=random.Random(8)
for i in range(16):
    x=60+i*98+rnd.uniform(-10,10); h=rnd.uniform(220,330); c=rnd.choice([(160,100,30),(40,110,70),(170,170,180),(120,40,30),(200,150,60)])
    d.rounded_rectangle([x,420-h*0.2,x+52,420+h*0.6],16,fill=c); d.rectangle([x+18,420-h*0.2-90,x+34,420-h*0.2+10],fill=c)
b=ImageChops.add(b,lay.filter(ImageFilter.GaussianBlur(14)))
b=bokeh(b,60,[(255,220,170),(255,255,255),(255,190,120)],4,14,2,(0,250,W,700),(0.4,1),seed=81,ring=False)
lay=Image.new('RGB',(W,H),(0,0,0)); d=ImageDraw.Draw(lay); d.rectangle([0,760,W,780],fill=(120,90,60))
b=ImageChops.add(b,lay.filter(ImageFilter.GaussianBlur(4)))
b=vignette(grain(b,6),0.5); save(b,'barra')
# 9 TERRAZA: ciudad al atardecer
b=toimg(grad([(0,(40,40,80)),(0.45,(180,110,120)),(0.65,(250,170,110)),(1,(30,24,34))]))
b=bokeh(b,150,[(255,200,130),(255,240,200),(160,190,255)],6,26,6,(0,H*0.6,W,H*0.9),(0.4,0.9),seed=91)
b=glow(b,[(W*0.62,H*0.6)],(255,200,140),140,80,0.9)
b=bokeh(b,20,WARM,60,140,14,(0,0,W,H),(0.12,0.3),seed=92)
lay=Image.new('L',(W,H),0); d=ImageDraw.Draw(lay); d.rectangle([0,H*0.86,W,H],fill=255)
for x in range(0,W,70): d.rectangle([x,H*0.78,x+8,H],fill=255)
d.rectangle([0,H*0.78,W,H*0.79],fill=255)
b=Image.composite(Image.new('RGB',(W,H),(16,12,16)),b,lay.filter(ImageFilter.GaussianBlur(2)))
b=vignette(grain(b,6),0.45); save(b,'terraza')
# 10 TORTA: pastel
b=toimg(grad([(0,(250,232,228)),(1,(236,206,200))]))
b=bokeh(b,70,[(255,255,255),(255,220,200),(250,200,210)],30,110,14,seed=101,alpha=(0.05,0.2))
lay=Image.new('RGB',(W,H),(0,0,0)); d=ImageDraw.Draw(lay)
for (y,w,h) in [(560,520,200),(400,400,170),(270,280,140)]:
    d.rounded_rectangle([W/2-w/2,y,W/2+w/2,y+h],24,fill=(255,255,255))
arr=np.asarray(b).astype(float); m=np.asarray(lay.filter(ImageFilter.GaussianBlur(3)).convert('L'))/255.0
cake=np.array([252,246,242]); arr=arr*(1-m[:,:,None])+cake*m[:,:,None]
b=toimg(arr)
lay=Image.new('L',(W,H),0); d=ImageDraw.Draw(lay)
for (y,w) in [(560,520),(400,400),(270,280)]: d.rectangle([W/2-w/2,y+h*0+150 if False else y+(200 if w==520 else 170 if w==400 else 140)-8,W/2+w/2,y+(200 if w==520 else 170 if w==400 else 140)],fill=60)
b=Image.composite(Image.new('RGB',(W,H),(200,170,165)),b,lay.filter(ImageFilter.GaussianBlur(6)))
b=bokeh(b,30,[(255,200,210),(250,230,200)],8,20,2,(W/2-260,260,W/2+260,760),(0.15,0.3),seed=102,ring=False)
d=ImageDraw.Draw(b); d.rectangle([W/2-6,170,W/2+6,270],fill=(240,210,200))
b=glow(b,[(W/2,160)],(255,190,100),40,22,0.9)
b=grain(b,4); b=vignette(b,0.3); save(b,'torta')
