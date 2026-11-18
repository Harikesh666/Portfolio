/**
 * The bulbul's voice, synthesized with the Web Audio API.
 *
 * A red-vented bulbul's call is a short, cheery, bubbly whistle, the phrases
 * birders write as "be-care-ful", "ginger-beer" or "pick-pick-pikee": three
 * or four liquid notes between about 2 and 3 kHz, each slurring up or down.
 * Each note here is a sine that slides through its pitches with a quick
 * chip at its start and a little vibrato, plus a faint second harmonic for
 * brightness, under a soft attack and decay. No audio files are loaded.
 *
 * It only ever sounds after a reader taps the bird: the audio context is
 * created inside that tap, as browsers require, so nothing plays on load.
 */

export type Note = Readonly<{
    /** Seconds from the start of the phrase. */
    at: number;
    length: number;
    /** Pitches in hertz: where the note starts, where it turns (if it does), where it ends. */
    from: number;
    mid?: number;
    to: number;
}>;

type Shape = readonly (readonly [length: number, from: number, to: number, mid?: number, gap?: number])[];

/** The phrases, each a list of notes: length in seconds, pitches in hertz, and the gap before the next note. */
const phrases: readonly Shape[] = [
    // "be-care-ful"
    [[0.11, 2100, 2550, undefined, 0.07], [0.14, 2950, 2350, undefined, 0.08], [0.19, 2050, 2250, 2750]],
    // "ginger-beer"
    [[0.09, 2450, 2150, undefined, 0.05], [0.12, 2650, 3050, undefined, 0.08], [0.21, 2900, 2200]],
    // "pick-pick-pikee"
    [[0.055, 2800, 2650, undefined, 0.06], [0.055, 2850, 2700, undefined, 0.07], [0.17, 2450, 2600, 3100]],
    // "sweet-chee-wee"
    [[0.13, 2300, 2800, undefined, 0.06], [0.08, 3000, 2700, undefined, 0.05], [0.16, 2200, 2400, 2700]],
];

const random = (min: number, max: number) => min + Math.random() * (max - min);

/** One phrase, picked at random and sung a little higher or lower, a little quicker or slower, each time. */
export function bulbulPhrase(): Note[] {
    const shape = phrases[Math.floor(Math.random() * phrases.length)];
    const pitch = random(0.93, 1.07);
    const pace = random(0.9, 1.1);
    const notes: Note[] = [];
    let at = 0.03;
    for (const [length, from, to, mid, gap = 0] of shape) {
        notes.push({ at, length: length * pace, from: from * pitch, to: to * pitch, mid: mid === undefined ? undefined : mid * pitch });
        at += (length + gap) * pace;
    }
    return notes;
}

/** Schedules one note on any audio context, from `start` in that context's time. */
function whistle(context: BaseAudioContext, output: AudioNode, note: Note, start: number) {
    const t0 = start + note.at;
    const t1 = t0 + note.length;
    const glide = (frequency: AudioParam, scale: number) => {
        // A quick chip down into the note, then the slur through its pitches.
        frequency.setValueAtTime(note.from * 1.12 * scale, t0);
        frequency.exponentialRampToValueAtTime(note.from * scale, t0 + 0.014);
        if (note.mid !== undefined) {
            frequency.linearRampToValueAtTime(note.mid * scale, t0 + note.length * 0.45);
        }
        frequency.exponentialRampToValueAtTime(note.to * scale, t1);
    };
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, t0);
    envelope.gain.exponentialRampToValueAtTime(1, t0 + 0.012);
    envelope.gain.setValueAtTime(1, t1 - note.length * 0.35);
    envelope.gain.exponentialRampToValueAtTime(0.0001, t1);
    envelope.connect(output);

    const voice = context.createOscillator();
    voice.type = "sine";
    glide(voice.frequency, 1);
    voice.connect(envelope);

    const overtone = context.createOscillator();
    overtone.type = "sine";
    glide(overtone.frequency, 2);
    const overtoneLevel = context.createGain();
    overtoneLevel.gain.value = 0.12;
    overtone.connect(overtoneLevel).connect(envelope);

    // A fast, slight warble, as a bird's syrinx gives a whistle.
    const vibrato = context.createOscillator();
    vibrato.frequency.value = random(26, 34);
    const depth = context.createGain();
    depth.gain.value = note.from * 0.018;
    vibrato.connect(depth);
    depth.connect(voice.frequency);

    for (const oscillator of [voice, overtone, vibrato]) {
        oscillator.start(t0);
        oscillator.stop(t1 + 0.02);
    }
}

/** Schedules a whole phrase on any audio context, through a soft master level. */
export function singPhrase(context: BaseAudioContext, notes: readonly Note[], start: number) {
    const level = context.createGain();
    level.gain.value = 0.16;
    level.connect(context.destination);
    for (const note of notes) whistle(context, level, note, start);
}

/**
 * The bird's voice. `sing` must be called from inside a tap, so the browser
 * lets the audio context start; it does nothing where Web Audio is missing.
 * `delay` (seconds) schedules the phrase later on the same context, so a song
 * can wait for the bird to wake while still starting from the tap.
 */
export function createVoice() {
    let context: AudioContext | null = null;
    return {
        sing(notes: readonly Note[], delay = 0) {
            const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (!Context) return;
            context ??= new Context();
            if (context.state === "suspended") void context.resume();
            singPhrase(context, notes, context.currentTime + 0.02 + delay);
        },
        close() {
            void context?.close();
            context = null;
        },
    };
}
