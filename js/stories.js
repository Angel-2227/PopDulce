// ============================================================
//  PopDulce – stories.js  (v2)
// ============================================================

import {
  collection, getDocs, query, orderBy, where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let stories = [];
let currentIndex = 0;
let storyTimer   = null;
const STORY_DURATION = 5000;
const SEEN_KEY       = 'pd_seen_stories';

function toDriveImgUrl(url) {
  if (!url) return '';
  const m1 = url.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if (m1) return `https://lh3.googleusercontent.com/d/${m1[1]}`;
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m2) return `https://lh3.googleusercontent.com/d/${m2[1]}`;
  return url;
}

export async function initStories() {
  await loadStories();
  setupModal();
}

async function loadStories() {
  const track = document.getElementById('storiesTrack');
  const strip  = document.querySelector('.stories-strip');
  try {
    const snap = await getDocs(
      query(collection(window._db, 'stories'),
        where('active', '==', true),
        orderBy('createdAt', 'desc'))
    );
    stories = snap.docs.map(d => {
      const data = d.data();
      return { id:d.id, ...data, thumbnailUrl: toDriveImgUrl(data.thumbnailUrl), videoUrl: data.videoUrl||'' };
    });
  } catch (e) {
    console.warn('Stories error:', e);
    stories = [];
  }
  if (!stories.length) { if (strip) strip.style.display='none'; return; }
  if (strip) strip.style.display='';
  renderBubbles(track);
}

function renderBubbles(track) {
  track.innerHTML = '';
  const seen = JSON.parse(localStorage.getItem(SEEN_KEY)||'[]');
  stories.forEach((story, i) => {
    const bubble = document.createElement('div');
    bubble.className = 'story-bubble';
    const isSeen = seen.includes(story.id);
    bubble.innerHTML = `
      <div class="story-ring ${isSeen?'seen':''}">
        <div class="story-inner-ring">
          ${story.thumbnailUrl
            ? `<img src="${story.thumbnailUrl}" alt="${story.title||'Story'}" loading="lazy"
                 onerror="this.style.display='none';this.parentElement.textContent='${story.emoji||'🎂'}'" />`
            : `<span style="font-size:1.7rem">${story.emoji||'🎂'}</span>`}
        </div>
      </div>
      <span class="story-label">${story.title||'PopDulce'}</span>`;
    bubble.addEventListener('click', () => openStoryModal(i));
    track.appendChild(bubble);
  });
}

function setupModal() {
  document.getElementById('storyClose').addEventListener('click', closeStoryModal);
  document.getElementById('storyPrev').addEventListener('click', () => navigateStory(-1));
  document.getElementById('storyNext').addEventListener('click', () => navigateStory(1));
  document.getElementById('storyModal').addEventListener('click', e => {
    if (e.target === document.getElementById('storyModal')) closeStoryModal();
  });
  document.addEventListener('keydown', e => {
    if (document.getElementById('storyModal').style.display !== 'none') {
      if (e.key==='ArrowRight') navigateStory(1);
      if (e.key==='ArrowLeft')  navigateStory(-1);
      if (e.key==='Escape')     closeStoryModal();
    }
  });
}

function openStoryModal(index) {
  currentIndex = index;
  document.getElementById('storyModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  renderCurrentStory();
}

function renderCurrentStory() {
  const story = stories[currentIndex];
  if (!story) { closeStoryModal(); return; }
  clearTimeout(storyTimer);

  const seen = JSON.parse(localStorage.getItem(SEEN_KEY)||'[]');
  if (!seen.includes(story.id)) {
    seen.push(story.id);
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
    document.querySelectorAll('.story-bubble')[currentIndex]?.querySelector('.story-ring')?.classList.add('seen');
  }

  // Progress bar
  const bar = document.getElementById('storyProgressBar');
  bar.innerHTML = '';
  const fill = document.createElement('div');
  fill.style.cssText = `position:absolute;left:0;top:0;height:100%;background:#fff;border-radius:3px;animation:storyProgress ${STORY_DURATION}ms linear forwards;`;
  bar.appendChild(fill);

  const content = document.getElementById('storyContent');
  if (story.type === 'video' && story.videoUrl) {
    content.innerHTML = `
      <video autoplay muted playsinline style="width:100%;height:100%;object-fit:contain;border-radius:var(--radius-lg)">
        <source src="${story.videoUrl}" />
      </video>
      <div class="story-caption"><h4>${story.title||''}</h4><p>${story.caption||''}</p></div>`;
  } else {
    const bg = story.thumbnailUrl || '';
    const bgStyle = bg
      ? `background-image:url('${bg}');background-size:contain;background-repeat:no-repeat;background-position:center;background-color:#000;`
      : `background:linear-gradient(135deg,var(--rose-deep),var(--lavender));`;
    content.innerHTML = `
      <div style="width:100%;height:100%;border-radius:var(--radius-lg);position:relative;${bgStyle}">
        ${!bg?`<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:4.5rem">${story.emoji||'🎂'}</div>`:''}
        <div class="story-caption">
          <h4>${story.title||'PopDulce'}</h4>
          <p>${story.caption||''}</p>
          ${story.ctaText&&story.ctaUrl
            ?`<a href="${story.ctaUrl}" target="_blank" style="display:inline-block;margin-top:.65rem;padding:.45rem 1.1rem;background:#fff;color:var(--rose-deep);border-radius:20px;font-size:.78rem;font-weight:700">${story.ctaText}</a>`:''}
        </div>
      </div>`;
  }

  storyTimer = setTimeout(() => navigateStory(1), STORY_DURATION);
  document.getElementById('storyPrev').style.opacity = currentIndex > 0 ? '.6' : '0';
  document.getElementById('storyNext').style.opacity = currentIndex < stories.length-1 ? '.6' : '.2';
}

function navigateStory(dir) {
  currentIndex += dir;
  if (currentIndex < 0 || currentIndex >= stories.length) { closeStoryModal(); return; }
  renderCurrentStory();
}

function closeStoryModal() {
  clearTimeout(storyTimer);
  document.getElementById('storyModal').style.display = 'none';
  document.body.style.overflow = '';
}