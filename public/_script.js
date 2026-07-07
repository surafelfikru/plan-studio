class Component extends DCLogic {
  constructor(props){
    super(props);
    this.docRef = React.createRef();
    this.chatRef = React.createRef();
    this._cid = 0;
    this._libTries = 0;
    this._slugSeen = {};
    this.state = {
      theme:'dark', sidebarOpen:true, chatOpen:true, sidebarW:280, chatW:382,
      mode:'read', winW:(typeof window!=='undefined'?window.innerWidth:1440),
      planQuery:'',
      plans:[], activeSlug:null, doc:null, fmPrefix:'', sections:[],
      folds:{}, editing:null, editSrc:'',
      activeHeading:null,
      mm:{}, coderefs:{}, diffs:{}, mmFull:null,
      model:'Claude Haiku', modelOpen:false,
      dirty:false, lastSaved:'—', errors:0,
      chatInput:'', sending:false,
      messages:[{role:'assistant', text:"Side thread on a cheaper model — separate from your main Claude Code session. Ask me about the plan; I can explain it or draft edits without spending your main context."}],
      toast:null, contexts:[], tweaks:[], tweaksOpen:false, sel:null,
    };
  }

  componentDidMount(){
    this.applyTheme();
    this._tryLibs();
    this._mup=(e)=>this._onResizeMove(e);
    this._muup=(e)=>{ this._onResizeUp(); this._checkSelection(e); };
    window.addEventListener('mousemove', this._mup);
    window.addEventListener('mouseup', this._muup);
    this._rs=()=>this.setState({winW:window.innerWidth});
    window.addEventListener('resize', this._rs);
    this._wheel=(e)=>this._onWheel(e);
    window.addEventListener('wheel', this._wheel, {passive:false});
    this._key=(e)=>{ if(e.key==='Escape' && this.state.mmFull) this.setState({mmFull:null}); };
    window.addEventListener('keydown', this._key);
    this.loadPlans().then(()=>{
      let want=null; try{ want=new URL(window.location.href).searchParams.get('plan'); }catch(e){}
      const slug = want || (this.state.plans[0] && this.state.plans[0].slug);
      if(slug) this.selectPlan(slug);
    });
    this.subscribeEvents();
  }
  componentWillUnmount(){
    window.removeEventListener('mousemove', this._mup);
    window.removeEventListener('mouseup', this._muup);
    window.removeEventListener('resize', this._rs);
    window.removeEventListener('wheel', this._wheel);
    window.removeEventListener('keydown', this._key);
    if(this._es) this._es.close();
  }
  componentDidUpdate(prevProps, prev){
    if(!prev) return;
    if(prev.theme !== this.state.theme){ this.applyTheme(); this._rerenderMermaid(); }
  }

  applyTheme(){ try{ document.body.classList.toggle('light', this.state.theme==='light'); }catch(e){} }
  _now(){ const t=new Date(); const p=n=>String(n).padStart(2,'0'); return p(t.getHours())+':'+p(t.getMinutes())+':'+p(t.getSeconds()); }
  flash(msg){ this.setState({toast:msg}); clearTimeout(this._toastT); this._toastT=setTimeout(()=>this.setState({toast:null}),1900); }

  _tryLibs(){
    if(window.marked && window.mermaid){
      try{ window.marked.setOptions({breaks:false, gfm:true}); }catch(e){}
      this.forceUpdate();
      this.renderMermaidAll();
      return;
    }
    if(this._libTries++ < 60){ setTimeout(()=>this._tryLibs(), 120); } else this.forceUpdate();
  }

  // ---------- data ----------
  async loadPlans(){
    try{ const r=await fetch('/api/plans'); const j=await r.json(); this.setState({plans:j.plans||[]}); }
    catch(e){ this.flash('failed to load plans'); }
  }
  subscribeEvents(){
    try{
      const es=new EventSource('/api/events'); this._es=es;
      es.addEventListener('plans-changed',(e)=>{
        this.loadPlans();
        let d={}; try{ d=JSON.parse(e.data||'{}'); }catch(_){}
        if(!this.state.editing && this.state.activeSlug && (!d.slug || d.slug===this.state.activeSlug)){
          this.loadDoc(this.state.activeSlug, true);
        }
      });
    }catch(e){}
  }
  selectPlan(slug){
    if(!slug) return;
    this.loadDoc(slug);
    try{ const u=new URL(window.location.href); u.searchParams.set('plan',slug); history.replaceState(null,'',u); }catch(e){}
  }
  async loadDoc(slug, quiet){
    try{
      const r=await fetch('/api/plans/'+encodeURIComponent(slug));
      if(!r.ok){ this.flash('plan not found'); return; }
      const doc=await r.json();
      const body=doc.body||'';
      const fmPrefix = doc.content.length>=body.length ? doc.content.slice(0, doc.content.length-body.length) : '';
      const sections=this.splitSections(body);
      const first=sections.find(s=>s.headingLine);
      this.setState({
        activeSlug:slug, doc, fmPrefix, sections,
        folds:{}, editing:null, mm:{}, coderefs:{}, diffs:{}, errors:0, dirty:false,
        lastSaved:this._now(), activeHeading:first?first.id:null,
      }, ()=>{ this.fetchCodeRefs(); this.renderMermaidAll(); if(this.docRef.current) this.docRef.current.scrollTop=0; });
    }catch(e){ this.flash('failed to load plan'); }
  }

  // ---------- markdown / block parsing ----------
  _slug(t){
    let s=(t||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'section';
    let base=s, i=2; while(this._slugSeen[s]){ s=base+'-'+(i++); } this._slugSeen[s]=true; return s;
  }
  splitSections(body){
    this._slugSeen={};
    const re=/^(#{2,6})[ \t]+(.+?)[ \t]*$/gm;
    const heads=[]; let m;
    while((m=re.exec(body))){ heads.push({idx:m.index, end:re.lastIndex, line:m[0], level:m[1].length, title:m[2].trim()}); }
    const sections=[];
    const introEnd = heads.length ? heads[0].idx : body.length;
    sections.push(this._mkSection('__intro__',0,'','', body.slice(0,introEnd), 0));
    for(let i=0;i<heads.length;i++){
      const h=heads[i]; let bs=h.end; if(body[bs]==='\n') bs+=1;
      const nextIdx = i+1<heads.length ? heads[i+1].idx : body.length;
      sections.push(this._mkSection(this._slug(h.title), h.level, h.title, h.line, body.slice(bs,nextIdx), i+1));
    }
    return sections;
  }
  _mkSection(id, level, title, headingLine, body, si){
    return {id, level, title, headingLine, body, si, rawBlocks:this._parseBlocks(body, si)};
  }
  _parseBlocks(text, si){
    const re=/```(mermaid|plan-diff|code-ref|callout|resource)[ \t]*\r?\n([\s\S]*?)```/g;
    const blocks=[]; let last=0, m, bi=0;
    const pushProse=(str)=>{ if(str.replace(/^\s+|\s+$/g,'')) blocks.push({id:'s'+si+'b'+(bi++), type:'prose', text:str}); else bi++; };
    while((m=re.exec(text))){
      pushProse(text.slice(last, m.index));
      blocks.push(this._typedBlock('s'+si+'b'+(bi++), m[1], m[2]));
      last=re.lastIndex;
    }
    pushProse(text.slice(last));
    return blocks;
  }
  _typedBlock(id, lang, inner){
    if(lang==='mermaid') return {id, type:'mermaid', src:inner.replace(/\s+$/,'')};
    if(lang==='callout'){ const r=this._meta(inner); return {id, type:'callout', ctype:(r.meta.type||'note'), text:r.rest.trim()}; }
    if(lang==='resource'){ const r=this._meta(inner); return {id, type:'resource', url:r.meta.url||'#', title:r.meta.title||r.meta.url||'link'}; }
    if(lang==='code-ref'){ const r=this._meta(inner); const rng=(r.meta.lines||'').split('-'); return {id, type:'coderef', file:r.meta.file||'', note:r.meta.note||'', start:parseInt(rng[0]||'1',10)||1, end:parseInt(rng[1]||rng[0]||'1',10)||1}; }
    if(lang==='plan-diff') return Object.assign({id, type:'diff'}, this._parseDiff(inner));
    return {id, type:'prose', text:inner};
  }
  _meta(inner){
    const lines=inner.split('\n'); const meta={}; let i=0;
    for(; i<lines.length; i++){ const mm=lines[i].match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/); if(!mm) break; meta[mm[1]]=mm[2].trim(); }
    return {meta, rest:lines.slice(i).join('\n')};
  }
  _parseDiff(inner){
    const r=this._meta(inner); let lines=r.rest.split('\n');
    while(lines.length && lines[lines.length-1]==='') lines.pop();
    let hunk='';
    if(lines[0] && lines[0].indexOf('@@')===0){ hunk=lines[0]; lines=lines.slice(1); }
    let newNo=1; const hm=hunk.match(/\+(\d+)/); if(hm) newNo=parseInt(hm[1],10);
    let adds=0, dels=0; const rows=[];
    for(const ln of lines){
      const c=ln.charAt(0); let sgn=' ', code=ln;
      if(c==='+'){ sgn='+'; code=ln.slice(1); }
      else if(c==='-'){ sgn='-'; code=ln.slice(1); }
      else if(c===' '){ code=ln.slice(1); }
      if(sgn==='+'){ adds++; rows.push(this._drow(newNo++, '+', code)); }
      else if(sgn==='-'){ dels++; rows.push(this._drow('', '-', code)); }
      else { rows.push(this._drow(newNo++, ' ', code)); }
    }
    return {file:r.meta.file||'(file)', adds:'+'+adds, dels:'−'+dels, hunk:hunk||('@@ '+(r.meta.file||'')+' @@'), rows};
  }
  _drow(ln,sgn,code){
    const add=sgn==='+', del=sgn==='-';
    return {ln:String(ln), sgn:sgn||' ', code,
      bg:add?'var(--addbg)':del?'var(--delbg)':'transparent',
      gut:add?'var(--addgut)':del?'var(--delgut)':'transparent',
      sgncol:add?'var(--addtx)':del?'var(--deltx)':'var(--fainter)',
      txt:add?'var(--addtx)':del?'var(--deltx)':'var(--dim)'};
  }

  async fetchCodeRefs(){
    const doc=this.state.doc;
    const root=(doc && ((doc.frontmatter&&doc.frontmatter.root) || doc.root)) || '';
    for(const sec of this.state.sections){
      for(const b of sec.rawBlocks){
        if(b.type!=='coderef') continue;
        const id=b.id;
        if(!root){ this.setState(s=>({coderefs:{...s.coderefs,[id]:{error:'no root in plan frontmatter'}}})); continue; }
        try{
          const u='/api/file?root='+encodeURIComponent(root)+'&path='+encodeURIComponent(b.file)+'&start='+b.start+'&end='+b.end;
          const r=await fetch(u);
          if(!r.ok){ const j=await r.json().catch(()=>({})); this.setState(s=>({coderefs:{...s.coderefs,[id]:{error:(j.error||('HTTP '+r.status))}}})); continue; }
          const j=await r.json();
          const rows=(j.lines||[]).map((code,i)=>({ln:String(j.start+i), code}));
          this.setState(s=>({coderefs:{...s.coderefs,[id]:{rows}}}));
        }catch(e){ this.setState(s=>({coderefs:{...s.coderefs,[id]:{error:'fetch failed'}}})); }
      }
    }
  }

  // ---------- mermaid ----------
  _mmTheme(){
    return this.state.theme==='light' ? {
      background:'transparent', primaryColor:'#eaeef2', primaryBorderColor:'#8c959f', primaryTextColor:'#1f2328',
      secondaryColor:'#dde3ea', tertiaryColor:'#f0f3f6', lineColor:'#57606a',
      mainBkg:'#eaeef2', nodeBkg:'#eaeef2', nodeBorder:'#8c959f',
      textColor:'#1f2328', secondaryTextColor:'#1f2328', tertiaryTextColor:'#1f2328', titleColor:'#1f2328',
      nodeTextColor:'#1f2328', actorTextColor:'#1f2328', signalTextColor:'#1f2328', labelTextColor:'#1f2328', loopTextColor:'#1f2328', classText:'#1f2328',
      actorBkg:'#eaeef2', actorBorder:'#8c959f', labelBoxBkgColor:'#dde3ea', labelBoxBorderColor:'#8c959f',
      activationBkgColor:'#dde3ea', activationBorderColor:'#8c959f',
      noteBkgColor:'#fff8c5', noteTextColor:'#1f2328', noteBorderColor:'#d4a72c',
      edgeLabelBackground:'#ffffff', clusterBkg:'#f0f3f6', clusterBorder:'#8c959f',
      fontFamily:'Geist Mono, monospace', fontSize:'13px'
    } : {
      background:'transparent', primaryColor:'#161b22', primaryBorderColor:'#6a737d', primaryTextColor:'#f0f6fc',
      secondaryColor:'#13181f', tertiaryColor:'#0f141a', lineColor:'#9aa5b1',
      mainBkg:'#161b22', nodeBkg:'#161b22', nodeBorder:'#6a737d',
      textColor:'#e6edf3', secondaryTextColor:'#e6edf3', tertiaryTextColor:'#e6edf3', titleColor:'#f0f6fc',
      nodeTextColor:'#f0f6fc', actorTextColor:'#f0f6fc', signalTextColor:'#e6edf3', labelTextColor:'#f0f6fc', loopTextColor:'#e6edf3', classText:'#f0f6fc',
      actorBkg:'#161b22', actorBorder:'#6a737d', labelBoxBkgColor:'#13181f', labelBoxBorderColor:'#444c56',
      activationBkgColor:'#1f262e', activationBorderColor:'#6a737d',
      noteBkgColor:'#222b35', noteTextColor:'#f0f6fc', noteBorderColor:'#6a737d',
      edgeLabelBackground:'#0f141a', clusterBkg:'#0f141a', clusterBorder:'#444c56',
      fontFamily:'Geist Mono, monospace', fontSize:'13px'
    };
  }
  renderMermaidAll(){
    if(!window.mermaid) return;
    try{ window.mermaid.initialize({startOnLoad:false, securityLevel:'loose', theme:'base', themeVariables:this._mmTheme()}); }catch(e){}
    for(const sec of this.state.sections){
      for(const b of sec.rawBlocks){
        if(b.type!=='mermaid') continue;
        const view=(this.state.mm[b.id]&&this.state.mm[b.id].view)||'rendered';
        if(view==='rendered') this._renderOne(b.id, b.src);
      }
    }
  }
  _rerenderMermaid(){ this.setState(s=>{ const mm={...s.mm}; for(const k in mm) mm[k]={...mm[k], svg:''}; return {mm, errors:0}; }, ()=>this.renderMermaidAll()); }
  _renderOne(id, src){
    try{
      const rid='mmd_'+id+'_'+Math.floor(Math.random()*1e6);
      window.mermaid.render(rid, src).then((res)=>{
        this.setState(s=>{ const c=s.mm[id]||{view:'rendered',zoom:1,panX:0,panY:0}; return {mm:{...s.mm,[id]:{...c, view:c.view||'rendered', zoom:c.zoom||1, svg:res.svg}}}; });
      }).catch(()=>{ this.setState(s=>{ const c=s.mm[id]||{view:'rendered',zoom:1,panX:0,panY:0}; return {errors:s.errors+1, mm:{...s.mm,[id]:{...c, svg:''}}}; }); });
    }catch(e){ this.setState(s=>({errors:s.errors+1})); }
  }
  _mm(id){ const c=this.state.mm[id]||{}; return {view:c.view||'rendered', zoom:c.zoom||1, svg:c.svg||'', panX:c.panX||0, panY:c.panY||0}; }
  _setMM(id, patch){ this.setState(s=>{ const c=s.mm[id]||{view:'rendered',zoom:1,svg:'',panX:0,panY:0}; return {mm:{...s.mm,[id]:{...c,...patch}}}; }); }
  _clampZoom(z){ return Math.min(40, Math.max(0.1, +z.toFixed(3))); }
  mmZoom(id,factor){ const c=this._mm(id); this._setMM(id,{zoom:this._clampZoom(c.zoom*factor)}); }
  mmFit(id){ this._setMM(id,{zoom:1, panX:0, panY:0}); }
  mmPanStart(id,e){ if(e&&e.preventDefault)e.preventDefault(); const c=this._mm(id); this._panning={id, sx:e.clientX, sy:e.clientY, bx:c.panX, by:c.panY}; document.body.style.cursor='grabbing'; document.body.style.userSelect='none'; }
  mmOpenFull(id){ this.setState({mmFull:id}); const b=this._findBlock(id); const c=this._mm(id); if(b && !c.svg) this._renderOne(id,b.src); }
  mmCloseFull(){ this.setState({mmFull:null}); }
  _onWheel(e){ const vp=(e.target && e.target.closest)?e.target.closest('.mm-viewport'):null; if(!vp) return; e.preventDefault(); const id=vp.getAttribute('data-mm-id'); if(!id) return; const rect=vp.getBoundingClientRect(); const cx=e.clientX-rect.left, cy=e.clientY-rect.top; const c=this._mm(id); const factor=e.deltaY<0?1.12:1/1.12; const z2=this._clampZoom(c.zoom*factor); const k=z2/c.zoom; this._setMM(id,{zoom:z2, panX:cx-(cx-c.panX)*k, panY:cy-(cy-c.panY)*k}); }
  mmToggleSource(id){ this.setState(s=>{ const c=s.mm[id]||{view:'rendered',zoom:1,svg:'',panX:0,panY:0}; return {mm:{...s.mm,[id]:{...c,view:c.view==='source'?'rendered':'source'}}}; }, ()=>{ const c=this._mm(id); if(c.view==='rendered' && !c.svg){ const b=this._findBlock(id); if(b) this._renderOne(id,b.src); } }); }
  _findBlock(id){ for(const sec of this.state.sections){ for(const b of sec.rawBlocks){ if(b.id===id) return b; } } return null; }

  // ---------- diff ----------
  _diff(id){ return this.state.diffs[id]||{view:'unified', collapsed:false}; }
  diffViewSet(id,v){ this.setState(s=>({diffs:{...s.diffs,[id]:{...(s.diffs[id]||{view:'unified',collapsed:false}), view:v}}})); if(v==='split') this.flash('split view'); }
  diffCollapse(id){ this.setState(s=>{ const c=s.diffs[id]||{view:'unified',collapsed:false}; return {diffs:{...s.diffs,[id]:{...c,collapsed:!c.collapsed}}}; }); }

  // ---------- resize / scroll / fold ----------
  _onResizeMove(e){ if(this._panning){ this._setMM(this._panning.id,{panX:this._panning.bx+(e.clientX-this._panning.sx), panY:this._panning.by+(e.clientY-this._panning.sy)}); return; } if(!this._resizing) return; const dx=e.clientX-this._startX; if(this._resizing==='sidebar'){ this.setState({sidebarW:Math.min(440,Math.max(208,this._startW+dx))}); } else { this.setState({chatW:Math.min(560,Math.max(300,this._startW-dx))}); } }
  _onResizeUp(){ this._resizing=null; this._panning=null; document.body.style.cursor=''; document.body.style.userSelect=''; }
  startResizeSidebar(e){ this._resizing='sidebar'; this._startX=e.clientX; this._startW=this.state.sidebarW; document.body.style.cursor='col-resize'; document.body.style.userSelect='none'; e.preventDefault(); }
  startResizeChat(e){ this._resizing='chat'; this._startX=e.clientX; this._startW=this.state.chatW; document.body.style.cursor='col-resize'; document.body.style.userSelect='none'; e.preventDefault(); }
  onDocScroll(){ const c=this.docRef.current; if(!c) return; const ids=this.state.sections.filter(s=>s.headingLine).map(s=>s.id); let cur=ids[0]; for(const id of ids){ const h=document.getElementById(id); if(h && (h.offsetTop - c.offsetTop - c.scrollTop) < 140) cur=id; } if(cur && cur!==this.state.activeHeading) this.setState({activeHeading:cur}); }
  gotoHeading(id){ const c=this.docRef.current; const h=document.getElementById(id); if(c&&h) c.scrollTo({top:Math.max(0,h.offsetTop-c.offsetTop-18), behavior:'smooth'}); }
  fold(id){ this.setState(s=>({folds:{...s.folds,[id]:!s.folds[id]}})); }

  // ---------- edit / save ----------
  startEdit(id){ const sec=this.state.sections.find(s=>s.id===id); if(!sec) return; this.setState({editing:id, editSrc:sec.body, mode:'edit'}); }
  cancelEdit(){ this.setState({editing:null}); }
  onEditInput(e){ this.setState({editSrc:e.target.value, dirty:true}); }
  async saveSection(){
    const id=this.state.editing; if(!id) return;
    const sections=this.state.sections.map(s=> s.id===id ? {...s, body:this.state.editSrc} : s);
    const body=sections.map(s=> s.headingLine ? (s.headingLine+'\n'+s.body) : s.body).join('');
    const content=this.state.fmPrefix + body;
    try{
      const r=await fetch('/api/plans/'+encodeURIComponent(this.state.activeSlug), {method:'PUT', headers:{'content-type':'text/plain','x-base-version':(this.state.doc&&this.state.doc.version)||''}, body:content});
      if(r.status===409){ this.flash('conflict — file changed on disk; reloading'); this.loadDoc(this.state.activeSlug,true); return; }
      if(!r.ok){ this.flash('save failed'); return; }
      this.setState({editing:null, dirty:false, lastSaved:this._now()});
      this.flash('section saved to ~/.claude/plans');
      this.loadDoc(this.state.activeSlug, true);
    }catch(e){ this.flash('save failed'); }
  }

  // ---------- chat ----------
  _scrollChat(){ const c=document.getElementById('chatScroll'); if(c) c.scrollTop=c.scrollHeight; }
  async send(){
    const text=this.state.chatInput.trim(); if(!text||this.state.sending||!this.state.activeSlug) return;
    const ctx=(this.state.contexts||[]).map(c=>({kind:c.kind, label:c.label}));
    const section=(this.state.contexts||[]).map(c=>c.text).filter(Boolean).join('\n\n')||undefined;
    const msgs=this.state.messages.concat([{role:'user', text, ctx}]);
    this.setState({messages:msgs, chatInput:'', sending:true, contexts:[]}, ()=>this._scrollChat());
    const apiMsgs=msgs.map(m=>({role:m.role, content:m.text}));
    try{
      const res=await fetch('/api/chat/'+encodeURIComponent(this.state.activeSlug), {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({messages:apiMsgs, section})});
      if(!res.ok || !res.body){ this.setState({sending:false}); this.flash('chat failed'); return; }
      this.setState(s=>({sending:false, messages:s.messages.concat([{role:'assistant', text:'', streaming:true}])}), ()=>this._scrollChat());
      const reader=res.body.getReader(); const dec=new TextDecoder(); let buf=''; let acc='';
      const update=(t)=>this.setState(s=>{ const ms=s.messages.slice(); for(let i=ms.length-1;i>=0;i--){ if(ms[i].streaming){ ms[i]={...ms[i], text:t}; break; } } return {messages:ms}; }, ()=>this._scrollChat());
      const finish=()=>this.setState(s=>{ const ms=s.messages.slice(); for(let i=ms.length-1;i>=0;i--){ if(ms[i].streaming){ ms[i]={...ms[i], streaming:false}; break; } } return {messages:ms}; });
      while(true){
        const rd=await reader.read(); if(rd.done) break;
        buf+=dec.decode(rd.value,{stream:true});
        let nl;
        while((nl=buf.indexOf('\n\n'))>=0){
          const chunk=buf.slice(0,nl); buf=buf.slice(nl+2);
          let ev='message', data='';
          chunk.split('\n').forEach(line=>{ if(line.indexOf('event:')===0) ev=line.slice(6).trim(); else if(line.indexOf('data:')===0) data=line.slice(5).trim(); });
          if(!data) continue;
          let j={}; try{ j=JSON.parse(data); }catch(_){}
          if(ev==='delta' && j.text){ acc+=j.text; update(acc); }
          else if(ev==='done'){ if(j.text) acc=j.text; update(acc); }
          else if(ev==='error'){ acc+='\n\n_(error: '+(j.message||'failed')+')_'; update(acc); }
        }
      }
      finish();
    }catch(e){ this.setState({sending:false}); this.flash('chat failed'); }
  }

  // ---------- selection popover / contexts / tweaks ----------
  _trunc(t,n){ t=(t||'').replace(/\s+/g,' ').trim(); return t.length>n? t.slice(0,n-1)+'…':t; }
  _checkSelection(e){
    if(this._resizing) return;
    if(e&&e.target&&e.target.closest&&e.target.closest('[data-sel-keep]')) return;
    const sel=window.getSelection?window.getSelection():null;
    const text=sel?String(sel).trim():'';
    const docEl=this.docRef.current;
    if(!sel||!sel.rangeCount||text.length<2||!docEl){ if(this.state.sel) this.setState({sel:null}); return; }
    const range=sel.getRangeAt(0); let node=range.commonAncestorContainer; if(node&&node.nodeType===3) node=node.parentNode;
    if(!node||!docEl.contains(node)){ if(this.state.sel) this.setState({sel:null}); return; }
    const r=range.getBoundingClientRect(); if(!r||(!r.width&&!r.height)) return;
    const x=Math.min(window.innerWidth-20,Math.max(140,r.left+r.width/2)); const y=Math.min(window.innerHeight-90,r.bottom+8);
    this.setState({sel:{x,y,text,mode:'actions',draft:''}});
  }
  addContext(type,text){ const exists=(this.state.contexts||[]).some(c=>c.text===text&&c.type===type); if(exists){ this.flash('context already added'); this.setState({sel:null}); return; } const c={id:'cx'+(++this._cid), type, kind:type==='section'?'section':'text', label:this._trunc(text,42), text}; this.setState(st=>({contexts:st.contexts.concat([c]), chatOpen:true, sel:null})); this.flash('added to chat context'); }
  removeContext(id){ this.setState(st=>({contexts:st.contexts.filter(c=>c.id!==id)})); }
  selAddToChat(){ if(this.state.sel) this.addContext('text', this.state.sel.text); }
  selAddTweak(){ const sel=this.state.sel; if(!sel) return; const instruction=(sel.draft||'').trim(); if(!instruction){ this.flash('describe the change first'); return; } const t={id:'tw'+(++this._cid), excerpt:'“'+this._trunc(sel.text,90)+'”', instruction}; this.setState(st=>({tweaks:st.tweaks.concat([t]), sel:null, tweaksOpen:true})); this.flash('tweak added'); }
  removeTweak(id){ this.setState(st=>({tweaks:st.tweaks.filter(t=>t.id!==id)})); }
  submitTweaks(){ const n=this.state.tweaks.length; if(!n) return; const lines=this.state.tweaks.map(t=>'- '+t.instruction+'  ('+t.excerpt+')').join('\n'); this.setState(st=>({tweaks:[], tweaksOpen:false, chatOpen:true, chatInput:(st.chatInput?st.chatInput+'\n':'')+'Please draft edits for these tweaks:\n'+lines})); this.flash('tweaks moved to chat input — review & send'); }
  askAbout(label,id){ this.gotoHeading(id); this.addContext('section', label); }

  // ---------- view-model helpers ----------
  _dayLabel(ms){ const d=new Date(ms); const now=new Date(); const sd=new Date(now.getFullYear(),now.getMonth(),now.getDate()); const diff=Math.floor((sd - new Date(d.getFullYear(),d.getMonth(),d.getDate()))/86400000); if(diff<=0) return 'TODAY'; if(diff===1) return 'YESTERDAY'; return 'EARLIER'; }
  _timeLabel(ms){ const d=new Date(ms); const p=n=>String(n).padStart(2,'0'); const lbl=this._dayLabel(ms); if(lbl==='EARLIER') return (d.getMonth()+1)+'/'+d.getDate(); return p(d.getHours())+':'+p(d.getMinutes()); }

  renderVals(){
    const s=this.state;
    const md=(src)=>{ try{ return window.marked?window.marked.parse(src||''):(src||'').replace(/\n/g,'<br>'); }catch(e){ return src||''; } };
    const el=(html)=>React.createElement('div',{dangerouslySetInnerHTML:{__html:html}});
    const doc=s.doc;

    // ----- sidebar -----
    const q=s.planQuery.trim().toLowerCase();
    const order={TODAY:0,YESTERDAY:1,EARLIER:2};
    const gmap={};
    (s.plans||[]).forEach(p=>{ if(q && p.title.toLowerCase().indexOf(q)<0) return; const lbl=this._dayLabel(p.mtimeMs); (gmap[lbl]=gmap[lbl]||[]).push(p); });
    const groups=Object.keys(gmap).sort((a,b)=>order[a]-order[b]).map(lbl=>{
      const items=gmap[lbl].map(p=>{ const active=p.slug===s.activeSlug; return { id:p.slug, title:p.title, meta:(p.status?p.status+' · ':'')+'edited '+this._timeLabel(p.mtimeMs), ver:(p.status?p.status.split(/[\s—-]/)[0]:'md'), onClick:()=>this.selectPlan(p.slug), bg:active?'var(--active)':'transparent', bd:active?'var(--border)':'1px solid transparent', dot:active?'var(--green)':'var(--fainter)', tcol:active?'var(--text)':'var(--dim)', tw:active?'600':'400', showVersions:false }; });
      return {label:lbl, count:items.length, items};
    });
    const planCount=(s.plans||[]).length;

    // ----- toc -----
    const toc=s.sections.filter(x=>x.headingLine).map(x=>({ id:x.id, label:x.title, onClick:()=>this.gotoHeading(x.id), col:x.id===s.activeHeading?'var(--text)':'var(--faint)', bar:x.id===s.activeHeading?'var(--text)':'var(--border)' }));

    // ----- document blocks -----
    const blocks=[];
    s.sections.forEach((sec)=>{
      if(sec.headingLine){
        blocks.push({ isHeading:true, hid:sec.id, label:sec.title, chev:s.folds[sec.id]?'▸':'▾', fold:()=>this.fold(sec.id), copy:()=>{ try{ navigator.clipboard.writeText(location.origin+location.pathname+'?plan='+s.activeSlug+'#'+sec.id); }catch(e){} this.flash('copied #'+sec.id+' link'); }, ask:()=>this.askAbout(sec.title, sec.id), canEdit:s.mode==='edit', edit:()=>this.startEdit(sec.id) });
        if(s.folds[sec.id]) return;
      }
      if(s.editing===sec.id){
        blocks.push({ isEditor:true, src:s.editSrc, rows:Math.min(34,Math.max(6,(s.editSrc.split('\n').length+1))), onInput:(e)=>this.onEditInput(e), save:()=>this.saveSection(), cancel:()=>this.cancelEdit() });
        return;
      }
      sec.rawBlocks.forEach((b)=>{
        if(b.type==='prose'){
          let t=b.text; if(sec.id==='__intro__'){ t=t.replace(/^\s*#\s+.*\r?\n?/, ''); }
          blocks.push({ isProse:true, html: el(md(t)) });
        } else if(b.type==='mermaid'){
          const mm=this._mm(b.id);
          blocks.push({ isMermaid:true, id:b.id, src:b.src, rendered:mm.view==='rendered', source:mm.view==='source', svgEl: el(mm.svg||'<div style="color:var(--fainter);font-family:Geist Mono,monospace;font-size:11px;padding:24px 0">rendering diagram…</div>'), zoom:mm.zoom, zoomLabel:Math.round(mm.zoom*100)+'%', transform:'translate('+mm.panX+'px,'+mm.panY+'px) scale('+mm.zoom+')', srcLabel:mm.view==='source'?'rendered':'source', srcBg:mm.view==='source'?'var(--active)':'transparent', srcCol:mm.view==='source'?'var(--text)':'var(--faint)', zoomIn:()=>this.mmZoom(b.id,1.25), zoomOut:()=>this.mmZoom(b.id,0.8), fit:()=>this.mmFit(b.id), toggleSource:()=>this.mmToggleSource(b.id), panStart:(e)=>this.mmPanStart(b.id,e), openFull:()=>this.mmOpenFull(b.id), copy:()=>{ try{ navigator.clipboard.writeText(b.src); }catch(e){} this.flash('copied mermaid source'); } });
        } else if(b.type==='diff'){
          const dv=this._diff(b.id);
          blocks.push({ isDiff:true, file:b.file, adds:b.adds, dels:b.dels, hunk:b.hunk, rows:b.rows, bodyOpen:!dv.collapsed, chevFile:dv.collapsed?'▸':'▾', toggleCollapse:()=>this.diffCollapse(b.id), unified:()=>this.diffViewSet(b.id,'unified'), split:()=>this.diffViewSet(b.id,'split'), unifiedBg:dv.view==='unified'?'var(--active)':'transparent', unifiedCol:dv.view==='unified'?'var(--text)':'var(--faint)', splitBg:dv.view==='split'?'var(--active)':'transparent', splitCol:dv.view==='split'?'var(--text)':'var(--faint)' });
        } else if(b.type==='coderef'){
          const cr=s.coderefs[b.id]||{};
          const rows = cr.rows ? cr.rows : (cr.error? [{ln:'!', code:'⚠ '+cr.error}] : [{ln:'…', code:'loading '+b.file+' …'}]);
          blocks.push({ isCodeRef:true, file:b.file, range:'L'+b.start+'–'+b.end, note:b.note, rows });
        } else if(b.type==='callout'){
          const colors={note:'var(--blue)', background:'var(--faint)', gotcha:'var(--amber)', resource:'var(--blue)'};
          blocks.push({ isCallout:true, color:colors[b.ctype]||'var(--blue)', label:b.ctype, html: el(md(b.text)) });
        } else if(b.type==='resource'){
          let host=''; try{ host=new URL(b.url).hostname; }catch(e){ host=b.url; }
          blocks.push({ isResource:true, url:b.url, title:b.title, host });
        }
      });
    });

    const dimSide=s.sidebarOpen?s.sidebarW:0, dimChat=s.chatOpen?s.chatW:0;
    const fid=s.mmFull; const fc=fid?this._mm(fid):null;

    // ----- chat -----
    const messages=(s.messages||[]).map(m=>{ const user=m.role==='user'; return {...m, who:user?'you':s.model, align:user?'flex-end':'flex-start', bg:user?'var(--active)':'var(--panel2)', bd:user?'var(--border2)':'var(--border)', col:user?'var(--text)':'var(--dim)', suggest:false, hasCtx:!!(m.ctx&&m.ctx.length), ctx:(m.ctx||[]) }; });
    const modelDefs=[{id:'Claude Haiku',name:'Claude Haiku',tag:'fast · cheap'},{id:'Claude Sonnet',name:'Claude Sonnet',tag:'balanced'},{id:'Local · llama',name:'Local · llama',tag:'on-device'}];
    const models=modelDefs.map(m=>({...m, onClick:()=>this.setState({model:m.id, modelOpen:false}), bg:m.id===s.model?'var(--active)':'transparent', check:m.id===s.model?'visible':'hidden'}));

    // ----- summary -----
    let summary=''; if(doc){ if(doc.frontmatter&&doc.frontmatter.summary){ summary=doc.frontmatter.summary; } else { const intro=(s.sections[0]&&s.sections[0].body)||''; const para=intro.replace(/^\s*#\s+.*\r?\n?/,'').split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean)[0]||''; summary=this._trunc(para.replace(/[#*`>_\[\]]/g,''),180); } }

    return {
      rootClass: s.theme==='light'?'pa-light':'',
      planFile: s.activeSlug?(s.activeSlug+'.md'):'—',
      planTitle: doc?doc.title:'Loading…',
      planSummary: summary,
      planVersion: doc?(doc.status||'plan'):'', lastEdit:s.lastSaved, planVersionLabel: doc?(doc.status||''):'',
      themeIcon: s.theme==='dark'
        ? React.createElement('svg',{width:15,height:15,viewBox:'0 0 16 16',fill:'none',stroke:'currentColor',strokeWidth:1.4}, React.createElement('path',{d:'M13.5 9A5.5 5.5 0 0 1 7 2.5 5.5 5.5 0 1 0 13.5 9Z'}))
        : React.createElement('svg',{width:15,height:15,viewBox:'0 0 16 16',fill:'none',stroke:'currentColor',strokeWidth:1.4}, React.createElement('circle',{cx:8,cy:8,r:3.2}), React.createElement('path',{d:'M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M13 3l-1.4 1.4M4.4 11.6 3 13'})),
      toggleTheme:()=>this.setState(st=>({theme:st.theme==='dark'?'light':'dark'})),
      toggleSidebar:()=>this.setState(st=>({sidebarOpen:!st.sidebarOpen})),
      toggleChat:()=>this.setState(st=>({chatOpen:!st.chatOpen})),
      sidebarWidth:dimSide+'px', sidebarInner:s.sidebarW+'px', chatWidth:dimChat+'px', chatInner:s.chatW+'px',
      sidebarOpen:s.sidebarOpen, chatOpen:s.chatOpen,
      startResizeSidebar:(e)=>this.startResizeSidebar(e), startResizeChat:(e)=>this.startResizeChat(e),

      planGroups:groups, planCount, versionHistory:[], planQuery:s.planQuery, onPlanQuery:(e)=>this.setState({planQuery:e.target.value}),

      saveColor:s.dirty?'var(--amber)':'var(--green)', saveLabel:s.dirty?'unsaved':'saved',
      readBg:s.mode==='read'?'var(--active)':'transparent', readCol:s.mode==='read'?'var(--text)':'var(--faint)',
      editBg:s.mode==='edit'?'var(--active)':'transparent', editCol:s.mode==='edit'?'var(--text)':'var(--faint)',
      editMode:s.mode==='edit',
      setRead:()=>this.setState({mode:'read', editing:null}), setEdit:()=>this.setState({mode:'edit'}),
      reloadDisk:()=>{ if(s.activeSlug) this.loadDoc(s.activeSlug,true); this.flash('reloaded from disk'); },
      exportPlan:()=>{ try{ navigator.clipboard.writeText(doc?doc.content:''); }catch(e){} this.flash('copied markdown to clipboard'); },
      openEditor:(e)=>{ if(e&&e.preventDefault)e.preventDefault(); this.flash('file: ~/.claude/plans/'+(s.activeSlug||'')+'.md'); },
      noop:(e)=>{ if(e&&e.preventDefault)e.preventDefault(); },

      docRef:this.docRef, onDocScroll:()=>this.onDocScroll(),
      toc, tocDisplay:(s.winW - dimSide - dimChat) > 720 ? 'block':'none',

      blocks,

      model:s.model, modelOpen:s.modelOpen, models, toggleModelMenu:()=>this.setState(st=>({modelOpen:!st.modelOpen})),
      messages, sending:s.sending, chatRef:this.chatRef,
      chatInput:s.chatInput, onChatInput:(e)=>this.setState({chatInput:e.target.value}),
      onChatKey:(e)=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); this.send(); } },
      sendChat:()=>this.send(), sendBg:s.chatInput.trim()?'var(--text)':'var(--active)', sendCol:s.chatInput.trim()?'var(--bg)':'var(--faint)',
      applySuggest:()=>this.flash('switch to edit mode and paste the block into a section'), dismissSuggest:()=>{},
      hasContexts:(s.contexts||[]).length>0, contexts:(s.contexts||[]).map(c=>({...c, onRemove:()=>this.removeContext(c.id)})),

      sel:!!s.sel, selX:s.sel?s.sel.x:0, selY:s.sel?s.sel.y:0, selActions:!!(s.sel&&s.sel.mode==='actions'), selTweak:!!(s.sel&&s.sel.mode==='tweak'),
      selQuote:s.sel?'“'+this._trunc(s.sel.text,140)+'”':'', selDraft:s.sel?(s.sel.draft||''):'',
      selAddChat:()=>this.selAddToChat(), selStartTweak:()=>this.setState(st=>(st.sel?{sel:{...st.sel,mode:'tweak'}}:{})), onSelDraft:(e)=>{ const v=e.target.value; this.setState(st=>(st.sel?{sel:{...st.sel,draft:v}}:{})); }, selAddTweak:()=>this.selAddTweak(), selCancel:()=>this.setState({sel:null}),

      hasTweaks:(s.tweaks||[]).length>0, tweaksOpen:!!s.tweaksOpen, tweaksClosed:!s.tweaksOpen, tweakCount:(s.tweaks||[]).length,
      tweakList:(s.tweaks||[]).map(t=>({...t, onRemove:()=>this.removeTweak(t.id)})), toggleTweaks:()=>this.setState(st=>({tweaksOpen:!st.tweaksOpen})), submitTweaks:()=>this.submitTweaks(), clearTweaks:()=>this.setState({tweaks:[], tweaksOpen:false}),

      dirtyText:s.dirty?'● modified buffer':'in sync with disk', lastSaved:s.lastSaved, errors:s.errors, errColor:s.errors>0?'var(--red)':'var(--faint)',
      wordCount: doc?((doc.body||'').split(/\s+/).filter(Boolean).length):0,

      mmFullOpen:!!fid, mmFullId:fid||'', mmFullSvgEl: fc?el(fc.svg||''):null,
      mmFullTransform: fc?('translate('+fc.panX+'px,'+fc.panY+'px) scale('+fc.zoom+')'):'none',
      mmFullZoomLabel: fc?(Math.round(fc.zoom*100)+'%'):'',
      mmFullPanStart:(e)=>{ if(fid) this.mmPanStart(fid,e); }, mmFullReset:()=>{ if(fid) this.mmFit(fid); }, mmFullClose:()=>this.mmCloseFull(),

      toast:s.toast,
    };
  }
}
