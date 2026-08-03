(function () {
  "use strict";

  const DOUBLE_TAP_MS = 300;
  const SWIPE_MIN_DX = 60;
  const SWIPE_MAX_DY_RATIO = 0.6;

  const display = document.getElementById("display");

  const state = {
    sets: [],
    words: [],
    lastSentenceKey: "",
    mode: "sentence", // "sentence" | "word"
    wordIndex: 0,
    letterIndex: -1, // -1 = no letter highlight
  };

  let pendingSingleTap = null;
  let lastTapAt = 0;
  let touchStart = null;
  let swipeConsumed = false;

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

  function applySentence(words) {
    state.words = words;
    state.mode = "sentence";
    state.wordIndex = 0;
    clearLetterHighlight();
    render(true);
  }

  function loadNewSentence() {
    clearPendingSingleTap();
    const words = generateSentence();
    if (words.length === 0) return;
    applySentence(words);
  }

  function showFullSentence() {
    clearPendingSingleTap();
    state.mode = "sentence";
    state.wordIndex = 0;
    clearLetterHighlight();
    render(true);
  }

  function advanceWord() {
    if (state.words.length === 0) return;

    clearLetterHighlight();

    if (state.mode === "sentence") {
      state.mode = "word";
      state.wordIndex = 0;
      render(true);
      return;
    }

    if (state.wordIndex >= state.words.length - 1) {
      showFullSentence();
      return;
    }

    state.wordIndex += 1;
    render(true);
  }

  function advanceLetterHighlight() {
    if (state.mode !== "word") return;

    const word = state.words[state.wordIndex] || "";
    if (word.length === 0) return;

    if (state.letterIndex < 0) {
      state.letterIndex = 0;
    } else if (state.letterIndex >= word.length - 1) {
      clearLetterHighlight();
    } else {
      state.letterIndex += 1;
    }

    // Same word — only toggle highlight classes (no rebuild / re-fit).
    updateLetterHighlight();
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
      letters[i].classList.toggle("is-active", highlighting && i === state.letterIndex);
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

    // Fade out first while keeping the current text + size, then swap
    // content and mode together so a full sentence never flashes at word size.
    display.classList.add("is-updating");
    display.classList.remove("is-entering");

    window.setTimeout(function () {
      applyContent();
      display.classList.remove("is-updating");
      display.classList.add("is-entering");
    }, 70);
  }

  function showError(message) {
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

  function clearPendingSingleTap() {
    if (pendingSingleTap !== null) {
      window.clearTimeout(pendingSingleTap);
      pendingSingleTap = null;
    }
  }

  function handlePrimaryAction() {
    const now = Date.now();
    const sinceLast = now - lastTapAt;
    lastTapAt = now;

    if (sinceLast > 0 && sinceLast < DOUBLE_TAP_MS) {
      clearPendingSingleTap();
      // Letter highlight only applies in word view; ignore on sentence view.
      advanceLetterHighlight();
      return;
    }

    clearPendingSingleTap();
    pendingSingleTap = window.setTimeout(function () {
      pendingSingleTap = null;
      advanceWord();
    }, DOUBLE_TAP_MS);
  }

  function onKeyDown(event) {
    if (event.repeat) return;

    if (event.code === "Space" || event.key === " ") {
      event.preventDefault();
      handlePrimaryAction();
      return;
    }

    if (event.code === "Enter" || event.key === "Enter") {
      event.preventDefault();
      loadNewSentence();
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

    if (
      !swipeConsumed &&
      dx < -SWIPE_MIN_DX &&
      Math.abs(dy) < Math.abs(dx) * SWIPE_MAX_DY_RATIO
    ) {
      swipeConsumed = true;
      clearPendingSingleTap();
      lastTapAt = 0;
      loadNewSentence();
    }
  }

  function onPointerUp(event) {
    if (!touchStart || event.pointerId !== touchStart.id) return;

    const wasSwipe = swipeConsumed;
    touchStart = null;
    swipeConsumed = false;

    try {
      display.releasePointerCapture(event.pointerId);
    } catch (_) {
      /* ignore */
    }

    if (wasSwipe) return;
    handlePrimaryAction();
  }

  function onPointerCancel() {
    touchStart = null;
    swipeConsumed = false;
  }

  function preventGestureDefaults(event) {
    event.preventDefault();
  }

  async function init() {
    display.addEventListener("pointerdown", onPointerDown);
    display.addEventListener("pointermove", onPointerMove);
    display.addEventListener("pointerup", onPointerUp);
    display.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("keydown", onKeyDown);
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
