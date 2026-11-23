import { ACESFilmicToneMapping, BasicShadowMap, MathUtils, PCFShadowMap, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { createWorld } from './world/createWorld.js';
import { loadLetteringFont } from './world/village/lettering.js';
import { disposeWorldTextures, loadWorldTextures } from './world/textures.js';
import { PlayerController } from './player/PlayerController.js';
import { FirstPersonCamera } from './camera/FirstPersonCamera.js';
import { InputController, defaultTouchControls } from './input/InputController.js';
import { InteractionController } from './interaction/InteractionController.js';
import { MissionGuide } from './interaction/MissionGuide.js';
import { MissionHighlight } from './interaction/MissionHighlight.js';
import { ChapterLog } from './story/VillageChapter.js';
import { ChapterDirector } from './story/ChapterDirector.js';
import { ENDING, ESCAPE, FIX, escapeMotor } from './story/CretaFinale.js';
import { createImpactDust } from './story/ImpactDust.js';
import { createFinaleHazards } from './story/FinaleHazards.js';
import { createHighwayScene } from './world/HighwayScene.js';
import { createGhostHorde } from './watcher/GhostHorde.js';
import { createStalkerModel, StalkerDirector } from './watcher/Stalker.js';
import { CAR_EXIT } from './story/StoryCar.js';
import { createFalseCompanion } from './story/FalseCompanion.js';
import { VillagePanorama } from './camera/VillagePanorama.js';
import { ScareDirector } from './interaction/ScareDirector.js';
import { CAMERA } from './settings.js';
import { VILLAGE_NAME } from './world/VillageName.js';
import { createIllusionModels, createShadowOmen } from './watcher/IllusionModels.js';
import { Haunts } from './watcher/Haunts.js';
import { Storm } from './world/Storm.js';
import { seededRandom } from './world/random.js';
import { PHOTO_KEY } from '../ui/Phone.js';
import { createWatcherPlaces } from './watcher/WatcherPlaces.js';
import { createRoadCrossings } from './watcher/WatcherRoad.js';

const FIXED_STEP = 1 / 120;

export class Game {
  constructor(canvas, hud) {
    this.canvas = canvas;
    this.hud = hud;
    this.scene = new Scene();
    this.view = new PerspectiveCamera(CAMERA.fov, 1, .065, 330);
    this.renderer = new WebGLRenderer({ canvas, alpha: false, antialias: true, powerPreference: 'high-performance' });
    const gl = this.renderer.getContext();
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const device = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : '';
    this.softwareRendering = /swiftshader|llvmpipe|softpipe|software rasterizer/i.test(device);
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = this.softwareRendering ? BasicShadowMap : PCFShadowMap;
    this.accumulator = 0;
    this.elapsed = 0;
    this.previousTime = null;
    this.resize = this.resize.bind(this);
    this.frame = this.frame.bind(this);
    this.events = new AbortController();
  }

  async start({ onTextureProgress, onPrepare } = {}) {
    [this.textures] = await Promise.all([loadWorldTextures(this.renderer, onTextureProgress), loadLetteringFont()]);
    if (this.disposed) {
      disposeWorldTextures(this.textures);
      return;
    }
    onPrepare?.();
    // Let the updated startup card paint before building the village meshes.
    await new Promise(resolve => setTimeout(resolve, 0));
    if (this.disposed) return;
    if (this.renderer.getContext().isContextLost()) throw new Error('Graphics context lost while loading.');
    const compact = this.compact = this.softwareRendering || defaultTouchControls();
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.reducedMotion=reducedMotion;
    let storage;
    try { storage=window.localStorage; } catch { /* Optional */ }
    this.caseLog=new ChapterLog(storage);
    this.world=createWorld(this.scene,this.textures,{compact,reducedMotion,chapter:this.caseLog});
    const {occlusion,spots}=createWatcherPlaces(this.world);
    const ambience=this.hud.ambience;
    const cue=(type,position,strength)=>ambience.villageCue(type,position,strength);
    this.scare=new ScareDirector({enabled:this.hud.scareSetting.checked,reducedMotion,sound:cue});
    this.interactions=new InteractionController({actions:this.world.actions,collision:this.world.collision,
      windowOcclusion:occlusion,reducedMotion,cue,onUse:(action,phase)=>this.#used(action,phase),
      priority:a=>a.id===this.chapter.target?.id,
    });
    this.haunts=new Haunts({collision:this.world.collision,occlusion,spots,roads:createRoadCrossings(this.world.collision),
      actors:createIllusionModels(this.scene,this.textures,{compact}),
      shadow:createShadowOmen(this.scene),onCue:cue,random:seededRandom(this.caseLog.seed^0x7bd153),
      enabled:this.hud.scareSetting.checked,reducedMotion});
    this.stalker=new StalkerDirector({collision:this.world.collision,occlusion,
      actor:createStalkerModel(this.scene,this.textures,{compact}),log:this.caseLog,cue,voice:id=>this.hud.say(id),
      enabled:this.hud.scareSetting.checked,reducedMotion});
    this.falseCompanion=createFalseCompanion(this.scene);
    this.nextMimicAt=18;this.mimicIndex=0;this.mimicAt=new Vector3();
    this.storm=new Storm({random:seededRandom(this.caseLog.seed^0xea152),reducedMotion,onThunder:(at,strength)=>cue('thunder-roll',at,strength)});
    this.player=new PlayerController({collision:this.world.collision,spawn:CAR_EXIT});
    this.camera=new FirstPersonCamera(this.view,{compact,reducedMotion});
    this.scene.add(this.view);
    this.panorama=new VillagePanorama(reducedMotion);
    this.guide=new MissionGuide(this.world.buildings,this.world.collision);
    this.highlight=new MissionHighlight(this.scene,this.world.collision,occlusion,{reducedMotion});
    this.chapter=new ChapterDirector({log:this.caseLog,world:this.world,
      openTape:(id,onHeard)=>this.hud.openTape(id,onHeard),
      emit:(step,details)=>{
        if(!details.readAgain){
          this.hud.renderCase(this.caseLog);
          this.interactions.nextAim=0;
        }
        if(details.finished)this.hud.announceWrench();
        else this.hud.showEvidence(step,details);
      },
      sound:(type,at,strength)=>{
        if(type==='car-stop')ambience.finishRide();
        else if(type==='stalker-crowd'||type==='stalker-tree')this.hud.say(type);
        else if(type==='ending-voice')this.hud.say('tape-last');
        else if(at)cue(type,at,strength);
        else ambience.rideCue(type);
      },
    });
    this.character=this.hud.character;
    this.hud.phone.bindLog(this.caseLog);
    this.hud.onPhonePreview=()=>this.#photo();
    this.hud.onPhoneAction=(type,contact)=>{
      const result=this.chapter.phoneAction(type,contact,this.player,this.camera.yaw);
      if(result.capture){cue('phone-shot',this.view.position);result.src=this.#photo();}
      else if(result.cue)cue(result.cue,this.view.position,.96);
      if(result.voice)this.hud.say(result.voice);
      if(result.skipped){
        this.hud.renderCase(this.caseLog);
        this.interactions.nextAim=0;
        this.hud.announceWrench();
      }
      return result;
    };
    const toggleTorch=()=>this.hud.renderTorch(this.camera.toggle());
    this.input=new InputController(this.canvas,{...this.hud.inputOptions,onFlashlight:toggleTorch,
      touch:this.hud.touchSetting.checked,
      onJournal:()=>{if(!this.chapter.cinematic&&!this.hud.radioPanel.open&&!this.hud.phone.open&&!this.hud.recorder.open)this.hud.toggleJournal();},
      onPhone:()=>this.hud.togglePhone(),
      onMap:()=>this.hud.toggleMap(),
      onChat:()=>this.hud.toggleChat(),
      optionsOpen:()=>this.hud.panelOpen||this.chapter.cinematic,
      keepCursor:()=>this.hud.cursorSetting.checked,
    });
    this.hud.onTouch=(on)=>this.input.setTouch(on);
    this.hud.onPanelChanged=()=>{
      this.input.releaseControls();
      this.previousTime=null;
      this.accumulator=0;
      if(this.hud.panelOpen){this.hud.clearVoice();this.player.velocity.x=this.player.velocity.z=0;this.hud.renderInteraction(null);this.hud.renderScare(0);}
    };
    this.hud.onScares=(enabled)=>{
      this.scare.setEnabled(enabled);this.haunts.setEnabled(enabled);this.stalker.setEnabled(enabled);
      if(!enabled)this.hud.renderScare(0);
    };
    this.hud.onCursor=(on)=>on?this.input.preferCursor():this.input.waitForLock();
    this.hud.onBrightness=(value)=>{this.renderer.toneMappingExposure=value;this.menuFrame=null;};
    this.hud.onBrightness(this.hud.brightness);
    this.hud.bindLookControls((value)=>this.camera.setSensitivity(value),toggleTorch);
    this.hud.bindEnter(()=>this.input.enter());
    this.hud.bindStory({
      start:resume=>{
        if(this.chapter.mode!=='menu'||resume&&!this.caseLog.hasSave)return;
        if(!resume&&this.caseLog.hasSave){
          this.caseLog.restart();
          try{storage?.removeItem(PHOTO_KEY);}catch{ /* Optional */ }
          this.stalker.resetProgress();this.hud.phone.bindLog(this.caseLog);this.hud.renderCase(this.caseLog);
        }
        this.previousTime=null;
        this.hud.setAudio(this.hud.storyAudio);
        this.chapter.start();
        if(this.chapter.mode==='play')this.#enterVillage();else this.#cinematic(0);
      },
      exit:()=>{
        if(this.chapter.mode!=='arrived')return;
        this.chapter.exit();this.previousTime=null;this.#cinematic(0);
      },
      menu:()=>window.location.reload(),
    });

    this.resize();
    this.hud.setMode(this.input.mode);
    this.hud.renderCase(this.caseLog);
    this.camera.reset(this.player.position);
    // The menu itself does not need the first (shader-heavy) WebGL frame.
    this.hud.renderStory('menu', null, this.caseLog);

    if (typeof ResizeObserver === 'function') {
      this.observer = new ResizeObserver(this.resize);
      this.observer.observe(this.canvas);
    }
    const { signal } = this.events;
    window.addEventListener('resize', this.resize, { signal });
    document.addEventListener('visibilitychange', () => {
      this.previousTime = null;
      this.accumulator = 0;
      if(document.hidden)this.hud.ambience.pauseRide();
    }, { signal });
    this.canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.renderer.setAnimationLoop(null);
      this.input.dispose();
      this.hud.fail('गेम की तस्वीर रुक गई। दोबारा शुरू करने के लिए फिर कोशिश करो।');
    }, { signal });
    this.renderer.setAnimationLoop(this.frame);
  }

  resize() {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    const wideTouchLayout = width >= 480 && width > height;
    if (this.wideTouchLayout != null && wideTouchLayout !== this.wideTouchLayout && this.input?.mode === 'touch') {
      // A held pointer's old joystick bounds aren't valid after a rotation.
      this.input.releaseControls();
    }
    this.wideTouchLayout = wideTouchLayout;
    const small = width < 780 || this.input?.mode === 'touch';
    const pixelBudget = this.softwareRendering ? 232000 : small ? 1320000 : 3200000;
    const ratio = Math.min(window.devicePixelRatio || 1, small ? 1.3 : 1.55, Math.sqrt(pixelBudget / (width * height)));
    if (this.renderer.getPixelRatio() !== ratio) this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
    this.view.aspect = width / height;
    this.view.updateProjectionMatrix();
    this.panorama?.resize(this.view.aspect);
    this.menuFrame=null;
  }

  #enterVillage(){
    this.chapter.restorePlayer(this.player,this.camera);
    this.camera.torch.visible=true;this.camera.torch.shadow.needsUpdate=true;
    this.hud.renderStory('play');this.hud.renderCase(this.caseLog);
    this.hud.ambience.chapterMix('play');
    this.input.enter();
  }

  // Voice Mimic: the same Ravi-like voice answers from behind the CRETA, the
  // school and the trees. It is always just outside your field of view.
  #voiceMimic(time,{feet}){
    if(!this.hud.scareSetting.checked||this.stalker.active||this.hud.panelOpen||document.hidden)return;
    if(time<(this.nextMimicAt??18))return;
    const id=['stalker-road','stalker-crowd','stalker-tree'][this.mimicIndex++%3];
    const side=this.mimicIndex%2?1:-1;
    // Just outside the view cone: about 95° off-centre so the voice never
    // appears to come from the Ravi you can see in the passenger seat.
    const angle=this.camera.yaw+side*(1.62+Math.min(time,80)*.004);
    this.mimicAt.set(feet.x+Math.sin(angle)*7.2,feet.y+1.45,feet.z+Math.cos(angle)*7.2);
    this.hud.say(id,this.mimicAt);
    this.nextMimicAt=time+23.5;
  }

  #cinematic(dt){
    this.falseCompanion?.hide();
    const story=this.chapter, ambience=this.hud.ambience;
    this.camera.torch.visible=false;
    story.advance(dt);
    if(story.mode==='play'){this.#enterVillage();return;}
    const {mode,modeTime:time,car,daylight}=story;
    const menu=mode==='menu',ending=mode==='ending';
    if(menu){
      // Keep the live backdrop without redrawing a still menu on slow GPUs.
      if(this.menuFrame!=null&&(this.softwareRendering||this.reducedMotion||this.elapsed-this.menuFrame<.085))return;
      this.menuFrame=this.elapsed;
    }
    const view=menu?this.panorama.update(this.elapsed):this.view;
    const scares=this.hud.scareSetting.checked, reduced=this.reducedMotion||!scares;
    const escaping=mode==='escape', escapeTime=ending?ESCAPE.end:time;
    // The epilogue plays through three camera stages: the highway tail, the
    // rear seat, then the same nameless road again at 11:59 PM.
    const night=ending&&time>=ENDING.credits;
    const rearShot=ending&&time>=ENDING.reveal&&!night;
    let motion;
    if(mode==='repair')car.repair(view,time,this.reducedMotion);
    else if(mode==='final-repair')car.finalRepair(view,time,this.reducedMotion,story.repairFrom);
    else if(escaping||ending){
      if(night)motion=car.postCredits(view,time,reduced);
      else if(rearShot)motion=car.rearSeatShot(view,time,reduced);
      else motion=car.escape(view,escapeTime,reduced);
      if(escaping){
        this.horde??=createGhostHorde(this.scene,this.textures,{seed:this.caseLog.seed,compact:this.compact,leader:this.stalker.actor});
        this.impactDust??=createImpactDust(this.scene,{compact:this.compact});
        this.horde.update(time,view,car.car,motion,reduced);this.impactDust.update(time,reduced);
      }else{
        this.horde?.hide();this.impactDust?.hide();
        if(!rearShot)this.hud.clearVoice();
      }
    }
    else if(!menu)car.pose(view,time,mode,this.reducedMotion,daylight);
    if(escaping&&time>=ESCAPE.windshield&&time<ESCAPE.dawn){
      this.finaleHazards??=createFinaleHazards(this.scene,this.textures);
      this.finaleHazards.update(time,car.car,{scares,reduced});
    }else this.finaleHazards?.hide();
    if((escaping||ending)&&!night&&escapeTime>=ESCAPE.breakaway){
      this.highway??=createHighwayScene(this.scene,this.textures,{compact:this.compact});
      this.highway.update(escapeTime,view,this.reducedMotion);
    }else this.highway?.hide();
    ambience.chapterMix(mode);
    if(!document.hidden){
      if(mode==='drive')ambience.updateRide(time);
      else if(mode==='escape')ambience.updateRide(time,escapeMotor(time,motion));
      else if(mode==='final-repair'&&time>=FIX.ignition+.62)ambience.updateRide(0,escapeMotor(0));
    }
    const blackout=escaping&&time<ESCAPE.headlamps?.72:0;
    const morning=!night&&(escaping||ending)&&escapeTime>=ESCAPE.dawn;
    const fog=escaping&&time<ESCAPE.headlamps?.0136:
      morning?MathUtils.lerp(.015,.0064,MathUtils.smoothstep(escapeTime,ESCAPE.dawn,ESCAPE.merge+.8)):undefined;
    const propsMoved=mode==='repair'||mode==='final-repair'||escaping;
    this.world.update(this.elapsed,view,this.player,false,propsMoved,{daylight:night?0:daylight,blackout,fog,quiet:true,cinematic:true});
    ambience.update(this.elapsed,view,this.player,null);
    this.hud.renderStory(mode,story.copy,this.caseLog,time,story.clock,motion?.shot);
    this.renderer.render(this.scene,view);
  }

  #used(action,phase){
    if(phase==='leave'){
      if(action.machine?.type==='swing')this.scare.queue('empty-swing','swing',action.at,()=>action.machine.jolt());
      return;
    }
    if(action.kind==='radio'){this.hud.openRadio();return;}
    this.chapter.use(action,this.player,this.camera.yaw,this.view.position);
    if(this.chapter.mode==='final-repair'){
      this.input.releaseControls();
      if(document.pointerLockElement===this.canvas)document.exitPointerLock();
      this.player.velocity.set(0,0,0);this.accumulator=0;
      this.view.fov=CAMERA.fov;this.view.updateProjectionMatrix();
      this.highlight.update(this.elapsed,null);
      this.stalker.clear();this.haunts.cancel();this.falseCompanion?.hide();this.nextMimicAt=this.elapsed+18;
      this.hud.clearVoice();this.hud.renderScare(0);this.hud.renderInteraction(null);
      this.hud.ambience.updateMotors(this.view,[]);
    }
    if(action.id==='well-tags')this.hud.showEvidence({item:'पीतल पर खुदा संदेश',text:'“जवाब मत देना। तुम्हारे नाम पर बुला रहा है — और तुम्हारे साथ वाला पहले से जवाब दे चुका है।”'});
  }

  #photo(){
    try{
      this.renderer.render(this.scene,this.view);
      const image=document.createElement('canvas'),scale=Math.min(1,560/Math.max(this.canvas.width,this.canvas.height));
      image.width=Math.max(1,Math.round(this.canvas.width*scale));image.height=Math.max(1,Math.round(this.canvas.height*scale));
      image.getContext('2d').drawImage(this.canvas,0,0,image.width,image.height);
      return image.toDataURL('image/jpeg',.77);
    }catch{ return null; }
  }

  frame(timestamp) {
    const first=this.previousTime==null;
    const frameDelta=first?0:Math.max(0,(timestamp-this.previousTime)/1000);
    const dt=Math.min(frameDelta,.15);
    this.previousTime=timestamp;
    this.elapsed+=dt;
    // Use the story clock, not physics frames. Cap long shader/driver stalls
    // in the finale so a slow draw can't skip over the reveal or the crash.
    if(this.chapter.cinematic){
      if(first&&this.chapter.mode==='menu')return;
      const finale=this.chapter.mode==='escape'||this.chapter.mode==='final-repair';
      this.#cinematic(this.hud.panelOpen||document.hidden?0:finale?Math.min(.54,frameDelta):frameDelta);
      return;
    }
    this.accumulator+=dt;
    let active=!this.hud.panelOpen&&!document.hidden;
    let controls=active;
    const {dx,dy}=this.input.takeLook();
    if(controls)this.camera.look(dx,dy);
    const movement=this.input.readMovement();
    const use=this.input.takeUse();
    while(this.accumulator>=FIXED_STEP){
      const jump=this.input.takeJump();
      if(active){
        const command=this.interactions.movement(movement,jump&&controls&&!(use&&this.interactions.seated),this.player);
        if(!this.interactions.seated)this.player.step(FIXED_STEP,{...command.movement,jump:command.jump},this.camera.yaw);
      }
      this.accumulator-=FIXED_STEP;
    }
    const propsMoved=active&&this.interactions.tick(dt,this.player);
    this.camera.update(dt,this.player,this.elapsed,this.interactions.cameraAnchor(),propsMoved);
    if(controls&&use){
      const aim=typeof use==='object'?use:null;
      this.hud.notice(this.interactions.activate(this.view,this.player,aim));
      if(this.chapter.cinematic){this.#cinematic(0);return;}
      if(this.hud.panelOpen)active=controls=false;
    }
    const seated=!!this.interactions.seated,room=this.world.roomAt(this.player.position);
    const exploring=active;
    const weather=this.storm.update(exploring?dt:0,this.view.position,!!room);
    if(exploring){
      this.scare.update(dt,this.view,{seated});
      const context={view:this.view,feet:this.player.position,velocity:this.player.velocity,room,seated,grounded:this.player.grounded};
      this.stalker.update(dt,context);
      if(this.stalker.active){if(this.haunts.encounter)this.haunts.cancel();}
      else this.haunts.update(dt,context);
      this.falseCompanion?.update(dt,this.elapsed,this.player.position,this.view,
        this.hud.scareSetting.checked&&!this.stalker.active&&!room);
      this.#voiceMimic(this.elapsed,context);
    }else this.falseCompanion?.hide();
    this.world.update(this.elapsed,this.view,this.player,this.camera.enabled,propsMoved,{weather,paused:!active,blackout:this.stalker.blackout});
    const location=this.world.locationAt(this.player.position,room);
    this.hud.renderLocation(!room&&this.player.position.z>-8&&Math.abs(this.player.position.x)<16?`${VILLAGE_NAME} की चौखट`:location);
    this.hud.renderInteraction(this.interactions.prompt(this.elapsed,this.view,controls));
    const objective=this.chapter.target;
    this.guide.update(this.player.position,objective,room?.site.id);
    this.hud.renderNavigation(this.elapsed,this.player.position,this.camera.heading,objective,this.guide);
    this.hud.renderWaypoint(this.view,active?objective:null,this.world.collision,this.interactions.windowOcclusion);
    this.highlight.update(this.elapsed,this.hud.tracker.hidden?null:objective,this.view);
    this.hud.renderWorld(this.chapter.clock,exploring?(this.stalker.hint||this.haunts.hint):'');
    if(this.hud.chat?.client && this.elapsed-(this.lastChatLocation??0)>2){
      this.lastChatLocation=this.elapsed;
      this.hud.chat.client.setLocation(location);
    }
    const ambience=this.hud.ambience;
    const tension=exploring?Math.max(this.scare.level,this.haunts.level,this.stalker.level,this.stalker.blackout*.7):0;
    ambience.update(this.elapsed,this.view,this.player,room,{rain:weather.rain,paused:!active,tension});
    ambience.updateMotors(this.view,this.world.vehicles);
    this.hud.renderScare(exploring?Math.max(this.scare.level,this.haunts.level,this.stalker.level):0,
      exploring&&(this.stalker.phase==='seen'||this.haunts.phase==='showing'&&this.haunts.encounter?.type==='jump'),exploring&&this.stalker.phase==='seen');
    this.hud.renderHeading(this.camera.heading);
    this.renderer.render(this.scene,this.view);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.events.abort();
    this.observer?.disconnect();
    this.input?.dispose();
    this.highlight?.dispose();
    this.world?.dispose();
    this.highway?.dispose();
    const geometries = new Set(), materials = new Set();
    this.scene.traverse((object) => {
      if (object.isInstancedMesh) object.dispose();
      if (object.isSkinnedMesh) object.skeleton.dispose();
      if (object.geometry) geometries.add(object.geometry);
      if (Array.isArray(object.material)) object.material.forEach(material=>materials.add(material));
      else if (object.material) materials.add(object.material);
      if (object.shadow) object.shadow.dispose();
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    disposeWorldTextures(this.textures);
    this.renderer.dispose();
  }
}
