const MODEL_URL = "https://huggingface.co/SriramRokkam/wastewise-garbage-cls/resolve/main/wastewise-yolo.onnx";
const MODEL_CLASSES = ["battery", "biological", "cardboard", "glass", "metal", "paper", "plastic", "trash"];

const DATA = {
  battery:{name:"Battery",icon:"🔋",category:"E-Waste",risk:"High",recycle:"High",battery:"Yes",action:"Keep separate from regular household waste.",tip:"Follow your local authorised e-waste or battery collection system.",tags:["battery","cell","power"]},
  biological:{name:"Organic / biological waste",icon:"🍃",category:"Wet Waste",risk:"Low",recycle:"Compostable",battery:"No",action:"Keep separate from dry waste and e-waste.",tip:"Where available, use the local wet-waste or composting system.",tags:["organic","biological","wet","food"]},
  cardboard:{name:"Cardboard",icon:"📦",category:"Paper / Dry Waste",risk:"Low",recycle:"High",battery:"No",action:"Keep clean and dry; segregate from wet waste.",tip:"Clean cardboard can usually enter a paper or dry-waste recycling stream.",tags:["cardboard","box","paper"]},
  glass:{name:"Glass",icon:"🍾",category:"Glass",risk:"Low",recycle:"High",battery:"No",action:"Keep glass separate and handle broken pieces carefully.",tip:"Use your local glass-recycling or dry-waste route where available.",tags:["glass","bottle","jar"]},
  metal:{name:"Metal",icon:"🥫",category:"Metal / Dry Waste",risk:"Low",recycle:"High",battery:"No",action:"Segregate clean metal from mixed waste.",tip:"Metal can often be recovered through local dry-waste or scrap-recycling systems.",tags:["metal","can","foil"]},
  paper:{name:"Paper",icon:"📄",category:"Paper",risk:"Low",recycle:"High",battery:"No",action:"Keep clean and dry; segregate from wet waste.",tip:"Clean paper is commonly suitable for paper-recycling streams.",tags:["paper","sheet","newspaper"]},
  plastic:{name:"Plastic",icon:"🧴",category:"Plastic",risk:"Low",recycle:"Varies",battery:"No",action:"Empty and segregate plastic according to local rules.",tip:"Follow your local dry-waste/plastic segregation rules.",tags:["plastic","bottle","packaging"]},
  trash:{name:"General waste",icon:"🗑️",category:"General Waste",risk:"Varies",recycle:"Varies",battery:"No",action:"Use the appropriate local waste stream rather than mixing recyclables.",tip:"Check your local segregation guidance for the correct disposal route.",tags:["trash","mixed","general"]}
};

const QUIZ = [
 ["Which item should be kept separate from regular household waste because of battery/electronic concerns?",["Battery","Paper","Vegetable peel","Clean cardboard"],0],
 ["What is the main purpose of waste segregation?",["To mix materials","To make recovery and responsible handling easier","To increase packaging","To avoid recycling"],1],
 ["Which is an e-waste item in the current EcoLens AI model?",["Battery","Banana peel","Newspaper","Glass jar"],0],
 ["What should you do before recycling an old phone?",["Throw it in wet waste","Consider data/privacy and use an authorised route","Break it apart at home","Burn it"],1],
 ["Clean dry paper is generally associated with which stream?",["Paper/dry waste","Wet waste","E-waste","Battery waste"],0],
 ["A used battery is best treated as:",["E-waste / battery waste","Organic waste","Wet waste","Food waste"],0],
 ["What does authorised collection mean in this project?",["A responsible local collection/recycling route","Any random bin","Burning waste","Dumping waste"],0],
 ["Why should batteries not be mixed casually with household waste?",["They can create handling and safety concerns","They are made of paper","They always dissolve in water","They are organic"],0],
 ["Which is an example of transparent experimentation?",["Reporting only successful trials","Recording actual item and prediction for every trial","Inventing confidence values","Hiding incorrect results"],1],
 ["If a classifier makes 8 correct predictions out of 10 trials, its recorded accuracy is:",["20%","50%","80%","100%"],2],
 ["Which item is usually considered plastic packaging?",["Plastic bottle","Phone battery","USB cable","Charger"],0],
 ["What should happen to wet/organic waste?",["Mix with e-waste","Use the local wet-waste/compost route where available","Put into electronics recycling","Store with batteries"],1],
 ["What is a useful reason to keep a test history?",["To calculate performance from real trials","To make the app look bigger","To hide mistakes","To avoid testing"],0],
 ["What should an image classifier do when confidence is low?",["Pretend it is certain","Show the result with its measured confidence","Invent a confidence score","Delete the trial"],1],
 ["The EcoLens project focuses on:",["Identify • Segregate • Dispose","Buy • Break • Burn","Mix • Hide • Dump","Ignore • Store • Forget"],0]
];

const $ = id => document.getElementById(id);
let history = JSON.parse(localStorage.getItem("ecolensHistory") || "[]");
let points = Number(localStorage.getItem("ecolensPoints") || 0);
let cameraStream = null;
let detectorStream = null;
let detectorTimer = null;
let detectorRunning = false;
let detectorBusy = false;
let detectorBatteryLatched = false;
let detectorBatteryLatchedAwarded = false;
let detectorAudio = null;
let aiSession = null;
let aiLoading = null;
let lastPrediction = null;
let quizIndex = 0, quizScore = 0, selectedAnswer = null;

function save(){
  localStorage.setItem("ecolensHistory", JSON.stringify(history));
  localStorage.setItem("ecolensPoints", String(points));
}
function label(k){ return DATA[k]?.name || k; }
function pct(v){ return `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%`; }

function updateStats(){
  $("testsCount").textContent=history.length;
  $("pointsStat").textContent=points;
  $("correctCount").textContent=history.filter(x=>x.correct).length;
  $("incorrectCount").textContent=history.filter(x=>!x.correct).length;
  $("totalCount").textContent=history.length;
  const acc=history.length ? Math.round(history.filter(x=>x.correct).length/history.length*100) : null;
  $("accuracyStat").textContent=acc===null?"—":acc+"%";
  $("accuracyBig").textContent=acc===null?"—":acc+"%";
  const ring=$("accuracy-ring"); if(ring) ring.style.setProperty("--acc",(acc||0)+"%");
  renderHistory();
}
function renderHistory(){
  const body=$("historyBody");
  if(!history.length){body.innerHTML='<tr><td colspan="5" class="empty-row">No experiments recorded yet.</td></tr>';return;}
  body.innerHTML=history.slice().reverse().map((x,i)=>`<tr>
    <td>${history.length-i}</td><td>${label(x.actual)}</td><td>${label(x.prediction)}</td>
    <td class="${x.correct?"correct":"incorrect"}">${x.correct?"Correct":"Incorrect"}</td>
    <td>${new Date(x.time).toLocaleString()}</td>
  </tr>`).join("");
}

function setResult(key, confidence=null){
  const d=DATA[key] || DATA.trash;
  $("resultIcon").textContent=d.icon;
  $("resultTitle").textContent=d.name;
  $("resultCategory").textContent=d.category;
  $("resultCategoryPill").textContent=d.category.toUpperCase();
  $("resultBattery").textContent=d.battery;
  $("resultRecycle").textContent=d.recycle;
  $("resultRisk").textContent=d.risk;
  $("resultAction").textContent=d.action;
  $("resultTip").textContent="♻️ "+d.tip;
  if(confidence !== null) $("resultAction").textContent += `  AI confidence: ${pct(confidence)}.`;
}

function setAiOptions(selected=null){
  const select=$("predictionSelect");
  select.innerHTML=MODEL_CLASSES.map(k=>`<option value="${k}">${label(k)}</option>`).join("");
  select.disabled=false;
  if(selected && DATA[selected]) select.value=selected;
  const lab=$("labPredictionSelect");
  lab.innerHTML=MODEL_CLASSES.map(k=>`<option value="${k}">${label(k)}</option>`).join("");
  if(selected && DATA[selected]) lab.value=selected;
}

function setAiStatus(text, good=false){
  const el=$("aiStatus");
  if(!el) return;
  el.textContent=text;
  el.classList.toggle("ready", good);
}

function softmax(values){
  const max=Math.max(...values);
  const exps=values.map(v=>Math.exp(v-max));
  const sum=exps.reduce((a,b)=>a+b,0);
  return exps.map(v=>v/sum);
}

async function getAiSession(){
  if(aiSession) return aiSession;
  if(aiLoading) return aiLoading;
  if(!window.ort) throw new Error("ONNX Runtime did not load.");
  ort.env.wasm.wasmPaths="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/";
  aiLoading=(async()=>{
    setAiStatus("Loading AI model…");
    const session=await ort.InferenceSession.create(MODEL_URL,{executionProviders:["wasm"],graphOptimizationLevel:"all"});
    aiSession=session;
    setAiStatus("AI model ready",true);
    return session;
  })();
  try { return await aiLoading; }
  finally { aiLoading=null; }
}

function imageToTensor(source){
  const canvas=document.createElement("canvas");
  canvas.width=224; canvas.height=224;
  const ctx=canvas.getContext("2d",{willReadFrequently:true});
  ctx.drawImage(source,0,0,224,224);
  const pixels=ctx.getImageData(0,0,224,224).data;
  const data=new Float32Array(1*3*224*224);
  const plane=224*224;
  for(let i=0;i<plane;i++){
    data[i]=pixels[i*4]/255;
    data[plane+i]=pixels[i*4+1]/255;
    data[plane*2+i]=pixels[i*4+2]/255;
  }
  return new ort.Tensor("float32",data,[1,3,224,224]);
}

async function classifySource(source){
  const session=await getAiSession();
  const inputName=session.inputNames[0];
  const tensor=imageToTensor(source);
  const output=await session.run({[inputName]:tensor});
  const out=output[session.outputNames[0]];
  let values=Array.from(out.data).slice(0,MODEL_CLASSES.length);
  const sum=values.reduce((a,b)=>a+b,0);
  if(Math.abs(sum-1)>0.02 || values.some(v=>v<0)) values=softmax(values);
  const ranked=values.map((score,i)=>({key:MODEL_CLASSES[i],score})).sort((a,b)=>b.score-a.score);
  return {key:ranked[0].key,score:ranked[0].score,ranked};
}

function setImage(src){
  $("previewImage").src=src;
  $("previewImage").hidden=false;
  $("mediaPlaceholder").hidden=true;
  $("cameraVideo").hidden=true;
}

async function analyzeCurrentImage(){
  const img=$("previewImage");
  if(img.hidden || !img.src){
    alert("Upload an image or capture one from the camera first.");
    return;
  }
  const btn=$("identifyBtn");
  btn.disabled=true; btn.textContent="🧠 Analyzing…"; setAiStatus("Analyzing image…");
  try{
    if(!img.complete) await new Promise(r=>img.addEventListener("load",r,{once:true}));
    const result=await classifySource(img);
    lastPrediction=result;
    setAiOptions(result.key);
    setResult(result.key,result.score);
    $("labPredictionSelect").value=result.key;
    points+=2; save(); updateStats();
    $("resultCard").scrollIntoView({behavior:"smooth",block:"center"});
    setAiStatus(`Detected ${label(result.key)} · ${pct(result.score)}`,true);
  }catch(err){
    console.error(err);
    setAiStatus("AI model could not be loaded");
    alert("The AI model could not be loaded. Check your internet connection and try again.");
  }finally{
    btn.disabled=false; btn.textContent="🤖 Analyze Image";
  }
}

$("imageInput").addEventListener("change",e=>{
  const f=e.target.files[0];
  if(!f) return;
  setImage(URL.createObjectURL(f));
  setAiStatus("Image ready — click Analyze Image");
});

$("cameraBtn").addEventListener("click",async()=>{
  if(cameraStream){
    cameraStream.getTracks().forEach(t=>t.stop()); cameraStream=null;
    $("cameraVideo").hidden=true; $("captureBtn").hidden=true;
    $("cameraBtn").textContent="📹 Start Camera"; return;
  }
  try{
    cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
    $("cameraVideo").srcObject=cameraStream; $("cameraVideo").hidden=false;
    $("previewImage").hidden=true; $("mediaPlaceholder").hidden=true; $("captureBtn").hidden=false;
    $("cameraBtn").textContent="⏹ Stop Camera";
  }catch(e){ alert("Camera access was not available. You can still upload an image."); }
});

$("captureBtn").addEventListener("click",()=>{
  const v=$("cameraVideo"),c=$("captureCanvas");
  c.width=v.videoWidth||640; c.height=v.videoHeight||480;
  c.getContext("2d").drawImage(v,0,0,c.width,c.height);
  setImage(c.toDataURL("image/jpeg",0.9));
  if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;}
  $("captureBtn").hidden=true; $("cameraBtn").textContent="📹 Start Camera";
  setAiStatus("Capture ready — click Analyze Image");
});

$("identifyBtn").addEventListener("click",analyzeCurrentImage);
$("useScannerPrediction").addEventListener("change",()=>{
  if($("useScannerPrediction").checked && lastPrediction) $("labPredictionSelect").value=lastPrediction.key;
});

$("recordBtn").addEventListener("click",()=>{
  const actual=$("actualSelect").value;
  const pred=$("useScannerPrediction").checked && lastPrediction ? lastPrediction.key : $("labPredictionSelect").value;
  history.push({actual,prediction:pred,correct:actual===pred,time:new Date().toISOString(),confidence:lastPrediction?.score ?? null});
  points+=actual===pred?10:3; save(); updateStats();
  alert(actual===pred?"Trial recorded: Correct AI prediction!":"Trial recorded: Incorrect AI prediction. Keep the trial — it is useful experimental data.");
});

$("clearHistoryBtn").addEventListener("click",()=>{
  if(confirm("Clear all recorded experiments from this browser?")){history=[];save();updateStats();}
});

$("exportBtn").addEventListener("click",()=>{
  if(!history.length){alert("No experiments to export yet.");return;}
  const rows=[["No","Actual item","Prediction","Correct","Confidence","Timestamp"],...history.map((x,i)=>[i+1,label(x.actual),label(x.prediction),x.correct?"Yes":"No",x.confidence==null?"":pct(x.confidence),x.time])];
  const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download="ecolens-experiment-history.csv"; a.click(); URL.revokeObjectURL(a.href);
});

function detectorBeep(){
  try{
    detectorAudio=detectorAudio || new (window.AudioContext||window.webkitAudioContext)();
    if(detectorAudio.state==="suspended") detectorAudio.resume();
    const o=detectorAudio.createOscillator(),g=detectorAudio.createGain();
    o.type="sine"; o.frequency.value=880;
    g.gain.setValueAtTime(.001,detectorAudio.currentTime);
    g.gain.exponentialRampToValueAtTime(.22,detectorAudio.currentTime+.02);
    g.gain.exponentialRampToValueAtTime(.001,detectorAudio.currentTime+.22);
    o.connect(g);g.connect(detectorAudio.destination);o.start();o.stop(detectorAudio.currentTime+.24);
  }catch(e){}
}
function detectorSignal(v){
  v=Math.max(0,Math.min(100,Math.round(v)));
  $("detectorSignal").textContent=v+"%";
  $("detectorMeter").style.width=v+"%";
}

async function detectorScan(){
  if(!detectorRunning || detectorBusy || !aiSession) return;
  const video=$("detectorVideo");
  if(video.readyState<2) return;
  detectorBusy=true;
  try{
    const result=await classifySource(video);
    const confidence=result.score;
    detectorSignal(confidence*100);
    if(result.key==="battery" && confidence>=0.55){
      if(!detectorRunning) return;
      if(!detectorBatteryLatched) detectorBeep();
      detectorBatteryLatched=true;
      $("detectorStatus").textContent="E-WASTE FOUND";
      $("detectorStatus").classList.remove("active");
      $("detectorStatus").classList.add("found");
      $("detectorMessage").textContent="⚠ E-WASTE DETECTED";
      $("detectorSub").textContent=`Battery · ${pct(confidence)} confidence`;
      setResult(result.key,confidence);
      lastPrediction=result;
      setAiOptions(result.key);
      if(!detectorBatteryLatchedAwarded){
        points+=5; save(); updateStats();
        detectorBatteryLatchedAwarded=true;
      }
      setTimeout(()=>{
        if(detectorRunning){
          $("detectorStatus").textContent="SCANNING";
          $("detectorStatus").classList.remove("found");
          $("detectorStatus").classList.add("active");
          $("detectorMessage").textContent="Scanning…";
          $("detectorSub").textContent="Move slowly across the waste";
        }
      },1200);
    }else{
      detectorBatteryLatched=false;
      detectorBatteryLatchedAwarded=false;
      $("detectorStatus").textContent="SCANNING";
      $("detectorStatus").classList.add("active");
      $("detectorStatus").classList.remove("found");
      $("detectorMessage").textContent=`${label(result.key)} · ${pct(confidence)}`;
      $("detectorSub").textContent="Analyzing the live camera frame";
    }
  }catch(err){
    console.error(err);
  }finally{ detectorBusy=false; }
}

async function startDetector(){
  if(detectorRunning){stopDetector();return;}
  try{
    await getAiSession();
    detectorStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}},audio:false});
    $("detectorVideo").srcObject=detectorStream;
    detectorRunning=true;
    $("detectorBtn").textContent="⏹ Stop Detector";
    $("detectorStatus").textContent="SCANNING";
    $("detectorStatus").classList.add("active");
    $("detectorView").classList.add("scanning");
    $("detectorMessage").textContent="Scanning…";
    $("detectorSub").textContent="Move slowly across the waste";
    detectorTimer=setInterval(detectorScan,900);
  }catch(e){
    console.error(e);
    $("detectorStatus").textContent="CAMERA NEEDED";
    $("detectorMessage").textContent="Camera or AI unavailable";
    $("detectorSub").textContent="Allow camera access and check your internet connection";
  }
}
function stopDetector(){
  detectorRunning=false;
  if(detectorTimer) clearInterval(detectorTimer);
  if(detectorStream) detectorStream.getTracks().forEach(t=>t.stop());
  detectorStream=null;detectorTimer=null;detectorBusy=false;detectorBatteryLatched=false;detectorBatteryLatchedAwarded=false;
  $("detectorVideo").srcObject=null;
  $("detectorBtn").textContent="📡 Start Detector";
  $("detectorStatus").textContent="READY";
  $("detectorStatus").classList.remove("active","found");
  $("detectorMessage").textContent="Start detector";
  $("detectorSub").textContent="Point the camera at the waste";
  $("detectorView").classList.remove("scanning");
  detectorSignal(0);
}
$("detectorBtn").addEventListener("click",startDetector);
$("detectorTestBtn").addEventListener("click",detectorBeep);

function renderGuide(query=""){
  const q=query.toLowerCase();
  const items=Object.entries(DATA).filter(([k,d])=>(d.name+" "+d.category+" "+d.tags.join(" ")).toLowerCase().includes(q));
  $("guideGrid").innerHTML=items.map(([k,d])=>`<article class="guide-card"><div class="emoji">${d.icon}</div><h3>${d.name}</h3><p><b>${d.category}</b> · Risk: ${d.risk}. ${d.tip}</p><span class="tag">${d.recycle} recyclability</span></article>`).join("") || '<div class="glass-card"><p>No guide item matched your search.</p></div>';
}
$("guideSearch").addEventListener("input",e=>renderGuide(e.target.value));

$("calculateImpact").addEventListener("click",()=>{
  const a=Math.max(0,Number($("impactItems").value)||0),e=Math.max(0,Number($("impactEwaste").value)||0);
  const total=a*5+e*15;
  $("impactPoints").textContent=total;
  $("impactText").textContent=`You earned a simple score based on ${a} segregated items and ${e} e-waste pieces. Use it to track your Eco Points.`;
  $("impactProgress").style.width=Math.min(100,total/5)+"%";
  points+=Math.min(20,Math.floor(total/25));save();updateStats();
});

function loadQuiz(){
  const q=QUIZ[quizIndex];
  $("quizCounter").textContent=`Question ${quizIndex+1} of ${QUIZ.length}`;
  $("quizScore").textContent=`Score: ${quizScore}`;
  $("quizQuestion").textContent=q[0];
  $("quizProgress").style.width=((quizIndex)/QUIZ.length*100)+"%";
  selectedAnswer=null;$("nextQuiz").disabled=true;
  $("quizOptions").innerHTML=q[1].map((o,i)=>`<button class="quiz-option" data-i="${i}">${String.fromCharCode(65+i)}. ${o}</button>`).join("");
  document.querySelectorAll(".quiz-option").forEach(btn=>btn.addEventListener("click",()=>selectQuiz(Number(btn.dataset.i))));
}
function selectQuiz(i){
  if(selectedAnswer!==null)return;
  selectedAnswer=i;const q=QUIZ[quizIndex];
  document.querySelectorAll(".quiz-option").forEach((b,n)=>{b.classList.add(n===q[2]?"correct-answer":n===i?"wrong-answer":"");});
  if(i===q[2])quizScore++;
  $("quizScore").textContent=`Score: ${quizScore}`;$("nextQuiz").disabled=false;
}
$("nextQuiz").addEventListener("click",()=>{
  if(quizIndex<QUIZ.length-1){quizIndex++;loadQuiz();}
  else{$("quizOptions").innerHTML="";$ ("quizQuestion").textContent="Quiz complete!";$ ("quizProgress").style.width="100%";$ ("nextQuiz").hidden=true;$ ("restartQuiz").hidden=false;$ ("quizFinal").hidden=false;$ ("quizFinal").innerHTML=`<strong>${quizScore}/${QUIZ.length}</strong><br>Nice work. Keep learning and testing!`;points+=quizScore;save();updateStats();}
});
$("restartQuiz").addEventListener("click",()=>{quizIndex=0;quizScore=0;$("nextQuiz").hidden=false;$("restartQuiz").hidden=true;$("quizFinal").hidden=true;loadQuiz();});

$("challengeBtn").addEventListener("click",()=>{points+=10;save();updateStats();$("challengeBtn").textContent="✓ Challenge Complete +10";$("challengeBtn").disabled=true;});
$("menuBtn").addEventListener("click",()=>$ ("nav").classList.toggle("open"));
document.querySelectorAll("nav a").forEach(a=>a.addEventListener("click",()=>$ ("nav").classList.remove("open")));

// Initialize the UI without downloading the model until the user asks for AI analysis.
setAiOptions();
$("predictionSelect").value="battery";
$("labPredictionSelect").value="battery";
renderGuide();loadQuiz();updateStats();
setAiStatus("AI model loads when you analyze an image or start the detector");
