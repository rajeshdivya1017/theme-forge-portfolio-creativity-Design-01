(() => {
  'use strict';
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Shared 3D laptop preloader: fast and fully responsive, including mobile.
  const loader = $('#preloader');
  if (loader) {
    document.body.classList.add('loading');
    const bar=$('#loaderBar'), percent=$('#loaderPercent');
    const start=performance.now(), duration=reduceMotion?120:1550;
    let raf=0;
    const tick=now=>{
      const p=Math.min(100,Math.round((now-start)/duration*100));
      if(bar)bar.style.width=p+'%';
      if(percent)percent.textContent=String(p).padStart(2,'0')+'%';
      if(p<100)raf=requestAnimationFrame(tick);
      else setTimeout(()=>{loader.classList.add('is-done');document.body.classList.remove('loading');setTimeout(()=>loader.remove(),650)},reduceMotion?0:180);
    };
    raf=requestAnimationFrame(tick);
    window.addEventListener('pagehide',()=>cancelAnimationFrame(raf),{once:true});
  }

  // Correct active navigation on all pages.
  const current=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  $$('.nav-link').forEach(a=>{
    const target=(a.getAttribute('href')||'').split('#')[0].toLowerCase();
    a.classList.toggle('active',target===current || (current===''&&target==='index.html'));
    if(a.classList.contains('active'))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  });

  // Mobile menu: close on navigation, outside click and Escape.
  const menu=$('#menuToggle'), nav=$('#mainNav');
  const closeMenu=()=>{if(!menu||!nav)return;menu.setAttribute('aria-expanded','false');nav.classList.remove('is-open');document.body.classList.remove('menu-open')};
  if(menu&&nav){
    menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open);document.body.classList.toggle('menu-open',open)});
    $$('.nav-link',nav).forEach(a=>a.addEventListener('click',closeMenu));
    document.addEventListener('click',e=>{if(nav.classList.contains('is-open')&&!nav.contains(e.target)&&!menu.contains(e.target))closeMenu()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
    window.addEventListener('resize',()=>{if(innerWidth>680)closeMenu()});
  }

  // Scroll reveal.
  const reveals=$$('.reveal');
  if('IntersectionObserver'in window&&!reduceMotion){
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.1});
    reveals.forEach(el=>observer.observe(el));
  }else reveals.forEach(el=>el.classList.add('is-visible'));

  // Toast helper shared by footer newsletter and forms.
  const toast=(message,type='success')=>{
    const region=$('#toastRegion');if(!region)return;
    const item=document.createElement('div');item.className='toast'+(type==='error'?' error':'');item.textContent=message;region.append(item);
    setTimeout(()=>{item.style.opacity='0';item.style.transform='translateY(10px)';setTimeout(()=>item.remove(),300)},3800);
  };

  // Footer email form: validate, provide explicit client-side feedback.
  $$('.newsletter-form').forEach(form=>form.addEventListener('submit',e=>{
    e.preventDefault();const input=$('input[type=email]',form);
    if(!input||!input.checkValidity()){input?.reportValidity();toast('Please enter a valid email address.','error');return}
    const email=input.value.trim();
    toast('Thank you! We’ll contact you soon.');
    form.reset();
    // No mailing-list backend is present in this static project. The success toast is local UI feedback.
    form.dispatchEvent(new CustomEvent('newsletter:valid',{bubbles:true,detail:{email}}));
  }));

  // Hero image flip/cycle: click or keyboard to reveal the next image.
  $$('.flip-image').forEach(button=>{
    const slides=$$('.hero-slide',button);if(slides.length<2)return;let index=0;
    const next=()=>{slides[index].classList.remove('is-active');index=(index+1)%slides.length;slides[index].classList.add('is-active');button.classList.remove('flip-now');void button.offsetWidth;button.classList.add('flip-now')};
    button.addEventListener('click',next);
    button.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();next()}});
  });

  // Expertise cards have two related image layers animated in CSS; no JS timer needed.

  // Home: reveal the next three featured projects.
  const viewAll=$('#viewAllProjects'),homeGrid=$('.home-project-grid');
  if(viewAll&&homeGrid)viewAll.addEventListener('click',()=>{
    const expanded=homeGrid.classList.toggle('show-all');
    viewAll.setAttribute('aria-expanded',String(expanded));
    viewAll.textContent=expanded?'Show Less ↑':'View All Projects →';
  });

  // Project cards cross-fade through their related image set automatically.
  // The flip interaction is reserved exclusively for the large hero image.
  $$('.project-visual').forEach(card=>{
    const slides=$$('.slide',card);
    if(slides.length<2)return;
    let index=0,timer=0;
    const project=card.closest('.project-card');
    let captions=[];
    try{captions=JSON.parse(project?.dataset.slideCaptions||'[]')}catch(_error){}
    const updateCaption=()=>{
      const copy=$('.project-meta p',project);
      if(copy&&captions[index])copy.textContent=captions[index];
      slides.forEach((slide,slideIndex)=>{
        const alt=slide.getAttribute('alt')||'Project image';
        slide.setAttribute('aria-hidden',String(slideIndex!==index));
      });
    };
    const next=()=>{
      slides[index].classList.remove('is-active');
      index=(index+1)%slides.length;
      slides[index].classList.add('is-active');
      updateCaption();
    };
    const start=()=>{
      if(!reduceMotion&&!timer)timer=window.setInterval(next,3000);
    };
    const stop=()=>{if(timer){clearInterval(timer);timer=0}};
    card.removeAttribute('role');
    card.removeAttribute('tabindex');
    card.removeAttribute('data-flip-card');
    card.removeAttribute('aria-label');
    card.addEventListener('mouseenter',stop);
    card.addEventListener('mouseleave',start);
    card.addEventListener('focusin',stop);
    card.addEventListener('focusout',start);
    updateCaption();
    start();
  });

  // Portfolio filters + 3-card carousel. The visible window advances one project at a time.
  const carousel=$('#portfolioCarousel'),filterButtons=$$('.filter-btn'),count=$('#carouselCount');
  if(carousel){
    const cards=$$('.project-card',carousel);let filter='all',start=0;
    const matches=()=>cards.filter(card=>filter==='all'||(card.dataset.category||'').includes(filter==='ui/ux design'?'ui/ux':filter));
    const render=()=>{
      const list=matches();if(!list.length)return;
      if(start>=list.length)start=0;
      cards.forEach(c=>c.classList.remove('is-visible'));
      const shown=[];
      const visibleCount=window.innerWidth<=680?1:3;
      for(let k=0;k<Math.min(visibleCount,list.length);k++){const c=list[(start+k)%list.length];c.classList.add('is-visible');shown.push(c)}
      if(count)count.textContent=`${String(start+1).padStart(2,'0')} — ${String(Math.min(start+visibleCount,list.length)).padStart(2,'0')} / ${String(list.length).padStart(2,'0')}`;
      const prev=$('.carousel-prev'),next=$('.carousel-next');
      if(prev)prev.disabled=list.length<=3;
      if(next)next.disabled=list.length<=3;
    };
    filterButtons.forEach(btn=>btn.addEventListener('click',()=>{
      filterButtons.forEach(b=>b.classList.toggle('active',b===btn));
      filter=btn.dataset.filter||'all';start=0;render();
    }));
    $('.carousel-prev')?.addEventListener('click',()=>{const list=matches();start=(start-1+list.length)%list.length;render()});
    $('.carousel-next')?.addEventListener('click',()=>{const list=matches();start=(start+1)%list.length;render()});
    window.addEventListener('resize',render);
    render();
  }

  // Portfolio "What I Do" image rotation.
  const laptopSlides=$$('.laptop-slide');
  if(laptopSlides.length>1&&!reduceMotion){let i=0;setInterval(()=>{laptopSlides[i].classList.remove('is-active');i=(i+1)%laptopSlides.length;laptopSlides[i].classList.add('is-active')},2400)}

  // Only one skill chip can be selected within each service card at a time.
  $$('.chips').forEach(group=>{
    $$('.skill-chip',group).forEach(chip=>chip.addEventListener('click',()=>{
      $$('.skill-chip',group).forEach(item=>{
        const selected=item===chip;
        item.setAttribute('aria-pressed',String(selected));
      });
    }));
  });

  // Sequential letter-by-letter typing for the two large hero lines on Services/About.
  const typeTargets=$$('[data-type-line]');
  if(typeTargets.length){
    if(reduceMotion){
      typeTargets.forEach(el=>{el.textContent=el.dataset.typeLine||el.textContent});
    }else{
      // Clear every line immediately so the complete heading never flashes before typing.
      typeTargets.forEach(el=>{
        el.textContent='';
        el.setAttribute('aria-label',el.dataset.typeLine||'');
      });
      const typeNext=(targetIndex)=>{
        const el=typeTargets[targetIndex];
        if(!el)return;
        const fullText=el.dataset.typeLine||'';
        el.classList.add('typing-caret');
        let position=0;
        const timer=window.setInterval(()=>{
          position++;
          el.textContent=fullText.slice(0,position);
          if(position>=fullText.length){
            window.clearInterval(timer);
            el.classList.remove('typing-caret');
            window.setTimeout(()=>typeNext(targetIndex+1),260);
          }
        },targetIndex===0?62:48);
      };
      window.setTimeout(()=>typeNext(0),2550);
    }
  }

  // Dynamic project case study: six distinct concepts and six matching image sets.
  if(document.body.dataset.page==='project'){
    const data=[
      {name:'ShopKart',cat:'Web Design · E-commerce · UI/UX',desc:'A modern e-commerce experience with a clean, confident shopping journey.',overview:'ShopKart brings product discovery, comparison and checkout into one clear, accessible shopping experience. The concept focuses on reducing friction and helping customers make confident decisions.',objective:'Objective: make browsing and checkout feel effortless across desktop and mobile.',solution:'Solution: a clear product hierarchy, considered filters, strong product photography and a simplified checkout flow.',images:['photo-1556742049-0cfed4f6a45d','photo-1555529669-e69e7aa0ba9a','photo-1556740758-90de374c12ad']},
      {name:'FinTrack',cat:'UI/UX Design · Fintech Dashboard',desc:'A financial dashboard that makes everyday money decisions feel clear.',overview:'FinTrack organises spending, income and savings goals into a calm dashboard. The concept makes important financial signals easy to scan and understand.',objective:'Objective: turn complex financial information into useful, approachable insights.',solution:'Solution: a responsive dashboard with clear data visualisation, helpful summaries and accessible navigation.',images:['photo-1551288049-bebda4e38f71','photo-1460925895917-afdab827c52f','photo-1554224155-6726b3ff858f']},
      {name:'StyleHub',cat:'Branding · Fashion · Web Design',desc:'A confident visual identity and digital storefront for a contemporary fashion label.',overview:'StyleHub pairs a memorable fashion identity with a refined digital storefront. The concept uses a consistent visual language to let collections and products take centre stage.',objective:'Objective: build a recognisable brand experience that feels modern and expressive.',solution:'Solution: a flexible identity system, editorial product layouts and a mobile-first shopping experience.',images:['photo-1483985988355-763728e1935b','photo-1529139574466-a303027c1d8b','photo-1490481651871-ab68de25d43d']},
      {name:'Freshbite',cat:'UI/UX Design · Food Experience',desc:'A friendly digital experience for a fresh food brand.',overview:'Freshbite makes discovering fresh meals and healthy choices feel inviting. The concept combines appetising imagery with simple navigation and a frictionless order journey.',objective:'Objective: help people discover meals quickly and place orders with confidence.',solution:'Solution: a bright visual system, clear menu categories and an accessible ordering flow.',images:['photo-1547592180-85f173990554','photo-1512621776951-a57141f2eefd','photo-1490645935967-10de6ba17061']},
      {name:'Leaf & Co.',cat:'Branding · Lifestyle Identity',desc:'A calm and natural identity for a modern lifestyle brand.',overview:'Leaf & Co. is a concept identity for a lifestyle label built around calm, natural materials and considered everyday objects.',objective:'Objective: create a warm, recognisable identity that works across digital touchpoints.',solution:'Solution: a restrained colour palette, tactile imagery and a flexible visual identity system.',images:['photo-1441986300917-64674bd600d8','photo-1494438639946-1ebd1d20bf85','photo-1441984904996-e0b6ba687e04']},
      {name:'Wander',cat:'Web Design · Travel Experience',desc:'A visual travel experience built to inspire discovery.',overview:'Wander turns destination inspiration into an inviting digital journey. The concept pairs immersive photography with clear pathways for exploring places and planning a trip.',objective:'Objective: make travel discovery feel inspiring without making planning complicated.',solution:'Solution: immersive destination storytelling, intuitive filters and responsive destination pages.',images:['photo-1464822759023-fed622ff2c3b','photo-1500530855697-b586d89ba3ee','photo-1476514525535-07fb3b4ae5f1']}
    ];
    const params=new URLSearchParams(location.search),raw=Number.parseInt(params.get('project')||'0',10),index=Number.isInteger(raw)&&raw>=0&&raw<data.length?raw:0,p=data[index];
    const url=id=>`https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=88`;
    $('#projectCategory').textContent=p.cat;$('#projectTitle').innerHTML=`${p.name}<br><em>case study.</em>`;$('#projectDescription').textContent=p.desc;
    $('#caseOverview').textContent=p.overview;$('#caseObjective').textContent=p.objective+' '+p.solution;
    $('#caseImage').src=url(p.images[0]);$('#caseImage').alt=p.name+' project hero';
    $('#caseImageTwo').src=url(p.images[1]);$('#caseImageTwo').alt=p.name+' related project visual';
    $('#caseImageThree').src=url(p.images[2]);$('#caseImageThree').alt=p.name+' responsive project visual';
    $('#previousProject').href=`project.html?project=${(index+data.length-1)%data.length}`;
    $('#nextProject').href=`project.html?project=${(index+1)%data.length}`;
    $('#previousProject').textContent=`← ${data[(index+data.length-1)%data.length].name}`;
    $('#nextProject').textContent=`${data[(index+1)%data.length].name} →`;
    document.title=`${p.name} — Case Study | Vamshi Krishna`;
  }

  // Contact form: validate and open a real email draft, never claim server delivery.
  const contactForm=$('#contactForm');
  if(contactForm)contactForm.addEventListener('submit',e=>{
    e.preventDefault();if(!contactForm.reportValidity())return;
    const d=new FormData(contactForm);
    const subject=encodeURIComponent(`Portfolio enquiry — ${d.get('service')}`);
    const body=encodeURIComponent(`Name: ${d.get('name')}\nEmail: ${d.get('email')}\nService: ${d.get('service')}\n\nProject details:\n${d.get('message')}`);
    const feedback=$('#formFeedback');if(feedback)feedback.textContent='Opening your email application with the enquiry details…';
    toast('Your enquiry is ready in your email app.');
    window.location.href=`mailto:hello@vamshikrishna.design?subject=${subject}&body=${body}`;
  });

  // Desktop-only pointer spotlight / card tilt.
  if(!reduceMotion&&matchMedia('(hover:hover) and (pointer:fine)').matches){
    const hero=$('.reference-hero,.portfolio-intro');
    if(hero)hero.addEventListener('pointermove',e=>{const r=hero.getBoundingClientRect();hero.style.setProperty('--mx',`${e.clientX-r.left}px`);hero.style.setProperty('--my',`${e.clientY-r.top}px`)},{passive:true});
  }
})();