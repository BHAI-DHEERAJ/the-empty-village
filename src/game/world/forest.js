import {
  BufferGeometry, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute,
  InstancedMesh, Object3D, Quaternion, Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { between, seededRandom } from './random.js';
import { imageMaterial } from './materials.js';
import { nightMaterial } from './shaders.js';
import { CANAL, fieldAt, groundHeight, isEntrance, isSceneryFootprint, pathEdge } from './sceneryLayout.js';
import { spurEdge } from './HighwayLayout.js';
import { escapeCurve, IMPACT_TREE } from '../story/CretaFinale.js';

// Sampled once: the cinematic escape camera needs a clear verge around the
// whole arrival road, not just a wheel-width corridor, or trunks cut across
// its sightline to the CRETA.
const ESCAPE_VERGE = escapeCurve.getSpacedPoints(160).map(p => [p.x, p.z]);
const nearEscape = (x, z, radius) => ESCAPE_VERGE.some(([px, pz]) => (x - px) ** 2 + (z - pz) ** 2 < radius * radius);

const UP = new Vector3(0, 1, 0);
const TREE_HEIGHT = 10;
const TWO_PI = Math.PI * 2;

function woodSegment(pieces, from, to, r1, r2, sides) {
  const direction = new Vector3().subVectors(to, from);
  const length = direction.length();
  const wood = new CylinderGeometry(r2, r1, length, sides, sides>=8?4:1, true);
  const uv = wood.getAttribute('uv');
  for (let i = 0; i < uv.count; i += 1) {
    uv.setXY(i, uv.getX(i) * Math.PI * (r1 + r2) / 1.65, (from.y + uv.getY(i) * length) / 1.65);
  }
  wood.applyQuaternion(new Quaternion().setFromUnitVectors(UP, direction.normalize()));
  wood.translate((to.x + from.x) / 2, (to.y + from.y) / 2, (to.z + from.z) / 2);
  pieces.push(wood);
}

function buildSpruce(seed, detailed, bare = false) {
  const random = seededRandom(seed);
  const wood = [];
  const positions = [], uvs = [], colors = [], indices = [];
  const tint = new Color();
  const trunkPhase = random() * TWO_PI;
  const width = between(random, 1.79, 2.72);
  const trunkRadius = between(random, .145, .205);
  const lean = between(random, .056, .27);
  const crownStart = between(random, .15, .31);
  const trunkAt = (h) => new Vector3(Math.sin(h * .35 + trunkPhase) * lean * (h / TREE_HEIGHT), h,
    Math.sin(h * .4 + trunkPhase * 2) * lean * (h / TREE_HEIGHT));

  const trunkSteps = detailed ? 9 : 5;
  for (let rank = 0; rank < trunkSteps; rank += 1) {
    const from = rank / trunkSteps, to = (rank + 1) / trunkSteps;
    woodSegment(wood, trunkAt(from * TREE_HEIGHT), trunkAt(to * TREE_HEIGHT),
      .009 + trunkRadius * (1 - from) ** 1.17, .004 + trunkRadius * (1 - to) ** 1.17, detailed ? 9 : 6);
  }
  if (detailed) {
    for (let i = 0; i < 5; i += 1) {
      const phi = i / 5 * TWO_PI + random() * .7;
      const root = between(random, .32, .58);
      woodSegment(wood, trunkAt(.12 + random() * .14), new Vector3(Math.cos(phi) * root, -.035, Math.sin(phi) * root), .09, .008, 5);
    }
  }

  function bough(from, end, wide, twist, shade) {
    const k = positions.length / 3;
    const axis = new Vector3().subVectors(end, from).normalize();
    const side = new Vector3(-axis.z, 0, axis.x).normalize().applyAxisAngle(axis, twist).multiplyScalar(wide / 2);
    const mid = from.clone().lerp(end, .53);
    mid.y += .11;
    const points = [from, mid, end];
    for (let i = 0; i < 3; i += 1) {
      for (const sign of [-1, 1]) {
        const p = points[i];
        positions.push(p.x + side.x * sign, p.y + side.y * sign, p.z + side.z * sign);
        uvs.push((sign + 1) * .5, i === 1 ? .53 : i / 2);
        const gain = shade * (i === 0 ? .79 : i === 1 ? .95 : 1.15);
        tint.setRGB(gain * 1.02, gain * 1.05, gain * .94);
        colors.push(tint.r, tint.g, tint.b);
      }
    }
    indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3, k + 2, k + 4, k + 3, k + 3, k + 4, k + 5);
  }

  const levels = bare ? 10 : detailed ? 15 : 12;
  const spiral = between(random, .42, 1.21);
  for (let level = 0; level < levels; level += 1) {
    const t = level / (levels - 1);
    const y = (crownStart + (1 - crownStart) * t * .965) * TREE_HEIGHT;
    const baseRadius = (.17 + width * (1 - t) ** .87) * (level === 0 ? .72 : 1);
    const rays = Math.max(2, Math.round((detailed ? 6 : 4.8) - t * 2.6 + random() * .92));
    for (let ray = 0; ray < rays; ray += 1) {
      if (random() < (bare ? .37 : .07)) continue;
      const phi = ray / rays * TWO_PI + level * spiral + between(random, -.28, .28);
      const from = trunkAt(y + between(random, -.18, .18));
      const reach = baseRadius * between(random, .70, 1.26) * (bare ? .83 : 1);
      const foot = from.clone().add(new Vector3(Math.cos(phi) * reach, between(random, -.30, .33) + t * .20, Math.sin(phi) * reach));
      if (t < .84 && (detailed || bare || ray === 0)) {
        woodSegment(wood, from, foot.clone().lerp(from, .19), (.032 + reach * .028) * (1 - t * .63), .010, 5);
      }
      if (bare) {
        for (let twig = 0; twig < 2; twig += 1) {
          const base = from.clone().lerp(foot, .36 + .20 * twig);
          const angle = phi + (twig === 0 ? .69 : -.72);
          const fork = base.clone().add(new Vector3(Math.cos(angle) * reach * .47, .12 + random() * .26, Math.sin(angle) * reach * .47));
          woodSegment(wood, base, fork, .019 * (1 - t * .65), .004, 4);
        }
        continue;
      }
      const start = from.clone().lerp(foot, between(random, .13, .33));
      const hue = between(random, .78, 1.23);
      bough(start, foot, reach * between(random, .67, 1.04), between(random, -.99, .99), hue);
      // Alternate tilted sprays leave holes in the silhouette rather than solid cone layers.
      const secondary = from.clone().lerp(foot, between(random, .18, .45));
      const side = random() < .5 ? -.37 : .38;
      const endpoint = secondary.clone().add(new Vector3(Math.cos(phi + side) * reach * .76, between(random, -.19, .30), Math.sin(phi + side) * reach * .76));
      bough(secondary, endpoint, reach * .72, (random() < .5 ? -1 : 1) * between(random, .72, 1.30), hue * .95);
      if (detailed && t < .78) {
        const fork = from.clone().lerp(foot, .26);
        const endpoint = fork.clone().add(new Vector3(Math.cos(phi - side * 1.9) * reach * .7, between(random, -.21, .23), Math.sin(phi - side * 1.9) * reach * .7));
        bough(fork, endpoint, reach * .62, between(random, -.92, .92), hue * 1.04);
      }
    }
  }

  const bark = mergeGeometries(wood);
  for (const part of wood) part.dispose();
  if (bare) return { bark };
  const needles = new BufferGeometry();
  needles.setAttribute('position', new Float32BufferAttribute(positions, 3));
  needles.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  needles.setAttribute('color', new Float32BufferAttribute(colors, 3));
  needles.setIndex(indices);
  needles.computeVertexNormals();
  return { bark, needles };
}

function broadleaf(seed, detailed, bare=false){
  const r=seededRandom(seed), wood=[],p=[],uv=[],colors=[],indices=[];
  const V=(x,y,z)=>new Vector3(x,y,z);
  const base=V(0,-.07,0),joint=V(.17,3.3,-.12),fork=V(-.15,5.86,.12);
  woodSegment(wood,base,joint,.30,.24,detailed?10:7);
  woodSegment(wood,joint,fork,.24,.118,detailed?9:6);
  woodSegment(wood,fork,V(.28,8.6,.50),.116,.038,detailed?9:6);
  if(detailed)for(let i=0;i<6;i++){
    const a=i*TWO_PI/6; woodSegment(wood,V(0,.32,0),V(Math.sin(a)*.65,-.022,Math.cos(a)*.65),.107,.012,5);
  }
  const card=(cx,cy,cz,w,h,a,tilt,shade)=>{
    const k=p.length/3;
    const u=V(Math.cos(a),0,Math.sin(a)).multiplyScalar(w*.5);
    const v=V(-Math.sin(a)*Math.sin(tilt),Math.cos(tilt),Math.cos(a)*Math.sin(tilt)).multiplyScalar(h*.5);
    for(const [s,t] of [[-1,-1],[1,-1],[1,1],[-1,1]]){
      p.push(cx+u.x*s+v.x*t,cy+v.y*t,cz+u.z*s+v.z*t);
      uv.push(s*.5+.5,t*.5+.5);colors.push(shade,shade*1.035,shade*.95);
    }
    indices.push(k,k+1,k+2,k,k+2,k+3);
  };
  const limbs=detailed?11:8;
  for(let i=0;i<limbs;i++){
    const a=i*2.39996+between(r,-.22,.22), high=i/limbs, angle=r()*PI2;
    const root=joint.clone().lerp(fork,clampForest(high*.95));
    const ra=between(r,1.88,3.62)*(1-high*.43), end=V(Math.cos(a)*ra,5.28+high*3.93+between(r,-.37,.83),Math.sin(a)*ra);
    const elbow=root.clone().lerp(end,.46);elbow.y-=.27*(i%3);
    woodSegment(wood,root,elbow,.126*(1-high*.43),.066,detailed?7:5);
    woodSegment(wood,elbow,end,.063,.020,detailed?6:5);
    for(let sub=0;sub<(detailed?4:2);sub++){
      const theta=angle+sub*1.7;
      const tip=end.clone().add(V(Math.cos(theta)*(.75+sub*.13),between(r,-.54,.63),Math.sin(theta)*(1.0+sub*.14)));
      if(detailed||sub===0)woodSegment(wood,elbow.clone().lerp(end,.58),tip,.026,.008,5);
      if(bare)continue;
      const scale=between(r,1.55,2.79);
      for(let j=0;j<(detailed?4:2);j++)card(tip.x,tip.y+.19+j*.15,tip.z,scale,scale*between(r,.78,1.31),theta+j*1.36,between(r,-.89,1.21),between(r,.66,1.19));
    }
  }
  const bark=mergeGeometries(wood);wood.forEach(g=>g.dispose());
  if(bare)return{bark};
  const needles=new BufferGeometry();
  needles.setAttribute('position',new Float32BufferAttribute(p,3));needles.setAttribute('uv',new Float32BufferAttribute(uv,2));
  needles.setAttribute('color',new Float32BufferAttribute(colors,3));needles.setIndex(indices);needles.computeVertexNormals();
  return {bark,needles};
}
const PI2=2*Math.PI;
const clampForest=(n)=>Math.max(0,Math.min(1,n));

function scatterTrees(){
  const r=seededRandom(13093), trees=[];
  // The escape spur is a real drivable corridor through this same forest, so
  // keep every trunk and root clear of the CRETA's swept box all the way to
  // the highway merge — not just clear of the village walking paths.
  const good=(x,z)=>!isSceneryFootprint(x,z,1.05)&&!isEntrance(x,z,.42)&&pathEdge(x,z)>.47
    && spurEdge(x,z)>.85 && !nearEscape(x,z,6)
    &&(Math.abs(x-CANAL.x)>4.02||z<CANAL.z0-2||z>CANAL.z1+2);
  const plant=(x,z,h,kind,clearance=2.9)=>{
    // Always draw the same random values for a candidate, accepted or not, so
    // tuning the clearance rules never reshuffles the entire forest.
    const ry=r()*TWO_PI,girth=between(r,.78,1.16),tint=between(r,.71,1.20);
    if(!good(x,z)||trees.some(t=>(t.x-x)**2+(t.z-z)**2<clearance**2))return;
    trees.push({x,z,h,kind,ry,girth,tint});
  };
  // Large neem and acacia silhouettes frame the inhabited lanes; smaller stems pack the forest west of them.
  for(const [x,z,h,k] of [[-6.9,-5.1,10.0,0],[7.8,-6.9,10.63,1],[-9.9,2.6,12.7,0],[11.5,4.2,9.7,1],[-7.2,-15.9,8.9,1],
    [10.1,-27.4,10.35,0],[-4.8,-39.1,9.5,0],[6.9,-44.9,9.6,1],[-3.5,-54.4,9.8,0],[-5.5,-72.2,9.2,1],
    [3.82,-92.2,10.45,0],[4.0,-103.1,8.35,4],[-35,-59.2,8.7,4],[28.1,-38,9.20,1],[55.7,-44.5,10.5,0],[-59,-119.1,13,0]])plant(x,z,h,k);
  for(let i=0;i<960;i++){
    const x=between(r,-147,-34), z=between(r,-48,32),t=r();
    plant(x,z,between(r,5.8,14.7),t<.57?0:t<.78?1:t<.93?2:t<.98?3:4,3.22);
  }
  for(let i=0;i<490;i++){
    const x=between(r,-145,150),z=between(r,-152,55);
    if(fieldAt(x,z)&&r()<.96||x < -36&&z > -47&&z < 30)continue;
    if(x>-32&&x<44&&z>-90&&z<3&&r()<.69)continue;
    plant(x,z,between(r,6.8,13.2),r()<.52?0:r()<.79?1:r()<.91?2:4,3.59);
  }
  // The trunk the CRETA strikes in the finale is an authored landmark, not a
  // lucky scatter seed. Pinning it keeps the bumper contact and its collision
  // solid stable even when road layouts or clearances change.
  const girth=IMPACT_TREE.radius/(8*.029);
  trees.push({x:IMPACT_TREE.x,z:IMPACT_TREE.z,h:8,kind:0,ry:.6,girth,tint:.86});
  return trees;
}

export function createForest(scene,textures,collision,{compact=false,trees=scatterTrees()}={}){
  const bark=imageMaterial(textures.bark,{color:0xb9a896,strength:.78});
  const spruceBark=imageMaterial(textures.firBark,{color:0xad9b84,strength:.73});
  const sway={value:0};
  const mat=(surface,color)=>nightMaterial(imageMaterial(surface,{color,vertexColors:true,alphaTest:.41,side:DoubleSide}),'moving-canopy',(shader)=>{
    shader.uniforms.uCanopy=sway;
    shader.vertexShader=`uniform float uCanopy;\n${shader.vertexShader}`.replace('#include <begin_vertex>',/* glsl */`
      #include <begin_vertex>
      #ifdef USE_INSTANCING
        float crown=clamp((position.y-2.)*.128,0.,1.);
        vec2 root=instanceMatrix[3].xz;
        float flutter=sin(uCanopy*.82+dot(root,vec2(.125,.19)))*.045*crown*crown;
        transformed.x+=flutter; transformed.z-=flutter*.51;
      #endif
    `);
  });
  const leaves=mat(textures.broadleaf,0xd1d8ac),needles=mat(textures.needles,0xd7d4a8);
  const kinds=[(high)=>broadleaf(7823,high),(high)=>broadleaf(4481,high),(high)=>buildSpruce(3279,high),
    (high)=>buildSpruce(9722,high),(high)=>broadleaf(1243,high,true)];
  const models=kinds.map((fn,i)=>trees.some(t=>t.kind===i)?[fn(false),fn(true)]:null);
  const cells=new Map();
  for(const t of trees){
    const key=`${Math.floor(t.x/29)}:${Math.floor(t.z/29)}:${t.kind}`;
    if(!cells.has(key))cells.set(key,[]);cells.get(key).push(t);
    const y=groundHeight(t.x,t.z);
    collision?.addCircle(t.x,t.z,t.h*(t.kind===2||t.kind===3?.021:.029)*t.girth,y+t.h,y,'trunk');
  }
  const pose=new Object3D(), tint=new Color(), lods=[];
  for(const batch of cells.values()){
    const k=batch[0].kind, isFir=k===2||k===3;
    const make=(geometry,m,label,level)=>{
      if(!geometry)return null;
      const meshes=new InstancedMesh(geometry,m,batch.length);meshes.name=label;
      meshes.castShadow=level===1&&label==='Tree trunks';meshes.receiveShadow=false;
      batch.forEach((t,i)=>{
        const s=t.h/TREE_HEIGHT;
        pose.position.set(t.x,groundHeight(t.x,t.z)-.025,t.z);pose.rotation.y=t.ry;pose.scale.set(s*t.girth,s,s*t.girth);pose.updateMatrix();
        meshes.setMatrixAt(i,pose.matrix);tint.setRGB(t.tint*1.04,t.tint,t.tint*.94);meshes.setColorAt(i,tint);
      });
      meshes.computeBoundingSphere();scene.add(meshes);return meshes;
    };
    const options=models[k].map(({bark:trunk,needles:crown},level)=>[make(trunk,isFir?spruceBark:bark,'Tree trunks',level),make(crown,isFir?needles:leaves,'Photographic tree foliage',level)].filter(Boolean));
    const x=batch.reduce((n,t)=>n+t.x,0)/batch.length,z=batch.reduce((n,t)=>n+t.z,0)/batch.length;
    lods.push({x,z,options});
  }
  return {update(camera,time){
    sway.value=time;
    for(const tile of lods){
      const d2=(tile.x-camera.position.x)**2+(tile.z-camera.position.z)**2;
      const hi=d2<(compact?22:38)**2;
      for(const mesh of tile.options[0])mesh.visible=!hi&&d2<(compact?92:114)**2;
      for(const mesh of tile.options[1])mesh.visible=hi;
    }
  }};
}
