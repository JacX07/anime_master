"""Original procedural SFX, no samples. Run: python3 scripts/generate-megumin-sfx.py (NumPy)."""
from pathlib import Path
import wave
import numpy as np

RATE = 44100
DURATION = 3.6
IMPACT = 1.8
rng = np.random.default_rng(89361)
t = np.arange(round(RATE * DURATION)) / RATE


def noise(low, high):
    frequencies = np.fft.rfftfreq(len(t), 1 / RATE)
    spectrum = np.fft.rfft(rng.normal(size=len(t)))
    mask = np.clip((frequencies - low) / max(low, 15), 0, 1)
    mask *= np.clip((high - frequencies) / (high * .35), 0, 1)
    signal = np.fft.irfft(spectrum * mask, n=len(t))
    return signal / max(np.std(signal), 1e-9)


# Rising, dissonant magical resonance, sucked inward before the impact.
charge = np.clip(t / (IMPACT - .2), 0, 1) ** 1.7
charge *= np.clip(((IMPACT - .08) - t) / .12, 0, 1)
phase = 2 * np.pi * (110 * t + 65 * t ** 2)
tone = sum(np.sin(phase * ratio + .8 * np.sin(t * 9)) / (i + 2)
           for i, ratio in enumerate([1, 1.1892, 1.4983, 2, 3.001]))
sound = charge * (.09 * tone + .045 * noise(500, 7500))
sound += charge ** 3 * .12 * noise(60, 1100)

# Short air gap, then a crack, falling sub-bass and a turbulent fire body.
u = np.maximum(0, t - IMPACT)
gate = (t >= IMPACT) * np.minimum(1, u / .0015)
sub_phase = 2 * np.pi * (37 * u + 70 * .11 * (1 - np.exp(-u / .11)))
sub = np.sin(sub_phase) * np.exp(-u / .75)
body = noise(25, 550) * np.exp(-u / .85)
crack = noise(500, 14000) * np.exp(-u / .026)
fire = noise(140, 4200) * np.exp(-u / .6)
blast = gate * (.7 * sub + .52 * body + .35 * crack + .18 * fire)
sound += blast

# Reflections and individual stones make the tail less like a bass drum.
for delay, gain in [(.093, .2), (.173, .14), (.291, .1), (.437, .065)]:
    samples = round(delay * RATE)
    sound[samples:] += blast[:-samples] * gain
for _ in range(34):
    at = rng.uniform(IMPACT + .25, DURATION - .3)
    age = np.maximum(0, t - at)
    envelope = (t >= at) * np.minimum(age / .001, 1) * np.exp(-age / rng.uniform(.012, .055))
    sound += rng.uniform(.009, .04) * envelope * noise(600, 11000)

# Gentle saturation, stereo air and a sample-accurate fade. Peak: -1 dBFS.
sound = np.tanh(sound * 1.15)
air = noise(200, 4500) * gate * np.exp(-u / 1.2) * .035
stereo = np.column_stack([sound + air, sound - np.roll(air, 137)])
stereo *= (np.minimum(t / .015, 1) * np.clip((DURATION - t) / .35, 0, 1))[:, None]
stereo *= 10 ** (-1 / 20) / np.max(np.abs(stereo))
pcm = np.round(stereo * 32767).astype('<i2')
assert len(pcm) == round(RATE * DURATION)
assert IMPACT <= t[np.argmax(np.max(np.abs(stereo), axis=1))] < IMPACT + .3
assert np.max(np.abs(stereo)) < .9
assert np.max(np.abs(stereo[-200:])) < .01
output = Path('public/audio/sfx/megumin-explosion.wav')
output.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(output), 'wb') as stream:
    stream.setnchannels(2)
    stream.setsampwidth(2)
    stream.setframerate(RATE)
    stream.writeframes(pcm.tobytes())
print(f'{output}: {DURATION}s, stereo {RATE} Hz, peak -1 dBFS, impact {IMPACT}s')
