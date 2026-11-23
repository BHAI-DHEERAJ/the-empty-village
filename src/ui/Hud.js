import { MathUtils } from 'three';
import { INTRO } from '../game/story/IntroSequence.js';
import { REPAIR } from '../game/story/RepairSequence.js';
import { ENDING, ESCAPE, ESCAPE_END, FINAL_RUN_SECONDS, FIX } from '../game/story/CretaFinale.js';
import { CRETA_RETURN } from '../game/story/VillageChapter.js';
import { glitchedText } from '../game/story/HouseClues.js';
import { defaultTouchControls } from '../game/input/InputController.js';
import { TapeRecorder } from './TapeRecorder.js';
import { VOICE_LINES } from '../game/audio/VoiceLines.js';
import { Phone } from './Phone.js';
import { RADIO_TRACK } from '../game/audio/RadioTrack.js';
import { VILLAGE_NAME } from '../game/world/VillageName.js';
import { VillageMap } from './VillageMap.js';
import { CarWaypoint } from './CarWaypoint.js';
import { RideMusic } from './RideMusic.js';
import { CHARACTERS, getCharacter, savedCharacterId, selectCharacter } from '../game/story/Characters.js';

const DIRECTIONS = ['उत्तर', 'उत्तर-पूर्व', 'पूरब', 'दक्षिण-पूर्व', 'दक्षिण', 'दक्षिण-पश्चिम', 'पश्चिम', 'उत्तर-पश्चिम'];
const TAPE_SCALE = 2.52;
const EMPTY_ROUTE = Object.freeze([]);
const STORY_LENGTH = { drive: INTRO.end, repair: REPAIR.end, 'final-repair': FIX.end, escape: ESCAPE.end, ending: ENDING.end };
const digits = (value, min = 0) => String(value).padStart(min,'0');

function storyFade(mode,time) {
  if (mode === 'final-repair' && time >= FIX.cut) return (time-FIX.cut)/(FIX.end-FIX.cut);
  if (mode === 'escape') {
    if (time < .55) return 1-time/.55;
    if (time >= ESCAPE.cut) return .35*(time-ESCAPE.cut)/(ESCAPE.end-ESCAPE.cut);
  }
  // The epilogue darkens over the rear-seat reveal; the post-credit road is
  // dimmer still, ending on a near-black nameless road at 11:59 PM.
  if (mode === 'ending') {
    if (time >= ENDING.credits) return MathUtils.lerp(.52,.82,MathUtils.smoothstep(time,ENDING.credits,ENDING.end));
    if (time >= ENDING.reveal) return .2*MathUtils.smoothstep(time,ENDING.reveal,ENDING.credits);
  }
  return 0;
}

function rewind(audio){
  audio.pause();
  if(audio.currentTime>0)audio.currentTime=0;
}

export class Hud {
  constructor(shell, ambience) {
    this.shell = shell;
    this.ambience = ambience;
    const find = (id) => shell.querySelector(`#${id}`);
    this.enterButton = find('enter-button');
    this.caption = find('entry-caption');
    this.hint = find('play-hint');
    this.error = find('error-note');
    this.errorText = find('error-message');
    this.status = find('game-status');
    this.audio = find('audio-button');
    this.fullscreen = find('fullscreen-button');
    this.tape = find('compass-strip');
    this.reading = find('compass-reading');
    this.flashlights = [find('flashlight-button'), find('touch-light')];
    this.settingsButton = find('options-button');
    this.settings = find('settings-box');
    this.sensitivityRange = find('mouse-sensitivity');
    this.sensitivityOutput = find('sensitivity-value');
    this.reticle = shell.querySelector('.reticle');
    this.interact = find('interact-prompt');
    this.actionLabel = find('interact-label');
    this.actionDetail = find('interact-detail');
    this.touchUse = find('touch-use');
    this.touchUseLabel = find('touch-use-label');
    this.shade = find('scare-shade');
    this.scareSetting = find('scares-setting');
    this.caseTrack = find('case-track-setting');
    this.tracker = find('case-tracker');
    this.caseTitle = find('case-current');
    this.caseWrench = find('case-wrench');
    this.caseProgress = find('case-progress');
    this.carWaypoint = new CarWaypoint(find('car-waypoint'));
    this.fieldHud = find('field-hud');
    this.mapArea = find('map-area');
    this.mapButton = find('map-open');
    this.mapPanel = find('map-dialog');
    this.miniMap = new VillageMap(find('mini-map-view'), {id:'local-survey'});
    this.atlas = new VillageMap(find('atlas-map-view'), {id:'village-survey',overview:true});
    this.mapMissionScene = find('map-mission-scene');
    this.mapMissionTitle = find('map-mission-title');
    this.mapMissionHint = find('map-mission-hint');
    this.journal = find('journal-box');
    this.journalButton = find('journal-button');
    this.journalClose = find('journal-close');
    this.journalChapters = find('journal-chapters');
    this.journalReturn = find('journal-return');
    find('journal-return-hint').textContent=CRETA_RETURN.hint;
    this.evidence = find('evidence-note');
    this.evidenceKicker = find('evidence-kicker');
    this.evidenceTitle = find('evidence-title');
    this.evidenceText = find('evidence-text');
    this.cursorSetting=find('cursor-setting');this.brightnessInput=find('brightness-setting');this.brightnessOutput=find('brightness-value');
    this.storyCover=find('story-cover');this.storyTitle=find('story-title');this.storyCopy=find('story-copy');
    this.menu=find('main-menu');this.storyMain=find('story-main');
    this.storyNew=find('story-new');this.storyContinue=find('story-continue');this.menuSave=find('menu-save');
    this.newGameSub=find('new-game-sub');
    this.menuSettings=find('menu-settings');this.menuSound=find('menu-sound');this.menuSoundLabel=find('menu-sound-label');
    this.newGameConfirm=find('new-game-confirm');this.newGameCancel=find('new-game-cancel');this.newGameStart=find('new-game-start');
    this.storyExit=find('story-exit');this.storyEndMenu=find('story-end-menu');this.settingsMenu=find('settings-menu');
    this.storyRun=find('story-run');this.storyCountdown=find('story-countdown');this.storyClock=find('story-clock');
    this.storyProgress=find('story-progress');
    this.voiceCaption=find('voice-caption');this.voiceText=find('voice-text');
    this.run=find('touch-run');this.jump=find('touch-jump');
    this.touchSetting=find('touch-setting');
    try{this.touchSetting.checked=({on:true,off:false})[localStorage.getItem('sastrod-touch-stick')]??defaultTouchControls();}
    catch{this.touchSetting.checked=defaultTouchControls();}
    const carAudio=find('car-radio-audio');
    this.radioPanel=find('radio-panel');this.teaAudio=find('tea-radio-audio');
    find('radio-song').textContent=RADIO_TRACK.title;find('radio-artist').textContent=RADIO_TRACK.artist;
    carAudio.src=this.teaAudio.src=RADIO_TRACK.src;
    this.teaAudio.volume=.77;
    this.phoneButtons=[find('phone-button'),find('touch-phone')];this.clock=find('world-clock');
    this.chatButtons=[find('chat-button'),find('touch-chat')];this.chatBadge=find('chat-badge');
    this.menuChatButton=find('menu-chat-button');
    this.characterChoices=[...shell.querySelectorAll('[data-character]')];
    this.character=getCharacter(savedCharacterId());
    this.hauntClue=find('haunt-clue');
    this.inputOptions = {
      stick: find('touch-stick'), thumb: find('touch-thumb'), jumpButton: this.jump, useButton: this.touchUse, runButton:this.run,
      onMode: (mode) => this.setMode(mode),
    };
    this.toast = document.createElement('p');
    this.toast.className = 'hud-toast eyebrow';
    this.toast.hidden = true;
    this.toast.setAttribute('role', 'status');
    shell.append(this.toast);
    this.events = new AbortController();
    const {signal}=this.events;
    this.#bindCharacters();
    this.rideMusic=new RideMusic(carAudio,signal);
    this.#rememberAudio(this.#preference('empty-village-sound'));
    this.recorder=new TapeRecorder(shell,{signal,mix:open=>this.ambience.setRadioOpen(open),change:(open,opener)=>{
      if(!open)(opener?.isConnected&&opener.matches('button')?opener:this.shell.querySelector('canvas')).focus({preventScroll:true});
      this.#refreshTracker();this.onPanelChanged?.();
    }});
    this.touchSetting.addEventListener('change',()=>{
      this.#store('sastrod-touch-stick',this.touchSetting.checked);this.onTouch?.(this.touchSetting.checked);
    },{signal});
    find('radio-close').addEventListener('click',()=>this.radioPanel.close(),{signal});
    this.radioPanel.addEventListener('close',()=>{
      if(this.radioPanel.open)return;
      rewind(this.teaAudio);this.ambience.setRadioOpen(false);
      this.#refreshTracker();this.onPanelChanged?.();
    },{signal});
    this.teaAudio.addEventListener('playing',()=>this.ambience.setRadioOpen(this.radioPanel.open),{signal});
    for(const event of ['pause','ended','error'])this.teaAudio.addEventListener(event,()=>this.ambience.setRadioOpen(false),{signal});
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden)this.clearVoice();
    },{signal});
    this.phone=new Phone(shell,{signal,clock:()=>this.clock.textContent,action:(...args)=>this.onPhoneAction?.(...args)??{},
      preview:()=>this.onPhonePreview?.(),onChange:open=>{
        if(!open)this.shell.querySelector('canvas').focus({preventScroll:true});
        this.#refreshTracker();this.onPanelChanged?.();
      }});
    for (const button of this.phoneButtons) button.addEventListener('click',()=>this.togglePhone(),{signal});
    for (const button of this.chatButtons) button.addEventListener('click',()=>this.toggleChat(),{signal});
    this.menuChatButton?.addEventListener('click',()=>this.toggleChat(),{signal});
    this.#bindMap(find('map-close'));
    this.#buildCompass();
    this.#bindButtons(find('retry-button'));
    this.#bindSettings(find('settings-close'),find('settings-reset'));
    this.#bindJournal();
  }

  #bindCharacters() {
    const { signal } = this.events;
    const apply = (id) => {
      this.character = selectCharacter(id);
      for (const choice of this.characterChoices) choice.setAttribute('aria-pressed', String(choice.dataset.character === id));
      this.newGameSub.textContent = this.character.tagline;
      this.onCharacter?.(this.character);
    };
    for (const choice of this.characterChoices) choice.addEventListener('click', () => apply(choice.dataset.character), { signal });
    apply(savedCharacterId());
  }

  attachChat(chat) {
    this.chat = chat;
    chat.onOpenChange = (open) => {
      [...this.chatButtons,...(this.menuChatButton?[this.menuChatButton]:[])].forEach(button => button.setAttribute('aria-expanded', String(open)));
      this.#refreshTracker();this.onPanelChanged?.();
      if (!open) this.shell.querySelector('canvas').focus({ preventScroll: true });
    };
    chat.onUnread = (count) => {
      this.chatBadge.hidden = !count;
      this.chatBadge.textContent = String(count);
    };
  }

  toggleChat() {
    if (!this.chat || this.shell.dataset.mode === 'loading' || this.shell.dataset.mode === 'error') return;
    if (!this.chat.open && this.shell.dataset.story && this.shell.dataset.story !== 'menu') return;
    if (!this.chat.open && this.panelOpen) return;
    this.chat.toggle();
  }

  #buildCompass() {
    this.letters = [];
    const fragment = document.createDocumentFragment();
    for (let degrees = -90; degrees <= 450; degrees += 5) {
      const major = degrees % 45 === 0;
      const tick = document.createElement('i');
      const offset = `${degrees * TAPE_SCALE}px`;
      tick.className = `compass-tick${major ? ' major' : ''}`;
      tick.style.left = offset;
      fragment.append(tick);
      if (major) {
        const text = document.createElement('span');
        text.className = 'compass-letter';
        text.style.left = offset;
        text.textContent = DIRECTIONS[((degrees / 45) % 8 + 8) % 8];
        this.letters.push({ degrees, text });
        fragment.append(text);
      }
    }
    this.tape.append(fragment);
  }

  #bindButtons(retry) {
    const { signal } = this.events;
    retry.addEventListener('click', () => window.location.reload(), { signal });
    this.audio.addEventListener('click',() => this.setAudio(!this.ambience.enabled),{signal});
    this.fullscreen.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement === this.shell) await document.exitFullscreen();
        else await this.shell.requestFullscreen();
      } catch {
        this.#message('यहाँ पूरी स्क्रीन नहीं खुल पाई।');
      }
    }, { signal });
    document.addEventListener('fullscreenchange', () => {
      const on = document.fullscreenElement === this.shell;
      this.fullscreen.setAttribute('aria-pressed', String(on));
      this.fullscreen.title = on ? 'पूरी स्क्रीन से बाहर आओ' : 'पूरी स्क्रीन करो';
    }, { signal });
  }

  async setAudio(on){
    this.#rememberAudio(on);
    this.audio.disabled=true;
    try{
      const enabled=await this.ambience.setEnabled(on);
      this.audio.setAttribute('aria-pressed',String(enabled));
      this.audio.title=enabled?'आवाज़ बंद करो':'आवाज़ चालू करो';
    }catch{this.#message('इस ब्राउज़र में आवाज़ नहीं चल पाई।');}
    finally{
      this.audio.disabled=this.shell.dataset.mode==='error';
      if(this.audio.matches(':focus')&&matchMedia('(pointer: fine)').matches)this.shell.querySelector('canvas').focus({preventScroll:true});
    }
  }

  #rememberAudio(on){
    this.storyAudio=on;this.rideMusic.setSound(on);
    this.#store('empty-village-sound',on);
    this.menuSound.setAttribute('aria-pressed',String(on));
    this.menuSoundLabel.textContent=on?'Sound on':'Sound off';
  }

  #bindSettings(close, reset) {
    const { signal } = this.events;
    const key = 'empty-village-look-sensitivity';
    let initial = 1;
    try { initial = Number(localStorage.getItem(key)) || 1; } catch { /* optional */ }
    const apply = (value) => {
      this.sensitivity = Math.min(2.5, Math.max(.25, Number(value) || 1));
      this.sensitivityRange.value = String(this.sensitivity);
      this.sensitivityOutput.value = `${digits(this.sensitivity.toFixed(2))}×`;
      try { localStorage.setItem(key, String(this.sensitivity)); } catch { /* optional */ }
      this.onSensitivity?.(this.sensitivity);
    };
    const show = (open) => {
      if (open) this.#showJournal(false, false);
      this.settings.hidden = !open;
      const fromMenu=this.shell.dataset.story==='menu';
      this.storyCover.inert=open&&fromMenu;
      this.settingsMenu.hidden=fromMenu;
      this.onPanelChanged?.();this.#refreshTracker();
      this.settingsButton.setAttribute('aria-expanded', String(open));
      this.menuSettings.setAttribute('aria-expanded', String(open));
      if (open) {
        if (document.pointerLockElement) document.exitPointerLock();
        this.sensitivityRange.focus();
      } else (fromMenu?this.menuSettings:this.settingsButton).focus();
    };
    this.showSettings = show;
    this.settingsButton.addEventListener('click', () => show(this.settings.hidden), { signal });
    close.addEventListener('click', () => show(false), { signal });
    reset.addEventListener('click', () => apply(1), { signal });
    this.sensitivityRange.addEventListener('input', () => apply(this.sensitivityRange.value), { signal });
    this.settings.addEventListener('keydown', (event) => { if(event.code==='Escape') { event.stopPropagation(); show(false); } }, { signal });
    apply(initial);
    this.cursorSetting.checked=this.#preference('devgarh-cursor');
    this.cursorSetting.addEventListener('change',()=>{
      this.#store('devgarh-cursor',this.cursorSetting.checked);
      this.onCursor?.(this.cursorSetting.checked);
    },{signal});
    const setBrightness=()=>{
      this.brightness=Number(this.brightnessInput.value);
      this.brightnessOutput.value=`${digits(Math.round(this.brightness*100))}%`;
      try {localStorage.setItem('devgarh-exposure',String(this.brightness));} catch { /* optional */ }
      this.onBrightness?.(this.brightness);
    };
    try {this.brightnessInput.value=String(Number(localStorage.getItem('devgarh-exposure'))||1.15);} catch { /* optional */ }
    this.brightnessInput.addEventListener('input',setBrightness,{signal});setBrightness();
    this.scareSetting.checked = this.#preference('empty-village-scares');
    this.scareSetting.addEventListener('change', () => {
      this.#store('empty-village-scares', this.scareSetting.checked);
      this.onScares?.(this.scareSetting.checked);
    }, { signal });
  }

  #preference(key) {
    try { return localStorage.getItem(key) !== 'off'; } catch { return true; }
  }

  #store(key, value) {
    try { localStorage.setItem(key, value ? 'on' : 'off'); } catch { /* optional */ }
  }

  #bindJournal() {
    const { signal } = this.events;
    this.journalButton.addEventListener('click', () => this.toggleJournal(), { signal });
    this.journalClose.addEventListener('click', () => this.#showJournal(false), { signal });
    this.journal.addEventListener('keydown', (event) => {
      if (event.code !== 'Escape') return;
      event.stopPropagation();
      this.#showJournal(false);
    }, { signal });
    this.caseTrack.checked = this.#preference('empty-village-track-case');
    this.caseTrack.addEventListener('change', () => {
      this.#store('empty-village-track-case', this.caseTrack.checked);
      this.#refreshTracker();
    }, { signal });
  }

  get panelOpen() { return this.mapPanel.open || this.recorder.open || this.radioPanel.open || this.phone.open || !!this.chat?.open || !this.settings.hidden || !this.journal.hidden; }

  togglePhone(){
    if (this.phone.open || !this.phoneButtons[0].disabled && !this.shell.dataset.story && !this.panelOpen) this.phone.toggle();
  }

  #bindMap(close) {
    const {signal} = this.events;
    this.mapButton.addEventListener('click', () => this.toggleMap(), {signal});
    close.addEventListener('click', () => this.mapPanel.close(), {signal});
    this.mapPanel.addEventListener('close', () => {
      if (this.mapPanel.open) return;
      this.#refreshTracker(); this.onPanelChanged?.();
      if (!this.fieldHud.hidden) this.mapButton.focus({preventScroll:true});
    }, {signal});
  }

  toggleMap() {
    if (this.mapPanel.open) { this.mapPanel.close(); return; }
    if (this.fieldHud.hidden || this.panelOpen) return;
    if (document.pointerLockElement) document.exitPointerLock();
    this.mapPanel.showModal();
    this.#refreshTracker(); this.onPanelChanged?.();
    if (this.mapFrame) this.atlas.render(...this.mapFrame,true);
  }

  openTape(id,complete){this.clearVoice();return this.recorder.show(id,complete);}

  say(id,position){
    const line=VOICE_LINES[id];if(!line||document.hidden||this.panelOpen)return;
    this.clearVoice();this.voiceText.textContent=line.text;this.voiceCaption.hidden=false;
    this.ambience.speak(line.src,position);
    this.voiceTimer=window.setTimeout(()=>{this.voiceCaption.hidden=true;},Math.min(10,line.seconds??6)*1000);
  }

  clearVoice(){clearTimeout(this.voiceTimer);this.voiceCaption.hidden=true;this.ambience.stopSpeaking();}

  openRadio() {
    if(this.radioPanel.open||this.shell.dataset.story)return;
    if(document.pointerLockElement)document.exitPointerLock();
    this.radioPanel.showModal();
    this.#refreshTracker();this.onPanelChanged?.();
  }

  #showJournal(open, focus = true) {
    if (open && !this.settings.hidden) this.showSettings(false);
    this.journal.hidden = !open;
    this.journalButton.setAttribute('aria-expanded', String(open));
    this.#refreshTracker();
    this.onPanelChanged?.();
    if (open) {
      if (document.pointerLockElement) document.exitPointerLock();
      this.journalClose.focus({ preventScroll: true });
    } else if (focus) this.journalButton.focus({ preventScroll: true });
  }

  toggleJournal() {
    if (!this.journalButton.disabled && !this.mapPanel.open) this.#showJournal(this.journal.hidden);
  }

  #refreshTracker() {
    const mode = this.shell.dataset.mode, panelOpen = this.panelOpen;
    if (panelOpen) this.shell.dataset.panel = this.mapPanel.open ? 'map' : this.recorder.open ? 'tape' : this.radioPanel.open ? 'radio' : this.phone.open ? 'phone' : this.chat?.open ? 'chat' : this.journal.hidden ? 'settings' : 'journal';
    else delete this.shell.dataset.panel;
    this.fieldHud.hidden = !this.caseReady || panelOpen || !!this.shell.dataset.story || mode === 'loading' || mode === 'error';
    this.tracker.hidden = this.fieldHud.hidden || !this.caseTrack.checked;
    if (this.tracker.hidden || !this.caseLog?.hasWrench) this.carWaypoint.hide();
  }

  renderCase(log) {
    const {current,progress,steps}=log;this.caseLog=log;
    this.caseReady = true;
    const count = `${digits(progress,2)} / ${digits(steps.length,2)}`;
    const goal = current ?? (log.hasWrench ? CRETA_RETURN : null);
    const title = goal?.title ?? (log.escaped ? ESCAPE_END.title : 'पाँचों मिशन पूरे');
    const district = goal?.district ?? 'अंतिम सफ़र';
    const hint = goal?.hint ?? (log.escaped ? ESCAPE_END.text : 'कृष CRETA से लौट रहा है।');
    this.caseProgress.textContent = count;
    this.caseTitle.textContent = this.mapMissionTitle.textContent = title;
    this.caseWrench.hidden = this.journalReturn.hidden = !log.hasWrench;
    this.mapMissionHint.textContent = hint;
    this.mapMissionScene.textContent = `${count} · ${district}`;
    const rows=steps.map((mission,i)=>{
      const li=document.createElement('li'),number=document.createElement('span'),title=document.createElement('strong'),note=document.createElement('p');
      number.className='eyebrow';number.textContent=digits(i+1,2);
      const found=log.has(mission.id),active=mission===current;
      li.dataset.step=found?'found':active?'current':'unknown';
      title.textContent=mission.title;
      if(found){
        const details=document.createElement('details'),summary=document.createElement('summary');
        summary.append(number,title);note.textContent=glitchedText(mission,(this.readCounts?.get(mission.id)??0)+1);details.append(summary,note);
        if(mission.tape){
          const replay=document.createElement('button');replay.type='button';replay.className='tape-replay';replay.textContent='रिकॉर्डिंग फिर सुनो';
          replay.addEventListener('click',()=>this.openTape(mission.tape));details.append(replay);
        }
        li.append(details);
      }else{
        if(active)li.setAttribute('aria-current','step');
        note.textContent=active?mission.hint:mission.district;li.append(number,title,note);
      }
      return li;
    });
    this.journalChapters.replaceChildren(...rows);
    this.#refreshTracker();
  }

  renderNavigation(time,feet,heading,objective,guide) {
    const goal = this.caseTrack.checked ? objective : null;
    this.mapFrame = [time,feet,heading,goal ? guide.remainingPath : EMPTY_ROUTE,goal];
    if (this.mapPanel.open) this.atlas.render(...this.mapFrame);
    else if (!this.fieldHud.hidden) this.miniMap.render(...this.mapFrame);
  }

  renderWaypoint(view, objective, collision, windows) {
    this.carWaypoint.update(view, this.tracker.hidden ? null : objective, collision, windows);
  }

  bindStory({start,exit,menu}){
    const {signal}=this.events;
    this.storyContinue.addEventListener('click',()=>{
      start(true);
      if(['play','repair','final-repair'].includes(this.storyCover.dataset.phase))this.rideMusic.prime();
    },{signal});
    this.storyNew.addEventListener('click',()=>{
      if(this.caseLog.hasSave)this.newGameConfirm.showModal();else start(false);
    },{signal});
    this.newGameCancel.addEventListener('click',()=>this.newGameConfirm.close(),{signal});
    this.newGameStart.addEventListener('click',()=>{this.newGameConfirm.close();start(false);},{signal});
    this.menuSettings.addEventListener('click',()=>this.showSettings(true),{signal});
    this.menuSound.addEventListener('click',()=>this.#rememberAudio(!this.storyAudio),{signal});
    this.settingsMenu.addEventListener('click',menu,{signal});
    this.storyEndMenu.addEventListener('click',menu,{signal});
    this.storyExit.addEventListener('click',exit,{signal});
  }

  renderStory(mode,copy,log,time=0,clock='16:40',shot){
    const changed=this.storyCover.dataset.phase!==mode;
    const chase=mode==='escape', shotMode=chase||mode==='ending';
    this.rideMusic.update(mode,time);
    if(shotMode&&this.shell.dataset.escapeShot!==shot)this.shell.dataset.escapeShot=shot;
    else if(!shotMode&&this.shell.hasAttribute('data-escape-shot'))delete this.shell.dataset.escapeShot;
    this.storyCover.dataset.phase=mode;
    if(mode==='play'){
      this.storyCover.hidden=true;delete this.shell.dataset.story;this.#refreshTracker();return;
    }
    const menu=mode==='menu',length=STORY_LENGTH[mode];
    this.shell.dataset.story=mode;this.storyCover.hidden=false;
    if(changed){
      this.menu.hidden=!menu;this.storyMain.hidden=menu;
      this.storyExit.hidden=mode!=='arrived';this.storyEndMenu.hidden=mode!=='ending';
      this.storyProgress.hidden=!length;
      if(length)this.storyProgress.max=length;
      this.#refreshTracker();
    }
    if(menu){
      if(!changed)return;
      this.menu.toggleAttribute('data-save',log.hasSave);
      this.storyContinue.disabled=!log.hasSave;
      const place=log.escaped?'सुरक्षित बाहर':log.hasWrench?CRETA_RETURN.title:log.finished?'अंतिम सफ़र':
        log.opening==='repair'?'सड़क की मरम्मत':log.current?.district;
      this.menuSave.textContent=log.hasSave?`${digits(log.progress,2)} / 05 पूरे · ${place}`:'अभी कोई सेव नहीं';
      return;
    }
    const running=chase&&time>=ESCAPE.breakaway;
    this.storyRun.hidden=!running;
    if(running){
      const clear=time>=ESCAPE.merge;
      const remaining=Math.min(FINAL_RUN_SECONDS,Math.ceil(ESCAPE.merge-time));
      const label=clear?'राजमार्ग':`${remaining} सेकंड बाकी`;
      if(this.storyCountdown.textContent!==label)this.storyCountdown.textContent=label;
      this.storyRun.toggleAttribute('data-clear',clear);
      this.storyClock.hidden=!clear;
      if(clear&&this.storyClock.textContent!==clock)this.storyClock.textContent=clock;
    }
    if(length)this.storyProgress.value=time;
    const fade=storyFade(mode,time).toFixed(3);
    if(fade!==this.lastStoryFade){this.lastStoryFade=fade;this.storyCover.style.setProperty('--story-fade',fade);}
    if(!changed&&copy===this.lastStoryCopy)return;
    this.lastStoryCopy=copy;
    this.storyTitle.textContent=copy?.title??'';
    this.storyCopy.textContent=copy?.text??'';
    if(changed&&mode==='arrived')this.storyExit.focus({preventScroll:true});
    if(changed&&mode==='ending')this.storyEndMenu.focus({preventScroll:true});
  }

  renderWorld(clock,haunt){
    if(this.clock.textContent!==clock)this.clock.textContent=clock;
    if(this.hauntClue.textContent!==haunt)this.hauntClue.textContent=haunt;
    this.hauntClue.hidden=!haunt||this.panelOpen;
  }

  renderInteraction(prompt) {
    const touch = this.shell.dataset.mode === 'touch';
    const key = prompt ? `${prompt.label}|${prompt.name}|${prompt.detail}|${prompt.locked}|${prompt.touchLabel}|${touch}` : '';
    if (this.lastPrompt === key) return;
    this.lastPrompt = key;
    this.interact.hidden = !prompt;
    this.touchUse.disabled = !prompt || !touch;
    this.touchUseLabel.textContent = prompt?.touchLabel ?? 'इस्तेमाल';
    if (!prompt) this.touchUse.setAttribute('aria-label','इस्तेमाल करो');
    this.reticle.classList.toggle('is-interactive', !!prompt);
    if (prompt) {
      this.actionLabel.textContent = prompt.label;
      this.actionDetail.textContent = prompt.detail ?? (prompt.locked ? 'बंद है' : prompt.name);
      this.touchUse.setAttribute('aria-label', prompt.label);
    }
  }

  announceWrench() {
    clearTimeout(this.evidenceTimer);
    this.evidence.hidden = true;
    this.status.textContent = 'रिंच मिल गया। CRETA तक लौटो।';
  }

  showEvidence(chapter, { readAgain = false } = {}) {
    clearTimeout(this.evidenceTimer);
    const reads=(this.readCounts??=new Map());
    const seen=(reads.get(chapter.id)??0)+1;reads.set(chapter.id,seen);
    const glitched=seen>1;
    const n = (this.caseLog?.index.get(chapter.id)??-1)+1;
    this.evidenceKicker.textContent = glitched ? 'ये पंक्ति पहले जैसी नहीं है…' : readAgain ? 'गाँव का सुराग' : n ? `मिशन ${digits(n, 2)} पूरा` : `${VILLAGE_NAME} से`;
    this.evidenceTitle.textContent = chapter.item;
    this.evidenceText.textContent = glitchedText(chapter,seen);
    this.evidenceText.classList.toggle('evidence-glitch',glitched);
    this.evidence.hidden=false;
    this.evidenceTimer=window.setTimeout(()=>{this.evidence.hidden=true;},glitched?8200:6100);
  }

  renderScare(level,showMask=false,showStalker=false) {
    const opacity = level.toFixed(3);
    if (this.lastShade !== opacity) { this.lastShade = opacity;this.shade.style.opacity = opacity; }
    if(this.lastStalker!==showStalker){
      this.lastStalker=showStalker;this.shell.toggleAttribute('data-stalker-showing',showStalker);
    }
    if(this.lastMask!==showMask){
      this.lastMask=showMask;this.shell.toggleAttribute('data-mask-showing',showMask);
    }
  }

  bindLookControls(onSensitivity, toggleTorch) {
    this.onSensitivity = onSensitivity;
    onSensitivity(this.sensitivity);
    for (const button of this.flashlights) button.addEventListener('click', () => {
      if (this.panelOpen || this.shell.dataset.story) return;
      toggleTorch();
      if (window.matchMedia('(pointer: fine)').matches) this.shell.querySelector('canvas').focus({ preventScroll: true });
    }, { signal: this.events.signal });
  }

  renderTorch(on) { for (const button of this.flashlights) button.setAttribute('aria-pressed',String(on)); }
  notice(message) { if (message) this.#message(message); }

  #message(text) {
    clearTimeout(this.toastTimer);
    this.toast.textContent = text;
    this.toast.hidden = false;
    this.toastTimer = window.setTimeout(() => { this.toast.hidden = true; }, 2800);
  }

  bindEnter(enter) {
    this.enterButton.addEventListener('click', enter, { signal: this.events.signal });
  }

  setMode(mode) {
    this.shell.dataset.mode = mode;
    if(['ready','drag','locked','touch'].includes(mode))this.touchSetting.checked=mode==='touch';
    this.enterButton.hidden = mode !== 'ready';
    this.caption.hidden = mode !== 'ready';
    this.hint.hidden = mode !== 'locked';
    this.#refreshTracker();
    const disabled = mode === 'loading' || mode === 'error';
    for (const button of [this.audio,this.journalButton,this.fullscreen,this.settingsButton,...this.flashlights,...this.phoneButtons,...this.chatButtons,...(this.menuChatButton?[this.menuChatButton]:[])]) button.disabled = disabled;
    this.status.textContent = {
      ready: 'गाँव खुल गया। चलो देखते हैं।', locked: 'माउस घुमाकर देखो। माउस छोड़ने के लिए Esc दबाओ।',
      drag: 'स्क्रीन खींचकर देखो। छोड़ने के लिए Esc दबाओ।', touch: 'बाईं स्टिक से चलो, दाईं ओर उँगली खिसकाकर देखो और दौड़ बटन दबाकर भागो।',
    }[mode] ?? '';
  }

  renderLocation(name) {
    if (this.mapArea.textContent !== name || !this.mapArea.title) {
      this.mapArea.textContent = name;
      this.mapArea.title = name;
    }
  }

  renderHeading(heading) {
    const rounded = Math.round(heading) % 360;
    if (this.lastReading !== rounded) {
      this.lastReading = rounded;
      this.reading.textContent = `${digits(rounded, 3)}°`;
    }
    if (this.lastAngle == null || Math.abs(heading - this.lastAngle) > .05) {
      this.lastAngle = heading;
      this.tape.style.transform = `translate3d(${(-heading * TAPE_SCALE).toFixed(2)}px,0,0)`;
      for (const item of this.letters) item.text.classList.toggle('is-near', Math.abs(item.degrees - heading) < 11);
    }
  }

  fail(message) {
    if(this.mapPanel.open)this.mapPanel.close();
    if(this.radioPanel.open)this.radioPanel.close();
    this.newGameConfirm.close();this.recorder.close();this.clearVoice();this.phone.close();this.chat?.close();this.renderStory('play');this.setMode('error');
    this.showSettings(false);this.#showJournal(false, false);
    this.renderInteraction(null);this.evidence.hidden = true;this.renderScare(0);
    this.errorText.textContent = message;
    this.error.hidden = false;
  }

  dispose() {
    this.events.abort();this.phone.close();this.recorder.close();this.chat?.close();this.clearVoice();
    if(this.mapPanel.open)this.mapPanel.close();
    if(this.radioPanel.open)this.radioPanel.close();
    rewind(this.teaAudio);this.rideMusic.dispose();
    clearTimeout(this.toastTimer);
    clearTimeout(this.evidenceTimer);
    this.toast.remove();
  }
}
