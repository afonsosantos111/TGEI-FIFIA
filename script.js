const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
const teams={
  1:['Académico de Viseu','Alverca','Arouca','Benfica','Estrela da Amadora','Casa Pia','Estoril Praia','Famalicão','FC Porto','Gil Vicente','Moreirense','Nacional','Rio Ave','Santa Clara','SC Braga','Sporting','Vitória SC'],
  2:['Académica','AFS','Amarante','Benfica B','Chaves','Farense','Feirense','Felgueiras 1932','Leixões','Lusitânia de Lourosa','Penafiel','Portimonense','Porto B','Tondela','Torreense','União de Leiria','Vizela','Sporting B'],
  3:['Atlético CP','Belenenses','Caldas SC','CD Mafra','Fafe','Leça FC','Lusitano GC','Marco 09','Oliveirense','Paços de Ferreira','SC Covilhã','SC São João de Ver','SC Vianense','Trofense','União de Santarém','USC Paredes','Varzim','Vitória SC B','Louletano']
};
const W=1100,H=650;
// Desenha polígonos usados no campo, baliza e jogadores.
function polygon(points, fill, stroke=null, lineWidth=1){
  if(!Array.isArray(points)||points.length<3)return;
  ctx.beginPath();
  ctx.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
  ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill();}
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();}
}

// Canvas em resolução lógica consistente com a proporção real do campo.
// Evita redimensionamento desigual, que pode tornar a imagem suave/desfocada.
canvas.width=W;canvas.height=H;ctx.setTransform(1,0,0,1,0,0);
function difficultySettings(){const v=document.getElementById('difficulty')?.value||'normal';return v==='easy'?{speed:.72,press:0.55,steal:.65,pass:1.65}:v==='hard'?{speed:1.35,press:1.45,steal:1.5,pass:.72}:{speed:1,press:1,steal:1,pass:1};}
let mode='training',targetX=550,targetY=220,mouseFieldX=550,mouseFieldY=325,mouseInside=false,busy=false,goals=0,saves=0,shots=0,oppGoals=0,attempt=1,ballAnim=null,keeperDive={x:0,y:0},curve=0,playerTeam='Benfica',opponent='FC Porto',shotPower=75,aimLabel='Centro da baliza';
let practiceX=550,practiceY=568,practiceMove={x:0,y:0};
let fullMatch=false,matchRunning=false,matchOver=false,half=1,halfSeconds=120,elapsed=0,lastFrame=0,matchLastTime=0,blackoutTimer=null;
const keys={};let player={x:330,y:360,vx:0,vy:0,dir:0,stamina:100,hasBall:true};let ball={x:330,y:360,vx:0,vy:0,owner:'player',trail:[]};let lastTouchTeam='home';
let teammates=[],opponents=[],matchScore=[0,0],matchMessage='',matchShotCooldown=0,aiPassTimer=0;
let activeJersey=7;
const kitColors={'Benfica':['#e31b32','#fff'],'FC Porto':['#1768c4','#fff'],'Sporting':['#168447','#f3f3e8'],'SC Braga':['#d51f32','#fff'],'Vitória SC':['#171717','#fff'],'Estoril Praia':['#f0c928','#17241a'],'Casa Pia':['#151515','#fff'],'Famalicão':['#1768c4','#fff'],'Arouca':['#f1d13b','#173b26'],'Rio Ave':['#168b70','#fff'],'Gil Vicente':['#cf2431','#fff'],'Moreirense':['#187a45','#fff'],'Nacional':['#191919','#fff'],'Santa Clara':['#c9232d','#fff'],'Alverca':['#cf1d35','#fff'],'Estrela da Amadora':['#d82330','#fff'],'Académico de Viseu':['#d51f32','#fff'],'Chaves':['#d51f32','#1768c4'],'Farense':['#fff','#111'],'Tondela':['#e3d52d','#168447'],'Penafiel':['#d51f32','#fff'],'Leixões':['#d82330','#111'],'Belenenses':['#1768c4','#fff'],'Paços de Ferreira':['#e8d62e','#1768c4']};
const clubPlayers={ 'Benfica':['Trubin','Otamendi','António Silva','Aursnes','Kokçu','Rafa','Pavlidis','Di María'], 'FC Porto':['Diogo Costa','Pepe','Otávio','Varela','Pepê','Galeno','Evanilson','Taremi'], 'Sporting':['Adán','Coates','Gonçalo Inácio','Hjulmand','Morita','Pedro Gonçalves','Trincão','Gyökeres'], 'SC Braga':['Matheus','Niakaté','João Moutinho','Ricardo Horta','Bruma','Banza'], 'default':['Guarda-redes','Capitão','Defesa-central','Lateral-direito','Lateral-esquerdo','Médio defensivo','Médio-centro','Extremo-direito','Extremo-esquerdo','Segundo avançado','Ponta-de-lança']};
let scorers=[], pendingBet=null;
let gameProfile=JSON.parse(localStorage.getItem('penaltisProfile')||'null')||{coins:1000,unlocks:[],achievements:[],matches:0,wins:0,goals:0};
const formations={
 '4-3-3':[[150,170],[260,130],[260,245],[260,415],[150,490],[390,170],[390,325],[390,480],[500,150],[500,325],[500,500]],
 '4-2-2-2':[[150,170],[260,130],[260,245],[260,415],[150,490],[370,230],[370,420],[440,190],[440,460],[500,260],[500,390]],
 '4-4-2':[[150,170],[260,130],[260,245],[260,415],[150,490],[370,130],[370,245],[370,415],[370,530],[500,245],[500,415]],
 '3-5-2':[[180,180],[260,130],[260,325],[260,500],[370,120],[370,230],[370,330],[370,430],[370,540],[500,245],[500,415]]
};
function formationPositions(){return formations[$('formation')?.value||'4-3-3']||formations['4-3-3'];}
function switchControlToMate(mate){if(!mate)return;const old={...player,number:activeJersey,homeX:player.homeX??315,homeY:player.homeY??330,team:'home'};teammates=teammates.filter(t=>t!==mate);teammates.push(old);player={...mate,stamina:player.stamina,hasBall:true};activeJersey=mate.number;ball.owner='player';ball.mate=null;player.hasBall=true;$('message').textContent='A controlar o camisa '+activeJersey+'!';}
function abbr(s){return s.split(/[\s-]+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()}
function fillTeams(){const d=$('division').value;const list=teams[d]||teams[1];['team','homeTeam'].forEach(id=>{const s=$(id);if(!s)return;const old=s.value;s.innerHTML='';list.forEach(t=>{let o=document.createElement('option');o.value=t;o.textContent=t;s.appendChild(o)});if(old&&list.includes(old))s.value=old});if($('homeTeam').value===$('team').value){$('team').selectedIndex=( $('homeTeam').selectedIndex+1)%$('team').options.length}opponent=$('team').value;playerTeam=$('homeTeam').value;updateTeamsUI();fillBetTeams()}
function updateTeamsUI(){if($('myTeam'))$('myTeam').textContent=fullMatch?playerTeam:(mode==='match'?playerTeam:'PENÁLTIS FC');if($('myCrest'))$('myCrest').textContent=abbr(playerTeam);if($('oppName'))$('oppName').textContent=mode==='training'?'GUARDA-REDES':mode==='freekick'?'BARREIRA':opponent;if($('oppCrest'))$('oppCrest').textContent=mode==='training'?'GK':mode==='freekick'?'FC':abbr(opponent);if($('oppCaption'))$('oppCaption').textContent=mode==='fullmatch'||mode==='match'?'ADVERSÁRIO':mode==='freekick'?'BARREIRA':'TREINO'}
$('division').addEventListener('change',fillTeams);$('team').addEventListener('change',()=>{opponent=$('team').value;updateTeamsUI();if(fullMatch&&!matchRunning)draw()});$('homeTeam').addEventListener('change',()=>{playerTeam=$('homeTeam').value;if(playerTeam===$('team').value)$('team').selectedIndex=($('homeTeam').selectedIndex+1)%$('team').options.length;opponent=$('team').value;updateTeamsUI();if(fullMatch&&!matchRunning)draw()});
function saveProfile(){localStorage.setItem('penaltisProfile',JSON.stringify(gameProfile));renderBetPanel()}
function fillBetTeams(){const a=$('betHome'),b=$('betAway');if(!a||!b)return;const all=Object.values(teams).flat().filter((v,i,arr)=>arr.indexOf(v)===i);for(const sel of [a,b]){const old=sel.value;sel.innerHTML=all.map(t=>`<option>${t}</option>`).join('');if(all.includes(old))sel.value=old;}if(a.value===b.value&&b.options.length>1)b.selectedIndex=1;renderBetPanel()}
function renderBetPanel(){if(!$('walletBalance'))return;$('walletBalance').textContent=gameProfile.coins.toLocaleString('pt-PT');const shop=[['4-2-3-1','Tática 4-2-3-1',350],['gegenpress','Tática Gegenpressing',500],['boots_gold','Chuteiras Douradas',250],['boots_neon','Chuteiras Neon',400],['kit_retro','Equipamento Retro',600]];$('unlockShop').innerHTML=shop.map(([id,name,cost])=>`<div class="unlock-item"><span>${name} ${gameProfile.unlocks.includes(id)?'✓':''}</span><button data-buy="${id}" data-cost="${cost}" ${gameProfile.unlocks.includes(id)||gameProfile.coins<cost?'disabled':''}>${gameProfile.unlocks.includes(id)?'DESBLOQUEADO':cost+' moedas'}</button></div>`).join('');$('achievementList').innerHTML=[['first_match','Primeira partida',gameProfile.matches>=1],['first_win','Primeira vitória',gameProfile.wins>=1],['hat_trick','Hat-trick (3 golos)',gameProfile.goals>=3],['rich','Carteira de 2000 moedas',gameProfile.coins>=2000]].map(([id,n,done])=>`<div class="achievement ${done?'done':''}">${done?'🏆':'🔒'} ${n}</div>`).join('');document.querySelectorAll('[data-buy]').forEach(btn=>btn.onclick=()=>{const id=btn.dataset.buy,cost=+btn.dataset.cost;if(gameProfile.coins>=cost&&!gameProfile.unlocks.includes(id)){gameProfile.coins-=cost;gameProfile.unlocks.push(id);saveProfile();$('betLog').textContent='Desbloqueaste: '+btn.parentElement.querySelector('span').textContent.replace(' ✓','')+'!'}})}
function placeVirtualBet(){const home=$('betHome').value,away=$('betAway').value,stake=Math.floor(+$('betStake').value),market=$('betMarket').value;if(home===away){$('betLog').textContent='Escolhe duas equipas diferentes.';return}if(!Number.isFinite(stake)||stake<10||stake>gameProfile.coins){$('betLog').textContent='A aposta mínima é 10 moedas e não podes apostar mais do que tens.';return}pendingBet={home,away,stake,market};gameProfile.coins-=stake;saveProfile();$('betLog').textContent=`Aposta registada: ${stake} moedas em ${market==='home'?home:market==='away'?away:'empate'}. Joga uma partida normal entre estas equipas para resolver a aposta.`; $('division').value='1';fillTeams();for(const id of ['homeTeam','team']){const sel=$(id);if(!sel.querySelector(`option[value="${id==='homeTeam'?home:away}"]`)){const opt=document.createElement('option');opt.value=id==='homeTeam'?home:away;opt.textContent=opt.value;sel.appendChild(opt)}}$('homeTeam').value=home;if(!$('team').querySelector(`option[value="${away}"]`)){const o=document.createElement('option');o.value=away;o.textContent=away;$('team').appendChild(o)}$('team').value=away;playerTeam=home;opponent=away;updateTeamsUI();setMode('fullmatch')}
function resolveVirtualBet(hs,as){if(!pendingBet)return;const winner=hs>as?'home':hs<as?'away':'draw';if(winner===pendingBet.market){const payout=pendingBet.stake*(pendingBet.market==='draw'?3:2);gameProfile.coins+=payout;$('betLog').textContent=`GANHASTE! ${pendingBet.stake} moedas apostadas, prémio total ${payout} moedas.`}else{$('betLog').textContent=`Aposta perdida. Resultado ${pendingBet.home} ${hs}-${as} ${pendingBet.away}.`; }pendingBet=null;saveProfile()}
function kitFor(name,isAway=false){const base=kitColors[name]||(['#267a4b','#f2f0e8']);return isAway?[base[1],base[0]]:base}
function addScorer(teamName,isHome){const list=clubPlayers[teamName]||clubPlayers.default;const name=list[Math.floor(Math.random()*list.length)];scorers.push({team:teamName,name});$('scorersList').textContent=scorers.map(g=>`${g.name} (${g.team})`).join(' · ')||'Ainda não houve golos.';gameProfile.goals++;if(gameProfile.goals>=3&&!gameProfile.achievements.includes('hat_trick'))gameProfile.achievements.push('hat_trick');saveProfile();return name}
$('placeBet')?.addEventListener('click',placeVirtualBet);
function setMode(m){
 mode=m;fullMatch=m==='fullmatch';document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===m));
 $('teamSetup').classList.toggle('visible',m==='match'||fullMatch);$('betPanel').classList.toggle('visible',m==='bet');$('scorersPanel').style.display=fullMatch||m==='bet'?'flex':'none';
 $('roundTag').textContent=m==='training'?'TREINO':m==='freekick'?'LIVRE DIRETO':m==='match'?'PENÁLTIS':m==='bet'?'BET':'JOGO COMPLETO';
 $('game').parentElement.classList.toggle('full-match',fullMatch);
 $('modeHud').textContent=fullMatch?'JOGO COMPLETO':m==='training'?'MODO TREINO':m==='freekick'?'LIVRE DIRETO':m==='bet'?'BET PENÁLTIS':'PENÁLTIS VS EQUIPAS';
 $('controlTitle').textContent='Controlos predefinidos';
 $('aimLabel').textContent=fullMatch?'POSIÇÃO / ESTADO':'POSIÇÃO / ALVO';
 $('aimReadout').textContent=fullMatch?'Pronto para jogar':'Centro da baliza';
 $('shoot').textContent=fullMatch?'⚽ REMATAR':'⚽ REMATAR';
 $('pass').style.display='block';$('tackle').style.display='block';
 $('power').style.display=fullMatch?'none':'block';$('power').previousElementSibling.style.display=fullMatch?'none':'flex';$('power').nextElementSibling.style.display='block';$('chargeMeter').style.display=fullMatch?'block':'none';
 $('helpPanel').innerHTML='<b>CONTROLos PREDEFINIDOS</b><p><span>W A S D</span> mover / ajustar posição.</p><p><span>E</span> passar a bola · <span>Q</span> roubar / fintar o guarda-redes.</p><p><span>BOTÃO ESQUERDO (BTN1)</span> rematar. Move o rato para apontar; nos livres, também define a curva.</p>';
 $('kickHint').textContent=fullMatch?'WASD = MOVER  •  SHIFT = CORRER  •  BTN1 = REMATAR  •  E = PASSE  •  Q = ROUBAR':'WASD = POSIÇÃO  •  BTN1 = REMATAR  •  E = PASSE  •  Q = ROUBAR';
 $('message').textContent=fullMatch?'Escolhe as equipas e carrega em JOGAR PARTIDA.':m==='freekick'?'WASD posiciona-te; aponta por cima ou ao lado da barreira.':m==='match'?'Escolhe um adversário e começa os penáltis.':'WASD ajusta a posição; move o rato para apontar.';
 $('crosshair').style.display=fullMatch?'none':'block';updateTeamsUI();resetStats();if(fullMatch)initMatch(false);draw();
}
document.querySelectorAll('.mode').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
$('startMatch').addEventListener('click',()=>{playerTeam=$('homeTeam').value;opponent=$('team').value;if(playerTeam===opponent){$('message').textContent='Escolhe duas equipas diferentes.';return}updateTeamsUI();if(fullMatch){startFullMatch();return}mode='match';$('modeHud').textContent='PENÁLTIS VS '+opponent.toUpperCase();$('message').textContent='Penáltis iniciados! Marca mais golos que '+opponent;resetStats();draw()});
function resetStats(){goals=0;saves=0;shots=0;oppGoals=0;attempt=1;busy=false;ballAnim=null;$('goals').textContent='0';$('saves').textContent='0';$('accuracy').textContent='—';$('myScore').textContent='0';$('oppScore').textContent='0';$('shotCounter').textContent='REMATE 1';$('shoot').disabled=false}
$('reset').addEventListener('click',()=>{if(fullMatch){startFullMatch();return}resetStats();$('message').textContent='Partida reiniciada. Move o rato para apontar.';draw()});
$('power').addEventListener('input',()=>{$('powerValue').textContent=$('power').value+'%';shotPower=+$('power').value});
function pointFromEvent(e){const r=canvas.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*W;const y=(e.clientY-r.top)/r.height*H;targetX=Math.max(330,Math.min(770,x));targetY=Math.max(135,Math.min(340,y));mouseInside=true;const cross=$('crosshair');cross.style.left=(x/W*100)+'%';cross.style.top=(y/H*100)+'%';cross.style.opacity=(x>280&&x<820&&y>120&&y<380)?'.95':'.25';const horizontal=x<460?'lado esquerdo':x>640?'lado direito':'centro';const vertical=y<215?'canto superior':y>290?'rasteiro':'altura média';aimLabel=vertical+' · '+horizontal;$('aimReadout').textContent=aimLabel;curve=((x-W/2)/(W/2));if(mode==='freekick')$('message').textContent='Curva: '+(curve<-.15?'para a esquerda':curve>.15?'para a direita':'quase sem curva');if(fullMatch&&matchRunning){matchMessage='Direção: '+(x<W/2?'esquerda':'direita');$('aimReadout').textContent=matchMessage;return}draw()}
canvas.addEventListener('pointermove',pointFromEvent);
canvas.addEventListener('pointerleave',()=>{mouseInside=false;$('crosshair').style.opacity='.3'});
canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();mouseFieldX=(e.clientX-r.left)/r.width*W;mouseFieldY=(e.clientY-r.top)/r.height*H;});
canvas.addEventListener('pointerdown',e=>{if(fullMatch){if(e.button===0){e.preventDefault();beginShotCharge()}return}if(e.button===0)shoot()});
// No modo de partida, o botão esquerdo do rato em qualquer ponto da metade direita do ecrã remata.
// O clique esquerdo inicia a carga; o remate só acontece ao largar o botão. A direção vem do movimento do jogador.
$('shoot').addEventListener('click',()=>{if(!fullMatch)shoot()});
$('pass').addEventListener('click',passBall);
function shoot(){
 if(fullMatch){kickBall();return}
 if(busy)return;busy=true;$('shoot').disabled=true;shots++;shotPower=+$('power').value;
 const tx=targetX||550,ty=targetY||240;const wallBlocked=mode==='freekick'&&ty>190&&ty<260&&Math.abs(tx-550)<145&&Math.random()<.24;const keeperGuess=Math.random()<(mode==='match'?.32:.27)+(shotPower>94?.1:0);let kx=keeperGuess?Math.sign(tx-550||1)*Math.min(180,Math.abs(tx-550)*.7):([-145,0,145][Math.floor(Math.random()*3)]);let ky=keeperGuess?(ty<220?-35:40):0;const goal=!wallBlocked&&!keeperGuess&&!(shotPower>97&&Math.random()<.18);const start={x:practiceX,y:practiceY,r:25},end={x:tx,y:ty,r:goal?7:11};ballAnim={start,end,t:0,duration:Math.max(400,920-shotPower*4),goal};keeperDive={x:0,y:0,tx:kx,ty:ky};$('message').textContent=mode==='freekick'?'A bola está a curvar…':'Remate em andamento…';const startTime=performance.now();
 function frame(now){const t=Math.min(1,(now-startTime)/ballAnim.duration),ease=t*t*(3-2*t);ballAnim.t=t;ballAnim.x=start.x+(end.x-start.x)*ease;ballAnim.y=start.y+(end.y-start.y)*ease;ballAnim.r=start.r+(end.r-start.r)*ease;if(mode==='freekick')ballAnim.x+=Math.sin(t*Math.PI)*curve*90;keeperDive.x=kx*Math.min(1,t*1.7);keeperDive.y=ky*Math.min(1,t*1.7);draw();if(t<1)requestAnimationFrame(frame);else finishShot(goal,wallBlocked)}requestAnimationFrame(frame)
}
function finishShot(goal,wallBlocked){if(goal){goals++;$('message').textContent=mode==='freekick'?'GOLO! Livre direto perfeito!':'GOLO! Remate imparável!'}else{saves++;$('message').textContent=wallBlocked?'A barreira bloqueou o remate!':'DEFENDEU! Tenta outro canto.'}if(mode==='match'){if(Math.random()<.34){oppGoals++;$('message').textContent+=' '+opponent+' responde com um golo!'}$('myScore').textContent=goals;$('oppScore').textContent=oppGoals}$('goals').textContent=goals;$('saves').textContent=saves;$('accuracy').textContent=Math.round(goals/shots*100)+'%';$('shotCounter').textContent='REMATE '+(shots+1);busy=false;$('shoot').disabled=false;ballAnim=null;keeperDive={x:0,y:0};draw()}
function initMatch(start){matchRunning=false;matchOver=false;half=1;halfSeconds=120;elapsed=0;lastFrame=0;matchLastTime=0;matchScore=[0,0];matchMessage='Pronto para o pontapé de saída';activeJersey=7;const slots=formationPositions();player={x:slots[6][0],y:slots[6][1],homeX:slots[6][0],homeY:slots[6][1],vx:0,vy:0,dir:0,stamina:100,hasBall:false,number:7,team:'home',speed:40};ball={x:550,y:330,vx:0,vy:0,owner:null,trail:[]};lastTouchTeam=null;teammates=[];opponents=[];let n=1;for(let i=0;i<11;i++){if(i===6)continue;const [x,y]=slots[i];teammates.push({x,y,homeX:x,homeY:y,dir:0,number:n===7?12:n,speed:36+Math.random()*8,team:'home'});n++;}for(let i=0;i<11;i++){const [fx,fy]=slots[i];const x=1100-fx,y=fy;opponents.push({x,y,homeX:x,homeY:y,dir:Math.PI,number:i+1,speed:(32+Math.random()*8)*difficultySettings().speed,team:'away',keeper:i===0});}updateScoreUI();if(start)draw()}
function enterMatchFullscreen(){
 document.body.classList.add('match-fullscreen');
 if(document.documentElement.requestFullscreen){document.documentElement.requestFullscreen().catch(()=>{});}
 let exitBtn=$('exitFullscreenMatch');
 if(!exitBtn){
   exitBtn=document.createElement('button');
   exitBtn.id='exitFullscreenMatch';
   exitBtn.className='exit-fullscreen-match';
   exitBtn.textContent='✕  SAIR DO JOGO';
   exitBtn.addEventListener('click',()=>{document.body.classList.remove('match-fullscreen');if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(()=>{});exitBtn.remove();matchRunning=false;matchOver=true;setMode('fullmatch');$('message').textContent='Voltaste ao menu. Escolhe as equipas e carrega em JOGAR PARTIDA.';});
   document.body.appendChild(exitBtn);
 }
}
function startFullMatch(){scorers=[];$('scorersList').textContent='Ainda não houve golos.';if(playerTeam===opponent){$('message').textContent='Escolhe duas equipas diferentes.';return}enterMatchFullscreen();initMatch(true);$('blackout').classList.add('active');$('blackout').querySelector('strong').textContent='A ENTRAR EM CAMPO';$('blackout').querySelector('small').textContent=playerTeam+' vs '+opponent+' · 1.ª parte · 02:00';$('message').textContent='A preparar o estádio...';setTimeout(()=>{$('blackout').classList.remove('active');matchRunning=true;matchLastTime=performance.now();lastFrame=matchLastTime;$('message').textContent='Apito inicial! Controlas automaticamente o colega que recebe a bola.';$('modeHud').textContent=playerTeam.toUpperCase()+' VS '+opponent.toUpperCase();$('kickHint').textContent='WASD / SETAS = MOVER  •  SHIFT = CORRER  •  CLIQUE ESQUERDO = REMATAR  •  E = PASSE  •  Q = DESARME  •  CONTROLO AUTOMÁTICO DO RECETOR';requestAnimationFrame(matchLoop)},900)}
function updateScoreUI(){ $('myScore').textContent=matchScore[0];$('oppScore').textContent=matchScore[1];$('myTeam').textContent=playerTeam;$('oppName').textContent=opponent;$('myCrest').textContent=abbr(playerTeam);$('oppCrest').textContent=abbr(opponent);$('shotCounter').textContent='PARTE '+half+' · '+formatTime(halfSeconds)}
function formatTime(sec){sec=Math.max(0,Math.ceil(sec));return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')}
function matchLoop(now){if(!matchRunning||matchOver)return;const dt=Math.min(.04,(now-lastFrame)/1000||.016);lastFrame=now;halfSeconds-=dt;elapsed+=dt;matchShotCooldown=Math.max(0,matchShotCooldown-dt);updatePlayer(dt);updateBall(dt);updateAI(dt);if(halfSeconds<=0){halfSeconds=0;halfEnd()}updateScoreUI();draw();if(matchRunning)requestAnimationFrame(matchLoop)}
function updatePlayer(dt){let dx=0,dy=0;if(keys.KeyW||keys.ArrowUp)dy-=1;if(keys.KeyS||keys.ArrowDown)dy+=1;if(keys.KeyA||keys.ArrowLeft)dx-=1;if(keys.KeyD||keys.ArrowRight)dx+=1;let len=Math.hypot(dx,dy)||1;dx/=len;dy/=len;let sprint=(keys.ShiftLeft||keys.ShiftRight)&&player.stamina>0;let speed=sprint?225:155;if(sprint)player.stamina=Math.max(0,player.stamina-23*dt);else player.stamina=Math.min(100,player.stamina+12*dt);player.vx=dx*speed;player.vy=dy*speed;player.x=Math.max(55,Math.min(1045,player.x+player.vx*dt));player.y=Math.max(105,Math.min(545,player.y+player.vy*dt));if(dx||dy)player.dir=Math.atan2(dy,dx);if(ball.owner==='player'){ball.x=player.x+Math.cos(player.dir)*23;ball.y=player.y+Math.sin(player.dir)*23}else if(ball.owner===null&&Math.hypot(ball.x-player.x,ball.y-player.y)<25){ball.owner='player';player.hasBall=true;lastTouchTeam='home';matchMessage='Recuperaste a bola!'}$('aimReadout').textContent=(sprint?'Sprint · ':'Com bola · ')+Math.round(player.stamina)+'% energia'}
function kickBall(powerOverride){
 if(!fullMatch||!matchRunning)return false;
 if(matchShotCooldown>0){$('message').textContent='Espera um instante antes de rematar novamente.';return false}
 const distanceToBall=Math.hypot(ball.x-player.x,ball.y-player.y);
 if(ball.owner!=='player'&&distanceToBall>62){$('message').textContent='Aproxima-te da bola e tenta novamente.';return false}
 // Se a bola está ao alcance, assegura a posse antes do remate.
 lastTouchTeam='home';ball.owner=null;ball.opponent=null;ball.targetMate=null;player.hasBall=false;
 // Remate permitido de qualquer zona, incluindo o meio-campo.
 // Se o rato estiver a apontar para o campo, usa esse ponto como alvo;
 // caso contrário, aponta para o centro da baliza adversária.
 const goalX=half===1?1100:0, goalY=330;
 let aimX=goalX, aimY=goalY;
 if(mouseInside){aimX=mouseFieldX;aimY=mouseFieldY;}
 // Evita remates quase verticais ou para trás quando o cursor está junto do jogador:
 // nesses casos, usa a baliza adversária como alvo.
 if(Math.hypot(aimX-player.x,aimY-player.y)<90 || (half===1&&aimX<player.x) || (half===2&&aimX>player.x)){
   aimX=goalX;aimY=goalY;
 }
 const angle=Math.atan2(aimY-player.y,aimX-player.x);
 player.dir=angle;
 const power=Math.max(25,Math.min(100,Number(powerOverride)||shotPower||60));
 // A potência alta conserva velocidade suficiente para remates de longa distância.
 const speed=380+(power/100)*620;
 ball.x=player.x+Math.cos(angle)*27;ball.y=player.y+Math.sin(angle)*27;
 ball.vx=Math.cos(angle)*speed;ball.vy=Math.sin(angle)*speed;
 matchShotCooldown=.55;matchMessage='Remate!';$('message').textContent='REMATE! Força '+Math.round(power)+'%.';
 return true;
}
function passBall(){
 if(!fullMatch||!matchRunning)return;
 if(ball.owner!=='player'){
   if(Math.hypot(ball.x-player.x,ball.y-player.y)<48){ball.owner='player';ball.opponent=null;player.hasBall=true}
   else{$('message').textContent='Tens de recuperar a bola primeiro.';return}
 }
 if(!teammates.length){$('message').textContent='Não há colegas disponíveis para receber o passe.';return}
 // O rato escolhe o colega mais próximo do ponto apontado; sem apontar, usa o colega mais próximo à frente.
 let mate;
 if(mouseInside){mate=teammates.reduce((best,t)=>Math.hypot(t.x-mouseFieldX,t.y-mouseFieldY)<Math.hypot(best.x-mouseFieldX,best.y-mouseFieldY)?t:best)}
 else {const forward=teammates.filter(t=>(t.x-player.x)*(player.team==='away'?-1:1)>-30);mate=(forward.length?forward:teammates).reduce((best,t)=>Math.hypot(t.x-player.x,t.y-player.y)<Math.hypot(best.x-player.x,best.y-player.y)?t:best)}
 const dx=mate.x-player.x,dy=mate.y-player.y,d=Math.hypot(dx,dy)||1,a=Math.atan2(dy,dx);
 lastTouchTeam='home';ball.owner=null;ball.opponent=null;player.hasBall=false;ball.targetMate=mate;ball.x=player.x+Math.cos(a)*22;ball.y=player.y+Math.sin(a)*22;
 const speed=Math.min(590,Math.max(300,d*1.65));ball.vx=dx/d*speed;ball.vy=dy/d*speed;
 // Muda logo o jogador controlado para o destinatário do passe. A bola continua em viagem até ele.
 switchControlToMate(mate);ball.owner=null;player.hasBall=false;ball.targetMate=player;
 matchMessage='Passe para o camisa '+activeJersey;$('message').textContent='Passe feito! Agora controlas o camisa '+activeJersey+'.';
}
function throwIn(){
 const sideline=ball.y<330?80:580;
 const awarded=lastTouchTeam==='home'?'away':'home';
 ball.x=Math.max(42,Math.min(1058,ball.x));ball.y=sideline===80?84:576;ball.vx=ball.vy=0;ball.targetMate=null;ball.owner=null;ball.opponent=null;player.hasBall=false;for(const t of teammates)t.hasBall=false;
 if(awarded==='home'){const taker=[player,...teammates].reduce((best,p)=>!best||Math.hypot(p.x-ball.x,p.y-ball.y)<Math.hypot(best.x-ball.x,best.y-ball.y)?p:best,null);if(taker===player){ball.owner='player';player.hasBall=true;ball.x=player.x;ball.y=player.y;}else{switchControlToMate(taker);ball.owner='player';player.hasBall=true;ball.x=player.x;ball.y=player.y;}}else{const taker=opponents.reduce((best,p)=>!best||Math.hypot(p.x-ball.x,p.y-ball.y)<Math.hypot(best.x-ball.x,best.y-ball.y)?p:best,null);if(taker){ball.owner='opponent';ball.opponent=taker;ball.x=taker.x-13;ball.y=taker.y;}}lastTouchTeam=awarded;$('message').textContent='Bola fora pela linha lateral. Lançamento para '+(awarded==='home'?playerTeam:opponent)+'.';matchMessage='Lançamento lateral';}
function updateBall(dt){if(ball.owner!==null)return;if(ball.targetMate){const receiver=ball.targetMate;const dx=receiver.x-ball.x,dy=receiver.y-ball.y,d=Math.hypot(dx,dy);if(d<34){ball.targetMate=null;ball.x=receiver.x;ball.y=receiver.y;ball.vx=ball.vy=0;if(receiver===player){ball.owner='player';player.hasBall=true;lastTouchTeam='home';$('message').textContent='Passe recebido!'}else{switchControlToMate(receiver)}return}const speed=Math.max(300,Math.min(620,d*4.2));ball.vx=dx/(d||1)*speed;ball.vy=dy/(d||1)*speed;}ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;ball.vx*=Math.pow(.992,dt*60);ball.vy*=Math.pow(.992,dt*60);if(ball.targetMate&&Math.hypot(ball.x-ball.targetMate.x,ball.y-ball.targetMate.y)<34){const receiver=ball.targetMate;ball.targetMate=null;ball.x=receiver.x;ball.y=receiver.y;ball.vx=ball.vy=0;if(receiver===player){ball.owner='player';player.hasBall=true;lastTouchTeam='home';$('message').textContent='Passe recebido!'}else{switchControlToMate(receiver)}return}if(ball.y<80||ball.y>580){throwIn();return}if(ball.x<26||ball.x>1074){if(ball.y>250&&ball.y<410){if(ball.x<26){matchScore[1]++;const scorer=addScorer(opponent,false);$('message').textContent='GOLO DO '+opponent.toUpperCase()+'! Marcou '+scorer+'.'}else{matchScore[0]++;const scorer=addScorer(playerTeam,true);$('message').textContent='GOLOOOO! '+playerTeam.toUpperCase()+'! Marcou '+scorer+'.'}kickoffAfterGoal(ball.x<26?'away':'home')}else{ball.vx*=-.7;ball.x=Math.max(26,Math.min(1074,ball.x))}}if(Math.hypot(ball.x-player.x,ball.y-player.y)<19&&ball.owner===null&&Math.hypot(ball.vx,ball.vy)<300){ball.owner='player';player.hasBall=true;lastTouchTeam='home'}for(const t of teammates){if(Math.hypot(ball.x-t.x,ball.y-t.y)<22&&ball.owner===null&&Math.hypot(ball.vx,ball.vy)<260){switchControlToMate(t);break;}}for(const o of opponents){if(Math.hypot(ball.x-o.x,ball.y-o.y)<17&&ball.owner===null&&Math.hypot(ball.vx,ball.vy)<260){ball.owner='opponent';ball.opponent=o;lastTouchTeam='away';}}}
function kickoffAfterGoal(side){ball.vx=ball.vy=0;ball.owner=null;ball.opponent=null;ball.targetMate=null;player.hasBall=false;for(const t of teammates)t.hasBall=false;player.x=side==='home'?470:630;player.y=330;player.dir=side==='home'?0:Math.PI;ball.x=550;ball.y=330;matchShotCooldown=1.1;matchMessage='Pontapé de saída: a bola fica no centro até um jogador a disputar.';}
function updateAI(dt){
 const homePlayers=[player,...teammates];
 const moveToward=(actor,tx,ty,dt,speedScale=1)=>{const dx=tx-actor.x,dy=ty-actor.y,d=Math.hypot(dx,dy)||1;const step=Math.min(d,dt*(actor.speed||38)*speedScale);actor.x+=dx/d*step;actor.y+=dy/d*step;actor.x=Math.max(45,Math.min(1055,actor.x));actor.y=Math.max(90,Math.min(570,actor.y));};
 const nearest=(actor,list)=>list.reduce((best,p)=>!best||Math.hypot(p.x-actor.x,p.y-actor.y)<Math.hypot(best.x-actor.x,best.y-actor.y)?p:best,null);
 const ownPossession=ball.owner==='player'||(ball.owner===null&&ball.targetMate&&homePlayers.includes(ball.targetMate));
 const awayPossession=ball.owner==='opponent';
 const looseBall=ball.owner===null&&!ball.targetMate;
 const distBall=p=>Math.hypot(p.x-ball.x,p.y-ball.y);
 // Apenas os jogadores mais próximos pressionam a bola; os restantes mantêm a estrutura.
 if(looseBall){
  const h=homePlayers.slice().sort((a,b)=>distBall(a)-distBall(b))[0];
  const a=opponents.filter(o=>!o.keeper).sort((x,y)=>distBall(x)-distBall(y))[0];
  if(h&&distBall(h)>18)moveToward(h,ball.x,ball.y,dt,1.2);
  if(a&&distBall(a)>18)moveToward(a,ball.x,ball.y,dt,1.22);
 }
 // Equipa do utilizador: apoia o ataque e recua em bloco quando perde a bola.
 for(let i=0;i<teammates.length;i++){
  const t=teammates[i];let tx=t.homeX,ty=t.homeY;
  if(awayPossession){
   const mark=homePlayers[(i+1)%homePlayers.length];
   tx=mark.x+ (mark.x<550?22:-22);ty=mark.y+(i%2?22:-22);
   if(i<2&&distBall(t)<220){tx=ball.x+(t.x<ball.x?-16:16);ty=ball.y+(i%2?15:-15);}
   // A linha defensiva acompanha a bola sem abandonar totalmente as posições.
   tx=tx*.58+t.homeX*.42;ty=ty*.58+t.homeY*.42;
  }else if(ownPossession){
   tx=t.homeX+(ball.x-550)*.13;ty=t.homeY+(ball.y-325)*.10;
   if(Math.hypot(t.x-ball.x,t.y-ball.y)<65){tx=t.homeX;ty=t.homeY;}
  }else{
   tx=t.homeX+(ball.x-550)*.09;ty=t.homeY+(ball.y-325)*.08;
   if(i<2&&distBall(t)<180){tx=ball.x+(t.x<ball.x?-14:14);ty=ball.y+(i?12:-12);}
  }
  moveToward(t,tx,ty,dt,1.05);
 }
 // Adversários: marcação distribuída, pressão coordenada, passes e guarda-redes na baliza.
 const fieldOpp=opponents.filter(o=>!o.keeper);
 for(let i=0;i<opponents.length;i++){
  const o=opponents[i];
  if(o.keeper){
   // Guarda-redes protege a baliza direita, acompanha a bola lateralmente e sai só em bolas próximas.
   const gx=1018, gy=Math.max(278,Math.min(382,ball.y));
   let kx=gx,ky=gy;
   if(ball.x>850){kx=Math.max(978,Math.min(1018,ball.x+28));ky=Math.max(275,Math.min(385,ball.y));}
   if(ownPossession&&ball.x>850&&Math.hypot(o.x-ball.x,o.y-ball.y)<58){kx=Math.max(965,ball.x+20);}
   moveToward(o,kx,ky,dt,1.08);
   if(ownPossession&&ball.x>875&&Math.hypot(o.x-ball.x,o.y-ball.y)<31){ball.owner='opponent';ball.opponent=o;lastTouchTeam='away';player.hasBall=false;$('message').textContent='O guarda-redes defendeu a bola!';}
   continue;
  }
  let tx=o.homeX,ty=o.homeY;
  if(ownPossession){
   // Cada jogador tem uma referência diferente para evitar que os onze se amontoem no portador.
   const mark=homePlayers[(i*2+1)%homePlayers.length];
   tx=mark.x+(o.x<mark.x?-25:25);ty=mark.y+(i%2?25:-25);
   const pressers=fieldOpp.slice().sort((x,y)=>distBall(x)-distBall(y)).slice(0,2);
   if(pressers.includes(o)&&distBall(o)<280){tx=ball.x+(o.x<ball.x?-15:15);ty=ball.y+(i%2?12:-12);}
  }else if(awayPossession){
   tx=o.homeX+(ball.x-550)*.09;ty=o.homeY+(ball.y-325)*.07;
   if(ball.owner==='opponent'&&ball.opponent===o){
    o.hasBall=true;
    const pressure=homePlayers.reduce((best,p)=>Math.min(best,Math.hypot(p.x-o.x,p.y-o.y)),Infinity);
    aiPassTimer+=dt;
    if(aiPassTimer>(0.75+Math.random()*.35)*difficultySettings().pass||pressure<82){
     const options=fieldOpp.filter(m=>m!==o);
     let receiver=options.filter(m=>m.x<o.x-22).sort((a,b)=>Math.hypot(a.x-o.x,a.y-o.y)-Math.hypot(b.x-o.x,b.y-o.y))[0];
     if(!receiver)receiver=options.sort((a,b)=>Math.hypot(a.x-o.x,a.y-o.y)-Math.hypot(b.x-o.x,b.y-o.y))[0];
     const dx=receiver?receiver.x-o.x:-150,dy=receiver?receiver.y-o.y:(Math.random()-.5)*100,dist=Math.hypot(dx,dy)||1;
     ball.x=o.x;ball.y=o.y;ball.owner=null;ball.opponent=null;ball.vx=dx/dist*(390+Math.random()*70);ball.vy=dy/dist*(390+Math.random()*70);aiPassTimer=0;o.hasBall=false;
    }else{tx=Math.max(80,o.x-dt*o.speed*.5);ty=o.y+(330-o.y)*dt*.24;ball.x=o.x-13;ball.y=o.y;}
   }
  }else{
   tx=o.homeX+(ball.x-550)*.055;ty=o.homeY+(ball.y-325)*.045;
   const pressers=fieldOpp.slice().sort((x,y)=>distBall(x)-distBall(y)).slice(0,2);
   if(pressers.includes(o)&&distBall(o)<210){tx=ball.x+(o.x<ball.x?-14:14);ty=ball.y+(i%2?12:-12);}
  }
  moveToward(o,tx,ty,dt,1.12*difficultySettings().speed);
  // Desarme apenas quando chega perto, com probabilidade por segundo e sem roubo à distância.
  if(ownPossession&&Math.hypot(o.x-player.x,o.y-player.y)<23&&Math.random()<dt*1.9*difficultySettings().steal){ball.owner='opponent';ball.opponent=o;lastTouchTeam='away';player.hasBall=false;$('message').textContent='O adversário roubou-te a bola!';}
 }
}

function halfEnd(){if(half===1){matchRunning=false;$('blackout').classList.add('active');$('blackout').querySelector('strong').textContent='INTERVALO';$('blackout').querySelector('small').textContent=`Resultado: ${playerTeam} ${matchScore[0]} - ${matchScore[1]} ${opponent} · segunda parte em breve`;setTimeout(()=>{if(!fullMatch)return;half=2;halfSeconds=120;player.x=785;player.y=330;player.dir=Math.PI;ball.x=550;ball.y=325;ball.owner=null;$('blackout').classList.remove('active');$('message').textContent='Começa a segunda parte! Agora atacas para o outro lado.';matchRunning=true;lastFrame=performance.now();requestAnimationFrame(matchLoop)},2200)}else{matchRunning=false;matchOver=true;gameProfile.matches++;if(matchScore[0]>matchScore[1]){gameProfile.wins++;gameProfile.coins+=150;$('betLog').textContent='Vitória: recebeste 150 moedas de jogo!'}else if(matchScore[0]===matchScore[1])gameProfile.coins+=50;else gameProfile.coins+=25;saveProfile();resolveVirtualBet(matchScore[0],matchScore[1]);recordLeagueMatch();$('blackout').classList.add('active');$('blackout').querySelector('strong').textContent=matchScore[0]===matchScore[1]?'FIM DO JOGO · EMPATE':matchScore[0]>matchScore[1]?'FIM DO JOGO · VITÓRIA!':'FIM DO JOGO · DERROTA';$('blackout').querySelector('small').textContent=`${playerTeam} ${matchScore[0]} - ${matchScore[1]} ${opponent} · Recompensas e aposta atualizadas.`;$('message').textContent='Apito final!';}}
function drawPitch(){const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#102d25');bg.addColorStop(1,'#06130e');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);ctx.fillStyle='#111d1a';ctx.fillRect(0,0,W,78);for(let i=0;i<20;i++){ctx.fillStyle=i%2?'#e9f4e80b':'#d7e5d40a';ctx.fillRect(i*58,8,34,55)}const pitch=ctx.createLinearGradient(0,85,0,580);pitch.addColorStop(0,'#267848');pitch.addColorStop(1,'#12502f');ctx.fillStyle=pitch;ctx.fillRect(35,80,1030,500);for(let i=0;i<10;i++){ctx.fillStyle=i%2?'#ffffff08':'#001a0b0a';ctx.fillRect(35+i*103,80,103,500)}ctx.strokeStyle='#effff0c7';ctx.lineWidth=3;ctx.strokeRect(35,80,1030,500);ctx.beginPath();ctx.moveTo(550,80);ctx.lineTo(550,580);ctx.stroke();ctx.beginPath();ctx.arc(550,330,74,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(550,330,4,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.strokeRect(35,215,155,230);ctx.strokeRect(910,215,155,230);ctx.strokeRect(35,270,65,120);ctx.strokeRect(1000,270,65,120);ctx.beginPath();ctx.arc(155,330,4,0,Math.PI*2);ctx.arc(945,330,4,0,Math.PI*2);ctx.fill();/* Relvado limpo: sem linhas horizontais artificiais, para um aspeto mais suave */ctx.fillStyle='#eaf5e9';ctx.fillRect(20,280,15,100);ctx.fillRect(1065,280,15,100);ctx.fillStyle='#ffffff12';ctx.fillRect(0,80,35,500);ctx.fillRect(1065,80,35,500)}
function drawPlayer(x,y,dir,team,color,number,scale=1,hasBall=false){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.rotate(dir);ctx.fillStyle='#00000055';ctx.beginPath();ctx.ellipse(1,11,12,7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#101b17';ctx.fillRect(-7,2,5,11);ctx.fillRect(2,2,5,11);ctx.fillStyle='#f3f4e8';ctx.fillRect(-9,10,7,4);ctx.fillRect(2,10,7,4);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-9,-9);ctx.lineTo(9,-9);ctx.lineTo(8,4);ctx.lineTo(-8,4);ctx.closePath();ctx.fill();ctx.fillStyle='#f0c5a0';ctx.beginPath();ctx.arc(0,-13,6,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 6px Arial';ctx.textAlign='center';ctx.fillText(number,0,0);ctx.restore()}
function drawMatch(){
 // Vista 3D isométrica/perspetiva desenhada no canvas, sem dependências externas.
 const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#07131a');sky.addColorStop(.42,'#173b31');sky.addColorStop(1,'#061b12');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 // Bancadas e luzes do estádio
 for(let row=0;row<5;row++){ctx.fillStyle=['#142822','#1b3028','#263b31'][row%3];ctx.fillRect(0,45+row*10,W,9);for(let x=8;x<W;x+=13){ctx.fillStyle=['#9caa9b','#d5c8a0','#637d70','#b5b7a1'][Math.floor((x*7+row*13)%4)];ctx.globalAlpha=.25;ctx.fillRect(x,47+row*10,5,5)}ctx.globalAlpha=1}
 const P=(x,y)=>{const d=Math.max(0,Math.min(1,(y-80)/500));const scale=.48+d*.57;return {x:550+(x-550)*scale,y:115+(y-80)*1.03,scale}};
 const poly=(pts,fill,stroke=null,lw=2)=>{ctx.beginPath();pts.forEach((p,i)=>{const q=P(p[0],p[1]);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}};
 poly([[35,80],[1065,80],[1065,580],[35,580]],'#17633a','#dcebe0',3);
 for(let i=0;i<10;i++)poly([[35+i*103,80],[35+(i+1)*103,80],[35+(i+1)*103,580],[35+i*103,580]],i%2?'#ffffff08':'#001b0b12');
 const line=(pts,w=2)=>{ctx.beginPath();pts.forEach((p,i)=>{const q=P(p[0],p[1]);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});ctx.strokeStyle='#e8f3e8cc';ctx.lineWidth=w;ctx.stroke()};
 line([[35,80],[1065,80],[1065,580],[35,580],[35,80]],3);line([[550,80],[550,580]],3);
 // Áreas e balizas
 line([[35,215],[190,215],[190,445],[35,445]],2);line([[35,270],[100,270],[100,390],[35,390]],2);line([[1065,215],[910,215],[910,445],[1065,445]],2);line([[1065,270],[1000,270],[1000,390],[1065,390]],2);
 // Balizas com profundidade, postes grossos, travessão e rede em perspetiva.
 const drawGoal3D=(gx,side)=>{
   const yTop=276,yBottom=384,depth=42,postH=58;
   const left=P(gx,yTop),right=P(gx,yBottom);
   const backX=gx+(side==='left'?depth:-depth);
   const bl=P(backX,yTop+5),br=P(backX,yBottom-5);
   const topLeft={x:left.x,y:left.y-postH*left.scale},topRight={x:right.x,y:right.y-postH*right.scale};
   const backTopLeft={x:bl.x,y:bl.y-postH*bl.scale*.78},backTopRight={x:br.x,y:br.y-postH*br.scale*.78};
   ctx.save();ctx.lineCap='round';
   // Rede traseira e laterais
   ctx.fillStyle='#dbe8df18';ctx.beginPath();ctx.moveTo(topLeft.x,topLeft.y);ctx.lineTo(topRight.x,topRight.y);ctx.lineTo(backTopRight.x,backTopRight.y);ctx.lineTo(backTopLeft.x,backTopLeft.y);ctx.closePath();ctx.fill();
   ctx.strokeStyle='#e8f2e8a0';ctx.lineWidth=1.2;
   for(let i=1;i<8;i++){let t=i/8;ctx.beginPath();ctx.moveTo(topLeft.x+(topRight.x-topLeft.x)*t,topLeft.y+(topRight.y-topLeft.y)*t);ctx.lineTo(backTopLeft.x+(backTopRight.x-backTopLeft.x)*t,backTopLeft.y+(backTopRight.y-backTopLeft.y)*t);ctx.stroke()}
   for(let i=1;i<6;i++){let t=i/6;ctx.beginPath();ctx.moveTo(topLeft.x+(backTopLeft.x-topLeft.x)*t,topLeft.y+(backTopLeft.y-topLeft.y)*t);ctx.lineTo(topRight.x+(backTopRight.x-topRight.x)*t,topRight.y+(backTopRight.y-topRight.y)*t);ctx.stroke()}
   ctx.strokeStyle='#10221a';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(left.x,left.y);ctx.lineTo(topLeft.x,topLeft.y);ctx.lineTo(topRight.x,topRight.y);ctx.lineTo(right.x,right.y);ctx.stroke();
   ctx.strokeStyle='#f4f7ef';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(left.x,left.y);ctx.lineTo(topLeft.x,topLeft.y);ctx.lineTo(topRight.x,topRight.y);ctx.lineTo(right.x,right.y);ctx.stroke();
   ctx.strokeStyle='#e7f1e8';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(topLeft.x,topLeft.y);ctx.lineTo(backTopLeft.x,backTopLeft.y);ctx.lineTo(backTopRight.x,backTopRight.y);ctx.lineTo(topRight.x,topRight.y);ctx.stroke();
   ctx.restore();
 };
 drawGoal3D(35,'left');drawGoal3D(1065,'right');
 // Círculo central projetado como elipse
 let c=P(550,330);ctx.beginPath();ctx.ellipse(c.x,c.y,74*c.scale,74*1.03*c.scale,0,0,Math.PI*2);ctx.strokeStyle='#e8f3e8cc';ctx.lineWidth=2.5;ctx.stroke();ctx.beginPath();ctx.arc(c.x,c.y,3,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
 // Desenha do mais distante ao mais próximo para criar profundidade
 const homeKit=kitFor(playerTeam),awayKit=kitFor(opponent,true);const actors=[];teammates.forEach(t=>actors.push({...t,color:homeKit[0],kind:'mate'}));opponents.forEach(o=>actors.push({...o,color:o.keeper?'#f0c93d':awayKit[0],kind:'opp'}));actors.push({...player,color:homeKit[0],number:activeJersey,kind:'player'});actors.sort((a,b)=>a.y-b.y);
 for(const a of actors){const q=P(a.x,a.y);ctx.save();ctx.translate(q.x,q.y);ctx.scale(q.scale,q.scale);const dir=a.kind==='player'?player.dir:Math.atan2(ball.y-a.y,ball.x-a.x);ctx.rotate(dir);ctx.fillStyle='#0008';ctx.beginPath();ctx.ellipse(1,12,14,7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#101b17';ctx.fillRect(-8,3,6,12);ctx.fillRect(2,3,6,12);ctx.fillStyle='#f3f4e8';ctx.fillRect(-10,12,8,4);ctx.fillRect(2,12,8,4);ctx.fillStyle=a.color;ctx.beginPath();ctx.moveTo(-10,-10);ctx.lineTo(10,-10);ctx.lineTo(9,5);ctx.lineTo(-9,5);ctx.closePath();ctx.fill();ctx.fillStyle='#f0c5a0';ctx.beginPath();ctx.arc(0,-15,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 7px Arial';ctx.textAlign='center';ctx.fillText(a.number||1,0,0);ctx.restore()}
 const b=ball.owner==='player'?P(player.x+Math.cos(player.dir)*24,player.y+Math.sin(player.dir)*24):P(ball.x,ball.y);drawBall(b.x,b.y,Math.max(4,8*b.scale));
 // HUD legível e fixa na tela
 ctx.fillStyle='#06120de8';ctx.fillRect(360,12,380,54);ctx.strokeStyle='#ffffff44';ctx.strokeRect(360,12,380,54);ctx.fillStyle='#c5fa72';ctx.font='900 13px Arial';ctx.textAlign='center';ctx.fillText(playerTeam.toUpperCase()+'   '+matchScore[0]+' - '+matchScore[1]+'   '+opponent.toUpperCase(),550,33);ctx.fillStyle='#fff';ctx.font='bold 11px Arial';ctx.fillText((half===1?'1.ª PARTE':'2.ª PARTE')+' · '+formatTime(halfSeconds),550,51);ctx.textAlign='left';ctx.fillText('STAMINA',55,42);ctx.fillStyle='#ffffff40';ctx.fillRect(55,50,110,7);ctx.fillStyle='#c5fa72';ctx.fillRect(55,50,110*player.stamina/100,7);
 const shade=ctx.createRadialGradient(550,400,180,550,400,700);shade.addColorStop(0,'#00000000');shade.addColorStop(1,'#00000055');ctx.fillStyle=shade;ctx.fillRect(0,0,W,H)
}

function drawFreeKickWall(){
 // Cinco jogadores espaçados e desenhados por camadas, para a barreira não parecer um monte de pixels.
 const center=550, baseY=318, spacing=34;
 for(let i=0;i<5;i++){
  const x=center+(i-2)*spacing, y=baseY+Math.abs(i-2)*1.5;
  ctx.save();ctx.translate(x,y);
  // sombra no relvado
  ctx.fillStyle='#06130c70';ctx.beginPath();ctx.ellipse(0,19,13,4,0,0,Math.PI*2);ctx.fill();
  // pernas e botas
  ctx.strokeStyle='#202722';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-4,7);ctx.lineTo(-5,17);ctx.moveTo(4,7);ctx.lineTo(5,17);ctx.stroke();
  ctx.fillStyle='#f2f3e9';ctx.fillRect(-10,15,8,4);ctx.fillRect(3,15,8,4);
  // tronco, braços e mãos
  ctx.fillStyle='#d92335';ctx.beginPath();ctx.moveTo(-8,-9);ctx.lineTo(8,-9);ctx.lineTo(7,7);ctx.lineTo(-7,7);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#d92335';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-7,-6);ctx.lineTo(-12,2);ctx.moveTo(7,-6);ctx.lineTo(12,2);ctx.stroke();
  ctx.fillStyle='#e8c5a2';ctx.beginPath();ctx.arc(0,-15,6,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#252a26';ctx.beginPath();ctx.arc(0,-17,6,Math.PI,Math.PI*2);ctx.fill();
  ctx.restore();
 }
}
function draw(){ctx.clearRect(0,0,W,H);if(fullMatch){drawMatch();return}let sky=ctx.createLinearGradient(0,0,0,300);sky.addColorStop(0,'#111e2a');sky.addColorStop(.55,'#354c4a');sky.addColorStop(1,'#182f24');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);polygon([[0,0],[W,0],[W,75],[800,35],[300,35],[0,75]],'#071016');for(const x of [95,1005]){ctx.save();ctx.shadowColor='#f3ffd8';ctx.shadowBlur=25;ctx.fillStyle='#efffe6';ctx.fillRect(x-48,63,96,10);ctx.restore();const gl=ctx.createRadialGradient(x,72,4,x,72,240);gl.addColorStop(0,'#e8ffcb30');gl.addColorStop(1,'#e8ffcb00');ctx.fillStyle=gl;ctx.fillRect(x-240,70,480,330)}const crowd=['#d1c9a2','#7c9d8b','#4a6673','#b7b5a0','#8b4e4d','#354a43'];for(let row=0;row<7;row++)for(let x=0;x<W;x+=10){let v=Math.abs(Math.sin(x*.035+row*9)*Math.cos(x*.023+row));ctx.globalAlpha=.4+v*.4;ctx.fillStyle=crowd[Math.floor(v*crowd.length)%crowd.length];ctx.fillRect(x+(row%2)*4,93+row*21,5,8+v*4)}ctx.globalAlpha=1;ctx.fillStyle='#0b1912';ctx.fillRect(0,236,W,50);ctx.fillStyle='#d7e1d2';ctx.fillRect(0,246,W,27);ctx.fillStyle='#214632';ctx.font='900 17px Arial';ctx.textAlign='center';ctx.fillText('PENÁLTIS FC  •  PORTUGAL  •  JOGA COM PAIXÃO  •  PENÁLTIS FC',550,265);const grass=ctx.createLinearGradient(0,275,0,H);grass.addColorStop(0,'#337c4a');grass.addColorStop(1,'#103720');ctx.fillStyle=grass;ctx.fillRect(0,275,W,H-275);for(let i=0;i<10;i++){ctx.fillStyle=i%2?'#ffffff06':'#00000008';ctx.fillRect(i*110,275,110,H-275)}ctx.strokeStyle='#e5f1e0a0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,650);ctx.lineTo(290,285);ctx.lineTo(810,285);ctx.lineTo(1100,650);ctx.stroke();polygon([[360,650],[430,337],[670,337],[740,650]],'#d9f0df05','#dcebdd88',2);ctx.beginPath();ctx.ellipse(550,410,55,17,0,0,Math.PI*2);ctx.stroke();const gx=350,gy=125,gw=400,gh=170;ctx.fillStyle='#02090644';ctx.beginPath();ctx.ellipse(550,309,220,29,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#eaf4ed14';ctx.beginPath();ctx.moveTo(gx,gy);ctx.lineTo(gx+gw,gy);ctx.lineTo(gx+gw+28,gy+gh+8);ctx.lineTo(gx-28,gy+gh+8);ctx.closePath();ctx.fill();ctx.strokeStyle='#e4f0e5a0';ctx.lineWidth=1;for(let x=gx;x<=gx+gw;x+=22){ctx.beginPath();ctx.moveTo(x,gy);ctx.lineTo(x+(x-gx)/gw*28,gy+gh+8);ctx.stroke()}for(let y=gy+15;y<gy+gh+8;y+=17){ctx.beginPath();ctx.moveTo(gx-(y-gy)/gh*28,y);ctx.lineTo(gx+gw+(y-gy)/gh*28,y);ctx.stroke()}ctx.lineWidth=9;ctx.strokeStyle='#eaf0e8';ctx.beginPath();ctx.moveTo(gx-4,gy+gh);ctx.lineTo(gx,gy);ctx.lineTo(gx+gw,gy);ctx.lineTo(gx+gw+4,gy+gh);ctx.stroke();ctx.lineWidth=3;ctx.strokeStyle='#fff';ctx.stroke();if(mode==='freekick'){drawFreeKickWall()}drawKeeper(550+keeperDive.x,263+keeperDive.y);drawLegs(practiceX-550,practiceY-568);if(ballAnim)drawBall(ballAnim.x,ballAnim.y,ballAnim.r);else drawBall(practiceX,practiceY,22);if(mouseInside&&!busy){ctx.save();ctx.strokeStyle='#d9ff9c';ctx.lineWidth=2;ctx.shadowColor='#c5fa72';ctx.shadowBlur=9;ctx.beginPath();ctx.arc(targetX,targetY,10,0,Math.PI*2);ctx.moveTo(targetX-16,targetY);ctx.lineTo(targetX+16,targetY);ctx.moveTo(targetX,targetY-16);ctx.lineTo(targetX,targetY+16);ctx.stroke();ctx.restore()}const vig=ctx.createRadialGradient(550,330,150,550,330,700);vig.addColorStop(0,'#00000000');vig.addColorStop(1,'#020604aa');ctx.fillStyle=vig;ctx.fillRect(0,0,W,H)}
function drawKeeper(x,y){ctx.save();ctx.translate(x,y);ctx.fillStyle='#00000055';ctx.beginPath();ctx.ellipse(0,48,45,8,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#1c2a29';ctx.lineWidth=13;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-11,22);ctx.lineTo(-17,43);ctx.moveTo(11,22);ctx.lineTo(17,43);ctx.stroke();ctx.fillStyle='#e5e9dc';ctx.fillRect(-24,40,14,6);ctx.fillRect(10,40,14,6);ctx.fillStyle='#f0c93d';polygon([[-19,-20],[19,-20],[25,19],[-25,19]],'#f0c93d');ctx.fillStyle='#c2a02d';ctx.fillRect(-4,-15,8,31);ctx.strokeStyle='#f0c93d';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(-17,-13);ctx.lineTo(-35,-5);ctx.moveTo(17,-13);ctx.lineTo(35,-5);ctx.stroke();ctx.fillStyle='#f3f5ed';ctx.beginPath();ctx.arc(-38,-4,8,0,Math.PI*2);ctx.arc(38,-4,8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#bd8662';ctx.beginPath();ctx.arc(0,-33,13,0,Math.PI*2);ctx.fill();ctx.fillStyle='#2a2b25';ctx.beginPath();ctx.arc(0,-38,13,Math.PI,Math.PI*2);ctx.fill();ctx.restore()}
function drawLegs(dx=0,dy=0){ctx.save();ctx.translate(dx,dy);polygon([[355,650],[407,650],[478,573],[456,560],[399,606]],'#111b19');polygon([[745,650],[693,650],[622,573],[644,560],[701,606]],'#111b19');polygon([[358,650],[411,650],[468,603],[452,590],[394,624]],'#e8eee5');polygon([[742,650],[689,650],[632,603],[648,590],[706,624]],'#e8eee5');ctx.strokeStyle='#b9c5b8';ctx.lineWidth=2;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(420+i*7,616+i*5);ctx.lineTo(446+i*4,604+i*5);ctx.stroke();ctx.beginPath();ctx.moveTo(680-i*7,616+i*5);ctx.lineTo(654-i*4,604+i*5);ctx.stroke()}ctx.restore()}
function drawBall(x,y,r){ctx.save();ctx.translate(x,y);ctx.fillStyle='#00000065';ctx.beginPath();ctx.ellipse(5,r*.85,r*1.3,r*.42,0,0,Math.PI*2);ctx.fill();const g=ctx.createRadialGradient(-r*.3,-r*.4,1,0,0,r*1.2);g.addColorStop(0,'#fff');g.addColorStop(1,'#aab6ad');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#29342d';ctx.lineWidth=Math.max(1,r*.06);ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#202b24';ctx.beginPath();for(let i=0;i<5;i++){let a=-Math.PI/2+i*Math.PI*2/5;ctx.lineTo(Math.cos(a)*r*.4,Math.sin(a)*r*.4)}ctx.closePath();ctx.fill();for(let i=0;i<5;i++){let a=i*Math.PI*2/5;ctx.beginPath();ctx.arc(Math.cos(a)*r*.68,Math.sin(a)*r*.68,r*.13,0,Math.PI*2);ctx.fill()}ctx.restore()}
window.addEventListener('keydown',e=>{keys[e.code]=true;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(fullMatch&&matchRunning&&!e.repeat){if(e.code==='Space')kickBall();if(e.code==='KeyE')passBall()}});window.addEventListener('keyup',e=>keys[e.code]=false);

// Passe assistido, desarme e remate carregado
let shotCharging=false, shotCharge=0, lastRecordedMatch='';
const leagueResults={};
function getLeagueKey(div){return String(div)}
function ensureLeague(div){const key=getLeagueKey(div);if(!leagueResults[key]){leagueResults[key]={};(teams[div]||[]).forEach(t=>leagueResults[key][t]={played:0,w:0,d:0,l:0,gf:0,ga:0,pts:0})}return leagueResults[key]}
function recordLeagueMatch(){
 const div=$('division').value, stats=ensureLeague(div);
 if(lastRecordedMatch===playerTeam+'|'+opponent+'|'+matchScore.join(':'))return;
 lastRecordedMatch=playerTeam+'|'+opponent+'|'+matchScore.join(':');
 if(!stats[playerTeam]||!stats[opponent])return;
 const h=stats[playerTeam],a=stats[opponent],hs=matchScore[0],as=matchScore[1];
 h.played++;a.played++;h.gf+=hs;h.ga+=as;a.gf+=as;a.ga+=hs;
 if(hs>as){h.w++;h.pts+=3;a.l++}else if(hs<as){a.w++;a.pts+=3;h.l++}else{h.d++;a.d++;h.pts++;a.pts++}
 renderStandings();
}
function renderStandings(){
 const div=$('standingsDivision')?.value||$('division').value,stats=ensureLeague(div);
 const rows=(teams[div]||[]).map(name=>({name,...stats[name]})).sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.name.localeCompare(b.name));
 $('standingsBody').innerHTML=rows.map((r,i)=>`<tr><td>${i+1}</td><td>${r.name}</td><td>${r.played}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf}</td><td>${r.ga}</td><td>${r.gf-r.ga>0?'+':''}${r.gf-r.ga}</td><td><b>${r.pts}</b></td></tr>`).join('');
}
$('standingsDivision')?.addEventListener('change',renderStandings);
function tackleBall(){
 if(!fullMatch||!matchRunning)return;
 const carrier=ball.owner==='opponent'?ball.opponent:null;const nearest=carrier||opponents.reduce((best,o)=>!best||Math.hypot(o.x-player.x,o.y-player.y)<Math.hypot(best.x-player.x,best.y-player.y)?o:best,null);if(!nearest){$('message').textContent='Não há adversários por perto.';return}
 const d=Math.hypot(nearest.x-player.x,nearest.y-player.y);
 if(ball.owner==='opponent'&&ball.opponent===nearest&&d<92){ball.owner='player';ball.opponent=null;player.hasBall=true;lastTouchTeam='home';$('message').textContent='Desarme perfeito! Recuperaste a bola.';matchMessage='Bola recuperada';return}
 if(ball.owner==='opponent'&&d<76){ball.owner='player';ball.opponent=null;player.hasBall=true;lastTouchTeam='home';$('message').textContent='Recuperaste a bola!';return}
 if(ball.owner===null&&Math.hypot(ball.x-player.x,ball.y-player.y)<60){ball.owner='player';player.hasBall=true;$('message').textContent='Bola recuperada!';return}
 $('message').textContent='Aproxima-te do adversário com a bola para desarmar.';
}
function beginShotCharge(){
 if(!fullMatch||!matchRunning||shotCharging)return;
 shotCharging=true;shotCharge=0;updateChargeMeter();
}
function updateChargeMeter(){const fill=$('chargeFill');if(fill)fill.style.width=Math.round(shotCharge)+'%';const val=$('powerValue');if(val)val.textContent=Math.round(shotCharge)+'%';}
function releaseShotCharge(){
 if(!shotCharging)return;
 shotCharging=false;
 const power=Math.max(25,Math.min(100,shotCharge<5?25:shotCharge));
 shotPower=power;updateChargeMeter();
 const didShoot=kickBall(power);
 shotCharge=0;updateChargeMeter();
 if(didShoot){$('message').textContent='REMATE! Força '+Math.round(power)+'%.';}
}
const originalMatchLoop=matchLoop;
matchLoop=function(now){
 if(shotCharging&&matchRunning){const dt=Math.min(.05,Math.max(.008,(now-lastFrame)/1000||.016));shotCharge=Math.min(100,shotCharge+dt*68);updateChargeMeter();}
 originalMatchLoop(now);
};
const originalHalfEnd=halfEnd;
halfEnd=function(){if(half===2&&!matchOver){recordLeagueMatch();}originalHalfEnd();};
$('pass')?.addEventListener('click',passBall);
$('tackle')?.addEventListener('click',tackleBall);
$('shoot')?.addEventListener('pointerdown',e=>{if(fullMatch&&e.button===0){e.preventDefault();e.stopPropagation();beginShotCharge();}});
$('shoot')?.addEventListener('click',e=>{if(fullMatch){e.preventDefault();e.stopPropagation();}});
$('game')?.addEventListener('pointerdown',e=>{if(fullMatch&&e.button===0){e.preventDefault();beginShotCharge();}});
window.addEventListener('pointerup',e=>{if(fullMatch&&e.button===0)releaseShotCharge();});
window.addEventListener('pointercancel',()=>releaseShotCharge());
window.addEventListener('blur',()=>{if(shotCharging)releaseShotCharge();});
window.addEventListener('keydown',e=>{if(fullMatch&&matchRunning&&!e.repeat){if(e.code==='KeyQ')tackleBall();if(e.code==='Space'){e.preventDefault();if(!shotCharging){shotCharge=40;kickBall(40);shotCharge=0;updateChargeMeter();}}}});

// Controlos predefinidos em todos os modos: WASD mover, E passar, Q roubar/fintar, BTN1 rematar.
window.addEventListener('keydown',e=>{
 if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){
  if(!fullMatch){e.preventDefault();if(busy)return;const step=e.shiftKey?18:9;
   if(e.code==='KeyW'||e.code==='ArrowUp')practiceY=Math.max(485,practiceY-step);
   if(e.code==='KeyS'||e.code==='ArrowDown')practiceY=Math.min(610,practiceY+step);
   if(e.code==='KeyA'||e.code==='ArrowLeft')practiceX=Math.max(390,practiceX-step);
   if(e.code==='KeyD'||e.code==='ArrowRight')practiceX=Math.min(710,practiceX+step);
   draw();$('aimReadout').textContent='Posição: '+Math.round(practiceX)+', '+Math.round(practiceY);
  }
 }
 if(!fullMatch&&!e.repeat&&e.code==='KeyE'){
  if(busy)return;busy=true;$('message').textContent='Passe curto preparado. Recebeste a bola de volta.';
  ballAnim={x:practiceX,y:practiceY,r:22};const sx=practiceX,sy=practiceY,started=performance.now();
  function passFrame(now){const t=Math.min(1,(now-started)/360);draw();drawBall(sx+(550-sx)*t,sy+(568-sy)*t,22);if(t<1)requestAnimationFrame(passFrame);else{practiceX=550;practiceY=568;ballAnim=null;busy=false;$('message').textContent='Passe concluído. Pronto para rematar.';draw()}}requestAnimationFrame(passFrame);
 }
 if(!fullMatch&&!e.repeat&&e.code==='KeyQ'){
  keeperDive={x:(Math.random()<.5?-1:1)*75,y:0};$('message').textContent='Finta! O guarda-redes deslocou-se. Aproveita o espaço.';draw();setTimeout(()=>{if(!fullMatch){keeperDive={x:0,y:0};draw()}},650);
 }
});
fillTeams();setMode('training');renderStandings();draw();

fillBetTeams();renderBetPanel();
