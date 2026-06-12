/* LUPO flow animation: a lead dot travels the inbound pipeline.
   Qualified loops end on the rep's calendar; every third loop is junk,
   gets caught at Qualification, and exits amber to the filtered terminal.
   No dependencies. Pauses off-screen. Reduced motion = static diagram. */
(function () {
    'use strict';

    var CHANNELS = ['Web form', 'Email', 'Chat', 'Phone call'];
    var SIGNALS = ['Funding raised', 'Hiring spike', 'M&A news'];
    var JUNK = ['Vendor pitch', 'Job applicant', 'No buying signal'];
    var STATIC_CHAN = 'Web form · Email · Chat · Phone';
    var STATIC_SIG = 'Funding · Hiring · M&A';
    var STATIC_JUNK = 'Vendor pitch · No buying signal';
    var STAGE_X = [110, 355, 600, 845, 1090];

    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    function init(band) {
        var main = band.querySelector('.lf-main');
        var junkPath = band.querySelector('.lf-junk');
        var dotg = band.querySelector('.lf-dotg');
        var stages = {};
        var nodes = band.querySelectorAll('.lf-stage');
        for (var i = 0; i < nodes.length; i++) stages[nodes[i].getAttribute('data-s')] = nodes[i];
        var chipChan = band.querySelector('[data-chip="chan"]');
        var chipSig = band.querySelector('[data-chip="signal"]');
        var chipJunk = band.querySelector('[data-chip="junk"]');
        if (!main || !junkPath || !dotg || !stages['5']) return;

        function setStatic() {
            ['0', '1', '2', '3', '4'].forEach(function (k) { stages[k].classList.add('on'); });
            stages['5'].classList.add('bad');
            chipChan.textContent = STATIC_CHAN;
            chipSig.textContent = STATIC_SIG;
            chipJunk.textContent = STATIC_JUNK;
            chipSig.classList.remove('lf-hide');
            chipJunk.classList.remove('lf-hide');
            dotg.style.display = 'none';
            band.classList.add('lf-static');
        }

        var rm = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (rm.matches) return setStatic();
        if (rm.addEventListener) rm.addEventListener('change', function (e) {
            if (e.matches) { running = false; if (raf) cancelAnimationFrame(raf); setStatic(); }
        });

        /* Geometry: stage marks as path lengths (x is monotonic along the arc) */
        var mainLen = 0, junkLen = 0, marks = null;
        function lenAtX(path, total, x) {
            var lo = 0, hi = total;
            for (var i = 0; i < 22; i++) {
                var mid = (lo + hi) / 2;
                if (path.getPointAtLength(mid).x < x) lo = mid; else hi = mid;
            }
            return (lo + hi) / 2;
        }
        function computeGeom() {
            try {
                mainLen = main.getTotalLength();
                junkLen = junkPath.getTotalLength();
            } catch (e) { mainLen = 0; }
            if (!mainLen) { marks = null; return; }
            marks = [];
            for (var i = 0; i < STAGE_X.length; i++) marks.push(lenAtX(main, mainLen, STAGE_X[i]));
        }

        function dotMove(path, len) {
            var p = path.getPointAtLength(len);
            dotg.setAttribute('transform', 'translate(' + p.x + ' ' + p.y + ')');
        }

        function setChip(chip, text) {
            if (chip.classList.contains('lf-hide')) {
                chip.textContent = text;
                chip.classList.remove('lf-hide');
                return;
            }
            if (chip.textContent === text) return;
            chip.classList.add('lf-hide');
            setTimeout(function () { chip.textContent = text; chip.classList.remove('lf-hide'); }, 240);
        }

        function light(k) { stages[k].classList.add('on'); }
        function flag(k) { stages[k].classList.add('bad'); }
        function fadeAll() {
            for (var k in stages) stages[k].classList.remove('on', 'bad');
            chipJunk.classList.add('lf-hide');
            dotg.classList.remove('lf-bad');
        }

        /* Timeline */
        var loopIdx = 0, qCount = 0, jCount = 0;
        function buildSteps() {
            var isJunk = loopIdx % 3 === 2;
            var chan = CHANNELS[loopIdx % 4];
            var steps = [];
            steps.push({ fn: function () {
                fadeAll();
                if (!marks) computeGeom();
                setChip(chipChan, chan);
                setChip(chipSig, STATIC_SIG);
                if (marks) dotMove(main, 0);
                dotg.classList.add('lf-show');
                light('0');
            } });
            steps.push({ ms: 650 });
            steps.push({ seg: [0, 1], ms: 1050 });
            steps.push({ fn: function () { light('1'); } });
            steps.push({ ms: 520 });
            steps.push({ seg: [1, 2], ms: 1050 });
            if (!isJunk) {
                steps.push({ fn: function () { light('2'); } });
                steps.push({ ms: 680 });
                steps.push({ seg: [2, 3], ms: 1050 });
                steps.push({ fn: function () { light('3'); setChip(chipSig, SIGNALS[qCount % 3]); } });
                steps.push({ ms: 760 });
                steps.push({ seg: [3, 4], ms: 1050 });
                steps.push({ fn: function () { light('4'); dotg.classList.remove('lf-show'); qCount++; } });
                steps.push({ ms: 1600 });
            } else {
                steps.push({ fn: function () {
                    flag('2');
                    setChip(chipJunk, JUNK[jCount % 3]);
                    dotg.classList.add('lf-bad');
                } });
                steps.push({ ms: 950 });
                steps.push({ junk: true, ms: 950 });
                steps.push({ fn: function () { flag('5'); dotg.classList.remove('lf-show'); jCount++; } });
                steps.push({ ms: 1600 });
            }
            steps.push({ fn: fadeAll });
            steps.push({ ms: 700 });
            return steps;
        }

        /* Engine */
        var stepList = null, stepIdx = 0, stepStart = 0, raf = 0, running = false, pendingReset = false;
        function frame(ts) {
            if (!running) return;
            if (pendingReset) { stepStart = ts; pendingReset = false; }
            if (!stepList) { stepList = buildSteps(); stepIdx = 0; stepStart = ts; }
            var guard = 0;
            while (stepIdx < stepList.length && guard++ < 24) {
                var s = stepList[stepIdx];
                if (s.fn) { s.fn(); stepIdx++; stepStart = ts; continue; }
                var el = ts - stepStart;
                if (s.seg || s.junk) {
                    var d = Math.min(1, el / s.ms);
                    if (marks) {
                        var e = ease(d);
                        if (s.seg) dotMove(main, marks[s.seg[0]] + (marks[s.seg[1]] - marks[s.seg[0]]) * e);
                        else dotMove(junkPath, junkLen * e);
                    }
                    if (d < 1) break;
                    stepIdx++; stepStart = ts; continue;
                }
                if (el < s.ms) break;
                stepIdx++; stepStart = ts;
            }
            if (stepIdx >= stepList.length) { loopIdx++; stepList = null; }
            raf = requestAnimationFrame(frame);
        }

        function start() {
            if (running) return;
            running = true;
            pendingReset = true;
            if (!marks) computeGeom();
            raf = requestAnimationFrame(frame);
        }
        function stop() {
            running = false;
            if (raf) cancelAnimationFrame(raf);
        }

        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) pendingReset = true;
        });

        var mq = window.matchMedia('(min-width: 841px)');
        if (mq.addEventListener) mq.addEventListener('change', function (e) {
            if (e.matches) computeGeom();
        });

        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries) {
                if (entries[0].isIntersecting) start(); else stop();
            }, { threshold: 0.2 });
            io.observe(band);
        } else {
            start();
        }
    }

    function boot() {
        var bands = document.querySelectorAll('.lf-band');
        for (var i = 0; i < bands.length; i++) init(bands[i]);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
