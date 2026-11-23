import { CatmullRomCurve3, MathUtils, Vector3 } from 'three';
import { ARRIVAL_ROAD, groundHeight } from '../world/sceneryLayout.js';
import { EXIT_LANE, HIGHWAY, highwaySpur, SPUR_LENGTH } from '../world/HighwayLayout.js';

const cards = (kicker, rows) => Object.freeze(rows.map(([at, title, text]) => Object.freeze({ at, title, text, kicker })));
const copyAt = (rows, time) => rows.findLast(card => time >= card.at) ?? rows[0];
const cues = rows => Object.freeze(rows.map(Object.freeze));

export const FIX = Object.freeze({ bonnet: .48, tools: 1.28, close: 3.78, ignition: 4.65, cut: 5.42, end: 5.95 });
const FIX_CARDS = cards('अंतिम सफ़र · 05 / 05', [
  [0, 'रिंच काम आया', 'कृष ने बोनट उठाया और रवि ने ढीले जोड़ को रिंच से कस दिया।'],
  [FIX.ignition, 'इंजन चल पड़ा', 'इस बार इंजन बंद नहीं हुआ। अब जंगल की राह पकड़नी है।'],
]);
export const fixCopy = time => copyAt(FIX_CARDS, time);
export const FIX_CUES = cues([
  [FIX.bonnet, 'repair-hood'], [1.55, 'repair-ratchet'], [2.32, 'repair-ratchet'], [3.12, 'repair-seat'],
  [4.15, 'repair-hood'], [FIX.ignition, 'repair-crank'], [5.15, 'repair-catch'],
]);

const breakaway=26.38;
export const FINAL_RUN_SECONDS=20;
export const ESCAPE = Object.freeze({
  ranks: 2.65, cabin: 5.1, roll: 5.15, headlamps: 8.58, pursuit: 12.35, skid: 15.55,
  impact: 18.05, surround: 18.68, restart: 23.35, catch: 24.59, reverse: 24.82,
  breakaway, windshield:30.86, scare:32.04, brushShot:34.35, brush:35.18, shadows:38.42,
  dawn:41.12, junction:43.05, merge:breakaway+FINAL_RUN_SECONDS, highway:48.34, tail:51.64, cut:54.45, end:55.72,
});
const ESCAPE_CARDS = cards('अंतिम सफ़र · CRETA', [
  [0, 'गाँव जाग उठा', 'बत्तियाँ बुझीं। फिर हर गली से कदमों की आवाज़ आने लगी।'],
  [ESCAPE.ranks, 'वे दौड़ रहे हैं', 'नक़ाब, सफ़ेद चादरें और पेड़ों जैसे साये सड़क पर उमड़ पड़े।'],
  [ESCAPE.cabin, 'दोनों साथ हैं', 'कृष ने एक्सेलरेटर दबाया, रवि ने सीट बेल्ट कस ली। पीछे की सड़क पर साये ही साये थे।'],
  [ESCAPE.skid, 'कच्ची सड़क पर फिसलन', 'मोड़ पर पहिए फिसले। पीछे दौड़ते साये और पास आ गए।'],
  [ESCAPE.impact, 'पेड़ से टक्कर', 'CRETA रुक गई। इंजन चुप था और भागते कदम अब बहुत पास थे।'],
  [ESCAPE.restart, 'एक बार और', 'रवि: “Bruh… अभी नहीं!” कृष ने चाबी घुमाई, पर इंजन नहीं चला।'],
  [ESCAPE.catch, 'इंजन चल पड़ा!', 'कृष ने गाड़ी पेड़ से पीछे खींची, रवि ने रास्ता देखा।'],
  [ESCAPE.breakaway, 'आख़िरी दौड़', 'साये पीछे हैं। राजमार्ग तक बस बीस सेकंड और।'],
  [ESCAPE.scare, 'हेडलाइट में साया', 'झाड़ियों से कुछ निकल आया। कृष ने स्टीयरिंग मोड़ा, रवि ने उसका हाथ थाम लिया।'],
  [ESCAPE.brush, 'टहनी से टक्कर', 'नीची टहनी CRETA से टकराकर छिटक गई। इस बार गाड़ी नहीं रुकी।'],
  [ESCAPE.shadows, 'पीछे मत देखना', 'पेड़ों के बीच कुछ अब भी साथ दौड़ रहा था।'],
  [ESCAPE.dawn, 'सड़क पर रोशनी', 'पेड़ों के पार हेडलाइटों की कतार दिखी। साये जंगल में ही रह गए।'],
  [ESCAPE.junction, 'राजमार्ग सामने है', 'कृष ने रफ़्तार घटाई, रवि ने चलती गाड़ियों के बीच जगह देखी।'],
  [ESCAPE.merge, 'फिर से लोगों के बीच', 'CRETA राजमार्ग पर आ गई। ढाबे पर चाय बन रही थी और सुबह का ट्रैफ़िक चल पड़ा था।'],
]);
export const escapeCopy = time => copyAt(ESCAPE_CARDS, time);
export const ESCAPE_CUES = cues([
  [.42, 'car-key'], [ESCAPE.ranks-.1, 'stalker-crowd'], [ESCAPE.roll+.24, 'car-gravel'],
  [8.12, 'car-shift'], [11.66, 'car-gravel'], [ESCAPE.skid+.12, 'car-brake'],
  [ESCAPE.impact, 'car-tree-hit'], [ESCAPE.impact+.39, 'car-cough'], [ESCAPE.impact+1.28, 'stalker-tree'],
  [ESCAPE.restart+.16, 'car-key'], [ESCAPE.restart+.32, 'car-crank'],
  [ESCAPE.catch-.20, 'car-crank'], [ESCAPE.catch, 'car-catch'], [ESCAPE.reverse, 'car-shift'],
  [ESCAPE.breakaway+.29, 'car-gravel'], [30.06, 'car-shift'], [ESCAPE.scare+.10, 'car-brake'],
  [ESCAPE.brush, 'car-branch'], [ESCAPE.brush+.19, 'car-rattle'], [39.12, 'car-gravel'],
  [ESCAPE.merge-.10, 'car-passing'], [ESCAPE.merge+.27, 'car-shift'], [ESCAPE.highway+.45, 'car-passing'],
]);
export const ESCAPE_END = Object.freeze({
  kicker: '06:42 · राजमार्ग का ढाबा', title: '“साहब… आप अकेले थे।”',
  text: 'ढाबे वाले ने चाय रखी और पूछा, “किसके साथ थे?” कृष ने कहा, “अपने दोस्त रवि के साथ।” दुकानदार उसके चेहरे को देखता रहा, फिर धीरे से बोला, “साहब… आपकी गाड़ी में तो आप अकेले थे।”',
});

// The ending keeps playing after the chase. Every card quietly replaces what
// the previous one let you believe; the last one is not part of the escape at
// all. ESCAPE_END stays the object shown the instant the chase cuts, so saved
// games and the chapter tests keep a stable first frame.
export const ENDING = Object.freeze({
  photo: 5.4, phone: 10.2, reveal: 15.4, radio: 20.8, credits: 26.2, end: 33,
});
const LATER_ENDING_CARDS = cards('आख़िरी सिग्नल', [
  [ENDING.photo, 'फ़ोटो में अब दो हैं', 'पिछली सीट पर वही तस्वीर पड़ी थी — पर इसमें अब तीन नहीं, सिर्फ़ कृष और दादा हैं। पीठ पर लिखा है: “रवि को हमने कभी गाँव से बाहर जाने नहीं दिया।”'],
  [ENDING.phone, 'RAVI\'S PHONE CONNECTED', 'ब्लूटूथ अपने आप जुड़ गया। कृष के फ़ोन पर रवि का मैसेज आया: “भाई, घर पहुँचकर कॉल करना। पिछली सीट पर मैं ठीक से सो नहीं पाया।”'],
  [ENDING.reveal, 'पिछली सीट', 'कृष ने रियर-व्यू मिरर में देखा। रवि वहीं बैठा था, सिर नीचे झुके। फिर उसने धीरे से सिर उठाया और मुस्कुराकर कहा: “अब अगली बार अकेले मत आना, कृष।”'],
  [ENDING.radio, 'THE END?', 'रेडियो पर वही बूढ़ी आवाज़ लौट आई: “गाँव से दो लोग निकले थे… लेकिन वापस सिर्फ़ एक आया था।”'],
  [ENDING.credits, 'रात 11:59 · वही सड़क', 'वही CRETA गाँव की उसी बिना नाम वाली सड़क पर वापस आती है। ड्राइवर सीट पर कोई नहीं। इंजन चालू है। रेडियो बोल उठता है: “तीसरा मेहमान पहुँच गया है।” अब गाँव को एक और मेहमान मिल गया है।'],
]);
export const ENDING_CARDS = Object.freeze([ESCAPE_END, ...LATER_ENDING_CARDS]);
export const endingCopy=time=>copyAt(ENDING_CARDS,time);
export const ENDING_CUES=cues([
  [ENDING.photo,'radio-static'],[ENDING.phone,'car-key'],[ENDING.reveal,'ending-voice'],
  [ENDING.radio,'radio-static'],[ENDING.credits,'radio-static'],
]);

// The cut after Krish shuts the bonnet skips his turn in the turnout. From
// there the car follows the real arrival road back to the edge of the forest.
const points = [[.72,13.12],[.08,17.2],...ARRIVAL_ROAD.path.slice().reverse()];
export const escapeCurve = new CatmullRomCurve3(points.map(([x,z]) => new Vector3(x,groundHeight(x,z),z)));
escapeCurve.arcLengthDivisions = 1024;
export const FOREST_ESCAPE_LENGTH = escapeCurve.getLength();
export const MERGE_DISTANCE = FOREST_ESCAPE_LENGTH + SPUR_LENGTH;
export const ESCAPE_LENGTH = MERGE_DISTANCE + 106.5;

// This is a real trunk on the left of the arrival road, not a tree pasted
// into the shot. The bumper stops at its near edge; the CRETA backs off it.
export const IMPACT_TREE = Object.freeze({ x:-73.02822615167405, z:24.458005305199265, distance:89.567, offset:-2.973924465287302, radius:.23173662426519953 });
const atTree = IMPACT_TREE.distance;
const course = [ // t, distance along road, metres per second at the knot
  [ESCAPE.roll,0,0],[8.44,16.4,9.35],[ESCAPE.pursuit,51.8,9.3],[ESCAPE.skid,81.5,8.4],
  [ESCAPE.impact,atTree,2.65],[ESCAPE.reverse,atTree,0],[ESCAPE.breakaway,87.9,0],
  [29.25,108.5,9.8],[ESCAPE.scare,134.7,9.66],[ESCAPE.brush,165.2,8.45],
  [ESCAPE.shadows,196.3,10.32],[ESCAPE.dawn,224.0,9.36],[44.15,MERGE_DISTANCE-17.6,7.58],
  [ESCAPE.merge,MERGE_DISTANCE,9.64],[ESCAPE.highway,MERGE_DISTANCE+21.5,11.8],
  [ESCAPE.tail,MERGE_DISTANCE+60,12.2],[ESCAPE.end,ESCAPE_LENGTH,12.4],
];

export function escapeMotion(time) {
  const [a,d0,v0] = course.findLast(([t]) => time >= t) ?? course[0];
  const after = course.find(([t]) => t > Math.max(a,time));
  let distance = d0, velocity = 0;
  if (after && time > a) {
    const [b,d1,v1] = after, n = b-a, u = (time-a)/n, delta = d1-d0;
    // Hermite spline with authored velocities: brakes, holds, reverses and
    // accelerates without a teleport at an editorial camera cut.
    const c = 3*delta-(2*v0+v1)*n, d = -2*delta+(v0+v1)*n;
    distance = d0 + u*(v0*n+u*(c+u*d));
    velocity = v0 + u*(2*c+3*u*d)/n;
  } else if (time === a) velocity = v0;
  // The incoming spline keeps speed up to contact. The trunk, not the
  // brakes, takes that last bit of momentum. Hold until the reverse gear.
  if(time >= ESCAPE.impact && time <= ESCAPE.reverse){distance=atTree;velocity=0;}
  const skid = MathUtils.smoothstep(time,ESCAPE.skid,ESCAPE.impact);
  const back = MathUtils.smoothstep(time,ESCAPE.reverse,ESCAPE.breakaway+.26);
  const twist = dodge(time,ESCAPE.scare,.06,.28,1.12), scrape=dodge(time,ESCAPE.brush,.14,.12,.67);
  return {
    position:distance/ESCAPE_LENGTH, distance, velocity, speed:Math.min(1,Math.abs(velocity)/10.2),
    offset:IMPACT_TREE.offset*skid*(1-back)-.63*twist-.28*scrape,
    steering:-.31*Math.sin(Math.PI*skid)*(1-back)-.108*twist+.061*scrape,
  };
}

function dodge(t,at,delay,rise,recover){
  return MathUtils.smoothstep(t,at+delay,at+delay+rise)*(1-MathUtils.smoothstep(t,at+delay+rise,at+recover));
}

export function escapeRoad(distance, position, direction) {
  if(distance>=MERGE_DISTANCE){direction.set(0,0,1);return position.set(EXIT_LANE.x,0,HIGHWAY.mergeZ+(distance-MERGE_DISTANCE));}
  if(distance>FOREST_ESCAPE_LENGTH){
    const u=(distance-FOREST_ESCAPE_LENGTH)/SPUR_LENGTH;
    highwaySpur.getPointAt(u,position);highwaySpur.getTangentAt(u,direction);return position;
  }
  const u=MathUtils.clamp(distance/FOREST_ESCAPE_LENGTH,0,1);
  escapeCurve.getPointAt(u,position);escapeCurve.getTangentAt(u,direction);
  if(distance<0)position.addScaledVector(direction,distance);
  return position;
}

export function escapeShot(t) {
  if (t >= ESCAPE.tail) return 'tail';
  if (t >= ESCAPE.highway) return 'highway';
  if (t >= ESCAPE.junction) return 'junction';
  if (t >= ESCAPE.dawn) return 'dawn';
  if (t >= ESCAPE.shadows) return 'last-shadows';
  if (t >= ESCAPE.brushShot) return 'brush';
  if (t >= ESCAPE.windshield) return 'windshield';
  if (t >= ESCAPE.breakaway) return 'breakaway';
  if (t >= ESCAPE.restart) return 'restart';
  if (t >= ESCAPE.surround) return 'surround';
  if (t >= ESCAPE.skid) return 'skid';
  if (t >= ESCAPE.pursuit) return 'pursuit';
  if (t >= ESCAPE.headlamps) return 'headlamps';
  if (t >= ESCAPE.cabin) return 'cockpit';
  return t >= ESCAPE.ranks ? 'ranks' : 'village';
}

export const escapeDaylight = time => .94*MathUtils.smoothstep(time,ESCAPE.dawn-1.7,ESCAPE.merge+.8);
export const escapeVolume = time => .41 + .38*MathUtils.smoothstep(time,3.4,7.85)
  - .47*MathUtils.smoothstep(time,ESCAPE.impact,ESCAPE.impact+.53)
  + .45*MathUtils.smoothstep(time,ESCAPE.catch,ESCAPE.breakaway+1.35)
  - .24*MathUtils.smoothstep(time,ESCAPE.merge-.38,ESCAPE.highway+.24)
  - .51*MathUtils.smoothstep(time,ESCAPE.cut-.65,ESCAPE.end);

export function escapeMotor(time, {speed} = escapeMotion(time)) {
  const stopped = time >= ESCAPE.impact && time < ESCAPE.catch;
  const brake = MathUtils.smoothstep(time,ESCAPE.skid,ESCAPE.impact);
  const rev = time<ESCAPE.impact?1-.38*brake:1;
  const shift = Math.max(0,1-Math.abs(time-8.12)/.42,1-Math.abs(time-30.06)/.51,1-Math.abs(time-(ESCAPE.merge+.27))/.68);
  const crowd = MathUtils.smoothstep(time,.85,ESCAPE.roll)*(.48+.48*MathUtils.smoothstep(time,ESCAPE.skid,ESCAPE.impact+1.7))
    *(1-MathUtils.smoothstep(time,ESCAPE.shadows-.85,ESCAPE.dawn));
  const paved = MathUtils.smoothstep(time,ESCAPE.dawn,ESCAPE.merge);
  const fade = 1-MathUtils.smoothstep(time,ESCAPE.cut,ESCAPE.end);
  return {speed:speed*fade,rpm:35+speed*rev*(29-paved*9)-shift*11,load:stopped?0:(.22+.49*speed-shift*.15)*fade,crowd,paved};
}


export function escapeJolt(t) {
  const impact=t-ESCAPE.impact, branch=t-ESCAPE.brush;
  const hit=impact>=0&&impact<1.1?Math.sin(impact*21)*Math.exp(-impact*6.8):0;
  const scrape=branch>=0&&branch<.72?Math.sin(branch*38)*Math.exp(-branch*8.6):0;
  return hit+scrape*.38;
}
