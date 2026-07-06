/* LUPO flow animation: the full inbound path, lit as a lead travels it.
   Someone arrives -> captured on their channel in seconds (Received / Engaged /
   Answered, the channel-honest verb) -> LUPO identifies AND enriches from what the
   channel actually yields (form + reverse-IP, sender domain, chat answers, details
   confirmed live on a call; plus the person, on US traffic) -> qualifies -> scores
   fit and intent -> books -> writes to the CRM. Capture comes BEFORE identify on
   purpose: a phone call is answered first and enriched from what the caller
   confirms, never the other way round. One loop in four is a freemail signup the
   agent resolves by asking; junk loops are caught at Qualified and exit amber to
   the filtered terminal. The loop is junk-dominant and opens on junk on purpose:
   most inbound is noise, so the filter is the visible headline.
   No dependencies. Pauses off-screen. Reduced motion = static labelled diagram. */
(function () {
    'use strict';

    var CHANNELS = ['Web form', 'Email', 'Chat', 'Phone'];
    /* Beat-2 verb is channel-honest: chat/phone are live exchanges (Engaged/Answered);
       a web form or email is received and acted on, never "engaged". Neutral "Captured"
       covers the static "Any channel" state. One canonical path, true word per channel. */
    var ENGAGE_VERB = { 'Web form': 'Received', 'Email': 'Received', 'Chat': 'Engaged', 'Phone': 'Answered' };
    /* Identify method is channel-honest too: enrichment starts from whatever the
       channel actually yields, and on the phone that is only what the caller confirms. */
    var ID_METHOD = { 'Web form': 'form + reverse-IP', 'Email': 'sender domain · matching', 'Chat': 'asked in chat', 'Phone': 'confirmed on the call' };
    var IDENT = ['Vantage Logistics · 140 staff', 'Northwind SaaS · 320 staff', 'Crestpoint Capital · 90 staff'];
    /* Junk has its OWN identities: the agencies and recruiters that actually clog inbound,
       paired so the reveal and the filter reason stay coherent (a real buyer is never the vendor). */
    var JUNK = [
        { who: 'Apex SEO Agency · 15 staff', why: 'Vendor pitch' },
        { who: 'TalentBridge Staffing · 60 staff', why: 'Recruiter, not a buyer' },
        { who: 'GrowthLoop Agency · 18 staff', why: 'Vendor pitch' }
    ];
    var POLICY = 'against your ICP';
    var STATIC_CHAN = 'Any channel · in seconds';
    var STATIC_SIG = 'Fit + intent';
    var STATIC_ID = 'Company · + person (US)';
    var STAGE_X = [70, 250, 430, 615, 800, 985, 1140];
    /* Loop order: junk-dominant AND junk-first on purpose. Most inbound is noise, so the
       very first thing shown is a lead being filtered out, and the filter stays the visible
       headline. Real buyers (0 company, 1 person-US, 3 freemail) interleave with junk (2):
       four filtered to three booked per cycle. */
    var SEQ = [2, 0, 2, 1, 2, 3, 2];

    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    function init(band) {
        var main = band.querySelector('.lf-main');
        var junkPath = band.querySelector('.lf-junk');
        var dotg = band.querySelector('.lf-dotg');
        var rectA = band.querySelector('.lf-reva');
        var rectB = band.querySelector('.lf-revb');
        var stages = {};
        var nodes = band.querySelectorAll('.lf-stage');
        for (var i = 0; i < nodes.length; i++) stages[nodes[i].getAttribute('data-s')] = nodes[i];
        var engageLabel = stages['1'] ? stages['1'].querySelector('.lf-label') : null;
        var arriveChip = stages['0'] ? stages['0'].querySelector('.lf-chip') : null;
        var chipCompany = band.querySelector('[data-chip="company"]');
        var chipChan = band.querySelector('[data-chip="chan"]');
        var chipSig = band.querySelector('[data-chip="signal"]');
        var chipJunk = band.querySelector('[data-chip="junk"]');
        var tallyBad = band.querySelector('.lf-tally-bad');
        var tallyOk = band.querySelector('.lf-tally-ok');
        function renderTally(f, b) {
            if (tallyBad) tallyBad.textContent = 'Filtered ' + f;
            if (tallyOk) tallyOk.textContent = 'Booked ' + b;
        }
        if (!main || !junkPath || !dotg || !stages['6'] || !stages['7']) return;

        function setRect(rect, w) { if (rect) rect.setAttribute('width', w); }

        function setStatic() {
            ['0', '1', '2', '3', '4', '5', '6'].forEach(function (k) { stages[k].classList.add('on'); });
            stages['7'].classList.add('bad');
            chipCompany.classList.remove('lf-ghost');
            chipCompany.textContent = STATIC_ID;
            chipChan.textContent = STATIC_CHAN;
            chipSig.textContent = STATIC_SIG;
            chipJunk.textContent = POLICY;
            if (engageLabel) engageLabel.textContent = 'Captured';
            if (arriveChip) arriveChip.textContent = 'Anonymous visitor';
            renderTally(4, 3);
            [chipCompany, chipChan, chipSig, chipJunk].forEach(function (c) { c.classList.remove('lf-hide'); });
            setRect(rectA, 1200);
            setRect(rectB, 1200);
            dotg.style.display = 'none';
            band.classList.add('lf-static');
        }

        var rm = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (rm.matches) return setStatic();
        if (rm.addEventListener) rm.addEventListener('change', function (e) {
            if (e.matches) { running = false; if (raf) cancelAnimationFrame(raf); setStatic(); }
        });

        /* Geometry: stage marks as path lengths (x is monotonic along the trajectory) */
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

        /* Move the dot and reveal the lit trail up to it */
        function dotMove(path, len, rect) {
            var p = path.getPointAtLength(len);
            dotg.setAttribute('transform', 'translate(' + p.x + ' ' + p.y + ')');
            if (rect) rect.setAttribute('width', Math.max(0, p.x + 6));
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
            dotg.classList.remove('lf-bad');
            chipCompany.classList.remove('lf-ghost');
            setRect(rectA, 0);
            setRect(rectB, 0);
        }

        /* Timeline. Loop order is SEQ (junk-dominant: most inbound is noise, so the filter
           is the visible headline). Variants: 0 company reveal, 1 person (US), 2 junk
           (filtered), 3 freemail resolved by asking. Tally accumulates filtered vs booked. */
        var loopIdx = 0, qCount = 0, jCount = 0, cCount = 0, bookedN = 0, filteredN = 0;
        function buildSteps() {
            var variant = SEQ[loopIdx % SEQ.length];
            var isJunk = variant === 2;
            var isFree = variant === 3;
            var chan = isFree ? 'Web form' : CHANNELS[loopIdx % 4];
            var company = IDENT[cCount % IDENT.length];
            var junk = isJunk ? JUNK[jCount % JUNK.length] : null;
            var steps = [];

            /* Beat 0 - someone arrives, anonymous */
            steps.push({ fn: function () {
                fadeAll();
                if (!marks) computeGeom();
                setChip(chipCompany, ID_METHOD[chan] || 'matching');
                setChip(chipChan, chan + ' · in seconds');
                setChip(chipSig, STATIC_SIG);
                setChip(chipJunk, POLICY);
                if (engageLabel) engageLabel.textContent = ENGAGE_VERB[chan] || 'Captured';
                if (arriveChip) arriveChip.textContent = chan === 'Phone' ? 'Unknown caller' : 'Anonymous visitor';
                if (marks) dotMove(main, 0, rectA);
                dotg.classList.add('lf-show');
                light('0');
            } });
            steps.push({ ms: 720 });
            steps.push({ seg: [0, 1], ms: 1000 });

            /* Beat 1 - captured, in seconds, on the channel they used. Before any
               identity work: the call is answered, the form lands, the chat opens. */
            steps.push({ fn: function () { light('1'); } });
            steps.push({ ms: 560 });
            steps.push({ seg: [1, 2], ms: 1000 });

            /* Beat 2 - identify & enrich from what the channel gave us (company
               always; person only on US; freemail resolved by asking) */
            steps.push({ fn: function () {
                light('2');
                if (isFree) { chipCompany.classList.add('lf-ghost'); setChip(chipCompany, 'jane@gmail.com'); }
                else if (isJunk) { setChip(chipCompany, junk.who); }
                else { setChip(chipCompany, company); }
            } });
            steps.push({ ms: 820 });
            steps.push({ fn: function () {
                if (isFree) { chipCompany.classList.remove('lf-ghost'); setChip(chipCompany, 'LUPO asks who they work with'); }
                else if (variant === 1) { setChip(chipCompany, '+ person-level · US'); }
            } });
            steps.push({ ms: isFree ? 880 : 560 });
            if (isFree) {
                steps.push({ fn: function () { setChip(chipCompany, 'Resolved · Acme Brands'); } });
                steps.push({ ms: 760 });
            }
            steps.push({ seg: [2, 3], ms: 1000 });

            if (!isJunk) {
                /* Beat 3 qualify */
                steps.push({ fn: function () { light('3'); } });
                steps.push({ ms: 600 });
                steps.push({ seg: [3, 4], ms: 1000 });
                /* Beat 4 score: fit + intent, two axes. Enrichment already happened at identify. */
                steps.push({ fn: function () { light('4'); } });
                steps.push({ ms: 680 });
                steps.push({ seg: [4, 5], ms: 1000 });
                /* Beat 5 book */
                steps.push({ fn: function () { light('5'); } });
                steps.push({ ms: 560 });
                steps.push({ seg: [5, 6], ms: 1000 });
                /* Beat 6 written to CRM */
                steps.push({ fn: function () { light('6'); dotg.classList.remove('lf-show'); qCount++; if (!isFree) cCount++; bookedN++; renderTally(filteredN, bookedN); } });
                steps.push({ ms: 1700 });
            } else {
                /* Junk: identified, then caught at Qualified and filtered out */
                steps.push({ fn: function () {
                    flag('3');
                    setChip(chipJunk, junk.why);
                    dotg.classList.add('lf-bad');
                } });
                steps.push({ ms: 920 });
                steps.push({ junk: true, ms: 950 });
                steps.push({ fn: function () { flag('7'); dotg.classList.remove('lf-show'); jCount++; filteredN++; renderTally(filteredN, bookedN); } });
                steps.push({ ms: 1700 });
            }
            steps.push({ fn: fadeAll });
            steps.push({ ms: 700 });
            return steps;
        }

        /* Engine */
        var stepList = null, stepIdx = 0, stepStart = 0, raf = 0, running = false, pendingReset = false, entered = false;
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
                        if (s.seg) dotMove(main, marks[s.seg[0]] + (marks[s.seg[1]] - marks[s.seg[0]]) * e, rectA);
                        else dotMove(junkPath, junkLen * e, rectB);
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
            if (!entered) {
                entered = true;
                band.classList.add('lf-in');
                setTimeout(function () { if (running) raf = requestAnimationFrame(frame); }, 750);
                return;
            }
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
