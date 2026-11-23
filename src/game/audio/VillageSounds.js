import { Vector3 } from 'three';

// Mono procedural foley goes through the same gesture-gated master as wind.
const sounds = {
  hinge: [.61,.105,126,102,'wood'], latch: [.22,.106,232,105,'impact'],
  sit: [.25,.065,107,74,'wood'], chain: [.42,.096,426,151,'metal'], paper: [.39,.077,192,71,'paper'],
  cup: [.31,.085,592,267,'metal'], keys:[.37,.107,785,437,'metal'], 'cycle-bell':[.55,.10,817,789,'bell'],
  'distant-bell':[4.4,.31,304,301,'bell'], 'lamp-fizz':[.66,.093,118,176,'radio'], 'lamp-cut':[.24,.105,151,39,'impact'],
  shutter:[1.66,.17,139,86,'wood'], clock:[.21,.044,375,86,'impact'],
  'car-door':[.86,.15,162,47,'car-door'], 'flight-cloth':[.76,.145,187,95,'paper'], 'flight-step':[.26,.19,133,52,'impact'],
  'cup-place':[.38,.14,845,826,'bell'], 'tape-seat':[.38,.126,246,560,'double-click'],
  'tape-button':[.22,.135,605,318,'double-click'], 'lantern-set':[.44,.128,336,214,'metal'],
  'lantern-on':[.45,.124,525,111,'switch-on'],
  joint:[.36,.13,142,62,'wood'],
  dial: [.87,.109,267,97,'radio'], ignition: [.79,.125,43,67,'motor'], 'engine-off': [.53,.079,49,22,'motor'],
  'scare-rush': [.28,.23,154,46,'impact'], 'scare-eyes': [.69,.21,91,178,'metal'], 'scare-metal': [.65,.19,338,163,'metal'], 'scare-radio': [.73,.17,390,56,'radio'],
  'repair-hood':[.77,.31,146,70,'car-door'], 'repair-ratchet':[.67,.265,376,199,'ratchet'],
  'repair-seat':[.43,.23,366,126,'double-click'], 'repair-crank':[1.05,.39,39,64,'motor'],
  'repair-catch':[1.22,.36,52,44,'motor'],'repair-stall':[.88,.32,59,18,'impact'],
  'pump-work':[.72,.20,115,51,'wood'],'water-drain':[1.56,.30,93,62,'water'],
  'gate-work':[1.14,.22,173,92,'ratchet'],'generator-work':[.74,.23,64,103,'motor'],
  'relay-error':[.36,.16,377,166,'radio'],'signal-clear':[.57,.19,541,746,'bell'], 'phone-shot':[.28,.18,341,163,'double-click'],
  'stalker-footfall':[.74,.51,68,22,'impact'], 'stalker-breath':[1.19,.34,115,58,'breath'],
  'omen-shadow':[.92,.34,84,47,'omen'], 'omen-whisper':[1.06,.28,135,91,'breath'],
  'omen-skitter':[.73,.27,389,111,'ratchet'],'omen-double':[.94,.26,272,64,'omen'],
  'omen-watcher':[.91,.29,105,66,'omen'],'omen-road':[.89,.44,265,107,'paper'],'haunt-impact':[.62,.37,168,58,'surprise'],
  'thunder-roll':[3.9,.59,56,25,'storm'], 'phone-call':[.37,.22,439,523,'double-click'],
  // New local nightmare foley: no downloads, every buffer synthesized once.
  'omen-mirror':[1.12,.28,212,68,'whisper'], 'omen-child':[.86,.29,620,320,'giggle'],
  'omen-statue':[1.24,.30,98,42,'scrape'], 'omen-echo':[1.02,.27,308,74,'echo'],
  'ghost-whisper':[1.68,.23,184,91,'whisper'], 'child-giggle':[1.14,.25,760,410,'giggle'],
  'bone-crack':[.46,.27,260,84,'crack'], 'chain-drag':[1.58,.24,120,54,'scrape'],
  'scare-heartbeat':[1.36,.33,54,42,'heartbeat'], 'scare-reverse':[1.08,.37,880,60,'reverse'],
  'stalker-scrape':[1.32,.31,143,51,'scrape'], 'radio-static':[.84,.21,512,138,'radio'],
};

function position(panner, point) {
  if (panner.positionX) {
    panner.positionX.value=point.x;panner.positionY.value=point.y;panner.positionZ.value=point.z;
  } else panner.setPosition(point.x,point.y,point.z);
}

function spatial(context) {
  const node=context.createPanner();
  node.panningModel='HRTF';node.distanceModel='inverse';node.refDistance=3.3;node.rolloffFactor=1.14;
  return node;
}

function sample(context, descriptor) {
  const [duration,,f0,f1,style]=descriptor;
  const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate), out=buffer.getChannelData(0);
  let phase=0, rumble=0;
  for(let i=0;i<out.length;i++){
    const t=i/context.sampleRate, x=t/duration, n=Math.random()*2-1;
    rumble+=.105*(n-rumble);
    phase+=(f0+(f1-f0)*x+Math.sin(t*32)*f0*.04)/context.sampleRate;
    const s=Math.sin(2*Math.PI*phase), bump=Math.min(1,x*35)*(1-x)**1.6;
    const pop=(at,decay)=>{const age=t-at;return age<0?0:Math.min(1,age*350)*Math.exp(-age*decay);};
    if(style==='car-door')out[i]=(.46*n+.32*s)*pop(.016,65)+(.53*rumble+.20*s)*pop(.114,8)+(.30*rumble+.41*s)*pop(.47,18);
    else if(style==='double-click')out[i]=(.42*s+.29*n+.33*rumble)*(pop(0,66)+.77*pop(duration*.31,29));
    else if(style==='switch-on')out[i]=(.34*s+.45*rumble)*pop(0,54)+.11*Math.sin(2*Math.PI*114*t)*pop(.065,8);
    else if(style==='bell')out[i]=Math.min(1,t*172)*Math.exp(-t*5.5/duration)*(.53*s+.22*Math.sin(phase*2*Math.PI*2.46)+.15*Math.sin(phase*2*Math.PI*3.04)+.086*rumble);
    else if(style==='metal')out[i]=(s*.27+Math.sin(phase*13.4)*.24+rumble*.48)*bump*(.65+.35*Math.cos(t*57));
    else if(style==='radio')out[i]=(.44*n+.20*rumble+.074*Math.sign(s))*bump*(.60+.40*Math.sin(t*31)**2);
    else if(style==='paper')out[i]=(n*.30+rumble*.38)*Math.sin(Math.PI*x)**2*(.65+.35*Math.sin(t*52));
    else if(style==='motor')out[i]=(.41*s+.29*rumble+.16*Math.sin(phase*13))*bump*(.5+.5*Math.cos(t*59)**2);
    else if(style==='omen')out[i]=(.29*s+.65*rumble+.16*(n-rumble))*Math.sin(Math.PI*x)**1.6*(.4+.57*x+.20*Math.sin(t*26));
    else if(style==='breath')out[i]=(.26*(n-rumble)+.55*rumble+.14*s*Math.sin(phase*43))*Math.sin(Math.PI*x)**2*(.58+.42*Math.cos(t*11)**2);
    else if(style==='surprise')out[i]=(.39*s+.38*rumble+.18*n)*pop(.009,10)+.11*Math.sin(phase*12)*pop(.051,14);
    else if(style==='ratchet')out[i]=(.47*s+.47*rumble+.23*n)*(pop(.03,37)+.8*pop(.15,42)+.9*pop(.28,48)+.67*pop(.48,42));
    else if(style==='storm')out[i]=(.26*s+.65*rumble+.14*Math.sin(phase*21.98)+.045*n)*Math.min(1,t*3)*(1-x)**1.43*(.67+.33*Math.sin(t*8.5+.41)**2)+(.18*rumble+.11*n)*pop(.34,8);
    else if(style==='water')out[i]=(.58*rumble+.15*n+.09*s)*bump*(.61+.39*Math.sin(t*36+x*4)**2);
    else if(style==='whisper'){
      // Breathy formants: two noise bands with a slow, spoken rhythm.
      const formant=Math.sin(t*19)+.55*Math.sin(t*31+.8);
      out[i]=(.52*(n-rumble)+.40*rumble+.08*s*formant)*Math.sin(Math.PI*x)**1.3*(.45+.55*Math.max(0,formant)**2);
    }
    else if(style==='giggle'){
      const pulse=Math.max(0,Math.sin(t*13.4))**2;
      out[i]=(.30*s+.33*rumble+.22*n)*pulse*Math.sin(Math.PI*x)**.8*(.68+.32*Math.cos(t*41)**2);
    }
    else if(style==='scrape'){
      // Nails on plaster: irregular low grind with a high edge.
      out[i]=(.56*rumble+.28*n+.11*s)*Math.min(1,t*9)*(1-x)**.6*(.35+.65*Math.max(0,Math.sin(t*11.7+x*8))**2);
    }
    else if(style==='heartbeat'){
      const thump=(at,decay)=>{const age=t-at;return age<0?0:Math.min(1,age*280)*Math.exp(-age*decay);};
      out[i]=(.62*s+.34*rumble)*(thump(.03,17)+.63*thump(.37,19)+.24*thump(1.04,13));
    }
    else if(style==='reverse')out[i]=(.31*s+.64*rumble+.08*n)*Math.min(1,t*2.4)*(x**2.1)*(.75+.25*Math.cos(t*24)**2);
    else if(style==='echo')out[i]=(.42*s+.38*rumble+.16*n)*(pop(.01,72)+.62*pop(duration*.27,35)+.31*pop(duration*.52,29));
    else if(style==='crack')out[i]=(.42*s+.36*rumble+.20*n)*(pop(.012,48)+.74*pop(.075,60)+.38*pop(.23,38));
    else out[i]=(s*.30+rumble*.55)*bump*(style==='impact'?1-x:.55+.45*Math.sin(t*28)**2);
  }
  return buffer;
}

export function createVillageSounds(context, output) {
  const cache=new Map(), point=new Vector3();
  let engine;
  function startMotor() {
    const source=context.createOscillator(), shimmer=context.createOscillator(), driver=context.createGain(), level=context.createGain();
    const low=context.createBiquadFilter(), panner=spatial(context);
    source.type='sawtooth';source.frequency.value=23.5;
    shimmer.type='triangle';shimmer.frequency.value=11.76;driver.gain.value=3.2;
    shimmer.connect(driver).connect(source.frequency);
    low.type='lowpass';low.frequency.value=284;low.Q.value=.57;
    level.gain.value=0;source.connect(low).connect(level).connect(panner).connect(output);
    source.start();shimmer.start();
    return {source,level,panner};
  }
  return {
    cue(kind, at, strength) {
      if(!Object.hasOwn(sounds,kind)||context.state!=='running')return;
      if(!cache.has(kind))cache.set(kind,sample(context,sounds[kind]));
      const source=context.createBufferSource(),level=context.createGain(),panner=spatial(context);
      source.buffer=cache.get(kind);level.gain.value=sounds[kind][1]*Math.min(1.2,strength);
      position(panner,at);source.connect(level).connect(panner).connect(output);
      source.onended=()=>{source.disconnect();level.disconnect();panner.disconnect();};source.start();
    },
    motors(view, vehicles) {
      let best=null,r2=28**2;
      for(const v of vehicles){
        const d=point.copy(v.source).distanceToSquared(view.position);
        if(v.rpm>.004&&d<r2){best=v;r2=d;}
      }
      if(!engine&&!best)return;
      engine??=startMotor();
      const t=context.currentTime;
      if(best){
        position(engine.panner,best.source);
        engine.source.frequency.setTargetAtTime(18+best.rpm*7.2+(best.load??0)*19.5,t,.18);
      }
      engine.level.gain.setTargetAtTime(best?.rpm*.091||0,t,.17);
    },
  };
}
