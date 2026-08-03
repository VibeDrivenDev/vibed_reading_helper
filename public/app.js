(function () {
  "use strict";

  const LONG_PRESS_MS = 400;
  const SWIPE_MIN_DX = 110;
  const SWIPE_MAX_DY_RATIO = 0.55;
  const MOVE_CANCEL_PX = 18;

  const display = document.getElementById("display");

  const state = {
    sets: [],
    words: [],
    lastSentenceKey: "",
    mode: "sentence", // "sentence" | "word"
    wordIndex: 0,
    letterIndex: -1, // -1 = no letter highlight
    audio: {
      enabled: false,
      rate: 0.85,
    },
  };

  let touchStart = null;
  let swipeConsumed = false;
  let longPressTimer = null;
  let longPressFired = false;
  let spaceHoldTimer = null;
  let spaceHoldFired = false;

  function pickRandomItem(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function buildSentenceFromSet(set) {
    return set.groups.map(function (group) {
      return pickRandomItem(group);
    });
  }

  function sentenceKey(words) {
    return words.join(" ");
  }

  function generateSentence() {
    if (state.sets.length === 0) return [];

    let words = [];
    let key = "";
    let attempts = 0;

    do {
      const set = pickRandomItem(state.sets);
      words = buildSentenceFromSet(set);
      key = sentenceKey(words);
      attempts += 1;
    } while (key === state.lastSentenceKey && attempts < 12);

    state.lastSentenceKey = key;
    return words;
  }

  function clearLetterHighlight() {
    state.letterIndex = -1;
  }

  function stopSpeech() {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
  }

  function speak(text) {
    if (!state.audio.enabled || !text) return;
    if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== "function") {
      return;
    }

    stopSpeech();
    const utterance = new window.SpeechSynthesisUtterance(String(text));
    utterance.rate = state.audio.rate;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  function speakCurrentWord() {
    speak(state.words[state.wordIndex] || "");
  }

  function speakCurrentLetter() {
    const word = state.words[state.wordIndex] || "";
    if (state.letterIndex < 0 || state.letterIndex >= word.length) return;
    speak(word.charAt(state.letterIndex));
  }

  function speakSentence() {
    speak(state.words.join(" "));
  }

  function applySentence(words) {
    state.words = words;
    state.mode = "sentence";
    state.wordIndex = 0;
    clearLetterHighlight();
    stopSpeech();
    render(true);
  }

  function loadNewSentence() {
    clearPressTimers();
    const words = generateSentence();
    if (words.length === 0) return;
    applySentence(words);
  }

  function showFullSentence(withSpeech) {
    clearPressTimers();
    state.mode = "sentence";
    state.wordIndex = 0;
    clearLetterHighlight();
    render(true);
    if (withSpeech) {
      // Slight delay so the sentence is on screen before speech starts.
      window.setTimeout(speakSentence, 80);
    } else {
      stopSpeech();
    }
  }

  function advanceWord() {
    if (state.words.length === 0) return;

    clearLetterHighlight();

    if (state.mode === "sentence") {
      state.mode = "word";
      state.wordIndex = 0;
      render(true);
      window.setTimeout(speakCurrentWord, 80);
      return;
    }

    if (state.wordIndex >= state.words.length - 1) {
      showFullSentence(true);
      return;
    }

    state.wordIndex += 1;
    render(true);
    window.setTimeout(speakCurrentWord, 80);
  }

  function previousWord() {
    if (state.words.length === 0) return;
    if (state.mode === "sentence") return;

    clearLetterHighlight();

    if (state.wordIndex <= 0) {
      showFullSentence(false);
      return;
    }

    state.wordIndex -= 1;
    render(true);
    window.setTimeout(speakCurrentWord, 80);
  }

  function advanceLetterHighlight() {
    if (state.mode !== "word") return;

    const word = state.words[state.wordIndex] || "";
    if (word.length === 0) return;

    if (state.letterIndex < 0) {
      state.letterIndex = 0;
      updateLetterHighlight();
      speakCurrentLetter();
      return;
    }

    if (state.letterIndex >= word.length - 1) {
      clearLetterHighlight();
      updateLetterHighlight();
      speakCurrentWord();
      return;
    }

    state.letterIndex += 1;
    updateLetterHighlight();
    speakCurrentLetter();
  }

  function handleShortAction() {
    if (state.mode === "word" && state.letterIndex >= 0) {
      advanceLetterHighlight();
      return;
    }
    advanceWord();
  }

  function fitText(span) {
    if (!span || !span.textContent) return;

    const maxWidth = Math.floor(display.clientWidth * 0.9);
    const maxHeight = Math.floor(display.clientHeight * 0.88);
    if (maxWidth < 20 || maxHeight < 20) return;

    span.style.width = maxWidth + "px";
    span.style.fontSize = "8px";

    let low = 8;
    let high = Math.max(maxWidth, maxHeight);
    let best = low;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      span.style.fontSize = mid + "px";

      const fits =
        span.scrollWidth <= maxWidth + 1 &&
        span.scrollHeight <= maxHeight + 1;

      if (fits) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    span.style.fontSize = best + "px";
  }

  function buildLetterNodes(word) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < word.length; i += 1) {
      const letter = document.createElement("span");
      letter.className = "letter";
      letter.textContent = word.charAt(i);
      fragment.appendChild(letter);
    }
    return fragment;
  }

  function updateLetterHighlight() {
    const span = display.querySelector(".text");
    if (!span || state.mode !== "word") {
      render(false);
      return;
    }

    const letters = span.querySelectorAll(".letter");
    if (letters.length === 0) {
      render(false);
      return;
    }

    const highlighting = state.letterIndex >= 0;
    display.classList.toggle("mode-letters", highlighting);
    for (let i = 0; i < letters.length; i += 1) {
      letters[i].classList.toggle(
        "is-active",
        highlighting && i === state.letterIndex
      );
    }
  }

  function render(animate) {
    const text =
      state.mode === "word"
        ? state.words[state.wordIndex] || ""
        : state.words.join(" ");
    const isWord = state.mode === "word";
    const highlighting = isWord && state.letterIndex >= 0;

    display.classList.remove("error");

    function applyContent() {
      display.classList.toggle("mode-word", isWord);
      display.classList.toggle("mode-sentence", !isWord);
      display.classList.toggle("mode-letters", highlighting);

      let span = display.querySelector(".text");
      if (!span) {
        display.innerHTML = '<span class="text"></span>';
        span = display.querySelector(".text");
      }

      // Always use letter spans in word mode so highlight mode doesn't reflow.
      if (isWord) {
        span.replaceChildren(buildLetterNodes(text));
        const letters = span.querySelectorAll(".letter");
        for (let i = 0; i < letters.length; i += 1) {
          letters[i].classList.toggle(
            "is-active",
            highlighting && i === state.letterIndex
          );
        }
      } else {
        span.textContent = text;
      }
      fitText(span);
    }

    if (!animate) {
      display.classList.remove("is-updating", "is-entering");
      applyContent();
      return;
    }

    display.classList.add("is-updating");
    display.classList.remove("is-entering");

    window.setTimeout(function () {
      applyContent();
      display.classList.remove("is-updating");
      display.classList.add("is-entering");
    }, 70);
  }

  function showError(message) {
    stopSpeech();
    display.classList.add("error");
    display.classList.remove(
      "mode-word",
      "mode-sentence",
      "mode-letters",
      "is-updating",
      "is-entering"
    );
    display.textContent = message;
  }

  function clearPressTimers() {
    if (longPressTimer !== null) {
      window.clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    if (spaceHoldTimer !== null) {
      window.clearTimeout(spaceHoldTimer);
      spaceHoldTimer = null;
    }
  }

  function onKeyDown(event) {
    if (event.code === "Space" || event.key === " ") {
      event.preventDefault();
      if (event.repeat || spaceHoldTimer !== null || spaceHoldFired) return;

      spaceHoldFired = false;
      spaceHoldTimer = window.setTimeout(function () {
        spaceHoldTimer = null;
        spaceHoldFired = true;
        advanceLetterHighlight();
      }, LONG_PRESS_MS);
      return;
    }

    if (event.repeat) return;

    if (event.code === "Enter" || event.key === "Enter") {
      event.preventDefault();
      loadNewSentence();
      return;
    }

    if (event.code === "ArrowLeft") {
      event.preventDefault();
      previousWord();
    }
  }

  function onKeyUp(event) {
    if (event.code !== "Space" && event.key !== " ") return;
    event.preventDefault();

    const fired = spaceHoldFired;
    if (spaceHoldTimer !== null) {
      window.clearTimeout(spaceHoldTimer);
      spaceHoldTimer = null;
    }
    spaceHoldFired = false;

    if (!fired) {
      handleShortAction();
    }
  }

  function onPointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    touchStart = {
      x: event.clientX,
      y: event.clientY,
      id: event.pointerId,
    };
    swipeConsumed = false;
    longPressFired = false;

    if (longPressTimer !== null) {
      window.clearTimeout(longPressTimer);
    }

    longPressTimer = window.setTimeout(function () {
      longPressTimer = null;
      if (!touchStart || swipeConsumed) return;
      longPressFired = true;
      advanceLetterHighlight();
    }, LONG_PRESS_MS);

    try {
      display.setPointerCapture(event.pointerId);
    } catch (_) {
      /* ignore */
    }
  }

  function onPointerMove(event) {
    if (!touchStart || event.pointerId !== touchStart.id) return;

    const dx = event.clientX - touchStart.x;
    const dy = event.clientY - touchStart.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > MOVE_CANCEL_PX || absDy > MOVE_CANCEL_PX) {
      if (longPressTimer !== null) {
        window.clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }

    if (swipeConsumed) return;
    if (absDx < SWIPE_MIN_DX) return;
    if (absDy >= absDx * SWIPE_MAX_DY_RATIO) return;

    swipeConsumed = true;
    longPressFired = false;
    if (longPressTimer !== null) {
      window.clearTimeout(longPressTimer);
      longPressTimer = null;
    }

    if (dx < 0) {
      loadNewSentence();
    } else {
      previousWord();
    }
  }

  function onPointerUp(event) {
    if (!touchStart || event.pointerId !== touchStart.id) return;

    const wasSwipe = swipeConsumed;
    const wasLongPress = longPressFired;

    if (longPressTimer !== null) {
      window.clearTimeout(longPressTimer);
      longPressTimer = null;
    }

    touchStart = null;
    swipeConsumed = false;
    longPressFired = false;

    try {
      display.releasePointerCapture(event.pointerId);
    } catch (_) {
      /* ignore */
    }

    if (wasSwipe || wasLongPress) return;
    handleShortAction();
  }

  function onPointerCancel() {
    if (longPressTimer !== null) {
      window.clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    touchStart = null;
    swipeConsumed = false;
    longPressFired = false;
  }

  function preventGestureDefaults(event) {
    event.preventDefault();
  }

  function parseAudioConfig(raw) {
    const audio = raw && typeof raw === "object" ? raw : {};
    const rate = Number(audio.rate);
    const enabled = audio.enabled;
    return {
      enabled: enabled === true || enabled === "true" || enabled === 1 || enabled === "1",
      rate: Number.isFinite(rate) && rate > 0 ? Math.min(rate, 2) : 0.85,
    };
  }

  async function loadAudioConfig() {
    try {
      const response = await fetch("config.json", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      state.audio = parseAudioConfig(data.audio);
    } catch (_) {
      // Keep defaults (audio off) if config is missing.
    }
  }

  async function init() {
    display.addEventListener("pointerdown", onPointerDown);
    display.addEventListener("pointermove", onPointerMove);
    display.addEventListener("pointerup", onPointerUp);
    display.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("resize", function () {
      const span = display.querySelector(".text");
      if (span && !display.classList.contains("error")) {
        fitText(span);
      }
    });
    document.addEventListener("gesturestart", preventGestureDefaults, {
      passive: false,
    });
    document.addEventListener("contextmenu", preventGestureDefaults);

    await loadAudioConfig();

    try {
      const response = await fetch("sentences.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Could not load sentences.json");
      }
      const data = await response.json();

      const rawSets = Array.isArray(data.sets) ? data.sets : [];
      state.sets = rawSets
        .map(function (set) {
          const groups = Array.isArray(set.groups)
            ? set.groups
                .map(function (group) {
                  return (Array.isArray(group) ? group : [])
                    .map(function (word) {
                      return String(word).trim();
                    })
                    .filter(Boolean);
                })
                .filter(function (group) {
                  return group.length > 0;
                })
            : [];
          return {
            id: set.id || set.name || "",
            name: set.name || "",
            groups: groups,
          };
        })
        .filter(function (set) {
          return set.groups.length > 0;
        });

      if (state.sets.length === 0) {
        showError("No word sets configured. Add some to sentences.json.");
        return;
      }

      loadNewSentence();
    } catch (err) {
      console.error(err);
      showError("Unable to load sentences. Check sentences.json.");
    }
  }

  init();
})();
