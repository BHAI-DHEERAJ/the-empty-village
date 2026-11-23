import { HOUSE_CLUES, HOUSE_CLUE_BY_SITE } from './HouseClues.js';

export const CHAPTER_TITLE = 'आख़िरी सिग्नल';
// The letter Krish reads on the drive. A second line is revealed in Act 4 —
// the horror is in what the paper says once you look at it again.
export const LETTER = 'अगर कभी रास्ता बंद मिले, तो उसी रास्ते जाना जिसे तुम पहचानते नहीं हो। और अगर गाँव में कोई तुम्हें तुम्हारे नाम से बुलाए, तो जवाब मत देना।';
export const LETTER_REVEAL = 'रवि को गाँव से बाहर मत ले जाना।';
export const SAVE_KEY = 'sastrod-kalana-chapter-v1';
export const ESCAPE_CHEAT_NUMBER = '123450';
const SAVE_VERSION = 3;
export const CRETA_RETURN = Object.freeze({
  id: 'repair-creta', site: 'creta', kind: 'repair', district: 'गाँव की चौखट', title: 'CRETA तक लौटो',
  hint: 'हरी राह से गाड़ी तक लौटो। चमकते बोनट पर रिंच इस्तेमाल करो — चिट्ठी की आख़िरी लाइन याद है?',
});
const clue = (site, district, title, hint) => ({ ...HOUSE_CLUE_BY_SITE.get(site), district, title, hint });

// Five investigation missions. The wrench, return trip, and escape make up
// the ending, not an additional numbered mission.
export const MISSIONS = Object.freeze([
  clue('centre-01', 'गाँव की मुख्य गली', 'दादा की डायरी पढ़ो', 'मुख्य गली में दादा के घर जाओ। दीवारों पर नाखून से लिखा पढ़ो, फिर मेज़ पर चमकती लाल डायरी उठाओ।'),
  clue('forest-04', 'पश्चिम का जंगल', 'बारिश वाली झोपड़ी सुनो', 'पश्चिम की पगडंडी से टूटी झोपड़ी तक जाओ। अंदर चमकती पुरानी रिकॉर्डिंग सुनो।'),
  clue('farmland-04', 'नहर के पार खेत', 'खलिहान की तस्वीर देखो', 'पूर्व के खेतों में पुल से नहर पार करो। खलिहान के घर में चमकती तस्वीर देखो।'),
  {
    id: 'witness-tape', kind: 'tape', site: 'school', tape: 'tape-intro', district: 'गाँव का स्कूल',
    title: 'स्कूल की 2011 रिकॉर्डिंग सुनो', hint: 'स्कूल के सामने का दरवाज़ा खोलो। गलियारे में चमकता टेप चलाओ या उसका संदेश पढ़ो।',
    item: 'मीरा की रिकॉर्डिंग', text: 'मीरा: “इस गाँव में एक चीज़ आवाज़ और यादें नकल कर सकती है। हमने सारी घड़ियाँ एक ही समय बंद कीं, पर एक गलती हुई। कृष… अगर तुम्हारे साथ रवि है, तो उसे स्कूल के बाहर मत जाने देना।” रवि ने पूछा, “मीरा कौन है?” कृष: “मुझे नहीं पता।”',
  },
  {
    id: 'mansion-signal', kind: 'operate', site: 'mansion-01', district: 'पुरानी बस्ती और हवेली',
    title: 'हवेली का आख़िरी रेडियो', hint: 'पुरानी बस्ती से होकर हवेली जाओ। अंदर चमकते ट्रांसमीटर से जवाब माँगो।',
    item: 'रिंच मिल गया', text: '“कृष, तुम्हारा संदेश मिल गया। लेकिन तुम अकेले क्यों नहीं आए?” … “कृष… तुम्हारे साथ कोई रवि नहीं है।” रवि के पीछे एक लंबा साया — कृष मुड़ा तो रवि मुस्कुरा रहा था: “भाई, चल अब।” रेडियो पर रखा रिंच अब साथ है।',
  },
].map(Object.freeze));
const missionIndex = new Map(MISSIONS.map(({ id }, i) => [id, i]));
const oldClueIndex = new Map(HOUSE_CLUES.map(({ id }, i) => [id, i]));
const oldAfterClues = new Set(['last-tape', 'take-repair-kit', 'fix-creta', 'start-creta', 'outrun-ghosts', 'restart-creta', 'escape-forest']);
const oldWalking = new Set(['roadside-repair', 'search-shelter', 'spare-fuse', 'start-beacon', 'photo-code', 'call-meera', 'unlock-relay',
  'prime-pump', 'drain-crossing', 'take-weight', 'lift-crossing', 'charge-battery', 'take-battery', 'school-door',
  'install-battery', 'take-aerial', 'raise-aerial', 'tune-band', 'send-report', 'witness-tape']);
const fresh = () => ({ opening: 'new', progress: 0, checkpoint: null, ending: 'none' });
const safeCheckpoint = (value) => Array.isArray(value) && value.length === 4 && value.every(Number.isFinite) ? value : null;
const endingStages = new Set(['wrench', 'repairing', 'escaping', 'escaped']);

function loadProgress(save) {
  if (save?.version === 2 || save?.version === SAVE_VERSION) {
    if (save.opening === 'repair') return { ...fresh(), opening: 'repair' };
    if (save.opening === 'play' && Number.isInteger(save.progress) && save.progress >= 0 && save.progress <= MISSIONS.length) {
      // A completed five-mission save from before the finale gets its wrench.
      const ending = save.progress < MISSIONS.length ? 'none' :
        save.version === SAVE_VERSION && endingStages.has(save.ending) ? save.ending : 'wrench';
      return { opening: 'play', progress: save.progress, checkpoint: safeCheckpoint(save.checkpoint), ending };
    }
    return fresh();
  }
  if (save?.lastStep === 'leave-car') return { ...fresh(), opening: 'repair' };
  const last = oldAfterClues.has(save?.lastStep) ? HOUSE_CLUES.length : oldClueIndex.get(save?.lastStep);
  if (last == null && !oldWalking.has(save?.lastStep)) return fresh();
  // The old story visited its fields and school before the woods. Only
  // credit the contiguous prefix of the NEW route; nobody has sent its call.
  const progress = last >= oldClueIndex.get('clue/forest-04') ? 4 : last >= oldClueIndex.get('clue/centre-01') ? 1 : 0;
  return { ...fresh(), opening: 'play', progress, checkpoint: safeCheckpoint(save.checkpoint) };
}

export class ChapterLog {
  constructor(storage = null, { seed = () => Math.floor(Math.random() * 0x100000000) } = {}) {
    this.storage = storage;
    this.makeSeed = seed;
    this.steps = MISSIONS;
    this.index = missionIndex;
    let save;
    try { save = JSON.parse(storage?.getItem(SAVE_KEY) ?? 'null'); } catch { /* Storage is optional. */ }
    Object.assign(this, loadProgress(save));
    this.seed = Number.isInteger(save?.seed) && save.seed >= 0 && save.seed <= 0xffffffff ? save.seed : seed() >>> 0;
  }

  get hasSave() { return this.opening !== 'new'; }
  get current() { return this.steps[this.progress] ?? null; }
  get finished() { return this.progress === this.steps.length; }
  get hasWrench() { return this.ending === 'wrench'; }
  get escaped() { return this.ending === 'escaped'; }
  has(id) { const index = this.index.get(id); return index != null && index < this.progress; }
  canComplete(id) { return this.opening === 'play' && this.current?.id === id; }

  beginRepair() {
    if (this.opening !== 'new') return;
    this.opening = 'repair'; this.#store();
  }

  finishOpening() {
    if (this.opening !== 'repair') return;
    this.opening = 'play'; this.#store();
  }

  complete(id, checkpoint) {
    if (!this.canComplete(id)) return null;
    const mission = this.current;
    this.#recordProgress(this.progress + 1, checkpoint);
    return mission;
  }

  // The dialer shortcut awards the same finale state as the radio. It never
  // completes the escape or overwrites a finale checkpoint on a repeat call.
  skipInvestigation(checkpoint) {
    if (this.opening !== 'play' || this.finished) return false;
    this.#recordProgress(this.steps.length, checkpoint);
    return true;
  }

  #recordProgress(progress, checkpoint) {
    this.progress = progress;
    if (this.finished) this.ending = 'wrench';
    this.checkpoint = safeCheckpoint(checkpoint) ?? this.checkpoint;
    this.#store();
  }

  beginCarRepair(checkpoint) {
    if (!this.hasWrench) return false;
    this.ending = 'repairing';
    this.checkpoint = safeCheckpoint(checkpoint) ?? this.checkpoint;
    this.#store();
    return true;
  }

  beginEscape() {
    if (this.ending !== 'repairing') return false;
    this.ending = 'escaping';
    this.#store();
    return true;
  }

  finishEscape() {
    if (this.ending !== 'escaping') return false;
    this.ending = 'escaped';
    this.#store();
    return true;
  }

  restart() {
    Object.assign(this, fresh());
    this.seed = this.makeSeed() >>> 0;
    try { this.storage?.removeItem(SAVE_KEY); } catch { /* Play still works without storage. */ }
  }

  #store() {
    const { seed, opening, progress, checkpoint, ending } = this;
    try { this.storage?.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, seed, opening, progress, checkpoint, ending })); }
    catch { /* Progress remains available in memory. */ }
  }
}
