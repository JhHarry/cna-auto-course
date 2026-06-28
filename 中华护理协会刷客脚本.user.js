// ==UserScript==
// @name         中华护理学会 自动刷课
// @namespace    https://study.zhhlxh.org.cn/
// @version      4.1
// @description  自动刷课: 视频→题目→下一视频→全部播完→打分→下一门课, 静音+异步初始化
// @author       Jh
// @match        https://study.zhhlxh.org.cn/*
// @match        https://course.zhhlxh.org.cn/*
// @icon         https://study.zhhlxh.org.cn/static/logo.e23ccf2.png
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const DEFAULT_SPEED = GM_getValue('cna_speed', 2.5);
    const POLL_MS = 3000;

    const SPEEDS_AUDIO_MUTED = GM_getValue('cna_muted', true);   // 默认静音

    // ==================== UI ====================
    GM_addStyle(`
        #cna-panel { position:fixed; top:10px; right:10px; z-index:999999; background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%); color:#eee; border-radius:12px; padding:0; font-family:'Microsoft YaHei',sans-serif; font-size:13px; box-shadow:0 4px 20px rgba(0,0,0,.5); min-width:260px; user-select:none; overflow:hidden; }
        #cna-panel .title { font-size:14px; font-weight:bold; padding:14px 16px 8px; text-align:center; color:#4fc3f7; cursor:move; user-select:none; -webkit-user-drag:none; }
        #cna-panel .body { padding:0 16px 14px; }
        #cna-panel .row { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
        #cna-panel label { font-size:12px; color:#aaa; }
        #cna-panel .speed-btns { display:flex; gap:4px; }
        #cna-panel .speed-btns button { width:36px; height:28px; border:1px solid #444; background:#222; color:#ccc; border-radius:5px; cursor:pointer; font-size:12px; font-weight:bold; transition:all .15s; }
        #cna-panel .speed-btns button:hover { background:#333; border-color:#4fc3f7; color:#4fc3f7; }
        #cna-panel .speed-btns button.active { background:#4fc3f7; color:#000; border-color:#4fc3f7; }
        #cna-panel .status { font-size:11px; color:#888; margin-top:6px; text-align:center; line-height:1.5; }
        #cna-panel .status .done { color:#66bb6a; } #cna-panel .status .warn { color:#ffa726; } #cna-panel .status .info { color:#4fc3f7; }
        #cna-panel .btn-row { display:flex; gap:6px; margin-top:6px; }
        #cna-panel .btn-row button { flex:1; height:26px; border:1px solid #444; background:#222; color:#ccc; border-radius:5px; cursor:pointer; font-size:11px; }
        #cna-panel .btn-row button:hover { background:#333; color:#4fc3f7; }
        #cna-panel .btn-row button.danger { border-color:#e53935; color:#e53935; }
        #cna-panel .btn-row button.active-btn { border-color:#66bb6a; color:#66bb6a; }
    `);

    const p = document.createElement('div'); p.id = 'cna-panel';
    p.innerHTML = `<div class="title">🤖 中华护理学会 刷课助手</div><div class="body">
      <div class="row"><label>播放速度:</label><div class="speed-btns" id="spds"></div></div>
      <div class="row"><label>自定义:</label><input type="number" id="cspd" value="${DEFAULT_SPEED}" min="0.5" max="16" step="0.5" style="width:50px;background:#222;color:#eee;border:1px solid #444;border-radius:4px;padding:2px 4px;font-size:12px"><button id="btn-aply" style="height:24px;font-size:11px;background:#333;color:#eee;border:1px solid #555;border-radius:4px;cursor:pointer">应用</button></div>
      <div class="status" id="st">初始化中...</div>
      <div class="btn-row"><button id="btn-q">📝 答题</button><button id="btn-n">🔍 下一节</button></div>
      <div class="btn-row"><button id="btn-p">⏯ 暂停</button><button id="btn-c" class="danger">🔀 纠正</button></div>
      <div class="btn-row"><button id="btn-r" class="active-btn">⭐ 评分</button><button id="btn-mute">🔇 有声</button></div></div>`;
    document.body.appendChild(p);

    // drag
    (function(){ let d=null; p.querySelector('.title').addEventListener('mousedown',function(e){ if(e.target.tagName==='BUTTON'||e.target.tagName==='INPUT')return; let r=p.getBoundingClientRect(); d={sx:e.clientX,sy:e.clientY,l:r.left,t:r.top}; p.style.right='auto'; p.style.left=r.left+'px'; p.style.top=r.top+'px'; document.addEventListener('mousemove',mv); document.addEventListener('mouseup',mu); e.preventDefault(); }); function mv(e){ if(!d)return; let l=Math.max(0,Math.min(d.l+e.clientX-d.sx,innerWidth-p.offsetWidth)),t=Math.max(0,Math.min(d.t+e.clientY-d.sy,innerHeight-p.offsetHeight)); p.style.left=l+'px'; p.style.top=t+'px'; } function mu(){ document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',mu); d=null; } })();

    // ==================== 速度 ====================
    const speeds = [1,1.5,2,2.5,3,4], sdBtns = p.querySelector('#spds');
    let curSpd = DEFAULT_SPEED;
    function rdrSpd(){ sdBtns.innerHTML=''; speeds.forEach(s=>{ let b=document.createElement('button'); b.textContent=s+'x'; if(s===curSpd)b.classList.add('active'); b.onclick=()=>{curSpd=s;GM_setValue('cna_speed',s);appSpd(s);rdrSpd();}; sdBtns.appendChild(b); }); }
    rdrSpd();
    p.querySelector('#btn-aply').onclick=()=>{ let v=parseFloat(p.querySelector('#cspd').value); if(v>0&&v<=16){curSpd=v;GM_setValue('cna_speed',v);appSpd(v);rdrSpd();} };
    function appSpd(r){ let v=document.querySelector('video'); if(v){v.playbackRate=r;updSt();} }

    function muteVideos(state) {
        let v = document.querySelector('video');
        if (v) { v.muted = state; v.volume = state ? 0 : 1; }
        GM_setValue('cna_muted', state);
        renderMuteBtn();
    }
    function renderMuteBtn() {
        let muted = GM_getValue('cna_muted', true);
        let btn = p.querySelector('#btn-mute');
        if (!btn) return;
        btn.textContent = muted ? '🔇 已静音' : '🔊 有声';
    }
    let audioMuted = SPEEDS_AUDIO_MUTED;

    p.querySelector('#btn-q').onclick=doAns;
    p.querySelector('#btn-n').onclick=doNxt;
    p.querySelector('#btn-p').onclick=()=>{ let v=document.querySelector('video'); if(v){v.paused?v.play():v.pause();} };
    p.querySelector('#btn-c').onclick=doCor;
    p.querySelector('#btn-r').onclick=doRat;
    p.querySelector('#btn-mute').onclick=function(){ audioMuted=!audioMuted; muteVideos(audioMuted); };

    // ==================== 工具 ====================
    function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
    function isVis(el){ if(!el)return false; if(el.style.display==='none'||el.style.visibility==='hidden')return false; let cs=getComputedStyle(el); if(cs.display==='none'||cs.visibility==='hidden')return false; let r=el.getBoundingClientRect(); return r.width>0&&r.height>0; }
    function fBtn(ct,tt){ let bs=[...ct.querySelectorAll('button,.el-button,[role="button"]')]; return bs.find(b=>{let t=(b.innerText||b.textContent||'').trim();return tt.some(x=>t===x||t.includes(x));}); }
    function getVm(){ let bc=document.querySelector('.body-container'); return bc&&bc.__vue__?bc.__vue__:null; }
    function getV(){return document.querySelector('video');}
    function vi(v){ if(!v)return null; let d=v.duration,c=v.currentTime,r=v.playbackRate||1; if(!isFinite(d)||!isFinite(c)||d<=0)return{pct:'?',rem:'?',rS:'?',paused:v.paused,ended:v.ended,rate:r,dur:0}; return{pct:((c/d)*100).toFixed(1),rem:Math.ceil((d-c)/60),rS:r>0?Math.ceil((d-c)/60/r):Math.ceil((d-c)/60),paused:v.paused,ended:v.ended,rate:r,dur:d}; }

    // ==================== 答题 ====================
    function doAns(){
        let vm=getVm(), ad=[...document.querySelectorAll('.el-dialog__wrapper')];
        let qd=ad.find(d=>{let t=(d.querySelector('.el-dialog__title')||{}).innerText||'';return t==='牛刀小试'&&getComputedStyle(d).display!=='none';});
        let hd=ad.find(d=>{let t=(d.querySelector('.el-dialog__title')||{}).innerText||'';return t==='我的答题'&&getComputedStyle(d).display!=='none';});
        if(!qd&&!hd)return'no-quiz';
        let dlg=qd||hd, txt=dlg.innerText||'';

        // 已有结果（回答正确/错误）→ 关闭 + 下一题
        if(txt.includes('回答正确')||txt.includes('回答错误')){
            console.log('[CNA] 题目结果,关闭→nextQuestion');
            // 先点关闭/下一题按钮
            let cb=fBtn(dlg,['关闭','下一题','确定']);
            if(cb){cb.click();cb.dispatchEvent(new MouseEvent('click',{bubbles:true}));}
            // 如果弹窗里是"下一题"而不是"关闭"，点完直接跳下一题；否则延后
            if(vm&&vm.nextQuestion){
                // 如果结果弹窗是最后一题（按钮是"关闭"），closeQuestion；否则 nextQuestion
                if(cb && (cb.innerText||'').trim()==='关闭'){
                    setTimeout(function(){ vm.closeQuestion(); }, 600);
                } else {
                    setTimeout(function(){ vm.nextQuestion(); }, 600);
                }
            }
            if(!vm&&cb&&(cb.innerText||'').trim()==='下一题') return 'next-question';
            return'closed→next';
        }
        // 历史面板（"我的答题"）
        if(hd){ let cb=fBtn(hd,['关闭','确定']); if(cb){cb.click();return'closed-history';} return'answer-nobtn'; }
        // 题目未渲染（"牛刀小试"弹窗但 body 为空）
        let radios=qd.querySelectorAll('.el-radio');
        if(radios.length===0){
            console.log('[CNA] 题目未渲染,Vue加载...');
            if(vm){if(!vm.questionVisible)vm.questionVisible=true;let ql=vm.questionList,qe=vm.questionEntity;let hasQL=ql&&typeof ql==='object'&&!Array.isArray(ql)&&Object.keys(ql).length>0;let hasQE=qe&&typeof qe==='object'&&Object.keys(qe).length>0;if(hasQL||hasQE){if(vm.handleQuestionEntity)vm.handleQuestionEntity();}else{if(vm.getCourseQuestion)vm.getCourseQuestion();}}
            return'triggered-load';
        }
        // 选第一个选项
        console.log('[CNA] 题目已渲染,'+radios.length+'选项');
        if(vm){
            vm.userAnswer=''; let fr=radios[0], rv=fr.__vue__;
            if(rv&&rv.label!==undefined)vm.userAnswer=rv.label; else{let t=(fr.innerText||'').trim();if(/^[A-Z]/.test(t))vm.userAnswer=t.charAt(0);else vm.userAnswer=t||'A';}
            console.log('[CNA] userAnswer=',vm.userAnswer);
            if(vm.handleRadioChange)try{vm.handleRadioChange(vm.userAnswer);}catch(e){}
            if(vm.$forceUpdate)vm.$forceUpdate();
        }
        radios[0].click(); radios[0].dispatchEvent(new MouseEvent('click',{bubbles:true}));
        if(vm&&vm.userAnswer&&vm.submitAnswer){vm.submitAnswer();return'submitted';}
        let ok=fBtn(qd,['确定','提交','下一题']); if(ok){ok.click();return'clicked-ok';}
        return'noact';
    }

    // ==================== 评分 ====================
    let ratStep='idle', ratTs=0, rateSubmitted=false;
    let rateSubmittedCount=0;      // 本轮已提交的评分计数
    let lastRatedVideoId=null;    // 上次评分的 videoId

    function doRat(){
        let vm=getVm();

        // Step A: 处理已打开的评分弹窗（提交星星/满意度/点"去评分"）
        let dr=handleRateDlg();
        if(dr&&dr!=='no-dlg'){ratStep='idle'; return dr;}

        // Step B: 打开弹窗（如果需要评分且还没提交过）
        if(vm&&vm.commentRateDialogVisible===false){
            // 跳过条件1: 已提交过本子课程评分
            let curVideoId=vm.rateForm?vm.rateForm.videoId:null;
            if(rateSubmitted&&curVideoId===lastRatedVideoId) return'no-rating';
            // 跳过条件2: rateForm.score>0 且不是 canEvaluateCourse（即评过分了）
            if(vm.rateForm&&vm.rateForm.rateScore>0&&!vm.canEvaluateCourse) return'no-rating';
            // 需要 canEvaluate 为 true 才打开；如果 rateForm.score===0 且 canEvaluate 也打开
            let need=vm.canEvaluateCourse===true;
            if(!need&&vm.rateForm&&vm.rateForm.rateScore===0&&vm.canEvaluateCourse===true) need=true;
            if(need){
                console.log('[CNA] 打开课程评价弹窗');
                if(vm.rateData)vm.rateData.rateStar=5;
                vm.commentRateDialogVisible=true;
                ratStep='opening'; ratTs=Date.now();
                return'opened';
            }
        }

        // Step C: 弹窗已打开，等渲染后提交
        if(vm&&vm.commentRateDialogVisible===true){
            if(ratStep==='opening'&&Date.now()-ratTs<2500)return'wait-render';
            let r=handleRateDlg();
            if(r&&r!=='no-dlg'){
                ratStep='idle';
                // 标记已提交
                if(r==='submitted'||r==='submitted-alt'||r==='submitted-sat'||r==='submitted-lbl'){
                    rateSubmitted=true;
                    lastRatedVideoId=vm.rateForm?vm.rateForm.videoId:null;
                    rateSubmittedCount++;
                }
                return r;
            }
            if(Date.now()-ratTs>15000){console.log('[CNA] 评分弹窗超时,关闭');vm.commentRateDialogVisible=false;ratStep='idle';return'timeout';}
            return'wait-render';
        }

        ratStep='idle'; return'no-rating';
    }

    function handleRateDlg(){
        // 1. "课程评价" el-dialog（含 el-rate / 满意度选择）
        let rd=[...document.querySelectorAll('.el-dialog__wrapper')].find(d=>{return(d.querySelector('.el-dialog__title')||{}).innerText==='课程评价'&&getComputedStyle(d).display!=='none';});
        // 2. el-message-box（"恭喜完成！是否评分？"/"需考虑不评分吗"/满意度等）
        let mb=[...document.querySelectorAll('.el-message-box__wrapper')].find(d=>isVis(d));
        // 3. 兜底：任意可见弹窗含满意度/评分相关关键词
        let fb=!rd&&!mb? [...document.querySelectorAll('.el-dialog__wrapper,.el-message-box__wrapper')].find(d=>{
            if(!isVis(d))return false;
            let t=d.innerText||'';
            return (t.includes('满意度')||t.includes('评分')||t.includes('评价')||t.includes('满意')) &&
                   (d.querySelector('.el-rate__item')||d.querySelector('.el-radio')||d.querySelector('input[type="radio"]'));
        }):null;
        let dlg=rd||mb||fb;
        if(!dlg)return'no-dlg';
        console.log('[CNA] 评分弹窗:',rd?'课程评价':mb?'msg-box':'兜底');
        let dlgTxt=dlg.innerText||'';

        // ── A. "去评分"按钮 → 直接点跳转 ──
        let go=fBtn(dlg,['去评分']);
        if(go){console.log('[CNA] 点击"去评分"');go.click();go.dispatchEvent(new MouseEvent('click',{bubbles:true}));return'clicked-go-rate';}

        // ── B. "需考虑不评分吗？" → 点是/确定 ──
        if(dlgTxt.includes('不评分')){
            let yes=fBtn(dlg,['确定','是']); if(yes){console.log('[CNA] 确认评分(确定)');yes.click();yes.dispatchEvent(new MouseEvent('click',{bubbles:true}));return'confirm-rate';}
            let no=fBtn(dlg,['取消','暂不','否']); if(no){console.log('[CNA] 跳过不评分');no.click();no.dispatchEvent(new MouseEvent('click',{bubbles:true}));return'skip-norate';}
        }

        // ── C. "恭喜完成所有课程学习！是否为课程评分？" → 点确定/是 ──
        if(dlgTxt.includes('恭喜')&&dlgTxt.includes('评分')){
            let cfm=fBtn(dlg,['确定','是','去评分']); if(cfm){console.log('[CNA] 确认去评分');cfm.click();cfm.dispatchEvent(new MouseEvent('click',{bubbles:true}));return'confirmed-rate';}
            let skip=fBtn(dlg,['暂不','取消','否']); if(skip){console.log('[CNA] 暂不去评分');skip.click();skip.dispatchEvent(new MouseEvent('click',{bubbles:true}));return'skip-rate';}
        }

        // ── D. 满意度选择：优先查 el-radio / el-radio-group，再查 el-rate 五星 ──
        // D1. el-radio 满意度（"非常满意"/"满意"/"一般"/"不满意"）
        // 处理两种可能：radio 直接在 body 里，或包在 el-radio-group 中
        let radios=dlg.querySelectorAll('.el-radio, input[type="radio"]');
        if(radios.length<2){
            let rg=dlg.querySelector('.el-radio-group');
            if(rg){ radios=rg.querySelectorAll('.el-radio, input[type="radio"]'); }
        }
        // 如果 .el-radio 仍为空，可能纯 <input> 在外面
        if(radios.length<2&&dlg.querySelector('.el-rate__item')){
            // 跳过：先处理星星再回来看满意度
        } else if(radios.length>=2){
            let tgt=[...radios].find(r=>{let t=(r.innerText||r.textContent||'').trim();return t.includes('非常');})||radios[0];
            console.log('[CNA] 选满意度:',(tgt.innerText||tgt.textContent||'').trim());
            tgt.click(); tgt.dispatchEvent(new MouseEvent('click',{bubbles:true}));
            let inp=tgt.querySelector('input[type="radio"],.el-radio__original');
            if(inp){inp.checked=true;inp.dispatchEvent(new Event('change',{bubbles:true}));}
            let cfm=fBtn(dlg,['提交','确定','完成']);
            if(cfm){console.log('[CNA] 提交满意度');cfm.click();cfm.dispatchEvent(new MouseEvent('click',{bubbles:true}));return'submitted-sat';}
            return'no-submit';
        }

        // D2. el-rate 五星（课程评价星级）
        let er=dlg.querySelector('.el-rate');
        if(er){
            let stars=er.querySelectorAll('.el-rate__item');
            if(stars.length>=3){
                if(er.getAttribute('aria-valuenow')!=='5'){let idx=Math.min(4,stars.length-1);stars[idx].click();stars[idx].dispatchEvent(new MouseEvent('click',{bubbles:true}));let rv=er.__vue__;if(rv&&rv.value!==undefined)rv.value=5;}
                let sb=dlg.querySelector('.comment-footer button,.rate-container button,button.el-button--success');
                if(sb&&!sb.disabled){console.log('[CNA] 提交评分');sb.click();sb.dispatchEvent(new MouseEvent('click',{bubbles:true}));return'submitted';}
                let any=fBtn(dlg,['提交','确定','保存','确认']); if(any){any.click();return'submitted-alt';}
                return'no-submit';
            }
        }

        // ── F. 文字满意度标签（兜底） ──
        if(dlgTxt.includes('满意')&&(dlgTxt.includes('非常')||dlgTxt.includes('一般')||dlgTxt.includes('不满'))){
            let lbs=[...dlg.querySelectorAll('label,span,div,li,button')].filter(el=>{let t=(el.innerText||'').trim();return el.children.length<=1&&t==='非常满意';});
            if(lbs.length){lbs[0].click();lbs[0].dispatchEvent(new MouseEvent('click',{bubbles:true}));let cfm=fBtn(dlg,['提交','确定','完成']);if(cfm){cfm.click();return'submitted-lbl';}}
        }

        // G. 兜底：弹窗里只有确认/关闭类按钮
        let anyBtn=fBtn(dlg,['确定','确认','提交','关闭']);
        if(anyBtn){console.log('[CNA] 兜底点击:',(anyBtn.innerText||'').trim());anyBtn.click();anyBtn.dispatchEvent(new MouseEvent('click',{bubbles:true}));return'fallback-btn';}

        return'no-action';
    }

    // ==================== 核心 ====================
    function getSt(){
        let v=getV(), vm=getVm();
        let items=[...document.querySelectorAll('.item-infos-container')];
        let ls=items.map((el,i)=>{let t=el.innerText.trim();return{i,name:(t.split('\n')[0]||'').trim(),active:el.classList.contains('activeVideo'),status:t.includes('开始')?'start':t.includes('回看')?'done':'?'};});
        let uf=ls.filter(l=>l.status==='start');
        const allDlgs=[...document.querySelectorAll('.el-dialog__wrapper,.el-message-box__wrapper')];
        // 答题弹窗
        let quizVis=allDlgs.some(d=>{let t=(d.querySelector('.el-dialog__title')||{}).innerText||'';return(t==='牛刀小试'||t==='我的答题')&&getComputedStyle(d).display!=='none';});
        // 评分弹窗：el-dialog "课程评价"、msg-box（"不评分"/"恭喜"/满意度等）、Vue 状态
        let rd=allDlgs.some(d=>{return(d.querySelector('.el-dialog__title')||{}).innerText==='课程评价'&&getComputedStyle(d).display!=='none';});
        let mb=allDlgs.some(d=>{if(!isVis(d))return false;let t=d.innerText||'';return t.includes('评分')||t.includes('满意度')||t.includes('不评分')||t.includes('评价')||t.includes('恭喜');});
        // rateDone: rateForm.score>0 或已提交过评分
        let rateDone = (vm&&vm.rateForm&&vm.rateForm.rateScore>0) || rateSubmitted;
        // hasRating: 评分弹窗可见 或 (canEvaluate && !rateDone)
        let cr = vm&&vm.canEvaluateCourse===true;
        let hasRating = (rd||mb) || (cr && !rateDone);
        // 去评分
        let gb=(()=>{
            let bt=document.body.innerText||'';if(!bt.includes('评分')&&!bt.includes('恭喜'))return null;
            return [...document.querySelectorAll('button,.el-button')].find(b=>{let t=(b.innerText||'').trim();return t==='去评分'||t.includes('去评分');})||null;
        })();
        let bt=document.body.innerText||'', dm=bt.match(/(\d+)\s*节已[完成]+/), tm=bt.match(/共\s*(\d+)\s*节/);
        return{v:vi(v),lessons:ls,unfinished:uf.map(l=>l.name),hasQuiz:quizVis||(vm&&vm.questionVisible===true),hasRating:hasRating,hasGoRateBtn:!!gb,rateDone:vm&&vm.rateForm&&vm.rateForm.rateScore>0,done:dm?dm[1]:'?',total:tm?tm[1]:'?',url:location.href,isCoursePage:/course\/detail/.test(location.href),isCourseDotSite:/course\.zhhlxh\.org\.cn/.test(location.href),vmSnap:vm?{qVis:vm.questionVisible,uAns:vm.userAnswer||'',canEval:vm.canEvaluateCourse===true,rateOpen:vm.commentRateDialogVisible===true,rateScore:vm.rateForm?vm.rateForm.rateScore:'?',rateStar:vm.rateData?vm.rateData.rateStar:0}:null};
    }

    // 防止重复调用
    let goNextCourseCalled = false;

    function goNextCourse(){
        if (goNextCourseCalled) return true;
        goNextCourseCalled = true;

        var itemCount = document.querySelectorAll('.item-infos-container').length;

        // 先点"回看"按钮，告诉网站当前子课程已完成
        var activeItem = document.querySelector('.item-infos-container.activeVideo');
        if (activeItem) {
            var replayBtn = activeItem.querySelector('.item-infos-btn button, .el-button');
            if (replayBtn) {
                console.log('[CNA] 点回看按钮');
                replayBtn.click();
                replayBtn.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: false}));
            }
        }

        // 点完回看后，等下一课链接可用
        var tries = 0;
        var check = setInterval(function() {
            tries++;
            var link = document.querySelector('.next-course-link a, .next-course-wrapper a');
            // 也全局搜"下一节课"链接
            if (!link || link.classList.contains('disabled-link')) {
                var allLinks = document.querySelectorAll('a');
                for (var i = 0; i < allLinks.length; i++) {
                    var t = (allLinks[i].innerText || allLinks[i].textContent || '').trim();
                    if (t.includes('下一节课') || t.includes('下一节')) {
                        link = allLinks[i];
                        break;
                    }
                }
            }
            if (link && !link.classList.contains('disabled-link')) {
                clearInterval(check);
                console.log('[CNA] 下一课链接可用，点击跳转:', (link.innerText||'').trim());
                link.click();
                link.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: false}));
                setTimeout(function() { location.reload(); }, 2000);
            } else if (tries > 30) {
                clearInterval(check);
                console.log('[CNA] 超时，强制刷新');
                location.reload();
            }
        }, 500);
        return true;
    }

    function doNxt(){
        let it=[...document.querySelectorAll('.item-infos-container')];
        // 1. 优先找"开始"的未完成子课程
        let uf=it.find(el=>el.innerText.includes('开始')&&!el.classList.contains('activeVideo'));
        if(uf){ let b=uf.querySelector('.item-infos-btn button,.item-infos-btn .el-button,.el-button--mini'); if(b){b.click();return'next:'+uf.innerText.split('\n')[0];} return'nobtn'; }
        // 2. 所有子课程都是"回看" → 跳到下一门课
        return goNextCourse() ? 'nextCourse' : 'all-done';
    }

    function doCor(){ let ac=document.querySelector('.item-infos-container.activeVideo'); if(!ac)return'noactive'; if(!ac.innerText.includes('回看'))return'ok'; let it=[...document.querySelectorAll('.item-infos-container')]; let tg=it.find(el=>el.innerText.includes('开始')); if(tg){ let b=tg.querySelector('.item-infos-btn button,.item-infos-btn .el-button,.el-button--mini'); if(b){b.click();return'switched:'+tg.innerText.split('\n')[0];} return'nobtn'; } return goNextCourse()?'nextCourse':'all-done'; }

    function updSt(){
        let st=getSt(), el=p.querySelector('#st'); if(!el)return st;
        let h='';
        if(st.v&&!st.v.ended&&st.v.dur>0){if(st.v.rate>1)h+='<span class="info">▶ '+st.v.pct+'% 剩'+st.v.rem+'min → <b style="color:#66bb6a">≈'+st.v.rS+'min</b> x'+st.v.rate+'</span><br>';else h+='<span class="info">▶ '+st.v.pct+'% 剩'+st.v.rem+'min x'+st.v.rate+'</span><br>';}
        else if(st.v&&st.v.ended)h+='<span class="warn">✅ 视频结束</span><br>';
        else if(st.v&&st.v.dur===0)h+='<span class="info">⏳ 加载视频...</span><br>';
        else h+='<span class="info">📖 无视频</span><br>';
        h+='<span class="done">['+st.done+'/'+st.total+'节完成]</span> ';
        if(st.hasQuiz)h+='<span class="warn">📝题!</span> ';
        if(st.hasRating)h+='<span class="warn">⭐评分!</span> ';
        if(st.hasGoRateBtn)h+='<span class="warn">🔗去评分!</span> ';
        if(st.isCourseDotSite)h+='<span class="info">📺评分站</span> ';
        if(st.unfinished.length)h+='<br><span class="warn">⏳ 待完成: '+st.unfinished[0]+'</span>';
        // 下一门课预览
        let ncText = getNextCoursePreview();
        if (ncText) h += '<br><span style="font-size:10px;color:#4fc3f7">→ 下一门: '+ncText+'</span>';
        h+='<br><span style="font-size:9px;color:#555">Q:'+(st.vmSnap.qVis?1:0)+' A:'+(st.vmSnap.uAns||'无')+' 评:'+(st.vmSnap.canEval?'可':'否')+'(op:'+(st.vmSnap.rateOpen?1:0)+' s:'+st.vmSnap.rateScore+' ★:'+st.vmSnap.rateStar+')</span>';
        el.innerHTML=h; return st;
    }

    function getNextCoursePreview() {
        var vm = getVm();
        if (vm && vm.nextCourseInfo && vm.nextCourseInfo.courseName) return vm.nextCourseInfo.courseName;
        var nw = document.querySelector('.next-course-wrapper a');
        if (!nw) nw = document.querySelector('.next-course-wrapper button');
        if (!nw) nw = document.querySelector('.next-course-wrapper .el-button');
        if (nw) {
            var t = (nw.innerText || nw.textContent || '').trim();
            var m = t.match(/下一节[课]?\s*[：:]\s*(.+)/);
            return m ? m[1] : t;
        }
        return '';
    }

    // ==================== 主循环 ====================
    let qr=0, rr=0;
    async function loop(){
        try{
            let st=updSt(), v=getV();
            if(v&&v.playbackRate!==curSpd)v.playbackRate=curSpd;
            // 始终静音
            if(v&&!v.muted&&audioMuted){v.muted=true;v.volume=0;}

            // A. 评分站 (course.zhhlxh.org.cn)
            if(st.isCourseDotSite){if(st.hasRating){rr++;console.log('[CNA] 评分站#'+rr);let r=doRat();console.log('[CNA] ',r);if(r==='no-rating')rr=0;return;}rr=0;if(v&&v.paused&&!v.ended)v.play();return;}

            // B. 课程站 (study.zhhlxh.org.cn)
            // B1 答题
            if(st.hasQuiz&&st.isCoursePage){
                qr++;
                let r=doAns();
                if(r==='triggered-load'){
                    if(qr>8){console.log('[CNA] 答题超时');let vm=getVm();if(vm&&vm.closeQuestion)vm.closeQuestion();qr=0;}
                    // 不要阻塞: 即使加载失败，下次循环继续
                }
                if(r==='no-quiz')qr=0;
                return;
            }
            qr=0;
            // B2 评分 —— 仅当 canEvaluate 为 true 且 rateDone 为 false 时才触发，只评一次
            // 注意: 不要因 hasRating 误判（弹窗已打开但未提交）而重复弹出
            if(st.hasRating && st.isCoursePage && !st.rateDone){
                rr++;console.log('[CNA] 评分#'+rr+' step='+ratStep);let r=doRat();console.log('[CNA] ',r);
                if(r==='no-rating'||r==='submitted'||r==='submitted-alt'||r==='submitted-sat'||r==='submitted-lbl'||r==='clicked-go-rate'||r==='confirm-rate'||r==='skip-norate'){
                    rr=0;rateSubmitted=true;
                }
                if(rr>12){console.log('[CNA] 评分超时, 强制关闭');let vm=getVm();if(vm)vm.commentRateDialogVisible=false;ratStep='idle';rr=0;}
                return;
            }
            rr=0; ratStep='idle';
            // B3 去评分
            if(st.hasGoRateBtn&&st.isCoursePage){console.log('[CNA] 去评分');let bs=[...document.querySelectorAll('button,.el-button')];let gb=bs.find(b=>{let t=(b.innerText||'').trim();return t==='去评分'||t.includes('去评分');});if(gb){gb.click();gb.dispatchEvent(new MouseEvent('click',{bubbles:true}));}return;}
            // B4 全部回看+最后一个视频结束 → 直接评分+点"下一节课"
            {
                var ac = document.querySelector('.item-infos-container.activeVideo');
                var todoItems = [...document.querySelectorAll('.item-infos-container')];
                var todo = todoItems.find(function(el){
                    return el.innerText.includes('开始') && !el.classList.contains('activeVideo');
                });
                var allDone = !todoItems.some(function(el){ return el.innerText.includes('开始'); });
                var lastItem = todoItems[todoItems.length - 1];
                var isOnLastVideo = ac && lastItem && ac === lastItem;

                // A: 全部回看 + 不在最后一个 → 切到最后
                if (allDone && !isOnLastVideo) {
                    var b = lastItem.querySelector('.item-infos-btn button,.item-infos-btn .el-button,.el-button--mini');
                    if (b) { b.click(); console.log('[CNA] 切到最后子课程'); return; }
                }
                // B: 全部回看 + 正在最后一个 + 已结束 → 直接评分后点下一课
                if (allDone && isOnLastVideo && st.v && st.v.ended) {
                    // 先确保打完分
                    if (!st.rateDone) {
                        var vm = getVm();
                        if (vm) { vm.commentRateDialogVisible = true; }
                    }
                    // 直接点"下一节课"链接
                    if (goNextCourse()) {
                        console.log('[CNA] 最后视频结束→评分→点下一课');
                        return;
                    }
                }
                // C: 未完成 → 切到最后未完成
                if (!allDone && ac && ac.innerText.includes('回看') && todo) {
                    var lastTodo = todoItems.filter(function(el){
                        return el.innerText.includes('开始');
                    }).pop();
                    if (lastTodo && lastTodo !== ac) {
                        var bb = lastTodo.querySelector('.item-infos-btn button,.item-infos-btn .el-button,.el-button--mini');
                        if (bb) { bb.click(); console.log('[CNA] 切到最后未完成子课程'); return; }
                    }
                }
            }
            if(st.v&&st.v.ended){
                let s2=getSt(); if(s2.hasQuiz||s2.hasRating||s2.hasGoRateBtn)return;
                let nxt=doNxt(); console.log('[CNA] 视频结束→',nxt);
                return;
            }
            // B6 播放
            if(v&&v.paused&&!v.ended)v.play();
        }catch(e){console.error('[CNA]',e);}
    }

    // ==================== 启动 ====================
    console.log('🤖 中华护理学会 刷课助手 v4.1 已加载');

    // 确保 body-container 已挂载（SPA 页面可能异步渲染）
    function initWhenReady(retries) {
        retries = retries || 0;
        var vm = getVm();
        if (!vm) {
            if (retries < 30) {
                setTimeout(function() { initWhenReady(retries + 1); }, 500);
            } else {
                console.log('[CNA] ⚠️ Vue 实例超时未找到，使用 DOM 模式');
                // 即使没找到 Vue，也要启动主循环
                appSpd(curSpd); updSt();
                renderMuteBtn();
                muteVideos(audioMuted);
            }
            return;
        }
        console.log('[CNA] ✅ Vue 已连接 (初始化延迟 ' + (retries * 0.5) + 's)');
        window.__cna_vm = vm;
        appSpd(curSpd);
        updSt();
        renderMuteBtn();
        muteVideos(audioMuted);
    }
    initWhenReady();
    setInterval(loop, POLL_MS);
})();
