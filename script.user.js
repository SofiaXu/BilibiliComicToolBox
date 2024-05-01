// ==UserScript==
// @name         B 漫工具箱
// @namespace    https://github.com/SofiaXu/BilibiliComicToolBox
// @version      2.1.2
// @description  进行一键购买和下载漫画的工具箱，对历史/收藏已读完漫画进行高亮为绿色，将阅读页面图片替换成原图大小
// @author       Aoba Xu
// @match        https://manga.bilibili.com/*
// @icon         https://www.bilibili.com/favicon.ico
// @require      https://cdn.bootcdn.net/ajax/libs/jszip/3.10.1/jszip.min.js
// @grant        none
// @license      MIT
// ==/UserScript==

(async function () {
  "use strict";
  const api = {
    getComicDetail: async (comicId) => {
      const res = await fetch(
        "https://manga.bilibili.com/twirp/comic.v1.Comic/ComicDetail?device=pc&platform=web",
        {
          headers: {
            accept: "application/json, text/plain, */*",
            "content-type": "application/json;charset=UTF-8",
          },
          body: `{\"comic_id\":${comicId}}`,
          method: "POST",
          credentials: "include",
        }
      );
      return await res.json();
    },
    buyEpisode: async (epId, buyMethod = 1, couponIds = undefined) => {
      const body = {
        buy_method: buyMethod,
        ep_id: epId,
      };
      if (couponIds) {
        body.coupon_ids = couponIds;
      }
      const res = await fetch(
        "https://manga.bilibili.com/twirp/comic.v1.Comic/BuyEpisode?device=pc&platform=web",
        {
          headers: {
            accept: "application/json, text/plain, */*",
            "content-type": "application/json;charset=UTF-8",
          },
          body: JSON.stringify(body),
          method: "POST",
          credentials: "include",
        }
      );
      return await res.json();
    },
    getEpisodeBuyInfo: async (epId) => {
      const res = await fetch(
        "https://manga.bilibili.com/twirp/comic.v1.Comic/GetEpisodeBuyInfo?device=pc&platform=web",
        {
          headers: {
            accept: "application/json, text/plain, */*",
            "content-type": "application/json;charset=UTF-8",
          },
          body: `{\"ep_id\":${epId}}`,
          method: "POST",
          credentials: "include",
        }
      );
      return await res.json();
    },
    updateAutoBuyComic: async (autoPayId, status = 1) => {
      const res = await fetch(
        "https://manga.bilibili.com/twirp/user.v1.User/UpdateAutoBuyComic?device=pc&platform=web",
        {
          headers: {
            accept: "application/json, text/plain, */*",
            "content-type": "application/json;charset=UTF-8",
          },
          body: `{\"id\":${autoPayId},\"order\":[2,3,1],\"auto_pay_status\":${status},\"biz_type\":0}`,
          method: "POST",
          credentials: "include",
        }
      );
      return await res.json();
    },
    getImageIndex: async (epId) => {
      const res = await fetch(
        "https://manga.bilibili.com/twirp/comic.v1.Comic/GetImageIndex?device=pc&platform=web",
        {
          headers: {
            accept: "application/json, text/plain, */*",
            "content-type": "application/json;charset=UTF-8",
          },
          body: `{"ep_id":${epId}}`,
          method: "POST",
          credentials: "include",
        }
      );
      return await res.json();
    },
    getImageToken: async (urls) => {
      const res = await fetch(
        "https://manga.bilibili.com/twirp/comic.v1.Comic/ImageToken?device=pc&platform=web",
        {
          headers: {
            accept: "application/json, text/plain, */*",
            "content-type": "application/json;charset=UTF-8",
          },
          body: JSON.stringify({ urls: JSON.stringify(urls) }),
          method: "POST",
          credentials: "include",
        }
      );
      return await res.json();
    },
    listFavorite: async (page, order) => {
      const result = await fetch(
        "https://manga.bilibili.com/twirp/bookshelf.v1.Bookshelf/ListFavorite?device=pc&platform=web",
        {
          headers: {
            accept: "application/json, text/plain, */*",
            "content-type": "application/json;charset=UTF-8",
          },
          body: `{"page_num":${page},"page_size":15,"order":${
            order === 4 ? 3 : order
          },"wait_free":${order === 4 ? 1 : 0}}`,
          method: "POST",
          credentials: "include",
        }
      );
      return await result.json();
    },
    listHistory: async (page) => {
      const result = await fetch(
        "https://manga.bilibili.com/twirp/bookshelf.v1.Bookshelf/ListHistory?device=pc&platform=web",
        {
          headers: {
            accept: "application/json, text/plain, */*",
            "content-type": "application/json;charset=UTF-8",
          },
          body: `{"page_num":${page},"page_size":15}`,
          method: "POST",
          credentials: "include",
        }
      );
      return await result.json();
    },
  };
  const createStyles = () => {
    const style = document.createElement("style");
    style.innerText += `.b-toolbox-d-flex { display: flex } .b-toolbox-d-none { display: none } .b-toolbox-flex-column { flex-direction: column }`;
    document.head.append(style);
    return {
      element: style,
      addStyle: (newStyle) => {
        style.innerText += newStyle;
      },
    };
  };
  const styles = createStyles();
  if (location.pathname.match(/^\/detail\/mc\d+$/)) {
    const createPopupPanel = (styles) => {
      const panel = document.createElement("div");
      styles.addStyle(
        `.b-toolbox-popup { top:70px; right: 1rem; position: fixed; border-radius: 6px; max-height: 50% }`
      );
      panel.className = "b-toolbox-popup b-toolbox-d-flex";
      document.body.append(panel);
      return panel;
    };
    const popupPanel = createPopupPanel(styles);
    const createToolboxPanel = (parentPanel, styles) => {
      const panel = document.createElement("div");
      styles.addStyle(
        `.b-toolbox-panel { margin-right: 1.5rem; background: rgba(255, 255, 255, 0.8); padding: 1rem; gap: 1rem }`
      );
      panel.className =
        "b-toolbox-panel b-toolbox-d-none b-toolbox-flex-column";
      parentPanel.append(panel);
      return panel;
    };
    const toolboxPanel = createToolboxPanel(popupPanel, styles);
    const createToolboxShowBtn = (parentPanel, showablePanel, styles) => {
      const container = document.createElement("div");
      container.className = "b-toolbox-d-flex b-toolbox-flex-column";
      parentPanel.append(container);
      const btn = document.createElement("button");
      btn.role = "button";
      btn.insertAdjacentHTML("beforeEnd", "<div>工具箱</div>");
      styles.addStyle(
        `.b-toolbox-toolbox-btn { align-items: center; background-color: #32aaff; border: none; border-radius: 6px; color: #fff; cursor: pointer; display: flex; justify-content: center; padding: 1rem 0.5rem }`
      );
      btn.className += "b-toolbox-toolbox-btn";
      container.append(btn);
      btn.onclick = () => {
        showablePanel.classList.toggle("b-toolbox-d-none");
        showablePanel.classList.toggle("b-toolbox-d-flex");
      };
    };
    createToolboxShowBtn(popupPanel, toolboxPanel, styles);
    const comicId = location.pathname.split("mc")[1];
    const comicInfo = await api.getComicDetail(comicId);
    const createStatusDisplay = (parentPanel) => {
      const panel = document.createElement("div");
      panel.className = "b-toolbox-d-flex b-toolbox-flex-column";
      panel.style.overflow = "auto";
      panel.insertAdjacentHTML("beforeEnd", "<div>等待任务</div>");
      parentPanel.append(panel);
      let timer = 0;
      const complete = () => {
        panel.insertAdjacentHTML("beforeEnd", "<div>已完成</div>");
        timer = setTimeout(() => {
          panel.innerHTML = "";
          panel.insertAdjacentHTML("beforeEnd", "<div>等待任务</div>");
        }, 2000);
      };
      return {
        element: panel,
        complete,
        clear: () => {
          clearTimeout(timer);
          panel.innerHTML = "";
          panel.insertAdjacentHTML("beforeEnd", "<div>等待任务</div>");
        },
        addStatus: (status) => {
          panel.insertAdjacentHTML("beforeEnd", `<div>${status}</div>`);
        },
      };
    };
    const statusDisplay = createStatusDisplay(toolboxPanel);
    const createBatchAutoPayBtn = (parentPanel, statusDisplay) => {
      const inputContainer = document.createElement("div");
      inputContainer.className = "b-toolbox-d-flex";
      parentPanel.append(inputContainer);
      const checkBox = document.createElement("input");
      checkBox.type = "checkbox";
      checkBox.checked = false;
      inputContainer.append(checkBox);
      const checkBoxLabel = document.createElement("label");
      checkBoxLabel.innerText = "使用通用券";
      inputContainer.append(checkBoxLabel);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.insertAdjacentHTML("beforeEnd", "<div>用券购买剩余项</div>");
      btn.className += "b-toolbox-toolbox-btn";
      parentPanel.append(btn);
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        const epList = comicInfo.data.ep_list;
        epList.reverse();
        const lockedEps = epList.filter((x) => x.is_locked);
        statusDisplay.addStatus(`共${lockedEps.length}个未解锁章节`);
        const canUseSilver = checkBox.checked;
        for (let i = 0; i < lockedEps.length; i++) {
          const ep = lockedEps[i];
          statusDisplay.addStatus(`正在购买第${ep.title}话`);
          const res = await api.getEpisodeBuyInfo(ep.id);
          if (res.data.allow_coupon && res.data.remain_coupon > 0) {
            const buyRes = await api.buyEpisode(
              ep.id,
              2,
              res.data.recommend_coupon_ids
            );
            if (buyRes.msg === "本话无需购买") {
              statusDisplay.addStatus(`第${ep.ord}话${ep.title}无需购买`);
            } else {
              statusDisplay.addStatus(
                `第${ep.ord}话${ep.title}话购买成功${
                  buyRes.data?.auto_use_item
                    ? "使用" + buyRes.data?.auto_use_item
                    : ""
                }`
              );
            }
          } else if (res.data.remain_silver > 0 && canUseSilver) {
            const buyRes = await api.buyEpisode(ep.id, 5);
            if (buyRes.msg === "本话无需购买") {
              statusDisplay.addStatus(`第${ep.ord}话${ep.title}无需购买`);
            } else {
              statusDisplay.addStatus(
                `第${ep.ord}话${ep.title}话购买成功${
                  buyRes.data?.auto_use_item
                    ? "使用" + buyRes.data?.auto_use_item
                    : ""
                }`
              );
            }
          } else {
            if (!res.data.allow_coupon) {
              statusDisplay.addStatus(`第${ep.ord}话${ep.title}不可用券购买`);
            }
            if (res.data.remain_coupon <= 0) {
              statusDisplay.addStatus(`券不足`);
              break;
            } else {
              statusDisplay.addStatus(`未知错误, 退出 ${res.msg}`);
              break;
            }
          }
          if (i % 5 === 0) {
            const delay = Math.floor(Math.random() * 1000) + 500;
            statusDisplay.addStatus(`等待${delay}ms`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
        statusDisplay.complete();
        btn.disabled = false;
      });
    };
    createBatchAutoPayBtn(toolboxPanel, statusDisplay);
    const safeFileName = (name) => {
      return name.replace(/[\\/:*?"<>|]/g, "_").replace(/\.\.$/, "_");
    };
    const createDownloadBtn = (parentPanel, statusDisplay) => {
      const inputContainer = document.createElement("div");
      inputContainer.className = "b-toolbox-d-flex b-toolbox-flex-column";
      parentPanel.append(inputContainer);
      const label = document.createElement("label");
      label.innerText = "下载范围（空则下载全部）";
      inputContainer.append(label);
      const rangeInput = document.createElement("input");
      rangeInput.type = "text";
      rangeInput.placeholder = "1-10, 12, 15-20";
      inputContainer.append(rangeInput);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.insertAdjacentHTML("beforeEnd", "<div>下载本书已购内容</div>");
      btn.className += "b-toolbox-toolbox-btn";
      parentPanel.append(btn);
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        const { storage, needExport } = (() => {
          if (window.showDirectoryPicker) {
            return {
              storage: window.showDirectoryPicker({
                id: "b-toolbox-download-folder",
                startIn: "desktop",
                mode: "readwrite",
              }),
              needExport: false,
            };
          } else {
            return {
              storage: navigator.storage.getDirectory(),
              needExport: true,
            };
          }
        })();
        const epList = comicInfo.data.ep_list;
        epList.reverse();
        let unlockedEps = epList.filter((x) => !x.is_locked);
        statusDisplay.addStatus(`共${unlockedEps.length}个已解锁章节`);
        const rangeValue = rangeInput.value;
        if (rangeValue) {
          const range = rangeValue.split(",").flatMap((x) => {
            if (x.includes("-")) {
              const [start, end] = x.split("-").map((y) => parseInt(y.trim()));
              return Array.from(
                { length: end - start + 1 },
                (_, i) => i + start
              );
            }
            return parseInt(x.trim());
          });
          if (range.length > 0) {
            unlockedEps = unlockedEps.filter((x) => range.includes(x.ord));
            statusDisplay.addStatus(`筛选${unlockedEps.length}个章节`);
          }
        }
        if (unlockedEps.length === 0) {
          statusDisplay.addStatus(`无需下载`);
          statusDisplay.complete();
          btn.disabled = false;
          return;
        }
        const dir = await storage;
        const comicFolder = await dir.getDirectoryHandle(
          safeFileName(comicInfo.data.title),
          {
            create: true,
          }
        );
        const epPadding = Math.ceil(Math.log10(epList.length));
        for (let i = 0; i < unlockedEps.length; i++) {
          const ep = unlockedEps[i];
          statusDisplay.addStatus(`正在下载第${ep.ord}话 ${ep.title}`);
          const res = await api.getImageIndex(ep.id);
          const urls = res.data.images.map((x) => x.path);
          const token = await api.getImageToken(urls);
          const downloadUrls = token.data.map(
            (x) => x.url + "?token=" + x.token
          );
          const epOrdString = ep.ord.toString();
          const epLocalPadding = epOrdString.includes(".")
            ? epOrdString.split(".")[1].length + 1 + epPadding
            : epPadding;
          const epTitle = `${ep.ord.toString().padStart(epLocalPadding, "0")}-${
            ep.title
          }`;
          const epFolder = await comicFolder.getDirectoryHandle(
            safeFileName(epTitle),
            {
              create: true,
            }
          );
          const padding = Math.ceil(Math.log10(downloadUrls.length));
          const tasks = downloadUrls.map(async (url, j) => {
            const file = await epFolder.getFileHandle(
              `${(j + 1).toString().padStart(padding, "0")}.jpg`,
              { create: true }
            );
            const writable = await file.createWritable();
            const res = await fetch(url);
            await res.body.pipeTo(writable);
          });
          await Promise.all(tasks);
          const delay = Math.floor(Math.random() * 10) * 1000;
          statusDisplay.addStatus(`等待${delay}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
        if (needExport) {
          statusDisplay.addStatus(`导出下载文件`);
          const zip = new JSZip();
          const comicZipFolder = zip.folder(comicFolder.name);
          const eps = comicFolder.values();
          for await (const ep of eps) {
            const epZipFolder = comicZipFolder.folder(ep.name);
            const files = ep.values();
            for await (const file of files) {
              const content = await file.getFile();
              epZipFolder.file(file.name, content);
            }
          }
          const blob = await zip.generateAsync({ type: "blob" });
          dir.removeEntry(comicFolder.name, { recursive: true });
          const a = document.createElement("a");
          const url = URL.createObjectURL(blob);
          a.href = url;
          a.download = `${comicFolder.name}.zip`;
          a.click();
          URL.revokeObjectURL(url);
        }
        statusDisplay.complete();
        btn.disabled = false;
      });
    };
    createDownloadBtn(toolboxPanel, statusDisplay);
  }
  if (
    location.pathname === "/account-center/my-favourite" ||
    location.pathname === "/account-center/read-history"
  ) {
    const config = { childList: true, subtree: true };
    const targetNode = document.body;
    const mangaMap = new Map();
    const createPriceTag = (price) => {
      const tag = document.createElement("div");
      tag.textContent = `${price}币`;
      tag.className = "b-toolbox-price-tag";
      return tag;
    };
    const processUnreadManga = async (manga, node) => {
      const isUnread =
        manga.last_ep_short_title !== manga.latest_ep_short_title;
      node.classList.add(
        isUnread ? "b-toolbox-manga-card-unread" : "b-toolbox-manga-card-read"
      );

      if (isUnread) {
        try {
          const priceKey = `manga_price_${manga.comic_id}`;
          const storedPrice = localStorage.getItem(priceKey);

          if (storedPrice !== null) {
            node.appendChild(createPriceTag(parseInt(storedPrice)));
          } else {
            const { data: detail } = await api.getEpisodeBuyInfo(
              manga.latest_ep_id
            );
            let price = detail?.pay_gold ?? 0;

            if (price === 0) {
              const { data } = await api.getComicDetail(manga.comic_id);
              price =
                data?.comic_type === 0
                  ? 0
                  : data?.ep_list?.slice(1).find((ep) => ep?.pay_gold !== 0)
                      ?.pay_gold ?? 0;
            }

            localStorage.setItem(priceKey, price.toString());
            node.appendChild(createPriceTag(price));
          }
        } catch (error) {
          console.error(`获取漫画：${manga.comic_id} 价格失败:`, error);
        }
      }
    };
    let page = 1;
    let order = parseInt(localStorage.getItem("BilibiliManga:favListOrder"));
    let lastPathname = location.pathname;
    let getNext =
      lastPathname === "/account-center/my-favourite"
        ? api.listFavorite
        : api.listHistory;
    const observer = new MutationObserver(async (mutationsList) => {
      const newOrder = parseInt(
        localStorage.getItem("BilibiliManga:favListOrder")
      );
      if (newOrder !== order) {
        order = newOrder;
        page = 1;
      }
      const newPathname = location.pathname;
      if (newPathname !== lastPathname) {
        if (newPathname === "/account-center/my-favourite") {
          getNext = api.listFavorite;
        } else {
          getNext = api.listHistory;
        }
        page = 1;
        lastPathname = newPathname;
      }
      const mangaList = (await getNext(page++, order)).data;
      mangaList.forEach((manga) => {
        mangaMap.set(manga.comic_id, manga);
      });
      styles.addStyle(`
        .b-toolbox-manga-card-read { background-color: rgb(123, 213, 85) }
        .b-toolbox-manga-card-unread { background-color: rgb(61, 180, 242) }
        .b-toolbox-price-tag {
          position: absolute;
          left: 0;
          top: 0;
          background-color: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 2px 4px;
          font-size: 12px;
          border-radius: 0 0 4px 0;
        }
      `);
      const tasks = [];
      for (const mutation of mutationsList) {
        if (mutation.target.className === "p-relative") {
          if (mutation.addedNodes.length > 0) {
            const node = mutation.addedNodes[0].querySelector(
              ".manga-card-vertical.manga-card"
            );
            if (node) {
              const id = JSON.parse(node.dataset.biliMangaMsg).manga_id;
              const manga = mangaMap.get(id);
              if (manga) {
                tasks.push(processUnreadManga(manga, node));
              }
            }
          }
        } else if (
          mutation.target.className ===
          "list-item dp-i-block p-relative v-top a-move-in-top"
        ) {
          const node = mutation.addedNodes[0];
          if (node) {
            if (!node.dataset) continue;
            const id = JSON.parse(node.dataset.biliMangaMsg).manga_id;
            const manga = mangaMap.get(id);
            if (manga) {
              tasks.push(processUnreadManga(manga, node));
            }
          }
        }
      }
      await Promise.all(tasks);
    });
    observer.observe(targetNode, config);
  }
  if (location.pathname.match(/^\/mc\d+\/\d+$/)) {
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (
      method,
      url,
      async,
      user,
      password
    ) {
      if (
        url === "/twirp/comic.v1.Comic/ImageToken?device=pc&platform=web" &&
        method === "POST"
      ) {
        XMLHttpRequest.prototype.NeedModifyBody = true;
      } else {
        XMLHttpRequest.prototype.NeedModifyBody = false;
      }
      originalXhrOpen.apply(this, arguments);
    };
    const originalXhrSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (body) {
      if (this.NeedModifyBody) {
        const json = JSON.parse(body);
        const urls = JSON.parse(json.urls);
        body = JSON.stringify({
          urls: JSON.stringify(urls.map((x) => x.replace(/\@1100w\.jpg$/, ""))),
        });
        originalXhrSend.apply(this, [body]);
      } else {
        originalXhrSend.apply(this, arguments);
      }
    };
  }
})();
