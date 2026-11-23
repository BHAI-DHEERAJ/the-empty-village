import { Vector3 } from 'three';
import { createVillageSounds } from './VillageSounds.js';
import { createVillageScore } from './VillageScore.js';
import { createDreadLayer } from './DreadLayer.js';
import { createCarDriveAudio } from './CarDriveAudio.js';
import { roadEdge } from '../world/sceneryLayout.js';

// This bed and its foley are synthesized locally. The context is created only
// after a sound-enabled start or an explicit unmute. Every source has one master mute.
export class WindAmbience {
  enabled=false;
  look=new Vector3();

  musicEnabled = true;
  voiceBuffers=new Map();
  voiceToken=0;
  chapterMode = 'play';

  async setEnabled(on){
    if(!on&&!this.context)return false;
    if(!this.context)this.#init();
    if(on)await this.context.resume();
    this.enabled=on;
    if(!on)this.stopSpeaking();
    this.#mixOutput();
    this.#mixScore();
    return on;
  }

  toggle(){return this.setEnabled(!this.enabled);}

  setMusic(on){this.musicEnabled=on;this.#mixScore();}

  setRadioOpen(open){
    this.radioOpen=open;
    this.#mixOutput();
    this.#mixScore();
  }

  #mixOutput(){
    if(this.context)this.master.gain.setTargetAtTime(this.enabled && !this.radioOpen ? .68 : 0,this.context.currentTime,.14);
  }

  #mixScore(){
    const audible=this.enabled&&!this.radioOpen&&this.musicEnabled&&this.chapterMode==='play';
    if(audible&&this.context?.state==='running'){
      this.score??=createVillageScore(this.context,this.master);
      this.dread??=createDreadLayer(this.context,this.master);
    }
    this.score?.setAudible(audible);
    this.dread?.setAudible(audible);
    if(!audible)this.dread?.setTension(0);
  }

  #noise(seconds,channels=1,color=.38){
    const c=this.context, length=Math.floor(c.sampleRate*seconds), b=c.createBuffer(channels,length,c.sampleRate);
    for(let channel=0;channel<channels;channel++){
      const a=b.getChannelData(channel);let low=0;
      for(let i=0;i<length;i++){
        const next=Math.random()*2-1;
        low=low*.944+next*.056;
        const edge=Math.min(1,i/580,(length-i-1)/850);
        a[i]=(low*color+next*(1-color))*edge;
      }
    }
    return b;
  }

  #filter(type,frequency,q=.67){
    const filter=this.context.createBiquadFilter();filter.type=type;filter.frequency.value=frequency;filter.Q.value=q;
    return filter;
  }
  #loop(buffer){
    const source=this.context.createBufferSource();source.buffer=buffer;source.loop=true;source.start();return source;
  }
  #pan(){
    const node=this.context.createPanner();node.panningModel='equalpower';node.distanceModel='inverse';node.refDistance=1.9;node.rolloffFactor=1.17;
    return node;
  }
  #orient(node,x,y,z){
    if(node.positionX){node.positionX.value=x;node.positionY.value=y;node.positionZ.value=z;}
    else node.setPosition(x,y,z);
  }

  #init(){
    const Context=window.AudioContext||window.webkitAudioContext;
    if(!Context)throw new Error('Web Audio is not available.');
    const c=new Context();this.context=c;
    this.master=c.createGain();this.master.gain.value=0;this.master.connect(c.destination);
    this.windGain=c.createGain();this.windGain.gain.value=.48;
    const wind=this.#loop(this.#noise(7.7,2,.74)), high=this.#filter('highpass',64), low=this.#filter('lowpass',467);
    const gusts=c.createOscillator(), depth=c.createGain();gusts.frequency.value=.087;depth.gain.value=145;
    gusts.connect(depth).connect(low.frequency);gusts.start();
    wind.connect(high).connect(low).connect(this.windGain).connect(this.master);
    this.radioGain=c.createGain();this.radioGain.gain.value=0;this.radioPane=this.#pan();
    this.#loop(this.#noise(2.9,1,.12)).connect(this.#filter('bandpass',1047,1.75)).connect(this.radioGain).connect(this.radioPane).connect(this.master);
    this.crunch=this.#noise(.33,1,.33);
    this.driveAudio=createCarDriveAudio(c,this.master);
    this.rainGain=c.createGain();this.rainGain.gain.value=0;
    this.#loop(this.#noise(3.1,2,.23)).connect(this.#filter('bandpass',1340,.59)).connect(this.rainGain).connect(this.master);
    this.nextEvent=null;this.travel=0;this.lastStep=-5;
  }

  #foley(x,y,z,type,scale=1,delay=0){
    const c=this.context,t=c.currentTime+delay, boots=type==='step-room',gravel=type==='step-road',step=boots||gravel||type==='step';
    const length=type==='knock'?.20:boots?.17:.27;
    const v=type==='knock'?.26:gravel?.20:.18;
    const noise=c.createBufferSource();noise.buffer=this.crunch;noise.playbackRate.value=.91+Math.random()*.23;
    const filter=this.#filter(step&&!gravel?'lowpass':'bandpass',boots?350:gravel?1240:step?670:type==='knock'?380:126,.87);
    const gain=c.createGain();gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(v*scale,t+.023);gain.gain.exponentialRampToValueAtTime(.0001,t+length);
    const p=this.#pan();this.#orient(p,x,y,z);noise.connect(filter).connect(gain).connect(p).connect(this.master);
    if(!step||boots){
      const resonant=c.createOscillator(), level=c.createGain();resonant.type='sine';resonant.frequency.setValueAtTime(boots?135:type==='knock'?153:56,t);
      resonant.frequency.exponentialRampToValueAtTime(boots?79:type==='knock'?95:24,t+length*.83);
      level.gain.setValueAtTime(v*.32*scale,t);level.gain.exponentialRampToValueAtTime(.0001,t+length*.80);
      resonant.connect(level).connect(p);resonant.start(t);resonant.stop(t+length);
    }
    noise.start(t);noise.stop(t+length+.03);
    noise.onended=()=>{noise.disconnect();filter.disconnect();gain.disconnect();p.disconnect();};
  }

  update(elapsed,view,player,room,{rain=0,paused=false,tension=0}={}){
    const c=this.context;
    if(!this.enabled||!c||c.state!=='running')return;
    this.score?.update();
    this.dread?.setTension(Math.max(tension,this.cueTension??0));
    this.cueTension=Math.max(0,(this.cueTension??0)-.006);
    const now=c.currentTime,{x,y,z}=view.position;
    const dt=this.lastTime==null?0:Math.min(.12,Math.max(0,elapsed-this.lastTime));this.lastTime=elapsed;
    view.getWorldDirection(this.look);this.#orient(c.listener,x,y,z);
    const v=this.look,l=c.listener;
    if(l.forwardX){l.forwardX.value=v.x;l.forwardY.value=v.y;l.forwardZ.value=v.z;l.upX.value=0;l.upY.value=1;l.upZ.value=0;}
    else l.setOrientation(v.x,v.y,v.z,0,1,0);
    const ride=this.chapterMode==='drive'||this.chapterMode==='escape';
    const repair=this.chapterMode==='repair'||this.chapterMode==='final-repair';
    const windLevel=ride?.145:repair?.26:room ? (room.site.basement && y<.2 ? .07 : room.plan.court ? .25 : .21) : .48;
    this.windGain.gain.setTargetAtTime(windLevel,now,.32);
    this.rainGain.gain.setTargetAtTime(rain*(room ? (room.plan.court?.18:.075) : .36)*(paused?.56:1),now,.33);
    const radio=room?.radio;
    if(radio)this.#orient(this.radioPane,radio.x,radio.y,radio.z);
    const signal=this.chapterMode==='play'&&radio&&Math.hypot(radio.x-x,radio.y-y,radio.z-z)<10;
    this.radioGain.gain.setTargetAtTime(signal?((elapsed+15)%29>24?.023:.18):0,now,.22);
    if(paused||this.chapterMode!=='play')return;
    const speed=Math.hypot(player.velocity.x,player.velocity.z);
    if(player.grounded&&speed>.69){
      this.travel+=speed*dt;
      if(this.travel>(player.sprinting?1.31:.96)&&elapsed-this.lastStep>.15){
        this.travel=0;this.lastStep=elapsed;
        this.#foley(x+Math.sin(elapsed*3)*.19,player.position.y+.11,z,room?'step-room':roadEdge(x,z)<.14?'step-road':'step',room ? .36 : .43);
      }
    }
    if(this.nextEvent==null)this.nextEvent=elapsed+21.3;
    if(elapsed>this.nextEvent){
      const n=(this.eventIndex??0)+1;this.eventIndex=n;this.nextEvent=elapsed+(room?36:60)+Math.abs(Math.sin(n*17))*27;
      if(room){
        const source=room.radio??room.site;
        const xx=source.x+2.6*Math.cos(n*2.65),zz=source.z+2.3*Math.sin(n*2.65);
        if(n%3===0){this.#foley(xx,y-.51,zz,'knock',.70);this.#foley(xx,y-.51,zz,'knock',.39,.30);}
        else {this.#foley(xx,y-1.18,zz,'step',.77); if(n%2===0)this.#foley(xx+.38,y-1.19,zz-.39,'step',.45,.58);}
      }else this.#foley(x-9,y-1.1,z-5,'knock',.69);
    }
  }

  villageCue(type, position, strength = 1) {
    if (!this.enabled || this.context?.state !== 'running') return;
    this.villageSounds ??= createVillageSounds(this.context, this.master);
    if(/^(omen|scare|stalker|haunt|ghost|child|bone)/.test(type))this.cueTension=Math.max(this.cueTension??0,.55);
    this.villageSounds.cue(type, position, strength);
  }

  updateMotors(view, vehicles) {
    if (!this.enabled || this.context?.state !== 'running') return;
    if(this.chapterMode!=='play')vehicles=[];
    if (!this.villageSounds && !vehicles.some(v => v.on)) return;
    this.villageSounds ??= createVillageSounds(this.context, this.master);
    this.villageSounds.motors(view, vehicles);
  }

  chapterMix(mode){
    if(this.chapterMode===mode)return;
    this.chapterMode=mode;
    this.#mixScore();
    if(mode!=='drive'&&mode!=='escape')this.driveAudio?.stop();
  }

  // A position makes the voice a world event: Ravi can call from behind the
  // CRETA, from the school or from the trees while still looking at you.
  async speak(url,position){
    this.stopSpeaking();
    const context=this.context,token=this.voiceToken;
    if(!this.enabled||context?.state!=='running')return;
    try{
      let buffer=this.voiceBuffers.get(url);
      if(!buffer){
        buffer=fetch(url).then(response=>{if(!response.ok)throw Error('Voice asset unavailable');return response.arrayBuffer();})
          .then(data=>context.decodeAudioData(data));
        this.voiceBuffers.set(url,buffer);
      }
      const decoded=await buffer;
      if(token!==this.voiceToken||context.state!=='running'||!this.enabled)return;
      const source=context.createBufferSource(),gain=context.createGain();
      const placed=position&&Number.isFinite(position.x)&&Number.isFinite(position.z);
      gain.gain.value=placed?.49:.80;source.buffer=decoded;source.connect(gain);
      let panner=null;
      if(placed){panner=this.#pan();this.#orient(panner,position.x,position.y??1.45,position.z);gain.connect(panner).connect(this.master);}
      else gain.connect(this.master);
      this.voiceSource=source;
      source.onended=()=>{source.disconnect();gain.disconnect();panner?.disconnect();if(this.voiceSource===source)this.voiceSource=null;};
      source.start();
    }catch{this.voiceBuffers.delete(url);}
  }

  stopSpeaking(){
    this.voiceToken++;
    this.voiceSource?.stop();this.voiceSource=null;
  }

  updateRide(time,mix){if(this.enabled&&this.context?.state==='running')this.driveAudio.update(time,mix);}
  rideCue(type){if(this.enabled&&this.context?.state==='running')this.driveAudio.cue(type);}
  pauseRide(){this.driveAudio?.stop(true);}
  finishRide(){this.driveAudio?.stop();this.rideCue('car-stop');}

  dispose(){this.stopSpeaking();this.driveAudio?.stop(true);this.dread?.dispose();this.context?.close().catch(()=>{});}
}
