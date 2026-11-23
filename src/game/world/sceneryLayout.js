const PI = Math.PI;

export const STYLES = {
  mud: { label: 'कच्चा घर', wall: 'adobe', roof: 'gable', door: 'board', plan: 'split', pitch: .26 },
  brick: { label: 'ईंटों का घर', wall: 'brick', roof: 'hip', door: 'wood', plan: 'split', pitch: .32 },
  storey: { label: 'दो मंज़िला घर', wall: 'plaster', roof: 'flat', door: 'double', plan: 'hall', levels: 2 },
  concrete: { label: 'खाली पक्का घर', wall: 'cement', roof: 'flat', door: 'metal', plan: 'hall' },
  court: { label: 'पुराना आँगन', wall: 'adobe', roof: 'court', door: 'double', plan: 'court' },
  ruin: { label: 'टूटा घर', wall: 'brick', roof: 'broken', door: 'broken', plan: 'split', pitch: .29 },
  terrace: { label: 'सपाट छत', wall: 'damp', roof: 'flat', door: 'wood', plan: 'split' },
  tile: { label: 'ढलवाँ छत', wall: 'plaster', roof: 'gable', door: 'wood', plan: 'hall', pitch: .42 },
  mansion: { label: 'हवेली', wall: 'plaster', roof: 'hip', door: 'double', plan: 'mansion', levels: 2, basement: true, pitch: .29 },
  farm: { label: 'खेत का एकांत घर', wall: 'adobe', roof: 'shed', door: 'board', plan: 'split', pitch: .18 },
  landlord: { label: 'ज़मींदार का घर', wall: 'damp', roof: 'hip', door: 'double', plan: 'hall', levels: 2, pitch: .30 },
  enclosed: { label: 'चारदीवारी वाला आँगन', wall: 'plaster', roof: 'court', door: 'gate', plan: 'court', pitch: .24 },
};

// Authored lot plans. Tuple: name, style, metres (x,z,width,depth), frontage yaw, plan overrides.
const centre = [
  ['दादा का घर','tile', 9.7,-12.4,7.4,6.0,-.25,{veranda:true,pitch:.34,windows:[.32,-.36]}],
  ['बुनकर का घर','mud', -8.4,-13.1,6.7,5.2,.24,{veranda:true,eave:2.54,door:'broken'}],
  ['किराने वाले का घर','brick', 13.8,-22.2,7.0,5.6,-1.39,{door:'double',porch:1.14,wall:'brick'}],
  ['हरी खिड़कियों वाला घर','terrace', -11.0,-24,8.2,5.7,1.42,{plan:'hall',veranda:true,parapet:'screen'}],
  ['सीढ़ियों वाला घर','storey', 15.4,-34.1,8.7,7.2,-1.49,{balcony:true,wall:'brick'}],
  ['दो दरवाज़ों वाला घर','enclosed', -13.6,-37.8,10.5,8.7,1.37,{courtWidth:3.1,gateBars:7}],
  ['चक्की वालों का घर','concrete', 16.1,-46.2,8.9,6.8,-1.57,{veranda:true,parapet:'posts'}],
  ['गेरू वाला आँगन','court', -10.9,-52.3,9.3,8.3,1.55,{courtWidth:2.5,wall:'adobe'}],
  ['सूना बरामदा','tile', 12.5,-58.4,8.1,6.15,3.04,{roof:'hip',eave:2.64,veranda:true}],
  ['नीली छत वाला घर','terrace', -16.8,-10.0,6.4,5.7,.15,{door:'metal',plan:'solo',parapet:'screen'}],
  ['कोने का घर','brick', 23,-19.4,6.8,5.5,.22,{roof:'gable',pitch:.31,door:'board'}],
  ['टूटी छत वाला घर','ruin', -23.4,-25.9,7.6,6.1,1.14,{plan:'hall',wall:'adobe',damage:.82}],
  ['लंबा बरामदा','mud', -24.5,-42.8,9.2,5.5,-.15,{roof:'shed',veranda:true,plan:'hall'}],
  ['पटवारी का पुराना घर','storey', 24.3,-43.1,8.9,7.4,.41,{roof:'hip',pitch:.26,balcony:true}],
  ['पलस्तर वाला घर','concrete', 21.5,-57.3,8.0,6.2,.09,{door:'broken',parapet:'low',wall:'plaster'}],
];
const forest = [
  ['लकड़ी की झोपड़ी','farm', -50,0,5.4,4.4,.48,{wall:'timber',roof:'gable',plan:'solo',eave:2.38}],
  ['गोंद वाले की झोपड़ी','mud', -65,-12,5.8,4.2,-.18,{roof:'shed',wall:'adobe',plan:'solo',porch:.68}],
  ['गिरा हुआ छज्जा','ruin', -80,-2.5,6.2,5.0,.83,{wall:'timber',plan:'solo',pitch:.37}],
  ['बारिश वाली झोपड़ी','tile', -94,-16,6.6,5.1,.55,{wall:'timber',plan:'split',pitch:.46,veranda:true}],
  ['साये की कोठरी','brick', -106,-5.5,6.5,5.25,-.58,{roof:'shed',wall:'damp',door:'metal'}],
  ['जंगल का आख़िरी घर','mud', -119,-21,7.5,5.7,.32,{roof:'hip',porch:.87,door:'double'}],
];
const farmland = [
  ['नहर वाला घर','farm', 59,6,6.9,5.8,-.32,{roof:'gable',pitch:.22,veranda:true}],
  ['पंप वाले का घर','concrete', 67,-12,7.3,5.1,.45,{plan:'split',porch:1.02,wall:'cement'}],
  ['नहर पार का खेत','farm', 100,0,9.1,6.2,-.44,{roof:'hip',plan:'hall',veranda:true}],
  ['खलिहान का घर','brick', 108,22,7.2,5.6,2.89,{roof:'shed',wall:'brick',door:'double'}],
  ['खेत के किनारे का घर','terrace', 117,38,8.5,6.6,1.56,{plan:'hall',wall:'adobe',door:'gate'}],
  ['अकेला खेत का घर','farm', 135,13,7.9,5.2,-1.32,{plan:'split',wall:'damp',roof:'broken'}],
];
const old = [
  ['पुराने ज़मींदार का घर','landlord', -15.5,-76.9,11.6,9.2,1.24,{balcony:true,veranda:true,wall:'plaster'}],
  ['चूल्हे वाला घर','mud', 10.1,-79.4,7.2,5.9,-1.46,{roof:'hip',pitch:.20,door:'board'}],
  ['ढहा हुआ हिस्सा','ruin', -14,-89.9,8.5,6.9,1.57,{damage:.64,veranda:true,eave:2.52}],
  ['टूटे फाटक वाला घर','enclosed', 13.8,-92.5,9.8,7.9,-1.55,{wall:'brick',courtWidth:2.75,gateBars:5}],
  ['सँकरा मकान','brick', -9.8,-103.3,6.5,6.9,1.49,{roof:'shed',plan:'hall',door:'broken'}],
  ['नीम वाला आँगन','court', 11.0,-106,9.6,8.7,-1.45,{wall:'damp',courtWidth:3.25,door:'gate'}],
  ['लाल बालकनी वाला घर','storey', -14.3,-116,9.0,7.25,.35,{balcony:true,wall:'damp',parapet:'screen'}],
  ['सूनी रसोई','terrace', 10.1,-119.3,7.3,5.4,-1.50,{wall:'cement',door:'broken',eave:2.45}],
  ['आँगन की दीवार','ruin', -27.6,-83.5,8.6,6.3,.19,{roof:'broken',wall:'plaster',door:'gate'}],
  ['पुराना भंडार','brick', -28.2,-96.7,6.6,5.2,-.34,{plan:'solo',roof:'hip',eave:2.45}],
  ['दो पीढ़ियों का घर','landlord', 25,-95.8,10.2,8.0,-.09,{roof:'flat',wall:'brick',balcony:true}],
  ['मिट्टी के छज्जे वाला घर','tile', 24,-113.1,8.1,6.25,.58,{wall:'adobe',pitch:.40,door:'board'}],
];
const estate = [['हवेली','mansion', -52.5,-126,17.4,13.6,.145,{veranda:true,balcony:true,door:'double',eave:2.92,windows:[-.39,-.21,.21,.39]}]];

function residence(area, tuple, n) {
  const [name, style, x, z, w, d, yaw, detail] = tuple;
  return { id: `${area}-${String(n+1).padStart(2,'0')}`, area, name, style, x, z, w, d, yaw,
    eave: 2.64, levels: 1, pitch: .30, windows: [-.34,.33], ...STYLES[style], ...detail, residence: true };
}
export const HOUSES = [...Object.entries({centre,forest,farmland,old,mansion:estate}).flatMap(([area, lots]) => lots.map((lot, n) => residence(area, lot, n)))];
export const WELL = { x: -3.9, z: -92.5, r: 1.02 };
export const CAR = { x: -7.4, z: -19.3, r: 1.91 };
export const CANAL = { x: 83, z0: -46, z1: 77, half: 2.2, depth: 1.17, bridgeZ: [-11, 15, 39] };
export const SQUARE = { x: 2.8, z: -41, w: 14.2, d: 10.4 };
const facility = (id,name,area,x,z,w,d,yaw,detail) => ({id,name,area,x,z,w,d,yaw, eave:2.73,levels:1, pitch:.27,
  wall:'plaster',roof:'gable',door:'double',windows:[-.33,.33],...detail});
export const SITES = [...HOUSES,
  facility('shops','बंद दुकानें','centre',-8.4,-43.2,7.5,4.0,1.45,{plan:'shops',roof:'shed',wall:'brick',veranda:true}),
  facility('temple','छोटा मंदिर','centre',-4.4,-64,4.85,4.2,.12,{plan:'temple',roof:'temple',wall:'rock',windows:[]}),
  facility('hospital','पुराना अस्पताल','centre',-27,-60.7,10.4,6.2,.48,{plan:'hospital',roof:'flat',wall:'damp'}),
  facility('school','गाँव का स्कूल','school',43.8,-46.0,22,10.0,.05,{plan:'school',veranda:true,eave:3.05,roof:'hip',pitch:.24,door:'double'}),
];
export const MANSION = HOUSES.at(-1);
export const DISTRICTS = {
  centre: ['गाँव का चौक',2,-36], forest: ['जंगल',-78,-5], farmland: ['नहर के खेत',95,14],
  old: ['पुरानी बस्ती',1,-92], school: ['गाँव का स्कूल',45,-38], mansion: ['हवेली',-51,-121],
};

// Junctions share points so the dirt routes never end before reaching a district.
export const ARRIVAL_ROAD={
  id:'arrival',width:2.30,
  path:[[-135,8.3],[-123.5,10.4],[-112.3,17.4],[-99.8,22.9],[-87.0,25.3],[-74.1,21.6],
    [-62.6,18.65],[-50.3,23.6],[-39.1,30.8],[-27.7,35.6],[-16.4,34.8],[-7.75,27.3],[0,21]],
};
// The shortcut Krish and Ravi take together: a lower, sheltered forest track
// that rejoins the village gate at the same main-road junction as the old
// arrival road. The old road stays intact as their way back out in the escape.
export const COMPANION_ROAD = {
  id:'companions', width:2.18,
  path:[[-135,8.3],[-123,2.8],[-111,1.2],[-99,5.5],[-87,11.5],[-75,17.5],[-63,23],[-51,26],[-39,27],[-27,25],[-18,21],[-10,18],[-4,16],[0,21]],
};
export const ROUTES = [
  { id:'main', width:3.35, path:[[-1.3,46],[0,21],[.15,3],[1.3,-12],[2.5,-25],[2.8,-41],[.4,-55],[.3,-67],[.0,-79],[.3,-96],[-2,-111],[-4,-127]] },
  ARRIVAL_ROAD,
  COMPANION_ROAD,
  { id:'forest', width:1.17,path:[[2.5,-25],[-5,-30],[-16,-32],[-30.8,-33.4],[-40.9,-22],[-43.8,-15.9],[-47,-5],[-58,-4],[-71,-8],[-86,-8],[-100,-12],[-114,-14],[-124,-14.65],[-128,-20.9]] },
  { id:'farm', width:2.0,path:[[1.3,-12],[9,-4],[23,-2],[39,0],[51,11],[64,15],[83,15],[95,15],[108,12],[123,14],[132,19]] },
  { id:'school', width:2.03,path:[[2.8,-41],[9,-40.7],[17.6,-40.1],[21.8,-37.1],[27.6,-35.65],[35,-37],[43.8,-38.8],[52.2,-37.4],[58.2,-32.2],[67.5,-23.1],[74.9,-16.7],[77.3,-11],[83,-11],[92,-11]] },
  { id:'court', width:1.65,path:[[.3,-96],[-5,-94.5],[-13,-96],[-20,-95.5],[-23.3,-91.5],[-31,-90]] },
  { id:'mansion', width:1.76,path:[[-2,-111],[-10,-125],[-22,-123],[-33,-116],[-44,-115],[-50,-116.7],[-53,-116.2]] },
  { id:'fields', width:1.24,path:[[64,15],[66,29],[74,39],[83,39],[97,39],[110,33],[117,31]] },
  { id:'east-bank', width:1.16,path:[[92,-11],[92.3,0],[93.3,8],[95,15]] },
  { id:'back-lane', width:1.20,path:[[.3,-67],[-2,-68.7],[-8.6,-68.3],[-17,-63],[-22,-56],[-27,-55]] },
  { id:'east-lane', width:1.09,path:[[-2,-111],[5.2,-111.8],[14.6,-112.3],[17.3,-109.65],[18.6,-105.7],[24.6,-105.6],[29.5,-107.6]] },
];
export const COURTS = [[2.8,-41,8.3,6.3],[-2.8,-92.1,6.7,5.7],[44,-37,12,5.0],[-52,-116.3,9.7,6]];
const SEGMENTS = ROUTES.flatMap(({path,width}) => path.slice(1).map(([x,z], i) => {
  const [a,b] = path[i]; return {a,b,dx:x-a,dz:z-b,n:(x-a)**2+(z-b)**2,width};
}));

export function localPoint(site, x, z) {
  const c = Math.cos(site.yaw), s = Math.sin(site.yaw), a = x-site.x, b = z-site.z;
  return [a*c-b*s,a*s+b*c];
}
export function worldPoint(site, x, z) {
  const c = Math.cos(site.yaw), s = Math.sin(site.yaw);
  return [site.x+x*c+z*s,site.z-x*s+z*c];
}
export function roadEdge(x,z) {
  let edge = Infinity;
  for(const {a,b,dx,dz,n,width} of SEGMENTS) {
    const t=Math.max(0,Math.min(1,((x-a)*dx+(z-b)*dz)/n));
    edge=Math.min(edge,Math.hypot(x-a-t*dx,z-b-t*dz)-width);
  }
  return edge;
}
export function courtAt(x,z) {
  let weight=0;
  for(const [a,b,w,d] of COURTS) weight=Math.max(weight,1-Math.min(1,Math.max(0,(((x-a)/w)**2+((z-b)/d)**2-.34)/.85)));
  return weight;
}
export function fieldAt(x,z) { return x>49&&x<148&&z>-29&&z<64; }
export function isBuildingFootprint(x,z,margin=0) {
  return SITES.some(site=>{
    if(Math.abs(x-site.x)>site.w+Math.max(0,margin)||Math.abs(z-site.z)>site.w+site.d+Math.max(0,margin))return false;
    const [q,r] = localPoint(site,x,z);
    return Math.abs(q)<site.w/2+margin&&Math.abs(r)<site.d/2+margin;
  });
}
export function isEntrance(x,z,margin=0) {
  return SITES.some(site=>{
    if(Math.hypot(x-site.x,z-site.z) > site.w+site.d+4+margin)return false;
    const [u,v]=localPoint(site,x,z);
    return Math.abs(u)<2.55+margin && v>site.d/2-1 && v<site.d/2+4.1+margin;
  });
}
export function isSceneryFootprint(x,z,margin=0) {
  return isBuildingFootprint(x,z,margin)||[WELL,CAR].some(a=>(x-a.x)**2+(z-a.z)**2<(a.r+margin)**2);
}
export function canalHeight(x,z) {
  if(z<CANAL.z0-.9||z>CANAL.z1+.9)return 0;
  const side=Math.max(0,Math.min(1,(CANAL.half+.64-Math.abs(x-CANAL.x))/.94));
  const cap=Math.max(0,Math.min(1,(z-CANAL.z0+.9)/1.8,(CANAL.z1+.9-z)/1.8));
  return side>0&&cap>0 ? -CANAL.depth*side*cap : 0;
}
export function groundHeight(x,z) {
  const [u,v]=localPoint(MANSION,x,z);
  return Math.abs(u)<MANSION.w/2-.13&&Math.abs(v)<MANSION.d/2-.13 ? -2.78 : canalHeight(x,z);
}
export function districtAt(x,z) {
  if(x < -37 && z < -98) return DISTRICTS.mansion[0];
  if(x > 29 && x < 57 && z < -29 && z > -64) return DISTRICTS.school[0];
  if(x > 46) return DISTRICTS.farmland[0];
  if(x < -37) return DISTRICTS.forest[0];
  if(z < -68) return DISTRICTS.old[0];
  return DISTRICTS.centre[0];
}

export function entryPoint(site) {
  let at=0;
  if(site.plan==='solo'||site.plan==='split')at=Math.min(.41,site.w*.065);
  return [at,site.d*.5];
}
const clamp01=(v)=>Math.max(0,Math.min(1,v));
const seg=(a,b,width)=>({a:a[0], b:a[1], dx:b[0]-a[0],dz:b[1]-a[1],n:(b[0]-a[0])**2+(b[1]-a[1])**2,width});
const inCanal=(x,z)=>Math.abs(x-CANAL.x)<CANAL.half+.70 && z>CANAL.z0-.9 && z<CANAL.z1+.9;

function makeApproach(site){
  const [a,b]=entryPoint(site);
  const origin=worldPoint(site,a,b+.20), end=worldPoint(site,a,b+(site.veranda?2.12:1.52));
  const choices=SEGMENTS.map(({a,b,dx,dz,n})=>{
    const t=clamp01(((end[0]-a)*dx+(end[1]-b)*dz)/n);
    return [a+t*dx,b+t*dz];
  }).sort((a,b)=>Math.hypot(a[0]-end[0],a[1]-end[1])-Math.hypot(b[0]-end[0],b[1]-end[1]));
  const clear=(from,to)=>{
    const N=Math.ceil(Math.hypot(to[0]-from[0],to[1]-from[1])/.63);
    for(let i=1;i<=N;i++){
      const x=from[0]+(to[0]-from[0])*i/N,z=from[1]+(to[1]-from[1])*i/N;
      if(isSceneryFootprint(x,z,.51)||inCanal(x,z))return false;
    }
    return true;
  };
  const elbow=[end,...[-1,1].map(s=>worldPoint(site,s*(site.w*.5+1.2),site.d*.5+1.95))];
  const links=[];
  for(const point of elbow){
    if(!clear(end,point))continue;
    for(const pick of choices.slice(0,19)){
      if(clear(point,pick))links.push({point,pick,score:Math.hypot(...point.map((v,i)=>v-end[i]))+Math.hypot(...pick.map((v,i)=>v-point[i]))});
    }
  }
  links.sort((a,b)=>a.score-b.score);
  return { id:site.id,points:links.length?[origin,end,...(links[0].point!==end?[links[0].point]:[]),links[0].pick]:[origin,end] };
}
export const APPROACHES=SITES.map(makeApproach);
const ALL_PATHS=[...SEGMENTS,...APPROACHES.flatMap(path=>path.points.slice(1).map((p,i)=>seg(path.points[i],p,.52+(path.id==='mansion-01'?.38:0))))]
  .filter(s=>s.n>.015).map(s=>({...s,x0:Math.min(s.a,s.a+s.dx)-s.width-3,x1:Math.max(s.a,s.a+s.dx)+s.width+3,z0:Math.min(s.b,s.b+s.dz)-s.width-3,z1:Math.max(s.b,s.b+s.dz)+s.width+3}));

export function pathEdge(x,z) {
  let edge=3;
  for(const s of ALL_PATHS){
    if(x<s.x0||x>s.x1||z<s.z0||z>s.z1)continue;
    const t=clamp01(((x-s.a)*s.dx+(z-s.b)*s.dz)/s.n);
    edge=Math.min(edge,Math.hypot(x-s.a-t*s.dx,z-s.b-t*s.dz)-s.width);
  }
  return edge;
}
