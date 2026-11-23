import { Vector3 } from 'three';
import { CAR_EXIT, PARKED, REPAIR_STANCE } from './StoryCar.js';
import { CAR_ARRIVAL, CAR_BEATS, CAR_CAPTIONS, INTRO } from './IntroSequence.js';
import { repairCopy, repairDaylight, REPAIR, REPAIR_CUES } from './RepairSequence.js';
import { ENDING, ENDING_CUES, ESCAPE, ESCAPE_CUES, ESCAPE_END, endingCopy, escapeCopy, escapeDaylight, FIX, FIX_CUES, fixCopy } from './CretaFinale.js';
import { CRETA_RETURN, ESCAPE_CHEAT_NUMBER } from './VillageChapter.js';
import { CAMERA, PLAYER, WORLD } from '../settings.js';

const engine = new Vector3(PARKED.x, 1.02, PARKED.z-1.52);
const scenes = {
  drive: { end: INTRO.end, cues: CAR_BEATS, copy: time => CAR_CAPTIONS.findLast(({at}) => time >= at) },
  repair: { end: REPAIR.end, cues: REPAIR_CUES, copy: repairCopy, source: engine },
  'final-repair': { end: FIX.end, cues: FIX_CUES, copy: fixCopy, source: engine },
  escape: { end: ESCAPE.end, cues: ESCAPE_CUES, copy: escapeCopy },
};

export class ChapterDirector {
  constructor({ log, world, emit = () => {}, sound = () => {}, openTape = () => {} }) {
    this.log = log; this.world = world; this.car = world.story.car;
    this.emit = emit; this.sound = sound; this.openTape = openTape;
    this.mode = 'menu'; this.modeTime = 0; this.copy = null;
    this.repairFrom = new Vector3();
    this.car.park();
    this.#syncReward();
  }

  get cinematic() { return this.mode !== 'play'; }
  get daylight() {
    if (this.mode === 'repair') return repairDaylight(this.modeTime);
    if (this.mode === 'menu') return .21;
    if (this.mode === 'escape' || this.mode === 'ending') return escapeDaylight(this.mode==='ending'?ESCAPE.end:this.modeTime);
    return this.mode === 'drive' || this.mode === 'arrived' ? 1 : 0;
  }
  get clock() {
    if (this.mode === 'repair') return this.copy.clock;
    if (this.mode === 'ending') return this.modeTime >= ENDING.credits ? '23:59' : '05:12';
    if (this.mode === 'escape') return this.modeTime>=ESCAPE.merge?'05:12':this.modeTime>=ESCAPE.dawn?'05:11':'19:53';
    if (this.mode === 'final-repair') return '19:52';
    if (this.mode === 'play') return this.log.finished ? '19:42' : '19:10';
    return '16:40';
  }
  get target() {
    const id = this.log.current?.id ?? (this.log.hasWrench ? CRETA_RETURN.id : null);
    return this.world.story.anchors.get(id) ?? null;
  }

  #syncReward() {
    if (this.world.story.wrench) this.world.story.wrench.visible = !this.log.finished;
  }

  #scene(mode, copy = scenes[mode]?.copy(0)) {
    this.mode = mode; this.modeTime = 0; this.copy = copy;
  }

  start() {
    if (this.mode !== 'menu') return false;
    this.#syncReward();
    if (this.log.escaped) this.#scene('ending', ESCAPE_END);
    else if (this.log.ending === 'escaping') this.#scene('escape');
    else if (this.log.ending === 'repairing') this.#beginFinalRepair();
    else if (this.log.opening === 'play') this.#scene('play');
    else if (this.log.opening === 'repair') this.#beginRepair(false);
    else this.#scene('drive');
    return true;
  }

  advance(dt) {
    // The ending is a staged epilogue, not another cut scene: it keeps running
    // from the highway into the dhaba, the rear seat and the post-credits road.
    if (this.mode === 'ending') {
      const before = this.modeTime;
      this.modeTime = Math.min(before + dt, ENDING.end);
      for (const [at, cue] of ENDING_CUES) {
        if (before < at && at <= this.modeTime) this.sound(cue);
      }
      this.copy = endingCopy(this.modeTime);
      return;
    }
    const scene = scenes[this.mode];
    if (!scene) return;
    const before = this.modeTime;
    this.modeTime = Math.min(before + dt, scene.end);
    const late = this.mode==='escape'?1.20:.78;
    for (const [at, cue] of scene.cues) {
      if (before < at && at <= this.modeTime && this.modeTime - at < late) this.sound(cue, scene.source);
    }
    this.copy = scene.copy(this.modeTime);
    if (this.modeTime !== scene.end) return;
    switch (this.mode) {
      case 'drive':
        this.mode = 'arrived'; this.copy = CAR_ARRIVAL; this.sound('car-stop');
        break;
      case 'repair':
        this.car.park(); this.log.finishOpening(); this.#scene('play');
        break;
      case 'final-repair':
        this.log.beginEscape(); this.#scene('escape');
        break;
      case 'escape':
        this.log.finishEscape(); this.#scene('ending', ESCAPE_END);
        break;
    }
  }

  exit() { if (this.mode === 'arrived') this.#beginRepair(true); }
  #beginRepair(fresh) {
    this.#scene('repair');
    this.log.beginRepair();
    if (fresh) this.sound('car-door', new Vector3(PARKED.x, 1.1, PARKED.z));
  }

  #beginFinalRepair(from) {
    if (from) this.repairFrom.copy(from);
    else this.repairFrom.set(REPAIR_STANCE.x, REPAIR_STANCE.y+CAMERA.eye, REPAIR_STANCE.z);
    this.#scene('final-repair');
  }

  restorePlayer(player, camera) {
    const { collision } = this.world;
    const [x, y, z, yaw] = this.log.checkpoint ?? [CAR_EXIT.x, CAR_EXIT.y, CAR_EXIT.z, .29];
    const p = new Vector3(x, y, z), ideal = p.clone();
    collision.resolve(p, new Vector3());
    const safe = Math.abs(x) < WORLD.limit && Math.abs(z) < WORLD.limit && Math.abs(y - collision.supportAt(x,z,y + PLAYER.step)) < .037 &&
      collision.headroomAt(x,z,y + .005) && p.distanceToSquared(ideal) < .003 ** 2;
    player.position.copy(safe ? ideal : CAR_EXIT); player.grounded = true; player.velocity.set(0, 0, 0);
    camera.yaw = camera.targetYaw = safe ? yaw : .29; camera.pitch = camera.targetPitch = CAMERA.initialPitch;
    camera.reset(player.position);
  }

  #checkpoint(player, heading) {
    if (!player?.grounded) return null;
    const {x, y, z} = player.position;
    return [x, y, z, heading];
  }

  #complete(id, player, heading) {
    const mission = this.log.complete(id, this.#checkpoint(player, heading));
    if (!mission) return;
    if (this.log.finished) this.#syncReward();
    this.emit(mission, { finished: this.log.finished });
  }

  use(action, player, yaw, eye) {
    if (this.cinematic) return;
    if (action.id === CRETA_RETURN.id && action.kind === 'car-repair') {
      const p = player.position;
      if (player.grounded && this.log.beginCarRepair([p.x, p.y, p.z, yaw])) this.#beginFinalRepair(eye);
      return;
    }
    if (action.kind === 'house-clue') {
      this.emit(action.evidence, { readAgain: true });
      return;
    }
    if (action.kind !== 'chapter') return;
    const id = action.objective, mission = this.log.steps[this.log.index.get(id)];
    if (!mission) return;
    const current = this.log.canComplete(id);
    if (!current && !this.log.has(id)) return;
    if (mission.tape) this.openTape(mission.tape, current ? () => this.#complete(id, player, yaw) : undefined);
    else if (current) this.#complete(id, player, yaw);
    else this.emit(mission, { readAgain: true });
  }

  phoneAction(type, contact, player, heading) {
    if (this.cinematic) return { message: 'अभी फ़ोन नहीं खोल सकते।' };
    if (type === 'dial') {
      if (contact !== ESCAPE_CHEAT_NUMBER) return { message: 'इस नंबर पर कॉल नहीं लगी।' };
      if (!this.log.skipInvestigation(this.#checkpoint(player, heading))) {
        return { message: 'पाँचों मिशन पहले ही पूरे हैं।' };
      }
      this.#syncReward();
      return {
        skipped: true, cue: 'signal-clear',
        message: 'चीट चालू · 05 / 05 मिशन पूरे। रिंच मिल गया। फ़ोन बंद करो, फिर नक्शे से CRETA तक लौटो।',
      };
    }
    if (type === 'photo') return { capture: true, message: 'नई तस्वीर गैलरी में है। पीछे कोई और आ गया है क्या?' };
    if (contact === 'ravi') return { cue: 'radio-static', voice: 'stalker-first', message: 'रवि की आवाज़ फ़ोन के उस छोर से: “कृष, रेडियो चालू रखना। मैं तुम्हारी आवाज़ सुन रहा हूँ… पर तुम्हारी साँसों के साथ और कोई साँस भी।”' };
    if (contact === 'tara') return { cue: 'ghost-whisper', message: 'बूढ़ी आवाज़: “दो मेहमान आए थे। एक पहले भी यहाँ आ चुका था। तीसरा अभी आएगा।”' };
    if (contact !== 'meera') return { message: contact === 'dada' ? 'कॉल नहीं लगी। दादा की चिट्ठी अब भी फ़ोन में है — पीछे वाली लाइन दोबारा पढ़ो।' : 'गैराज का नंबर बंद है। रवि फिर भी साथ है, है न?' };
    if (this.log.hasWrench) return { cue: 'signal-clear', message: 'मीरा: “संदेश मिल गया, कृष। रिंच से CRETA ठीक करो और जंगल की सड़क से बाहर निकलो। रवि को अंदर ही रखना।”' };
    return { message: 'यहाँ फ़ोन का सिग्नल नहीं है। मदद के लिए हवेली का रेडियो इस्तेमाल करो।' };
  }
}
