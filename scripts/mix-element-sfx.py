# Montage des sons élémentaires à partir de prises enregistrées (CC0 / CC-BY). Impact placé à IMPACT s dans chaque fichier.
# Sources : packs OpenGameArt listés dans public/mockups/elements-sfx/SOURCES.json, extraits dans /tmp/sfxsrc. Usage : python3 scripts/mix-element-sfx.py <dossier de sortie>
import soundfile as sf, numpy as np, glob, json, os, sys
from scipy.signal import resample_poly, butter, sosfilt
SR=44100; IMPACT=0.48; S='/tmp/sfxsrc/'
OUT=sys.argv[1]
def load(p,a=None,b=None,trim=True):
    d,sr=sf.read(S+p if not p.startswith('/') else p,always_2d=True); m=d.mean(1)
    if sr!=SR: m=resample_poly(m,SR,sr)
    if a is not None or b is not None: m=m[int((a or 0)*SR):int(b*SR) if b else None]
    if trim:
        env=np.abs(m); th=env.max()*10**(-45/20); idx=np.where(env>th)[0]
        if len(idx): m=m[max(0,idx[0]-64):idx[-1]+64]
    return m/ (np.abs(m).max()+1e-9)
def pitch(m,r):
    if r==1: return m
    up,down=int(round(1000/r)),1000; return resample_poly(m,up,down)
def filt(m,kind,f,order=2): return sosfilt(butter(order,f,kind,fs=SR,output='sos'),m)
def fade(m,fi=0.005,fo=0.05):
    m=m.copy(); n=len(m); a=int(fi*SR); b=int(fo*SR)
    if a: m[:a]*=np.linspace(0,1,a)
    if b and b<n: m[-b:]*=np.linspace(1,0,b)**2
    return m
def peak_of(m): return np.argmax(np.abs(m))/SR
class Mix:
    def __init__(s,dur): s.b=np.zeros(int(dur*SR))
    def put(s,m,at=None,peak_at=None,db=0,fi=0.005,fo=0.05,length=None):
        if length: m=m[:int(length*SR)]
        m=fade(m,fi,fo)*10**(db/20)
        if peak_at is not None: at=peak_at-peak_of(m)
        i=int(at*SR)
        if i<0: m=m[-i:]; i=0
        j=min(len(s.b),i+len(m)); s.b[i:j]+=m[:j-i]
    def out(s,name,rms_db=-17):
        b=s.b; b=b-np.mean(b)
        r=np.sqrt(np.mean(b[b!=0]**2)) if np.any(b) else 1
        b=b*10**(rms_db/20)/r
        b=np.tanh(b*1.2)/np.tanh(1.2)  # saturation douce
        b=b/np.abs(b).max()*10**(-1/20)
        n=int(0.04*SR); b[-n:]*=np.linspace(1,0,n)
        sf.write(f'{OUT}/{name}.ogg',b,SR,format='OGG',subtype='VORBIS')
        print(name,f'{len(b)/SR:.2f}s')
FS='more/fire-staff-sound-effects/unz/LEGIT Audio_FIRE STAFF - FREE/Wavs/LEGIT_FIR_Fire_Staff %d-Audio.wav'
EL='x/elec/Wav/'
T=IMPACT
# ---------------- FEU
m=Mix(1.6)  # A : nerveux — souffle, impact sec qui claque, crépitement
m.put(load('more/80-cc0-rpg-sfx/unz/spell_fire_02.ogg'),at=0.02,db=-6,fo=.2,length=.45)
m.put(load('x/swosh/swosh-03.flac'),peak_at=T-.08,db=-4)
m.put(load('more/80-cc0-rpg-sfx/unz/spell_fire_06.ogg'),peak_at=T,db=0,fo=.3)
m.put(load('flame_0.ogg'),peak_at=T+.02,db=-3)
m.put(filt(load('more/dull-explosion/explosion_dull.flac'),'lowpass',900),peak_at=T,db=-2)
m.put(load('more/fire-crackling/fire-1.wav',.6,1.6),at=T+.08,db=-9,fi=.05,fo=.4)
m.out('feu-A')
m=Mix(1.9)  # B : lourd — allumage, grondement, explosion sourde et brasier
m.put(load('more/flare-ignition/ignition.flac'),peak_at=T-.2,db=-15,fo=.15,length=.5)
m.put(load(FS%13),at=T-.3,db=-13,fi=.15,fo=.1,length=.4)
m.put(filt(load('more/chunky-explosion/Chunky Explosion.mp3'),'lowpass',2500),peak_at=T+.03,db=0,fo=.6,length=1.3)
m.put(load(FS%7),peak_at=T+.02,db=-3,fo=.5,length=1.0)
m.put(load('more/fire-crackling/fire-1.wav',1.0,2.4),at=T+.2,db=-8,fi=.1,fo=.5)
m.out('feu-B')
# ---------------- EAU
m=Mix(1.5)  # A : vive — bulles, gerbe nette, gouttes qui retombent
m.put(load('x/water/bubble_03.ogg'),at=0.05,db=-8)
m.put(load('x/swosh/swosh-05.flac'),peak_at=T-.08,db=-6)
m.put(load('x/water/splash_07.ogg'),peak_at=T,db=0,fo=.3)
m.put(load('x/water/splash_02.ogg'),peak_at=T+.01,db=-4)
for k,dt in enumerate([.28,.42,.55]): m.put(pitch(load('x/water/splash_10.ogg'),1.3+k*.15),at=T+dt,db=-14-k*2)
m.out('eau-A')
m=Mix(1.8)  # B : lourde — vague qui s'abat, impact grave, remous
m.put(filt(load('more/air-whoosh/whoosh2_0.wav',.7,1.6),'lowpass',1800),peak_at=T-.12,db=-6,fi=.1,fo=.05)
m.put(load('x/ezwa/ezwa-water_splash/water_splash-04.flac'),peak_at=T,db=0,fo=.5)
m.put(load('x/water/splash_05.ogg'),peak_at=T+.03,db=-3,fo=.4)
m.put(filt(pitch(load('more/dull-explosion/explosion_dull.flac'),.7),'lowpass',500),peak_at=T,db=-3)
m.put(load('x/water/loop_bubbles_02.ogg',0,1.2,False),at=T+.25,db=-14,fi=.1,fo=.5)
m.out('eau-B')
# ---------------- FOUDRE
m=Mix(1.5)  # A : nerveuse — grésillement de charge, zap qui déchire, arcs résiduels
m.put(load('more/electricity-game-sound-pack/crackleelectricityloop.wav'),at=T-.42,db=-12,fi=.1,fo=.05)
m.put(load('more/electricity-game-sound-pack/crackleelectricityloop.wav'),at=T-.22,db=-9,fi=.0,fo=.05,length=.2)
m.put(load(EL+'Whoosh_Electric/Whoosh_Electric_00.wav'),peak_at=T,db=0,fo=.3)
m.put(load(EL+'UI_Electric/UI_Electric_00.wav'),peak_at=T+.01,db=-3)
m.put(filt(load('more/dull-explosion/explosion_dull.flac'),'lowpass',1200),peak_at=T,db=-4)
for k,dt in enumerate([.22,.37,.5]): m.put(load(EL+f'UI_Electric/UI_Electric_{[9,4,11][k]:02d}.wav'),at=T+dt,db=-12-k*2)
m.out('foudre-A')
m=Mix(2.0)  # B : orage — montée de charge, coup de tonnerre qui roule
m.put(load('more/electricity-game-sound-pack/chargestart.wav',0,.6),at=T-.45,db=-10,fi=.15,fo=.08)
m.put(load(EL+'Whoosh_Electric/Whoosh_Electric_01.wav'),peak_at=T,db=-2,fo=.3)
th=load('more/rain-long-thunder/rain-thunder.ogg',22.3,24.0,False); m.put(filt(th,'lowpass',3500),peak_at=T+.04,db=0,fo=.8)
m.put(load('more/electric-buzz/buzz_0.ogg'),at=T+.15,db=-14,fi=.05,fo=.4)
m.out('foudre-B')
# ---------------- AIR
m=Mix(1.4)  # A : lames — trois sifflements rapprochés, coupe nette, rafale courte
for k,dt in enumerate([-.26,-.17,-.08]): m.put(pitch(load(f'x/swosh/swosh-0{[3,5,7][k]}.flac'),1.15+k*.08),peak_at=T+dt,db=-6+k*2)
m.put(load('more/wind-hit-time-morph/unz/qubodup-megaswosh1.wav'),peak_at=T,db=0,fo=.2)
m.put(filt(load('more/short-wind-sound/short wind sound.wav',.5,1.6),'highpass',300),at=T,db=-8,fi=.02,fo=.5)
m.out('air-A')
m=Mix(1.8)  # B : bourrasque — souffle qui enfle, impact d'air grave, rafale qui s'éloigne
m.put(load('more/air-whoosh/whoosh2_0.wav',.6,1.5),peak_at=T-.02,db=-2,fi=.25,fo=.1)
m.put(pitch(load('more/wind-hit-time-morph/unz/qubodup-megaswosh2.wav'),.8),peak_at=T,db=0,fo=.25)
m.put(filt(pitch(load('more/dull-explosion/explosion_dull.flac'),.6),'lowpass',400),peak_at=T,db=-6)
m.put(load('more/short-wind-sound/short wind sound.wav',.7,2.2),at=T+.05,db=-6,fi=.05,fo=.7)
m.out('air-B')
# ---------------- TERRE
m=Mix(1.7)  # A : fissure qui court, rocs qui jaillissent, éboulis
m.put(filt(load('more/moving-boulder/move_boulder_0.ogg'),'lowpass',1500),at=T-.42,db=-6,fi=.1,fo=.1)
m.put(load('more/75-cc0-breaking-falling-hit-sfx/unz/bfh1_rock_breaking_01.ogg'),peak_at=T,db=0,fo=.3)
m.put(load('more/moving-boulder/boulder_drop_0.ogg'),peak_at=T+.01,db=-2)
m.put(filt(load('more/dull-explosion/explosion_dull.flac'),'lowpass',600),peak_at=T,db=-3)
m.put(load('more/80-cc0-rpg-sfx/unz/stones_03.ogg'),at=T+.55,db=-6,fo=.3)
m.put(load('more/75-cc0-breaking-falling-hit-sfx/unz/bfh1_rock_falling_03.ogg'),at=T+.65,db=-9)
m.out('terre-A')
m=Mix(2.0)  # B : séisme — grondement profond, éboulement massif
m.put(filt(load('Earth Element Magic Spell_3.ogg'),'lowpass',2500),peak_at=T-.1,db=-13,fi=.15,fo=.1,length=.6)
m.put(filt(load('more/chunky-explosion/Chunky Explosion.mp3'),'lowpass',900),peak_at=T,db=0,fo=.6,length=1.2)
m.put(load('more/cave-in/cave_in_-_starninjas_0.ogg'),peak_at=T+.06,db=-2,fo=.6,length=1.3)
m.put(load('x/crunch/impcrunch/impactcrunch03.mp3.flac'),peak_at=T+.02,db=-4)
m.put(load('more/75-cc0-breaking-falling-hit-sfx/unz/bfh1_rock_falling_01.ogg'),at=T+.6,db=-8)
m.out('terre-B')
