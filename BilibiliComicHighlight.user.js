// ==UserScript==
// @name         Bilibili Comic Highlight
// @namespace    http://tampermonkey.net/
// @version      2024-04-24
// @description  try to take over the world!
// @author       Aoba Xu
// @match        https://manga.bilibili.com/account-center/my-favourite
// @match        https://manga.bilibili.com/account-center/read-history
// @icon         https://www.google.com/s2/favicons?sz=64&domain=manga.bilibili.com
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  "use strict";
  const config = { childList: true, subtree: true };
  const targetNode = document.body;
  const getMangaList = async (page, order) => {
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
    if (result.ok) {
      const data = await result.json();
      return data.data;
    }
    return [];
  };
  const getHistoryList = async (page, _order) => {
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
    if (result.ok) {
      const data = await result.json();
      return data.data;
    }
    return [];
  };
  const mangaMap = new Map();
  let page = 1;
  let order = parseInt(localStorage.getItem("BilibiliManga:favListOrder"));
  let getNext =
    location.pathname === "/account-center/my-favourite"
      ? getMangaList
      : getHistoryList;
  const observer = new MutationObserver(async (mutationsList) => {
    const newOrder = parseInt(
      localStorage.getItem("BilibiliManga:favListOrder")
    );
    if (newOrder !== order) {
      order = newOrder;
      page = 1;
    }
    if (location.pathname === "/account-center/my-favourite") {
      getNext = getMangaList;
    } else {
      getNext = getHistoryList;
    }
    const mangaList = await getNext(page++, order);
    mangaList.forEach((manga) => {
      mangaMap.set(manga.comic_id, manga);
    });
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
              if (manga.latest_ep_id !== manga.last_ep_id) {
                node.style.backgroundColor = "rgb(61, 180, 242)";
              } else {
                node.style.backgroundColor = "rgb(123, 213, 85)";
              }
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
          console.log(manga);
          if (manga) {
            if (manga.latest_ep_id !== manga.last_ep_id) {
              node.style.backgroundColor = "rgb(61, 180, 242)";
            } else {
              node.style.backgroundColor = "rgb(123, 213, 85)";
            }
          }
        }
      }
    }
  });
  observer.observe(targetNode, config);
})();
