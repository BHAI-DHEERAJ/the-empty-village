import { Group, MathUtils, MeshStandardMaterial } from 'three';
import { ModelBatch } from '../world/village/modeling.js';
import { ESCAPE } from './CretaFinale.js';

// Ravi rides beside Krish on the new forest route and stays in the car all the
// way out to the highway. The seat is narrow, so he is sculpted in the same
// local CRETA coordinates as the driver rather than placed as a world prop.
export function createCretaPassenger(car, palette) {
  const group=new Group(),body=new Group(),head=new Group();
  group.name='रवि · passenger';group.visible=false;car.add(group);group.add(body);body.add(head);
  const skin=new MeshStandardMaterial({color:0xa97755,roughness:.87});
  const shirt=new MeshStandardMaterial({color:0x35484c,roughness:.89});
  const jacket=new ModelBatch(body);
  jacket.ball(shirt,-.398,1.03,.267,.192,{sx:1.10,sy:1.38,sz:.66});
  jacket.ball(skin,-.394,1.275,.245,.060,{sx:1.02,sy:1.25,sz:1.02});
  jacket.finish('रवि · गैराज की जैकेट');
  head.position.set(-.394,1.422,.244);
  const face=new ModelBatch(head);
  face.ball(skin,0,0,0,.098,{sx:.89,sy:1.19,sz:1.05});
  face.ball(skin,0,-.019,-.095,.026,{sx:.76,sy:1.18,sz:1.25});
  face.ball(palette.rubber,0,.036,.014,.097,{sx:.97,sy:.91,sz:1.01});
  face.ball(palette.rubber,0,.086,.025,.080,{sx:1.22,sy:.38,sz:1.04});
  face.finish('रवि · चेहरा और बाल');
  // A crossed seat belt reads clearly in the cockpit and windshield shots.
  const belt=new ModelBatch(group);
  belt.box(palette.black,-.40,1.10,.31,.052,.68,.018,{rz:.39,rx:-.13});
  belt.box(palette.black,-.40,.905,.34,.16,.035,.024,{rz:.10});
  belt.finish('रवि · सीट बेल्ट');
  const hands=new ModelBatch(group);
  for(const side of [-1,1])hands.ball(skin,-.398+side*.17,.982,.10,.052,{sx:.86,sy:.80,sz:1.12});
  hands.finish('रवि · हाथ गोद में');
  return {
    hide(){group.visible=false;},
    pose(t,shot,reduced){
      group.visible=true;
      const look=reduced?0:Math.sin(t*.44)*.13;
      const worry=MathUtils.smoothstep(t,ESCAPE.impact,ESCAPE.impact+.7)
        *(1-MathUtils.smoothstep(t,ESCAPE.catch,ESCAPE.catch+.8));
      head.rotation.y=look-.24*worry;
      head.rotation.z=reduced?0:.035*Math.sin(t*.71)+.09*worry;
      body.rotation.z=reduced?0:-.025*Math.sin(t*.59)-.05*worry;
    },
  };
}
