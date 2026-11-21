/* ---------- soundtrack, 128 BPM, 30 s: the AILO reel's own instruments, re-sequenced ----------
   Motion bars keep their original cues and the full four-on-the-floor; showcase bars drop to half-time
   with a soft chord, so the footage breathes and the cut feels slower without changing the tempo. */
window.renderAudio=async()=>{
  const SR=48000,ctx=new OfflineAudioContext(2,SR*DUR,SR),bus=ctx.createGain();bus.gain.value=.7;
  const comp=ctx.createDynamicsCompressor();comp.threshold.value=-16;comp.knee.value=6;comp.ratio.value=4;comp.attack.value=.003;comp.release.value=.15;bus.connect(comp);comp.connect(ctx.destination);
  let sd=11;const R=()=>(sd=(sd*16807)%2147483647)/2147483647*2-1;const nb=ctx.createBuffer(1,SR*2,SR),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=R();
  const env=(g,t,pk,att,dec)=>{const a=Math.max(att,.001);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(pk,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+dec);};
  const out=(n,p)=>{const P=ctx.createStereoPanner();P.pan.value=p;n.connect(P);P.connect(bus);};
  function noise(t,dur,type,f,q,g,p=0,att=.002,f2){const s=ctx.createBufferSource();s.buffer=nb;s.loop=true;const fl=ctx.createBiquadFilter();fl.type=type;fl.frequency.setValueAtTime(f,t);if(f2)fl.frequency.exponentialRampToValueAtTime(f2,t+att+dur);fl.Q.value=q;const a=ctx.createGain();env(a,t,g,att,dur);s.connect(fl);fl.connect(a);out(a,p);s.start(t,(t*.731)%1.2);s.stop(t+att+dur+.05);}
  const tone=(t,f,g,dur,type='sine',p=0,f2)=>{const o=ctx.createOscillator(),a=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur);env(a,t,g,.004,dur);o.connect(a);out(a,p);o.start(t);o.stop(t+dur+.05);};
  const kick=(t,g)=>{tone(t,170,g,.38,'sine',0,44);noise(t,.012,'highpass',3000,.7,.25*g);};
  const hit=(t,g)=>{tone(t,95,.8*g,.9,'sine',0,30);noise(t,.22,'bandpass',1600,.7,.45*g);noise(t,.5,'highpass',6000,.4,.12*g,0,.001);};
  const bass=(t,f,d)=>{const o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=f;const fl=ctx.createBiquadFilter();fl.type='lowpass';fl.Q.value=5;fl.frequency.setValueAtTime(1100,t);fl.frequency.exponentialRampToValueAtTime(120,t+d);const a=ctx.createGain();env(a,t,.2,.006,d);o.connect(fl);fl.connect(a);a.connect(bus);o.start(t);o.stop(t+d+.05);};
  const ROOTS=[55,43.65,65.41,49];  /* A F C G, one root per bar */
  TL.forEach((b,p)=>{const t0=p*BAR,root=ROOTS[p%4];
    if(p>0)hit(t0,b.scene===7?1.3:b.scene===6?1:b.show!=null?.5:.8);
    if(b.show!=null){
      kick(t0,.8);kick(t0+2*B,.6);                                                   /* half-time */
      for(let q=0;q<4;q++)noise(t0+q*B+B/2,.04,'highpass',8500,.7,.05,q%2?-.25:.25);
      [root*4,root*6,root*8].forEach((f,i)=>tone(t0,f,.03,BAR*.92,'sine',(i-1)*.35)); /* soft chord under the footage */
      bass(t0,root,.8);bass(t0+2*B,root,.8);
      noise(t0,.2,'bandpass',2200,1.2,.16,0,.002,400);                               /* colour-wipe swish in */
      noise(t0+BAR-.2,.19,'bandpass',500,1.5,.18,0,.15,6000);                        /* whip whoosh out */
      return;}
    const sc=b.scene;
    if(sc>=1&&sc<=5){for(let k=0;k<4;k++)kick(t0+k*B,k===0?1:.8);for(let k=0;k<8;k++){if(sc===1&&k%2===0)continue;bass(t0+k*B/2,k===7?root*2:root,.19);}}
    if(sc>=2&&sc<=5)for(let q=0;q<4;q++)noise(t0+q*B+B/2,.045,'highpass',8500,.7,.1,q%2?-.25:.25);
    if(sc===0){tone(t0+.02,880,.14,.4);for(let j=0;j<8;j++)tone(t0+.47+j*.035,880*Math.pow(2,j/7),.06,.2,'sine',(j%2?.4:-.4));
      tone(t0+1.0,1318.5,.08,.3);noise(t0+1.45,.42,'bandpass',300,2,.3,0,.4,7000);}
    if(sc===1){[B,2*B].forEach(x=>noise(t0+x,.08,'bandpass',2500,3,.25,0,.002,600));for(let j=0;j<11;j++)noise(t0+2*B+j*.028,.012,'highpass',4500,.8,.09,.2);}
    if(sc===2){noise(t0+2*B,.3,'bandpass',4000,1.5,.25,0,.002,500);for(let j=0;j<9;j++)tone(t0+3*B+j*.05,660*Math.pow(2,j/12),.05,.12,'triangle');}
    if(sc===3)U3.forEach((x,q)=>tone(t0+x,[523,659,784,880,1047,1319][q],.11,.22,'triangle',q%2?.3:-.3));
    if(sc===4)for(let q=0;q<4;q++)tone(t0+q*B,70,.35,.25,'sine',0,40);
    if(sc===5){const s=ctx.createBufferSource();s.buffer=nb;s.loop=true;const fl=ctx.createBiquadFilter();fl.type='bandpass';fl.Q.value=2.5;fl.frequency.setValueAtTime(300,t0);fl.frequency.exponentialRampToValueAtTime(9000,t0+BAR-.02);const a=ctx.createGain();a.gain.setValueAtTime(.0001,t0);a.gain.exponentialRampToValueAtTime(.32,t0+BAR-.03);a.gain.linearRampToValueAtTime(0,t0+BAR);s.connect(fl);fl.connect(a);a.connect(bus);s.start(t0);s.stop(t0+BAR+.02);
      for(let x=t0+2*B;x<t0+BAR;x+=B/4)noise(x,.03,'highpass',9000,.7,.07,.35);}
    if(sc===6)for(let q=0;q<8;q++){const x=t0+q*B/2;tone(x,220*Math.pow(2,q/8),.16,.16,'square',q%2?.35:-.35);kick(x,.7);noise(x,.06,'bandpass',2200+q*400,2,.25);}
    if(sc===7){[[B,987.8],[2*B,1318.5],[3*B,1760]].forEach(([x,f])=>tone(t0+x,f,.1,.4));[220,329.6,440,554.4].forEach((f,i)=>tone(t0,f,.05,1.8,'sine',(i-1.5)*.3));}
  });
  const buf=await ctx.startRendering(),L=buf.getChannelData(0),Rr=buf.getChannelData(1);let pk=0;for(let i=0;i<L.length;i++)pk=Math.max(pk,Math.abs(L[i]),Math.abs(Rr[i]));
  const gn=pk>0?.89/pk:1,n=L.length,ab=new ArrayBuffer(44+n*4),dv=new DataView(ab),ws=(o,str)=>{for(let i=0;i<str.length;i++)dv.setUint8(o+i,str.charCodeAt(i));};
  ws(0,'RIFF');dv.setUint32(4,36+n*4,true);ws(8,'WAVE');ws(12,'fmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,2,true);dv.setUint32(24,SR,true);dv.setUint32(28,SR*4,true);dv.setUint16(32,4,true);dv.setUint16(34,16,true);ws(36,'data');dv.setUint32(40,n*4,true);
  for(let i=0,o=44;i<n;i++,o+=4){dv.setInt16(o,Math.max(-1,Math.min(1,L[i]*gn))*32767,true);dv.setInt16(o+2,Math.max(-1,Math.min(1,Rr[i]*gn))*32767,true);}
  const u8=new Uint8Array(ab);let bin='';for(let i=0;i<u8.length;i+=32768)bin+=String.fromCharCode.apply(null,u8.subarray(i,i+32768));return btoa(bin);};
