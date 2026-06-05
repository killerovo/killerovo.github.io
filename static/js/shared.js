// shared.js — back-to-top button + visitor counter
(function() {
  // ---- Back to top button ----
  var btn = document.createElement('button');
  btn.id = 'scrollTopBtn';
  btn.innerHTML = '↑';
  btn.title = '回到顶部';
  document.body.appendChild(btn);

  function toggleBtn() {
    if (window.scrollY > 400) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }
  window.addEventListener('scroll', toggleBtn, { passive: true });
  btn.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  toggleBtn();

  // ---- Supabase visitor counter ----
  var SUPABASE_URL = 'https://qudyifwqcdququqndomb.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_vn5kUwJrK0rMLqkUtjAmHA_YPOWlHm-';

  var counterEl = document.getElementById('visitor-count');
  if (!counterEl) return;

  // 1. 读取当前计数并显示
  fetch(SUPABASE_URL + '/rest/v1/visitors?select=count&id=eq.1', {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY
    }
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    var current = (data && data[0]) ? (data[0].count || 0) : 0;
    counterEl.textContent = '👁 ' + (current + 1) + ' 次访问';

    // 2. 自增 +1（去重：同 session 不重复计数）
    if (sessionStorage.getItem('_vc')) return;
    sessionStorage.setItem('_vc', '1');

    var newCount = current + 1;
    fetch(SUPABASE_URL + '/rest/v1/visitors?id=eq.1', {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ count: newCount })
    });
  })
  .catch(function() {
    counterEl.textContent = '';
  });
})();
