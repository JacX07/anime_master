"""Sons et jingles originaux Anima Clash, validés le 2026-11-03.
Synthèse seule ; dépendances : numpy, scipy, soundfile.
Usage : python3 scripts/generate-battle-sfx.py [dossier de sortie]
Les états aléatoires préservent exactement les échantillons approuvés.
"""
import sys
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

SR = 32000
OUT = Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parents[1]/"public/audio/battle"
OUT.mkdir(parents=True,exist_ok=True)
RNG = np.random.default_rng(7302)
REPORT = []
def hz(note):
    return 440 * 2 ** ((note - 69) / 12)

def filt(x, cutoff, kind="lowpass"):
    return sosfilt(butter(3, cutoff, btype=kind, fs=SR, output="sos"), x)

def env(t, duration, attack=.04, release=.3):
    return np.minimum(t / attack, 1) * np.minimum(np.maximum((duration-t)/release, 0), 1)

def voice(note, duration, kind):
    t = np.arange(int(duration*SR)) / SR
    f = hz(note)
    if kind == "horn":
        phase = 2*np.pi*f*(t + .00020*np.sin(2*np.pi*4.2*t))
        x = sum(np.sin(k*phase)/k**1.35 for k in range(1, 13))
        return filt(x, 1900) * env(t, duration, .12, .45) * np.exp(-t*.20)
    if kind == "choir":
        x = np.zeros(len(t))
        # Formants graves /o/ : voix additive, battements de trois pupitres.
        for cents in [-5, 0, 6]:
            for k in range(1, 23):
                formant = .12 + np.exp(-((k*f-550)/210)**2) + .38*np.exp(-((k*f-1050)/260)**2)
                x += formant/k * np.sin(2*np.pi*f*k*2**(cents/1200)*t + .15*np.sin(2*np.pi*4.8*t))
        return x * env(t, duration, .45, .9) * .5
    if kind == "lute":
        x = sum(np.sin(2*np.pi*f*k*t + .08*k)*np.exp(-t*(1.9+k*.7))/k**1.4 for k in range(1, 15))
        return x * env(t, duration, .004, .15)
    if kind == "bow":
        phase = 2*np.pi*f*t + .018*np.sin(2*np.pi*5*t)
        x = sum(np.sin(k*phase)/k**1.8 for k in range(1, 15))
        return filt(x, 2400) * env(t, duration, .23, .65)
    if kind == "bell":
        x = sum(np.sin(2*np.pi*f*r*t)*a*np.exp(-t*d) for r,a,d in [(1,1,.6),(2.01,.4,1.1),(2.76,.15,1.7),(4.08,.08,2.5)])
        return x * env(t, duration, .003, .6)
    raise ValueError(kind)

def drum(duration=.8, power=1):
    t = np.arange(int(duration*SR))/SR
    phase = 2*np.pi*(48*t + 65*.035*(1-np.exp(-t/.035)))
    body = np.sin(phase)*np.exp(-t*7) + .23*np.sin(phase*1.58)*np.exp(-t*12)
    skin = filt(RNG.normal(0,1,len(t)), 1400)*np.exp(-t*28)*.4
    return (body+skin)*env(t,duration,.002,.1)*power

def put(mix, x, at, gain=1, pan=0):
    start = int(at*SR)
    n = min(len(x), len(mix)-start)
    if n <= 0:
        return
    mix[start:start+n,0] += x[:n]*gain*np.sqrt((1-pan)/2)
    mix[start:start+n,1] += x[:n]*gain*np.sqrt((1+pan)/2)

def finish(name, title, mix, description, room=.2):
    # Réflexions diffuses, sans dépendre d'un fichier d'impulsion externe.
    dry = mix.copy()
    for i, delay in enumerate([.071,.113,.179,.251,.337,.443,.587,.761,1.013,1.291,1.63]):
        shift = int(delay*SR)
        if shift < len(mix):
            mix[shift:] += dry[:-shift, ::-1 if i%2 else 1]*room*np.exp(-delay*1.7)
    mix = np.tanh(mix*.85)
    mix -= mix.mean(axis=0)
    mix *= 10**(-3/20)/max(np.abs(mix).max(), 1e-8)
    fade = min(int(.16*SR), len(mix)//4)
    mix[:int(.003*SR)] *= np.linspace(0,1,int(.003*SR))[:,None]
    mix[-fade:] *= np.linspace(1,0,fade)[:,None]
    assert np.isfinite(mix).all() and np.max(np.abs(mix)) < .72
    path = OUT / (name + ".ogg")
    sf.write(path, mix, SR, format="OGG", subtype="VORBIS")
    decoded, sr = sf.read(path, always_2d=True)
    assert sr == SR and decoded.shape == mix.shape and np.isfinite(decoded).all()
    peak = float(np.abs(decoded).max())
    assert peak < .95, (name, peak)
    REPORT.append(dict(id=name, title=title, path=str(path), duration=round(len(mix)/SR,2), peak_dbfs=round(20*np.log10(peak),2), description=description))

def texture(duration, cutoff, decay, attack=.003):
    t = np.arange(int(duration*SR))/SR
    return filt(RNG.normal(0,1,len(t)),cutoff)*np.exp(-t*decay)*env(t,duration,attack,.2)

RNG.bit_generator.state = {'bit_generator': 'PCG64', 'state': {'state': 214114058656915687075203120338758367319, 'inc': 200944967220690722716855230028434796397}, 'has_uint32': 0, 'uinteger': 0}
mix = np.zeros((int(1.15*SR),2))
put(mix,texture(.24,1800,3,.08),0,.20)
put(mix,drum(.9),.10,.75)
put(mix,texture(.5,2500,16),.10,.65)
put(mix,texture(.8,420,6),.15,.32)
finish("coup", "Coup — Chair et cuir",mix,"Élan de tissu, choc mat de corps et résonance sourde ; aucun tintement métallique.",.12)



RNG.bit_generator.state = {'bit_generator': 'PCG64', 'state': {'state': 302911428683295182415353251649897157613, 'inc': 200944967220690722716855230028434796397}, 'has_uint32': 0, 'uinteger': 0}
mix = np.zeros((int(2.4*SR),2))
t = np.arange(int(.65*SR))/SR
charge = filt(RNG.normal(0,1,len(t)),[240,1600],"bandpass")*(t/.65)**1.7
put(mix,charge,0,.38)
put(mix,voice(38,1.8,"choir"),.04,.38)
put(mix,drum(1),.58,.68)
put(mix,texture(1.6,950,2),.59,.8)
put(mix,voice(50,1.7,"bow"),.61,.20,-.3)
put(mix,voice(51,1.5,"bow"),.7,.12,.3)
finish("sort", "Sort — Sceau de la crypte",mix,"Inspiration rauque, charge occulte, rupture grave puis souffle ; impact à 0,58 s.",.24)



RNG.bit_generator.state = {'bit_generator': 'PCG64', 'state': {'state': 68721041702277405604954540917063347623, 'inc': 200944967220690722716855230028434796397}, 'has_uint32': 0, 'uinteger': 0}
mix = np.zeros((int(2.5*SR),2))
put(mix,drum(.9),.02,.5)
put(mix,texture(1.2,850,3,.03),.03,.7)
t = np.arange(int(1.7*SR))/SR
fall = np.sin(2*np.pi*(90*t + 160*.3*(1-np.exp(-t/.3))))*np.exp(-t*2.7)
put(mix,fall,.03,.25)
put(mix,voice(38,2.25,"choir"),.04,.18)
put(mix,texture(1.8,330,2,.05),.38,.35)
finish("mort", "Mort — Le dernier souffle",mix,"Effondrement mat, souffle qui retombe et résonance funèbre ; sans cri enregistré.",.23)



def bright(note, duration, kind="horn"):
    t = np.arange(int(duration*SR))/SR
    f = hz(note)
    if kind == "horn":
        phase = 2*np.pi*f*t + .012*np.sin(2*np.pi*5*t)
        signal = sum(np.sin(k*phase)/k**1.5 for k in range(1,11))
        return filt(signal,3300)*env(t,duration,.012,min(.18,duration*.3))
    return voice(note,duration,"lute")

def jingle(name, title, notes, interval, length, kind, description):
    mix = np.zeros((int(length*SR),2))
    final = interval*(len(notes)-1)
    for i,note in enumerate(notes):
        duration = .21 if i<len(notes)-1 else length-final-.12
        put(mix,bright(note,duration,kind),i*interval,.46,.10)
        put(mix,bright(note-12,duration,kind),i*interval,.16,-.16)
    root = notes[-1]-24
    third = 4 if name.startswith("victoire") else 3
    for n in [root,root+7,root+12,root+12+third]:
        put(mix,bright(n,length-final-.08,kind),final,.11)
    put(mix,drum(.7),final,.27)
    finish(name,title,mix,description,.12)

def texture(duration, cutoff, decay, attack=.002):
    t = np.arange(int(duration*SR))/SR
    return filt(RNG.normal(0,1,len(t)),cutoff,"bandpass" if isinstance(cutoff,list) else "lowpass")*np.exp(-t*decay)*env(t,duration,attack,.12)

RNG = np.random.default_rng(7302)
jingle("victoire-A", "Victoire A — Ascension éclair", [62,66,69,74,78,81,86], .095, 1.85,
       "horn", "Sept notes ascendantes en 0,57 s, puis accord majeur bref. Cors francs et tambour.")

RNG.bit_generator.state = {'bit_generator': 'PCG64', 'state': {'state': 95984291457483254290788140996246977034, 'inc': 200944967220690722716855230028434796397}, 'has_uint32': 0, 'uinteger': 0}
jingle("defaite-A", "Défaite A — Chute brève", [74,69,65,62,57,50], .14, 2.15,
       "horn", "Descente en 0,70 s, accord mineur grave et extinction rapide.")

RNG.bit_generator.state = {'bit_generator': 'PCG64', 'state': {'state': 127857169451975970550788056966134428685, 'inc': 200944967220690722716855230028434796397}, 'has_uint32': 0, 'uinteger': 0}
mix = np.zeros((int(1.5*SR),2))
put(mix,texture(.10,1800,3,.025),0,.14)
put(mix,drum(1.1),.045,1.25)
for at,g in [(.045,1.25),(.063,.8),(.091,.58),(.14,.25)]:
    crunch = texture(.34,[420,4200],16)
    put(mix,np.tanh(crunch*4),at,g)
t = np.arange(int(.95*SR))/SR
phase = 2*np.pi*(49*t + 85*.028*(1-np.exp(-t/.028)))
body = np.sin(phase)*np.exp(-t*4.7) + .4*np.sin(phase*2)*np.exp(-t*7)
put(mix,body*env(t,.95,.003,.16),.05,.95)
put(mix,texture(.75,650,4),.09,.6)
put(mix,texture(.18,3000,25),.11,.35)
# Compression parallèle : attaque nette et queue plus présente que la v1.
mix = .5*mix + .5*np.tanh(mix*2.4)
finish("critique", "Critique V2 — Brise-os", mix,
       "Choc immédiat, craquement dense et grave prolongé. Plus présent que le coup normal.", .10)


(OUT/"victoire-A.ogg").replace(OUT/"victory.ogg")
(OUT/"defaite-A.ogg").replace(OUT/"defeat.ogg")
print("Sons générés : coup, critique, sort, mort, victory, defeat")
