const content_dir = 'contents/';
const config_file = 'config.yml';
const section_names = ['home', 'blogs', 'publications', 'tools'];

window.addEventListener('DOMContentLoaded', function() {

    // ---- Nav scroll background ----
    const nav = document.getElementById('mainNav');
    function updateNavBg() {
        if (window.scrollY > 60) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    }
    window.addEventListener('scroll', updateNavBg, { passive: true });
    updateNavBg();

    // ---- Mobile nav toggle ----
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navbarResponsive');

    navToggle.addEventListener('click', function() {
        navToggle.classList.toggle('active');
        navLinks.classList.toggle('open');
    });

    // Close mobile nav on link click
    navLinks.querySelectorAll('a').forEach(function(link) {
        link.addEventListener('click', function() {
            navToggle.classList.remove('active');
            navLinks.classList.remove('open');
        });
    });

    // ---- Nav active state (Intersection Observer) ----
    var navLinkEls = navLinks.querySelectorAll('a');
    var sectionIds = [];
    navLinkEls.forEach(function(a) {
        var href = a.getAttribute('href');
        if (href && href.startsWith('#')) {
            sectionIds.push(href.substring(1));
        }
    });

    var observerOptions = {
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0
    };

    var activeSection = '';
    var sectionObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                activeSection = entry.target.id;
            }
        });
        // Update active nav link
        navLinkEls.forEach(function(a) {
            var href = a.getAttribute('href');
            if (href === '#' + activeSection) {
                a.classList.add('active');
            } else {
                a.classList.remove('active');
            }
        });
    }, observerOptions);

    sectionIds.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) sectionObserver.observe(el);
    });

    // ---- Scroll Reveal ----
    var revealObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(function(el) {
        revealObserver.observe(el);
    });

    // ---- Collapse toggle ----
    document.querySelectorAll('.collapse-toggle').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var targetId = btn.getAttribute('data-target');
            var target = document.getElementById(targetId);
            if (!target) return;

            var isExpanded = btn.getAttribute('aria-expanded') === 'true';

            if (isExpanded) {
                target.classList.remove('expanded');
                target.classList.add('collapsed');
                btn.setAttribute('aria-expanded', 'false');
            } else {
                target.classList.remove('collapsed');
                target.classList.add('expanded');
                btn.setAttribute('aria-expanded', 'true');
            }
        });
    });

    // ---- YAML Config ----
    fetch(content_dir + config_file)
        .then(function(response) { return response.text(); })
        .then(function(text) {
            var yml = jsyaml.load(text);
            Object.keys(yml).forEach(function(key) {
                try {
                    document.getElementById(key).innerHTML = yml[key];
                } catch (e) {
                    console.log('Unknown id: ' + key + ', value: ' + yml[key]);
                }
            });
        })
        .catch(function(error) { console.log(error); });

    // ---- Markdown Content ----
    marked.use({ mangle: false, headerIds: false });

    section_names.forEach(function(name) {
        fetch(content_dir + name + '.md')
            .then(function(response) { return response.text(); })
            .then(function(markdown) {
                var html = marked.parse(markdown);
                var el = document.getElementById(name + '-md');
                if (el) el.innerHTML = html;
            })
            .then(function() {
                var el = document.getElementById(name + '-md');
                if (!el) return;
                var links = el.querySelectorAll('a');
                links.forEach(function(link) {
                    link.setAttribute('target', '_blank');
                    link.setAttribute('rel', 'noopener noreferrer');
                });
                if (typeof MathJax !== 'undefined') {
                    MathJax.typeset();
                }
            })
            .catch(function(error) { console.log(error); });
    });

});
