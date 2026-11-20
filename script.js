(() => {
  'use strict';

  const $ = (s, root=document) => root.querySelector(s);
  const app = $('#app'), modal = $('#modal'), statusBox = $('#connection-status');
  const FAV_KEY = 'ph-biodiversity-favorites-v1';

  const starter = [
    {id:'demo-1',name:'Philippine Eagle',scientific:'Pithecophaga jefferyi',category:'Bird',habitat:'Forests of Mindanao, Luzon, Samar and Leyte',status:'Critically Endangered',description:'A powerful forest raptor and one of the largest eagles in the world. Endemic to the Philippines.',image:'',emoji:'🦅'},
    {id:'demo-2',name:'Philippine Tarsier',scientific:'Carlito syrichta',category:'Mammal',habitat:'Bohol, Samar, Leyte and Mindanao',status:'Near Threatened',description:'A tiny nocturnal primate known for its enormous eyes.',image:'',emoji:'🐒'},
    {id:'demo-3',name:'Tamaraw',scientific:'Bubalus mindorensis',category:'Mammal',habitat:'Grasslands and forests of Mindoro',status:'Critically Endangered',description:'A small wild buffalo found naturally only on the island of Mindoro.',image:'',emoji:'🐃'},
    {id:'demo-4',name:'Philippine Crocodile',scientific:'Crocodylus mindorensis',category:'Reptile',habitat:'Freshwater rivers, ponds and wetlands',status:'Critically Endangered',description:'A freshwater crocodile native to the Philippines.',image:'',emoji:'🐊'},
    {id:'demo-5',name:'Whale Shark',scientific:'Rhincodon typus',category:'Marine',habitat:'Warm tropical waters, including Philippine seas',status:'Endangered',description:'The world’s largest fish, a filter feeder that feeds mainly on plankton.',image:'',emoji:'🦈'},
    {id:'demo-6',name:'Palawan Peacock-Pheasant',scientific:'Polyplectron napoleonis',category:'Bird',habitat:'Lowland forests of Palawan',status:'Vulnerable',description:'A striking ground-dwelling bird endemic to Palawan.',image:'',emoji:'🪶'},
    {id:'demo-7',name:'Philippine Cockatoo',scientific:'Cacatua haematuropygia',category:'Bird',habitat:'Lowland forests and mangroves',status:'Critically Endangered',description:'A white parrot with red feathers under its tail, threatened by habitat loss and trapping.',image:'',emoji:'🦜'},
    {id:'demo-8',name:'Rafflesia',scientific:'Rafflesia schadenbergiana',category:'Plant',habitat:'Forests of Mindanao',status:'Endangered',description:'A rare parasitic flowering plant known for producing enormous flowers.',image:'',emoji:'🌺'}
  ];

  let client=null, session=null, rows=[], page='home', editing=null;
  let searchText='', categoryFilter='', statusFilter='', favorites=[];

  try {
    favorites=JSON.parse(localStorage.getItem(FAV_KEY)||'[]');
    if(!Array.isArray(favorites)) favorites=[];
  } catch (_) {
    favorites=[];
  }

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  const say = (message, good=false) => {
    if(statusBox){
      statusBox.textContent=message;
      statusBox.style.background=good?'#e6f5e9':'#fff4dc';
      statusBox.style.color=good?'#245c39':'#765719';
    }
  };

  const saveFav = () => {
    try{localStorage.setItem(FAV_KEY,JSON.stringify(favorites));}catch(_){}
  };

  const isFav = id => favorites.includes(String(id));
  const species = () => rows;

  const statusClass = s =>
    ['Critically Endangered','Endangered','Vulnerable'].includes(s)
      ? 'status danger-status' : 'status';

  const mapRow = r => ({
    id:String(r.id),
    name:r.common_name||'',
    scientific:r.scientific_name||'',
    category:r.category||'Other',
    habitat:r.location||'',
    status:r.conservation_status||'Not Evaluated',
    description:r.description||'',
    image:r.image_url||'',
    emoji:'🌿'
  });

  const toRow = x => ({
    common_name:x.name,
    scientific_name:x.scientific||null,
    category:x.category||'Other',
    conservation_status:x.status||'Not Evaluated',
    location:x.habitat||null,
    description:x.description||null,
    image_url:x.image||null
  });

  // IMAGE ZOOM STYLE
  function addImageZoomStyles(){
    if($('#image-zoom-styles'))return;

    const style=document.createElement('style');
    style.id='image-zoom-styles';

    style.textContent=`
      .image-zoom-overlay {
        position:fixed;
        inset:0;
        z-index:99999;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:25px;
        background:rgba(0,0,0,.94);
        opacity:0;
        visibility:hidden;
        transition:opacity .2s ease, visibility .2s ease;
        cursor:zoom-out;
      }

      .image-zoom-overlay.active {
        opacity:1;
        visibility:visible;
      }

      .image-zoom-content {
        width:100%;
        height:100%;
        display:flex;
        align-items:center;
        justify-content:center;
      }

      .image-zoom-overlay img {
        display:block;
        max-width:95vw;
        max-height:90vh;
        width:auto;
        height:auto;
        object-fit:contain;
        object-position:center;
        background:transparent;
        border-radius:5px;
        cursor:default;
        box-shadow:0 5px 35px rgba(0,0,0,.35);
      }

      .image-zoom-close {
        position:absolute;
        top:18px;
        right:22px;
        width:44px;
        height:44px;
        border:0;
        border-radius:50%;
        background:rgba(255,255,255,.16);
        color:white;
        font-size:27px;
        cursor:pointer;
        display:flex;
        align-items:center;
        justify-content:center;
      }

      .image-zoom-close:hover {
        background:rgba(255,255,255,.3);
      }

      .species-photo img[data-zoom-image],
      .modal-box img[data-zoom-image] {
        cursor:zoom-in;
      }

      @media(max-width:600px) {
        .image-zoom-overlay {
          padding:12px;
        }

        .image-zoom-overlay img {
          max-width:96vw;
          max-height:85vh;
        }

        .image-zoom-close {
          top:10px;
          right:10px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  // CREATE IMAGE ZOOM VIEWER
  function createImageZoom(){
    if($('#image-zoom-overlay'))return;

    const overlay=document.createElement('div');
    overlay.id='image-zoom-overlay';
    overlay.className='image-zoom-overlay';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','Zoomed species image');

    overlay.innerHTML=`
      <button type="button" class="image-zoom-close" aria-label="Close image zoom">×</button>
      <div class="image-zoom-content">
        <img src="" alt="Zoomed species image">
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener('click',e=>{
      if(
        e.target===overlay ||
        e.target.closest('.image-zoom-close')
      ){
        closeImageZoom();
      }
    });

    overlay.querySelector('img').addEventListener('click',e=>{
      e.stopPropagation();
    });
  }

  let imageZoomHistoryOpen = false;

  function openImageZoom(src,alt='Species image'){
    if(!src)return;

    addImageZoomStyles();
    createImageZoom();

    const overlay=$('#image-zoom-overlay');
    const image=overlay.querySelector('img');

    image.src=src;
    image.alt=alt;

    // Add a same-tab history entry so the phone/browser Back button
    // closes the viewer instead of leaving the biodiversity website.
    if(!imageZoomHistoryOpen){
      history.pushState(
        {...(history.state||{}), biodiversityImageZoom:true},
        '',
        location.href
      );
      imageZoomHistoryOpen=true;
    }

    overlay.classList.add('active');
    document.body.style.overflow='hidden';
  }

  function closeImageZoom(fromPopState=false){
    const overlay=$('#image-zoom-overlay');
    if(!overlay)return;

    if(imageZoomHistoryOpen && !fromPopState){
      // Back triggers popstate, which performs the actual close.
      history.back();
      return;
    }

    overlay.classList.remove('active');
    document.body.style.overflow='';
    imageZoomHistoryOpen=false;
  }

  // Hardware/browser Back closes only the image viewer.
  window.addEventListener('popstate',()=>{
    const overlay=$('#image-zoom-overlay');

    // Back order: enlarged image first, then Species Profile.
    if(overlay && overlay.classList.contains('active')){
      closeImageZoom(true);
      return;
    }

    if(speciesProfileHistoryOpen && !modal.classList.contains('hidden')){
      modal.classList.add('hidden');
      modal.innerHTML='';
      speciesProfileHistoryOpen=false;
    }
  });

  // Escape also closes the image viewer on desktop keyboards.
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      const overlay=$('#image-zoom-overlay');
      if(overlay && overlay.classList.contains('active')){
        closeImageZoom();
      }else if(speciesProfileHistoryOpen && !modal.classList.contains('hidden')){
        history.back();
      }
    }
  });

  // Reusable password field with show/hide eye button
  function passwordField(name,label,autocomplete,minlength=0){
    return `
      <label for="${name}">${label}</label>
      <div class="password-wrap" style="position:relative;width:100%">
        <input
          id="${name}"
          name="${name}"
          type="password"
          required
          autocomplete="${autocomplete}"
          ${minlength?`minlength="${minlength}"`:''}
          style="width:100%;padding-right:48px"
        >
        <button
          type="button"
          class="password-eye"
          data-action="toggle-password"
          data-target="${name}"
          aria-label="Show password"
          aria-pressed="false"
          title="Show password"
          style="position:absolute;right:8px;top:50%;transform:translateY(-50%);border:0;background:transparent;cursor:pointer;font-size:19px;padding:6px;color:#355b46"
        >👁️</button>
      </div>
    `;
  }

  async function loadSpecies(){
    if(!client){
      rows=starter.slice();
      render();
      return;
    }

    const {data,error}=await client.from('species')
      .select('*').order('id',{ascending:true});

    if(error){
      rows=starter.slice();
      say('Hindi makakonekta sa database: '+error.message+' — ipinapakita muna ang sample species.');
      render();
      return;
    }

    rows=(data||[]).map(mapRow);

    if(!rows.length){
      rows=starter.slice();
      say('Connected sa Supabase, pero walang laman ang species table. Patakbuhin ang SETUP_SUPABASE.sql para maidagdag ang sample species.');
    } else {
      say('Connected sa Supabase database. Ang species records ay online na nase-save.',true);
    }

    render();
  }

  async function init(){
    if(!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_PUBLISHABLE_KEY){
      say('Supabase configuration missing. Tingnan ang config.js.');
      rows=starter.slice();
      render();
      return;
    }

    try{
      client=window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_PUBLISHABLE_KEY
      );

      const {data}=await client.auth.getSession();
      session=data.session;

      client.auth.onAuthStateChange((_event,newSession)=>{
        session=newSession;
        if(page==='admin') render();
      });

      await loadSpecies();
    }catch(e){
      rows=starter.slice();
      say('Supabase initialization error: '+e.message);
      render();
    }
  }

  function card(x){
    return `<article class="species-card">
      <button type="button" class="species-photo species-photo-trigger" data-action="detail" data-id="${esc(x.id)}" aria-label="View details for ${esc(x.name)}">
        ${x.image
          ? `<img src="${esc(x.image)}" alt="${esc(x.name)}">`
          : `<span>${esc(x.emoji||'🌿')}</span>`}
      </button>
      <div class="species-body">
        <div class="card-top">
          <span class="tag">${esc(x.category)}</span>
          <button class="heart" data-action="favorite" data-id="${esc(x.id)}" aria-label="Favorite">
            ${isFav(x.id)?'♥':'♡'}
          </button>
        </div>
        <h3>${esc(x.name)}</h3>
        <div class="latin">${esc(x.scientific)}</div>
        <span class="${statusClass(x.status)}">${esc(x.status)}</span>
        <p class="description">${esc(x.description)}</p>
        <button class="btn small" data-action="detail" data-id="${esc(x.id)}">View Details</button>
      </div>
    </article>`;
  }

  function home(){
    const threatened=species().filter(x=>
      ['Critically Endangered','Endangered','Vulnerable'].includes(x.status)
    ).length;

    const categories=[
      ['Birds','Bird','https://cms.zsl.org/sites/default/files/styles/responsive/public/768/725/1/2022-09/philippine-eagle-edge-birds%20%281%29.jpg.webp'],
      ['Mammals','Mammal','https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?auto=format&fit=crop&w=400&q=80'],
      ['Reptiles','Reptile','https://images.unsplash.com/photo-1518467166778-b88f373ffec7?auto=format&fit=crop&w=400&q=80'],
      ['Amphibians','Amphibian','https://commons.wikimedia.org/wiki/Special:FilePath/Hylarana_erythraea_(Gregg_Yan).jpg?width=800'],
      ['Plants','Plant','https://images.unsplash.com/photo-1566836610593-62a64888a216?auto=format&fit=crop&w=400&q=80'],
      ['Marine','Marine','https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=400&q=80'],
      ['Insects','Insect','https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=400&q=80'],
      ['Others','Other','https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=400&q=80']
    ];

    app.innerHTML=`
      <div class="stats">
        <div class="stat"><div class="stat-icon">🐾</div><div><strong>${species().length}</strong><span>Total Species</span></div></div>
        <div class="stat"><div class="stat-icon">🌿</div><div><strong>${new Set(species().map(x=>x.category)).size}</strong><span>Categories</span></div></div>
        <div class="stat"><div class="stat-icon">🛡️</div><div><strong>${threatened}</strong><span>Threatened Species</span></div></div>
        <div class="stat"><div class="stat-icon">♥</div><div><strong>${favorites.length}</strong><span>Your Favorites</span></div></div>
      </div>

      <div class="layout">
        <section>
          <div class="section-head">
            <h2>🌿 Featured Species</h2>
            <button class="btn secondary" data-page="explore">View All →</button>
          </div>
          <div class="species-grid">${species().slice(0,3).map(card).join('')}</div>

          <div class="section-head" style="margin-top:32px">
            <h2>Explore by Category</h2>
          </div>
          <div class="category-grid">
            ${categories.map(([l,c,img])=>`
              <div class="category-card" data-action="category" data-category="${c}">
                <div class="cat-thumb" style="background-image:url('${img}')"></div>
                <div class="cat-label">${l}</div>
              </div>
            `).join('')}
          </div>
        </section>

        <aside class="side-panel">
          <h2>🛡 Conservation Matters</h2>
          <p>The Philippines is one of the world's biodiversity-rich countries. Let's work together to protect our natural heritage.</p>
          <ul class="conservation-list">
            <li><span>✓</span> Protect forests and marine habitats</li>
            <li><span>✓</span> Reduce plastic waste</li>
            <li><span>✓</span> Support conservation efforts</li>
            <li><span>✓</span> Spread awareness</li>
          </ul>
          <button class="primary btn-learn" data-page="conservation">Learn More →</button>

          <div class="quick-tools-box">
            <h3>Quick Tools</h3>
            <button class="quick-tool-btn" data-page="explore">⌕ Search Species</button>
            <button class="quick-tool-btn" data-page="admin">⚙ Manage Records</button>
            <button class="quick-tool-btn" data-action="export">↓ Export Backup</button>
          </div>
        </aside>
      </div>
    `;
  }

  function explore(){
    const list=species().filter(x=>
      (x.name+' '+x.scientific+' '+x.habitat).toLowerCase().includes(searchText.toLowerCase()) &&
      (!categoryFilter||x.category===categoryFilter) &&
      (!statusFilter||x.status===statusFilter)
    );

    app.innerHTML=`
      <div class="section-head">
        <h2>Explore Philippine Species</h2>
        <span class="muted">${list.length} species found</span>
      </div>
      <div class="filters">
        <input id="search" placeholder="Search species or scientific name…" value="${esc(searchText)}">
        <select id="category">
          <option value="">All categories</option>
          ${['Bird','Mammal','Reptile','Amphibian','Plant','Marine','Insect','Other'].map(v=>
            `<option ${categoryFilter===v?'selected':''}>${v}</option>`
          ).join('')}
        </select>
        <select id="status">
          <option value="">All conservation statuses</option>
          ${['Critically Endangered','Endangered','Vulnerable','Near Threatened','Least Concern','Data Deficient','Not Evaluated'].map(v=>
            `<option ${statusFilter===v?'selected':''}>${v}</option>`
          ).join('')}
        </select>
      </div>
      <div class="species-grid">
        ${list.length?list.map(card).join(''):'<div class="empty">No species found. Try another search or filter.</div>'}
      </div>
    `;
  }

  function admin(){
    if(!session){
      app.innerHTML=`
        <div class="panel" style="max-width:560px;margin:20px auto">
          <h2>Admin Login</h2>
          <p class="muted">Mag-sign in gamit ang email at password ng account na ginawa mo sa Supabase Authentication → Users.</p>
          <form id="login-form">
            <label>Email</label>
            <input name="email" type="email" required autocomplete="username">
            ${passwordField('password','Password','current-password')}
            <p><button class="btn" type="submit">Sign In</button></p>
            <p id="login-error" class="muted"></p>
          </form>
          <div class="notice">Public visitors can browse species. Kailangan lang mag-login para magdagdag, mag-edit, o mag-delete.</div>
        </div>
      `;
      return;
    }

    app.innerHTML=`
      <div class="section-head">
        <h2>Manage Species</h2>
        <div>
          <span class="muted">${esc(session.user.email||'Admin')}</span>
          <button class="btn secondary small" data-action="change-password">Change Password</button>
          <button class="btn secondary small" data-action="logout">Sign Out</button>
          <button class="btn" data-action="add">＋ Add Species</button>
        </div>
      </div>

      <div class="notice">Admin mode: ang changes at uploaded images ay mase-save sa Supabase at makikita sa ibang device.</div>

      <div class="panel">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Species</th><th>Category</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              ${species().map(x=>`
                <tr>
                  <td><b>${esc(x.name)}</b><br><i class="muted">${esc(x.scientific)}</i></td>
                  <td>${esc(x.category)}</td>
                  <td>${esc(x.status)}</td>
                  <td>
                    <button class="btn secondary small" data-action="edit" data-id="${esc(x.id)}">Edit</button>
                    <button class="btn danger small" data-action="delete" data-id="${esc(x.id)}">Delete</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <p>
          <button class="btn secondary" data-action="export">Export JSON Backup</button>
          <button class="btn secondary" data-action="import">Import JSON Backup</button>
          <input id="import-file" type="file" accept="application/json" hidden>
        </p>
      </div>
    `;
  }

  function changePasswordForm(){
    app.innerHTML=`
      <div class="section-head">
        <h2>Change Admin Password</h2>
        <button class="btn secondary" data-page="admin">← Back</button>
      </div>

      <form id="password-form" class="panel" style="max-width:560px;margin:20px auto">
        <p class="muted">I-verify ang kasalukuyang password bago magpalit.</p>

        ${passwordField('currentPassword','Current Password','current-password')}
        ${passwordField('newPassword','New Password','new-password',8)}
        ${passwordField('confirmPassword','Confirm New Password','new-password',8)}

        <p class="muted">Gumamit ng hindi bababa sa 8 characters.</p>

        <p>
          <button class="btn" type="submit">Update Password</button>
          <button class="btn secondary" type="button" data-page="admin">Cancel</button>
        </p>

        <p id="password-error" class="muted"></p>
      </form>
    `;
  }

  function favoritesPage(){
    const list=species().filter(x=>isFav(x.id));
    app.innerHTML=`
      <div class="section-head"><h2>♥ Your Favorites</h2></div>
      <div class="species-grid">
        ${list.length?list.map(card).join(''):'<div class="empty">Wala ka pang naka-save na favorite. Pindutin ang ♡ sa species card.</div>'}
      </div>
    `;
  }

  function conservation(){
    app.innerHTML=`
      <div class="panel">
        <h2>Conservation Matters</h2>
        <p class="muted">The Philippines is one of the world's biodiversity-rich countries. Protecting habitats helps preserve wildlife and ecological balance.</p>
        <h3>How you can help</h3>
        <ul>
          <li>Protect forests, mangroves, coral reefs, and wetlands.</li>
          <li>Never buy products made from threatened wildlife.</li>
          <li>Reduce waste and avoid single-use plastics.</li>
          <li>Support responsible ecotourism and local conservation groups.</li>
          <li>Share reliable information about native species.</li>
        </ul>
        <h3>Conservation status guide</h3>
        <p><b>Critically Endangered</b> — extremely high risk of extinction.</p>
        <p><b>Endangered</b> — very high risk of extinction.</p>
        <p><b>Vulnerable</b> — high risk of extinction.</p>
        <p><b>Near Threatened</b> — close to qualifying as threatened.</p>
        <p><b>Least Concern</b> — lower risk based on current assessment.</p>
        <div class="notice">For school or scientific use, verify current conservation assessments with authoritative sources.</div>
      </div>
    `;
  }

  function about(){
    app.innerHTML=`
      <div class="panel">
        <h2>About the Project</h2>
        <p class="muted">Biodiversity Species Explorer is an educational website about Philippine wildlife, plants, habitats, and conservation.</p>
        <h3>Features</h3>
        <ul>
          <li>Online Supabase species catalog</li>
          <li>Search and category filters</li>
          <li>Admin login and species management</li>
          <li>Image uploads to Supabase Storage</li>
          <li>Favorites stored on this browser</li>
          <li>JSON backup and restore</li>
          <li>Responsive design</li>
        </ul>
        <p class="notice">Species records and images are online. Favorites remain saved in this browser only.</p>
      </div>
    `;
  }

  function render(){
    document.querySelectorAll('[data-page]').forEach(el=>
      el.classList.toggle('active',el.dataset.page===page)
    );

    const favCount=$('#fav-count');
    if(favCount) favCount.textContent=favorites.length;

    ({
      home,
      explore,
      admin,
      favorites:favoritesPage,
      conservation,
      about,
      'change-password':changePasswordForm
    }[page]||home)();
  }

  function categoryEmoji(category){
    return ({Bird:'🐦',Mammal:'🐾',Reptile:'🦎',Amphibian:'🐸',Plant:'🌿',Marine:'🐠',Insect:'🦋',Other:'🌱'})[category]||'🌱';
  }

  // Track the Species Profile as a same-page history layer.
  // On mobile, Back closes the profile instead of leaving the website.
  let speciesProfileHistoryOpen = false;

  function showDetail(id){
    const x=species().find(s=>String(s.id)===String(id));
    if(!x)return;

    if(!speciesProfileHistoryOpen){
      history.pushState(
        {...(history.state||{}), biodiversitySpeciesProfile:true},
        '',
        location.href
      );
      speciesProfileHistoryOpen=true;
    }

    modal.classList.remove('hidden');
    modal.innerHTML=`
      <div class="modal-box species-detail-modal">
        <div class="modal-head detail-modal-head">
          <div>
            <p class="detail-kicker">BIODIVERSITY GROUP 1 · SPECIES PROFILE</p>
            <h2>${esc(x.name)}</h2>
          </div>
          <button class="close" data-action="close" aria-label="Close details">✕</button>
        </div>
        <div class="detail-layout">
          <div class="detail-image-wrap">
            ${x.image
              ? `<img src="${esc(x.image)}" alt="${esc(x.name)}" data-zoom-image>`
              : `<div class="detail-emoji">${esc(x.emoji||'🌿')}</div>`}
          </div>
          <div class="detail-information">
            <div class="detail-field">
              <span class="detail-label">🏷️ Common Name *</span>
              <strong>${esc(x.name||'Not provided')}</strong>
            </div>
            <div class="detail-field">
              <span class="detail-label">🔬 Scientific Name</span>
              <em>${esc(x.scientific||'Not provided')}</em>
            </div>
            <div class="detail-field">
              <span class="detail-label">🌱 Category *</span>
              <strong class="detail-category">${categoryEmoji(x.category)} ${esc(x.category||'Other')}</strong>
            </div>
            <div class="detail-field">
              <span class="detail-label">🛡️ Conservation Status</span>
              <span class="detail-status ${statusClass(x.status).includes('danger-status')?'is-danger':''}">${esc(x.status||'Not Evaluated')}</span>
            </div>
            <div class="detail-field">
              <span class="detail-label">🌍 Habitat / Location</span>
              <p>${esc(x.habitat||'No habitat or location information provided.')}</p>
            </div>
            <div class="detail-field">
              <span class="detail-label">📝 Description</span>
              <p>${esc(x.description||'No description provided.')}</p>
            </div>
            <button class="btn secondary detail-favorite" data-action="favorite" data-id="${esc(x.id)}">
              ${isFav(x.id)?'♥ Remove Favorite':'♡ Add to Favorites'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function editForm(id){
    const x=id?species().find(s=>String(s.id)===String(id)):null;
    editing=x?.id||null;

    app.innerHTML=`
      <div class="section-head">
        <h2>${x?'Edit Species':'Add New Species'}</h2>
        <button class="btn secondary" data-page="admin">← Back</button>
      </div>

      <form id="species-form" class="panel">
        <div class="form-grid">
          <div><label>Common Name *</label><input name="name" required value="${esc(x?.name||'')}"></div>
          <div><label>Scientific Name</label><input name="scientific" value="${esc(x?.scientific||'')}"></div>
          <div>
            <label>Category *</label>
            <select name="category" required>
              ${['Bird','Mammal','Reptile','Amphibian','Plant','Marine','Insect','Other'].map(v=>
                `<option ${x?.category===v?'selected':''}>${v}</option>`
              ).join('')}
            </select>
          </div>
          <div>
            <label>Conservation Status</label>
            <select name="status">
              ${['Critically Endangered','Endangered','Vulnerable','Near Threatened','Least Concern','Data Deficient','Not Evaluated'].map(v=>
                `<option ${x?.status===v?'selected':''}>${v}</option>`
              ).join('')}
            </select>
          </div>
          <div class="full"><label>Habitat / Location</label><input name="habitat" value="${esc(x?.habitat||'')}"></div>
          <div class="full"><label>Description</label><textarea name="description">${esc(x?.description||'')}</textarea></div>
          <div class="full">
            <label>Species Image</label>
            <input id="photo" type="file" accept="image/jpeg,image/png,image/webp">
            <small class="muted">JPG, PNG, WEBP. Maximum 5 MB.</small>
            ${x?.image?`<img src="${esc(x.image)}" style="display:block;max-width:220px;max-height:150px;margin-top:10px;object-fit:contain">`:''}
          </div>
        </div>
        <p>
          <button class="btn" type="submit">${x?'Save Changes':'Save Species'}</button>
          <button class="btn secondary" type="button" data-page="admin">Cancel</button>
        </p>
      </form>
    `;
  }

  async function uploadImage(file){
    if(!file)return null;

    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){
      throw new Error('Pumili ng JPG, PNG o WEBP na hindi lalampas sa 5 MB.');
    }

    const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
    const path=`${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const {error}=await client.storage.from('species-images').upload(path,file,{
      upsert:false,
      contentType:file.type
    });

    if(error)throw error;

    const {data}=client.storage.from('species-images').getPublicUrl(path);
    return data.publicUrl;
  }

  // Capture image clicks before modal/card handlers can intercept them.
  // This works for the large image inside the Species Profile modal too.
  document.addEventListener('click',e=>{
    const zoomImage=e.target.closest('[data-zoom-image]');
    if(!zoomImage)return;

    e.preventDefault();
    e.stopImmediatePropagation();
    openImageZoom(zoomImage.currentSrc || zoomImage.src,zoomImage.alt || 'Species image');
  },true);

  document.addEventListener('click',async e=>{

    const nav=e.target.closest('[data-page]');

    if(nav){
      e.preventDefault();
      page=nav.dataset.page;
      render();

      // Every top navigation and footer Quick Link returns the page
      // to the top, including when the selected page is already active.
      window.scrollTo({top:0,behavior:'smooth'});
      return;
    }

    const b=e.target.closest('[data-action]');
    if(!b)return;

    const action=b.dataset.action;
    const id=b.dataset.id;

    if(action==='toggle-password'){
      const input=document.getElementById(b.dataset.target);
      if(input){
        const showing=input.type==='password';
        input.type=showing?'text':'password';
        b.textContent=showing?'🙈':'👁️';
        b.setAttribute('aria-label',showing?'Hide password':'Show password');
        b.setAttribute('aria-pressed',String(showing));
        b.title=showing?'Hide password':'Show password';
      }
      return;
    }

    if(action==='category'){
      categoryFilter=b.dataset.category;
      searchText='';
      statusFilter='';
      page='explore';
      render();
    }

    if(action==='favorite'){
      const sid=String(id);
      favorites=isFav(sid)
        ? favorites.filter(v=>v!==sid)
        : [...favorites,sid];

      saveFav();
      render();

      if(!modal.classList.contains('hidden'))showDetail(sid);
    }

    if(action==='detail')showDetail(id);

    if(action==='close'){
      if(speciesProfileHistoryOpen){
        history.back();
      }else{
        modal.classList.add('hidden');
        modal.innerHTML='';
      }
    }

    if(action==='add'){
      if(!session){
        page='admin';
        render();
        return;
      }
      editForm();
    }

    if(action==='edit'){
      if(!session)return;
      editForm(id);
    }

    if(action==='change-password'){
      if(!session){
        alert('Mag-login muna.');
        return;
      }
      page='change-password';
      render();
    }

    if(action==='delete'){
      const x=species().find(s=>String(s.id)===String(id));

      if(x&&confirm(`Delete ${x.name}?`)){
        const {error}=await client.from('species').delete().eq('id',id);

        if(error){
          alert('Hindi na-delete: '+error.message);
        }else{
          await loadSpecies();
          page='admin';
          render();
        }
      }
    }

    if(action==='logout'){
      await client.auth.signOut();
      session=null;
      page='admin';
      render();
    }

    if(action==='export'){
      const blob=new Blob([
        JSON.stringify({species:species(),favorites},null,2)
      ],{type:'application/json'});

      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download='biodiversity-backup.json';
      a.click();
      URL.revokeObjectURL(url);
    }

    if(action==='import')$('#import-file')?.click();
  });

  // CLOSE IMAGE ZOOM WITH ESCAPE KEY
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      closeImageZoom();
    }
  });

  document.addEventListener('input',e=>{
    if(e.target.id==='search'){
      searchText=e.target.value;
      explore();
      const el=$('#search');
      el.focus();
      el.setSelectionRange(searchText.length,searchText.length);
    }
  });

  document.addEventListener('change',e=>{
    if(e.target.id==='category'){
      categoryFilter=e.target.value;
      explore();
    }

    if(e.target.id==='status'){
      statusFilter=e.target.value;
      explore();
    }

    if(e.target.id==='import-file'&&e.target.files[0]){
      const reader=new FileReader();

      reader.onload=async()=>{
        try{
          const d=JSON.parse(reader.result);

          if(!Array.isArray(d.species))throw new Error('Invalid backup');
          if(!session)throw new Error('Mag-login muna.');

          for(const x of d.species){
            if(String(x.id).startsWith('demo-'))continue;

            const {error}=await client.from('species').upsert(toRow(x));
            if(error)throw error;
          }

          await loadSpecies();
          page='admin';
          render();
          alert('Na-import ang backup sa Supabase.');
        }catch(err){
          alert('Hindi na-import: '+err.message);
        }
      };

      reader.readAsText(e.target.files[0]);
    }
  });

  document.addEventListener('submit',async e=>{
    if(e.target.id==='login-form'){
      e.preventDefault();

      const fd=new FormData(e.target);

      const {data,error}=await client.auth.signInWithPassword({
        email:String(fd.get('email')).trim(),
        password:String(fd.get('password'))
      });

      if(error){
        $('#login-error').textContent=error.message;
        return;
      }

      session=data.session;
      page='admin';
      render();
      return;
    }

    if(e.target.id==='password-form'){
      e.preventDefault();

      if(!session){
        alert('Mag-login muna.');
        page='admin';
        render();
        return;
      }

      const fd=new FormData(e.target);

      const currentPassword=String(fd.get('currentPassword')||'');
      const newPassword=String(fd.get('newPassword')||'');
      const confirmPassword=String(fd.get('confirmPassword')||'');

      const errorBox=$('#password-error');
      const submitButton=e.target.querySelector('[type="submit"]');

      if(newPassword.length<8){
        errorBox.textContent='Ang bagong password ay dapat may hindi bababa sa 8 characters.';
        return;
      }

      if(newPassword!==confirmPassword){
        errorBox.textContent='Hindi magkapareho ang bagong password at confirmation.';
        return;
      }

      if(newPassword===currentPassword){
        errorBox.textContent='Gumamit ng ibang password.';
        return;
      }

      submitButton.disabled=true;
      submitButton.textContent='Updating...';
      errorBox.textContent='';

      try{
        const {data:loginData,error:loginError}=
          await client.auth.signInWithPassword({
            email:session.user.email,
            password:currentPassword
          });

        if(loginError)throw new Error('Mali ang current password.');

        session=loginData.session;

        const {error:updateError}=await client.auth.updateUser({
          password:newPassword
        });

        if(updateError)throw updateError;

        alert('Matagumpay na napalitan ang iyong password!');

        page='admin';
        render();
        return;

      }catch(err){
        errorBox.textContent='Hindi napalitan ang password: '+err.message;
        submitButton.disabled=false;
        submitButton.textContent='Update Password';
      }

      return;
    }

    if(e.target.id!=='species-form')return;

    e.preventDefault();

    if(!session){
      alert('Mag-login muna.');
      return;
    }

    const fd=new FormData(e.target);
    const d=Object.fromEntries(fd.entries());
    const existing=editing
      ? species().find(x=>String(x.id)===String(editing))
      : null;

    const submit=e.target.querySelector('[type="submit"]');
    submit.disabled=true;
    submit.textContent='Saving…';

    try{
      let image=existing?.image||'';
      const file=$('#photo').files[0];

      if(file)image=await uploadImage(file);

      const record={
        name:d.name.trim(),
        scientific:d.scientific.trim(),
        category:d.category,
        habitat:d.habitat.trim(),
        status:d.status,
        description:d.description.trim(),
        image
      };

      let result;

      if(editing){
        result=await client.from('species')
          .update(toRow(record)).eq('id',editing);
      }else{
        result=await client.from('species').insert(toRow(record));
      }

      if(result.error)throw result.error;

      await loadSpecies();
      page='admin';
      render();
      alert('Na-save na sa Supabase database!');

    }catch(err){
      alert('Hindi na-save: '+err.message);
      submit.disabled=false;
      submit.textContent=editing?'Save Changes':'Save Species';
    }
  });

  init();
})();