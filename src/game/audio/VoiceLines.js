// Bundled local recordings with matching Hindi captions. No speech service
// or downloads from a third party are needed at runtime.
export const VOICE_LINES=Object.freeze({
  'tape-intro':{
    src:new URL('../../assets/audio/voices/tape-intro.mp3',import.meta.url).href,
    title:'स्कूल की आख़िरी रिकॉर्डिंग · 2011',label:'टेप 01 · मीरा',
    text:'मीरा: “इस गाँव में एक ऐसी चीज़ है जो इंसानों की आवाज़ और यादें नकल कर सकती है। हमने उसे रोकने के लिए पूरे गाँव की घड़ियाँ एक ही समय पर बंद कर दी थीं। लेकिन एक गलती हुई थी। कृष… अगर तुम्हारे साथ रवि है, तो उसे स्कूल के बाहर मत जाने देना।”',seconds:14.6,
  },
  'stalker-first':{
    src:new URL('../../assets/audio/voices/stalker-first.mp3',import.meta.url).href,
    text:'रवि की आवाज़: “कृष… तुम वापस क्यों आए? मैं वही हूँ, रवि। दरवाज़े गिन रहे हो? एक दरवाज़ा तुम भूल गए — अपने पीछे देखो।”',seconds:14.6,
  },
  'stalker-road':{
    src:new URL('../../assets/audio/voices/stalker-road.mp3',import.meta.url).href,
    text:'रवि की आवाज़ सड़क के दूसरे छोर से: “कृष, इधर आओ… रास्ता यही है। तुम्हें लगा गाँव खाली है? कोई बोलता नहीं — क्योंकि सब तुम्हें देख रहे हैं।”',seconds:9.5,
  },
  'stalker-crowd':{
    src:new URL('../../assets/audio/voices/stalker-crowd.mp3',import.meta.url).href,
    text:'रवि की आवाज़ भीड़ के बीच से: “सुन रहे हो, कृष? मुझे अकेला मत समझना। पूरा गाँव तुम्हारे पीछे है और मैं उन सबकी आवाज़ में बोल रहा हूँ।”',seconds:10.2,
  },
  'stalker-tree':{
    src:new URL('../../assets/audio/voices/stalker-tree.mp3',import.meta.url).href,
    text:'रवि की आवाज़ पेड़ के पीछे से: “रुक क्यों गए? अब तो हम बहुत पास हैं। कृष… मैं पीछे की सीट से बोल रहा हूँ।”',seconds:5.5,
  },
  'tape-last':{
    src:new URL('../../assets/audio/voices/tape-last.mp3',import.meta.url).href,
    title:'पिछली सीट',label:'आख़िरी सिग्नल',
    text:'रवि पिछली सीट पर सिर उठाता है: “अब अगली बार अकेले मत आना, कृष।” रेडियो पर बूढ़ी आवाज़: “गाँव से दो लोग निकले थे… लेकिन वापस सिर्फ़ एक आया था।”',seconds:9.0,
  },
});