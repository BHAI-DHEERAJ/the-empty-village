import { MathUtils } from 'three';

export const REPAIR=Object.freeze({end:16.1,bonnet:1.05,tools:3.1,tryEngine:9.65,sputter:11.0,stall:12.1,close:14.35});
const REPAIR_CAPTIONS=[
  [0,'16:40','सड़क के किनारे','कृष ने बोनट उठाया और रवि ने औज़ार का डिब्बा खोला। आधे औज़ार गायब थे।'],
  [2.95,'17:25','इंजन की मरम्मत','रवि: “भाई, ये पेचकस तो पहले नहीं था।” कृष ने जोड़ कसा। पीछे से उसी की आवाज़ आई, “थोड़ा और दूर जाओ।” पलटकर देखा — रवि वहीं था।'],
  [7.05,'18:31','आख़िरी कोशिश','औज़ार समेटकर उसने इंजन फिर चालू किया। रेडियो बंद था, फिर भी बूढ़ी आवाज़ आई, “दो मेहमान… एक पहले भी आ चुका है।”'],
  [12.05,'19:10','अब गाँव चलना होगा','इंजन एक पल चला, फिर बंद पड़ गया। ज़रूरी पुर्ज़े गायब हैं। अँधेरा हो गया है — स्कूल की ओर निशान ढूँढो।'],
].map(([at,clock,title,text])=>Object.freeze({at,clock,title,text,kicker:`सड़क पर मरम्मत · ${clock}`}));
export const repairCopy=time=>REPAIR_CAPTIONS.findLast(card=>time>=card.at)??REPAIR_CAPTIONS[0];
export const repairDaylight=time=>1-MathUtils.smoothstep(time,3.2,13.65);
export const REPAIR_CUES=Object.freeze([
  [REPAIR.bonnet,'repair-hood'], [3.22,'repair-ratchet'],[4.91,'repair-ratchet'],[6.42,'repair-seat'],
  [REPAIR.tryEngine,'repair-crank'],[REPAIR.sputter,'repair-catch'],[REPAIR.stall,'repair-stall'], [14.75,'repair-hood'],
].map(Object.freeze));
