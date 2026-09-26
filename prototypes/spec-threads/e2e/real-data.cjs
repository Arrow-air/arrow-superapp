const {chromium}=require('playwright-core');
const assert=require('node:assert/strict'),fs=require('node:fs');
const BASE=process.env.BASE_URL||'http://10.3.10.123:4192/';
const OUT='/tmp/spearhead-real-review';fs.mkdirSync(OUT,{recursive:true});let checks=0;
const check=(name,value)=>{assert.ok(value,name);console.log('PASS '+name);checks++};
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1100}});page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
const go=async(q='')=>{await page.goto(BASE+'#/p/spearhead'+(q?'?'+q:''));await page.locator('.sourced-workspace').waitFor()};
const tab=label=>page.getByRole('navigation',{name:'Project views'}).getByRole('button',{name:label,exact:true});
try{
await go();
check('default is real project data with no fabricated personas',await page.getByText('Real Spearhead data',{exact:true}).isVisible()&&await page.getByLabel('Demo persona').count()===0);
check('no fictional work or people leak into the real overview',!/(Omar|Lena|Jun \(|keyed connector assembly guide|Glove-on harness)/.test(await page.locator('main').innerText()));
check('snapshot and non-live status are visible',(await page.locator('.sourced-banner').innerText()).includes('not live-synced'));
check('six source-backed system cards',await page.locator('.story-card').count()===6);
await page.screenshot({path:OUT+'/overview-desktop.png',fullPage:true});
await page.locator('.story-card').filter({has:page.getByText('Avionics',{exact:true})}).focus();await page.keyboard.press('Enter');
check('keyboard opens connected subsystem with design and questions',await page.getByRole('heading',{name:'Design & direction'}).isVisible()&&await page.getByRole('heading',{name:'Still being explored'}).isVisible());
await page.locator('.sourced-record-row').filter({has:page.getByText('Design the tail PCB',{exact:true})}).click();
check('real work detail shows contributor, evidence date, and original source',await page.getByRole('heading',{name:'Design the tail PCB',exact:true}).isVisible()&&(await page.locator('.sourced-detail').innerText()).includes('Erick (errrks.eth)')&&await page.locator('.sourced-source-link').count()>0);
check('imported work has no invented approval or payment buttons',await page.getByRole('button',{name:/Accept|Approve|Pay|Review submission/}).count()===0);
await page.screenshot({path:OUT+'/tail-detail-desktop.png',fullPage:true});
await page.getByRole('button',{name:/How should the tail servo regulators/}).click();
check('related context opens the actual regulator question',await page.getByRole('heading',{name:'How should the tail servo regulators fail independently?',exact:true}).isVisible());
await page.reload();check('record deep link survives reload',await page.getByRole('heading',{name:'How should the tail servo regulators fail independently?',exact:true}).isVisible());
await go('view=work');check('active work is real activity and plans',await page.getByRole('button',{name:/Design the tail PCB/}).count()>0);
await page.getByRole('button',{name:'Results & history',exact:true}).click();check('reported flight result is in history',await page.getByRole('button',{name:/Four PT1 test flights reviewed/}).isVisible());
await page.getByRole('button',{name:/Four PT1 test flights reviewed/}).click();check('flight result is not presented as transition success',(await page.locator('.sourced-detail').innerText()).includes('does not claim a successful hover-to-cruise transition'));
await go('view=work&version=PT1');check('PT1 filter does not inherit PT2 board design',await page.getByRole('button',{name:/Design the tail PCB/}).count()===0);
await page.getByLabel('Project version').selectOption('PT2');await page.getByRole('button',{name:/Design the tail PCB/}).waitFor();check('PT2 filter shows its board work',await page.getByRole('button',{name:/Design the tail PCB/}).isVisible());
await page.getByLabel('Search records').fill('no-such-topic');check('search has an honest empty state',await page.getByText('No records in this snapshot match this view.',{exact:true}).isVisible());
await go('system=payload');check('payload gap is not filled with fictional work',(await page.locator('main').innerText()).includes('No in-progress work reported'));
await go('system=flight-controls');check('subsystem includes planned work, not just work in progress',await page.getByRole('button',{name:/Simulate the transition with control-surface data/}).isVisible());
await go('view=design');check('earlier pusher proposal is not in the default design view',await page.getByRole('button',{name:/Earlier approach: a swappable pusher PCB/}).count()===0);await page.getByRole('button',{name:'Earlier context',exact:true}).click();await page.getByRole('button',{name:/Earlier approach: a swappable pusher PCB/}).waitFor();check('earlier pusher design remains available in history',await page.getByRole('button',{name:/Earlier approach: a swappable pusher PCB/}).isVisible());
await tab('Sources').click();check('sources explain coverage and dated baseline',await page.getByRole('heading',{name:'How to read this snapshot'}).isVisible()&&(await page.locator('main').innerText()).includes('June/July documentation'));
const links=await page.locator('.sourced-source-grid a').evaluateAll(as=>as.map(a=>a.href));check('evidence uses GitHub/Discord sources',links.length>=5&&links.every(u=>u.startsWith('https://github.com/')||u.startsWith('https://discord.com/')));
await go('view=work&record=first-hover');check('pilot report uses evidence date without inventing flight date',(await page.locator('.sourced-detail').innerText()).includes('Thomas (pilot)')&&(await page.locator('.sourced-detail').innerText()).includes('not the flight date'));
await go('view=shape&record=pt2-controller-model');check('uncertain controller remains an open question',await page.locator('.briefing-heading .evidence-tag[data-status="open"]').isVisible()&&(await page.locator('.sourced-detail').innerText()).includes('not hardware identification'));
await go('view=shape&record=november-build');check('November plan is a proposal, not a commitment',await page.locator('.briefing-heading .evidence-tag[data-status="proposal"]').isVisible());
await go('view=design&record=pt1-electrical');check('old design retains status alongside stale-evidence warning',await page.locator('.briefing-heading .evidence-tag[data-status="documented"]').isVisible()&&await page.locator('.briefing-heading .stale-evidence').isVisible());
await go('view=design&record=connector-fit');check('exactly 30-day-old evidence is not flagged stale',await page.locator('.briefing-heading .stale-evidence').count()===0);
await go('view=sources');check('missing report artifacts and funding limits are disclosed',(await page.locator('main').innerText()).includes('standalone bench-test reports')&&(await page.locator('main').innerText()).includes('monthly spending cap'));
await go('view=work&record=transition-simulation');await page.getByRole('button',{name:/ADB v1.1: the preliminary aerodynamic database/}).click();check('transition work links to historical computational evidence',await page.getByRole('heading',{name:'ADB v1.1: the preliminary aerodynamic database',exact:true}).isVisible()&&await page.locator('.briefing-heading [data-status="analysis"]').isVisible());
await page.getByRole('button',{name:/Preliminary stability study: CG sensitivity, not flight clearance/}).click();check('stability result is analysis, not physical flight clearance',await page.locator('.briefing-heading [data-status="analysis"]').isVisible()&&(await page.locator('.sourced-detail').innerText()).includes('not a flight-test clearance result'));
await page.getByRole('button',{name:/Which stability output should later work build on/}).click();check('conflicting stability outputs remain open and source-linked',await page.locator('.briefing-heading [data-status="open"]').isVisible()&&await page.locator('.sourced-source-link').count()===2);
await go('view=work&record=can-pwm-bench-report');check('limited bench demonstration discloses secondary evidence',(await page.locator('.sourced-detail').innerText()).includes('not independently read')&&(await page.locator('.sourced-detail').innerText()).includes('not a standalone bench-test report'));
await go('view=work&record=cad-publication');check('old promised CAD is stale planned work, not a completed delivery',await page.locator('.briefing-heading [data-status="planned"]').isVisible()&&await page.locator('.briefing-heading .stale-evidence').isVisible());
await go('view=work&grant=sample-delivery-keyed-review');check('old fictional deep links never silently display real records',await page.getByRole('heading',{name:'This link belongs to a different dataset.'}).isVisible());
for(const width of [1440,768,390,320]){
 await page.setViewportSize({width,height:1000});
 for(const q of ['','system=avionics','view=work','view=design','view=shape&record=electric-first','view=sources']){
  await go(q);check('layout fits '+width+' '+(q||'overview'),await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 }
 if(width===390){await go();await page.screenshot({path:OUT+'/overview-mobile.png',fullPage:true});await go('view=work&record=tail-pcb');await page.screenshot({path:OUT+'/detail-mobile.png',fullPage:true});}
}
await page.goto(BASE+'?dataset=examples#/p/spearhead');await page.getByLabel('Demo persona').waitFor();
check('explicit sandbox restores the earlier interactive demo',await page.locator('.project-overview').isVisible());
const saved=await page.evaluate(()=>{const k='arrow-spec-threads-demo-v2',s=JSON.parse(localStorage.getItem(k));s.threads[0].body='Preserve this existing edit exactly.';localStorage.setItem(k,JSON.stringify(s));return localStorage.getItem(k)});
await go();await page.reload();check('real view does not modify saved sandbox state',await page.evaluate(()=>localStorage.getItem('arrow-spec-threads-demo-v2'))===saved);
await page.goto(BASE+'?dataset=examples#/p/spearhead');await page.getByLabel('Demo persona').waitFor();check('returning to sandbox preserves the earlier edit',await page.evaluate(()=>JSON.parse(localStorage.getItem('arrow-spec-threads-demo-v2')).threads[0].body)==='Preserve this existing edit exactly.');
check('no runtime errors',errors.length===0);console.log(checks+' real-data browser checks passed.');
}catch(e){console.error(errors);await page.screenshot({path:OUT+'/failure.png',fullPage:true});throw e}finally{await browser.close()}})();
