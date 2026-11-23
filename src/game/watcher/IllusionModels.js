import {
  BufferGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, MathUtils, Mesh, MeshBasicMaterial,
  Quaternion, Shape, ShapeGeometry, SphereGeometry, Vector3,
} from 'three';
import { imageMaterial } from '../world/materials.js';
import { nightMaterial } from '../world/shaders.js';
import { createWatcherModel } from './WatcherModel.js';

const { lerp }=MathUtils;
const TAU=2*Math.PI;

function grid(rows,columns,sample){
  const xyz=[],uv=[],indices=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
    const [x,y,z,u,v]=sample(j/rows,i/columns);
    xyz.push(x,y,z);uv.push(u,v);
    if(j&&i){const a=j*(columns+1)+i,b=a-columns-1;indices.push(b-1,b,a-1,b,a,a-1);}
  }
  const geo=new BufferGeometry();geo.setAttribute('position',new Float32BufferAttribute(xyz,3));
  geo.setAttribute('uv',new Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
  return geo;
}

// A front-projected ceramic face with real eye and cheek relief. The front
// UVs use the center of the painted atlas, not a repeated sphere wrap.
function portrait(rows=20){
  const relief=(x,c,s)=>Math.exp(-((x-c)**2)/(s*s));
  return grid(rows,rows,(t,u)=>{
    const h=t*2-1;
    const width=Math.sqrt(Math.max(.001,1-h*h))*(.96+Math.min(h,0)*.20);
    const w=(u*2-1)*width,eye=relief(Math.abs(w),.39,.24)*relief(h,.13,.12);
    const nose=relief(w,0,.152)*relief(h,-.20,.27);
    const bowl=Math.sqrt(Math.max(0,1-w*w-h*h));
    return [w*.167,h*.239,.060*bowl+.034*nose-.019*eye,.5+w*.45,.50+h*.45];
  });
}

// Continuous folded cloth rather than separate plates or screen sprites.
function drape(sections,density,seed=0){
  return grid((sections.length-1)*6,density,(t,u)=>{
    const k=Math.min(sections.length-2,Math.floor(t*(sections.length-1))),f=t*(sections.length-1)-k;
    const [a,b]=[sections[k],sections[k+1]],y=lerp(a[0],b[0],f),r=lerp(a[1],b[1],f),d=lerp(a[2],b[2],f);
    const angle=(u-.5)*TAU;
    const fold=1+.099*Math.sin(9*angle+y*4.3+seed)+.044*Math.cos(16*angle-y*6.1);
    const hem=(1-t)**3*(.13*Math.sin(5*angle+.7)+.073*Math.cos(11*angle+seed));
    return [Math.sin(angle)*r*fold,y+hem,Math.cos(angle)*d*fold,1.25*u,(y-sections[0][0])*1.37];
  });
}

export function createIllusionModels(scene,textures,{compact=false}={}){
  const ball=new SphereGeometry(1,compact?12:18,compact?9:13),shaft=new CylinderGeometry(.72,1,1,compact?8:12);
  const up=new Vector3(0,1,0),a=new Vector3(),b=new Vector3(),rotation=new Quaternion();
  function assembly(name){
    const group=new Group(),opacity={value:1};group.name=name;group.visible=false;scene.add(group);
    const paint=(surface,properties={})=>nightMaterial(imageMaterial(textures[surface],properties),'textured-haunt-fade',shader=>{
      shader.uniforms.uHauntFade=opacity;
      shader.fragmentShader=`uniform float uHauntFade;\n${shader.fragmentShader}`.replace('#include <alphatest_fragment>',
        `#include <alphatest_fragment>
        if(uHauntFade<.999&&fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))>uHauntFade)discard;`);
    });
    const mesh=(geometry,m,parent=group)=>{const obj=new Mesh(geometry,m);obj.receiveShadow=true;parent.add(obj);return obj;};
    const oval=(m,x,y,z,sx,sy,sz,parent)=>{
      const obj=mesh(ball,m,parent);obj.position.set(x,y,z);obj.scale.set(sx,sy,sz);return obj;
    };
    const bone=(m,from,to,r,parent=group)=>{
      a.fromArray(from);b.fromArray(to).sub(a);
      const len=b.length();rotation.setFromUnitVectors(up,b.normalize());a.addScaledVector(b,len*.5);
      const obj=mesh(shaft,m,parent);obj.position.copy(a);obj.scale.set(r,len,r);obj.quaternion.copy(rotation);return obj;
    };
    return {group,paint,mesh,oval,bone,veil:n=>{opacity.value=n;}};
  }

  // The main scare uses the old skinned actor's UV-mapped anatomy and bone
  // rig, with a new material-covered mourning shroud and sculpted mask.
  const jump=assembly('भारी साये के पीछे · नक़ाब');
  {
    const rig=createWatcherModel({...textures,watcherCloth:textures.hauntCloth},{compact,tints:[0x58564e,0x74685f,0x776450]});
    rig.group.visible=true;rig.group.scale.setScalar(.865);jump.group.add(rig.group);
    const skull=rig.mesh.skeleton.bones.find(joint=>joint.name==='skull');
    const mask=jump.mesh(portrait(compact?17:25),jump.paint('hauntMask',{
      strength:.91,color:0xe5d9bf,emissive:0x5e5245,emissiveIntensity:.11,
    }),skull);
    mask.name='Cracked ceramic face · relief and UVs';mask.position.set(.009,.160,.102);
    const cowl=new SphereGeometry(1,compact?18:27,compact?13:19,2.21,4.97);
    const hood=jump.mesh(cowl,jump.paint('hauntCloth',{color:0x575650,side:DoubleSide,strength:.91}),skull);
    hood.name='Woven cowl';hood.position.set(.009,.162,.020);hood.scale.set(.184,.255,.166);hood.rotation.z=-.045;
    const collar=jump.mesh(drape([[2.34,.302,.174],[2.43,.269,.190],[2.52,.201,.166],[2.65,.108,.107]],compact?20:34),
      jump.paint('hauntCloth',{color:0x696862,side:DoubleSide,strength:.75}),rig.group);
    collar.name='Folded throat and shoulder wrap';
    const fade=jump.veil;
    jump.reset=()=>{rig.hold(-1,'standing');rig.eyes(0);};
    jump.pose=(t,still)=>rig.tilt(still?.18:.12+MathUtils.smoothstep(t,.04,.45)*.34);
    jump.veil=n=>{fade(n);rig.veil(n);};
    jump.reset();
  }

  const wraith=assembly('हवा में अटकी सफ़ेद परछाईं');
  {
    const {group,paint,mesh,oval,bone}=wraith;
    const cloth=paint('hauntCloth',{color:0xd1d1cb,emissive:0x8799a1,emissiveIntensity:.23,side:DoubleSide,strength:.83});
    const rag=paint('veilLinen',{color:0x7c8b89,emissive:0x697a82,emissiveIntensity:.18,side:DoubleSide});
    const hollow=paint('watcherSkin',{color:0x635b58,emissive:0x515e68,emissiveIntensity:.11});
    mesh(drape([[.14,.43,.205],[.44,.351,.174],[.73,.268,.157],[1.14,.314,.191],
      [1.46,.327,.189],[1.60,.222,.155],[1.72,.095,.095]],compact?26:41,1.2),cloth).name='Weathered woven shroud';
    mesh(drape([[.032,.29,.13],[.32,.302,.151],[.65,.247,.143],[1.05,.213,.154]],compact?18:32,2.4),rag);
    const cowl=new SphereGeometry(1,compact?17:28,compact?11:19,2.05,5.21);
    const hood=mesh(cowl,cloth);hood.position.set(-.041,1.787,-.013);hood.scale.set(.239,.307,.229);hood.rotation.z=.15;
    oval(hollow,-.048,1.777,.063,.154,.214,.118);
    for(const s of [-1,1]){
      const sleeve=new Group();sleeve.position.set(s*.260,1.492,-.018);group.add(sleeve);
      sleeve.rotation.z=s*.26;
      mesh(drape([[-.81,.11,.082],[-.45,.107,.09],[-.19,.136,.105],[.035,.133,.102]],compact?14:19,s),rag,sleeve);
      bone(hollow,[0,-.56,.012],[s*.023,-.80,.03],.048,sleeve);
    }
    wraith.pose=(t,still)=>{group.position.y+=still?.23:.23+Math.sin(t*2.22)*.102;group.rotation.z=still?0:.062*Math.sin(t*2.8);};
  }

  const crawler=assembly('सड़क पर रेंगता हुआ उल्टा जीव');
  {
    const {group,paint,oval,bone}=crawler;
    const skin=paint('watcherSkin',{color:0x868180,emissive:0x343f4a,emissiveIntensity:.20,strength:.74});
    const cloth=paint('rootHide',{color:0x7e7772,emissive:0x343f4a,emissiveIntensity:.18});
    const glare=paint('watcherSkin',{color:0xb08865,emissive:0xc98c4d,emissiveIntensity:.58});
    oval(cloth,0,.437,-.119,.285,.193,.653);
    oval(skin,0,.461,.389,.177,.162,.239);
    for(let i=0;i<6;i++)oval(skin,-.006,.587-Math.abs(i-2.5)*.015,.261-i*.15,.061,.044,.077);
    const arms=[];
    for(const side of [-1,1]){
      oval(glare,side*.078,.473,.601,.020,.016,.010);
      for(let i=0;i<3;i++){
        const joint=new Group();joint.position.set(side*.183,.425,.171-i*.35);group.add(joint);
        const elbow=[side*.325,.208,-.04],toe=[side*(.591+i*.054),-.394,.13];
        bone(cloth,[0,0,0],elbow,.080,joint);oval(skin,...elbow,.073,.061,.070,joint);
        bone(skin,elbow,toe,.059,joint);
        for(let j=-1;j<=1;j++)bone(skin,toe,[toe[0]+j*.035,-.414,.301+j*.019],.022,joint);
        arms.push({joint,side,i});
      }
    }
    crawler.pose=(t,still)=>{for(const {joint,side,i} of arms)joint.rotation.y=still?0:Math.sin(t*12+i*1.8+side)*.23;};
  }

  const twins=assembly('एक जैसी दो परछाइयाँ');
  {
    const rigs=[-1,1].map(side=>{
      const copy=createWatcherModel({...textures,watcherCloth:textures.hauntCloth},{compact:true,tints:[0x837a73,0x8c817a,0xbaa99b]});
      copy.group.name=`The echo ${side<0?'left':'right'}`;copy.group.scale.setScalar(.53);copy.group.visible=true;
      twins.group.add(copy.group);copy.hold(side,'standing');copy.eyes(.12);
      return {copy,side};
    });
    twins.pose=(t,still)=>rigs.forEach(({copy,side},i)=>{
      copy.group.position.set(side*(.44+(still?0:Math.sin(t*1.23)*.093)),0,side*.093);
      copy.group.rotation.y=still?0:Math.sin(t*3.1+i*2.9)*.19;
      copy.tilt((still?.18:.30+Math.sin(t*2.5+i*3.1)*.23));
    });
    twins.veil=n=>rigs.forEach(({copy})=>copy.veil(n));
  }

  // A newer apparition: the blank-faced listener. It has no eyes at all until
  // the exact moment it decides you are worth looking at.
  const faceless=assembly('बिना चेहरे वाली सुनने वाली');
  {
    const {group,paint,mesh,oval,bone}=faceless;
    const shroud=paint('hauntCloth',{color:0x9d9990,emissive:0x4d5a61,emissiveIntensity:.16,side:DoubleSide,strength:.79});
    const skin=paint('hauntMask',{color:0xd5cfc1,emissive:0x4c4641,emissiveIntensity:.12,strength:.9});
    mesh(drape([[.06,.35,.19],[.42,.31,.16],[.83,.27,.15],[1.23,.33,.19],[1.61,.24,.16],[1.79,.11,.10]],compact?22:35,3.7),shroud).name='Faceless mourning sheet';
    const head=new Group();head.position.set(0,1.91,.015);group.add(head);
    const blank=oval(skin,0,0,0,.163,.229,.126,head);blank.name='Blank porcelain mask · no eyes';
    for(const side of [-1,1]){
      const sleeve=new Group();sleeve.position.set(side*.247,1.52,0);group.add(sleeve);
      sleeve.rotation.z=side*.14;
      mesh(drape([[-.69,.09,.08],[-.30,.11,.10],[.06,.12,.10]],compact?12:18,side+4),shroud,sleeve);
      bone(skin,[0,-.49,.01],[side*.031,-.79,.06],.041,sleeve);
    }
    faceless.pose=(t,still)=>{
      head.rotation.z=still?0:Math.sin(t*1.7)*.085;
      group.rotation.z=still?0:Math.sin(t*2.3)*.035;
    };
    faceless.reset=()=>{head.rotation.set(0,0,0);group.rotation.set(0,0,0);};
    faceless.reset();
  }

  const watcher=createWatcherModel(textures,{compact});watcher.group.name='दूर का साया';scene.add(watcher.group);
  const sentinel={group:watcher.group,veil:level=>watcher.veil(level),reset:pose=>watcher.hold(1,pose??'standing'),
    pose:(t,still,travel)=>{
      if(travel!=null)watcher.walk(travel,.90);
      watcher.tilt((travel!=null?.10:still?.16:.39)*Math.min(1,t));watcher.eyes(.52);
    }};
  return {jump,wraith,crawler,twins,sentinel,faceless};
}

export function createShadowOmen(scene){
  // The silhouette is projected onto real terrain, stretching into the
  // illuminated part of the road when the person is still behind the player.
  const body=new Shape();
  body.moveTo(-.19,2.16);body.lineTo(-.61,3.9);body.lineTo(-.930,4.57);body.lineTo(-1.28,5.34);
  body.lineTo(-1.12,5.45);body.lineTo(-.92,5.15);body.lineTo(-.83,5.45);body.lineTo(-.72,5.28);body.lineTo(-.57,4.9);
  body.lineTo(-.58,5.84);body.quadraticCurveTo(-.53,6.24,-.29,6.34);body.lineTo(-.27,6.61);
  body.quadraticCurveTo(-.41,7.30,-.066,7.57);body.quadraticCurveTo(.36,7.52,.32,6.91);
  body.lineTo(.26,6.48);body.quadraticCurveTo(.57,6.45,.62,5.97);body.lineTo(.70,5.18);body.lineTo(.95,5.55);
  body.lineTo(1.14,5.49);body.lineTo(.91,4.83);body.lineTo(.52,4.35);body.lineTo(.43,3.75);body.lineTo(.17,2.27);
  body.lineTo(.084,2.30);body.lineTo(.03,3.58);body.lineTo(-.10,3.60);body.lineTo(-.103,2.20);body.closePath();
  const geometry=new ShapeGeometry(body,12);geometry.rotateX(Math.PI/2);
  const outer=new MeshBasicMaterial({color:0x07060a,side:DoubleSide,transparent:true,depthWrite:false,opacity:0});
  const inner=outer.clone();inner.color.setHex(0x020204);
  const group=new Group(),rind=new Mesh(geometry,outer),core=new Mesh(geometry,inner);
  rind.scale.set(1.09,1,1.012);core.position.y=.003;group.add(rind,core);group.renderOrder=9;group.name='सामने खिंचा हुआ भारी साया';
  scene.add(group);group.visible=false;
  const toEye=new Vector3(),facing=new Vector3();
  return {group,
    show(feet,forward){group.position.copy(feet);group.position.y+=.028;group.rotation.y=Math.atan2(forward.x,forward.z);group.visible=true;},
    // Dynamic Shadow: it only holds together in peripheral vision. The moment
    // the player looks straight at it, the silhouette drains away.
    gaze(view){
      if(!group.visible)return 0;
      toEye.set(group.position.x-view.position.x,group.position.y+1.1-view.position.y,group.position.z-view.position.z);
      const distance=toEye.length();if(distance<.35)return 0;
      toEye.divideScalar(distance);view.getWorldDirection(facing);
      return 1-MathUtils.smoothstep(toEye.dot(facing),.958,.992);
    },
    alpha(n){outer.opacity=.31*n;inner.opacity=.69*n;},
    hide(){group.visible=false;},
  };
}
