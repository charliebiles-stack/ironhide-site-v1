(function () {
  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* menu */
  var toggle = document.querySelector('.bar-toggle');
  var nav = document.getElementById('menu');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
      toggle.textContent = open ? 'Close' : 'Menu';
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); toggle.textContent = 'Menu'; }
    });
  }

  /* entrances: heading, then text, then picture, staggered */
  var items = [].slice.call(document.querySelectorAll('[data-reveal]'));
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    items.forEach(function (el, i) {
      var parent = el.parentElement, sibs = parent ? [].slice.call(parent.children).filter(function (c) { return c.hasAttribute('data-reveal'); }) : [];
      el.style.setProperty('--d', Math.min(sibs.indexOf(el), 5) * 80 + 'ms');
      io.observe(el);
    });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  /* phone hero: background video (desktop keeps the photo and never downloads it) */
  var hv = document.querySelector('.hero-video');
  if (hv && !reduce && window.matchMedia('(max-width: 640px)').matches) {
    hv.src = hv.getAttribute('data-src');
    var p = hv.play(); if (p && p.catch) p.catch(function () {});
  }

  /* gigs: hide past dates, find the next one, count down */
  var gigs = [].slice.call(document.querySelectorAll('[data-date]')).map(function (el) {
    return { el: el, d: new Date(el.getAttribute('data-date')) };
  });
  var now = new Date();
  gigs.forEach(function (g) { if (g.d.getTime() < now.getTime() - 4 * 3600e3) g.el.hidden = true; });
  var upcoming = gigs.filter(function (g) { return !g.el.hidden; }).sort(function (a, b) { return a.d - b.d; });
  var next = upcoming[0];

  document.querySelectorAll('[data-next]').forEach(function (box) {
    if (!next) {
      box.querySelector('[data-next-venue]').textContent = 'New dates soon';
      box.querySelector('[data-next-when]').textContent = 'Follow @ironhide.band';
      var c0 = box.querySelector('[data-countdown]'); if (c0) c0.hidden = true;
      return;
    }
    var a = next.el.dataset;
    box.querySelector('[data-next-venue]').textContent = a.venue + ', ' + a.town;
    box.querySelector('[data-next-when]').textContent = a.when;
    var c = box.querySelector('[data-countdown]');
    if (c) {
      var startOfDay = function (d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
      var days = Math.round((startOfDay(next.d) - startOfDay(now)) / 864e5);
      c.textContent = days <= 0 ? 'Tonight' : days === 1 ? 'Tomorrow' : 'In ' + days + ' days';
      c.hidden = false;
    }
  });

  /* hero picture drifts with the scroll */
  var heroImg = document.querySelector('.hero-photo');
  if (heroImg && !reduce) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        heroImg.style.transform = 'translateY(' + Math.min(window.scrollY, 900) * 0.12 + 'px)';
        ticking = false;
      });
    }, { passive: true });
  }

  /* lightbox: full-size pictures open over the page */
  var tiles = [].slice.call(document.querySelectorAll('.tile'));
  if (tiles.length && document.querySelector('.tile .strip a')) {
    var shots = tiles.map(function (t) {
      var a = t.querySelector('a.pic');
      return a ? { src: a.getAttribute('href'), alt: t.querySelector('img').alt, cap: (t.querySelector('.strip span') || {}).textContent || '' } : null;
    });
    var lb, img, capSpan, dl;
    var cur = 0, opener = null, x0 = null;
    var build = function () {
      lb = document.createElement('div');
      lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Picture viewer');
      lb.innerHTML = '<button type="button" class="lb-x">Close</button><button type="button" class="lb-prev" aria-label="Previous picture">←</button><img alt=""><div class="lb-cap"><span></span><a download>Download</a></div><button type="button" class="lb-next" aria-label="Next picture">→</button>';
      document.body.appendChild(lb);
      img = lb.querySelector('img');
      capSpan = lb.querySelector('.lb-cap span');
      dl = lb.querySelector('.lb-cap a');
      img.addEventListener('load', function () { img.classList.add('on'); });
      lb.addEventListener('click', function (e) {
        if (e.target === lb || e.target.classList.contains('lb-x')) close();
        else if (e.target.classList.contains('lb-prev')) show(cur - 1);
        else if (e.target.classList.contains('lb-next')) show(cur + 1);
      });
      lb.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      lb.addEventListener('touchend', function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0; x0 = null;
        if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
      });
    };
    var show = function (n) {
      cur = (n + shots.length) % shots.length;
      var s = shots[cur];
      img.classList.remove('on');
      var swap = function () { img.src = s.src; img.alt = s.alt; };
      if (lb.classList.contains('open') && !reduce) setTimeout(swap, 200); else swap();
      capSpan.textContent = s.cap + ' (' + (cur + 1) + '/' + shots.length + ')';
      dl.href = s.src;
    };
    var open = function (n, from) {
      if (!lb) build();
      opener = from; show(n);
      lb.classList.add('open'); doc.style.overflow = 'hidden';
      lb.querySelector('.lb-x').focus();
    };
    var close = function () {
      lb.classList.remove('open'); doc.style.overflow = '';
      if (opener) opener.focus();
    };
    tiles.forEach(function (t, i) {
      [].forEach.call(t.querySelectorAll('a.pic, .strip a'), function (a) {
        a.addEventListener('click', function (e) {
          if (e.metaKey || e.ctrlKey || e.shiftKey) return;
          e.preventDefault(); open(i, a);
        });
      });
    });
    document.addEventListener('keydown', function (e) {
      if (!lb || !lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(cur - 1);
      else if (e.key === 'ArrowRight') show(cur + 1);
      else if (e.key === 'Tab') {
        var f = [].slice.call(lb.querySelectorAll('button, a')), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* contact form: sends to the band's inbox; falls back to the visitor's email app */
  var form = document.getElementById('enquiry');
  if (form) {
    var to = form.getAttribute('data-to');
    var status = document.getElementById('form-status');
    var btn = form.querySelector('button[type=submit]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = new FormData(form);
      if (f.get('_honey')) return;
      var name = (f.get('name') || '').toString().trim();
      var subject = 'Booking enquiry from ' + (name || 'the Ironhide website');
      var data = {
        name: name, email: f.get('email'), venue: f.get('venue'), date: f.get('date'), message: f.get('message'),
        _subject: subject, _captcha: 'false', _template: 'table'
      };
      var fallback = function () {
        var body = ['Name: ' + name, 'Email: ' + (f.get('email') || ''), 'Venue or event: ' + (f.get('venue') || ''), 'Date: ' + (f.get('date') || ''), '', (f.get('message') || '').toString()].join('\n');
        if (status) status.textContent = 'That didn’t send, so we’re opening your email app instead…';
        window.location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      };
      if (status) status.textContent = 'Sending…';
      if (btn) btn.disabled = true;
      fetch('https://formsubmit.co/ajax/' + to, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok && String(res.j.success) === 'true') {
            if (status) status.textContent = 'Sent. Thanks, we’ll be in touch soon.';
            form.reset();
          } else { fallback(); }
        })
        .catch(fallback)
        .then(function () { if (btn) btn.disabled = false; });
    });
  }
})();
