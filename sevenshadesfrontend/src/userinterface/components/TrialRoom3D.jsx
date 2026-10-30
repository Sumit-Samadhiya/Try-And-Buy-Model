import { useEffect, useRef, useState } from 'react';

// Loaded only when the section is visible. The room owns and disposes its GPU resources.
export default function TrialRoom3D({ step, active, reduced, fallback }) {
  const host = useRef(null), state = useRef({step, active, reduced});
  const [failed, setFailed] = useState(false);
  state.current = {step, active, reduced};
  useEffect(() => {
    if (!active || failed) return;
    let disposed = false, cleanup;
    import('three').then(T => {
      if (disposed) return;
      let renderer;
      try { renderer = new T.WebGLRenderer({antialias:true, alpha:true, powerPreference:'low-power'}); }
      catch { setFailed(true); return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFShadowMap;
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(37, 1, .1, 60);
      const materials = [], geometries = [];
      const material = (color, roughness=.7, metalness=0) => { const m = new T.MeshStandardMaterial({color,roughness,metalness}); materials.push(m); return m; };
      const cream=material('#eee6d4'), wood=material('#ae8258'), darkWood=material('#765438'), green=material('#195d48'), gold=material('#bfa273',.3,.65), black=material('#25352e'), fabric=material('#dbd6c5'), skin=material('#b97851');
      const mesh = (geometry, mat, x,y,z, parent=scene) => { geometries.push(geometry); const obj = new T.Mesh(geometry,mat); obj.position.set(x,y,z); obj.castShadow=true; obj.receiveShadow=true; parent.add(obj); return obj; };
      const box=(w,h,d,m,x,y,z,parent) => mesh(new T.BoxGeometry(w,h,d),m,x,y,z,parent);
      const sphere=(radius,m,x,y,z,parent) => mesh(new T.SphereGeometry(radius,20,14),m,x,y,z,parent);
      const cylinder=(radius,height,m,x,y,z,parent) => mesh(new T.CylinderGeometry(radius,radius,height,24),m,x,y,z,parent);
      scene.add(new T.HemisphereLight('#fff4df','#7f9a87',2.2));
      const sun = new T.DirectionalLight('#fff2cf',4); sun.position.set(-3,8,5); sun.castShadow=true;
      sun.shadow.mapSize.set(1024,1024); sun.shadow.camera.left=-6;sun.shadow.camera.right=6;sun.shadow.camera.top=6;sun.shadow.camera.bottom=-6;sun.shadow.normalBias=.035;scene.add(sun);
      const fill = new T.DirectionalLight('#d4e8ff',1.1);fill.position.set(5,4,-1);scene.add(fill);
      box(7,.22,4.8,darkWood,0,-.15,0);
      for(let row=0;row<12;row++) for(let col=0;col<4;col++) {
        const plank=material(['#b6946d','#c6a77f','#bfa077','#d0b38b'][(row+col)%4]);
        box(1.735,.05,.39,plank,-2.62+col*1.75,-.015,-2.18+row*.4);
      }
      box(7,3.4,.12,cream,0,1.6,-2.4);box(.12,3.4,4.8,cream,-3.5,1.6,0);
      box(6.9,.13,.08,wood,0,.08,-2.3);box(.08,.13,4.7,wood,-3.4,.08,0);
      // Window recess, frame and individual glass panes.
      box(1.65,1.75,.08,wood,-2.3,2,-2.3);
      const glass=material('#c5dce0',.22,.18);
      for(let i=0;i<2;i++) for(let j=0;j<2;j++) box(.72,.77,.04,glass,-2.7+i*.8,1.58+j*.84,-2.24);
      // Clothes rail with four individually modelled outfits.
      cylinder(.035,2.25,gold,-2.9,1.125,-.65); cylinder(.035,2.25,gold,-.9,1.125,-.65);
      const rail=cylinder(.035,2.05,gold,-1.9,2.25,-.65); rail.rotation.z=Math.PI/2;
      box(.55,.06,.5,black,-2.9,.05,-.65);box(.55,.06,.5,black,-.9,.05,-.65);
      const outfits=[];
      ['#dbc8a6','#be827c','#5e806d','#c6b9a7'].forEach((color,i)=>{
        const group=new T.Group();group.position.set(-2.65+i*.49,1.9,-.65);scene.add(group);outfits.push(group);
        const shirt=material(color,.96); const shape=new T.Shape();
        shape.moveTo(-.14,0);shape.lineTo(-.3,-.12);shape.lineTo(-.24,-.3);shape.lineTo(-.14,-.24);shape.lineTo(-.14,-.65);shape.lineTo(.14,-.65);shape.lineTo(.14,-.24);shape.lineTo(.24,-.3);shape.lineTo(.3,-.12);shape.lineTo(.14,0);shape.quadraticCurveTo(0,-.12,-.14,0);
        mesh(new T.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:true,bevelThickness:.025,bevelSize:.015,bevelSegments:2,steps:1}),shirt,0,0,0,group);
        const hook=mesh(new T.TorusGeometry(.055,.008,6,18,Math.PI*1.6),gold,0,.2,.025,group);hook.rotation.z=.4;
        box(.35,.018,.025,gold,0,.03,.025,group);
        for(let j=0;j<3;j++) sphere(.008,gold,0,-.16-j*.1,.09,group);
      });
      // Raised fitting alcove, framed mirror and fabric curtain with real folds.
      box(1.8,.12,1.35,wood,.8,.06,-1.6);
      box(.08,2.7,.08,gold,-.1,1.4,-.93);box(.08,2.7,.08,gold,1.7,1.4,-.93);box(1.88,.08,.08,gold,.8,2.75,-.93);
      box(1.1,2.25,.08,gold,.8,1.45,-2.25);box(.98,2.13,.04,material('#c5d4ce',.12,.8),.8,1.45,-2.19);
      const curtainGroup=new T.Group();curtainGroup.position.set(1.65,0,-.9);scene.add(curtainGroup);
      const curtainGeo=new T.PlaneGeometry(1.7,2.48,70,15);const pos=curtainGeo.attributes.position;
      for(let i=0;i<pos.count;i++)pos.setZ(i,Math.sin(pos.getX(i)*27)*.055);
      curtainGeo.computeVertexNormals();const curtainMat=material('#34715a',.98);curtainMat.side=T.DoubleSide;
      mesh(curtainGeo,curtainMat,-.85,1.47,0,curtainGroup);
      for(let i=0;i<10;i++){const ring=mesh(new T.TorusGeometry(.045,.009,6,16),gold,-.08-i*.17,2.72,0,curtainGroup);ring.rotation.y=Math.PI/2;}
      // Upholstered bench: seat, piping, cushion, legs.
      box(1.65,.35,.7,fabric,-1.8,.55,1.35);box(1.62,.12,.69,material('#e7dfc9'),-1.8,.78,1.35);
      [-2.4,-1.2].forEach(x=>[1.1,1.6].forEach(z=>cylinder(.045,.38,wood,x,.2,z)));
      // Doorway and parcel awaiting the rider.
      box(1.05,2.6,.1,wood,2.65,1.3,-2.27);box(.89,2.44,.08,green,2.65,1.3,-2.19);sphere(.055,gold,2.96,1.3,-2.1);
      const parcel=box(.5,.45,.42,material('#b9915c'),2.4,.23,-1.6);box(.08,.46,.43,cream,2.4,.23,-1.6);
      // Rider: separate limbs, uniform, cap and bag, placed at the door during delivery.
      const rider=new T.Group();rider.position.set(2.5,0,-.4);scene.add(rider);
      box(.43,.65,.25,green,0,1.05,0,rider);sphere(.2,skin,0,1.58,0,rider);cylinder(.21,.1,green,0,1.75,0,rider);
      [-.13,.13].forEach(x=>{box(.14,.65,.17,black,x,.42,0,rider);box(.17,.12,.3,black,x,.08,.06,rider);});
      [-.3,.3].forEach(x=>{const arm=cylinder(.065,.6,green,x,1,0,rider);arm.rotation.z=x; sphere(.07,skin,x*1.25,.7,0,rider);});
      // Shopping bags and cash envelope; this is an illustration, not an order state.
      const bags=[];[-.1,1.2].forEach((x,i)=>{const g=new T.Group();g.position.set(x,0,1.5);scene.add(g);bags.push(g);box(.5,.6,.3,i?fabric:green,0,.35,0,g);const handle=mesh(new T.TorusGeometry(.13,.018,8,24,Math.PI),gold,0,.67,0,g);handle.rotation.z=0;});
      const cash=box(.35,.015,.17,material('#8ca591'),.6,.2,1.5);
      const pot=mesh(new T.CylinderGeometry(.23,.17,.48,24),material('#bd8764'),3,.24,1.1);
      for(let i=0;i<7;i++){const leaf=sphere(.17,green,3+Math.sin(i)*.2,.7+i*.07,1.1+Math.cos(i)*.15);leaf.scale.set(.6,1.9,.3);leaf.rotation.z=Math.sin(i)*.7;}
      const roomObjects=scene.children.filter(o=>!o.isLight);
      const selection=new T.Group(), dispatchScene=new T.Group(), split=new T.Group();
      scene.add(selection,dispatchScene,split);
      const textures=[];
      const label=(text,x,y,z,parent,size=1.2)=>{
        const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
        const ctx=canvas.getContext('2d');
        const paint=value=>{
          ctx.clearRect(0,0,512,128);
          ctx.fillStyle='rgba(255,249,233,0.92)';
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(8,12,496,104,52);
            ctx.fill();
            ctx.strokeStyle='#d4bf92';
            ctx.lineWidth=4;
            ctx.stroke();
          } else {
            ctx.fillRect(8,12,496,104);
          }
          ctx.fillStyle='#174b39';
          ctx.font='bold 42px sans-serif';
          ctx.textAlign='center';
          ctx.textBaseline='middle';
          ctx.fillText(value,256,64,460);
        };
        paint(text);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;textures.push(texture);
        const mat=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide,transparent:true});materials.push(mat);
        const plane=mesh(new T.PlaneGeometry(size,size/4),mat,x,y,z,parent);
        return {plane,update:value=>{paint(value);texture.needsUpdate=true;}};
      };
      const dress=(color,parent,x,y,z)=>{
        const shape=new T.Shape();shape.moveTo(-.18,.45);shape.lineTo(-.3,.32);shape.lineTo(-.22,.15);shape.lineTo(-.14,.2);shape.lineTo(-.13,-.05);shape.lineTo(-.38,-.6);shape.quadraticCurveTo(0,-.72,.38,-.6);shape.lineTo(.13,-.05);shape.lineTo(.14,.2);shape.lineTo(.22,.15);shape.lineTo(.3,.32);shape.lineTo(.18,.45);shape.quadraticCurveTo(0,.28,-.18,.45);
        return mesh(new T.ExtrudeGeometry(shape,{depth:.08,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:2,steps:1}),material(color,.95),x,y,z,parent);
      };
      // Scene 1: full 3D phone, two size cards and transparent trial bag.
      box(6.5,.16,4,cream,0,-.12,0,selection);
      const phone=box(1.9,3.1,.16,black,-1.4,1.6,0,selection);
      box(1.72,2.82,.03,material('#e2ece1'),-1.4,1.6,.1,selection);
      box(.5,.07,.04,black,-1.4,3,.13,selection);
      label('DoorDrape',-1.4,2.65,.14,selection,1.5);
      const cards=[box(.72,1.3,.035,fabric,-1.82,1.65,.15,selection),box(.72,1.3,.035,fabric,-.98,1.65,.15,selection)];
      label('Size M',-1.82,1.23,.2,selection,.65);label('Size L',-.98,1.23,.2,selection,.65);
      const choices=[dress('#b97275',selection,-1.82,1.95,.22),dress('#b97275',selection,-.98,1.95,.22)];choices.forEach(o=>o.scale.setScalar(.55));
      const transparent=material('#6eac92',.25);transparent.transparent=true;transparent.opacity=.32;transparent.depthWrite=false;
      box(1.35,1.45,.75,transparent,1.25,.8,.3,selection);
      const bagHandle=mesh(new T.TorusGeometry(.35,.035,8,32,Math.PI),gold,1.25,1.55,.3,selection);
      const zipper=box(1.35,.04,.08,gold,1.25,1.55,.72,selection);
      label('TRY BAG',1.25,.85,.71,selection,1.1);
      const packed=[dress('#b97275',selection,1,.8,.35),dress('#c9aa7b',selection,1.5,.8,.35)];packed.forEach(o=>o.scale.setScalar(.6));
      // Scene 2: road, buildings and an electric scooter travelling to the doorstep.
      box(7,.14,4,material('#c0cebb'),0,-.13,0,dispatchScene);
      box(7,.04,1.4,material('#5c6963'),0,0,.6,dispatchScene);
      for(let i=0;i<7;i++)box(.48,.015,.045,cream,-3+i,.03,.6,dispatchScene);
      for(let i=0;i<3;i++){
        box(.85,1.1+i*.25,.8,cream,-2.5+i*1.4,.55+i*.125,-1.25,dispatchScene);
        box(.16,.3,.04,glass,-2.7+i*1.4,.7,-.82,dispatchScene);box(.16,.3,.04,glass,-2.3+i*1.4,.7,-.82,dispatchScene);
      }
      box(1.25,1.9,1,cream,2.6,.95,-1.3,dispatchScene);box(.45,1.25,.03,green,2.6,.63,-.78,dispatchScene);
      const scooter=new T.Group();dispatchScene.add(scooter);
      [-.48,.48].forEach(x=>{const wheel=cylinder(.22,.13,black,x,.26,0,scooter);wheel.rotation.x=Math.PI/2;});
      box(.9,.18,.32,green,0,.48,0,scooter);box(.48,.12,.38,black,-.18,.86,0,scooter);
      const stem=box(.08,.75,.1,gold,.4,.75,0,scooter);stem.rotation.z=-.2;
      box(.12,.06,.6,black,.48,1.1,0,scooter);box(.4,.4,.4,green,-.48,1,0,scooter);
      sphere(.15,skin,0,1.6,0,scooter);box(.3,.4,.22,green,0,1.24,0,scooter);
      label('ELECTRIC',-.45,1.05,.22,scooter,.42);
      const timerLabel=label('35:00',0,2.6,0,dispatchScene,1.8);label('DEMO JOURNEY',0,2.2,0,dispatchScene,2);
      // Scene 3: dress moves off the rail to the mirror; ring fills in demo time.
      const trialDress=dress('#b97275',scene,.8,1.3,-1.4);
      const clockGroup=new T.Group();scene.add(clockGroup);clockGroup.position.set(2.5,2.7,-1.9);
      for(let i=0;i<60;i++){const tick=box(.025,.08,.025,gold,Math.sin(i/60*Math.PI*2)*.36,Math.cos(i/60*Math.PI*2)*.36,0,clockGroup);tick.rotation.z=-i/60*Math.PI*2;}
      const clockLabel=label('15 MIN',0,0,.02,clockGroup,.55);
      // Scene 4: one retained dress, one return parcel and a demo payment sound box.
      box(6.5,.18,3.5,cream,0,-.12,0,split);
      cylinder(.03,1.4,gold,-1.6,.7,0,split);
      cylinder(.28,.04,darkWood,-1.6,.02,0,split);
      const keepDress=dress('#b97275',split,-1.6,1.4,0);
      const returned=dress('#c9aa7b',split,1.3,1.5,0);
      box(1.15,.7,.8,wood,1.3,.35,0,split);box(1,.06,.7,darkWood,1.3,.71,0,split);
      label('KEEP',-1.6,.35,.3,split,1);label('HAND BACK',1.3,.35,.43,split,1);
      const check=new T.Group();split.add(check);check.position.set(-1.6,2.3,0);
      const checkA=box(.12,.36,.08,green,-.12,0,0,check);checkA.rotation.z=.7;
      const checkB=box(.12,.68,.08,green,.12,.12,0,check);checkB.rotation.z=-.65;
      box(.65,.9,.35,green,0,.48,1,split);label('DEMO',0,.55,1.19,split,.5);
      const led=sphere(.045,material('#8adc88'),0,.85,1.2,split);
      const splitCaption=label('PAY AFTER TRIAL',0,2.8,0,split,2.6);
      const node=host.current;node.appendChild(renderer.domElement);
      const resize=()=>{if(!node)return;const w=node.clientWidth,h=node.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();};
      const observer=new ResizeObserver(resize);observer.observe(node);resize();
      let frame, last=0, angle=.1, curtain=1, currentStep=-1, started=0, lastSecond=-1;
      const draw=time=>{
        if(disposed)return;
        const st=state.current;
        if(time-last>32){
          const dt=Math.min((time-last)/1000,.1);last=time;
          if(currentStep!==st.step){currentStep=st.step;started=time;lastSecond=-1;}
          const progress=st.reduced?1:Math.min((time-started)/11000,1);
          roomObjects.forEach(o=>{o.visible=st.step===2;});
          selection.visible=st.step===0;dispatchScene.visible=st.step===1;split.visible=st.step===3;
          trialDress.visible=clockGroup.visible=st.step===2;
          const target=st.step===2?.12:1;curtain+=(target-curtain)*Math.min(1,dt*2.5);curtainGroup.scale.x=st.reduced?target:curtain;
          if(st.step===2){rider.visible=false;cash.visible=false;outfits.forEach((obj,i)=>{obj.visible=i!==0;});trialDress.position.x=-2.65+3.45*Math.min(progress*2,1);trialDress.position.z=-.65-.75*Math.min(progress*2,1);clockGroup.children.slice(0,60).forEach((tick,i)=>{tick.visible=i<=progress*60;});}
          choices.forEach((obj,i)=>{const p=Math.max(0,Math.min((progress-.2-i*.16)*3,1));obj.position.set((-1.82+i*.84)*(1-p)+(1+i*.5)*p,1.95*(1-p)+.8*p,.22);obj.scale.setScalar(.55*(1-p));cards[i].material=p>0?green:fabric;packed[i].visible=p>.85;});
          zipper.scale.x=Math.max(.03,Math.min((progress-.7)*4,1));
          scooter.position.set(-2.7+5.1*progress,0,.6);
          const seconds=Math.max(0,Math.round(2100*(1-progress)));
          if(st.step===1&&seconds!==lastSecond){lastSecond=seconds;timerLabel.update(`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`);}
          returned.position.y=1.5-Math.min(progress*1.5,1)*1.1;returned.scale.setScalar(1-Math.min(progress*1.5,1)*.65);
          check.scale.setScalar(.9+.1*Math.sin(progress*Math.PI));led.material.emissive.setHex(progress>.55?0x65bd62:0x000000);led.material.emissiveIntensity=st.reduced?.5:(Math.sin(time*.006)+1)*.4;
          const desired=st.reduced?.1:Math.sin(time*.00013)*.12;
          angle+=(desired-angle)*.03;
          const mobile=camera.aspect<1;const radius=mobile?16:10.4;
          camera.position.set(Math.sin(.63+angle)*radius, mobile?7.5:6.4,Math.cos(.63+angle)*radius);camera.lookAt(0,1,0);
          renderer.render(scene,camera);
        }
        frame=requestAnimationFrame(draw);
      };frame=requestAnimationFrame(draw);
      const lost=e=>{e.preventDefault();setFailed(true);};renderer.domElement.addEventListener('webglcontextlost',lost);
      cleanup=()=>{cancelAnimationFrame(frame);observer.disconnect();renderer.domElement.removeEventListener('webglcontextlost',lost);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();};
    }).catch(()=>{if(!disposed)setFailed(true);});
    return ()=>{disposed=true;cleanup?.();};
  }, [active, failed]);
  return failed ? fallback : <div ref={host} className="tb-webgl-room" aria-hidden="true" />;
}


