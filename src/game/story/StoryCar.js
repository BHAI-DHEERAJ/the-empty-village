import { CatmullRomCurve3, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PointLight, SphereGeometry, SpotLight, Vector3, MathUtils } from 'three';
import { ModelBatch } from '../world/village/modeling.js';
import { poseBox } from '../world/physics/CollisionWorld.js';
import { lettering } from '../world/village/lettering.js';
import { carMotion, INTRO } from './IntroSequence.js';
import { REPAIR } from './RepairSequence.js';
import { ENDING, ESCAPE, escapeDaylight, escapeJolt, escapeMotion, escapeRoad, FIX } from './CretaFinale.js';
import { createCretaDriver } from './CretaDriver.js';
import { createCretaPassenger } from './CretaPassenger.js';
import { createEscapeCamera } from '../camera/EscapeCinematography.js';
import { modelWrench } from './Wrench.js';
import { CRETA_NAME, mountCretaBadges } from './CarBadge.js';
export { CRETA_NAME } from './CarBadge.js';
import { VILLAGE_REGION } from '../world/VillageName.js';
import { ARRIVAL_ROAD, COMPANION_ROAD, groundHeight } from '../world/sceneryLayout.js';

export const CAR_EXIT = Object.freeze({ x:.34, y:0, z:5.9 });
export const VILLAGE_SIGN = [-2.55,1.67,-2.9];
export const ROAD_MARKER = [-25.4,.86,32.1];
export const PARKED = new Vector3(1.92,0,7.62);
export const REPAIR_STANCE = Object.freeze({ x:1.92, y:0, z:4.19 });
const PI=Math.PI;

// Krish and Ravi come in on the new sheltered forest track. The final few
// metres pull over on the existing main road rather than cutting across the
// village; the old ARRIVAL_ROAD is still their way out in the escape.
const pullOver=[[.08,17.2],[.72,13.12],[1.89,10.05],[PARKED.x,PARKED.z]];
export const approachCurve=new CatmullRomCurve3([...COMPANION_ROAD.path,...pullOver].map(([x,z])=>new Vector3(x,groundHeight(x,z),z)));
approachCurve.arcLengthDivisions=1024;
const APPROACH_LENGTH=approachCurve.getLength(), routeLook=14.8/APPROACH_LENGTH;

// The opening and the parked prop are the same car, not a video or backdrop.
export function buildStoryCar(scene,p,collision) {
  const car=new Group();car.name=`${CRETA_NAME} · कृष + रवि`;car.position.copy(PARKED);scene.add(car);
  const b=new ModelBatch(car);
  const tailGlow=new MeshBasicMaterial({color:0xf35743});
  const lampGlow=new MeshBasicMaterial({color:0xffe1ae});
  b.box(p.iron,0,.46,0,1.70,.28,4.18,{shadow:true});
  for(const side of [-1,1])b.box(p.carPaint,side*.744,.704,-1.32,.183,.414,1.50,{shadow:true});
  b.box(p.carPaint,0,.697,-2.005,1.63,.428,.18,{shadow:true});
  b.box(p.black,0,.632,-1.24,1.29,.199,1.39);
  b.box(p.iron,-.08,.77,-1.40,.71,.23,.75);
  b.box(p.darkWood,-.08,.888,-1.40,.65,.054,.67);
  b.box(p.black,.46,.768,-1.68,.34,.22,.34);
  for(const x of [.37,.53])b.cylinder(x>.5?p.tractorRed:p.iron,x,.888,-1.69,.043,.043,.066,{sides:9});
  b.cord(p.rust,[[.53,.90,-1.69],[.57,.94,-1.45],[.30,.91,-1.31],[.11,.885,-1.25]],.026,{segments:12});
  for(let i=0;i<5;i++)b.box(p.rust,-.40+i*.13,.915,-1.40,.033,.030,.58);
  const hood=new Group();hood.name='खुलने वाला बोनट';hood.position.set(0,.969,-.628);car.add(hood);
  const panel=new ModelBatch(hood);
  panel.box(p.carTop,0,-.028,-.701,1.55,.077,1.49,{rx:.033,shadow:true});
  panel.box(p.carHoodInside,0,-.073,-.66,1.29,.014,1.19,{rx:.033});
  for(const side of [-1,1])panel.beam(p.darkWood,[side*.574,-.08,-.21],[side*.327,-.08,-1.32],.047,6);
  for(const s of [-1,1]){
    panel.beam(p.carPaint,[s*.47,.010,-.18],[s*.41,.045,-1.43],.015,7);
    panel.beam(p.rust,[s*.754,-.022,-.082],[s*.754,.019,-1.40],.009,5);
  }
  panel.finish('बोनट और अंदर की पसलियाँ');
  const tool=new Group();tool.name='मरम्मत करता हाथ और औज़ार';tool.visible=false;car.add(tool);
  const arm=new ModelBatch(tool);
  arm.box(p.leather,0,0,-.28,.141,.083,.50,{rx:-.08,rz:.035});
  arm.ball(p.rubber,0,.002,-.07,.073,{sx:1.11,sy:.65,sz:1.41});
  arm.finish('दस्ताना और आस्तीन');
  const driver=new Group();tool.add(driver);
  const screwdriver=new ModelBatch(driver);
  screwdriver.beam(p.rust,[-.03,.018,-.14],[.025,.018,.038],.038,10);
  screwdriver.beam(p.iron,[.025,.018,.037],[.077,.016,.24],.014,8);
  screwdriver.finish('पेचकस');
  const spanner=new Group();spanner.name='हवेली से मिला रिंच';spanner.position.set(.048,.017,.092);spanner.rotation.y=Math.PI;tool.add(spanner);
  const wrench=new ModelBatch(spanner);modelWrench(wrench,p);wrench.finish(spanner.name);
  const steamMaterial=new MeshBasicMaterial({color:0xc0c1bd,transparent:true,opacity:0,depthWrite:false});
  const puff=new SphereGeometry(1,9,6),steam=Array.from({length:4},()=>new Mesh(puff,steamMaterial));
  for(const obj of steam){obj.visible=false;car.add(obj);}
  b.box(p.carPaint,0,.74,1.49,1.65,.42,1.13,{shadow:true});
  b.box(p.carTop,0,.97,1.56,1.57,.062,1.03);
  b.box(p.rubber,0,.62,.09,1.59,.075,2.47);
  b.box(p.carTop,0,1.75,.25,1.48,.085,1.67,{shadow:true});
  for(const s of [-1,1]){
    const x=s*.80;
    b.beam(p.iron,[s*.56,1.824,-.342],[s*.56,1.824,.941],.031,7);
    b.beam(p.carPaint,[s*.56,1.768,-.39],[s*.56,1.824,-.342],.037,7);
    b.beam(p.carPaint,[s*.56,1.765,.90],[s*.56,1.824,.941],.037,7);
    b.box(p.carPaint,s*.778,1.094,1.525,.149,.269,.980,{shadow:true});
    b.beam(p.carTop,[s*.81,1.16,1.89],[s*.72,1.72,.935],.065,8,true);
    b.box(p.carPaint,x,.77,.04,.13,.49,2.12,{shadow:true});
    b.box(p.rust,x+s*.072,.83,-.03,.021,.043,3.66);
    b.beam(p.iron,[x,.998,-.675],[s*.71,1.72,-.441],.036,8,true);
    b.beam(p.carTop,[x,.984,.98],[s*.72,1.72,.918],.049,7,true);
    b.beam(p.rust,[x,1.04,.194],[s*.73,1.715,.304],.026,8,true);
    b.box(p.iron,x+s*.081,.97,.26,.041,.052,.22);
    for(const z of [-1.29,1.23]){
      b.ring(p.carTire,x,.352,z,.266,.077,{ry:PI/2,shadow:true});
      b.ring(p.carTire,x+s*.054,.352,z,.264,.048,{ry:PI/2});
      for(let i=0;i<16;i++){
        const a=i*PI/8;
        b.box(p.carTire,x+s*.014,.352+Math.cos(a)*.333,z+Math.sin(a)*.333,.146,.036,.09,{rx:a,ry:i%2?.12:-.12});
      }
      for(let i=0;i<7;i++){
        const a=i*PI/7,bb=(i+1)*PI/7;
        b.beam(p.carPaint,[s*.852,.353+Math.sin(a)*.385,z+Math.cos(a)*.385],
          [s*.852,.353+Math.sin(bb)*.385,z+Math.cos(bb)*.385],.036,7);
      }
      b.cylinder(p.iron,x+s*.035,.352,z,.181,.181,.079,{rz:PI/2,sides:16});
      b.ring(p.rust,x+s*.081,.352,z,.157,.017,{ry:PI/2});
      b.cylinder(p.carTop,x+s*.094,.352,z,.100,.111,.038,{rz:PI/2,sides:12});
      for(let i=0;i<5;i++){
        const a=i*2*PI/5;
        b.cylinder(p.rust,x+s*.125,.352+Math.cos(a)*.067,z+Math.sin(a)*.067,.014,.014,.017,{rz:PI/2,sides:6});
      }
    }
    b.box(p.carTop,x+s*.074,.72,.055,.025,.24,.712,{shadow:true});
    for(const z of [-.315,.418])b.beam(p.iron,[x+s*.092,.63,z],[x+s*.093,.89,z],.006,6);
    b.box(p.iron,x+s*.115,.855,.305,.049,.037,.166);
    b.box(p.leather,s*.399,.70,.104,.52,.104,.52);
    b.box(p.leather,s*.399,.976,.422,.509,.55,.14,{rx:-.14});
    b.box(p.darkGlass,s*.62,.866,2.065,.352,.191,.055);
    b.box(tailGlow,s*.60,.916,2.100,.326,.034,.024);
    b.box(tailGlow,s*.748,.877,2.107,.029,.074,.023);
    b.box(p.tractorRed,s*.752,.845,2.101,.062,.095,.026);
    b.box(p.darkGlass,s*.618,.766,-2.109,.391,.243,.083);
    b.box(lampGlow,s*.615,.851,-2.155,.355,.031,.024);
    b.box(p.carTop,s*.765,.781,-2.159,.028,.125,.014);
    for(let j=0;j<3;j++)b.box(p.glass,s*.64,.711+j*.039,-2.154,.163,.024,.021);

  }
  b.box(p.iron,0,.403,-2.144,1.79,.10,.113);
  b.box(p.iron,0,.423,2.07,1.76,.095,.12);
  b.box(p.black,0,.737,-2.115,.902,.258,.106);
  for(let i=0;i<4;i++)b.box(p.rust,0,.641+i*.045,-2.177,.823-i*.019,.018,.018);
  b.box(p.darkGlass,0,.412,-2.212,.425,.102,.021);
  b.box(p.darkGlass,0,.49,2.134,.425,.104,.020);
  lettering(b,p.chalk,'HR 06 · 2741',0,.49,2.147,.043,.386);
  b.box(p.black,0,.936,-2.158,1.47,.156,.090);
  b.box(p.iron,0,.868,-2.201,1.44,.014,.014);
  b.box(p.black,0,.847,2.062,.776,.178,.068);
  b.box(p.rubber,-.185,1.105,-.386,.346,.099,.059);
  b.box(p.black,-.185,1.022,-.415,.346,.085,.030);
  b.beam(p.iron,[-.70,1.670,1.003],[.70,1.670,1.003],.026,8);
  b.beam(p.iron,[-.80,1.137,1.853],[.80,1.137,1.853],.026,8);
  b.panel(p.carGlass,[[-.80,1.14,1.845],[.80,1.14,1.845],[.69,1.670,.999],[-.69,1.670,.999]],
    [[0,0],[1,0],[1,1],[0,1]],[0,1,2,0,2,3]);
  b.beam(p.iron,[-.71,1.688,-.466],[.71,1.688,-.466],.033,8);
  b.panel(p.carGlass,[[-.757,1.018,-.65],[.757,1.018,-.65],[.701,1.689,-.461],[-.701,1.689,-.461]],
    [[0,0],[1,0],[1,1],[0,1]],[0,1,2,0,2,3]);
  b.box(p.black,0,.968,-.590,1.57,.195,.36);
  b.box(p.darkWood,0,.903,-.389,1.47,.127,.051);
  b.box(p.paper,-.429,1.070,-.515,.372,.008,.223,{ry:.10,rx:.055,shadow:true});
  lettering(b,p.black,'कृष के नाम',-.428,1.079,-.516,.036,.30,-PI/2);
  b.box(p.rust,-.062,.945,-.349,.402,.155,.066);
  b.box(p.board,-.067,.978,-.310,.247,.052,.017);
  lettering(b,p.chalk,VILLAGE_REGION,-.067,.978,-.298,.031,.22);
  for(const x of [-.206,.112])b.cylinder(p.iron,x,.928,-.303,.028,.028,.037,{rx:PI/2,sides:11});
  b.box(p.black,.39,1.083,-.479,.462,.15,.14,{rz:-.018});
  const check=new Group();check.name='इंजन की चेतावनी';check.visible=false;car.add(check);
  const warning=new ModelBatch(check);
  warning.box(p.bulb,.383,1.05,-.397,.031,.022,.021);warning.finish('डैश पर पीली बत्ती');
  for (const x of [.294,.479]){
    b.cylinder(p.chalk,x,1.088,-.397,.053,.053,.018,{rx:PI/2,sides:15});
    b.beam(p.tractorRed,[x,1.083,-.377],[x+.018,1.111,-.377],.0038,4);
  }
  const wheel=new Group();wheel.position.set(.39,1.041,-.087);car.add(wheel);
  const grip=new ModelBatch(wheel);
  grip.ring(p.black,0,0,0,.181,.021,{rx:-.37});
  grip.beam(p.iron,[-.155,-.011,-.003],[.155,-.011,-.003],.016,6);
  grip.beam(p.iron,[0,-.161,.056],[0,-.015,-.001],.016,6);
  grip.finish('Steering wheel');
  b.beam(p.rust,[.01,.67,-.104],[.014,.898,.022],.014,7);
  b.ball(p.black,.014,.909,.022,.034);
  b.box(p.darkGlass,0,1.587,-.453,.257,.091,.027);
  b.beam(p.iron,[0,1.705,-.455],[0,1.600,-.452],.011,5);
  b.beam(p.rust,[-.62,1.005,-.706],[-.20,1.071,-.682],.013,5);
  b.beam(p.rust,[.135,1.006,-.706],[.541,1.082,-.683],.013,5);
  b.finish('कार की पुरानी सीटें, डैशबोर्ड और बॉडी');
  mountCretaBadges(car);
  const solid=collision.addMobileBox(PARKED.x,PARKED.z,1.78,4.30,0,0,1.70,'story-car');

  const lamps=[-1,1].map(s=>{
    const light=new SpotLight(0xffd89d,0,47,.54,.71,1.39);
    light.position.set(.59*s,.76,-2.17);
    light.target.position.set(-1.15,.67,-20);
    car.add(light,light.target);
    return light;
  });
  const cabin=new PointLight(0xdcb98d,.69,1.5,1.8);
  cabin.position.set(.05,1.34,.13);car.add(cabin);
  const gaze=new Vector3(),direction=new Vector3(),beam=new Vector3(),signGaze=new Vector3(...VILLAGE_SIGN),markerGaze=new Vector3(...ROAD_MARKER);
  const inspectFrom=new Vector3(.78,1.69,4.86),fixFrom=new Vector3(2.92,1.96,4.41),eye=new Vector3();
  const chaseCamera=createEscapeCamera(), beamTangent=new Vector3(),rearAim=new Vector3();
  const krish=createCretaDriver(car,p,wheel),ravi=createCretaPassenger(car,p);
  // Final Seat Twist: the passenger seat is empty at the end. This second
  // figure only exists for the rear-view reveal and the post-credit road.
  const rear=new Group();rear.name='रवि · पिछली सीट';rear.visible=false;car.add(rear);
  const rearSkin=new MeshStandardMaterial({color:0xa97755,roughness:.87});
  const rearShirt=new MeshStandardMaterial({color:0x35484c,roughness:.9});
  const rearBody=new ModelBatch(rear);
  rearBody.ball(rearShirt,-.02,.99,1.03,.22,{sx:1.08,sy:1.32,sz:.70});
  rearBody.finish('रवि · पिछली सीट का धड़');
  const rearHead=new Group();rearHead.position.set(-.02,1.22,1.03);rear.add(rearHead);
  const rearFace=new ModelBatch(rearHead);
  rearFace.ball(rearSkin,0,0,0,.105,{sx:.90,sy:1.18,sz:1.04});
  rearFace.ball(p.rubber,0,.041,.012,.101,{sx:.98,sy:.90,sz:1.03});
  rearFace.finish('रवि · पिछली सीट का चेहरा');
  const rearRavi={
    hide(){rear.visible=false;},
    reveal(t){
      rear.visible=true;
      const lift=MathUtils.smoothstep(t,ENDING.reveal+.4,ENDING.reveal+1.6);
      rearHead.rotation.x=(1-lift)*1.16;
      rearHead.rotation.y=-.16*MathUtils.smoothstep(t,ENDING.reveal+1.4,ENDING.reveal+2.6);
    },
  };
  return {
    car, lamps, solid, hood,
    park(){
      car.position.copy(PARKED);car.rotation.set(0,0,0);cabin.intensity=0;tailGlow.color.setHex(0xf35743);krish.hide();ravi.hide();rearRavi.hide();
      poseBox(solid,PARKED.x,PARKED.z,0);
      hood.rotation.x=wheel.rotation.z=0;tool.visible=check.visible=false;for(const obj of steam)obj.visible=false;
      for(const lamp of lamps){lamp.intensity=46;lamp.target.position.set(-1.15,.67,-20);}
    },
    pose(view,t,phase,reducedMotion,daylight=0){
      const ready=phase==='arrived';
      const motion=carMotion(t),f=ready?1:motion.position;
      check.visible=t>=INTRO.trees;
      approachCurve.getPointAt(f,car.position);
      approachCurve.getTangentAt(f,direction);
      const straighten=MathUtils.smoothstep(t,INTRO.brake+.7,INTRO.end);
      car.rotation.y=ready?0:Math.atan2(-direction.x,-direction.z)*(1-straighten);
      const starter=t>.32&&t<1.04?Math.sin((t-.32)/.72*PI)*.010:0;
      const bump=reducedMotion?0:Math.sin(t*14)*.009+Math.sin(t*24.7)*.005;
      const shake=phase==='drive'&&!reducedMotion?Math.sin(t*23)*starter+bump*motion.speed:0;
      car.localToWorld(view.position.set(.36,1.395+shake,.24));
      const glance=(at,hold=1.3)=>reducedMotion||ready?0:MathUtils.smoothstep(t,at,at+1.1)*(1-MathUtils.smoothstep(t,at+hold,at+hold+1.45));
      const tune=glance(INTRO.dial,2.2),paper=glance(INTRO.letterBack+.2);
      const marker=glance(INTRO.milestone,1.6);
      const reveal=ready?1:MathUtils.smoothstep(t,INTRO.sign,INTRO.end);
      approachCurve.getPointAt(Math.min(1,f+routeLook),gaze);
      if(f+routeLook>1)gaze.addScaledVector(direction,(f+routeLook-1)*APPROACH_LENGTH);
      beam.copy(gaze).setY(.67).lerp(markerGaze,marker*.68).lerp(signGaze,reveal*.52);
      car.worldToLocal(beam);
      gaze.x+=direction.z*(.89*tune+1.26*paper);gaze.z-=direction.x*(.89*tune+1.26*paper);
      gaze.y=car.position.y+1.60-tune*1.32-paper*1.08;
      gaze.lerp(markerGaze,(view.aspect<.85?.43:.26)*marker);
      gaze.lerp(signGaze,reveal);
      view.lookAt(gaze);
      const power=ready?276:298+(reducedMotion?0:19*reveal*Math.sin(t*31));
      for(const lamp of lamps){
        lamp.intensity=power*(1-daylight*.86);
        lamp.target.position.copy(beam);lamp.target.position.x+=lamp.position.x*.9;
      }
      cabin.position.set(.05,1.34,.13);cabin.intensity=ready?.56:.84;
      if(ready){krish.hide();ravi.hide();}else ravi.pose(t,'drive',reducedMotion);
    },
    repair(view,t,reducedMotion){
      car.position.copy(PARKED);car.rotation.y=0;check.visible=false;cabin.intensity=0;
      krish.hide();ravi.hide();
      for(const l of lamps)l.intensity=0;
      const open=MathUtils.smoothstep(t,REPAIR.bonnet,2.4)*(1-MathUtils.smoothstep(t,REPAIR.close,15.7));
      hood.rotation.x=open*1.07;
      const approach=MathUtils.smoothstep(t,0,2.45),back=MathUtils.smoothstep(t,12.4,15.94);
      eye.set(CAR_EXIT.x,1.61,CAR_EXIT.z).lerp(inspectFrom,approach);
      eye.x-=back*.57;eye.z-=back*.64;eye.y+=back*.09;
      view.position.copy(eye);
      gaze.set(1.91,.86,6.13).lerp(signGaze,back*.56);view.lookAt(gaze);
      driver.visible=true;spanner.visible=false;
      tool.visible=t>REPAIR.tools&&t<7.65;
      if(tool.visible){
        const twist=reducedMotion?0:Math.sin((t-REPAIR.tools)*8.8)*.23;
        tool.position.set(.41,.952+(1-MathUtils.smoothstep(t,3.1,3.5))*.21,-1.89);
        tool.rotation.set(twist,.09+twist*.55,-.17);
      }
      const hot=t-REPAIR.sputter;
      steamMaterial.opacity=.119*MathUtils.smoothstep(hot,0,.62)*(1-MathUtils.smoothstep(hot,2.15,3.53));
      for(const [i,obj] of steam.entries()){
        const age=(hot*.59+i*.23+1)%1;
        obj.visible=steamMaterial.opacity>.01&&!reducedMotion;
        obj.position.set(-.22-age*.22+i*.05,1.0+age*.78,-1.52-i*.13-age*.24);
        obj.scale.setScalar(.067+age*.24);
      }
    },
    finalRepair(view,t,reducedMotion,from){
      car.position.copy(PARKED);car.rotation.set(0,0,0);check.visible=false;
      krish.hide();ravi.hide();
      hood.rotation.x=1.18*MathUtils.smoothstep(t,FIX.bonnet,1.23)*(1-MathUtils.smoothstep(t,FIX.close,4.44));
      const reach=MathUtils.smoothstep(t,FIX.tools,1.57)*(1-MathUtils.smoothstep(t,3.36,3.75));
      tool.visible=reach>.008;driver.visible=false;spanner.visible=true;
      if(tool.visible){
        const twist=reach*(reducedMotion?.045:Math.sin((t-FIX.tools)*9.4)*.24);
        tool.position.set(.35,.923+(1-reach)*.23,-2.06-(1-reach)*.27);
        tool.rotation.set(-.04+twist,.13+twist*.84,-.14+twist*.56);
      }
      for(const obj of steam)obj.visible=false;
      const arrive=MathUtils.smoothstep(t,0,1.17), start=MathUtils.smoothstep(t,FIX.ignition,5.4);
      eye.copy(from).lerp(fixFrom,arrive);eye.y-=arrive*.10;eye.x+=start*.14;
      gaze.set(2.04,.93,6.02);gaze.y+=start*.11;
      view.position.copy(eye);view.lookAt(gaze);
      cabin.position.set(.09,1.39,-2.33);cabin.intensity=5.8*(1-start*.56);
      for(const lamp of lamps){lamp.intensity=198*start;lamp.target.position.set(0,.57,-22);}
    },
    escape(view,t,reducedMotion){
      const motion=escapeMotion(t),{distance,speed,offset,steering}=motion;
      escapeRoad(distance,car.position,direction);
      car.position.x-=direction.z*offset;car.position.z+=direction.x*offset;
      const recoil=t-ESCAPE.impact, jam=MathUtils.smoothstep(t,ESCAPE.impact,ESCAPE.impact+.24);
      const recovery=MathUtils.smoothstep(t,ESCAPE.catch,ESCAPE.catch+.52), stalled=jam*(1-recovery);
      const bump=reducedMotion?0:escapeJolt(t);
      car.rotation.set(bump*.10,Math.atan2(-direction.x,-direction.z)+steering,steering*.23+bump*.045,'YXZ');
      poseBox(solid,car.position.x,car.position.z,car.rotation.y);
      hood.rotation.x=jam*.05+bump*.054*jam;tool.visible=false;check.visible=stalled>.15;
      const haze=stalled*.12;
      steamMaterial.opacity=haze;
      for(const [i,obj] of steam.entries()){
        const age=(Math.max(0,recoil)*.65+i*.24)%1;
        obj.visible=haze>.02&&!reducedMotion;
        if(obj.visible){obj.position.set(.15+.16*i+age*.30,1.01+age*1.04,-1.87+i*.08);obj.scale.setScalar(.13+age*.38);}
      }
      escapeRoad(distance+12.6,beam,beamTangent);
      beam.y=car.position.y+.62;car.worldToLocal(beam);
      if(t>=ESCAPE.skid || distance<.7)beam.lerp(gaze.set(0,.55,-15.5),stalled*.88+(.34*Math.abs(steering))*(1-stalled));
      for(const lamp of lamps){
        lamp.intensity=307*(1-stalled*.87)*(1-escapeDaylight(t)*.70);
        lamp.target.position.copy(beam);lamp.target.position.x+=lamp.position.x*.72;
      }
      const brake=MathUtils.smoothstep(t,ESCAPE.skid,ESCAPE.skid+.40)*(1-MathUtils.smoothstep(t,ESCAPE.reverse,ESCAPE.breakaway));
      tailGlow.color.setRGB(1.0+brake*.81,.084+brake*.046,.071);
      cabin.position.set(.28,1.50,-.116);cabin.intensity=.74+speed*.30+stalled*.48;
      wheel.rotation.z=MathUtils.clamp(beam.x*.095+steering*1.3,-.51,.51);
      motion.shot=chaseCamera(view,car,t,motion,reducedMotion);
      krish.pose(t,motion.shot,reducedMotion);
      ravi.pose(t,motion.shot,reducedMotion);
      return motion;
    },
    // Krish turns from the highway to the back of the cabin. The front
    // passenger is gone; the head in the rear seat slowly lifts.
    rearSeatShot(view,t,reducedMotion){
      this.escape(view,ESCAPE.end,reducedMotion);
      ravi.hide();rearRavi.reveal(t);
      car.localToWorld(view.position.set(.34,1.44,-.10));
      rearAim.set(-.02,1.20,1.03);car.localToWorld(rearAim);
      view.lookAt(rearAim);
      if(view.fov!==58){view.fov=58;view.updateProjectionMatrix();}
      return {shot:'rear-seat'};
    },
    // Same CRETA, same nameless road, 11:59 PM. Nobody is driving it.
    postCredits(view,t,reducedMotion){
      this.park();
      car.rotation.y=.28;poseBox(solid,car.position.x,car.position.z,car.rotation.y);
      for(const lamp of lamps)lamp.intensity=224;
      cabin.intensity=.42;
      const sway=reducedMotion?0:Math.sin(t*1.7)*.045;
      view.position.set(PARKED.x+6.9+sway,2.32,PARKED.z+8.4);
      view.lookAt(PARKED.x,.96,PARKED.z);
      if(view.fov!==62){view.fov=62;view.updateProjectionMatrix();}
      return {shot:'post-credits'};
    },
  };
}
