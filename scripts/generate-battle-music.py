"""La marche des cendres — composition originale validée à 152 BPM.
Synthèse seule, aucun enregistrement ni téléchargement.
Dépendances : numpy, scipy, soundfile.
Usage : python3 scripts/generate-battle-music.py [chemin.ogg]
"""
import sys
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

SR = 32000
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]/"public/audio/battle/combat.ogg"
RNG = np.random.default_rng(7302)
# État du générateur au début de la composition validée, après les essais sonores.
RNG.bit_generator.state = {'bit_generator': 'PCG64', 'state': {'state': 213050039572338148323349999376982552491, 'inc': 200944967220690722716855230028434796397}, 'has_uint32': 0, 'uinteger': 0}

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

def bright(note, duration, kind="horn"):
    t = np.arange(int(duration*SR))/SR
    f = hz(note)
    if kind == "horn":
        phase = 2*np.pi*f*t + .012*np.sin(2*np.pi*5*t)
        signal = sum(np.sin(k*phase)/k**1.5 for k in range(1,11))
        return filt(signal,3300)*env(t,duration,.012,min(.18,duration*.3))
    return voice(note,duration,"lute")

def texture(duration, cutoff, decay, attack=.002):
    t = np.arange(int(duration*SR))/SR
    return filt(RNG.normal(0,1,len(t)),cutoff,"bandpass" if isinstance(cutoff,list) else "lowpass")*np.exp(-t*decay)*env(t,duration,attack,.12)

# Seize mesures : ostinato, réponse mélodique, montée puis reprise sombre.
BPM = 152
BEAT = 60/BPM
BARS = 16
PERIOD = int(round(BARS*4*BEAT*SR))
LENGTH = PERIOD/SR
mix = np.zeros((PERIOD*3 + int(3*SR),2))
chords = [[38,45,50],[38,45,53],[34,41,46],[36,43,48],
          [38,45,50],[34,41,46],[31,38,43],[33,40,49]]
motif = [[(0,62,1),(1.5,65,.5),(2,69,1),(3,67,.75)],
         [(0,65,1.5),(2,62,.75),(3,60,.75)],
         [(0,58,1),(1.5,62,.5),(2,65,1.5)],
         [(0,60,1),(1,64,1),(2.5,67,1)],
         [(0,69,1.5),(2,74,.75),(3,72,.75)],
         [(0,70,1),(1.5,69,.5),(2,65,1.5)],
         [(0,67,1),(1,65,1),(2.5,62,1)],
         [(0,61,1),(1.5,64,.5),(2,69,1),(3,61,.75)]]
for cycle in range(3):
    for bar in range(BARS):
        at = cycle*LENGTH + bar*4*BEAT
        chord = chords[bar%8]
        intense = bar>=8
        for j,note in enumerate(chord):
            put(mix,voice(note,4*BEAT+.5,"choir"),at,.085,[-.35,0,.35][j])
            put(mix,voice(note+12,4*BEAT+.35,"bow"),at,.085,[-.5,.4,0][j])
        for b,p in [(0,.8),(1.5,.30),(2,.6),(3.25,.3),(3.5,.36)]:
            put(mix,drum(.7),at+b*BEAT,p*(1.05 if intense else .85))
        for step in range(8):
            n=chord[[0,2,1,2,0,1,2,1][step]]+12
            put(mix,voice(n,.55,"lute"),at+step*.5*BEAT,.24,-.22 if step%2 else .22)
            put(mix,bright(n-12,.19),at+step*.5*BEAT,.08)
        for b,n,d in motif[bar%8]:
            put(mix,bright(n,d*BEAT+.06),at+b*BEAT,.18 if intense else .11,.1)
        if intense:
            for b in [1,3]:
                put(mix,texture(.17,[450,2800],15),at+b*BEAT,.15,-.25)

# Extraire la période centrale conserve les queues de la période précédente.
dry = mix.copy()
for i,delay in enumerate([.071,.113,.179,.251,.337,.443,.587,.761,1.013]):
    shift=int(delay*SR)
    mix[shift:] += dry[:-shift,::-1 if i%2 else 1]*.18*np.exp(-delay*1.7)
loop = mix[PERIOD:PERIOD*2].copy()
loop = np.tanh(loop*.8)
loop -= loop.mean(axis=0)
loop *= 10**(-6/20)/np.abs(loop).max()
# Retirer un décalage résiduel entre les deux extrémités sans fondu de silence.
delta = loop[-1]-loop[0]
loop -= np.linspace(-.5,.5,PERIOD)[:,None]*delta
assert np.max(np.abs(loop[-1]-loop[0])) < 1e-10
assert np.isfinite(loop).all() and np.max(np.abs(loop)) < .55
OUT.parent.mkdir(parents=True, exist_ok=True)
path = OUT
sf.write(path,loop,SR,format="OGG",subtype="VORBIS")
decoded,sr=sf.read(path,always_2d=True)
assert decoded.shape==loop.shape and sr==SR and np.isfinite(decoded).all()
assert np.max(np.abs(decoded))<.7
seam = float(np.max(np.abs(decoded[-1]-decoded[0])))
assert seam < .02, seam

print(f"{path}: {LENGTH:.2f} s, {BPM} BPM, jonction {seam:.6f}")
