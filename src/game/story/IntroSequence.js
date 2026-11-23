import { LETTER } from './VillageChapter.js';
import { RADIO_TRACK } from '../audio/RadioTrack.js';
import { VILLAGE_NAME } from '../world/VillageName.js';

// A minute of real story time. The camera, engine and radio use the same clock.
export const INTRO=Object.freeze({roll:.54,letter:6.2,dial:13.5,letterBack:21,trees:29,milestone:37.5,homes:45.5,sign:53.2,brake:55.3,end:60});
export const CAR_CAPTIONS=Object.freeze([
  [0,'वह रास्ता जो नक्शे पर नहीं था','मुख्य सड़क बंद मिली। Google Maps पर एक बिना नाम वाली सड़क दिखाई दी — रवि ने मज़ाक में कहा, “भाई, ये रास्ता तो Maps पर भी नहीं होना चाहिए।” कृष ने CRETA उसी तरफ़ मोड़ी।'],
  [INTRO.letter,'दादा की चिट्ठी',`“${LETTER}” लिफ़ाफ़े पर कृष का नाम था, मगर कोई तारीख़ नहीं।`],
  [INTRO.dial,'रेडियो पर बूढ़ी आवाज़',`रेडियो अपने आप चल उठा — “${RADIO_TRACK.title}” के बीच में एक बूढ़ी आवाज़ बोली, “आज रात गाँव में दो मेहमान आने वाले हैं। उनमें से एक पहले भी यहाँ आ चुका है।” रवि ने रेडियो बंद कर दिया।`],
  [INTRO.letterBack,'पिछले स्पीकर से फुसफुसाहट','रेडियो बंद हो गया, पर पिछले स्पीकर से फुसफुसाहट आई — “कृष… तुम वापस क्यों आए?” कृष ने शीशे में देखा। रवि वहीं बैठा था, जैसे कुछ हुआ ही नहीं।'],
  [INTRO.trees,'खिड़की पर खरोंच','एक टहनी शीशे से रगड़ी। उसी वक़्त डैशबोर्ड पर इंजन की पीली बत्ती जल गई और बारिश और तेज़ हो गई।'],
  [INTRO.milestone,'जाना-पहचाना मोड़',`पत्थर पर ${VILLAGE_NAME} का नाम दिखा। बचपन में दादा इसी मोड़ पर उसे बस से लेने आते थे — पर नक्शे पर ये गाँव कहीं नहीं था।`],
  [INTRO.homes,'गाँव की चौखट','पेड़ पीछे छूटे। इंजन हर मोड़ पर झटका देने लगा। अँधेरा ऐसा जैसे रात के नौ बजे हों। गाँव में एक भी जली हुई बत्ती नहीं दिखी।'],
  [INTRO.sign,'गाँव का बोर्ड',`सामने ${VILLAGE_NAME} का बोर्ड था। दरवाज़े खुले थे, हर घर में थाली रखी थी — पर कोई इंसान नहीं। गाड़ी पटरी पर पहुँची तो खड़खड़ाहट बढ़ गई।`],
].map(([at,title,text],i)=>Object.freeze({at,title,text,kicker:`सफ़र  ·  ${i+1} / 8`})));
export const CAR_ARRIVAL=Object.freeze({kicker:`${VILLAGE_NAME}  ·  16:40`,title:'इंजन रुक गया।',text:'गाँव में कोई नहीं मिला। कृष और रवि गाड़ी से उतरकर इंजन सँभालने की कोशिश करेंगे।'});

export const SHIFTS=Object.freeze([4.21,26.2,47.1]);
export const CAR_BEATS=Object.freeze([
  [.10,'car-key'], [.32,'car-crank'], [SHIFTS[0],'car-shift'], [8.84,'car-gravel'],
  [INTRO.dial,'car-radio'], [18.3,'car-rattle'], [INTRO.letterBack+.5,'car-letter'],
  [SHIFTS[1],'car-shift'], [INTRO.trees+.24,'car-branch'], [34.0,'car-gravel'],
  [40.95,'car-rattle'], [SHIFTS[2],'car-shift'], [51.2,'car-gravel'],
  [INTRO.brake+.43,'car-brake'], [INTRO.end-1.08,'car-cough'],
].map(Object.freeze));

const accel=3.4, rampEnd=INTRO.roll+accel, braking=INTRO.end-INTRO.brake;
const total=accel*.5+INTRO.brake-rampEnd+braking*.5;

// Arc-length fraction from the integral of acceleration, cruise and brake.
export function carMotion(time){
  if(time<=INTRO.roll)return {position:0,speed:0};
  if(time<rampEnd){
    const age=time-INTRO.roll;
    return {position:age**2/(2*accel*total),speed:age/accel};
  }
  if(time<INTRO.brake)return {position:(accel*.5+time-rampEnd)/total,speed:1};
  const remaining=Math.max(0,INTRO.end-time);
  return {position:1-remaining**2/(2*braking*total),speed:remaining/braking};
}
