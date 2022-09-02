const isDebug = false;
const log = (...args) => {
  if (isDebug) {
    console.log(...args);
  }
};

function stopSeekAndClick() {
  chrome.storage.sync.get("interval", ({ interval }) => {
    chrome.storage.sync.set({ interval: null });
    clearInterval(interval);
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("autoclicker-ext-form");
  const textInput = document.getElementById("autoclicker-ext-search-text");
  const tagInput = document.getElementById("autoclicker-ext-search-tag");
  const searchIdInput = document.getElementById("autoclicker-ext-search-id");
  const iframeIdInput = document.getElementById("autoclicker-ext-iframe-id");
  const customAttribInput = document.getElementById(
    "autoclicker-ext-custom-attrib"
  );
  const submitButton = document.getElementById("autoclicker-ext-enable");
  const stopButton = document.getElementById("autoclicker-ext-disable");

  chrome.storage.sync.get("interval", ({ interval }) => {
    if (!!interval) {
      submitButton.value = "Running search...";
      submitButton.disabled = true;
      stopButton.disabled = false;
    } else {
      submitButton.value = "Start seek & click";
      stopButton.disabled = true;
      submitButton.disabled = false;
    }
  });

  chrome.storage.sync.get("data", ({ data }) => {
    if (!data) return;
    const { tag, search, searchId, iframeId, customAttrib } = data;
    tagInput.value = tag || "";
    textInput.value = search || "";
    searchIdInput.value = searchId || "";
    iframeIdInput.value = iframeId || "";
    customAttribInput.value = customAttrib || "";
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (e.submitter.id === "autoclicker-ext-disable") {
      log("Stopping seek & click...");
      submitButton.value = "Start seek & click";
      stopButton.disabled = true;
      submitButton.disabled = false;
      let [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: stopSeekAndClick,
      });
      return;
    }

    log("Running seek & click...");
    submitButton.value = "Running search...";
    submitButton.disabled = true;
    stopButton.disabled = false;

    chrome.storage.sync.set({
      data: {
        search: form.elements.search.value,
        tag: form.elements.tag.value,
        searchId: form.elements.searchId.value,
        delay: Number(form.elements.delay.value),
        iframeId: form.elements.iframeId.value,
        customAttrib: form.elements.customAttrib.value,
      },
    });

    log("search set to", form.elements.search.value);
    log("searchId set to", form.elements.searchId.value);
    log("tag set to", form.elements.tag.value);
    log("iframeId set to", form.elements.iframeId.value);
    log("customAttrib set to", form.elements.customAttrib.value);

    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: startSeekAndClick,
    });
  });
});

function startSeekAndClick() {
  function getElementsByText(document, str, tag = "button") {
    return new Array(...document.getElementsByTagName(tag)).filter(
      (el) => !!el && String(el.innerText).startsWith(str)
    );
  }

  chrome.storage.sync.get("data", ({ data }) => {
    if (!data) return;

    function notFound() {
      clearInterval(interval);
    }

    const interval = setInterval(() => {
      let element;
      let selectedDocument = document;
      if (!!data.iframeId) {
        selectedDocument = document
          ? document.getElementById(data.iframeId)?.contentWindow?.document
          : null;
        if (!selectedDocument) {
          notFound();
          return;
        }
      }

      element =
        data.searchId !== ""
          ? selectedDocument.getElementById(data.searchId)
          : getElementsByText(selectedDocument, data.search, data.tag)[0];

      if (element) {
        if (!!data.customAttrib) {
          const [attribKey, attribValue] = data.customAttrib
            .replaceAll('"', "")
            .split("=");
          if (
            element.hasAttribute(attribKey) &&
            element.getAttribute(attribKey) === attribValue
          ) {
            element.click();
          }
        } else {
          element.click();
        }
        chrome.storage.sync.get("element", ({ oldElement }) => {
          if (element !== oldElement) {
            chrome.storage.sync.set({ interval, element });
          }
        });
      }
    }, 1);
  });
}
