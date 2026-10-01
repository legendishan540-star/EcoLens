const DATA = {
  battery:{name:"Battery",icon:"🔋",category:"E-Waste",risk:"High",recycle:"High",battery:"Yes",action:"Keep separate from regular household waste.",tip:"Follow your local authorised e-waste or battery collection system.",tags:["battery","cell","power"]},
  charger:{name:"Charger",icon:"🔌",category:"E-Waste",risk:"Medium",recycle:"Medium",battery:"Usually No",action:"Keep with e-waste; do not place in mixed household waste.",tip:"Use an authorised collection route where available.",tags:["charger","adapter","power"]},
  phone:{name:"Mobile phone",icon:"📱",category:"E-Waste",risk:"High",recycle:"High",battery:"Yes",action:"Keep separate and protect personal data before recycling.",tip:"Use an authorised electronics collection or take-back route.",tags:["phone","mobile","smartphone"]},
  cable:{name:"Cable",icon:"🔗",category:"E-Waste",risk:"Low",recycle:"Medium",battery:"No",action:"Keep cables separate from regular mixed waste.",tip:"Cable and electronics recycling routes can recover useful materials.",tags:["cable","wire","cord"]},
  plastic:{name:"Plastic bottle",icon:"🧴",category:"Plastic",risk:"Low",recycle:"Varies",battery:"No",action:"Empty, rinse where appropriate, and segregate as instructed locally.",tip:"Follow your local dry-waste/plastic segregation rules.",tags:["plastic","bottle","pet"]},
  paper:{name:"Paper",icon:"📄",category:"Paper",risk:"Low",recycle:"High",battery:"No",action:"Keep clean and dry; segregate from wet waste.",tip:"Clean paper is commonly suitable for paper-recycling streams.",tags:["paper","cardboard","sheet"]},
  organic:{name:"Organic / wet waste",icon:"🍃",category:"Wet Waste",risk:"Low",recycle:"Compostable",battery:"No",action:"Keep separate from dry and e-waste streams.",tip:"Where available, use the local wet-waste or composting system.",tags:["organic","wet","food","compost"]}
};

const QUIZ = [
 ["Which item should be kept separate from regular household waste because of battery/electronic concerns?",["Battery","Paper","Vegetable peel","Clean cardboard"],0],
 ["What is the main purpose of waste segregation?",["To mix materials","To make recovery and responsible handling easier","To increase packaging","To avoid recycling"],1],
 ["Which is an e-waste item?",["Mobile phone","Banana peel","Newspaper","Glass jar"],0],
 ["What should you do before recycling an old phone?",["Throw it in wet waste","Consider data/privacy and use an authorised route","Break it apart at home","Burn it"],1],
 ["Clean dry paper is generally associated with which stream?",["Paper/dry waste","Wet waste","E-waste","Battery waste"],0],
 ["A used charger is best treated as:",["E-waste","Organic waste","Wet waste","Food waste"],0],
 ["What does 'authorised collection' mean in this project?",["A responsible local collection/recycling route","Any random bin","Burning waste","Dumping waste"],0],
 ["Why should batteries not be mixed casually with household waste?",["They can create handling and safety concerns","They are made of paper","They always dissolve in water","They are organic"],0],
 ["Which is an example of transparent experimentation?",["Reporting only successful trials","Recording actual item and prediction for every trial","Inventing confidence values","Hiding incorrect results"],1],
 ["If a prototype makes 8 correct predictions out of 10 trials, its recorded accuracy is:",["20%","50%","80%","100%"],2],
 ["Which item is usually considered plastic packaging?",["Plastic bottle","Phone battery","USB cable","Charger"],0],
 ["What should happen to wet/organic waste?",["Mix with e-waste","Use the local wet-waste/compost route where available","Put into electronics recycling","Store with batteries"],1],
 ["What is a useful reason to keep a test history?",["To calculate performance from real trials","To make the app look bigger","To hide mistakes","To avoid testing"],0],
 ["What should an educational prototype do when it cannot reliably identify an item?",["Pretend it is certain","Clearly state the limitation","Invent a confidence score","Delete the trial"],1],
 ["The EcoLens project focuses on:",["Identify • Segregate • Dispose","Buy • Break • Burn","Mix • Hide • Dump","Ignore • Store • Forget"],0]
];

const $ = id => document.getElementById(id);
let history = JSON.parse(localStorage.getItem("ecolensHistory") || "[]");
let points = Number(localStorage.getItem("ecolensPoints") || 0);
let cameraStream = null;
let quizIndex = 0, quizScore = 0, selectedAnswer = null;

function save(){ localStorage.setItem("ecolensHistory", JSON.stringify(history)); localStorage.setItem("ecolensPoints", String(points)); }
function label(k){return DATA[k]?.name || k}
function updateStats(){
  $("testsCount").textContent=history.length;
  $("pointsStat").textContent=points;
  $("correctCount").textContent=history.filter(x=>x.correct).length;
  $("incorrectCount").textContent=history.filter(x=>!x.correct).length;
  $("totalCount").textContent=history.length;
  const acc=history.length ? Math.round(history.filter(x=>x.correct).length/history.length*100) : null;
  $("accuracyStat").textContent=acc===null?"—":acc+"%";
  $("accuracyBig").textContent=acc===null?"—":acc+"%";
  $("accuracyRing").style?.setProperty("--acc",(acc||0)+"%");
  const ring=$(".accuracy-ring"); if(ring) ring.style.setProperty("--acc",(acc||0)+"%");
  renderHistory();
}
function renderHistory(){
  const body=$("historyBody");
  if(!history.length){body.innerHTML='<tr><td colspan="5" class="empty-row">No experiments recorded yet.</td></tr>';return}
  body.innerHTML=history.slice().reverse().map((x,i)=>`<tr>
    <td>${history.length-i}</td><td>${label(x.actual)}</td><td>${label(x.prediction)}</td>
    <td class="${x.correct?"correct":"incorrect"}">${x.correct?"Correct":"Incorrect"}</td>
    <td>${new Date(x.time).toLocaleString()}</td>
  </tr>`).join("");
}
function showResult(key){
  const d=DATA[key];
  $("resultIcon").textContent=d.icon;$("resultTitle").textContent=d.name;$("resultCategory").textContent=d.category;
  $("resultCategoryPill").textContent=d.category.toUpperCase();$("resultBattery").textContent=d.battery;
  $("resultRecycle").textContent=d.recycle;$("resultRisk").textContent=d.risk;$("resultAction").textContent=d.action;$("resultTip").textContent="♻️ "+d.tip;
}
function setImage(src){
  $("previewImage").src=src;$("previewImage").hidden=false;$("mediaPlaceholder").hidden=true;$("cameraVideo").hidden=true;
}
$("imageInput").addEventListener("change",e=>{const f=e.target.files[0];if(f)setImage(URL.createObjectURL(f))});
$("cameraBtn").addEventListener("click",async()=>{
  if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;$("cameraVideo").hidden=true;$("captureBtn").hidden=true;$("cameraBtn").textContent="📹 Start Camera";return}
  try{
    cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});
    $("cameraVideo").srcObject=cameraStream;$("cameraVideo").hidden=false;$("previewImage").hidden=true;$("mediaPlaceholder").hidden=true;$("captureBtn").hidden=false;$("cameraBtn").textContent="⏹ Stop Camera";
  }catch(e){alert("Camera access was not available. You can still upload an image.")}
});
$("captureBtn").addEventListener("click",()=>{
  const v=$("cameraVideo"),c=$("captureCanvas");c.width=v.videoWidth||640;c.height=v.videoHeight||480;c.getContext("2d").drawImage(v,0,0,c.width,c.height);setImage(c.toDataURL("image/jpeg"));if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null}$("captureBtn").hidden=true;$("cameraBtn").textContent="📹 Start Camera";
});
$("identifyBtn").addEventListener("click",()=>{showResult($("predictionSelect").value);$("labPredictionSelect").value=$("predictionSelect").value;points+=2;save();updateStats();$("resultCard").scrollIntoView({behavior:"smooth",block:"center"})});
$("useScannerPrediction").addEventListener("change",()=>{if($("useScannerPrediction").checked)$("labPredictionSelect").value=$("predictionSelect").value});
$("predictionSelect").addEventListener("change",()=>{if($("useScannerPrediction").checked)$("labPredictionSelect").value=$("predictionSelect").value});
$("recordBtn").addEventListener("click",()=>{
  const actual=$("actualSelect").value,pred=$("useScannerPrediction").checked?$("predictionSelect").value:$("labPredictionSelect").value;
  history.push({actual,prediction:pred,correct:actual===pred,time:new Date().toISOString()});
  points+=actual===pred?10:3;save();updateStats();
  alert(actual===pred?"Trial recorded: Correct prediction!":"Trial recorded: Incorrect prediction. That's useful experimental data too.");
});
$("clearHistoryBtn").addEventListener("click",()=>{if(confirm("Clear all recorded experiments from this browser?")){history=[];save();updateStats()}});
$("exportBtn").addEventListener("click",()=>{
  if(!history.length){alert("No experiments to export yet.");return}
  const rows=[["No","Actual item","Prediction","Correct","Timestamp"],...history.map((x,i)=>[i+1,label(x.actual),label(x.prediction),x.correct?"Yes":"No",x.time])];
  const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="ecolens-experiment-history.csv";a.click();URL.revokeObjectURL(a.href);
});

function renderGuide(query=""){
  const q=query.toLowerCase();
  const items=Object.entries(DATA).filter(([k,d])=>(d.name+" "+d.category+" "+d.tags.join(" ")).toLowerCase().includes(q));
  $("guideGrid").innerHTML=items.map(([k,d])=>`<article class="guide-card"><div class="emoji">${d.icon}</div><h3>${d.name}</h3><p><b>${d.category}</b> · Risk: ${d.risk}. ${d.tip}</p><span class="tag">${d.recycle} recyclability</span></article>`).join("") || '<div class="glass-card"><p>No guide item matched your search.</p></div>';
}
$("guideSearch").addEventListener("input",e=>renderGuide(e.target.value));

$("calculateImpact").addEventListener("click",()=>{
  const a=Math.max(0,Number($("impactItems").value)||0),e=Math.max(0,Number($("impactEwaste").value)||0);
  const total=a*5+e*15; $("impactPoints").textContent=total; $("impactText").textContent=`That is a simple educational score based on ${a} segregated items and ${e} e-waste pieces. It is not a measured environmental impact value.`; $("impactProgress").style.width=Math.min(100,total/5)+"%";
  points+=Math.min(20,Math.floor(total/25));save();updateStats();
});

function loadQuiz(){
  const q=QUIZ[quizIndex];$("quizCounter").textContent=`Question ${quizIndex+1} of ${QUIZ.length}`;$("quizScore").textContent=`Score: ${quizScore}`;$("quizQuestion").textContent=q[0];
  $("quizProgress").style.width=((quizIndex)/QUIZ.length*100)+"%";selectedAnswer=null;$("nextQuiz").disabled=true;
  $("quizOptions").innerHTML=q[1].map((o,i)=>`<button class="quiz-option" data-i="${i}">${String.fromCharCode(65+i)}. ${o}</button>`).join("");
  document.querySelectorAll(".quiz-option").forEach(btn=>btn.addEventListener("click",()=>selectQuiz(Number(btn.dataset.i))));
}
function selectQuiz(i){
  if(selectedAnswer!==null)return;selectedAnswer=i;const q=QUIZ[quizIndex];
  document.querySelectorAll(".quiz-option").forEach((b,n)=>{b.classList.add(n===q[2]?"correct-answer":n===i?"wrong-answer":"");});
  if(i===q[2])quizScore++;
  $("quizScore").textContent=`Score: ${quizScore}`;$("nextQuiz").disabled=false;
}
$("nextQuiz").addEventListener("click",()=>{
  if(quizIndex<QUIZ.length-1){quizIndex++;loadQuiz()}else{ $("quizOptions").innerHTML="";$("quizQuestion").textContent="Quiz complete!";$("quizProgress").style.width="100%";$("nextQuiz").hidden=true;$("restartQuiz").hidden=false;$("quizFinal").hidden=false;$("quizFinal").innerHTML=`<strong>${quizScore}/${QUIZ.length}</strong><br>Nice work. Your score is only used for this browser session.`;points+=quizScore;save();updateStats();}
});
$("restartQuiz").addEventListener("click",()=>{quizIndex=0;quizScore=0;$("nextQuiz").hidden=false;$("restartQuiz").hidden=true;$("quizFinal").hidden=true;loadQuiz()});

$("challengeBtn").addEventListener("click",()=>{points+=10;save();updateStats();$("challengeBtn").textContent="✓ Challenge Complete +10";$("challengeBtn").disabled=true});
$("menuBtn").addEventListener("click",()=>$("nav").classList.toggle("open"));
document.querySelectorAll("nav a").forEach(a=>a.addEventListener("click",()=>$("nav").classList.remove("open")));

renderGuide();loadQuiz();updateStats();
