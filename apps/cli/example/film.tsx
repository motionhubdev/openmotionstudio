import {Film, Scene, Layer, Line, Sound, useTime, interpolate} from '@motionhub/runtime';
import workspace from './media/workspace-tour.webp';
import edit from './media/crater-workshop.webp';
import render from './media/studio-loop.webp';
import inter from './media/Inter.woff2';

export const film = {width: 540, height: 960, fps: 24};

function Headline({text}: {text: string}) {
  const t = useTime();
  const y = interpolate(t, [0, 0.55], [24, 0], {clamp: true});
  return <div style={{font: '700 62px/1.05 StudioInter', letterSpacing: '-0.05em', color: '#fff8ef', transform: `translateY(${y}px)`}}>{text}</div>;
}

export default function Main() {
  const shots = [
    {id: 'compose', title: 'Start with a scene.', image: workspace, duration: 9},
    {id: 'refine', title: 'Pick a detail.', image: edit, duration: 9},
    {id: 'download', title: 'Make your film.', image: render, duration: 2},
  ];
  return <Film>
    <Layer id="background"><style>{`@font-face{font-family:StudioInter;src:url("${inter}")}`}</style><div style={{height:'100%', background:'#202320'}} /></Layer>
    {shots.map(shot => <Scene key={shot.id} id={shot.id} duration={shot.duration}>
      <Line id={shot.id + '-line'}>{shot.title}</Line>
      <Layer id="title" x={34} y={130} w={472} h={155}><Headline text={shot.title}/></Layer>
      <Layer id="screenshot" x={24} y={335} w={492} h={292}><img src={shot.image} style={{width:'100%',height:'100%',objectFit:'contain'}} /></Layer>
      {shot.id === 'download' && <Layer id="download-address" x={34} y={730} w={472} h={75}><span style={{font:'500 38px StudioInter',color:'#ffc59d'}}>openmotion.studio</span></Layer>}
      {shot.id === 'download' && <Sound src="media/chime.wav" volume={-12} />}
    </Scene>)}
  </Film>;
}
