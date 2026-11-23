import { MathUtils, Vector3 } from 'three';
import { WORLD } from '../settings.js';
import { between } from '../world/random.js';
import { hasWatcherClearance } from './WatcherPlaces.js';
import { chooseRoadCrossing } from './WatcherRoad.js';
import { WatcherSight } from './WatcherSight.js';

const EXTRA=['wraith','crawler','twins','sentinel'];
// Same four sculpted bodies, different predatory rules: a face that turns only
// when unseen, a statue that walks in the dark, a child that scuttles in arcs.
const VARIANTS=Object.freeze({
  wraith:['faceless','drifting'],
  crawler:['child','surface'],
  twins:['echo','mirror'],
  sentinel:['statue','mirror'],
  road:['procession'],
});
const VARIANT_CUES=Object.freeze({
  faceless:'ghost-whisper',drifting:'omen-whisper',child:'omen-child',surface:'omen-skitter',
  echo:'omen-echo',mirror:'omen-mirror',statue:'omen-statue',procession:'omen-road',
});
const VARIANT_HINTS=Object.freeze({
  faceless:'चेहरा… उसमें आँखें नहीं थीं।',
  drifting:'कपड़ा हवा के बिना ही हिल रहा है…',
  child:'किसी बच्चे के हौंके सुन रहे हो…',
  surface:'मिट्टी के ऊपर से कुछ सरक गया।',
  echo:'एक क़दम की दो गूंजें…',
  mirror:'खिड़की में कोई और खड़ा है।',
  statue:'जब तक देख रहे हो, वह नहीं हिलती।',
  procession:'सड़क पर सायों का जुलूस…',
});
const PROFILES=Object.freeze({
  jump:{cue:'omen-shadow',lead:.95,limit:5.60,hold:.96,hint:'सड़क पर एक भारी परछाईं खिंच गई…'},
  wraith:{cue:'omen-whisper',lead:1.13,limit:3.2,hold:3.12,hint:'हवा में किसी की साँस सुनाई दी…'},
  crawler:{cue:'omen-skitter',lead:.88,limit:2.5,hold:2.46,hint:'पास की मिट्टी पर कुछ रगड़ा…'},
  twins:{cue:'omen-double',lead:1.03,limit:3.4,hold:2.81,hint:'एक ही क़दम की दो आवाज़ें…'},
  sentinel:{cue:'omen-watcher',lead:1.17,limit:3.7,hold:4.10,hint:'दूर कहीं कपड़ा हिला…'},
  road:{cue:'omen-road',lead:.92,limit:2.8,hold:2.76,hint:'आगे सड़क के किनारे पत्ते खड़के…'},
});
const UP=new Vector3(0,1,0);
const STILL=new Vector3();

// Read-only observer: nothing here owns a collider, writes to the player or
// moves a ghost towards them. A shadow may go unnoticed and expire entirely.
export class Haunts {
  constructor({collision,occlusion,actors,shadow,roads=[],spots=[],onCue=()=>{},random=Math.random,reducedMotion=false,enabled=true}){
    this.collision=collision;this.sight=new WatcherSight(collision,occlusion);
    this.actors=actors;this.shadow=shadow;this.onCue=onCue;this.random=random;
    this.reducedMotion=reducedMotion;this.enabled=enabled;this.time=0;this.nextAt=7.6;this.index=0;this.extraIndex=0;
    this.roads=roads;this.spots=spots.filter(s=>['tree','wall','doorway','broken-window','upper-window','hall','roof'].includes(s.kind));
    this.lastSide=-1;this.lastRoad=null;this.lastType=null;
    this.order=[...EXTRA];
    for(let i=this.order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[this.order[i],this.order[j]]=[this.order[j],this.order[i]];}
    this.look=new Vector3();this.check=new Vector3();this.aim=new Vector3();this.soundAt=new Vector3();this.stepVector=new Vector3();
    this.level=0;this.hint='';this.phase='idle';this.encounter=null;
  }

  setEnabled(on){this.enabled=on;if(!on&&this.encounter?.type==='jump')this.cancel();}
  #actor(type){return this.actors[type==='road'?'sentinel':type];}
  #actorFor(encounter){return encounter?.variant==='faceless'?this.actors.faceless??this.#actor(encounter.type):this.#actor(encounter.type);}
  cancel(){
    if(this.encounter){const actor=this.#actorFor(this.encounter);actor.group.visible=false;actor.group.scale.setScalar(1);}
    this.encounter=null;this.shadow.hide();this.phase='idle';this.level=0;this.hint='';
    this.nextAt=Math.max(this.nextAt,this.time+7.5);
  }

  #point(x,z,maxHeight,scale=1){
    if(Math.abs(x)>WORLD.limit-1||Math.abs(z)>WORLD.limit-1)return null;
    const y=this.collision.supportAt(x,z,maxHeight+.18);
    if(Math.abs(maxHeight-y)>.25||y<-.18)return null;
    this.check.set(x,y,z);
    return hasWatcherClearance(this.collision,this.check,scale)?this.check.clone():null;
  }

  #findShadow(feet,forward){
    // Avoid projecting through a prop, wall or step. Leave the clue at the
    // spot it first appeared; it isn't pasted onto the player's camera.
    for(const dist of [2.6,4.0,5.7,7.3]){
      if(!this.#point(feet.x+forward.x*dist,feet.z+forward.z*dist,feet.y))return null;
    }
    for(const dist of [5.55,6.72,4.6])for(const turn of [0,.29,-.29,.57,-.57]){
      this.aim.copy(forward).applyAxisAngle(UP,turn);
      const pos=this.#point(feet.x-this.aim.x*dist,feet.z-this.aim.z*dist,feet.y);
      const mark=pos&&{pos,scale:1,yaw:Math.atan2(feet.x-pos.x,feet.z-pos.z)};
      if(mark&&this.sight.outsideView(mark,.065)&&this.sight.hasLine(mark))return mark;
    }
    return null;
  }

  #findDistant(type,feet,forward,room){
    if(type==='sentinel'){
      // A glimpse in a real window, on a roof or by a tree is preferable to
      // a figure in the middle of an empty field. Don't show through glass.
      const nearby=this.spots.filter(s=>{
        const d=s.pos.distanceToSquared(feet);
        return d>6**2&&d<24**2&&(!room||room.site.id===s.siteId)&&this.sight.bearing(s)>.77;
      }).sort((a,b)=>this.sight.bearing(b)-this.sight.bearing(a));
      for(const s of nearby.slice(0,12)){
        const mark={...s,yaw:s.facing??Math.atan2(feet.x-s.pos.x,feet.z-s.pos.z)};
        if(this.sight.observe(mark).visible)return mark;
      }
    }
    const scale=type==='crawler'?.38:type==='twins'?.57:type==='wraith'?.78:1;
    const ranges=room?[6.3,4.9,8.1]:[10.4,14.7,8.2,18.8];
    const sign=this.random()<.5?-1:1;
    for(const dist of ranges)for(const angle of [.24,-.28,.52,-.54,.08,.84,-.91,1.20,-1.20]){
      this.aim.copy(forward).applyAxisAngle(UP,angle*sign);
      const pos=this.#point(feet.x+this.aim.x*dist,feet.z+this.aim.z*dist,feet.y,type==='crawler'?1.12:Math.max(.82,scale));
      if(!pos)continue;
      const mark={pos,scale,yaw:Math.atan2(feet.x-pos.x,feet.z-pos.z)};
      if(!this.sight.observe(mark).visible)continue;
      let path=null;
      if(type==='crawler'){
        const slip=new Vector3(this.aim.z,0,-this.aim.x).multiplyScalar(3.24*sign);
        let clear=true;
        for(let i=1;i<=7;i++)if(!this.#point(pos.x+slip.x*i/7,pos.z+slip.z*i/7,pos.y,1.12)){clear=false;break;}
        if(clear)path=slip;
      }
      return {...mark,path};
    }
    return null;
  }

  #begin(type,profile,mark,feet,forward){
    const choices=VARIANTS[type]??[];
    let variant=choices.length&&this.enabled&&!this.reducedMotion ? choices[Math.floor(this.random()*choices.length)] : null;
    // A reflection belongs in a real window or doorway, never in a bare field.
    if(variant==='mirror'&&!mark.siteId)variant=type==='sentinel'?'statue':'echo';
    const active=variant?{...profile,cue:VARIANT_CUES[variant]??profile.cue,hint:VARIANT_HINTS[variant]??profile.hint}:profile;
    const safeMark={...mark,pos:mark.pos.clone()};
    this.encounter={type,variant,profile:active,mark:safeMark,forward:forward.clone(),origin:feet.clone(),start:this.time,shownAt:null};
    this.phase='warning';this.hint=active.hint;
    this.lastType=type;
    const actor=this.#actorFor(this.encounter);actor.group.visible=false;actor.group.rotation.set(0,mark.yaw,0);
    actor.group.scale.setScalar(variant==='child'?.48:type==='sentinel'?mark.scale:1);actor.reset?.(mark.pose);
    if(type==='jump'){this.shadow.show(feet,forward);this.shadow.alpha(0);}
    // Sound always happens here, at least `lead` seconds before visibility.
    this.soundAt.copy(mark.cut?.from??mark.pos).y+=type==='crawler'?.37:1.24;
    this.onCue(active.cue,this.soundAt,type==='jump'?1.13:.99);
  }

  #end(){
    if(this.encounter){const actor=this.#actorFor(this.encounter);actor.group.visible=false;actor.group.scale.setScalar(1);}
    this.shadow.hide();this.phase='idle';this.encounter=null;this.hint='';this.level=0;
    this.nextAt=this.time+between(this.random,18,30);
  }

  update(dt,{view,feet,velocity=STILL,room=null,seated=false,grounded=true}){
    if(dt<=0)return;
    this.time+=dt;
    const e=this.encounter;
    if(!e&&(this.time<this.nextAt||seated||!grounded))return;
    this.sight.capture(view);view.getWorldDirection(this.look);this.look.y=0;this.look.normalize();
    if(!e){
      if(this.look.lengthSq()<.5)return;
      const wantsShadow=this.enabled&&this.index%2===0&&!room;
      let type='jump',mark=wantsShadow?this.#findShadow(feet,this.look):null;
      if(!room&&!this.reducedMotion&&this.lastType!=='road'&&(!mark||feet.x<-36)){
        const cut=chooseRoadCrossing(this.roads,this.sight,feet,velocity,this.lastSide,this.lastRoad);
        if(cut){
          type='road';this.lastSide=cut.side;this.lastRoad=cut.id;
          mark={pos:cut.from.clone().lerp(cut.to,.5),cut,scale:1,yaw:cut.yaw,path:cut.to.clone().sub(cut.from)};
        }
      }
      if(!mark){
        for(let i=0;i<this.order.length&&!mark;i++){
          type=this.order[this.extraIndex++%this.order.length];
          mark=this.#findDistant(type,feet,this.look,room);
        }
      }
      if(!mark){this.nextAt=this.time+2.1;return;}
      this.index++;this.#begin(type,PROFILES[type],mark,feet,this.look);return;
    }
    const {type,profile,mark,variant}=e,age=this.time-e.start,actor=this.#actorFor(e),minGap=type==='road'?8.2:3.12;
    const gap=feet.distanceToSquared(mark.pos);
    if(seated||gap<minGap**2||feet.distanceToSquared(e.origin)>(type==='jump'?6.4:21)**2){this.#end();return;}
    if(this.phase==='warning'){
      if(age>=profile.limit){this.#end();return;}
      if(type==='jump'){
        const strength=MathUtils.smoothstep(age,0,.37)*(1-MathUtils.smoothstep(age,4.8,profile.limit));
        const gaze=this.shadow.gaze?this.shadow.gaze(view):1;
        this.shadow.alpha(strength*gaze);
        if(gaze<.12&&strength>.25)this.hint='देखते ही साया गायब हो गया…';
      }
      if(age<profile.lead)return;
      // Turning around by itself isn't enough. The player must actually see
      // the spot behind them through the camera, not through a wall.
      const observed=this.sight.observe(mark);
      if(type==='jump'?this.look.dot(e.forward)>-.19||!observed.beam:!observed.visible)return;
      this.shadow.hide();this.phase='showing';e.shownAt=this.time;this.hint='';
      if(type==='jump')this.onCue('haunt-impact',this.soundAt,this.reducedMotion?.59:1.19);
    }
    const t=this.time-e.shownAt;
    if(t>=profile.hold){this.#end();return;}
    if(type==='road')actor.group.position.copy(mark.cut.from).addScaledVector(mark.path,t/profile.hold);
    else{
      actor.group.position.copy(mark.pos);
      if(mark.path&&!this.reducedMotion)actor.group.position.addScaledVector(mark.path,MathUtils.smoothstep(t,0,profile.hold));
    }
    if(feet.distanceToSquared(actor.group.position)<minGap**2){this.#end();return;}
    actor.pose(t,this.reducedMotion,type==='road'?mark.path.length()*t/profile.hold:null);
    actor.veil((type==='jump'&&!this.reducedMotion?1:MathUtils.smoothstep(t,0,.49))*(1-MathUtils.smoothstep(t,profile.hold*.63,profile.hold)));
    actor.group.visible=true;
    if(variant==='faceless'&&!e.flipped&&t>.42){e.flipped=true;actor.group.rotation.y+=Math.PI;}
    if(variant==='procession'&&!e.echoed&&t>profile.hold*.4){e.echoed=true;this.onCue('ghost-whisper',this.soundAt,.76);}
    if(variant==='statue'&&!this.reducedMotion&&t>.26&&!this.sight.observe(mark).visible){
      // The perfect technique for a still room: it only advances while you
      // are not looking. It never crosses the safe radius.
      this.stepVector.copy(feet).sub(mark.pos).setY(0);
      const length=this.stepVector.length();
      if(length>5.9){
        this.stepVector.multiplyScalar(Math.min(length-5.9,dt*.78)/length);
        const next=this.#point(mark.pos.x+this.stepVector.x,mark.pos.z+this.stepVector.z,mark.pos.y,1);
        if(next){mark.pos.copy(next);actor.group.position.copy(next);}
      }
    }
    const base=type==='jump'&&!this.reducedMotion?.67*(1-t/profile.hold)**2:0;
    const dread=variant&&!this.reducedMotion?.14*(1-t/profile.hold)**2:0;
    this.level=Math.min(.82,base+dread);
  }
}
