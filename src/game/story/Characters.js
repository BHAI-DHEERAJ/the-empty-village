// Two investigators, one empty village. The chosen traveller is stored locally
// and used by the chat identity, captions and the opening field note. The game
// never says whether the Ravi in the CRETA is the real one — that uncertainty
// is the story.
const KEY = 'empty-village-character';

export const CHARACTERS = Object.freeze({
  krish: Object.freeze({
    id: 'krish', name: 'कृष', roman: 'Krish', role: 'CRETA चालक',
    tagline: 'गाँव में कोई ज़िंदा नहीं था…',
    note: 'दादा के गाँव लौटा, जहाँ हर तस्वीर में पीछे एक बेचेहरा आदमी खड़ा है।',
    hint: 'कृष गाड़ी चलाता है। चिट्ठी पढ़ी है — अगर कोई उसके नाम से बुलाए, जवाब नहीं देना।',
    colour: '#d8b979',
  }),
  ravi: Object.freeze({
    id: 'ravi', name: 'रवि', roman: 'Ravi', role: 'साथी यात्री',
    tagline: '…फिर हमारी गाड़ी में तीसरा कौन बैठा था?',
    note: 'कृष के साथ CRETA में है। कभी मदद करता है, कभी गलत रास्ते पर ले जाता है — कभी दिखता है, कभी नहीं।',
    hint: 'रवि इंजन और रेडियो समझता है। पर किसी को पता नहीं कि वह गया कभी था या नहीं।',
    colour: '#8fb7c4',
  }),
});

export function getCharacter(id) {
  return CHARACTERS[id] ?? CHARACTERS.krish;
}

export function savedCharacterId() {
  try {
    const stored = localStorage.getItem(KEY);
    return CHARACTERS[stored] ? stored : 'krish';
  } catch { return 'krish'; }
}

export function selectCharacter(id) {
  if (!CHARACTERS[id]) return getCharacter();
  try { localStorage.setItem(KEY, id); } catch { /* Optional */ }
  return CHARACTERS[id];
}
