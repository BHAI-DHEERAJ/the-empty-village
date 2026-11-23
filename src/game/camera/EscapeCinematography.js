import { MathUtils, Vector3 } from 'three';
import { ESCAPE, escapeJolt, escapeRoad, escapeShot, IMPACT_TREE, MERGE_DISTANCE } from '../story/CretaFinale.js';

// Ahead/along and shoulder offsets are in road coordinates, not a camera
// parent on the chassis. Roadside shots don't bounce or yaw with the car.
export function createEscapeCamera() {
  const eye=new Vector3(),gaze=new Vector3(),direction=new Vector3(),lookAhead=new Vector3(),tangent=new Vector3();
  const tree=new Vector3(IMPACT_TREE.x,1.27,IMPACT_TREE.z);
  return (view,car,t,motion,reducedMotion=false) => {
    const {distance,speed}=motion, shot=escapeShot(t), portrait=view.aspect<.86;
    const drift=reducedMotion?0:1, jolt=drift*escapeJolt(t);
    let fov=portrait?66:55;
    const anchor=(along,lateral,height)=>{
      escapeRoad(along,eye,direction);
      eye.x-=direction.z*lateral;eye.z+=direction.x*lateral;eye.y+=height;
    };
    const track=(along,lateral,height)=>{
      anchor(distance+along,lateral,height);
      gaze.copy(car.position).y+=1.06;
    };
    switch(shot){
      case 'village': {
        const u=MathUtils.smoothstep(t,0,ESCAPE.ranks)*drift;
        anchor(10.6-2.5*u,portrait?-.52:-2.63+u*.44,4.02-.53*u);
        gaze.copy(car.position).y+=1.38;gaze.z-=4.7;
        break;
      }
      case 'ranks': {
        const u=MathUtils.smoothstep(t,ESCAPE.ranks,ESCAPE.cabin)*drift;
        anchor(-2.55+1.25*u,portrait?.31:1.26-u*.77,2.21+u*.42);
        gaze.set(.12,1.68,car.position.z-14.1);
        break;
      }
      case 'cockpit': {
        const bump=drift*speed*(.009*Math.sin(t*22.1)+.008*Math.sin(t*15.8));
        car.localToWorld(eye.set(.36,1.395+bump,.24));
        escapeRoad(distance+13.8,gaze,tangent).y=car.position.y+.69;
        fov=portrait?70:64;
        break;
      }
      case 'headlamps': track(portrait?7.6:6.1,portrait?1.34:2.4,2.02);gaze.y+=.28;break;
      case 'pursuit': track(portrait?-4.64:-4.25,portrait?-1.43:-2.47,2.84);gaze.y+=.22;break;
      case 'skid': {
        const u=MathUtils.smoothstep(t,ESCAPE.skid,ESCAPE.impact);
        track(portrait?6.68:5.24,portrait?2.96:3.86,2.13);
        gaze.lerp(tree,u*.43);
        break;
      }
      case 'surround': {
        const u=MathUtils.smoothstep(t,ESCAPE.surround,ESCAPE.restart)*drift;
        anchor(IMPACT_TREE.distance+7.34-u*.68,portrait?-.99:.67-u*1.4,portrait?3.32:2.67);
        gaze.copy(car.position);gaze.y+=1.28;
        escapeRoad(distance-9.2,lookAhead,tangent);lookAhead.y=1.23;
        gaze.lerp(lookAhead,portrait?.10:.25);
        break;
      }
      case 'restart': {
        const crank=drift*(MathUtils.smoothstep(t,ESCAPE.restart,ESCAPE.restart+.55)-MathUtils.smoothstep(t,ESCAPE.catch,ESCAPE.reverse+.32));
        car.localToWorld(eye.set(.36,1.397-.015*crank,.28));
        car.localToWorld(gaze.set(.08+.25*crank,.52-.71*crank,-8.10));
        fov=portrait?70:62;
        break;
      }
      case 'breakaway': track(portrait?-6.23:-5.31,portrait?-.53:1.29,2.76);break;
      case 'windshield': {
        car.localToWorld(eye.set(.36,1.415+drift*speed*.009*Math.sin(t*19.7),.22));
        escapeRoad(distance+9.6,gaze,tangent).y=1.14;
        fov=portrait?70:62;
        break;
      }
      case 'brush':
        track(portrait?5.50:5.20,portrait?1.54:1.70,1.86);
        gaze.y-=.16;
        break;
      case 'last-shadows':
        track(portrait?5.60:4.90,portrait?1.32:1.98,2.01);
        escapeRoad(distance-11.3,lookAhead,tangent).y=1.61;
        gaze.lerp(lookAhead,portrait?.23:.31);
        break;
      case 'dawn':
        track(-7.8,portrait?-.56:-1.52,3.32);
        escapeRoad(distance+12.4,lookAhead,tangent).y=1.74;
        gaze.lerp(lookAhead,.21);
        break;
      case 'junction': {
        const rise=MathUtils.smoothstep(t,ESCAPE.junction,ESCAPE.highway)*drift;
        track(portrait?-9.6:-11.4,portrait?-.82:-2.44,5.45+rise*1.76);
        escapeRoad(distance+17.2,lookAhead,tangent).y=.96;
        gaze.lerp(lookAhead,portrait?.39:.46);
        fov=portrait?64:53;
        break;
      }
      case 'highway': {
        const glide=MathUtils.smoothstep(t,ESCAPE.highway,ESCAPE.tail)*drift;
        track(portrait?-7.9-glide*2.2:-4.5-glide*2.7,portrait?13.5:11.9,4.65+glide*.55);
        // Look across the near lanes so the people outside the dhaba stay
        // in the frame while Krish and Ravi pull away together in the car.
        gaze.x+=4.45;gaze.z+=1.95;gaze.y+=.22;
        fov=portrait?62:52;
        break;
      }
      case 'tail':
        anchor(MERGE_DISTANCE+44.4,portrait?-1.64:1.68,portrait?3.5:4.62);
        gaze.copy(car.position).y+=1.32;gaze.x+=portrait?2.55:1.68;
        fov=portrait?60:55;
        break;
    }
    eye.y+=jolt*.109;eye.x+=jolt*.09;
    view.position.copy(eye);view.lookAt(gaze);
    if(view.fov!==fov){view.fov=fov;view.updateProjectionMatrix();}
    if(jolt)view.rotateZ(jolt*.033);
    view.updateMatrixWorld();
    return shot;
  };
}
