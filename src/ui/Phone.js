export const PHOTO_KEY='sastrod-kalana-phone-v1';

const archive=[
  {id:'family',title:'पीपल के नीचे',caption:'पिछली यात्रा · कृष और दादा',src:new URL('../assets/phone/phone-family-albedo.webp',import.meta.url).href},
  {id:'dada',title:'दादा की पुरानी तस्वीर',caption:'सहेजी हुई तस्वीर',src:new URL('../assets/phone/phone-dada-albedo.webp',import.meta.url).href},
];
const contacts=[
  {id:'meera',name:'मीरा',detail:'बिजली चौकी · संपर्क 01',portrait:new URL('../assets/phone/phone-meera-albedo.webp',import.meta.url).href},
  {id:'dada',name:'दादा',detail:'परिवार · संपर्क 02',portrait:archive[1].src},
  {id:'ravi',name:'रवि',detail:'गैराज · संपर्क 03',portrait:new URL('../assets/phone/phone-ravi-albedo.webp',import.meta.url).href},
  {id:'tara',name:'तारा',detail:'स्कूल · संपर्क 04',portrait:null},
];
const imageLimit=4, dialLimit=12;
const dialDigits=number=>number.replace(/[^0-9]/g,'').slice(0,dialLimit);
export function rememberPhotos(photos,shot){
  const recent=shot?[shot,...photos.filter(other=>other.id!==shot.id)]:photos;
  const evidence=recent.find(photo=>photo.id==='code');
  return (evidence?[evidence,...recent.filter(photo=>photo.id!=='code')]:recent).slice(0,imageLimit);
}
const validPhoto=p=>typeof p?.id==='string'&&typeof p.title==='string'&&typeof p.caption==='string'&&
  typeof p.src==='string'&&p.src.length<240000&&p.src.startsWith('data:image/jpeg;base64,');
const make=(tag,cls,text)=>{
  const el=document.createElement(tag);if(cls)el.className=cls;if(text!=null)el.textContent=text;return el;
};
const button=(label,cls,run)=>{const el=make('button',cls,label);el.type='button';el.addEventListener('click',run);return el;};
function photoTag(src,alt){const img=make('img');img.src=src;img.alt=alt;return img;}

export class Phone {
  constructor(shell,{onChange,action,preview,clock,signal}){
    this.panel=shell.querySelector('#phone-panel');this.body=shell.querySelector('#phone-content');
    this.workspace=shell.querySelector('.phone-workspace');
    this.status=shell.querySelector('#phone-message');this.clock=shell.querySelector('#phone-clock');
    this.signal=shell.querySelector('#phone-signal');this.battery=shell.querySelector('#phone-battery');
    this.tabs=[...this.panel.querySelectorAll('[data-phone-tab]')];this.tab='photos';this.contact='meera';this.photos=[];
    this.onChange=onChange;this.action=action;this.preview=preview;this.readClock=clock;
    this.panel.querySelector('#phone-close').addEventListener('click',()=>this.panel.close(),{signal});
    this.panel.addEventListener('close',()=>{if(!this.open)onChange(false);},{signal});
    this.tabs.forEach(tab=>tab.addEventListener('click',()=>this.show(tab.dataset.phoneTab),{signal}));
  }
  get open(){return this.panel.open;}
  bindLog(log){
    this.log=log;this.photos=[];this.number='';this.tab='photos';
    try{
      const saved=JSON.parse(localStorage.getItem(PHOTO_KEY)??'null');
      if(saved?.seed===log.seed&&Array.isArray(saved.photos))this.photos=rememberPhotos(saved.photos.filter(validPhoto));
    }catch{ /* Photos are optional local data. */ }
  }
  toggle(){
    if(this.open){this.panel.close();return;}
    if(document.pointerLockElement)document.exitPointerLock();
    this.panel.showModal();this.onChange(true);
    this.show(this.tab);
  }
  show(tab){
    this.tab=tab;this.selected=null;
    this.status.textContent='';
    this.refresh();
    this.workspace.scrollTop=this.panel.scrollTop=0;
  }
  refresh({render=true}={}){
    this.clock.textContent=this.readClock?.()??'19:10';
    this.signal.textContent=this.log?.finished?'1 बार · कमज़ोर':'सिग्नल नहीं';
    this.battery.textContent=`${Math.max(32,68-(this.log?.progress??0))}%`;
    if(!render)return;
    for(const tab of this.tabs)tab.setAttribute('aria-pressed',String(this.tab===tab.dataset.phoneTab));
    if(this.tab==='camera')this.renderCamera();
    else if(this.tab==='contacts')this.renderContacts();
    else if(this.tab==='dial')this.renderDial();
    else this.renderPhotos();
  }
  renderPhotos(){
    const photos=[...this.photos];
    photos.push(...archive);
    if(this.selected){
      const photo=this.selected;
      const back=button('← तस्वीरें','phone-back',()=>{this.selected=null;this.refresh();});
      const card=make('figure','photo-detail');
      if(photo.src)card.append(photoTag(photo.src,photo.title));
      card.append(make('figcaption','',`${photo.title} · ${photo.caption}`));
      this.body.replaceChildren(back,card);back.focus({preventScroll:true});return;
    }
    const label=make('div','phone-section-label',`गैलरी · ${photos.length} तस्वीरें`),grid=make('div','photo-grid');
    for(const photo of photos){
      const tile=button('', 'photo-card',()=>{this.selected=photo;this.renderPhotos();});
      if(photo.src)tile.append(photoTag(photo.src,photo.title));
      tile.append(make('span','',photo.title));grid.append(tile);
    }
    this.body.replaceChildren(label,grid);
  }
  renderContacts(){
    const list=make('div','phone-contact-list');
    for(const contact of contacts){
      const item=button('', 'phone-contact',()=>{
        this.contact=contact.id;this.status.textContent='';this.renderContacts();
        this.body.querySelector('.phone-contact[aria-pressed="true"]').focus({preventScroll:true});
      });
      item.setAttribute('aria-pressed',String(this.contact===contact.id));
      const text=make('span');
      const avatar=contact.portrait?photoTag(contact.portrait,''):make('i','phone-avatar phone-avatar-initial',contact.name.slice(0,1));
      avatar.className=contact.portrait?'phone-avatar':'phone-avatar phone-avatar-initial';
      text.append(make('b','',contact.name),make('small','',contact.detail));item.append(avatar,text);list.append(item);
    }
    const dock=make('div','phone-contact-actions');
    dock.append(button('कॉल करो','phone-primary',()=>this.perform('call')));
    if(this.contact==='meera')dock.append(button('मदद का संदेश','phone-secondary',()=>this.perform('send')));
    const note=make('div','phone-thread');
    if(this.contact==='meera'&&this.log?.hasWrench){
      note.append(make('small','','हवेली के रेडियो का जवाब · 19:42'),make('p','','“संदेश मिल गया, कृष। रिंच से CRETA ठीक करो — पर रवि को गाँव से बाहर मत ले जाना।”'));
    }else if(this.contact==='dada')note.append(make('small','','पुरानी चिट्ठी · पीछे वाला पन्ना'),make('p','','“अगर कोई तुम्हें तुम्हारे नाम से बुलाए, जवाब मत देना। रवि को गाँव से बाहर मत ले जाना।”'));
    else if(this.contact==='ravi')note.append(make('small','','आख़िरी संदेश · 23 नवंबर 2011'),make('p','','“कृष, मैं यहाँ हूँ। अगर मेरी आवाज़ आए पर मैं दिखूँ नहीं… तो समझ लेना कि मैं अंदर हूँ। पिछली सीट देखना।”'));
    else if(this.contact==='tara')note.append(make('small','','गाँव का रेडियो · खुला हुआ संदेश'),make('p','','“दो मेहमान आए थे। एक पहले भी यहाँ आ चुका था। तीसरा मेहमान अभी आएगा।”'));
    else note.append(make('small','','कोई नया संदेश नहीं'));
    this.body.replaceChildren(list,note,dock);
  }
  renderDial(){
    const form=make('form','phone-dial'),readout=make('div','phone-dial-readout');
    const number=make('input','phone-dial-number');
    number.id='phone-dial-number';number.type='text';number.inputMode='numeric';number.maxLength=dialLimit;
    number.autocomplete='off';number.placeholder='नंबर डालो';
    const label=make('label','phone-section-label','फ़ोन नंबर');label.htmlFor=number.id;
    const call=make('button','phone-primary phone-dial-call','कॉल करो');call.type='submit';
    const erase=button('हटाओ','phone-dial-tool phone-dial-erase',()=>update(this.number.slice(0,-1)));
    erase.setAttribute('aria-label','आख़िरी अंक हटाओ');
    const clear=button('साफ़','phone-dial-tool phone-dial-clear',()=>update(''));
    clear.setAttribute('aria-label','पूरा नंबर मिटाओ');
    const update=(value)=>{
      this.number=dialDigits(value);number.value=this.number;
      call.disabled=erase.disabled=clear.disabled=!this.number;
      this.status.textContent='';
    };
    number.addEventListener('input',()=>update(number.value));
    form.addEventListener('submit',event=>{
      event.preventDefault();
      const to=dialDigits(number.value);
      if(to)this.perform('dial',to);
    });
    readout.append(label,number);
    const keys=make('div','phone-dial-keys');
    const digit=key=>{
      const el=button(key,'phone-dial-key',()=>update(number.value+key));el.dataset.dialDigit=key;return el;
    };
    keys.append(...'123456789'.split('').map(digit),clear,digit('0'),erase);
    form.append(readout,keys,call);update(this.number);
    this.body.replaceChildren(form);
  }
  renderCamera(){
    const shot=this.preview?.(),frame=make('div','phone-viewfinder');
    if(shot)frame.append(photoTag(shot,'सामने का दृश्य'));
    frame.append(make('span','phone-frame-box'),make('small','','कैमरा · 1×'));
    const hint=make('p','camera-tip','फ़ोन खोलने से पहले जिस तरफ़ देखा था, तस्वीर वहीं की होगी।');
    this.body.replaceChildren(frame,hint,button('तस्वीर लो','phone-primary shutter-button',()=>this.perform('photo')));
  }
  perform(type,to=this.contact){
    const result=this.action(type,to);
    if(result.capture&&result.src){
      const photo={id:`shot-${Date.now()}`,title:'नई तस्वीर',caption:'कृष का कैमरा',src:result.src};
      this.photos=rememberPhotos(this.photos,photo);
      try{localStorage.setItem(PHOTO_KEY,JSON.stringify({seed:this.log.seed,photos:this.photos}));}catch{ /* In-memory gallery still works. */ }
    }
    if(result.capture)this.show('photos');else this.refresh({render:type!=='dial'});
    this.status.textContent=result.capture&&!result.src?'तस्वीर नहीं बन पाई। कैमरा फिर आज़माओ।':result.message??'';
  }
  close(){if(this.open)this.panel.close();}
}
