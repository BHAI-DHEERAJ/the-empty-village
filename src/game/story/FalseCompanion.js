import { Group, MathUtils, MeshStandardMaterial, Vector3 } from 'three';
import { ModelBatch } from '../world/village/modeling.js';

// False Companion: Ravi is in the CRETA one moment and standing alone between
// the houses the next. He never speaks while visible, and he is gone the instant
// you look straight at him or step close enough to check.
export function createFalseCompanion(scene) {
  const group=new Group();group.name='रवि · कभी बाहर';group.visible=false;scene.add(group);
  const skin=new MeshStandardMaterial({color:0xa97755,roughness:.87});
  const shirt=new MeshStandardMaterial({color:0x35484c,roughness:.9});
  const denim=new MeshStandardMaterial({color:0x27323b,roughness:.92});
  const hair=new MeshStandardMaterial({color:0x141517,roughness:.96});
  const body=new ModelBatch(group);
  body.ball(shirt,0,1.04,0,.23,{sx:1.05,sy:1.36,sz:.68});
  body.ball(skin,0,1.30,0,.062);
  body.beam(denim,[-.12,.84,0],[-.14,.10,0],.10,6);
  body.beam(denim,[.12,.84,0],[.14,.10,0],.10,6);
  body.beam(shirt,[-.24,1.09,0],[-.31,.72,.05],.075,6);
  body.beam(shirt,[.24,1.09,0],[.31,.72,.05],.075,6);
  body.finish('रवि · बाहर वाला रूप');
  const head=new ModelBatch(group);
  head.ball(skin,0,1.49,0,.108,{sx:.9,sy:1.18,sz:1.02});
  head.ball(hair,0,1.555,.012,.101,{sx:.98,sy:.88,sz:1.03});
  head.finish('रवि · चेहरा');
  const toEye=new Vector3(),facing=new Vector3();
  const spots=[[-7.4,5.6],[6.2,-4.8],[-5.4,-9.2],[8.1,7.6],[-9.4,-2.4]];
  let nextAt=10.5,shownAt=-1,index=0;

  return {
    group,
    hide(){group.visible=false;shownAt=-1;},
    update(dt,time,feet,view,enabled){
      if(!enabled){this.hide();nextAt=time+9;return;}
      if(shownAt<0&&time>=nextAt){
        const [dx,dz]=spots[index++%spots.length];
        group.position.set(feet.x+dx,feet.y,feet.z+dz);
        group.rotation.y=Math.atan2(feet.x-group.position.x,feet.z-group.position.z);
        group.visible=true;shownAt=time;nextAt=time+14.5;
      }
      if(shownAt<0)return;
      const age=time-shownAt;
      if(age>4.6){this.hide();nextAt=time+9;return;}
      toEye.set(group.position.x-view.position.x,group.position.y+1.35-view.position.y,group.position.z-view.position.z);
      const distance=toEye.length();toEye.divideScalar(distance||1);
      view.getWorldDirection(facing);
      if(facing.dot(toEye)>.962||feet.distanceToSquared(group.position)<2.7**2){this.hide();nextAt=time+8.5;return;}
      group.scale.setScalar(MathUtils.smoothstep(age,0,.55)*(1-MathUtils.smoothstep(age,3.9,4.6)));
    },
  };
}
