"""Projectile magique descendant, validé le 2026-11-03.
Synthèse originale numpy/scipy/soundfile. Usage : python3 scripts/generate-projectile-sfx.py [fichier.ogg].
"""
from pathlib import Path
import sys
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

SR=32000
OUTPUT = Path(globals().get("OUTPUT_PATH") or (sys.argv[1] if len(sys.argv)>1 else Path(__file__).resolve().parents[1]/"public/audio/battle/sort.ogg"))
rng=np.random.default_rng(110395)
mix=np.zeros((int(1.65*SR),2))

def band(x,lo,hi):
    return sosfilt(butter(3,[lo,hi],btype='bandpass',fs=SR,output='sos'),x)

def put(x,at,gain=1,pan=0):
    start=int(at*SR);n=min(len(x),len(mix)-start)
    mix[start:start+n]+=x[:n,None]*gain*np.sqrt([(1-pan)/2,(1+pan)/2])

# Une amorce d'air discrète monte en tension sans produire d'impact sec.
t=np.arange(int(.49*SR))/SR
charge=band(rng.normal(0,1,len(t)),700,3500)
charge*=np.sin(np.pi*t/.49)**2*(t/.49)**.8
put(charge,.045,.075)

# Descente continue : la hauteur parcourt l'aigu puis rejoint un grave feutré.
t=np.arange(int(1.05*SR))/SR
phase=2*np.pi*(105*t+(1550-105)*.115*(1-np.exp(-t/.115)))
envelope=(1-np.exp(-t/.016))*np.exp(-t*4.4)
tone=np.sin(phase)+.20*np.sin(2*phase)+.055*np.sin(3*phase)
tone=np.tanh(tone*1.1)*envelope
put(tone,.55,.58)

# Le souffle accompagne la chute et perd progressivement ses aigus.
white=rng.normal(0,1,len(t))
high=band(white,1300,6000)
low=band(white,140,1200)
blend=np.exp(-t*7)
air=(high*blend+low*(1-blend))*(1-np.exp(-t/.025))*np.exp(-t*5.5)
put(air,.55,.30,-.10)
put(air,.59,.055,.30)

mix*=10**(-3/20)/np.max(np.abs(mix))
mix[-int(.12*SR):]*=np.linspace(1,0,int(.12*SR))[:,None]
assert np.isfinite(mix).all() and np.max(np.abs(mix))<.72
path=OUTPUT
path.parent.mkdir(parents=True,exist_ok=True)
sf.write(path,mix,SR,format='OGG',subtype='VORBIS')
decoded,sr=sf.read(path,always_2d=True)
assert sr==SR and decoded.shape==mix.shape and np.isfinite(decoded).all()
assert np.max(np.abs(decoded))<.9
print(f'{path} — {len(decoded)/SR:.2f} s ; pic {20*np.log10(np.max(np.abs(decoded))):.2f} dBFS')
